/**
 * Naming engine: turns a brand's NamingRule + campaign context into a campaign name.
 */
import { COUNTRIES, FIELD_DEFS, fieldOptions } from "@/lib/domain/fields";
import type {
  Brand,
  CampaignFieldKey,
  CampaignFields,
  NamingCase,
  NamingRule,
  NamingSeparator,
  NamingToken,
  NamingVariable,
  Platform,
} from "@/lib/domain/types";

export interface NamingVariableDef {
  variable: NamingVariable;
  label: string;
  description: string;
  /** Campaign field the value comes from (used to link validation errors). */
  field?: CampaignFieldKey;
  example: string;
}

export const NAMING_VARIABLES: NamingVariableDef[] = [
  { variable: "BRAND", label: "Brand", description: "Brand code", example: "AJMAL" },
  { variable: "PLATFORM", label: "Platform", description: "META or GOOGLE", example: "META" },
  { variable: "OBJECTIVE", label: "Objective", description: "Campaign objective", field: "objective", example: "SALES" },
  { variable: "CAMPAIGN_TYPE", label: "Campaign type", description: "Google campaign type", field: "campaignType", example: "PMAX" },
  { variable: "AUDIENCE", label: "Audience", description: "Meta audience", field: "audience", example: "PROSPECTING" },
  { variable: "MARKET", label: "Market", description: "Market code", field: "market", example: "IN" },
  { variable: "COUNTRY", label: "Country", description: "Country ISO code", field: "country", example: "IN" },
  { variable: "PRODUCT", label: "Product", description: "Product / collection", field: "product", example: "KURO-EDP-90ML" },
  { variable: "MONTH", label: "Month", description: "Launch month, e.g. OCT26", example: "OCT26" },
  { variable: "YEAR", label: "Year", description: "Four-digit year", example: "2026" },
  { variable: "DATE", label: "Date", description: "YYYYMMDD", example: "20261001" },
  { variable: "CAMPAIGN_ID", label: "Campaign ID", description: "Internal campaign ID", example: "C1042" },
];

export const NAMING_VARIABLE_MAP = Object.fromEntries(
  NAMING_VARIABLES.map((v) => [v.variable, v]),
) as Record<NamingVariable, NamingVariableDef>;

export interface NamingContext {
  brand: Pick<Brand, "code" | "name">;
  platform: Platform;
  fields: CampaignFields;
  campaignCode: string;
  date: Date;
}

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

function optionCode(key: CampaignFieldKey, platform: Platform, value: string | undefined): string {
  if (!value) return "";
  const opt = fieldOptions(key, platform).find((o) => o.value === value);
  return opt?.code ?? value;
}

/** Raw (unsanitised) value of a variable for a given context. */
export function resolveVariable(variable: NamingVariable, ctx: NamingContext): string {
  const { fields, platform, date } = ctx;
  switch (variable) {
    case "BRAND":
      return ctx.brand.code || ctx.brand.name;
    case "PLATFORM":
      return platform.toUpperCase();
    case "OBJECTIVE":
      return optionCode("objective", platform, fields.objective);
    case "CAMPAIGN_TYPE":
      return optionCode("campaignType", platform, fields.campaignType);
    case "AUDIENCE":
      return optionCode("audience", platform, fields.audience);
    case "MARKET":
      return optionCode("market", platform, fields.market);
    case "COUNTRY":
      return COUNTRIES.find((c) => c.value === fields.country)?.code ?? fields.country ?? "";
    case "PRODUCT":
      return fields.product ?? "";
    case "MONTH":
      return `${MONTHS[date.getMonth()]}${String(date.getFullYear()).slice(2)}`;
    case "YEAR":
      return String(date.getFullYear());
    case "DATE":
      return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
    case "CAMPAIGN_ID":
      return ctx.campaignCode;
  }
}

/** Replace characters that would clash with the separator or break platform naming. */
export function sanitizeSegment(value: string, separator: NamingSeparator, casing: NamingCase): string {
  const joiner = separator === "-" ? "" : "-";
  let v = value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^A-Za-z0-9]+/g, joiner || " ")
    .trim();
  if (!joiner) v = v.replace(/\s+/g, "");
  v = v.replace(/^-+|-+$/g, "");
  if (casing === "upper") v = v.toUpperCase();
  if (casing === "lower") v = v.toLowerCase();
  return v;
}

export interface NamingSegment {
  token: NamingToken;
  value: string;
  missing: boolean;
}

export interface NamingResult {
  name: string;
  segments: NamingSegment[];
  missing: NamingVariable[];
  tooLong: boolean;
}

export function generateName(rule: Pick<NamingRule, "tokens" | "separator" | "casing" | "maxLength">, ctx: NamingContext): NamingResult {
  const segments: NamingSegment[] = rule.tokens.map((token) => {
    const raw = token.kind === "literal" ? token.value : resolveVariable(token.variable, ctx);
    const value = sanitizeSegment(raw, rule.separator, rule.casing);
    return { token, value, missing: token.kind === "variable" && value === "" };
  });
  const name = segments
    .filter((s) => s.value !== "")
    .map((s) => s.value)
    .join(rule.separator);
  const missing = segments
    .filter((s) => s.missing && s.token.kind === "variable")
    .map((s) => (s.token as Extract<NamingToken, { kind: "variable" }>).variable);
  return { name, segments, missing, tooLong: name.length > rule.maxLength };
}

/** Human-readable pattern, e.g. `{BRAND}_{PLATFORM}_{OBJECTIVE}`. */
export function namingPattern(rule: Pick<NamingRule, "tokens" | "separator">): string {
  return rule.tokens
    .map((t) => (t.kind === "literal" ? t.value : `{${t.variable}}`))
    .join(rule.separator);
}

/** Context with example values, for live previews in the rule editor. */
export function sampleNamingContext(brand: Pick<Brand, "code" | "name">, platform: Platform): NamingContext {
  return {
    brand,
    platform,
    campaignCode: "C1042",
    date: new Date(),
    fields:
      platform === "meta"
        ? { objective: "Sales", audience: "Prospecting - Broad", market: "IN", country: "India", product: "Kuro EDP 90ml" }
        : { objective: "Sales", campaignType: "Performance Max", market: "IN", country: "India", product: "Kuro EDP 90ml" },
  };
}

export function fieldForVariable(variable: NamingVariable): CampaignFieldKey | undefined {
  return NAMING_VARIABLE_MAP[variable].field;
}

export function fieldLabel(key: CampaignFieldKey): string {
  return FIELD_DEFS[key].label;
}
