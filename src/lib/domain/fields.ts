import type { CampaignFieldKey, Platform } from "./types";

export interface FieldOption {
  value: string;
  label: string;
  /** Token used by the naming engine. Defaults to a sanitised value. */
  code?: string;
}

export interface FieldDef {
  key: CampaignFieldKey;
  label: string;
  scope: "common" | Platform;
  group: "basics" | "delivery" | "structure" | "tracking";
  input: "select" | "text" | "number";
  options?: FieldOption[] | Partial<Record<Platform, FieldOption[]>>;
  placeholder?: string;
  help?: string;
}

export const MARKETS: FieldOption[] = [
  { value: "IN", label: "India", code: "IN" },
  { value: "AE", label: "UAE", code: "AE" },
  { value: "SA", label: "Saudi Arabia", code: "SA" },
  { value: "GCC", label: "GCC", code: "GCC" },
  { value: "UK", label: "United Kingdom", code: "UK" },
  { value: "US", label: "United States", code: "US" },
  { value: "GLOBAL", label: "Global", code: "GLOBAL" },
];

export const COUNTRIES: FieldOption[] = [
  { value: "India", label: "India", code: "IN" },
  { value: "United Arab Emirates", label: "United Arab Emirates", code: "AE" },
  { value: "Saudi Arabia", label: "Saudi Arabia", code: "SA" },
  { value: "Qatar", label: "Qatar", code: "QA" },
  { value: "Kuwait", label: "Kuwait", code: "KW" },
  { value: "United Kingdom", label: "United Kingdom", code: "UK" },
  { value: "United States", label: "United States", code: "US" },
];

export const CURRENCIES = ["INR", "AED", "SAR", "QAR", "KWD", "GBP", "USD"];

export const FIELD_DEFS: Record<CampaignFieldKey, FieldDef> = {
  objective: {
    key: "objective",
    label: "Objective",
    scope: "common",
    group: "basics",
    input: "select",
    options: {
      meta: [
        { value: "Sales", label: "Sales", code: "SALES" },
        { value: "Traffic", label: "Traffic", code: "TRAFFIC" },
        { value: "Awareness", label: "Awareness", code: "AWARENESS" },
        { value: "Engagement", label: "Engagement", code: "ENGAGEMENT" },
        { value: "Leads", label: "Leads", code: "LEADS" },
        { value: "App promotion", label: "App promotion", code: "APP" },
      ],
      google: [
        { value: "Sales", label: "Sales", code: "SALES" },
        { value: "Leads", label: "Leads", code: "LEADS" },
        { value: "Website traffic", label: "Website traffic", code: "TRAFFIC" },
        { value: "Awareness and consideration", label: "Awareness and consideration", code: "AWARENESS" },
        { value: "Product and brand consideration", label: "Product and brand consideration", code: "CONSIDERATION" },
      ],
    },
  },
  market: { key: "market", label: "Market", scope: "common", group: "basics", input: "select", options: MARKETS },
  country: { key: "country", label: "Country", scope: "common", group: "basics", input: "select", options: COUNTRIES },
  product: {
    key: "product",
    label: "Product / Collection",
    scope: "common",
    group: "basics",
    input: "text",
    placeholder: "e.g. Kuro Eau de Perfume 90ml",
    help: "Auto-detected from the landing URL slug when possible.",
  },

  // ---------------- Meta ----------------
  buyingType: {
    key: "buyingType",
    label: "Buying type",
    scope: "meta",
    group: "delivery",
    input: "select",
    options: [
      { value: "Auction", label: "Auction", code: "AUCTION" },
      { value: "Reservation", label: "Reservation", code: "RESERVATION" },
    ],
  },
  audience: {
    key: "audience",
    label: "Audience",
    scope: "meta",
    group: "delivery",
    input: "select",
    options: [
      { value: "Prospecting - Broad", label: "Prospecting · Broad", code: "PROSPECTING" },
      { value: "Prospecting - Interest", label: "Prospecting · Interest", code: "PROSPECTING-INT" },
      { value: "Prospecting - Lookalike", label: "Prospecting · Lookalike", code: "PROSPECTING-LAL" },
      { value: "Retargeting - Website visitors", label: "Retargeting · Website visitors", code: "RETARGETING" },
      { value: "Retargeting - Add to cart", label: "Retargeting · Add to cart", code: "RETARGETING-ATC" },
      { value: "Customer list", label: "Customer list", code: "CRM" },
      { value: "Advantage+ audience", label: "Advantage+ audience", code: "ADVPLUS" },
    ],
  },
  placement: {
    key: "placement",
    label: "Placement",
    scope: "meta",
    group: "delivery",
    input: "select",
    options: [
      { value: "Advantage+ placements", label: "Advantage+ placements", code: "AUTO" },
      { value: "Feeds", label: "Manual · Feeds", code: "FEEDS" },
      { value: "Stories and Reels", label: "Manual · Stories & Reels", code: "REELS" },
      { value: "Feeds, Stories and Reels", label: "Manual · Feeds, Stories & Reels", code: "FSR" },
    ],
  },
  optimization: {
    key: "optimization",
    label: "Optimization",
    scope: "meta",
    group: "delivery",
    input: "select",
    options: [
      { value: "Purchase", label: "Purchase", code: "PURCHASE" },
      { value: "Add to cart", label: "Add to cart", code: "ATC" },
      { value: "Landing page views", label: "Landing page views", code: "LPV" },
      { value: "Link clicks", label: "Link clicks", code: "CLICKS" },
      { value: "Reach", label: "Reach", code: "REACH" },
    ],
  },
  budgetType: {
    key: "budgetType",
    label: "Budget type",
    scope: "meta",
    group: "delivery",
    input: "select",
    options: [
      { value: "Daily", label: "Daily", code: "DAILY" },
      { value: "Lifetime", label: "Lifetime", code: "LIFETIME" },
    ],
  },
  budget: { key: "budget", label: "Budget", scope: "meta", group: "delivery", input: "number", placeholder: "0" },
  adSetName: {
    key: "adSetName",
    label: "Ad set",
    scope: "meta",
    group: "structure",
    input: "text",
    placeholder: "e.g. IN_BROAD_25-45_F",
  },
  creativeName: {
    key: "creativeName",
    label: "Ad / Creative name",
    scope: "meta",
    group: "structure",
    input: "text",
    placeholder: "e.g. kuro_video_15s_v1",
    help: "Used for utm_content when the brand rule references {creative_name}.",
  },

  // ---------------- Google ----------------
  campaignType: {
    key: "campaignType",
    label: "Campaign type",
    scope: "google",
    group: "delivery",
    input: "select",
    options: [
      { value: "Search", label: "Search", code: "SEARCH" },
      { value: "Performance Max", label: "Performance Max", code: "PMAX" },
      { value: "Shopping", label: "Shopping", code: "SHOPPING" },
      { value: "Display", label: "Display", code: "DISPLAY" },
      { value: "Video", label: "Video (YouTube)", code: "YOUTUBE" },
    ],
  },
  bidding: {
    key: "bidding",
    label: "Bidding",
    scope: "google",
    group: "delivery",
    input: "select",
    options: [
      { value: "Maximize conversions", label: "Maximize conversions", code: "MAXCONV" },
      { value: "Maximize conversion value", label: "Maximize conversion value", code: "MAXVALUE" },
      { value: "Target ROAS", label: "Target ROAS", code: "TROAS" },
      { value: "Target CPA", label: "Target CPA", code: "TCPA" },
      { value: "Maximize clicks", label: "Maximize clicks", code: "MAXCLICKS" },
      { value: "Target impression share", label: "Target impression share", code: "TIS" },
      { value: "Manual CPC", label: "Manual CPC", code: "MCPC" },
      { value: "Target CPM", label: "Target CPM", code: "TCPM" },
    ],
  },
  network: {
    key: "network",
    label: "Network",
    scope: "google",
    group: "delivery",
    input: "select",
    options: [
      { value: "Google Search", label: "Google Search", code: "SEARCH" },
      { value: "Search + Search partners", label: "Search + Search partners", code: "SEARCHPARTNERS" },
      { value: "Display Network", label: "Display Network", code: "GDN" },
      { value: "YouTube", label: "YouTube", code: "YT" },
      { value: "All Google channels", label: "All Google channels", code: "ALL" },
    ],
  },
  location: {
    key: "location",
    label: "Location",
    scope: "google",
    group: "delivery",
    input: "text",
    placeholder: "e.g. India; Mumbai; Delhi NCR",
  },
  language: {
    key: "language",
    label: "Language",
    scope: "google",
    group: "delivery",
    input: "select",
    options: [
      { value: "English", label: "English" },
      { value: "Hindi", label: "Hindi" },
      { value: "Arabic", label: "Arabic" },
      { value: "English, Hindi", label: "English, Hindi" },
      { value: "English, Arabic", label: "English, Arabic" },
      { value: "All languages", label: "All languages" },
    ],
  },
  adGroupName: {
    key: "adGroupName",
    label: "Ad group / Asset group",
    scope: "google",
    group: "structure",
    input: "text",
    placeholder: "e.g. kuro_perfume_exact",
  },
  keyword: {
    key: "keyword",
    label: "Keyword",
    scope: "google",
    group: "structure",
    input: "text",
    placeholder: "Leave empty to use Google's {keyword} ValueTrack",
    help: "Empty = Google inserts the matched keyword at click time.",
  },
  adName: {
    key: "adName",
    label: "Ad / Asset name",
    scope: "google",
    group: "structure",
    input: "text",
    placeholder: "e.g. rsa_kuro_v1",
  },
};

export const META_FIELDS: CampaignFieldKey[] = [
  "objective", "market", "country", "product",
  "buyingType", "audience", "placement", "optimization", "budgetType", "budget",
  "adSetName", "creativeName",
];

export const GOOGLE_FIELDS: CampaignFieldKey[] = [
  "objective", "market", "country", "product",
  "campaignType", "bidding", "network", "location", "language",
  "adGroupName", "keyword", "adName",
];

export const PLATFORM_FIELDS: Record<Platform, CampaignFieldKey[]> = {
  meta: META_FIELDS,
  google: GOOGLE_FIELDS,
};

export function fieldOptions(key: CampaignFieldKey, platform: Platform): FieldOption[] {
  const opts = FIELD_DEFS[key].options;
  if (!opts) return [];
  return Array.isArray(opts) ? opts : opts[platform] ?? [];
}

/** Label for the structural level below a campaign. */
export const STRUCTURE_LABELS: Record<Platform, { group: string; ad: string }> = {
  meta: { group: "Ad set", ad: "Ad / Creative" },
  google: { group: "Ad group / Asset group", ad: "Ad / Asset" },
};

export const PLATFORM_LABELS: Record<Platform, string> = { meta: "Meta", google: "Google" };

export const STATUS_LABELS = {
  draft: "Draft",
  review: "Review",
  ready: "Ready",
  launched: "Launched",
} as const;
