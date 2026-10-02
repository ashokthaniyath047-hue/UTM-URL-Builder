/**
 * Template + rule resolution: which fields a campaign shows/requires and which
 * naming/UTM rules apply, given brand → platform → template.
 */
import { PLATFORM_FIELDS } from "@/lib/domain/fields";
import type {
  Brand,
  CampaignFieldKey,
  CampaignFields,
  CampaignOSData,
  CampaignTemplate,
  NamingRule,
  Platform,
  UTMRule,
} from "@/lib/domain/types";

export const SCRATCH_TEMPLATE_ID = "scratch";

export function scratchTemplate(platform: Platform): CampaignTemplate {
  return {
    id: SCRATCH_TEMPLATE_ID,
    platform,
    name: "Start from scratch",
    description: "All platform fields, no defaults.",
    fields: PLATFORM_FIELDS[platform],
    requiredFields: platform === "meta" ? ["objective", "market", "audience"] : ["objective", "market", "campaignType"],
    defaults: {},
    builtIn: true,
    isScratch: true,
    updatedAt: new Date(0).toISOString(),
  };
}

export function getTemplate(data: Pick<CampaignOSData, "templates">, id: string | null | undefined, platform: Platform) {
  if (!id || id === SCRATCH_TEMPLATE_ID) return id === SCRATCH_TEMPLATE_ID ? scratchTemplate(platform) : undefined;
  return data.templates.find((t) => t.id === id);
}

export function templatesForBrand(data: Pick<CampaignOSData, "templates">, brand: Brand | undefined, platform: Platform) {
  return data.templates.filter(
    (t) => t.platform === platform && (!brand || !brand.disabledTemplateIds.includes(t.id)),
  );
}

export interface ResolvedTemplate {
  template?: CampaignTemplate;
  fields: CampaignFieldKey[];
  required: CampaignFieldKey[];
  defaults: CampaignFields;
}

export function resolveTemplate(template: CampaignTemplate | undefined, platform: Platform): ResolvedTemplate {
  const platformFields = PLATFORM_FIELDS[platform];
  if (!template) return { fields: platformFields, required: ["objective"], defaults: {} };
  // Always keep platform field order; ignore fields from the other platform.
  const fields = platformFields.filter((f) => template.fields.includes(f));
  const required = template.requiredFields.filter((f) => fields.includes(f));
  return { template, fields, required, defaults: template.defaults };
}

export interface ResolvedRules {
  namingRule?: NamingRule;
  utmRule?: UTMRule;
}

/** Template override → brand platform rule. */
export function resolveRules(
  data: Pick<CampaignOSData, "namingRules" | "utmRules">,
  brand: Brand | undefined,
  platform: Platform,
  template?: CampaignTemplate,
): ResolvedRules {
  if (!brand) return {};
  const namingId = template?.namingRuleId ?? brand.namingRuleIds[platform];
  const utmId = template?.utmRuleId ?? brand.utmRuleIds[platform];
  return {
    namingRule: data.namingRules.find((r) => r.id === namingId),
    utmRule: data.utmRules.find((r) => r.id === utmId),
  };
}

/** Defaults applied when a template is chosen: template defaults + brand market/country. */
export function initialFieldsFor(brand: Brand | undefined, template: CampaignTemplate | undefined): CampaignFields {
  return {
    market: brand?.defaultMarket,
    country: brand?.country,
    ...(template?.defaults ?? {}),
  };
}
