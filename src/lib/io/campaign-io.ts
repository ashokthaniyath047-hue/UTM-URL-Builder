/**
 * Campaign ⇄ table mapping for import/export (format-agnostic).
 */
import { PLATFORM_LABELS, STATUS_LABELS } from "@/lib/domain/fields";
import type { Campaign, CampaignDraft, CampaignFieldKey, CampaignOSData, Platform } from "@/lib/domain/types";
import { computeCampaign } from "@/lib/engine/campaign";
import { getTemplate } from "@/lib/engine/templates";
import { parseLandingUrl } from "@/lib/engine/url";
import type { Table } from "./formats";

export const EXPORT_COLUMNS = [
  "campaign_id", "campaign_name", "brand", "platform", "template", "status", "objective",
  "campaign_type", "audience", "market", "country", "product", "ad_set_ad_group", "ad_name",
  "budget", "landing_url", "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
  "utm_id", "generated_url", "owner", "updated_at",
] as const;

type Exportable = CampaignDraft & Partial<Pick<Campaign, "status" | "updatedAt">>;

export function campaignsToTable(campaigns: Exportable[], data: CampaignOSData): Table {
  const rows = campaigns.map((c) => {
    const computed = computeCampaign(c, data);
    const brand = data.brands.find((b) => b.id === c.brandId);
    const template = getTemplate(data, c.templateId, c.platform);
    const owner = data.users.find((u) => u.id === c.ownerId);
    const t = computed.tracking.params;
    const f = c.fields;
    return [
      c.code, computed.name, brand?.name ?? "", PLATFORM_LABELS[c.platform], template?.name ?? "",
      STATUS_LABELS[c.status ?? "draft"], f.objective ?? "", c.platform === "google" ? f.campaignType ?? "" : template?.name ?? "",
      f.audience ?? "", f.market ?? "", f.country ?? "", f.product ?? "",
      (c.platform === "meta" ? f.adSetName : f.adGroupName) ?? "",
      (c.platform === "meta" ? f.creativeName : f.adName) ?? "",
      f.budget ?? "", c.landingUrl, t.source ?? "", t.medium ?? "", t.campaign ?? "", t.term ?? "",
      t.content ?? "", t.id ?? "", computed.generatedUrl, owner?.name ?? "", c.updatedAt ?? "",
    ];
  });
  return { headers: [...EXPORT_COLUMNS], rows };
}

/* ------------------------------------------------------------------ */
/* Import                                                              */
/* ------------------------------------------------------------------ */

export type ImportTarget =
  | "brand" | "platform" | "template" | "landing_url" | "campaign_name"
  | CampaignFieldKey;

export interface ImportTargetDef {
  key: ImportTarget;
  label: string;
  required?: boolean;
  aliases: string[];
}

export const IMPORT_TARGETS: ImportTargetDef[] = [
  { key: "brand", label: "Brand", required: true, aliases: ["brand", "brand_name", "account"] },
  { key: "platform", label: "Platform", required: true, aliases: ["platform", "channel", "network_platform"] },
  { key: "landing_url", label: "Landing URL", required: true, aliases: ["landing_url", "url", "final_url", "landing_page", "destination"] },
  { key: "template", label: "Template", aliases: ["template", "campaign_template"] },
  { key: "campaign_name", label: "Campaign name (override)", aliases: ["campaign_name", "name", "campaign"] },
  { key: "objective", label: "Objective", aliases: ["objective"] },
  { key: "market", label: "Market", aliases: ["market", "region"] },
  { key: "country", label: "Country", aliases: ["country"] },
  { key: "product", label: "Product / Collection", aliases: ["product", "collection", "product_collection"] },
  { key: "audience", label: "Audience (Meta)", aliases: ["audience"] },
  { key: "campaignType", label: "Campaign type (Google)", aliases: ["campaign_type", "type"] },
  { key: "budget", label: "Budget", aliases: ["budget", "daily_budget"] },
  { key: "adSetName", label: "Ad set (Meta)", aliases: ["ad_set", "adset", "ad_set_name", "ad_set_ad_group"] },
  { key: "adGroupName", label: "Ad group (Google)", aliases: ["ad_group", "adgroup", "asset_group", "ad_group_name"] },
  { key: "creativeName", label: "Creative (Meta)", aliases: ["creative", "creative_name"] },
  { key: "adName", label: "Ad name (Google)", aliases: ["ad_name", "ad", "asset"] },
  { key: "keyword", label: "Keyword", aliases: ["keyword", "term"] },
];

const norm = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

/** Auto-map file headers to targets by alias. Returns header index → target. */
export function autoMap(headers: string[]): Record<number, ImportTarget | ""> {
  const used = new Set<ImportTarget>();
  const map: Record<number, ImportTarget | ""> = {};
  headers.forEach((h, i) => {
    const n = norm(h);
    const t = IMPORT_TARGETS.find((d) => !used.has(d.key) && (d.aliases.includes(n) || norm(d.label) === n));
    map[i] = t?.key ?? "";
    if (t) used.add(t.key);
  });
  return map;
}

export interface ImportRowResult {
  index: number;
  draft?: CampaignDraft;
  errors: string[];
  warnings: string[];
  preview: { brand: string; platform: string; name: string; url: string };
}

function parsePlatform(v: string): Platform | undefined {
  const n = v.toLowerCase().trim();
  if (["meta", "facebook", "fb", "instagram"].includes(n)) return "meta";
  if (["google", "google ads", "adwords"].includes(n)) return "google";
}

export function validateImport(
  table: Table,
  mapping: Record<number, ImportTarget | "">,
  data: CampaignOSData,
): ImportRowResult[] {
  const col = (row: string[], target: ImportTarget) => {
    const idx = Object.entries(mapping).find(([, t]) => t === target)?.[0];
    return idx === undefined ? "" : (row[Number(idx)] ?? "").trim();
  };

  return table.rows.map((row, index) => {
    const errors: string[] = [];
    const warnings: string[] = [];
    const brandName = col(row, "brand");
    const brand = data.brands.find(
      (b) => b.name.toLowerCase() === brandName.toLowerCase() || b.code.toLowerCase() === brandName.toLowerCase(),
    );
    if (!brandName) errors.push("Brand is empty");
    else if (!brand) errors.push(`Unknown brand "${brandName}"`);

    const platformRaw = col(row, "platform");
    const platform = parsePlatform(platformRaw);
    if (!platform) errors.push(platformRaw ? `Unknown platform "${platformRaw}"` : "Platform is empty");
    else if (brand && !brand.platforms.includes(platform)) errors.push(`${brand.name} is not enabled for ${PLATFORM_LABELS[platform]}`);

    const url = col(row, "landing_url");
    const parsed = parseLandingUrl(url);
    if (!parsed.valid) errors.push(parsed.error ?? "Invalid landing URL");

    const templateName = col(row, "template");
    const template = platform
      ? data.templates.find((t) => t.platform === platform && t.name.toLowerCase() === templateName.toLowerCase())
      : undefined;
    if (templateName && !template) warnings.push(`Template "${templateName}" not found — using scratch`);

    const fields: CampaignDraft["fields"] = { ...(template?.defaults ?? {}) };
    for (const def of IMPORT_TARGETS) {
      if (["brand", "platform", "template", "landing_url", "campaign_name"].includes(def.key)) continue;
      const v = col(row, def.key);
      if (v) fields[def.key as CampaignFieldKey] = v;
    }
    if (brand) {
      fields.market ??= brand.defaultMarket;
      fields.country ??= brand.country;
    }

    const nameOverride = col(row, "campaign_name") || null;
    let draft: CampaignDraft | undefined;
    let name = "";
    if (!errors.length && brand && platform) {
      draft = {
        code: "C0000",
        brandId: brand.id,
        platform,
        templateId: template?.id ?? "scratch",
        ownerId: data.settings.currentUserId,
        fields,
        landingUrl: url,
        existingParamPolicy: data.settings.defaultExistingPolicy,
        nameOverride,
        trackingOverrides: {},
      };
      const c = computeCampaign(draft, data);
      name = c.name;
      if (c.validation.errors) warnings.push(`${c.validation.errors} validation issue(s) — will import as Draft`);
    }

    return {
      index,
      draft,
      errors,
      warnings,
      preview: { brand: brand?.name ?? brandName, platform: platform ? PLATFORM_LABELS[platform] : platformRaw, name, url },
    };
  });
}

export const SAMPLE_IMPORT_CSV = [
  "brand,platform,template,landing_url,objective,market,audience,campaign_type,product,budget,ad_set,ad_group",
  "Ajmal,Meta,Sales - Prospecting,https://www.tirabeauty.com/product/ajmal-kuro-eau-de-perfume-90ml--bfxjntcjip,Sales,IN,Prospecting - Broad,,Kuro EDP 90ml,8000,IN_BROAD,",
  "Ajmal,Google,Performance Max,https://www.tirabeauty.com/collection/ajmal-perfumes,Sales,IN,,Performance Max,Ajmal Perfumes,,,ajmal_all_products",
  "Tira Beauty,Meta,Offer / Sale,https://www.tirabeauty.com/collection/festive-beauty-sale,Sales,IN,Advantage+ audience,,Festive Sale,120000,IN_ADVPLUS,",
  "Brand Z,Meta,,https://example.com,Sales,IN,,,,,,",
].join("\n");
