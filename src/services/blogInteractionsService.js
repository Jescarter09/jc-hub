import { get, onValue, ref, runTransaction, serverTimestamp } from 'firebase/database';
import { rtdb } from '../config/firebase';

const METRICS_ROOT = 'blogMetrics';
const CLIENT_STATE_KEY = 'interactionByClient';
const CLIENT_ID_STORAGE_KEY = 'jchub.blog.clientId';

const METRIC_FIELD_BY_INTERACTION = {
  liked: 'likesCount',
  saved: 'savesCount',
  readLater: 'readLaterCount'
};

let cachedClientId = '';

const normalizeSlug = (slug) => String(slug || '').trim().replace(/\//g, '-');

const getMetricsRef = (slug) => ref(rtdb, `${METRICS_ROOT}/${normalizeSlug(slug)}`);
const getMetricsRootRef = () => ref(rtdb, METRICS_ROOT);

const numberOrZero = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric >= 0 ? Math.floor(numeric) : 0;
};

const toMetricsState = (metrics) => {
  const likesCount = numberOrZero(metrics?.likesCount);
  const savesCount = numberOrZero(metrics?.savesCount);
  const readLaterCount = numberOrZero(metrics?.readLaterCount);
  const viewsCount = numberOrZero(metrics?.viewsCount);
  const totalReadSeconds = numberOrZero(metrics?.totalReadSeconds);
  const readSessionsCount = numberOrZero(metrics?.readSessionsCount);
  const avgReadSeconds =
    readSessionsCount > 0 ? Math.max(0, Math.round(totalReadSeconds / readSessionsCount)) : 0;

  return {
    likesCount,
    savesCount,
    readLaterCount,
    viewsCount,
    totalReadSeconds,
    readSessionsCount,
    avgReadSeconds
  };
};

const assertKnownInteraction = (field) => {
  if (!METRIC_FIELD_BY_INTERACTION[field]) {
    throw new Error(`Unknown interaction field: ${field}`);
  }
};

const toRecordObject = (value) => (value && typeof value === 'object' ? value : {});

const createClientId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  const random = Math.random().toString(36).slice(2);
  return `anon-${Date.now().toString(36)}-${random}`;
};

const getClientId = () => {
  if (cachedClientId) return cachedClientId;

  if (typeof window === 'undefined') {
    cachedClientId = 'server';
    return cachedClientId;
  }

  try {
    const existing = String(window.localStorage.getItem(CLIENT_ID_STORAGE_KEY) || '').trim();
    if (existing) {
      cachedClientId = existing;
      return cachedClientId;
    }

    const generated = createClientId();
    window.localStorage.setItem(CLIENT_ID_STORAGE_KEY, generated);
    cachedClientId = generated;
    return cachedClientId;
  } catch {
    cachedClientId = createClientId();
    return cachedClientId;
  }
};

const buildEmptyMetricsState = () => ({
  likesCount: 0,
  savesCount: 0,
  readLaterCount: 0,
  viewsCount: 0,
  totalReadSeconds: 0,
  readSessionsCount: 0,
  avgReadSeconds: 0,
  canWrite: false
});

export async function loadBlogInteractionState(slug) {
  const safeSlug = normalizeSlug(slug);
  if (!safeSlug) {
    return buildEmptyMetricsState();
  }

  try {
    const metricsSnap = await get(getMetricsRef(safeSlug));
    const metrics = metricsSnap.exists() ? metricsSnap.val() : {};

    return {
      ...toMetricsState(metrics),
      canWrite: true
    };
  } catch {
    return buildEmptyMetricsState();
  }
}

export function subscribeBlogMetrics(slug, onChange) {
  const safeSlug = normalizeSlug(slug);
  if (!safeSlug) return () => {};

  return onValue(
    getMetricsRef(safeSlug),
    (snapshot) => {
      const data = snapshot.exists() ? snapshot.val() : {};
      onChange({
        ...toMetricsState(data),
        canWrite: true
      });
    },
    () => {
      onChange(null);
    }
  );
}

export function subscribeBlogMetricsMap(slugs, onChange) {
  const safeSlugs = Array.isArray(slugs)
    ? slugs.map((slug) => normalizeSlug(slug)).filter(Boolean)
    : [];

  if (safeSlugs.length === 0) {
    onChange({});
    return () => {};
  }

  const allowed = new Set(safeSlugs);

  return onValue(
    getMetricsRootRef(),
    (snapshot) => {
      const rootData = toRecordObject(snapshot.val());
      const nextMap = {};

      for (const slug of safeSlugs) {
        const metrics = toRecordObject(rootData[slug]);
        if (!allowed.has(slug)) continue;
        if (Object.keys(metrics).length === 0) continue;
        nextMap[slug] = toMetricsState(metrics);
      }

      onChange(nextMap);
    },
    () => {
      onChange({});
    }
  );
}

export async function toggleBlogInteraction(slug, field, currentValue = false, baselineCount = 0) {
  assertKnownInteraction(field);
  const safeSlug = normalizeSlug(slug);
  if (!safeSlug) {
    throw new Error('Missing blog slug');
  }

  const clientId = getClientId();
  const metricsRef = getMetricsRef(safeSlug);
  const metricField = METRIC_FIELD_BY_INTERACTION[field];
  const fallbackPreviousValue = Boolean(currentValue);
  const baseline = numberOrZero(baselineCount);
  let nextInteractionValue = !fallbackPreviousValue;
  let nextCounterValue = baseline;

  const transactionResult = await runTransaction(metricsRef, (current) => {
    const previousNode = toRecordObject(current);
    const interactionByClient = toRecordObject(previousNode[CLIENT_STATE_KEY]);
    const previousClientState = toRecordObject(interactionByClient[clientId]);
    const hasStoredValue = typeof previousClientState[field] === 'boolean';
    const previousValue = hasStoredValue ? previousClientState[field] : fallbackPreviousValue;
    const nextValue = !previousValue;
    const delta = nextValue ? 1 : -1;
    const currentCount = Math.max(numberOrZero(previousNode[metricField]), baseline);
    const nextCount = Math.max(0, currentCount + delta);

    nextInteractionValue = nextValue;
    nextCounterValue = nextCount;

    return {
      ...previousNode,
      slug: safeSlug,
      [metricField]: nextCount,
      updatedAt: serverTimestamp(),
      createdAt: previousNode.createdAt || serverTimestamp(),
      [CLIENT_STATE_KEY]: {
        ...interactionByClient,
        [clientId]: {
          ...previousClientState,
          liked: field === 'liked' ? nextValue : Boolean(previousClientState.liked),
          saved: field === 'saved' ? nextValue : Boolean(previousClientState.saved),
          readLater: field === 'readLater' ? nextValue : Boolean(previousClientState.readLater),
          updatedAt: serverTimestamp()
        }
      }
    };
  });

  if (!transactionResult.committed) {
    throw new Error('Interaction transaction aborted.');
  }

  const committedNode = toRecordObject(transactionResult.snapshot.val());
  const committedCount = Math.max(numberOrZero(committedNode[metricField]), nextCounterValue);

  return {
    field,
    value: nextInteractionValue,
    countField: metricField,
    count: committedCount
  };
}

export async function recordBlogView(slug, baselineCount = 0) {
  const safeSlug = normalizeSlug(slug);
  if (!safeSlug) {
    throw new Error('Missing blog slug');
  }

  const baseline = numberOrZero(baselineCount);

  const transactionResult = await runTransaction(getMetricsRef(safeSlug), (current) => {
    const previousNode = toRecordObject(current);
    const nextViewsCount = Math.max(numberOrZero(previousNode.viewsCount), baseline) + 1;

    return {
      ...previousNode,
      slug: safeSlug,
      viewsCount: nextViewsCount,
      updatedAt: serverTimestamp(),
      createdAt: previousNode.createdAt || serverTimestamp()
    };
  });

  if (!transactionResult.committed) {
    throw new Error('View transaction aborted.');
  }

  const node = toRecordObject(transactionResult.snapshot.val());
  return numberOrZero(node.viewsCount);
}

export async function appendBlogReadTime(slug, seconds, registerSession = false) {
  const safeSlug = normalizeSlug(slug);
  if (!safeSlug) {
    throw new Error('Missing blog slug');
  }

  const safeSeconds = Math.max(0, Math.floor(Number(seconds) || 0));
  if (safeSeconds === 0 && !registerSession) {
    return {
      totalReadSeconds: 0,
      readSessionsCount: 0,
      avgReadSeconds: 0
    };
  }

  const transactionResult = await runTransaction(getMetricsRef(safeSlug), (current) => {
    const previousNode = toRecordObject(current);
    const nextTotalReadSeconds = numberOrZero(previousNode.totalReadSeconds) + safeSeconds;
    const nextReadSessionsCount =
      numberOrZero(previousNode.readSessionsCount) + (registerSession ? 1 : 0);

    return {
      ...previousNode,
      slug: safeSlug,
      totalReadSeconds: nextTotalReadSeconds,
      readSessionsCount: nextReadSessionsCount,
      updatedAt: serverTimestamp(),
      createdAt: previousNode.createdAt || serverTimestamp()
    };
  });

  if (!transactionResult.committed) {
    throw new Error('Read time transaction aborted.');
  }

  const node = toRecordObject(transactionResult.snapshot.val());
  const totalReadSeconds = numberOrZero(node.totalReadSeconds);
  const readSessionsCount = numberOrZero(node.readSessionsCount);

  return {
    totalReadSeconds,
    readSessionsCount,
    avgReadSeconds:
      readSessionsCount > 0 ? Math.max(0, Math.round(totalReadSeconds / readSessionsCount)) : 0
  };
}
