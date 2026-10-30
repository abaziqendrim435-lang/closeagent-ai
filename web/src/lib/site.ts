// Public site facts used by the landing page, legal pages and metadata.

export const SITE = {
  name: "CloseAgent",
  url: (process.env.NEXT_PUBLIC_SITE_URL || "https://closeagent-ai.netlify.app").replace(/\/$/, ""),
  tagline: "Find the right people. Write to them like a human.",
  description:
    "Find YouTube creators and company decision-makers with their public business emails, then write personalized outreach in minutes.",
  company: "Atlas Online",
  address: "30 N Gould St, STE R, Sheridan, WY 82801, USA",
  // Set NEXT_PUBLIC_SUPPORT_EMAIL in Netlify to show a contact address on the site.
  supportEmail: (process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "").trim(),
  legalUpdated: "October 30, 2026",
};
