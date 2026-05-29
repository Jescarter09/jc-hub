import { onValue, push, ref, runTransaction, set } from 'firebase/database';
import { rtdb } from '../config/firebase';

const COMMENTS_ROOT = 'blogComments';
const CLIENT_ID_STORAGE_KEY = 'jchub.blog.clientId';
const DEFAULT_AUTHOR = 'Lecteur JC Hub';
const CONTENT_MIN_LENGTH = 12;
const CONTENT_MAX_LENGTH = 1200;

const normalizeSlug = (slug) => String(slug || '').trim().replace(/\//g, '-');
const getCommentsRef = (slug) => ref(rtdb, `${COMMENTS_ROOT}/${normalizeSlug(slug)}`);
const getCommentRef = (slug, commentId) =>
  ref(rtdb, `${COMMENTS_ROOT}/${normalizeSlug(slug)}/${String(commentId || '').trim()}`);

const numberOrZero = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric >= 0 ? Math.floor(numeric) : 0;
};

const toRecordObject = (value) => (value && typeof value === 'object' ? value : {});

const sanitizeAuthor = (value) => {
  const author = String(value || '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!author) return DEFAULT_AUTHOR;
  return author.slice(0, 48);
};

const sanitizeContent = (value) =>
  String(value || '')
    .replace(/\r?\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const normalizeReplyRecord = (reply) => {
  if (!reply || typeof reply !== 'object') return null;

  const text = sanitizeContent(reply.text);
  if (!text) return null;

  return {
    author: sanitizeAuthor(reply.author || 'Équipe JC Hub'),
    role: String(reply.role || 'Auteur').trim() || 'Auteur',
    createdAt: numberOrZero(reply.createdAt) || Date.now(),
    text
  };
};

const createClientId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `anon-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
};

let cachedClientId = '';

const getClientId = () => {
  if (cachedClientId) return cachedClientId;

  if (typeof window === 'undefined') {
    cachedClientId = 'server';
    return cachedClientId;
  }

  try {
    const stored = String(window.localStorage.getItem(CLIENT_ID_STORAGE_KEY) || '').trim();
    if (stored) {
      cachedClientId = stored;
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

const toCommentView = (record, key, clientId) => {
  const raw = toRecordObject(record);
  const id = String(raw.id || key || '').trim();
  if (!id) return null;

  const content = sanitizeContent(raw.content || raw.text);
  if (!content) return null;

  const createdAt = numberOrZero(raw.createdAt) || Date.now();
  const updatedAt = numberOrZero(raw.updatedAt) || createdAt;
  const likesCount = numberOrZero(raw.likesCount);
  const likeByClient = toRecordObject(raw.likeByClient);

  return {
    id,
    slug: String(raw.slug || '').trim(),
    author: sanitizeAuthor(raw.author),
    content,
    likes: likesCount,
    likedByViewer: Boolean(likeByClient[clientId]),
    createdAt,
    updatedAt,
    reply: normalizeReplyRecord(raw.reply)
  };
};

export function subscribeBlogComments(slug, onChange, onError) {
  const safeSlug = normalizeSlug(slug);
  if (!safeSlug) {
    onChange([]);
    return () => {};
  }

  const clientId = getClientId();
  return onValue(
    getCommentsRef(safeSlug),
    (snapshot) => {
      const rawMap = toRecordObject(snapshot.val());
      const comments = [];

      Object.entries(rawMap).forEach(([key, value]) => {
        const comment = toCommentView(value, key, clientId);
        if (comment) comments.push(comment);
      });

      onChange(comments);
    },
    (error) => {
      if (typeof onError === 'function') onError(error);
    }
  );
}

export async function createBlogComment(slug, { author, content, replyToAuthor = '' }) {
  const safeSlug = normalizeSlug(slug);
  if (!safeSlug) {
    throw new Error('Missing blog slug');
  }

  const safeAuthor = sanitizeAuthor(author);
  const safeContent = sanitizeContent(content);
  if (!safeContent || safeContent.length < CONTENT_MIN_LENGTH || safeContent.length > CONTENT_MAX_LENGTH) {
    throw new Error('Comment content is required');
  }

  const listRef = getCommentsRef(safeSlug);
  const commentRef = push(listRef);
  const commentId = String(commentRef.key || '').trim();
  if (!commentId) {
    throw new Error('Unable to create comment key');
  }

  const commentRecord = {
    id: commentId,
    slug: safeSlug,
    author: safeAuthor,
    content: safeContent,
    likesCount: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    likeByClient: {}
  };

  if (replyToAuthor) {
    commentRecord.replyToAuthor = sanitizeAuthor(replyToAuthor);
  }

  await set(commentRef, commentRecord);

  return commentId;
}

export async function toggleBlogCommentLike(
  slug,
  commentId,
  currentLiked = false,
  baselineLikes = 0
) {
  const safeSlug = normalizeSlug(slug);
  const safeCommentId = String(commentId || '').trim();
  if (!safeSlug || !safeCommentId) {
    throw new Error('Missing comment reference');
  }

  const clientId = getClientId();
  const baseline = numberOrZero(baselineLikes);
  const commentRef = getCommentRef(safeSlug, safeCommentId);
  let nextLiked = !Boolean(currentLiked);
  let nextLikesCount = baseline;

  const transactionResult = await runTransaction(commentRef, (current) => {
    const node = toRecordObject(current);
    if (!node.id) {
      return;
    }

    const likeByClient = toRecordObject(node.likeByClient);
    const hasStoredValue = typeof likeByClient[clientId] === 'boolean';
    const previousLiked = hasStoredValue ? likeByClient[clientId] : Boolean(currentLiked);
    const updatedLiked = !previousLiked;
    const delta = updatedLiked ? 1 : -1;
    const updatedLikesCount = Math.max(0, Math.max(numberOrZero(node.likesCount), baseline) + delta);

    nextLiked = updatedLiked;
    nextLikesCount = updatedLikesCount;

    return {
      ...node,
      likesCount: updatedLikesCount,
      updatedAt: Date.now(),
      likeByClient: {
        ...likeByClient,
        [clientId]: updatedLiked
      }
    };
  });

  if (!transactionResult.committed) {
    throw new Error('Comment like transaction aborted');
  }

  const committedNode = toRecordObject(transactionResult.snapshot.val());
  return {
    liked: nextLiked,
    likes: Math.max(numberOrZero(committedNode.likesCount), nextLikesCount)
  };
}
