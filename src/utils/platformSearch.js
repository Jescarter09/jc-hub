import { CONTENT_CATEGORIES } from '../data/categoriesCatalog';

export const POPULAR_SEARCHES = [
  'IA',
  'Python',
  'React',
  'Firebase',
  'Cybersécurité'
];

export const PLATFORM_CATEGORIES = CONTENT_CATEGORIES;

export function normalizeSearchText(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['’`´]/g, '')
    .replace(/[-_]+/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function toSeoSlug(value, fallback = 'recherche') {
  const slug = normalizeSearchText(value).replace(/\s+/g, '-');
  return slug || fallback;
}

export function getSearchParam(value) {
  return toSeoSlug(value, 'recherche');
}

export function getBookDetailPath(book = {}) {
  if (book.detailPath) return book.detailPath;

  const categorySlug = toSeoSlug(book.categorySlug || book.category || 'general', 'general');
  const slug = toSeoSlug(book.slug || book.title || book.sourceId || book.id, 'ressource');
  return `/ebooks/${categorySlug}/${slug}`;
}

function getArticleItems(articles = []) {
  return articles.map((post) => ({
    id: `article-${post.slug}`,
    type: 'article',
    typeLabel: 'ARTICLE',
    title: post.title,
    description: post.excerpt,
    path: `/blog/${post.slug}`,
    image: post.image,
    category: post.category,
    author: post.author,
    dateLabel: post.dateLabel,
    readMinutes: post.readMinutes,
    tags: post.tags || [],
    keywords: [
      post.title,
      post.excerpt,
      post.category,
      post.author,
      ...(post.tags || []),
      ...(post.sections || []).flatMap((section) => [
        section.title,
        ...(section.paragraphs || [])
      ])
    ]
  }));
}

function getResourceItems(books = []) {
  return books
    .filter((book) => String(book?.title || '').trim())
    .map((book) => {
      const typeLabel = book.isHosted ? 'EBOOK' : 'RESSOURCE';
      return {
        id: `resource-${book.id || book.sourceId || book.slug || book.title}`,
        type: 'resource',
        typeLabel,
        title: book.title,
        description: book.description || book.author || 'Ressource disponible dans la bibliothèque JC Hub.',
        path: getBookDetailPath(book),
        image: book.thumbnail || book.cover || '',
        category: book.category || 'Bibliothèque',
        author: book.author,
        format: book.preferredFormat || (book.isHosted ? 'PDF / EPUB' : 'Lien officiel'),
        tags: [book.source, book.license, book.category, book.author].filter(Boolean),
        keywords: [
          book.title,
          book.description,
          book.author,
          book.category,
          book.source,
          book.license,
          book.preferredFormat
        ]
      };
    });
}

function getCategoryItems(categories = PLATFORM_CATEGORIES) {
  return categories.map((category) => ({
    id: `category-${category.slug}`,
    type: 'category',
    typeLabel: 'CATÉGORIE',
    title: category.name,
    description: `Explorer les contenus liés à ${category.name}.`,
    path: `/categories/${category.slug}`,
    image: '',
    category: category.name,
    icon: category.icon,
    tags: category.keywords || [],
    keywords: [category.name, category.slug, ...(category.keywords || [])]
  }));
}

export function buildPlatformSearchIndex({ articles = [], books = [], categories = PLATFORM_CATEGORIES } = {}) {
  return [
    ...getCategoryItems(categories),
    ...getArticleItems(articles),
    ...getResourceItems(books)
  ];
}

export function scoreSearchItem(item, query) {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return 0;

  const tokens = normalizedQuery.split(' ').filter(Boolean);
  const title = normalizeSearchText(item.title);
  const category = normalizeSearchText(item.category);
  const tags = normalizeSearchText((item.tags || []).join(' '));
  const fullText = normalizeSearchText((item.keywords || []).join(' '));

  return tokens.reduce((score, token) => {
    if (title === token) return score + 20;
    if (title.includes(token)) return score + 10;
    if (category.includes(token)) return score + 6;
    if (tags.includes(token)) return score + 5;
    if (fullText.includes(token)) return score + 2;
    return score;
  }, 0);
}

export function searchPlatformItems(query, items, { activeType = 'all' } = {}) {
  const normalizedQuery = normalizeSearchText(query);
  const filteredByType =
    activeType === 'all'
      ? items
      : items.filter((item) => {
          if (activeType === 'ebook') return item.type === 'resource';
          if (activeType === 'guide') return item.type === 'resource' || normalizeSearchText(item.title).includes('guide');
          if (activeType === 'tutorial') return normalizeSearchText(`${item.title} ${item.category}`).includes('tutoriel');
          return item.type === activeType;
        });

  if (!normalizedQuery) {
    return filteredByType.map((item) => ({ item, score: 0 }));
  }

  return filteredByType
    .map((item) => ({ item, score: scoreSearchItem(item, query) }))
    .filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title));
}

export function getSearchSuggestions(query, items, limit = 6) {
  const normalizedQuery = normalizeSearchText(query);
  if (normalizedQuery.length < 2) return [];
  return searchPlatformItems(query, items).slice(0, limit).map((result) => result.item);
}

export function getResultIcon(item) {
  if (item.icon) return item.icon;
  if (item.type === 'category') return 'fas fa-folder-open';
  if (item.type === 'resource') return 'fas fa-book-open';
  return 'far fa-file-lines';
}
