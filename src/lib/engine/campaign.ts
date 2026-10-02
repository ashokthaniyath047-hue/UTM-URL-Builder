/**
 * The campaign pipeline. Every screen (wizard, detail, list, export) calls
 * `computeCampaign` so generated values are always derived the same way.
 *
 *   draft → template resolution → rules → name → tracking → URL → validation
 */
import { FIELD_DEFS, PLATFORM_LABELS, STRUCTURE_LABELS } from "@/lib/domain/fields";
import type { Brand, CampaignDraft, CampaignOSData, CampaignTemplate, TrackingParams } from "@/lib/domain/types";
import { generateName, type NamingResult } from "./naming";
import { getTemplate, resolveRules, resolveTemplate, type ResolvedTemplate } from "./templates";
import { buildCampaignUrl, parseLandingUrl, type BuildUrlResult, type ParsedLandingUrl } from "./url";
import { generateTracking, type UtmResult } from "./utm";
import { validateComputed, type ValidationResult } from "./validation";

export interface ComputedCampaign {
  draft: CampaignDraft;
  brand?: Brand;
  template?: CampaignTemplate;
  resolved: ResolvedTemplate;
  naming?: NamingResult;
  name: string;
  nameIsGenerated: boolean;
  tracking: UtmResult;
  parsedUrl: ParsedLandingUrl;
  built: BuildUrlResult;
  generatedUrl: string;
  validation: ValidationResult;
  rules: ReturnType<typeof resolveRules>;
}

export type EngineData = Pick<CampaignOSData, "brands" | "templates" | "namingRules" | "utmRules">;

export function computeCampaign(draft: CampaignDraft, data: EngineData, now: Date = new Date()): ComputedCampaign {
  const brand = data.brands.find((b) => b.id === draft.brandId);
  const template = getTemplate(data, draft.templateId, draft.platform);
  const resolved = resolveTemplate(template, draft.platform);
  const rules = resolveRules(data, brand, draft.platform, template);

  const naming =
    brand && rules.namingRule
      ? generateName(rules.namingRule, {
          brand,
          platform: draft.platform,
          fields: draft.fields,
          campaignCode: draft.code,
          date: draft.createdAt ? new Date(draft.createdAt) : now,
        })
      : undefined;

  const nameIsGenerated = draft.nameOverride === null || draft.nameOverride === undefined;
  const name = nameIsGenerated ? naming?.name ?? "" : (draft.nameOverride ?? "");

  const tracking: UtmResult =
    brand && rules.utmRule
      ? generateTracking(
          rules.utmRule,
          { brand, platform: draft.platform, fields: draft.fields, campaignName: name, campaignCode: draft.code },
          draft.trackingOverrides,
        )
      : { params: { ...draft.trackingOverrides }, overridden: [], dynamic: [] };

  const parsedUrl = parseLandingUrl(draft.landingUrl);
  const built = buildCampaignUrl(parsedUrl, tracking.params, draft.existingParamPolicy);

  const partial = { draft, brand, template, resolved, naming, name, nameIsGenerated, tracking, parsedUrl, built, rules };
  const validation = validateComputed(partial);

  return { ...partial, generatedUrl: built.url, validation };
}

/* ------------------------------------------------------------------ */
/* Package (copy / export)                                             */
/* ------------------------------------------------------------------ */

export interface PackageRow {
  label: string;
  value: string;
  mono?: boolean;
}

export function campaignPackageRows(c: ComputedCampaign): PackageRow[] {
  const f = c.draft.fields;
  const p = c.draft.platform;
  const s = STRUCTURE_LABELS[p];
  const typeValue = p === "google" ? f.campaignType ?? "" : c.template?.name ?? "Custom";
  return [
    { label: "Brand", value: c.brand?.name ?? "" },
    { label: "Platform", value: PLATFORM_LABELS[p] },
    { label: "Objective", value: f.objective ?? "" },
    { label: "Campaign type", value: typeValue },
    { label: "Campaign name", value: c.name, mono: true },
    { label: "Campaign ID", value: c.draft.code, mono: true },
    { label: s.group, value: (p === "meta" ? f.adSetName : f.adGroupName) ?? "" },
    { label: s.ad, value: (p === "meta" ? f.creativeName : f.adName) ?? "" },
    { label: "Landing URL", value: c.parsedUrl.valid ? c.parsedUrl.base : c.draft.landingUrl, mono: true },
    { label: "UTM parameters", value: trackingToString(c.tracking.params), mono: true },
    { label: "Generated URL", value: c.generatedUrl, mono: true },
  ];
}

export function trackingToString(t: TrackingParams): string {
  return Object.entries(t)
    .filter(([, v]) => v)
    .map(([k, v]) => `utm_${k}=${v}`)
    .join("\n");
}

/** Plain-text block for pasting into Slack / Ads Manager notes. */
export function campaignPackageText(c: ComputedCampaign): string {
  const extra = c.resolved.fields
    .filter((k) => !["objective"].includes(k) && c.draft.fields[k])
    .map((k) => `${FIELD_DEFS[k].label}: ${c.draft.fields[k]}`);
  return [
    ...campaignPackageRows(c)
      .filter((r) => r.label !== "UTM parameters")
      .map((r) => `${r.label}: ${r.value}`),
    "",
    "UTM parameters:",
    trackingToString(c.tracking.params),
    "",
    ...extra,
  ].join("\n");
}
