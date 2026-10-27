import { env } from "@/lib/env";
import { extractEmails, pickBestEmail } from "@/lib/emails";

const API = "https://www.googleapis.com/youtube/v3";

export interface CreatorResult {
  channelId: string;
  name: string;
  handle: string;
  url: string;
  subscribers: number | null;
  videoCount: number | null;
  country: string;
  description: string;
  email: string;
  allEmails: string[];
  recentVideoTitle: string;
}

export interface CreatorSearch {
  query: string;
  minSubscribers?: number;
  maxSubscribers?: number;
  maxResults?: number; // creators to return (after filters)
  regionCode?: string;
  language?: string; // relevanceLanguage, e.g. "en"
  activeWithinDays?: number;
}

async function yt<T>(path: string, params: Record<string, string>): Promise<T> {
  const qs = new URLSearchParams({ ...params, key: env.youtubeKey() });
  const res = await fetch(`${API}/${path}?${qs}`, { cache: "no-store" });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const reason = body?.error?.errors?.[0]?.reason ?? "";
    if (reason === "quotaExceeded" || reason === "dailyLimitExceeded")
      throw new Error("YouTube daily search quota reached. Try again tomorrow.");
    throw new Error(body?.error?.message || `YouTube API error ${res.status}`);
  }
  return body as T;
}

interface SearchItem {
  id: { videoId?: string; channelId?: string };
  snippet: { channelId: string; title: string; publishedAt: string };
}
interface ChannelItem {
  id: string;
  snippet: { title: string; description: string; customUrl?: string; country?: string };
  statistics?: { subscriberCount?: string; videoCount?: string; hiddenSubscriberCount?: boolean };
}

/**
 * Find active creators who recently published videos about `query`, then read their
 * public channel info. Emails come only from what the creator published in their
 * channel description — the hidden "View email address" button is not accessed.
 * Quota: ~100 units per search page + 1 per channels call (default daily quota: 10,000).
 */
export async function findCreators(opts: CreatorSearch): Promise<CreatorResult[]> {
  const want = Math.min(Math.max(opts.maxResults ?? 25, 1), 50);
  const days = opts.activeWithinDays ?? 180;
  const publishedAfter = new Date(Date.now() - days * 86_400_000).toISOString();

  const recentTitle = new Map<string, string>();
  let pageToken = "";
  for (let page = 0; page < 2 && recentTitle.size < want * 3; page++) {
    const params: Record<string, string> = {
      part: "snippet",
      type: "video",
      q: opts.query,
      maxResults: "50",
      order: "relevance",
      publishedAfter,
    };
    if (pageToken) params.pageToken = pageToken;
    if (opts.regionCode) params.regionCode = opts.regionCode;
    if (opts.language) params.relevanceLanguage = opts.language;
    const data = await yt<{ items: SearchItem[]; nextPageToken?: string }>("search", params);
    for (const item of data.items ?? []) {
      const id = item.snippet.channelId;
      if (id && !recentTitle.has(id)) recentTitle.set(id, item.snippet.title);
    }
    if (!data.nextPageToken) break;
    pageToken = data.nextPageToken;
  }

  const ids = [...recentTitle.keys()];
  const channels: ChannelItem[] = [];
  for (let i = 0; i < ids.length; i += 50) {
    const data = await yt<{ items: ChannelItem[] }>("channels", {
      part: "snippet,statistics",
      id: ids.slice(i, i + 50).join(","),
      maxResults: "50",
    });
    channels.push(...(data.items ?? []));
  }

  const min = opts.minSubscribers ?? 0;
  const max = opts.maxSubscribers ?? Number.MAX_SAFE_INTEGER;
  const results: CreatorResult[] = [];
  for (const ch of channels) {
    const subs = ch.statistics?.hiddenSubscriberCount ? null : Number(ch.statistics?.subscriberCount ?? NaN);
    if (subs !== null && (Number.isNaN(subs) || subs < min || subs > max)) continue;
    const emails = extractEmails(ch.snippet.description ?? "");
    const handle = ch.snippet.customUrl ?? "";
    results.push({
      channelId: ch.id,
      name: ch.snippet.title,
      handle,
      url: handle ? `https://www.youtube.com/${handle}` : `https://www.youtube.com/channel/${ch.id}`,
      subscribers: subs,
      videoCount: ch.statistics?.videoCount ? Number(ch.statistics.videoCount) : null,
      country: ch.snippet.country ?? "",
      description: (ch.snippet.description ?? "").slice(0, 1200),
      email: pickBestEmail(emails),
      allEmails: emails,
      recentVideoTitle: decodeEntities(recentTitle.get(ch.id) ?? ""),
    });
  }

  // Creators with a public email first, then by audience size.
  results.sort((a, b) => Number(!!b.email) - Number(!!a.email) || (b.subscribers ?? 0) - (a.subscribers ?? 0));
  return results.slice(0, want);
}

function decodeEntities(s: string) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}
