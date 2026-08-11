export const SITE_URL = "https://fom.xyz";

/**
 * Serialize a JSON-LD object for a <script> tag. JSON.stringify doesn't
 * escape "</", so a stray "</script>" substring in any authored field
 * (description, FAQ answer, etc.) would prematurely close the tag.
 */
export function safeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
export const DEFAULT_OG_IMAGE = "/images/og-homepage.jpg";
export const SITE_TITLE =
  "Future of Marketing Podcast | How AI Is Changing Marketing";
export const SITE_DESCRIPTION =
  "How AI is reshaping marketing, from the leaders living it. Hosted by Graphite Growth, XYZ Venture Capital, and Upside.";
