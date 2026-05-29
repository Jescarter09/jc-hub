import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getBlogById, getBlogBySlug, getRelatedBlogs } from '../data/blogPosts';
import { useNewsletterForm } from '../hooks/useNewsletterForm';
import { usePageSeo } from '../hooks/usePageSeo';
import {
  appendBlogReadTime,
  loadBlogInteractionState,
  recordBlogView,
  subscribeBlogMetrics,
  toggleBlogInteraction
} from '../services/blogInteractionsService';
import {
  createBlogComment,
  subscribeBlogComments,
  toggleBlogCommentLike
} from '../services/blogCommentsService';
import '../styles/BlogDetail.css';

const AUTHOR_AVATAR = '/carter.webp';
const DEFAULT_SHARE_ORIGIN = 'https://jchub.blog';
const ACTION_FEEDBACK_TIMEOUT_MS = 2600;
const STORAGE_KEYS = {
  liked: 'jchub.blog.likedPosts',
  saved: 'jchub.blog.savedPosts',
  readLater: 'jchub.blog.readLaterPosts'
};
const VIEW_COOLDOWN_MS = 30 * 60 * 1000;
const READ_FLUSH_INTERVAL_MS = 15 * 1000;
const MIN_READ_SESSION_SECONDS = 10;
const MIN_ENGAGED_SECONDS_FOR_VIEW = 8;
const COMMENT_AUTHOR_STORAGE_KEY = 'jchub.blog.commentAuthor';
const DEFAULT_COMMENT_AUTHOR = 'Lecteur JC Hub';
const COMMENT_MIN_LENGTH = 12;
const COMMENT_MAX_LENGTH = 1200;
const COMMENT_PAGE_SIZE = 4;
const COMMENT_POST_COOLDOWN_MS = 60 * 1000;

const readStoredSlugSet = (key) => {
  if (typeof window === 'undefined') return new Set();

  try {
    const raw = window.localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.map((item) => String(item)));
  } catch {
    return new Set();
  }
};

const writeStoredSlugSet = (key, slugs) => {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(key, JSON.stringify(Array.from(slugs)));
  } catch {
    // Storage can fail in private mode or strict contexts.
  }
};

const updateStoredSlug = (key, slug, shouldInclude) => {
  if (!slug) return;

  const slugs = readStoredSlugSet(key);
  if (shouldInclude) {
    slugs.add(slug);
  } else {
    slugs.delete(slug);
  }
  writeStoredSlugSet(key, slugs);
};

const getViewStorageKey = (slug) => `jchub.blog.viewedAt.${slug}`;
const getCommentCooldownStorageKey = (slug) => `jchub.blog.commentPostedAt.${slug}`;

const readLastCommentPostedAt = (slug) => {
  if (typeof window === 'undefined' || !slug) return 0;
  try {
    return Number(window.localStorage.getItem(getCommentCooldownStorageKey(slug)) || 0) || 0;
  } catch {
    return 0;
  }
};

const markCommentAsPosted = (slug, timestamp) => {
  if (typeof window === 'undefined' || !slug) return;
  try {
    window.localStorage.setItem(getCommentCooldownStorageKey(slug), String(timestamp));
  } catch {
    // Ignore storage failures in strict/private contexts.
  }
};

const canCountNewView = (slug) => {
  if (typeof window === 'undefined' || !slug) return false;

  try {
    const storageKey = getViewStorageKey(slug);
    const last = Number(window.localStorage.getItem(storageKey) || 0);
    const now = Date.now();

    if (Number.isFinite(last) && now - last < VIEW_COOLDOWN_MS) {
      return false;
    }
    return true;
  } catch {
    return true;
  }
};

const markViewAsCounted = (slug) => {
  if (typeof window === 'undefined' || !slug) return;
  try {
    window.localStorage.setItem(getViewStorageKey(slug), String(Date.now()));
  } catch {
    // Ignore storage failures in strict/private contexts.
  }
};

const getShareUrl = (slug) => {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}/blog/${slug}`;
  }
  return `${DEFAULT_SHARE_ORIGIN}/blog/${slug}`;
};

const getInitialLikeCount = (post) => {
  const explicitLikes = Number(post?.likes);
  if (Number.isFinite(explicitLikes) && explicitLikes > 0) {
    return Math.floor(explicitLikes);
  }

  const views = Number(post?.views);
  if (Number.isFinite(views) && views > 0) {
    return Math.max(8, Math.round(views * 0.08));
  }

  return 128;
};

const formatCompactNumber = (value) => {
  const numeric = Number(value) || 0;
  if (numeric >= 1000) {
    return `${(numeric / 1000).toFixed(1)}K`;
  }
  return `${Math.max(0, Math.floor(numeric))}`;
};

const formatDuration = (seconds) => {
  const safeSeconds = Math.max(0, Math.floor(Number(seconds) || 0));
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;
  return `${minutes}m ${remainingSeconds.toString().padStart(2, '0')}s`;
};

const normalizeLabel = (value) =>
  String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

const getCategoryLabel = (category) => {
  const normalized = normalizeLabel(category);
  const labels = {
    tutoriels: 'Tutoriels',
    securite: 'Sécurité',
    actualites: 'Actualités',
    outils: 'Outils',
    windows: 'Windows',
    technologie: 'Numérique'
  };

  return labels[normalized] || category;
};

const TERMINAL_LANGUAGES = new Set([
  'bash',
  'cmd',
  'console',
  'powershell',
  'ps',
  'ps1',
  'shell',
  'sh',
  'terminal',
  'zsh'
]);

const HTML_LANGUAGES = new Set(['htm', 'html', 'svg', 'xml', 'xhtml']);

const normalizeCodeLanguage = (value) => String(value || '').trim().toLowerCase();

const resolveCodeInterface = (language) => {
  if (TERMINAL_LANGUAGES.has(language)) {
    return 'terminal';
  }
  if (HTML_LANGUAGES.has(language)) {
    return 'html';
  }
  return 'code';
};

const resolveCodeLabel = (language, codeInterface) => {
  if (codeInterface === 'terminal') {
    return 'Terminal';
  }
  if (codeInterface === 'html') {
    return 'HTML';
  }
  if (!language) {
    return 'Code';
  }
  return language.toUpperCase();
};

const hoursAgoToIso = (hoursAgo) => {
  const safeHours = Math.max(0, Number(hoursAgo) || 0);
  return new Date(Date.now() - safeHours * 60 * 60 * 1000).toISOString();
};

const sanitizeCommentAuthor = (value) => {
  const cleaned = String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return DEFAULT_COMMENT_AUTHOR;
  return cleaned.slice(0, 48);
};

const sanitizeCommentContent = (value) =>
  String(value || '')
    .replace(/\r?\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const buildCommentId = () => `cmt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const toRelativeDateLabel = (inputDate) => {
  const timestamp = new Date(inputDate || '').getTime();
  if (!Number.isFinite(timestamp)) return 'à l’instant';

  const diffMs = Math.max(0, Date.now() - timestamp);
  const diffMinutes = Math.floor(diffMs / (60 * 1000));
  const diffHours = Math.floor(diffMs / (60 * 60 * 1000));
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));

  if (diffMinutes < 1) return 'à l’instant';
  if (diffMinutes < 60) return `il y a ${diffMinutes} min`;
  if (diffHours < 24) return `il y a ${diffHours} heure${diffHours > 1 ? 's' : ''}`;
  if (diffDays < 30) return `il y a ${diffDays} jour${diffDays > 1 ? 's' : ''}`;

  return new Date(timestamp).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

const normalizeReply = (reply) => {
  if (!reply || typeof reply !== 'object') return null;

  const text = sanitizeCommentContent(reply.text);
  if (!text) return null;

  return {
    author: sanitizeCommentAuthor(reply.author || 'Équipe JC Hub'),
    role: String(reply.role || 'Auteur').trim() || 'Auteur',
    createdAt: String(reply.createdAt || new Date().toISOString()),
    text
  };
};

const normalizeCommentRecord = (rawComment, index = 0) => {
  const fallbackDate = new Date(Date.now() - index * 1000).toISOString();
  const content = sanitizeCommentContent(rawComment?.content ?? rawComment?.text);

  return {
    id: String(rawComment?.id || buildCommentId()),
    author: sanitizeCommentAuthor(rawComment?.author),
    content: content || 'Commentaire',
    likes: Math.max(0, Math.floor(Number(rawComment?.likes) || 0)),
    likedByViewer: Boolean(rawComment?.likedByViewer),
    createdAt: String(rawComment?.createdAt || fallbackDate),
    reply: normalizeReply(rawComment?.reply)
  };
};

const readStoredCommentAuthor = () => {
  if (typeof window === 'undefined') return DEFAULT_COMMENT_AUTHOR;
  try {
    return sanitizeCommentAuthor(window.localStorage.getItem(COMMENT_AUTHOR_STORAGE_KEY));
  } catch {
    return DEFAULT_COMMENT_AUTHOR;
  }
};

const commentsSeed = [
  {
    id: 'seed-marc',
    author: 'Marc L.',
    createdAt: hoursAgoToIso(2),
    content: "Excellent article. Le passage sur la validation humaine m'a vraiment parlé.",
    likes: 18
  },
  {
    id: 'seed-claire',
    author: 'Claire B.',
    createdAt: hoursAgoToIso(5),
    content: "Très clair et concret. J'aimerais voir un prochain article orienté implémentation backend.",
    likes: 12,
    reply: {
      id: 'seed-reply-sophie',
      author: 'Dr. Sophie Martin',
      role: 'Auteur',
      createdAt: hoursAgoToIso(3),
      text: "Bonne idée, c'est prévu dans la prochaine série."
    }
  },
  {
    id: 'seed-alex',
    author: 'Alex T.',
    createdAt: hoursAgoToIso(8),
    content: "Merci pour la synthèse. La partie risques réglementaires est particulièrement utile.",
    likes: 9
  }
];

const isListLikeTextLine = (line) => {
  const trimmed = String(line || '').trim();
  return /^[-*]\s+/.test(trimmed) || /^\[[ xX]\]\s+/.test(trimmed) || /^\d+\.\s+/.test(trimmed);
};

const stripListPrefix = (line) =>
  String(line || '')
    .trim()
    .replace(/^[-*]\s+/, '')
    .replace(/^\[[ xX]\]\s+/, '')
    .replace(/^\d+\.\s+/, '')
    .trim();

function ArticleStructuredText({ content, className = '' }) {
  const lines = String(content || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length > 0 && lines.every(isListLikeTextLine)) {
    return (
      <ul className={className}>
        {lines.map((line, index) => (
          <li key={`${line}-${index}`}>{stripListPrefix(line)}</li>
        ))}
      </ul>
    );
  }

  return (
    <p className={className || undefined}>
      {lines.length > 0
        ? lines.map((line, index) => (
            <span key={`${line}-${index}`}>
              {line}
              {index < lines.length - 1 && <br />}
            </span>
          ))
        : content}
    </p>
  );
}

export default function BlogDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const newsletter = useNewsletterForm({ source: 'blog-detail' });
  const newsletterFeedbackClassName =
    newsletter.feedback.kind === 'error'
      ? 'article-editorial-feedback article-editorial-feedback-error'
      : newsletter.feedback.kind === 'info'
        ? 'article-editorial-feedback article-editorial-feedback-info'
        : 'article-editorial-feedback article-editorial-feedback-success';

  const blog = useMemo(() => getBlogBySlug(slug), [slug]);
  const legacyById = useMemo(() => getBlogById(slug), [slug]);
  const relatedPosts = useMemo(() => getRelatedBlogs(slug, 3), [slug]);
  const sections = blog?.sections || [];
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isReadLater, setIsReadLater] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [viewCount, setViewCount] = useState(0);
  const [avgReadSeconds, setAvgReadSeconds] = useState(0);
  const [totalReadSeconds, setTotalReadSeconds] = useState(0);
  const [liveSessionSeconds, setLiveSessionSeconds] = useState(0);
  const [actionFeedback, setActionFeedback] = useState('');
  const [interactionLoading, setInteractionLoading] = useState(false);
  const [canWriteInteractions, setCanWriteInteractions] = useState(true);
  const [pendingActions, setPendingActions] = useState({
    like: false,
    saved: false,
    readLater: false
  });
  const [comments, setComments] = useState(() =>
    commentsSeed.map((comment, index) => normalizeCommentRecord(comment, index))
  );
  const [commentSort, setCommentSort] = useState('recent');
  const [commentDraft, setCommentDraft] = useState('');
  const [commentFeedback, setCommentFeedback] = useState({ kind: '', text: '' });
  const [visibleCommentsCount, setVisibleCommentsCount] = useState(COMMENT_PAGE_SIZE);
  const [commentAuthor, setCommentAuthor] = useState(DEFAULT_COMMENT_AUTHOR);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [canWriteComments, setCanWriteComments] = useState(true);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [pendingCommentLikes, setPendingCommentLikes] = useState({});
  const [replyTargetAuthor, setReplyTargetAuthor] = useState('');
  const readingActiveRef = useRef(false);
  const lastTickAtRef = useRef(0);
  const pendingReadSecondsRef = useRef(0);
  const sessionRegisteredRef = useRef(false);
  const liveSessionSecondsRef = useRef(0);
  const liveIntervalRef = useRef(null);
  const shouldRecordViewRef = useRef(false);
  const hasRecordedViewRef = useRef(false);
  const isRecordingViewRef = useRef(false);
  const commentInputRef = useRef(null);
  const commentTrapRef = useRef(null);
  const lastCommentPostedAtRef = useRef(0);
  const shareUrl = useMemo(() => (blog?.slug ? getShareUrl(blog.slug) : ''), [blog?.slug]);

  const shareLinks = useMemo(() => {
    if (!shareUrl || !blog) {
      return { twitter: '#', linkedIn: '#', facebook: '#' };
    }

    const encodedUrl = encodeURIComponent(shareUrl);
    const encodedTitle = encodeURIComponent(blog.title);
    return {
      twitter: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`,
      linkedIn: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`
    };
  }, [blog, shareUrl]);

  usePageSeo({
    title: blog?.title || (legacyById ? 'Redirection article' : 'Article introuvable'),
    description:
      blog?.excerpt || 'Article JC Hub introuvable ou déplacé. Reviens aux articles pour continuer la lecture.',
    image: blog?.image || '/android-chrome-512x512.png',
    path: blog?.slug ? `/blog/${blog.slug}` : `/blog/${slug || ''}`,
    type: blog ? 'article' : 'website'
  });

  const sortedComments = useMemo(() => {
    const next = [...comments];
    if (commentSort === 'popular') {
      next.sort((a, b) => {
        const likesDelta = (Number(b.likes) || 0) - (Number(a.likes) || 0);
        if (likesDelta !== 0) return likesDelta;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      return next;
    }

    next.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return next;
  }, [commentSort, comments]);

  const visibleComments = useMemo(
    () => sortedComments.slice(0, Math.max(COMMENT_PAGE_SIZE, visibleCommentsCount)),
    [sortedComments, visibleCommentsCount]
  );
  const hasMoreComments = visibleComments.length < sortedComments.length;
  const commentCharactersLeft = Math.max(0, COMMENT_MAX_LENGTH - commentDraft.length);
  const commentFeedbackClassName =
    commentFeedback.kind === 'error'
      ? 'article-editorial-feedback article-editorial-feedback-error'
      : commentFeedback.kind === 'success'
        ? 'article-editorial-feedback article-editorial-feedback-success'
        : 'article-editorial-feedback article-editorial-feedback-info';

  useEffect(() => {
    if (!commentFeedback.text) return undefined;
    const timer = setTimeout(() => setCommentFeedback({ kind: '', text: '' }), 3600);
    return () => clearTimeout(timer);
  }, [commentFeedback.text]);

  useEffect(() => {
    if (!blog?.slug) return undefined;

    const seedComments = commentsSeed.map((comment, index) => normalizeCommentRecord(comment, index));
    setCommentsLoading(true);
    setCanWriteComments(true);
    setCommentSort('recent');
    setVisibleCommentsCount(COMMENT_PAGE_SIZE);
    setCommentDraft('');
    setReplyTargetAuthor('');
    setPendingCommentLikes({});
    setIsSubmittingComment(false);
    setCommentAuthor(readStoredCommentAuthor());

    const unsubscribe = subscribeBlogComments(
      blog.slug,
      (nextComments) => {
        const remote = Array.isArray(nextComments) ? nextComments : [];
        const remoteIds = new Set(remote.map((comment) => comment.id));
        const merged = [...remote, ...seedComments.filter((seed) => !remoteIds.has(seed.id))];
        setComments(merged);
        setCommentsLoading(false);
      },
      (error) => {
        console.error('Chargement commentaires impossible:', error);
        setCanWriteComments(false);
        setComments(seedComments);
        setCommentsLoading(false);
        setCommentFeedback({
          kind: 'error',
          text: 'Commentaires en lecture seule pour le moment (droits Firebase à vérifier).'
        });
      }
    );

    return () => unsubscribe();
  }, [blog?.slug]);

  useEffect(() => {
    if (!blog?.slug) return;

    let active = true;
    let unsubscribeMetrics = () => {};
    setInteractionLoading(true);
    setActionFeedback('');
    pendingReadSecondsRef.current = 0;
    sessionRegisteredRef.current = false;
    liveSessionSecondsRef.current = 0;
    shouldRecordViewRef.current = canCountNewView(blog.slug);
    hasRecordedViewRef.current = false;
    isRecordingViewRef.current = false;
    setLiveSessionSeconds(0);

    const liked = readStoredSlugSet(STORAGE_KEYS.liked).has(blog.slug);
    const saved = readStoredSlugSet(STORAGE_KEYS.saved).has(blog.slug);
    const readLater = readStoredSlugSet(STORAGE_KEYS.readLater).has(blog.slug);
    setIsLiked(liked);
    setIsSaved(saved);
    setIsReadLater(readLater);

    const applyMetricsState = (metricsState) => {
      if (!active || !metricsState) return;

      const fallbackLikeCount = getInitialLikeCount(blog);
      const resolvedLikeCount =
        metricsState.likesCount > 0 ? metricsState.likesCount : fallbackLikeCount;
      const baselineViews = Math.max(0, Math.floor(Number(blog?.views) || 0));
      const resolvedViewsCount = Math.max(baselineViews, metricsState.viewsCount || 0);

      setLikeCount(resolvedLikeCount);
      setViewCount(resolvedViewsCount);
      setAvgReadSeconds(metricsState.avgReadSeconds || 0);
      setTotalReadSeconds(metricsState.totalReadSeconds || 0);
      setCanWriteInteractions(metricsState.canWrite !== false);
    };

    const loadInteractions = async () => {
      try {
        const interaction = await loadBlogInteractionState(blog.slug);
        if (!active) return;
        applyMetricsState(interaction);

        if (interaction.canWrite === false) {
          setActionFeedback('Écriture Realtime Database indisponible (règles).');
        }
      } catch (error) {
        console.error('Chargement des interactions impossible:', error);
        if (!active) return;

        setIsLiked(false);
        setIsSaved(false);
        setIsReadLater(false);
        setCanWriteInteractions(false);
        setLikeCount(getInitialLikeCount(blog));
        setViewCount(Math.max(0, Math.floor(Number(blog?.views) || 0)));
        setAvgReadSeconds(0);
        setTotalReadSeconds(0);
        setActionFeedback('Interactions indisponibles pour le moment. Réessaie dans un instant.');
      } finally {
        if (active) {
          setInteractionLoading(false);
        }
      }
    };

    loadInteractions();
    unsubscribeMetrics = subscribeBlogMetrics(blog.slug, (metricsState) => {
      if (!metricsState) return;
      applyMetricsState(metricsState);
    });

    return () => {
      active = false;
      unsubscribeMetrics();
    };
  }, [blog]);

  useEffect(() => {
    if (!actionFeedback) return undefined;

    const timer = setTimeout(() => {
      setActionFeedback('');
    }, ACTION_FEEDBACK_TIMEOUT_MS);

    return () => clearTimeout(timer);
  }, [actionFeedback]);

  const notifyAction = useCallback((message) => {
    setActionFeedback(message);
  }, []);

  const updatePendingAction = useCallback((key, value) => {
    setPendingActions((current) => ({ ...current, [key]: value }));
  }, []);

  const flushReadProgress = useCallback(
    async (registerSession = false, suppressStateUpdate = false) => {
      if (!blog?.slug || !canWriteInteractions) return;

      const secondsToFlush = Math.max(0, Math.floor(pendingReadSecondsRef.current));
      const reachedSessionThreshold = liveSessionSecondsRef.current >= MIN_READ_SESSION_SECONDS;
      const shouldRegisterSession =
        registerSession && reachedSessionThreshold && !sessionRegisteredRef.current;

      if (secondsToFlush === 0 && !shouldRegisterSession) return;

      pendingReadSecondsRef.current = 0;

      try {
        const result = await appendBlogReadTime(blog.slug, secondsToFlush, shouldRegisterSession);
        if (shouldRegisterSession) {
          sessionRegisteredRef.current = true;
        }
        if (!suppressStateUpdate) {
          setTotalReadSeconds(result.totalReadSeconds);
          setAvgReadSeconds(result.avgReadSeconds);
        }
      } catch (error) {
        console.error('Erreur enregistrement lecture:', error);
        pendingReadSecondsRef.current += secondsToFlush;
      }
    },
    [blog?.slug, canWriteInteractions]
  );

  useEffect(() => {
    if (!blog?.slug) return undefined;

    const canUseDocument = typeof document !== 'undefined';
    const canUseWindow = typeof window !== 'undefined';

    const syncReadingState = () => {
      const visible = canUseDocument ? document.visibilityState === 'visible' : true;
      const focused =
        canUseDocument && typeof document.hasFocus === 'function' ? document.hasFocus() : true;
      readingActiveRef.current = visible && focused;
    };

    const onTick = () => {
      const now = Date.now();
      const elapsedSeconds = Math.max(0, Math.floor((now - lastTickAtRef.current) / 1000));
      lastTickAtRef.current = now;

      if (!readingActiveRef.current || elapsedSeconds === 0) return;

      pendingReadSecondsRef.current += elapsedSeconds;
      liveSessionSecondsRef.current += elapsedSeconds;
      setLiveSessionSeconds(liveSessionSecondsRef.current);

      const reachedViewThreshold = liveSessionSecondsRef.current >= MIN_ENGAGED_SECONDS_FOR_VIEW;
      if (
        reachedViewThreshold &&
        shouldRecordViewRef.current &&
        !hasRecordedViewRef.current &&
        !isRecordingViewRef.current &&
        canWriteInteractions
      ) {
        isRecordingViewRef.current = true;
        const baselineViews = Math.max(0, Math.floor(Number(blog?.views) || 0));

        recordBlogView(blog.slug, baselineViews)
          .then((nextViewsCount) => {
            hasRecordedViewRef.current = true;
            markViewAsCounted(blog.slug);
            setViewCount((current) => Math.max(current, Number(nextViewsCount) || 0));
          })
          .catch((error) => {
            console.error('Erreur comptage vue:', error);
          })
          .finally(() => {
            shouldRecordViewRef.current = false;
            isRecordingViewRef.current = false;
          });
      }
    };

    const onVisibilityOrFocusChange = () => {
      onTick();
      syncReadingState();
      if (!readingActiveRef.current) {
        void flushReadProgress(false);
      }
    };

    syncReadingState();
    lastTickAtRef.current = Date.now();

    if (canUseWindow) {
      liveIntervalRef.current = window.setInterval(() => {
        onTick();
        if (pendingReadSecondsRef.current >= Math.floor(READ_FLUSH_INTERVAL_MS / 1000)) {
          void flushReadProgress(false);
        }
      }, 1000);
      window.addEventListener('focus', onVisibilityOrFocusChange);
      window.addEventListener('blur', onVisibilityOrFocusChange);
      window.addEventListener('pagehide', onVisibilityOrFocusChange);
    }

    if (canUseDocument) {
      document.addEventListener('visibilitychange', onVisibilityOrFocusChange);
    }

    return () => {
      onTick();
      if (canUseWindow && liveIntervalRef.current) {
        window.clearInterval(liveIntervalRef.current);
        liveIntervalRef.current = null;
      }
      if (canUseWindow) {
        window.removeEventListener('focus', onVisibilityOrFocusChange);
        window.removeEventListener('blur', onVisibilityOrFocusChange);
        window.removeEventListener('pagehide', onVisibilityOrFocusChange);
      }
      if (canUseDocument) {
        document.removeEventListener('visibilitychange', onVisibilityOrFocusChange);
      }
      void flushReadProgress(true, true);
      readingActiveRef.current = false;
    };
  }, [blog?.slug, blog?.views, canWriteInteractions, flushReadProgress]);

  const handleToggleLike = useCallback(async () => {
    if (!blog?.slug || pendingActions.like || !canWriteInteractions) return;

    updatePendingAction('like', true);
    try {
      const result = await toggleBlogInteraction(blog.slug, 'liked', isLiked, likeCount);
      setIsLiked(result.value);
      setLikeCount(result.count);
      updateStoredSlug(STORAGE_KEYS.liked, blog.slug, result.value);
      notifyAction(result.value ? 'Like synchronisé en temps réel.' : 'Like retiré en temps réel.');
    } catch (error) {
      console.error('Erreur like:', error);
      notifyAction('Impossible d’enregistrer le like.');
    } finally {
      updatePendingAction('like', false);
    }
  }, [blog?.slug, canWriteInteractions, isLiked, likeCount, notifyAction, pendingActions.like, updatePendingAction]);

  const handleToggleSaved = useCallback(async () => {
    if (!blog?.slug || pendingActions.saved || !canWriteInteractions) return;

    updatePendingAction('saved', true);
    try {
      const result = await toggleBlogInteraction(blog.slug, 'saved', isSaved);
      setIsSaved(result.value);
      updateStoredSlug(STORAGE_KEYS.saved, blog.slug, result.value);
      notifyAction(result.value ? 'Article sauvegardé en temps réel.' : 'Sauvegarde retirée en temps réel.');
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
      notifyAction('Impossible d’enregistrer la sauvegarde.');
    } finally {
      updatePendingAction('saved', false);
    }
  }, [blog?.slug, canWriteInteractions, isSaved, notifyAction, pendingActions.saved, updatePendingAction]);

  const handleToggleReadLater = useCallback(async () => {
    if (!blog?.slug || pendingActions.readLater || !canWriteInteractions) return;

    updatePendingAction('readLater', true);
    try {
      const result = await toggleBlogInteraction(blog.slug, 'readLater', isReadLater);
      setIsReadLater(result.value);
      updateStoredSlug(STORAGE_KEYS.readLater, blog.slug, result.value);
      notifyAction(result.value ? 'Ajouté à Lire plus tard en temps réel.' : 'Retiré de Lire plus tard en temps réel.');
    } catch (error) {
      console.error('Erreur lire plus tard:', error);
      notifyAction('Impossible d’enregistrer cette action.');
    } finally {
      updatePendingAction('readLater', false);
    }
  }, [blog?.slug, canWriteInteractions, isReadLater, notifyAction, pendingActions.readLater, updatePendingAction]);

  const handleShare = useCallback(async () => {
    if (!blog || !shareUrl) return;

    const payload = {
      title: blog.title,
      text: blog.excerpt,
      url: shareUrl
    };

    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share(payload);
        notifyAction('Lien partagé.');
        return;
      } catch (error) {
        const aborted = error instanceof Error && error.name === 'AbortError';
        if (aborted) return;
      }
    }

    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(shareUrl);
        notifyAction('Lien copié dans le presse-papiers.');
        return;
      } catch {
        // Continue to final fallback.
      }
    }

    if (typeof window !== 'undefined') {
      window.prompt('Copie ce lien :', shareUrl);
      notifyAction('Lien prêt à être copié.');
    }
  }, [blog, notifyAction, shareUrl]);

  const handleSubmitComment = useCallback(
    async (event) => {
      event.preventDefault();

      if (!blog?.slug || !canWriteComments || isSubmittingComment) return;

      const now = Date.now();
      const trapValue = String(commentTrapRef.current?.value || '').trim();
      if (trapValue) {
        setCommentFeedback({ kind: 'success', text: 'Merci, commentaire reçu.' });
        setCommentDraft('');
        return;
      }

      const lastPostedAt = Math.max(lastCommentPostedAtRef.current, readLastCommentPostedAt(blog.slug));
      if (now - lastPostedAt < COMMENT_POST_COOLDOWN_MS) {
        setCommentFeedback({
          kind: 'error',
          text: `Patiente ${Math.ceil((COMMENT_POST_COOLDOWN_MS - (now - lastPostedAt)) / 1000)}s avant de republier.`
        });
        return;
      }

      const content = sanitizeCommentContent(commentDraft);
      if (content.length < COMMENT_MIN_LENGTH) {
        setCommentFeedback({
          kind: 'error',
          text: `Ton commentaire doit contenir au moins ${COMMENT_MIN_LENGTH} caractères.`
        });
        return;
      }

      const author = sanitizeCommentAuthor(commentAuthor);
      const alreadyExists = comments.some(
        (comment) => comment.author === author && comment.content.toLowerCase() === content.toLowerCase()
      );

      if (alreadyExists) {
        setCommentFeedback({
          kind: 'error',
          text: 'Ce commentaire existe déjà. Modifie légèrement le texte avant de publier.'
        });
        return;
      }

      setIsSubmittingComment(true);
      try {
        await createBlogComment(blog.slug, {
          author,
          content,
          replyToAuthor: replyTargetAuthor
        });

        if (typeof window !== 'undefined') {
          try {
            window.localStorage.setItem(COMMENT_AUTHOR_STORAGE_KEY, author);
          } catch {
            // Ignore localStorage write failure.
          }
        }

        setCommentAuthor(author);
        setCommentDraft('');
        setReplyTargetAuthor('');
        setVisibleCommentsCount(COMMENT_PAGE_SIZE);
        setCommentFeedback({ kind: 'success', text: 'Commentaire publié en temps réel.' });
        lastCommentPostedAtRef.current = now;
        markCommentAsPosted(blog.slug, now);
      } catch (error) {
        console.error('Publication commentaire impossible:', error);
        const permissionDenied =
          String(error?.code || '')
            .toLowerCase()
            .includes('permission') ||
          String(error?.message || '')
            .toLowerCase()
            .includes('permission');
        if (permissionDenied) {
          setCanWriteComments(false);
        }
        setCommentFeedback({
          kind: 'error',
          text: permissionDenied
            ? 'Écriture des commentaires refusée (règles Firebase).'
            : 'Impossible de publier le commentaire pour le moment.'
        });
      } finally {
        setIsSubmittingComment(false);
      }
    },
    [
      blog?.slug,
      canWriteComments,
      commentAuthor,
      commentDraft,
      comments,
      isSubmittingComment,
      replyTargetAuthor
    ]
  );

  const handleToggleCommentLike = useCallback(
    async (commentId) => {
      if (!blog?.slug || !commentId || !canWriteComments || pendingCommentLikes[commentId]) return;

      const currentComment = comments.find((comment) => comment.id === commentId);
      if (!currentComment) return;
      if (String(currentComment.id).startsWith('seed-')) {
        setCommentFeedback({
          kind: 'info',
          text: 'Le like est désactivé sur les commentaires de démonstration.'
        });
        return;
      }

      const optimisticLiked = !currentComment.likedByViewer;
      const optimisticLikes = Math.max(
        0,
        Number(currentComment.likes || 0) + (optimisticLiked ? 1 : -1)
      );

      setPendingCommentLikes((current) => ({ ...current, [commentId]: true }));
      setComments((current) =>
        current.map((comment) =>
          comment.id === commentId
            ? { ...comment, likedByViewer: optimisticLiked, likes: optimisticLikes }
            : comment
        )
      );

      try {
        const result = await toggleBlogCommentLike(
          blog.slug,
          commentId,
          currentComment.likedByViewer,
          currentComment.likes
        );

        setComments((current) =>
          current.map((comment) =>
            comment.id === commentId
              ? { ...comment, likedByViewer: result.liked, likes: result.likes }
              : comment
          )
        );
      } catch (error) {
        console.error('Like commentaire impossible:', error);
        const permissionDenied =
          String(error?.code || '')
            .toLowerCase()
            .includes('permission') ||
          String(error?.message || '')
            .toLowerCase()
            .includes('permission');
        if (permissionDenied) {
          setCanWriteComments(false);
        }
        setComments((current) =>
          current.map((comment) =>
            comment.id === commentId
              ? {
                  ...comment,
                  likedByViewer: currentComment.likedByViewer,
                  likes: currentComment.likes
                }
              : comment
          )
        );
        setCommentFeedback({
          kind: 'error',
          text: permissionDenied
            ? 'Like indisponible: écriture Firebase refusée.'
            : 'Impossible de liker ce commentaire.'
        });
      } finally {
        setPendingCommentLikes((current) => {
          const next = { ...current };
          delete next[commentId];
          return next;
        });
      }
    },
    [blog?.slug, canWriteComments, comments, pendingCommentLikes]
  );

  const handleReplyToComment = useCallback((authorName) => {
    const safeAuthor = sanitizeCommentAuthor(authorName);
    const mention = `@${safeAuthor} `;
    setReplyTargetAuthor(safeAuthor);
    setCommentDraft((current) => {
      const withoutExistingMention = current.replace(/^@\S+\s/, '');
      return `${mention}${withoutExistingMention}`.slice(0, COMMENT_MAX_LENGTH);
    });

    if (commentInputRef.current) {
      commentInputRef.current.focus();
    }
  }, []);

  const handleLoadMoreComments = useCallback(() => {
    setVisibleCommentsCount((current) => current + COMMENT_PAGE_SIZE);
  }, []);

  useEffect(() => {
    if (!blog && legacyById?.slug) {
      navigate(`/blog/${legacyById.slug}`, { replace: true });
    }
  }, [blog, legacyById, navigate]);

  const visibleSections =
    sections.length > 0
      ? sections
      : [
          {
            id: 'introduction',
            title: 'Introduction',
            paragraphs: blog?.excerpt ? [blog.excerpt] : [],
            blocks: []
          }
        ];
  const firstSection = visibleSections[0] || null;
  const leadParagraph = firstSection?.paragraphs?.[0] || blog?.excerpt || '';
  const readingLabel = avgReadSeconds > 0 ? formatDuration(avgReadSeconds) : `${blog?.readMinutes || 0} min`;
  const asideTakeaway =
    firstSection?.paragraphs?.[1] ||
    firstSection?.paragraphs?.[0] ||
    blog?.excerpt ||
    "Un guide simple pour avancer avec plus de clarté.";

  const getSectionBlocks = (section, sectionIndex) => {
    const blocks =
      Array.isArray(section?.blocks) && section.blocks.length > 0
        ? section.blocks
        : (section?.paragraphs || []).map((paragraph) => ({
            type: 'paragraph',
            content: paragraph
          }));

    if (sectionIndex !== 0 || !leadParagraph) {
      return blocks;
    }

    let skippedLead = false;
    return blocks.filter((block) => {
      const isLead =
        !skippedLead &&
        String(block?.type || 'paragraph').toLowerCase() === 'paragraph' &&
        String(block?.content || '').trim() === String(leadParagraph).trim();

      if (isLead) {
        skippedLead = true;
        return false;
      }

      return true;
    });
  };

  const renderArticleBlock = (section, block, blockIndex) => {
    const blockType = String(block?.type || 'paragraph').toLowerCase();
    const blockKey = `${section.id}-${blockType}-${blockIndex}`;

    if (blockType === 'image') {
      return (
        <figure key={blockKey} className="article-editorial-inline-image">
          <img
            src={block.src}
            alt={block.caption || section.title}
            loading="lazy"
            decoding="async"
            onError={(event) => {
              event.currentTarget.src = '/jchub_monogram.png';
            }}
          />
          {block.caption && <figcaption>{block.caption}</figcaption>}
        </figure>
      );
    }

    if (blockType === 'code') {
      const language = normalizeCodeLanguage(block.language || block?.metadata?.language);
      const codeInterface = resolveCodeInterface(language);
      const codeLabel = resolveCodeLabel(language, codeInterface);

      return (
        <div key={blockKey} className={`article-editorial-code article-editorial-code-${codeInterface}`}>
          <div className="article-editorial-code-head">
            <span>{codeLabel}</span>
            <span>{codeInterface === 'terminal' ? 'CLI' : codeInterface === 'html' ? 'HTML' : 'Code'}</span>
          </div>
          <pre>
            <code>{block.content}</code>
          </pre>
        </div>
      );
    }

    if (blockType === 'callout') {
      const variant = String(block.variant || 'note').toLowerCase();
      const title = String(block.title || block.label || 'À retenir').trim();

      return (
        <aside key={blockKey} className={`article-editorial-callout article-editorial-callout-${variant}`}>
          <strong>{title}</strong>
          {block.content && <ArticleStructuredText content={block.content} />}
        </aside>
      );
    }

    if (blockType === 'table') {
      const headers = Array.isArray(block.headers) ? block.headers : [];
      const rows = Array.isArray(block.rows) ? block.rows : [];
      if (headers.length === 0 || rows.length === 0) return null;

      return (
        <div key={blockKey} className={`article-editorial-table-wrap article-editorial-table-${block.variant || 'compare'}`}>
          <table>
            <thead>
              <tr>
                {headers.map((header, headerIndex) => (
                  <th key={`${header}-${headerIndex}`}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={`${blockKey}-row-${rowIndex}`}>
                  {headers.map((header, cellIndex) => (
                    <td key={`${header}-${cellIndex}`}>{row?.[cellIndex] || ''}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    return <ArticleStructuredText key={blockKey} content={block.content} />;
  };

  if (!blog && legacyById) {
    return (
      <div className="article-editorial article-editorial-state">
        <p>Redirection vers le nouvel URL...</p>
      </div>
    );
  }

  if (!blog) {
    return (
      <div className="article-editorial article-editorial-state">
        <div>
          <h2>Article non trouvé</h2>
          <p>Cet article n'existe pas ou son slug est invalide.</p>
          <Link to="/blog">Retour aux articles</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="article-editorial">
      <main>
        <section className="article-editorial-hero">
          <div className="article-editorial-breadcrumb">
            <Link to="/">Accueil</Link>
            <span>/</span>
            <Link to="/blog">Articles</Link>
            <span>/</span>
            <Link to={`/blog?${new URLSearchParams({ category: blog.category }).toString()}`}>
              {getCategoryLabel(blog.category)}
            </Link>
          </div>

          <div className="article-editorial-hero-grid">
            <div>
              <span className="article-editorial-category">{getCategoryLabel(blog.category)}</span>
              <h1>{blog.title}</h1>
              <p className="article-editorial-summary">{blog.excerpt}</p>
            </div>

            <aside className="article-editorial-meta-card">
              <div className="article-editorial-author">
                <img
                  src={AUTHOR_AVATAR}
                  alt={blog.author}
                  loading="lazy"
                  decoding="async"
                  onError={(event) => {
                    event.currentTarget.src = '/jchub_monogram.png';
                  }}
                />
                <div>
                  <strong>{blog.author}</strong>
                  <span>{blog.role || 'Auteur JC Hub'}</span>
                </div>
              </div>
              <div className="article-editorial-meta-list">
                <div>
                  <strong>Date</strong>
                  <span>{blog.dateLabel}</span>
                </div>
                <div>
                  <strong>Lecture</strong>
                  <span>{readingLabel}</span>
                </div>
                <div>
                  <strong>Vues</strong>
                  <span>{formatCompactNumber(viewCount)}</span>
                </div>
              </div>
            </aside>
          </div>
        </section>

        <figure className="article-editorial-cover">
          <img
            src={blog.image}
            alt={blog.title}
            fetchPriority="high"
            decoding="async"
            onError={(event) => {
              event.currentTarget.src = '/jchub_monogram.png';
            }}
          />
        </figure>

        <div className="article-editorial-reading-tools">
          <div className="article-editorial-tool-group">
            <a className="article-editorial-tool article-editorial-tool-primary" href="#article">
              Commencer
            </a>
            <a className="article-editorial-tool" href="#comments">
              Commenter
            </a>
            <a className="article-editorial-tool" href="#related">
              Lire ensuite
            </a>
          </div>
          <div className="article-editorial-tool-group">
            <button
              type="button"
              onClick={handleToggleLike}
              disabled={interactionLoading || pendingActions.like || !canWriteInteractions}
              aria-pressed={isLiked}
              className={`article-editorial-tool ${isLiked ? 'article-editorial-tool-primary' : ''}`}
            >
              <i className={isLiked ? 'fas fa-heart' : 'far fa-heart'}></i>
              <span>{likeCount} likes</span>
            </button>
            <button
              type="button"
              onClick={handleToggleSaved}
              disabled={interactionLoading || pendingActions.saved || !canWriteInteractions}
              aria-pressed={isSaved}
              className={`article-editorial-tool ${isSaved ? 'article-editorial-tool-primary' : ''}`}
            >
              <i className={isSaved ? 'fas fa-bookmark' : 'far fa-bookmark'}></i>
              <span>{isSaved ? 'Sauvegardé' : 'Sauvegarder'}</span>
            </button>
            <button type="button" onClick={handleShare} className="article-editorial-tool">
              <i className="fas fa-share-alt"></i>
              <span>Partager</span>
            </button>
          </div>
        </div>

        {(actionFeedback || liveSessionSeconds > 0 || totalReadSeconds > 0) && (
          <div className="article-editorial-reading-status">
            {actionFeedback && <p>{actionFeedback}</p>}
            <span>
              Session actuelle: {formatDuration(liveSessionSeconds)} · Lecture cumulée:{' '}
              {formatDuration(totalReadSeconds)}
            </span>
          </div>
        )}

        <section className="article-editorial-shell" id="article">
          <aside className="article-editorial-toc" aria-label="Sommaire">
            <div className="article-editorial-toc-title">Sommaire</div>
            <nav>
              {visibleSections.map((section) => (
                <a key={section.id} href={`#${section.id}`}>
                  {section.title}
                </a>
              ))}
            </nav>

            <div className="article-editorial-share-list">
              <strong>Partager</strong>
              <a href={shareLinks.twitter} target="_blank" rel="noopener noreferrer">
                Twitter
              </a>
              <a href={shareLinks.linkedIn} target="_blank" rel="noopener noreferrer">
                LinkedIn
              </a>
              <a href={shareLinks.facebook} target="_blank" rel="noopener noreferrer">
                Facebook
              </a>
              <button type="button" onClick={handleShare}>Copier le lien</button>
            </div>
          </aside>

          <article className="article-editorial-body">
            {leadParagraph && <p className="article-editorial-lead">{leadParagraph}</p>}

            {visibleSections.map((section, sectionIndex) => {
              const sectionBlocks = getSectionBlocks(section, sectionIndex);
              const hasExtras = section.quote || section.stats || section.tools || section.bullets;
              if (sectionBlocks.length === 0 && !hasExtras) return null;

              return (
                <section id={section.id} key={section.id}>
                  <h2>{section.title}</h2>
                  {sectionBlocks.map((block, blockIndex) => renderArticleBlock(section, block, blockIndex))}

                  {section.quote && (
                    <blockquote className="article-editorial-quote">
                      <p>{section.quote}</p>
                    </blockquote>
                  )}

                  {section.stats && (
                    <div className="article-editorial-stats">
                      {section.stats.map((item) => (
                        <div key={item.value}>
                          <strong>{item.value}</strong>
                          <span>{item.label}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {section.tools && (
                    <div className="article-editorial-table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>Catégorie</th>
                            <th>Outils majeurs</th>
                            <th>Cas d'usage</th>
                          </tr>
                        </thead>
                        <tbody>
                          {section.tools.map((tool) => (
                            <tr key={tool.type}>
                              <td>{tool.type}</td>
                              <td>{tool.tools}</td>
                              <td>{tool.usage}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {section.bullets && (
                    <div className="article-editorial-note">
                      <strong>{section.bulletTitle || 'À retenir'}</strong>
                      <ul>
                        {section.bullets.map((bullet) => (
                          <li key={bullet}>{bullet}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </section>
              );
            })}

            <div className="article-editorial-tags" id="tags">
              {blog.tags.map((tag) => (
                <span key={tag}>#{tag}</span>
              ))}
            </div>

            <div className="article-editorial-author-box">
              <div className="article-editorial-author-box-top">
                <img
                  src={AUTHOR_AVATAR}
                  alt={blog.author}
                  loading="lazy"
                  decoding="async"
                  onError={(event) => {
                    event.currentTarget.src = '/jchub_monogram.png';
                  }}
                />
                <div>
                  <h3>{blog.author}</h3>
                  <p>{blog.role || 'Auteur JC Hub'}</p>
                </div>
              </div>
              <p>
                {blog.author} partage des guides simples pour rendre le numérique plus clair,
                plus utile et moins intimidant au quotidien.
              </p>
            </div>
          </article>

          <aside className="article-editorial-aside-note">
            <h3>À retenir</h3>
            <p>{asideTakeaway}</p>
          </aside>
        </section>

        <section className="article-editorial-wide-section" id="related">
          <div className="article-editorial-section-head">
            <div>
              <span className="article-editorial-category">Lire ensuite</span>
              <h2>Articles similaires.</h2>
            </div>
            <p>Des recommandations simples pour continuer sans se disperser.</p>
          </div>

          <div className="article-editorial-related-grid">
            {relatedPosts.map((post) => (
              <Link key={post.slug} to={`/blog/${post.slug}`} className="article-editorial-related-card">
                <div className="article-editorial-related-image">
                  <img
                    src={post.image}
                    alt={post.title}
                    loading="lazy"
                    decoding="async"
                    onError={(event) => {
                      event.currentTarget.src = '/jchub_monogram.png';
                    }}
                  />
                </div>
                <div className="article-editorial-related-body">
                  <span>{getCategoryLabel(post.category)}</span>
                  <h3>{post.title}</h3>
                  <p>{post.excerpt}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="article-editorial-wide-section" id="comments">
          <div className="article-editorial-section-head">
            <div>
              <span className="article-editorial-category">Discussion</span>
              <h2>Commentaires.</h2>
            </div>
            <p>{comments.length} contribution{comments.length > 1 ? 's' : ''} autour de cet article.</p>
          </div>

          <div className="article-editorial-comments-box">
            <form className="article-editorial-comment-form" onSubmit={handleSubmitComment}>
              <label style={{ position: 'absolute', left: '-9999px', opacity: 0 }} aria-hidden="true">
                Site web
                <input ref={commentTrapRef} name="website" type="text" tabIndex={-1} autoComplete="off" />
              </label>
              <input
                type="text"
                value={commentAuthor}
                onChange={(event) => setCommentAuthor(event.target.value.slice(0, 48))}
                placeholder="Ton nom"
                disabled={!canWriteComments || isSubmittingComment}
              />
              {replyTargetAuthor && (
                <p>
                  Réponse à <strong>@{replyTargetAuthor}</strong>
                </p>
              )}
              <textarea
                ref={commentInputRef}
                value={commentDraft}
                maxLength={COMMENT_MAX_LENGTH}
                placeholder="Ton commentaire..."
                onChange={(event) => setCommentDraft(event.target.value)}
                disabled={!canWriteComments || isSubmittingComment}
              ></textarea>
              <div className="article-editorial-comment-actions">
                <span>{commentCharactersLeft} caractères restants</span>
                <button type="submit" disabled={!canWriteComments || isSubmittingComment}>
                  {isSubmittingComment ? 'Publication...' : 'Publier'}
                </button>
              </div>
              {commentFeedback.text && <p className={commentFeedbackClassName}>{commentFeedback.text}</p>}
              {!canWriteComments && (
                <p className="article-editorial-muted">
                  Mode lecture seule actif: vérifie les règles Firebase pour autoriser les écritures.
                </p>
              )}
            </form>

            <div className="article-editorial-comment-panel">
              <div className="article-editorial-comment-sort">
                <span>{commentsLoading ? 'Chargement...' : `${comments.length} commentaire${comments.length > 1 ? 's' : ''}`}</span>
                <select
                  value={commentSort}
                  onChange={(event) => setCommentSort(event.target.value)}
                  disabled={commentsLoading}
                >
                  <option value="recent">Plus récents</option>
                  <option value="popular">Plus populaires</option>
                </select>
              </div>

              {commentsLoading ? (
                <div className="article-editorial-comment-empty">Chargement des commentaires...</div>
              ) : (
                <div className="article-editorial-comment-list">
                  {visibleComments.map((comment) => (
                    <article key={comment.id} className="article-editorial-comment">
                      <div>
                        <strong>{comment.author}</strong>
                        <span>{toRelativeDateLabel(comment.createdAt)}</span>
                      </div>
                      <p>{comment.content}</p>
                      <div className="article-editorial-comment-tools">
                        <button
                          type="button"
                          onClick={() => handleToggleCommentLike(comment.id)}
                          aria-pressed={comment.likedByViewer}
                          disabled={
                            !canWriteComments ||
                            Boolean(pendingCommentLikes[comment.id]) ||
                            String(comment.id).startsWith('seed-')
                          }
                        >
                          <i className={comment.likedByViewer ? 'fas fa-thumbs-up' : 'far fa-thumbs-up'}></i>
                          <span>{comment.likes}</span>
                        </button>
                        <button type="button" onClick={() => handleReplyToComment(comment.author)}>
                          Répondre
                        </button>
                      </div>

                      {comment.reply && (
                        <div className="article-editorial-reply">
                          <strong>{comment.reply.author}</strong>
                          <span>{comment.reply.role} · {toRelativeDateLabel(comment.reply.createdAt)}</span>
                          <p>{comment.reply.text}</p>
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              )}

              {hasMoreComments && (
                <button type="button" onClick={handleLoadMoreComments} className="article-editorial-load-more">
                  Charger plus de commentaires
                </button>
              )}
            </div>
          </div>
        </section>

        <section className="article-editorial-wide-section" id="newsletter">
          <div className="article-editorial-newsletter">
            <div>
              <h2>Recevoir les prochains guides.</h2>
              <p>Une invitation simple après la lecture: recevoir les articles utiles sans bruit.</p>
            </div>
            <form onSubmit={newsletter.handleSubmit} className="article-editorial-newsletter-form">
              <input
                type="email"
                placeholder="ton@email.com"
                value={newsletter.email}
                onChange={(event) => {
                  newsletter.setEmail(event.target.value);
                  newsletter.resetFeedback();
                }}
                autoComplete="email"
                required
              />
              <button type="submit" disabled={newsletter.isSubmitting}>
                {newsletter.isSubmitting ? 'Inscription...' : "Je m'abonne"}
              </button>
              {newsletter.feedback.text && <p className={newsletterFeedbackClassName}>{newsletter.feedback.text}</p>}
            </form>
          </div>
        </section>
      </main>
    </div>
  );
}
