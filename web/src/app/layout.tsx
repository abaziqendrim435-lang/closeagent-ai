import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SITE } from "@/lib/site";

const title = "CloseAgent — find creators & write personalized outreach";

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: title, template: "%s · CloseAgent" },
  description: SITE.description,
  applicationName: SITE.name,
  keywords: [
    "influencer outreach",
    "YouTube creator email finder",
    "cold email",
    "AI email writer",
    "B2B lead generation",
    "creator sponsorship outreach",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: SITE.url,
    siteName: SITE.name,
    title,
    description: SITE.description,
  },
  twitter: { card: "summary_large_image", title, description: SITE.description },
};

export const viewport: Viewport = { themeColor: "#07070d" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className="antialiased">{children}</body>
    </html>
  );
}
