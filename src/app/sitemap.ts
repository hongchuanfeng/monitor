import type { MetadataRoute } from "next";
import { getAllBrands, getAllProtocols } from "@/data";
import { siteConfig } from "@/data/site";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticPages: {
    path: string;
    priority: number;
    freq: MetadataRoute.Sitemap[number]["changeFrequency"];
  }[] = [
    { path: "/", priority: 1.0, freq: "daily" },
    { path: "/protocols/", priority: 0.9, freq: "weekly" },
    { path: "/protocols/monitor/", priority: 0.9, freq: "weekly" },
    { path: "/protocols/anesthesia/", priority: 0.9, freq: "weekly" },
    { path: "/code/", priority: 0.9, freq: "monthly" },
    { path: "/brands/", priority: 0.8, freq: "weekly" },
    { path: "/sitemap/", priority: 0.5, freq: "weekly" },
    { path: "/about/", priority: 0.6, freq: "yearly" },
    { path: "/contact/", priority: 0.6, freq: "yearly" },
    { path: "/privacy/", priority: 0.5, freq: "yearly" },
    { path: "/terms/", priority: 0.5, freq: "yearly" },
    { path: "/ads/", priority: 0.5, freq: "yearly" },
    { path: "/disclaimer/", priority: 0.5, freq: "yearly" },
    { path: "/changelog/", priority: 0.6, freq: "weekly" },
  ];

  const base: MetadataRoute.Sitemap = staticPages.map((p) => ({
    url: `${siteConfig.url}${p.path}`,
    lastModified: now,
    changeFrequency: p.freq,
    priority: p.priority,
  }));

  const protocols = getAllProtocols().map((p) => ({
    url: `${siteConfig.url}/protocols/${p.category}/${p.slug}/`,
    lastModified: new Date(p.updatedAt),
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  const brands = getAllBrands().map((b) => ({
    url: `${siteConfig.url}/brands/${b.slug}/`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  return [...base, ...protocols, ...brands];
}