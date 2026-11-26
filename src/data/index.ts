import { monitorProtocols } from "./protocols-monitor";
import { anesthesiaProtocols } from "./protocols-anesthesia";
import type { Category, Protocol } from "./types";

export const allProtocols: Protocol[] = [...monitorProtocols, ...anesthesiaProtocols].sort(
  (a, b) => b.updatedAt.localeCompare(a.updatedAt),
);

export function getAllProtocols(): Protocol[] {
  return allProtocols;
}

export function getProtocolBySlug(slug: string): Protocol | undefined {
  return allProtocols.find((p) => p.slug === slug);
}

export function getProtocolsByCategory(category: Category): Protocol[] {
  return allProtocols.filter((p) => p.category === category);
}

export function getProtocolsByBrand(brandSlug: string): Protocol[] {
  return allProtocols.filter((p) => p.brandSlug === brandSlug);
}

export type BrandInfo = {
  slug: string;
  name: string;
  protocols: Protocol[];
  models: string[];
  monitorCount: number;
  anesthesiaCount: number;
  interfaces: string[];
};

export function getAllBrands(): BrandInfo[] {
  const map = new Map<string, Protocol[]>();
  for (const p of allProtocols) {
    const list = map.get(p.brandSlug) ?? [];
    list.push(p);
    map.set(p.brandSlug, list);
  }

  const names = new Map<string, string>();
  for (const p of allProtocols) names.set(p.brandSlug, p.brand);

  return Array.from(map.entries())
    .map(([slug, protocols]) => {
      const models = new Set<string>();
      const ifaces = new Set<string>();
      for (const p of protocols) {
        p.models.forEach((m) => models.add(m));
        p.interfaces.forEach((i) => ifaces.add(i));
      }
      return {
        slug,
        name: names.get(slug) ?? slug,
        protocols,
        models: Array.from(models),
        monitorCount: protocols.filter((p) => p.category === "monitor").length,
        anesthesiaCount: protocols.filter((p) => p.category === "anesthesia").length,
        interfaces: Array.from(ifaces),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "zh-Hans-CN"));
}

export function getBrandBySlug(slug: string): BrandInfo | undefined {
  return getAllBrands().find((b) => b.slug === slug);
}

export function getTotalModelCount(): number {
  const models = new Set<string>();
  for (const p of allProtocols) p.models.forEach((m) => models.add(m));
  return models.size;
}

export function getRecentUpdates(limit = 5) {
  return allProtocols.slice(0, limit);
}

/** 品牌前 10 标记：按收录协议数排序，前 10 视为重点品牌 */
export function getTopBrands(): BrandInfo[] {
  return getAllBrands()
    .sort((a, b) => b.protocols.length - a.protocols.length)
    .slice(0, 10);
}
