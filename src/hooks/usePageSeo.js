import { useEffect } from 'react';

const DEFAULT_SITE_NAME = 'JC Hub';
const DEFAULT_DESCRIPTION =
  'Des articles et guides simples pour mieux comprendre le numérique, la sécurité, les outils et le web.';
const DEFAULT_IMAGE = '/android-chrome-512x512.png';

const getBaseUrl = () => {
  const envUrl = String(import.meta.env.VITE_SITE_URL || '').trim().replace(/\/+$/, '');
  if (envUrl) return envUrl;
  if (typeof window !== 'undefined' && window.location?.origin) return window.location.origin;
  return 'https://jchub.vercel.app';
};

const toAbsoluteUrl = (value) => {
  const input = String(value || '').trim();
  const baseUrl = getBaseUrl();

  if (!input) return `${baseUrl}${DEFAULT_IMAGE}`;
  if (/^https?:\/\//i.test(input)) return input;
  return `${baseUrl}${input.startsWith('/') ? input : `/${input}`}`;
};

const ensureMeta = ({ selector, attribute, key, value }) => {
  if (typeof document === 'undefined') return;

  let element = document.head.querySelector(selector);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.setAttribute('content', value);
};

const ensureCanonical = (href) => {
  if (typeof document === 'undefined') return;

  let element = document.head.querySelector('link[rel="canonical"]');
  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', 'canonical');
    document.head.appendChild(element);
  }
  element.setAttribute('href', href);
};

export function usePageSeo({
  title,
  description = DEFAULT_DESCRIPTION,
  image = DEFAULT_IMAGE,
  path,
  type = 'website'
}) {
  useEffect(() => {
    const baseUrl = getBaseUrl();
    const pathname =
      path || (typeof window !== 'undefined' ? `${window.location.pathname}${window.location.search}` : '/');
    const canonicalUrl = `${baseUrl}${pathname.startsWith('/') ? pathname : `/${pathname}`}`;
    const pageTitle = title?.includes(DEFAULT_SITE_NAME) ? title : `${title || DEFAULT_SITE_NAME} | ${DEFAULT_SITE_NAME}`;
    const pageDescription = String(description || DEFAULT_DESCRIPTION).trim();
    const pageImage = toAbsoluteUrl(image);

    document.title = pageTitle;
    ensureCanonical(canonicalUrl);

    ensureMeta({
      selector: 'meta[name="description"]',
      attribute: 'name',
      key: 'description',
      value: pageDescription
    });
    ensureMeta({ selector: 'meta[property="og:title"]', attribute: 'property', key: 'og:title', value: pageTitle });
    ensureMeta({
      selector: 'meta[property="og:description"]',
      attribute: 'property',
      key: 'og:description',
      value: pageDescription
    });
    ensureMeta({ selector: 'meta[property="og:type"]', attribute: 'property', key: 'og:type', value: type });
    ensureMeta({ selector: 'meta[property="og:url"]', attribute: 'property', key: 'og:url', value: canonicalUrl });
    ensureMeta({ selector: 'meta[property="og:image"]', attribute: 'property', key: 'og:image', value: pageImage });
    ensureMeta({ selector: 'meta[name="twitter:title"]', attribute: 'name', key: 'twitter:title', value: pageTitle });
    ensureMeta({
      selector: 'meta[name="twitter:description"]',
      attribute: 'name',
      key: 'twitter:description',
      value: pageDescription
    });
    ensureMeta({ selector: 'meta[name="twitter:image"]', attribute: 'name', key: 'twitter:image', value: pageImage });
    ensureMeta({
      selector: 'meta[name="twitter:card"]',
      attribute: 'name',
      key: 'twitter:card',
      value: 'summary_large_image'
    });
  }, [description, image, path, title, type]);
}
