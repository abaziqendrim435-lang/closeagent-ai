import { env } from "@/lib/env";

export interface CompanyContact {
  domain: string;
  company: string;
  name: string;
  title: string;
  email: string;
  confidence: number | null;
  verification: string;
}

const PLATFORM_DOMAINS = new Set([
  "youtube.com", "youtu.be", "instagram.com", "tiktok.com", "facebook.com", "x.com", "twitter.com",
  "linkedin.com", "twitch.tv", "pinterest.com", "reddit.com", "medium.com", "substack.com",
  "linktr.ee", "github.com", "gmail.com", "outlook.com", "hotmail.com", "yahoo.com", "google.com",
  "amazon.com", "wordpress.com", "blogspot.com", "wixsite.com", "whop.com", "gumroad.com",
]);

export function normalizeDomain(input: string): string {
  let raw = input.trim().toLowerCase();
  if (!raw) return "";
  if (!raw.includes("://")) raw = `https://${raw}`;
  try {
    return new URL(raw).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export function isPlatformDomain(domain: string) {
  return [...PLATFORM_DOMAINS].some((p) => domain === p || domain.endsWith(`.${p}`));
}

/**
 * Hunter.io domain search: decision-makers at a company website.
 * Returns up to `limit` contacts with their published work emails.
 */
export async function findCompanyContacts(domainInput: string, limit = 2): Promise<CompanyContact[]> {
  const key = env.hunterKey();
  if (!key) throw new Error("Company search is not configured yet (missing HUNTER_API_KEY).");
  const domain = normalizeDomain(domainInput);
  if (!domain) return [];
  if (isPlatformDomain(domain)) return [];

  const qs = new URLSearchParams({
    domain,
    api_key: key,
    type: "personal",
    seniority: "executive,senior",
    limit: String(Math.min(Math.max(limit, 1), 5)),
  });
  const res = await fetch(`https://api.hunter.io/v2/domain-search?${qs}`, { cache: "no-store" });
  const body = await res.json().catch(() => ({}));
  if (res.status === 401 || res.status === 403) throw new Error("Hunter.io key is invalid.");
  if (res.status === 429) throw new Error("Company search is busy (rate limit). Try again in a minute.");
  if (!res.ok) throw new Error(body?.errors?.[0]?.details || `Hunter.io error ${res.status}`);

  const data = body?.data ?? {};
  const company: string = data.organization || domain.split(".")[0];
  return ((data.emails ?? []) as Array<Record<string, unknown>>)
    .filter((e) => typeof e.value === "string" && e.value)
    .map((e) => ({
      domain,
      company,
      name: [e.first_name, e.last_name].filter(Boolean).join(" "),
      title: String(e.position ?? ""),
      email: String(e.value),
      confidence: typeof e.confidence === "number" ? e.confidence : null,
      verification: String((e.verification as { status?: string } | undefined)?.status ?? ""),
    }));
}
