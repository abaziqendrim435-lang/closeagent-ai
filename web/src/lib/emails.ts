// Extract business emails that creators publish themselves (channel descriptions, bios).

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,24}/gi;

const IGNORE = [/^noreply@/i, /^no-reply@/i, /@example\./i, /@sentry\./i, /@email\.com$/i, /\.(png|jpg|jpeg|gif|webp)$/i];

/** Undo common obfuscations: "name [at] site [dot] com", "name(at)site.com". */
export function deobfuscate(text: string): string {
  return text
    .replace(/\s*[\[(\{]\s*at\s*[\])\}]\s*/gi, "@")
    .replace(/\s*[\[(\{]\s*dot\s*[\])\}]\s*/gi, ".")
    .replace(/\s+at\s+(?=[a-z0-9-]+\s*(?:\.|\s+dot\s+)[a-z]{2,})/gi, "@")
    .replace(/\s+dot\s+(?=[a-z]{2,}\b)/gi, ".");
}

export function extractEmails(text: string): string[] {
  if (!text) return [];
  const found = new Set<string>();
  for (const source of [text, deobfuscate(text)]) {
    for (const match of source.match(EMAIL_RE) ?? []) {
      const email = match.replace(/[.,;:]+$/, "").toLowerCase();
      if (!IGNORE.some((re) => re.test(email))) found.add(email);
    }
  }
  return [...found];
}

/** Prefer addresses that look like business/collab inboxes. */
export function pickBestEmail(emails: string[]): string {
  const score = (e: string) =>
    /^(business|collab|collabs|partner|partnerships|sponsor|sponsorships|brand|brands|work|hello|contact|inquiries|enquiries|booking|media)/.test(e)
      ? 0
      : 1;
  return [...emails].sort((a, b) => score(a) - score(b))[0] ?? "";
}
