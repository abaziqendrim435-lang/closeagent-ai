import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/login", "/terms", "/privacy"].map((path) => ({
    url: `${SITE.url}${path}`,
    changeFrequency: path ? "yearly" : "weekly",
    priority: path ? 0.4 : 1,
  }));
}
