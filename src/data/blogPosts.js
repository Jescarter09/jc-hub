import database from './database.json';

const FALLBACK_IMAGE = '/jchub_monogram.png';
const DEFAULT_ALLOWED_KEY_PREFIXES = ['article-'];
const OPTIMIZED_IMAGE_MAP = {
  '/desktop.png': '/desktop.webp',
  '/mobile.png': '/mobile.webp',
  '/carter.png': '/carter.webp'
};

const toOptimizedImage = (value) => {
  const image = String(value || '').trim();
  if (!image) return image;
  if (OPTIMIZED_IMAGE_MAP[image]) return OPTIMIZED_IMAGE_MAP[image];
  if (image.startsWith('/assets/articles/') && image.toLowerCase().endsWith('.png')) {
    return image.replace(/\.png$/i, '.webp');
  }
  return image;
};

const getAllowedKeyPrefixes = () => {
  const rawValue = String(import.meta.env.VITE_BLOG_POST_KEY_PREFIXES || '').trim();
  if (!rawValue) {
    return DEFAULT_ALLOWED_KEY_PREFIXES;
  }

  const parsed = rawValue
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  return parsed.length > 0 ? parsed : DEFAULT_ALLOWED_KEY_PREFIXES;
};

const allowedKeyPrefixes = getAllowedKeyPrefixes();

const matchesAllowedKeyPrefix = (key) => {
  if (allowedKeyPrefixes.includes('*')) {
    return true;
  }
  return allowedKeyPrefixes.some((prefix) => String(key || '').startsWith(prefix));
};

const toSlug = (text) =>
  String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

const toDisplayCategory = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return 'Technologie';
  return raw
    .replace(/[_-]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
};

const normalizeTags = (tags) => {
  if (Array.isArray(tags)) {
    return tags.map((tag) => String(tag).trim()).filter(Boolean);
  }
  if (typeof tags === 'string') {
    return tags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);
  }
  return [];
};

const parseDate = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return new Date(value);
  }
  if (typeof value === 'string' && value.trim()) {
    const numeric = Number(value);
    if (Number.isFinite(numeric) && value.trim().length >= 10) {
      return new Date(numeric);
    }
    return new Date(value);
  }
  return new Date();
};

const formatDateLabel = (date) =>
  date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

const toPublishedAt = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const isPlaceholderImage = (value) => {
  const image = String(value || '').trim().toLowerCase();
  return image === '/assets/images/blog.png' || image === '/assets/image/blog.png';
};

const sortBlocks = (blocks) =>
  [...blocks].sort((a, b) => {
    const aOrder = Number.isFinite(Number(a?.order)) ? Number(a.order) : Number(a?.index || 0);
    const bOrder = Number.isFinite(Number(b?.order)) ? Number(b.order) : Number(b?.index || 0);
    return aOrder - bOrder;
  });

const isMeaningfulText = (value) => String(value || '').trim().length > 0;

const sectionsFromBlocks = (blocks) => {
  if (!Array.isArray(blocks) || blocks.length === 0) {
    return [];
  }

  const sorted = sortBlocks(blocks);
  const sections = [];
  let currentSection = null;
  let sectionIndex = 0;

  const startSection = (title) => {
    sectionIndex += 1;
    const safeTitle = isMeaningfulText(title) ? String(title).trim() : `Section ${sectionIndex}`;
    const nextSection = {
      id: `section-${sectionIndex}`,
      title: safeTitle,
      paragraphs: [],
      blocks: []
    };
    sections.push(nextSection);
    currentSection = nextSection;
  };

  for (const block of sorted) {
    const type = String(block?.type || 'paragraph').toLowerCase();
    const content = String(block?.content || '').trim();
    const isStructuredBlock = type === 'callout' || type === 'table';
    if (!content && !isStructuredBlock) continue;

    if (type === 'subtitle') {
      startSection(content);
      continue;
    }

    if (!currentSection) {
      startSection('Introduction');
    }

    if (type === 'paragraph') {
      currentSection.paragraphs.push(content);
      currentSection.blocks.push({
        type: 'paragraph',
        content
      });
      continue;
    }

    if (type === 'code') {
      currentSection.blocks.push({
        type: 'code',
        content,
        language: String(block?.metadata?.language || '').trim().toLowerCase()
      });
      continue;
    }

    if (type === 'image') {
      currentSection.blocks.push({
        type: 'image',
        src: content,
        caption: String(block?.caption || '').trim()
      });
      continue;
    }

    if (type === 'callout') {
      currentSection.paragraphs.push(content);
      currentSection.blocks.push({
        type: 'callout',
        content,
        title: String(block?.metadata?.title || block?.metadata?.label || '').trim(),
        label: String(block?.metadata?.label || '').trim(),
        variant: String(block?.metadata?.variant || 'note').trim().toLowerCase()
      });
      continue;
    }

    if (type === 'table') {
      currentSection.paragraphs.push(content);
      currentSection.blocks.push({
        type: 'table',
        content,
        headers: Array.isArray(block?.headers) ? block.headers : [],
        rows: Array.isArray(block?.rows) ? block.rows : [],
        variant: String(block?.metadata?.variant || 'compare').trim().toLowerCase()
      });
      continue;
    }

    currentSection.paragraphs.push(content);
    currentSection.blocks.push({
      type: 'paragraph',
      content
    });
  }

  return sections.filter((section) => section.paragraphs.length > 0 || section.blocks.length > 0);
};

const markdownTextToBlocks = (text) => {
  const blocks = [];
  const input = String(text || '').trim();
  if (!input) return blocks;

  const codeRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;

  const appendParagraphBlocks = (segment) => {
    const paragraphs = String(segment || '')
      .split(/\n{2,}/)
      .map((item) => item.trim())
      .filter(Boolean);

    for (const paragraph of paragraphs) {
      blocks.push({
        type: 'paragraph',
        content: paragraph
      });
    }
  };

  while ((match = codeRegex.exec(input)) !== null) {
    const before = input.slice(lastIndex, match.index);
    appendParagraphBlocks(before);

    const language = String(match[1] || '').trim().toLowerCase();
    const codeContent = String(match[2] || '').trim();
    if (codeContent) {
      blocks.push({
        type: 'code',
        language,
        content: codeContent
      });
    }

    lastIndex = codeRegex.lastIndex;
  }

  appendParagraphBlocks(input.slice(lastIndex));
  return blocks;
};

const sectionsFromMarkdown = (content) => {
  const text = String(content || '').trim();
  if (!text) return [];

  const normalized = text.replace(/\r\n/g, '\n');
  const parts = normalized.split(/\n##\s+/);
  const sections = [];

  parts.forEach((part, index) => {
    const value = index === 0 ? part : `## ${part}`;
    const match = value.match(/^##\s+(.+)\n([\s\S]*)$/);
    if (match) {
      const title = match[1].trim();
      const body = match[2].trim();
      const blocks = markdownTextToBlocks(body);
      const paragraphs = blocks.filter((item) => item.type === 'paragraph').map((item) => item.content);
      if (paragraphs.length > 0) {
        sections.push({
          id: `section-${sections.length + 1}`,
          title,
          paragraphs,
          blocks
        });
      }
      return;
    }

    const blocks = markdownTextToBlocks(value);
    const paragraphs = blocks.filter((item) => item.type === 'paragraph').map((item) => item.content);
    if (paragraphs.length > 0) {
      sections.push({
        id: `section-${sections.length + 1}`,
        title: 'Introduction',
        paragraphs,
        blocks
      });
    }
  });

  return sections;
};

const computeWordCount = (sections, excerpt) => {
  const sectionText = sections.flatMap((section) => section.paragraphs).join(' ');
  const fullText = `${excerpt || ''} ${sectionText}`.trim();
  if (!fullText) return 0;
  return fullText.split(/\s+/).filter(Boolean).length;
};

const extractPrimaryImageFromBlocks = (blocks) => {
  if (!Array.isArray(blocks)) return '';
  const sorted = sortBlocks(blocks);
  const match = sorted.find(
    (block) => String(block?.type || '').toLowerCase() === 'image' && String(block?.content || '').trim()
  );
  return String(match?.content || '').trim();
};

const mapPostToBlogCard = (entry, index) => {
  const key = entry?.key || `post-${index + 1}`;
  const post = entry?.value || {};

  const title = String(post.title || '').trim();
  if (!title) return null;

  const slug = String(post.slug || '').trim() || toSlug(title) || key;
  const excerpt = String(post.excerpt || post.description || '').trim();

  const rawDate = post.published_at ?? post.created_at ?? post.updated_at ?? post.publishedAt;
  const date = parseDate(rawDate);

  const blocks = Array.isArray(post.contentBlocks) && post.contentBlocks.length > 0 ? post.contentBlocks : post.content;
  const sections = Array.isArray(blocks) ? sectionsFromBlocks(blocks) : sectionsFromMarkdown(post.content);
  const words = computeWordCount(sections, excerpt);
  const readMinutes = Math.max(3, Math.round(words / 220) || 3);

  const tags = normalizeTags(post.tags);
  const category = toDisplayCategory(post.category);
  const primaryFromBlocks = extractPrimaryImageFromBlocks(blocks);
  const rawImage = String(post.image || '').trim();
  const image = toOptimizedImage(!rawImage || isPlaceholderImage(rawImage) ? primaryFromBlocks || FALLBACK_IMAGE : rawImage);

  return {
    id: String(post.id || key),
    slug,
    title,
    excerpt: excerpt || 'Article disponible sur le blog.',
    image,
    author: String(post.author_name || post.author || 'Administrateur').trim(),
    role: String(post.role || post.author_role || 'Auteur').trim(),
    dateLabel: formatDateLabel(date),
    publishedAt: toPublishedAt(date),
    category,
    readMinutes,
    views: Number(post.views) || 0,
    likes: Number(post.likes) || 0,
    featured: index === 0,
    tags: tags.length > 0 ? tags : [toSlug(category).replace(/-/g, '')],
    sections
  };
};

const removeDuplicatePostSlugs = (posts) => {
  const seen = new Set();
  return posts.filter((post) => {
    const slug = String(post?.slug || '').trim().toLowerCase();
    if (!slug || seen.has(slug)) return false;
    seen.add(slug);
    return true;
  });
};

const rawPosts = Object.entries(database?.blog?.posts || {})
  .filter(([key]) => matchesAllowedKeyPrefix(key))
  .map(([key, value]) => ({ key, value }));
const rawPublishedPosts = rawPosts.filter(({ value }) => {
  if (!value || typeof value !== 'object') return false;
  if (!String(value.title || '').trim()) return false;
  const status = String(value.status || 'published').trim().toLowerCase();
  return status === 'published';
});

export const blogPosts = removeDuplicatePostSlugs(
  rawPublishedPosts
    .map(mapPostToBlogCard)
    .filter((post) => post && post.title && post.slug)
);

export const getBlogBySlug = (slug) => blogPosts.find((post) => post.slug === slug);
export const getBlogById = (id) => blogPosts.find((post) => String(post.id) === String(id));

export const getRelatedBlogs = (slug, limit = 3) => {
  const current = getBlogBySlug(slug);
  const sameCategory = blogPosts.filter((post) => post.slug !== slug && current && post.category === current.category);
  const others = blogPosts.filter((post) => post.slug !== slug && (!current || post.category !== current.category));
  return [...sameCategory, ...others].slice(0, limit);
};

export { toSlug };

export const generateUniqueSlug = (title, existingSlugs = []) => {
  const base = toSlug(title) || 'article';
  const taken = new Set(existingSlugs.map((item) => String(item).toLowerCase()));

  if (!taken.has(base)) {
    return base;
  }

  let candidate = base;
  let counter = 2;
  while (taken.has(candidate)) {
    candidate = `${base}-${counter}`;
    counter += 1;
  }

  return candidate;
};
