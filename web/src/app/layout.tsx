import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CloseAgent — find creators & write personalized outreach",
  description:
    "Find YouTube creators and company decision-makers with their public business emails, then write personalized outreach in minutes.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
