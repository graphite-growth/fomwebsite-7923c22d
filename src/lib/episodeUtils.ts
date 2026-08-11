import type { PodcastEpisode } from "@/lib/podcastData";

const SITE_URL = "https://fom.xyz";

const YOUTUBE_ID_PATTERN =
  /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/;

/**
 * Extract the 11-character video ID from a YouTube URL.
 */
export function getYouTubeVideoId(youtubeUrl: string): string {
  return youtubeUrl.match(YOUTUBE_ID_PATTERN)?.[1] ?? "";
}

/**
 * Extract a YouTube thumbnail URL from a YouTube video URL.
 */
export function getYouTubeThumbnail(
  youtubeUrl: string,
  quality:
    | "maxresdefault"
    | "hqdefault"
    | "mqdefault"
    | "sddefault" = "maxresdefault"
): string {
  const videoId = getYouTubeVideoId(youtubeUrl);
  return `https://img.youtube.com/vi/${videoId}/${quality}.jpg`;
}

/**
 * Build SEO title + description for an episode page.
 */
export function buildEpisodeSeo(episode?: PodcastEpisode) {
  if (!episode) {
    return {
      title: "Episode Not Found | Future of Marketing",
      description: "The episode you're looking for doesn't exist.",
    };
  }

  const SUFFIX = " | Future of Marketing";
  const MAX_TITLE = 60;

  let title: string;
  if (episode.comingSoon) {
    title = `${episode.name} — Coming Soon${SUFFIX}`;
  } else {
    const base = `${episode.name}: ${episode.overview}${SUFFIX}`;
    if (base.length <= MAX_TITLE) {
      title = base;
    } else {
      // Truncate overview to fit
      const budget = MAX_TITLE - `${episode.name}: ${SUFFIX}`.length - 1;
      const truncated = episode.overview.slice(0, budget).trimEnd();
      title = `${episode.name}: ${truncated}…${SUFFIX}`;
    }
  }

  const description = episode.comingSoon
    ? `${episode.name} (${episode.title}, ${episode.company}) joins the Future of Marketing podcast soon.`
    : `${episode.name} (${episode.title}, ${episode.company}) discusses ${episode.overview}. Listen now on YouTube, Spotify, and Apple Podcasts.`;

  return { title, description };
}

/**
 * Convert a human date string (e.g. "Aug 11, 2026") to an ISO 8601 date
 * (e.g. "2026-08-11"). Schema.org and RSS/sitemap consumers expect ISO,
 * not the human-readable format used in podcastData.ts.
 */
export function toIsoDate(dateStr: string): string | undefined {
  const d = new Date(dateStr);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString().slice(0, 10);
}

/**
 * JSON-LD (unlike OpenGraph meta tags) gets no metadataBase resolution, so
 * image/thumbnail URLs must be absolute or they're invalid structured data.
 */
function toAbsoluteUrl(url: string): string {
  return url.startsWith("http") ? url : `${SITE_URL}${url}`;
}

/**
 * Convert a display duration ("51 min", "38:59", "1:02:15") to an ISO 8601
 * duration ("PT51M", "PT38M59S", "PT1H2M15S") for schema.org.
 */
function toIsoDuration(duration: string): string | undefined {
  const minutesOnly = duration.match(/^(\d+)\s*min$/i);
  if (minutesOnly) return `PT${minutesOnly[1]}M`;

  const hms = duration.match(/^(\d+):(\d{2}):(\d{2})$/);
  if (hms) return `PT${hms[1]}H${hms[2]}M${hms[3]}S`;

  const ms = duration.match(/^(\d+):(\d{2})$/);
  if (ms) return `PT${ms[1]}M${ms[2]}S`;

  return undefined;
}

/**
 * Build JSON-LD structured data for an episode (PodcastEpisode + BreadcrumbList).
 */
export function buildEpisodeJsonLd(
  episode: PodcastEpisode,
  slug: string,
  isIntro: boolean,
  ogImage: string | null
) {
  const episodeUrl = `${SITE_URL}/podcast/${slug}`;
  const videoId = episode.youtubeUrl
    ? getYouTubeVideoId(episode.youtubeUrl)
    : "";
  const name = isIntro
    ? "Future of Marketing — Intro"
    : `${episode.name}: ${episode.overview}`;
  const description = episode.fullDescription || episode.overview;
  const datePublished = toIsoDate(episode.publishedDate);
  const dateModified = toIsoDate(episode.updatedDate || episode.publishedDate);
  const duration = toIsoDuration(episode.duration);

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "PodcastEpisode",
        name,
        description,
        url: episodeUrl,
        mainEntityOfPage: episodeUrl,
        datePublished,
        dateModified,
        duration,
        image: ogImage ? toAbsoluteUrl(ogImage) : undefined,
        partOfSeries: {
          "@type": "PodcastSeries",
          name: "Future of Marketing",
          url: SITE_URL,
        },
        ...(isIntro
          ? {}
          : {
              actor: {
                "@type": "Person",
                name: episode.name,
                jobTitle: episode.title,
                worksFor: {
                  "@type": "Organization",
                  name: episode.company,
                  url: episode.companyDomain
                    ? `https://${episode.companyDomain}`
                    : undefined,
                },
                sameAs: episode.linkedInUrl ? [episode.linkedInUrl] : undefined,
              },
            }),
      },
      // Google and AI crawlers don't have a rich-result type for PodcastEpisode —
      // podcast rich results come from RSS submission, not on-page JSON-LD. Every
      // episode is also a YouTube video, and VideoObject IS well-supported, so we
      // mark it up too.
      ...(videoId
        ? [
            {
              "@type": "VideoObject",
              name,
              description,
              uploadDate: datePublished,
              duration,
              thumbnailUrl: [
                toAbsoluteUrl(
                  ogImage ||
                    getYouTubeThumbnail(episode.youtubeUrl, "maxresdefault")
                ),
              ],
              contentUrl: episode.youtubeUrl,
              embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}`,
            },
          ]
        : []),
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: `${SITE_URL}/`,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Podcast",
            item: `${SITE_URL}/#podcast`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: isIntro ? "Intro" : episode.name,
            item: `${SITE_URL}/podcast/${slug}`,
          },
        ],
      },
      ...(episode.faq && episode.faq.length > 0
        ? [
            {
              "@type": "FAQPage",
              mainEntity: episode.faq.map((item) => ({
                "@type": "Question",
                name: item.question,
                acceptedAnswer: {
                  "@type": "Answer",
                  text: item.answer,
                },
              })),
            },
          ]
        : []),
    ],
  };
}

/**
 * Get the canonical URL for an episode.
 */
export function getEpisodeCanonicalUrl(slug: string): string {
  return `${SITE_URL}/podcast/${slug}`;
}
