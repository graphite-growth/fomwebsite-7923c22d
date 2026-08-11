import { podcastEpisodes } from "@/lib/podcastData";
import { SITE_URL } from "@/lib/seoConstants";
import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const today = new Date();
  const published = podcastEpisodes.filter((ep) => !ep.comingSoon);
  const episodeDates = published.map(
    (ep) => new Date(ep.updatedDate || ep.publishedDate || today)
  );
  // Homepage lists every episode, so its real "last modified" is whichever
  // episode was most recently published or edited — not the build date.
  const latestEpisodeDate = episodeDates.length
    ? new Date(Math.max(...episodeDates.map((d) => d.getTime())))
    : today;

  const episodes = published.map((ep, i) => ({
    url: `${SITE_URL}/podcast/${ep.slug}`,
    lastModified: episodeDates[i],
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  return [
    {
      url: `${SITE_URL}/`,
      lastModified: latestEpisodeDate,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/privacy`,
      lastModified: today,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    ...episodes,
  ];
}
