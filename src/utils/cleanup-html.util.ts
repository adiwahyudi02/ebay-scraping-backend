import { load } from 'cheerio';

export const cleanupHtml = (rawHtml: string): string => {
  const $ = load(rawHtml);

  // remove all scripts, styles, comments, meta, noscript, etc.
  $('script, style, noscript, meta, iframe, link').remove();

  // remove inline event handlers or hidden tags
  $(
    '[onclick], [onmouseover], [style*="display:none"], [aria-hidden="true"]',
  ).remove();

  // optionally remove other noisy tags (ads, social, etc.)
  $('[class*="ads"], [id*="ads"], [class*="social"], [id*="social"]').remove();

  // get the raw visible text
  const text = $('body').text();

  // clean up excessive whitespace and return
  return text.replace(/\s+/g, ' ').trim();
};
