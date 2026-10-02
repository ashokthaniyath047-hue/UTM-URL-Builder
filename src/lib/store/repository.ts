/**
 * Persistence boundary. The MVP stores everything in localStorage; a server-backed
 * implementation (Meta/Google sync, multi-user) can replace this without touching UI code.
 */
import type { CampaignOSData } from "@/lib/domain/types";
import { createSeedData, DATA_VERSION } from "@/lib/data/seed";

export interface CampaignOSRepository {
  load(): CampaignOSData;
  save(data: CampaignOSData): void;
  reset(): CampaignOSData;
}

const KEY = "campaign-os:data";

export class LocalStorageRepository implements CampaignOSRepository {
  load(): CampaignOSData {
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as CampaignOSData;
        if (parsed?.version === DATA_VERSION && Array.isArray(parsed.campaigns)) return parsed;
      }
    } catch {
      // Corrupt or blocked storage — fall through to seed data.
    }
    const seed = createSeedData();
    this.save(seed);
    return seed;
  }

  save(data: CampaignOSData): void {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(data));
    } catch {
      // Storage full/blocked: keep working in memory.
    }
  }

  reset(): CampaignOSData {
    const seed = createSeedData();
    this.save(seed);
    return seed;
  }
}
