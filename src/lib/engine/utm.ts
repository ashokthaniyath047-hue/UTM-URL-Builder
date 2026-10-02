/**
 * UTM engine: resolves a brand's UTMRule templates against campaign context.
 * Rules are always brand + platform specific; nothing here is a universal default.
 */
import { fieldOptions } from "@/lib/domain/fields";
import type { Brand, CampaignFields, Platform, TrackingParams, UTMRule, UtmKey } from "@/lib/domain/types";
import { UTM_KEYS } from "@/lib/domain/types";
import { isDynamicValue } from "./url";

export interface UtmPlaceholderDef {
  token: string;
  label: string;
  description: string;
}

/** Placeholders available inside UTM rule templates. */
export const UTM_PLACEHOLDERS: UtmPlaceholderDef[] = [
  { token: "campaign_name", label: "Campaign name", description: "Generated campaign name" },
  { token: "campaign_id", label: "Campaign ID", description: "Internal campaign ID, e.g. C1042" },
  { token: "brand", label: "Brand", description: "Brand code" },
  { token: "platform", label: "Platform", description: "meta / google" },
  { token: "objective", label: "Objective", description: "Objective code" },
  { token: "campaign_type", label: "Campaign type", description: "Google campaign type code" },
  { token: "audience", label: "Audience", description: "Meta audience code" },
  { token: "market", label: "Market", description: "Market code" },
  { token: "product", label: "Product", description: "Product / collection" },
  { token: "ad_set", label: "Ad set / Ad group", description: "Ad set or ad group name" },
  { token: "creative_name", label: "Creative name", description: "Meta ad / creative name (falls back to {{ad.name}})" },
  { token: "ad_name", label: "Ad name", description: "Google ad / asset name" },
  { token: "keyword", label: "Keyword", description: "Keyword (falls back to Google {keyword} ValueTrack)" },
];

export const UTM_LABELS: Record<UtmKey, { label: string; param: string; description: string; example: string; required: boolean }> = {
  source: {
    label: "Source",
    param: "utm_source",
    description: "The referrer: where the traffic comes from.",
    example: "meta, google, newsletter",
    required: true,
  },
  medium: {
    label: "Medium",
    param: "utm_medium",
    description: "The marketing channel.",
    example: "paid_social, paid_search, email",
    required: true,
  },
  campaign: {
    label: "Campaign",
    param: "utm_campaign",
    description: "Campaign name, slogan or promo code.",
    example: "ajmal_meta_sales_prospecting_in_oct26",
    required: true,
  },
  term: {
    label: "Term",
    param: "utm_term",
    description: "Paid keywords (mostly used for search).",
    example: "{keyword}, oud perfume",
    required: false,
  },
  content: {
    label: "Content",
    param: "utm_content",
    description: "Differentiates ads or creatives pointing to the same URL.",
    example: "kuro_video_15s_v1",
    required: false,
  },
  id: {
    label: "ID",
    param: "utm_id",
    description: "Campaign ID; used for GA4 cost data import.",
    example: "C1042",
    required: false,
  },
};

export interface UtmContext {
  brand: Pick<Brand, "code" | "name">;
  platform: Platform;
  fields: CampaignFields;
  campaignName: string;
  campaignCode: string;
}

/** Platform-native dynamic values used when the campaign doesn't supply one. */
const PLATFORM_FALLBACKS: Record<Platform, Partial<Record<string, string>>> = {
  meta: { creative_name: "{{ad.name}}", ad_name: "{{ad.name}}", ad_set: "{{adset.name}}" },
  google: { keyword: "{keyword}" },
};

function code(platform: Platform, key: "objective" | "campaignType" | "audience" | "market", value?: string) {
  if (!value) return "";
  return fieldOptions(key, platform).find((o) => o.value === value)?.code ?? value;
}

function placeholderValue(token: string, ctx: UtmContext): string | undefined {
  const f = ctx.fields;
  const values: Record<string, string | undefined> = {
    campaign_name: ctx.campaignName,
    campaign_id: ctx.campaignCode,
    brand: ctx.brand.code,
    platform: ctx.platform,
    objective: code(ctx.platform, "objective", f.objective),
    campaign_type: code(ctx.platform, "campaignType", f.campaignType),
    audience: code(ctx.platform, "audience", f.audience),
    market: code(ctx.platform, "market", f.market),
    product: f.product,
    ad_set: ctx.platform === "meta" ? f.adSetName : f.adGroupName,
    creative_name: f.creativeName,
    ad_name: ctx.platform === "google" ? f.adName : f.creativeName,
    keyword: f.keyword,
  };
  if (!(token in values)) return undefined; // unknown token → leave literal
  const v = values[token]?.trim();
  if (v) return v;
  return PLATFORM_FALLBACKS[ctx.platform][token] ?? "";
}

/** Normalise a resolved value according to the rule, leaving dynamic tokens intact. */
function normalize(value: string, rule: Pick<UTMRule, "casing" | "spaceReplacement">): string {
  return value
    .split(/(\{\{[a-z_.]+\}\}|\{[a-z_:]+\})/gi)
    .map((part, i) => {
      if (i % 2 === 1) return part;
      let v = part;
      if (rule.spaceReplacement !== "keep") v = v.replace(/\s+/g, rule.spaceReplacement);
      if (rule.casing === "lower") v = v.toLowerCase();
      return v;
    })
    .join("")
    .trim();
}

export function resolveUtmTemplate(template: string, ctx: UtmContext, rule: Pick<UTMRule, "casing" | "spaceReplacement">): string {
  if (!template) return "";
  const resolved = template.replace(/\{\{[^}]+\}\}|\{([a-z_]+)\}/g, (match, token?: string) => {
    if (!token) return match; // Meta {{dynamic}} — keep as-is
    const v = placeholderValue(token, ctx);
    return v === undefined ? match : v;
  });
  return normalize(resolved, rule);
}

export interface UtmResult {
  params: TrackingParams;
  /** Which values came from manual overrides. */
  overridden: UtmKey[];
  /** Which values are platform dynamic parameters substituted at click time. */
  dynamic: UtmKey[];
}

export function generateTracking(rule: UTMRule, ctx: UtmContext, overrides: TrackingParams = {}): UtmResult {
  const params: TrackingParams = {};
  const overridden: UtmKey[] = [];
  const dynamic: UtmKey[] = [];
  for (const key of UTM_KEYS) {
    const override = overrides[key];
    let value: string;
    if (override !== undefined) {
      value = override.trim();
      overridden.push(key);
    } else {
      // utm_id must match the campaign ID exactly, so it is never re-cased.
      value = resolveUtmTemplate(rule.params[key] ?? "", ctx, key === "id" ? { ...rule, casing: "preserve" } : rule);
    }
    if (value) {
      params[key] = value;
      if (isDynamicValue(value)) dynamic.push(key);
    }
  }
  return { params, overridden, dynamic };
}

export interface UtmIssue {
  key: UtmKey;
  message: string;
  severity: "error" | "warning";
}

const SAFE_VALUE = /^[A-Za-z0-9_\-.~+|:{}() ]*$/;

export function validateTracking(params: TrackingParams, rule: Pick<UTMRule, "required">): UtmIssue[] {
  const issues: UtmIssue[] = [];
  const required = new Set<UtmKey>(["source", "medium", "campaign", ...rule.required]);
  for (const key of UTM_KEYS) {
    const v = params[key];
    if (!v) {
      if (required.has(key)) issues.push({ key, severity: "error", message: `utm_${key} is required but empty.` });
      continue;
    }
    if (v.length > 150) issues.push({ key, severity: "warning", message: `utm_${key} is longer than 150 characters.` });
    if (/\s/.test(v)) issues.push({ key, severity: "warning", message: `utm_${key} contains spaces.` });
    if (!SAFE_VALUE.test(v)) {
      issues.push({ key, severity: "warning", message: `utm_${key} contains special characters that will be percent-encoded.` });
    }
    if ((key === "source" || key === "medium") && v !== v.toLowerCase() && !isDynamicValue(v)) {
      issues.push({ key, severity: "warning", message: `utm_${key} should be lowercase for consistent GA4 reporting.` });
    }
  }
  return issues;
}
