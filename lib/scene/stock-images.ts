import type { CompanyStyle } from '@/types/database';

/**
 * Stock scene background images for interview prep visualization.
 *
 * One curated Unsplash photo per CompanyStyle. Hosted externally — if any URL
 * 404s, replace it here. The keys must stay in sync with the CompanyStyle
 * union; TypeScript will surface a missing key as a compile error.
 *
 * Consider migrating to first-party hosting (e.g. /public/scenes/<style>.jpg)
 * if external image reliability becomes an issue or if the photographer takedown
 * risk of relying on a third-party CDN outweighs the convenience.
 */
export const SCENE_STOCK_IMAGES: Record<CompanyStyle, string> = {
  faang:       'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80',
  startup:     'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=80',
  consulting:  'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1200&q=80',
  enterprise:  'https://images.unsplash.com/photo-1568992687947-868a62a9f521?auto=format&fit=crop&w=1200&q=80',
  agency:      'https://images.unsplash.com/photo-1542744094-3a31f272c490?auto=format&fit=crop&w=1200&q=80',
  government:  'https://images.unsplash.com/photo-1477925518523-ad7de26ede5b?auto=format&fit=crop&w=1200&q=80',
};
