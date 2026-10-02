/**
 * Building wizard drafts from URL params, existing campaigns or scratch.
 */
import type { Campaign, CampaignDraft, CampaignOSData, Platform } from "@/lib/domain/types";
import { getTemplate, initialFieldsFor, resolveRules } from "./templates";
import type { WizardStep } from "./validation";

export interface DraftParams {
  brand?: string | null;
  platform?: string | null;
  template?: string | null;
  url?: string | null;
  duplicate?: string | null;
}

export function draftFromParams(data: CampaignOSData, params: DraftParams, code: string): { draft: CampaignDraft; step: WizardStep } {
  const src = params.duplicate ? data.campaigns.find((c) => c.id === params.duplicate) : undefined;
  if (src) {
    return {
      draft: { ...draftFromCampaign(src), id: undefined, status: undefined, createdAt: undefined, code, ownerId: data.settings.currentUserId },
      step: 4,
    };
  }

  const brand = data.brands.find((b) => b.id === params.brand && !b.archived);
  const templateById = params.template ? data.templates.find((t) => t.id === params.template) : undefined;
  let platform: Platform =
    templateById?.platform ?? (params.platform === "google" || params.platform === "meta" ? params.platform : brand?.platforms[0] ?? "meta");
  if (brand && !brand.platforms.includes(platform)) platform = brand.platforms[0];
  const template = templateById?.platform === platform ? templateById : getTemplate(data, params.template, platform);
  const templateId = template ? template.id : null;

  const policy = resolveRules(data, brand, platform, template).utmRule?.defaultExistingPolicy ?? data.settings.defaultExistingPolicy;

  const draft: CampaignDraft = {
    code,
    brandId: brand?.id ?? "",
    platform,
    templateId,
    ownerId: data.settings.currentUserId,
    fields: initialFieldsFor(brand, template),
    landingUrl: params.url ?? "",
    existingParamPolicy: policy,
    nameOverride: null,
    trackingOverrides: {},
  };

  const step: WizardStep = !brand ? 1 : templateId ? 4 : params.platform || brand.platforms.length === 1 ? 3 : 2;
  return { draft, step };
}

export function draftFromCampaign(c: Campaign): CampaignDraft {
  return {
    id: c.id,
    code: c.code,
    brandId: c.brandId,
    platform: c.platform,
    templateId: c.templateId,
    status: c.status,
    ownerId: c.ownerId,
    fields: { ...c.fields },
    landingUrl: c.landingUrl,
    existingParamPolicy: c.existingParamPolicy,
    nameOverride: c.nameOverride,
    trackingOverrides: { ...c.trackingOverrides },
    createdAt: c.createdAt,
  };
}
