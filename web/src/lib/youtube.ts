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
  emailSource: "channel" | "video" | "";
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
interface VideoItem {
  id: string;
  snippet: { channelId: string; description?: string };
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
  const recentVideos = new Map<string, string[]>(); // channelId -> up to 3 recent matching video ids
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
      if (!id) continue;
      if (!recentTitle.has(id)) recentTitle.set(id, item.snippet.title);
      const vids = recentVideos.get(id) ?? [];
      if (item.id.videoId && vids.length < 3) recentVideos.set(id, [...vids, item.id.videoId]);
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
  const kept = channels.filter((ch) => {
    const subs = ch.statistics?.hiddenSubscriberCount ? null : Number(ch.statistics?.subscriberCount ?? NaN);
    return subs === null || (!Number.isNaN(subs) && subs >= min && subs <= max);
  });

  // Many creators publish their business email in every video description rather than the
  // channel "about" text, so read the full descriptions of their matching videos too
  // (videos.list costs 1 quota unit per 50 videos).
  const videoText = new Map<string, string>();
  const videoIds = kept.flatMap((ch) => recentVideos.get(ch.id) ?? []);
  for (let i = 0; i < videoIds.length; i += 50) {
    const data = await yt<{ items: VideoItem[] }>("videos", {
      part: "snippet",
      id: videoIds.slice(i, i + 50).join(","),
      maxResults: "50",
    });
    for (const v of data.items ?? []) {
      const prev = videoText.get(v.snippet.channelId) ?? "";
      videoText.set(v.snippet.channelId, `${prev}\n${v.snippet.description ?? ""}`);
    }
  }

  const results: CreatorResult[] = [];
  for (const ch of kept) {
    const subs = ch.statistics?.hiddenSubscriberCount ? null : Number(ch.statistics?.subscriberCount ?? NaN);
    const channelEmails = extractEmails(ch.snippet.description ?? "");
    const emails = channelEmails.length ? channelEmails : extractEmails(videoText.get(ch.id) ?? "");
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
      emailSource: channelEmails.length ? "channel" : emails.length ? "video" : "",
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
