# Adding a Podcast Episode

This site has **no CMS**. An episode is added by editing two data files and
adding three images, then committing — Vercel auto-deploys `main`. The episode
page at `/podcast/<slug>`, the homepage card, the sitemap, the RSS feed, and all
SEO/structured-data are **generated automatically** from the episode's data
entry. You don't write any new page.

> **Quick gut-check before you start:** you need the guest's details, the three
> images, and the streaming links (YouTube / Spotify / Apple). With those in
> hand the whole thing is ~15 minutes.

---

## The 4 steps

### 1. Add three images

Name every file after the guest **slug** (lowercase, hyphenated, e.g.
`morgane-palomares`):

| File | Location | Used for | Recommended size |
|---|---|---|---|
| `guest-<slug>.jpg` | `public/images/assets/` | Square photo on episode cards / lists | ~800×800, square |
| `guest-<slug>-cover.jpg` | `public/images/assets/` | Wide cover / poster on the detail page | ~1600×900, 16:9 |
| `og-<slug>.jpg` | `public/images/` | Social share card (LinkedIn/X/iMessage) | **1200×630** (do not skip — this is the SEO share image) |

### 2. Wire the images up — `src/lib/episodeImages.ts`

This file is the single source of truth for episode imagery. Add **four lines**:

```ts
// near the other consts at the top:
const guestMorgane = "/images/assets/guest-morgane-palomares.jpg";
const morganeCover = "/images/assets/guest-morgane-palomares-cover.jpg";

// then one entry in EACH of the three maps, keyed by slug:
EPISODE_IMAGES:  "morgane-palomares": guestMorgane,
POSTER_IMAGES:   "morgane-palomares": morganeCover,
OG_IMAGES:       "morgane-palomares": `/images/og-morgane-palomares.jpg?${OG_VERSION}`,
```

- **OG image must use the `?${OG_VERSION}` cache-buster** like the others.
  If you ever *replace* an already-published OG image, bump `OG_VERSION`
  (e.g. `v4` → `v5`) so social platforms re-scrape it.
- If you skip the `OG_IMAGES` entry the page still works but falls back to a
  YouTube thumbnail for the share card — lower quality. Don't skip it.

### 3. Add the episode data — `src/lib/podcastData.ts`

Append a new object to the `podcastEpisodes` array. Copy the most recent episode
as a template. Field reference (see `PodcastEpisode` interface at the top of the
file):

**Required**

| Field | Notes |
|---|---|
| `id` | Next integer. |
| `slug` | URL + image key. Lowercase-hyphenated. **Must match the image filenames.** |
| `name` | Guest full name. |
| `title` | Guest job title (e.g. "VP of Marketing"). |
| `company` | Company name. |
| `companyDomain` | e.g. `braintrust.com` (used for the company logo). |
| `overview` | **One short keyword-rich phrase** — drives the SEO `<title>`. See SEO note below. |
| `fullDescription` | 1–2 paragraph episode summary. Drives JSON-LD description + RSS. Make the **first paragraph** strong and keyword-rich. |
| `topics` | Array of bullet-point takeaways. |
| `chapters` | Array of `{ time, title }`. `[]` is allowed if you don't have timestamps. |
| `youtubeUrl`, `spotifyUrl` | Streaming links. |
| `duration` | e.g. `"51 min"`. |
| `publishedDate` | **Must be a parseable date string**, e.g. `"Jun 17, 2026"`. RSS + structured data break on bad dates. |
| `comingSoon` | `false` to publish (adds it to sitemap + RSS). `true` hides it from feeds and shows a teaser. |

**Optional but recommended:** `appleUrl`, `bio`, `pullQuote`, `themes`
(filter tabs: `"AI" | "Brand" | "GTM"`), `detailTags`, `linkedInUrl`, `hosts`
(reference `podcastHosts[n]`), `newslettersMentioned`.

### 4. Commit & deploy

```bash
git checkout -b episode-NN-<firstname>
npm run check:seo      # verify SEO wiring (see below)
npm run build          # catch type errors before pushing
git add -A
git commit -m "feat: add Episode NN — <Name> (<Company>)"
git push -u origin episode-NN-<firstname>
```

Open a PR → merge to `main` → Vercel deploys automatically. Convention is one
branch per episode (`episode-15-...`).

---

## SEO — what's automatic vs. what you control

**Fully automatic** (you do nothing — derived from the data entry above):

- `<title>` and meta description — built by `buildEpisodeSeo()`
- Canonical URL — `https://fom.xyz/podcast/<slug>`
- OpenGraph + Twitter `summary_large_image` cards (uses your `og-<slug>.jpg`)
- **JSON-LD structured data** — `PodcastEpisode` + `BreadcrumbList`
  (uses `fullDescription`, `publishedDate`, OG image)
- **Sitemap** (`/sitemap.xml`) — every non-`comingSoon` episode
- **RSS feed** (`/rss.xml`) — sorted by `publishedDate`

**What you actually control for good SEO:**

1. **`overview` = your SEO title.** The title is built as
   `"<name>: <overview> | FOM Podcast"` and **truncated to 60 characters**.
   Every current episode runs over 60 and gets gracefully truncated with `…`,
   which is acceptable — but if you want the full phrase to show in Google,
   keep `<name>: <overview>` under ~45 chars. Front-load keywords.
2. **`fullDescription` first paragraph** = your structured-data + RSS
   description. Write it for humans *and* search: mention the guest, company,
   and the concrete topics (AI workflows, GTM, brand, etc.).
3. **`og-<slug>.jpg` at 1200×630** = your share image. Wrong size = cropped
   previews on LinkedIn/X.
4. **Valid `publishedDate`** = feeds and `datePublished` work.

### Verify SEO is done

Run the checker — it confirms every episode is registered in all three image
maps, the OG file exists, and dates are parseable. It exits non-zero on any gap
(safe for CI):

```bash
npm run check:seo
```

It also prints soft notes about which SEO titles will be truncated, so you can
tighten `overview` if you want.

---

## Site-wide SEO constants

Global values live in `src/lib/seoConstants.ts`: `SITE_URL`
(`https://fom.xyz`), default OG image, site title, and description. Change these
only for site-wide updates, not per episode.

---

## Per-episode extras (optional)

Past episodes occasionally also: showed a **"New" badge** on the latest episode,
removed an older guest, or adjusted the filter tabs (All / AI / Brand / GTM).
Those live in `PodcastDetailClient.tsx` and the section components — only touch
them if you specifically want that behavior.
