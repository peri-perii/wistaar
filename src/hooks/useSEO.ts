/**
 * useSEO — Lightweight, dependency-free SEO hook.
 * Imperatively sets <title> and <meta> tags for each page.
 *
 * Usage:
 *   useSEO({ title: 'Explore Books', description: '...' });
 */

import { useEffect } from 'react';

const SITE_NAME = 'Wistaar';
const BASE_URL = 'https://wistaar.in';
const DEFAULT_OG_IMAGE = `${BASE_URL}/og-default.png`;

interface SEOProps {
  /** Page-level title. The site name is appended automatically. */
  title: string;
  /** Meta description — keep ≤160 chars for search snippets. */
  description: string;
  /** Canonical URL path, e.g. '/explore'. Defaults to current pathname. */
  canonicalPath?: string;
  /** OpenGraph image absolute URL. Falls back to default OG image. */
  ogImage?: string;
  /** OpenGraph type. Defaults to 'website'. Use 'book' for book detail pages. */
  ogType?: string;
  /** Whether search engines should index this page. Default: true. */
  noIndex?: boolean;
}

function setMeta(name: string, content: string, property = false) {
  const attr = property ? 'property' : 'name';
  let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function setLink(rel: string, href: string) {
  let el = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

export function useSEO({
  title,
  description,
  canonicalPath,
  ogImage,
  ogType = 'website',
  noIndex = false,
}: SEOProps) {
  useEffect(() => {
    const fullTitle = `${title} – ${SITE_NAME}`;
    const canonical = `${BASE_URL}${canonicalPath ?? window.location.pathname}`;
    const image = ogImage ?? DEFAULT_OG_IMAGE;

    // Title
    document.title = fullTitle;

    // Standard meta
    setMeta('description', description);
    setMeta('robots', noIndex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large, max-snippet:-1');

    // Canonical
    setLink('canonical', canonical);

    // OpenGraph
    setMeta('og:title', fullTitle, true);
    setMeta('og:description', description, true);
    setMeta('og:url', canonical, true);
    setMeta('og:type', ogType, true);
    setMeta('og:image', image, true);
    setMeta('og:site_name', SITE_NAME, true);
    setMeta('og:locale', 'en_IN', true);

    // Twitter / X
    setMeta('twitter:card', 'summary_large_image');
    setMeta('twitter:title', fullTitle);
    setMeta('twitter:description', description);
    setMeta('twitter:image', image);
  }, [title, description, canonicalPath, ogImage, ogType, noIndex]);
}
