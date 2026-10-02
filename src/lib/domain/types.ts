/**
 * Campaign OS domain model.
 *
 * Entities reference each other by ID (brand → naming/UTM rules, campaign → brand/template/owner)
 * so configuration lives in exactly one place and is resolved at generation time.
 */

export type ID = string;
export type ISODate = string;

export type Platform = "meta" | "google";
export const PLATFORMS: Platform[] = ["meta", "google"];

export type CampaignStatus = "draft" | "review" | "ready" | "launched";
export const CAMPAIGN_STATUSES: CampaignStatus[] = ["draft", "review", "ready", "launched"];

export interface User {
  id: ID;
  name: string;
  email: string;
  role: "senior_marketing_executive" | "marketing_manager" | "admin";
  initials: string;
}

/* ------------------------------------------------------------------ */
/* Naming                                                              */
/* ------------------------------------------------------------------ */

export type NamingVariable =
  | "BRAND"
  | "PLATFORM"
  | "OBJECTIVE"
  | "CAMPAIGN_TYPE"
  | "AUDIENCE"
  | "MARKET"
  | "COUNTRY"
  | "PRODUCT"
  | "MONTH"
  | "YEAR"
  | "DATE"
  | "CAMPAIGN_ID";

export type NamingToken =
  | { id: ID; kind: "variable"; variable: NamingVariable }
  | { id: ID; kind: "literal"; value: string };

export type NamingSeparator = "_" | "-" | "|" | "." | " ";
export type NamingCase = "upper" | "lower" | "preserve";

export interface NamingRule {
  id: ID;
  brandId: ID;
  platform: Platform;
  name: string;
  tokens: NamingToken[];
  separator: NamingSeparator;
  casing: NamingCase;
  /** Hard platform/organisational limit; validation fails above it. */
  maxLength: number;
  updatedAt: ISODate;
}

/* ------------------------------------------------------------------ */
/* UTM                                                                 */
/* ------------------------------------------------------------------ */

export type UtmKey = "source" | "medium" | "campaign" | "term" | "content" | "id";
export const UTM_KEYS: UtmKey[] = ["source", "medium", "campaign", "term", "content", "id"];

/** Final tracking values for a campaign (undefined/empty = parameter omitted). */
export type TrackingParams = Partial<Record<UtmKey, string>>;

export type ExistingParamPolicy = "replace" | "keep";

export interface UTMRule {
  id: ID;
  brandId: ID;
  platform: Platform;
  /** Template strings per parameter, e.g. `{campaign_name}`. Empty string = not used. */
  params: Record<UtmKey, string>;
  /** Parameters that must resolve to a non-empty value. */
  required: UtmKey[];
  casing: "lower" | "preserve";
  /** How to treat spaces inside resolved values. */
  spaceReplacement: "_" | "-" | "keep";
  defaultExistingPolicy: ExistingParamPolicy;
  updatedAt: ISODate;
}

/* ------------------------------------------------------------------ */
/* Brand                                                               */
/* ------------------------------------------------------------------ */

export interface Brand {
  id: ID;
  name: string;
  /** Short code used by the naming engine, e.g. AJMAL. */
  code: string;
  website: string;
  /** Additional hostnames the brand sells on (used for URL → brand detection). */
  domains: string[];
  country: string;
  currency: string;
  defaultMarket: string;
  platforms: Platform[];
  namingRuleIds: Partial<Record<Platform, ID>>;
  utmRuleIds: Partial<Record<Platform, ID>>;
  /** Templates disabled for this brand (all enabled by default). */
  disabledTemplateIds: ID[];
  archived: boolean;
  createdAt: ISODate;
  updatedAt: ISODate;
}

export interface LandingPage {
  id: ID;
  brandId: ID;
  url: string;
  label: string;
  productName?: string;
  pageType: "product" | "collection" | "home" | "other";
  createdAt: ISODate;
}

/* ------------------------------------------------------------------ */
/* Templates & fields                                                  */
/* ------------------------------------------------------------------ */

export type CampaignFieldKey =
  | "objective"
  | "market"
  | "country"
  | "product"
  // meta
  | "buyingType"
  | "audience"
  | "placement"
  | "optimization"
  | "budgetType"
  | "budget"
  | "adSetName"
  | "creativeName"
  // google
  | "campaignType"
  | "bidding"
  | "network"
  | "location"
  | "language"
  | "adGroupName"
  | "keyword"
  | "adName";

export type CampaignFields = Partial<Record<CampaignFieldKey, string>>;

export interface CampaignTemplate {
  id: ID;
  platform: Platform;
  name: string;
  description: string;
  /** Fields shown in the Campaign step (subset of the platform's fields). */
  fields: CampaignFieldKey[];
  /** Fields that must be filled before the campaign can be Ready. */
  requiredFields: CampaignFieldKey[];
  defaults: CampaignFields;
  /** Optional per-template rule overrides; fall back to the brand's platform rule. */
  namingRuleId?: ID;
  utmRuleId?: ID;
  builtIn: boolean;
  isScratch?: boolean;
  updatedAt: ISODate;
}

/* ------------------------------------------------------------------ */
/* Campaign                                                            */
/* ------------------------------------------------------------------ */

export interface CampaignHistoryEntry {
  id: ID;
  at: ISODate;
  userId: ID;
  action: "created" | "updated" | "status_changed" | "duplicated" | "imported";
  detail?: string;
}

export interface Campaign {
  id: ID;
  /** Human campaign ID used in naming + utm_id, e.g. C1042. */
  code: string;
  brandId: ID;
  platform: Platform;
  templateId: ID | null;
  status: CampaignStatus;
  ownerId: ID;
  fields: CampaignFields;
  landingUrl: string;
  existingParamPolicy: ExistingParamPolicy;
  /** Manual name; when null the name is generated from the brand naming rule. */
  nameOverride: string | null;
  /** Manual per-parameter overrides on top of the brand UTM rule. */
  trackingOverrides: TrackingParams;
  /** Snapshot of generated values at last save (for export/search without recompute). */
  name: string;
  generatedUrl: string;
  createdAt: ISODate;
  updatedAt: ISODate;
  history: CampaignHistoryEntry[];
}

/** Editable subset used by the wizard before a campaign is persisted. */
export type CampaignDraft = Omit<
  Campaign,
  "id" | "name" | "generatedUrl" | "createdAt" | "updatedAt" | "history" | "status"
> & {
  id?: ID;
  status?: CampaignStatus;
  /** Creation date drives {MONTH}/{DATE}/{YEAR} so saved names stay stable. */
  createdAt?: ISODate;
};

export interface Settings {
  currentUserId: ID;
  nextCampaignSeq: number;
  defaultExistingPolicy: ExistingParamPolicy;
  /** Copy the generated URL automatically after save. */
  copyUrlOnSave: boolean;
}

export interface BrandActivity {
  id: ID;
  brandId: ID;
  at: ISODate;
  userId: ID;
  detail: string;
}

export interface CampaignOSData {
  version: number;
  users: User[];
  brands: Brand[];
  namingRules: NamingRule[];
  utmRules: UTMRule[];
  templates: CampaignTemplate[];
  landingPages: LandingPage[];
  campaigns: Campaign[];
  brandActivity: BrandActivity[];
  settings: Settings;
}
