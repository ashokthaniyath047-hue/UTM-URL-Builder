/**
 * Demo data. Generated campaign values are produced by the real engines so seed
 * campaigns look exactly like campaigns created in the app.
 */
import type {
  Brand,
  Campaign,
  CampaignDraft,
  CampaignOSData,
  CampaignStatus,
  CampaignTemplate,
  LandingPage,
  NamingRule,
  NamingToken,
  NamingVariable,
  UTMRule,
  User,
} from "@/lib/domain/types";
import { computeCampaign } from "@/lib/engine/campaign";

export const DATA_VERSION = 1;

export const DEMO_URL =
  "https://www.tirabeauty.com/product/ajmal-kuro-eau-de-perfume-90ml--bfxjntcjip?utm_source=website&utm_medium=email+&utm_campaign=spam&utm_id=3334";

const T0 = "2026-08-01T09:00:00.000Z";

const v = (variable: NamingVariable, i: number): NamingToken => ({ id: `tk_${variable}_${i}`, kind: "variable", variable });
const tokens = (...vars: NamingVariable[]) => vars.map(v);

const users: User[] = [
  { id: "u_priya", name: "Priya Sharma", email: "priya.sharma@company.example", role: "senior_marketing_executive", initials: "PS" },
  { id: "u_rahul", name: "Rahul Mehta", email: "rahul.mehta@company.example", role: "senior_marketing_executive", initials: "RM" },
  { id: "u_aisha", name: "Aisha Khan", email: "aisha.khan@company.example", role: "marketing_manager", initials: "AK" },
];

const namingRules: NamingRule[] = [
  {
    id: "nr_ajmal_meta", brandId: "b_ajmal", platform: "meta", name: "Ajmal · Meta",
    tokens: tokens("BRAND", "PLATFORM", "OBJECTIVE", "AUDIENCE", "MARKET", "MONTH"),
    separator: "_", casing: "upper", maxLength: 150, updatedAt: T0,
  },
  {
    id: "nr_ajmal_google", brandId: "b_ajmal", platform: "google", name: "Ajmal · Google",
    tokens: tokens("BRAND", "PLATFORM", "CAMPAIGN_TYPE", "OBJECTIVE", "MARKET", "MONTH"),
    separator: "_", casing: "upper", maxLength: 150, updatedAt: T0,
  },
  {
    id: "nr_tira_meta", brandId: "b_tira", platform: "meta", name: "Tira · Meta",
    tokens: tokens("BRAND", "PLATFORM", "OBJECTIVE", "AUDIENCE", "PRODUCT", "DATE"),
    separator: "_", casing: "lower", maxLength: 150, updatedAt: T0,
  },
  {
    id: "nr_tira_google", brandId: "b_tira", platform: "google", name: "Tira · Google",
    tokens: tokens("BRAND", "PLATFORM", "CAMPAIGN_TYPE", "PRODUCT", "MARKET", "DATE"),
    separator: "_", casing: "lower", maxLength: 150, updatedAt: T0,
  },
  {
    id: "nr_branda_meta", brandId: "b_branda", platform: "meta", name: "Brand A · Meta",
    tokens: tokens("BRAND", "MARKET", "PLATFORM", "OBJECTIVE", "AUDIENCE", "CAMPAIGN_ID"),
    separator: "_", casing: "upper", maxLength: 120, updatedAt: T0,
  },
  {
    id: "nr_branda_google", brandId: "b_branda", platform: "google", name: "Brand A · Google",
    tokens: tokens("BRAND", "MARKET", "PLATFORM", "CAMPAIGN_TYPE", "CAMPAIGN_ID"),
    separator: "_", casing: "upper", maxLength: 120, updatedAt: T0,
  },
  {
    id: "nr_brandb_google", brandId: "b_brandb", platform: "google", name: "Brand B · Google",
    tokens: tokens("BRAND", "CAMPAIGN_TYPE", "COUNTRY", "YEAR"),
    separator: "-", casing: "upper", maxLength: 100, updatedAt: T0,
  },
];

const utm = (
  id: string, brandId: string, platform: UTMRule["platform"],
  params: UTMRule["params"], extra: Partial<UTMRule> = {},
): UTMRule => ({
  id, brandId, platform, params,
  required: ["source", "medium", "campaign"],
  casing: "lower", spaceReplacement: "_", defaultExistingPolicy: "replace", updatedAt: T0,
  ...extra,
});

const utmRules: UTMRule[] = [
  utm("ur_ajmal_meta", "b_ajmal", "meta", {
    source: "meta", medium: "paid_social", campaign: "{campaign_name}", term: "", content: "{creative_name}", id: "{campaign_id}",
  }),
  utm("ur_ajmal_google", "b_ajmal", "google", {
    source: "google", medium: "paid_search", campaign: "{campaign_name}", term: "{keyword}", content: "{ad_name}", id: "{campaign_id}",
  }),
  utm("ur_tira_meta", "b_tira", "meta", {
    source: "facebook", medium: "cpc", campaign: "{campaign_name}", term: "", content: "{creative_name}", id: "{campaign_id}",
  }),
  utm("ur_tira_google", "b_tira", "google", {
    source: "google", medium: "cpc", campaign: "{campaign_name}", term: "{keyword}", content: "{ad_name}", id: "{campaign_id}",
  }),
  utm("ur_branda_meta", "b_branda", "meta", {
    source: "fb", medium: "paid", campaign: "{campaign_name}", term: "{audience}", content: "{ad_set}", id: "",
  }, { casing: "preserve" }),
  utm("ur_branda_google", "b_branda", "google", {
    source: "google", medium: "paid_search", campaign: "{campaign_name}", term: "{keyword}", content: "", id: "{campaign_id}",
  }),
  utm("ur_brandb_google", "b_brandb", "google", {
    source: "google", medium: "cpc", campaign: "{campaign_name}", term: "", content: "{ad_name}", id: "{campaign_id}",
  }, { defaultExistingPolicy: "keep", required: ["source", "medium", "campaign", "id"] }),
];

const brands: Brand[] = [
  {
    id: "b_ajmal", name: "Ajmal", code: "AJMAL", website: "https://www.tirabeauty.com",
    domains: ["tirabeauty.com", "ajmalperfume.com"], country: "India", currency: "INR", defaultMarket: "IN",
    platforms: ["meta", "google"],
    namingRuleIds: { meta: "nr_ajmal_meta", google: "nr_ajmal_google" },
    utmRuleIds: { meta: "ur_ajmal_meta", google: "ur_ajmal_google" },
    disabledTemplateIds: [], archived: false, createdAt: T0, updatedAt: T0,
  },
  {
    id: "b_tira", name: "Tira Beauty", code: "TIRA", website: "https://www.tirabeauty.com",
    domains: ["tirabeauty.com"], country: "India", currency: "INR", defaultMarket: "IN",
    platforms: ["meta", "google"],
    namingRuleIds: { meta: "nr_tira_meta", google: "nr_tira_google" },
    utmRuleIds: { meta: "ur_tira_meta", google: "ur_tira_google" },
    disabledTemplateIds: [], archived: false, createdAt: T0, updatedAt: T0,
  },
  {
    id: "b_branda", name: "Brand A", code: "BRANDA", website: "https://www.brand-a.example",
    domains: [], country: "United Arab Emirates", currency: "AED", defaultMarket: "AE",
    platforms: ["meta", "google"],
    namingRuleIds: { meta: "nr_branda_meta", google: "nr_branda_google" },
    utmRuleIds: { meta: "ur_branda_meta", google: "ur_branda_google" },
    disabledTemplateIds: ["t_meta_catalog"], archived: false, createdAt: T0, updatedAt: T0,
  },
  {
    id: "b_brandb", name: "Brand B", code: "BRANDB", website: "https://www.brand-b.example",
    domains: [], country: "United Kingdom", currency: "GBP", defaultMarket: "UK",
    platforms: ["google"],
    namingRuleIds: { google: "nr_brandb_google" },
    utmRuleIds: { google: "ur_brandb_google" },
    disabledTemplateIds: [], archived: false, createdAt: T0, updatedAt: T0,
  },
];

const ALL_META = [
  "objective", "market", "country", "product", "buyingType", "audience", "placement",
  "optimization", "budgetType", "budget", "adSetName", "creativeName",
] as const;
const GOOGLE_BASE = ["objective", "market", "country", "product", "campaignType", "bidding", "location", "language", "adGroupName", "adName"] as const;

const tpl = (t: Omit<CampaignTemplate, "builtIn" | "updatedAt">): CampaignTemplate => ({ ...t, builtIn: true, updatedAt: T0 });

const templates: CampaignTemplate[] = [
  // ---------------- Meta ----------------
  tpl({
    id: "t_meta_sales_prospecting", platform: "meta", name: "Sales - Prospecting",
    description: "Conversion campaign reaching new customers with broad or interest audiences.",
    fields: [...ALL_META],
    requiredFields: ["objective", "market", "country", "audience", "optimization", "budget"],
    defaults: { objective: "Sales", buyingType: "Auction", audience: "Prospecting - Broad", placement: "Advantage+ placements", optimization: "Purchase", budgetType: "Daily" },
  }),
  tpl({
    id: "t_meta_sales_retargeting", platform: "meta", name: "Sales - Retargeting",
    description: "Re-engage site visitors and cart abandoners with conversion-optimised delivery.",
    fields: [...ALL_META],
    requiredFields: ["objective", "market", "country", "audience", "optimization", "budget"],
    defaults: { objective: "Sales", buyingType: "Auction", audience: "Retargeting - Website visitors", placement: "Advantage+ placements", optimization: "Purchase", budgetType: "Daily" },
  }),
  tpl({
    id: "t_meta_product_launch", platform: "meta", name: "Product Launch",
    description: "Drive qualified traffic to a newly launched product page.",
    fields: [...ALL_META],
    requiredFields: ["objective", "market", "country", "product", "audience", "budget"],
    defaults: { objective: "Traffic", buyingType: "Auction", audience: "Prospecting - Interest", placement: "Advantage+ placements", optimization: "Landing page views", budgetType: "Lifetime" },
  }),
  tpl({
    id: "t_meta_offer", platform: "meta", name: "Offer / Sale",
    description: "Time-bound promotion or sale event, Advantage+ audience.",
    fields: [...ALL_META],
    requiredFields: ["objective", "market", "country", "product", "budget"],
    defaults: { objective: "Sales", buyingType: "Auction", audience: "Advantage+ audience", placement: "Advantage+ placements", optimization: "Purchase", budgetType: "Lifetime" },
  }),
  tpl({
    id: "t_meta_catalog", platform: "meta", name: "Catalog",
    description: "Dynamic product ads from the product catalog.",
    fields: ["objective", "market", "country", "product", "buyingType", "audience", "optimization", "budgetType", "budget", "adSetName"],
    requiredFields: ["objective", "market", "audience", "budget"],
    defaults: { objective: "Sales", buyingType: "Auction", audience: "Retargeting - Add to cart", optimization: "Purchase", budgetType: "Daily", product: "Full catalog" },
  }),

  // ---------------- Google ----------------
  tpl({
    id: "t_g_brand_search", platform: "google", name: "Brand Search",
    description: "Protect branded queries with exact/phrase brand keywords.",
    fields: [...GOOGLE_BASE.slice(0, 6), "network", ...GOOGLE_BASE.slice(6), "keyword"],
    requiredFields: ["objective", "market", "campaignType", "bidding", "adGroupName"],
    defaults: { objective: "Sales", campaignType: "Search", bidding: "Target impression share", network: "Google Search", language: "English" },
  }),
  tpl({
    id: "t_g_nonbrand_search", platform: "google", name: "Non-Brand Search",
    description: "Generic and category keywords for new-customer acquisition.",
    fields: [...GOOGLE_BASE.slice(0, 6), "network", ...GOOGLE_BASE.slice(6), "keyword"],
    requiredFields: ["objective", "market", "campaignType", "bidding", "adGroupName"],
    defaults: { objective: "Sales", campaignType: "Search", bidding: "Maximize conversions", network: "Google Search", language: "English" },
  }),
  tpl({
    id: "t_g_pmax", platform: "google", name: "Performance Max",
    description: "All Google channels with asset groups and a product feed.",
    fields: [...GOOGLE_BASE],
    requiredFields: ["objective", "market", "campaignType", "bidding", "adGroupName"],
    defaults: { objective: "Sales", campaignType: "Performance Max", bidding: "Maximize conversion value", language: "English" },
  }),
  tpl({
    id: "t_g_shopping", platform: "google", name: "Shopping",
    description: "Standard Shopping on the Merchant Center feed.",
    fields: [...GOOGLE_BASE],
    requiredFields: ["objective", "market", "campaignType", "bidding"],
    defaults: { objective: "Sales", campaignType: "Shopping", bidding: "Target ROAS", language: "English", product: "All products" },
  }),
  tpl({
    id: "t_g_display", platform: "google", name: "Display",
    description: "Responsive display ads on the Google Display Network.",
    fields: [...GOOGLE_BASE.slice(0, 6), "network", ...GOOGLE_BASE.slice(6)],
    requiredFields: ["objective", "market", "campaignType", "bidding", "adGroupName"],
    defaults: { objective: "Awareness and consideration", campaignType: "Display", bidding: "Maximize conversions", network: "Display Network", language: "English" },
  }),
  tpl({
    id: "t_g_youtube", platform: "google", name: "YouTube",
    description: "Video campaigns for reach and consideration on YouTube.",
    fields: [...GOOGLE_BASE.slice(0, 6), "network", ...GOOGLE_BASE.slice(6)],
    requiredFields: ["objective", "market", "campaignType", "bidding", "adGroupName"],
    defaults: { objective: "Product and brand consideration", campaignType: "Video", bidding: "Target CPM", network: "YouTube", language: "English" },
  }),
];

const landingPages: LandingPage[] = [
  { id: "lp_ajmal_kuro", brandId: "b_ajmal", url: DEMO_URL, label: "Kuro Eau de Perfume 90ml (Tira)", productName: "Ajmal Kuro Eau De Perfume 90ml", pageType: "product", createdAt: T0 },
  { id: "lp_ajmal_coll", brandId: "b_ajmal", url: "https://www.tirabeauty.com/collection/ajmal-perfumes", label: "Ajmal perfumes collection", pageType: "collection", createdAt: T0 },
  { id: "lp_tira_sale", brandId: "b_tira", url: "https://www.tirabeauty.com/collection/festive-beauty-sale", label: "Festive Beauty Sale", pageType: "collection", createdAt: T0 },
  { id: "lp_branda_serum", brandId: "b_branda", url: "https://www.brand-a.example/products/hydra-glow-serum-30ml", label: "Hydra Glow Serum 30ml", productName: "Hydra Glow Serum 30ml", pageType: "product", createdAt: T0 },
  { id: "lp_brandb_summer", brandId: "b_brandb", url: "https://www.brand-b.example/collections/summer-edit?ref=nav", label: "Summer Edit", pageType: "collection", createdAt: T0 },
];

interface SeedCampaign {
  code: string;
  brandId: string;
  platform: CampaignDraft["platform"];
  templateId: string;
  status: CampaignStatus;
  ownerId: string;
  fields: CampaignDraft["fields"];
  landingUrl: string;
  createdAt: string;
  updatedAt: string;
}

const seedCampaigns: SeedCampaign[] = [
  {
    code: "C1001", brandId: "b_ajmal", platform: "meta", templateId: "t_meta_sales_retargeting", status: "launched", ownerId: "u_priya",
    fields: { objective: "Sales", market: "IN", country: "India", product: "Kuro Eau de Perfume 90ml", buyingType: "Auction", audience: "Retargeting - Website visitors", placement: "Advantage+ placements", optimization: "Purchase", budgetType: "Daily", budget: "15000", adSetName: "IN_WV_30D", creativeName: "kuro_carousel_v2" },
    landingUrl: "https://www.tirabeauty.com/product/ajmal-kuro-eau-de-perfume-90ml--bfxjntcjip",
    createdAt: "2026-09-04T06:30:00.000Z", updatedAt: "2026-09-06T11:12:00.000Z",
  },
  {
    code: "C1002", brandId: "b_ajmal", platform: "google", templateId: "t_g_brand_search", status: "ready", ownerId: "u_priya",
    fields: { objective: "Sales", market: "IN", country: "India", campaignType: "Search", bidding: "Target impression share", network: "Google Search", location: "India", language: "English", adGroupName: "ajmal_brand_exact", adName: "rsa_brand_v1" },
    landingUrl: "https://www.tirabeauty.com/collection/ajmal-perfumes",
    createdAt: "2026-09-18T08:00:00.000Z", updatedAt: "2026-09-29T10:20:00.000Z",
  },
  {
    code: "C1003", brandId: "b_tira", platform: "meta", templateId: "t_meta_offer", status: "review", ownerId: "u_rahul",
    fields: { objective: "Sales", market: "IN", country: "India", product: "Festive Beauty Sale", buyingType: "Auction", audience: "Advantage+ audience", placement: "Advantage+ placements", optimization: "Purchase", budgetType: "Lifetime", budget: "250000", adSetName: "IN_ADVPLUS", creativeName: "festive_sale_reel_15s" },
    landingUrl: "https://www.tirabeauty.com/collection/festive-beauty-sale?sort=popular",
    createdAt: "2026-09-25T07:45:00.000Z", updatedAt: "2026-09-30T13:05:00.000Z",
  },
  {
    code: "C1004", brandId: "b_tira", platform: "google", templateId: "t_g_pmax", status: "draft", ownerId: "u_rahul",
    fields: { objective: "Sales", market: "IN", country: "India", product: "Skincare", campaignType: "Performance Max", bidding: "Maximize conversion value", language: "English" },
    landingUrl: "https://www.tirabeauty.com/collection/skincare",
    createdAt: "2026-09-30T05:10:00.000Z", updatedAt: "2026-09-30T05:40:00.000Z",
  },
  {
    code: "C1005", brandId: "b_branda", platform: "meta", templateId: "t_meta_product_launch", status: "draft", ownerId: "u_priya",
    fields: { objective: "Traffic", market: "AE", country: "United Arab Emirates", product: "Hydra Glow Serum 30ml", buyingType: "Auction", audience: "Prospecting - Interest", placement: "Advantage+ placements", optimization: "Landing page views", budgetType: "Lifetime", budget: "20000", adSetName: "AE_SKINCARE_INT" },
    landingUrl: "https://www.brand-a.example/products/hydra-glow-serum-30ml",
    createdAt: "2026-09-28T10:00:00.000Z", updatedAt: "2026-09-29T16:30:00.000Z",
  },
  {
    code: "C1006", brandId: "b_brandb", platform: "google", templateId: "t_g_shopping", status: "launched", ownerId: "u_aisha",
    fields: { objective: "Sales", market: "UK", country: "United Kingdom", product: "Summer Edit", campaignType: "Shopping", bidding: "Target ROAS", location: "United Kingdom", language: "English", adName: "shopping_feed" },
    landingUrl: "https://www.brand-b.example/collections/summer-edit?ref=nav",
    createdAt: "2026-08-12T09:00:00.000Z", updatedAt: "2026-08-14T09:30:00.000Z",
  },
  {
    code: "C1007", brandId: "b_ajmal", platform: "google", templateId: "t_g_pmax", status: "review", ownerId: "u_aisha",
    fields: { objective: "Sales", market: "AE", country: "United Arab Emirates", product: "Oud Collection", campaignType: "Performance Max", bidding: "Maximize conversion value", location: "United Arab Emirates", language: "English, Arabic", adGroupName: "oud_collection_ag" },
    landingUrl: "https://www.ajmalperfume.com/collections/oud?currency=AED",
    createdAt: "2026-09-22T12:00:00.000Z", updatedAt: "2026-09-27T09:15:00.000Z",
  },
];

export function createSeedData(): CampaignOSData {
  const base = { brands, templates, namingRules, utmRules };
  const campaigns: Campaign[] = seedCampaigns.map((s, i) => {
    const draft: CampaignDraft = {
      code: s.code,
      brandId: s.brandId,
      platform: s.platform,
      templateId: s.templateId,
      ownerId: s.ownerId,
      fields: s.fields,
      landingUrl: s.landingUrl,
      existingParamPolicy: "replace",
      nameOverride: null,
      trackingOverrides: {},
      createdAt: s.createdAt,
    };
    const c = computeCampaign(draft, base);
    return {
      ...draft,
      id: `cmp_seed_${i + 1}`,
      status: s.status,
      name: c.name,
      generatedUrl: c.generatedUrl,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
      history: [
        { id: `h_${i}_1`, at: s.createdAt, userId: s.ownerId, action: "created" },
        ...(s.status !== "draft"
          ? [{ id: `h_${i}_2`, at: s.updatedAt, userId: s.ownerId, action: "status_changed" as const, detail: `Draft → ${s.status[0].toUpperCase()}${s.status.slice(1)}` }]
          : []),
      ],
    };
  });

  return {
    version: DATA_VERSION,
    users,
    brands,
    namingRules,
    utmRules,
    templates,
    landingPages,
    campaigns,
    brandActivity: [
      { id: "ba_1", brandId: "b_ajmal", at: "2026-08-01T09:00:00.000Z", userId: "u_aisha", detail: "Brand created with Meta + Google" },
      { id: "ba_2", brandId: "b_ajmal", at: "2026-08-02T10:00:00.000Z", userId: "u_aisha", detail: "Meta naming rule set to {BRAND}_{PLATFORM}_{OBJECTIVE}_{AUDIENCE}_{MARKET}_{MONTH}" },
      { id: "ba_3", brandId: "b_tira", at: "2026-08-01T09:05:00.000Z", userId: "u_aisha", detail: "Brand created with Meta + Google" },
      { id: "ba_4", brandId: "b_branda", at: "2026-08-01T09:10:00.000Z", userId: "u_aisha", detail: "Brand created; Catalog template disabled" },
      { id: "ba_5", brandId: "b_brandb", at: "2026-08-01T09:15:00.000Z", userId: "u_aisha", detail: "Brand created with Google only" },
    ],
    settings: {
      currentUserId: "u_priya",
      nextCampaignSeq: 1008,
      defaultExistingPolicy: "replace",
      copyUrlOnSave: false,
    },
  };
}
