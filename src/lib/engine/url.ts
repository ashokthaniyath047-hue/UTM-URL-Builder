/**
 * Landing URL parsing and campaign URL assembly.
 *
 * Query strings are parsed manually (not via URLSearchParams) so the *raw* text the user
 * pasted is preserved for display (e.g. `utm_medium=email+`) and untouched non-tracking
 * parameters are re-emitted byte-for-byte.
 */
import type { Brand, ExistingParamPolicy, TrackingParams, UtmKey } from "@/lib/domain/types";
import { UTM_KEYS } from "@/lib/domain/types";

export interface QueryParam {
  key: string;
  /** Decoded value (`+` → space, percent-decoded). */
  value: string;
  /** Exactly as it appeared in the input. */
  raw: string;
  isUtm: boolean;
}

export interface UrlWarning {
  code: "duplicate_param" | "whitespace_value" | "empty_value" | "not_https" | "uppercase_utm" | "click_id";
  message: string;
  param?: string;
}

export interface ParsedLandingUrl {
  input: string;
  valid: boolean;
  error?: string;
  /** Scheme + host + path, without query or fragment. */
  base: string;
  host: string;
  path: string;
  fragment: string;
  params: QueryParam[];
  utmParams: QueryParam[];
  otherParams: QueryParam[];
  warnings: UrlWarning[];
  page: DetectedPage;
}

export interface DetectedPage {
  type: "product" | "collection" | "home" | "other";
  slug?: string;
  /** Platform/store identifier appended to the slug (e.g. Tira's `--bfxjntcjip`). */
  externalId?: string;
  /** Human-readable guess derived from the slug — NOT fetched page metadata. */
  name?: string;
}

const CLICK_IDS = ["gclid", "fbclid", "gbraid", "wbraid", "msclkid", "dclid"];

function safeDecode(s: string): string {
  try {
    return decodeURIComponent(s.replace(/\+/g, " "));
  } catch {
    return s;
  }
}

export function parseQuery(query: string): QueryParam[] {
  if (!query) return [];
  return query
    .split("&")
    .filter((part) => part.length > 0)
    .map((part) => {
      const eq = part.indexOf("=");
      const rawKey = eq === -1 ? part : part.slice(0, eq);
      const rawValue = eq === -1 ? "" : part.slice(eq + 1);
      const key = safeDecode(rawKey);
      return {
        key,
        value: safeDecode(rawValue),
        raw: part,
        isUtm: key.toLowerCase().startsWith("utm_"),
      };
    });
}

function titleCase(s: string): string {
  return s
    .split(" ")
    .filter(Boolean)
    .map((w) => (/\d/.test(w) ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ");
}

export function detectPage(path: string): DetectedPage {
  const segments = path.split("/").filter(Boolean).map(safeDecode);
  if (segments.length === 0) return { type: "home" };

  const productIdx = segments.findIndex((s) => /^(product|products|p|item)$/i.test(s));
  const collectionIdx = segments.findIndex((s) => /^(collection|collections|category|categories|c|shop)$/i.test(s));

  const pick = (idx: number) => segments[idx + 1] ?? segments[segments.length - 1];

  let type: DetectedPage["type"] = "other";
  let segment = segments[segments.length - 1];
  if (productIdx !== -1 && segments[productIdx + 1]) {
    type = "product";
    segment = pick(productIdx);
  } else if (collectionIdx !== -1 && segments[collectionIdx + 1]) {
    type = "collection";
    segment = pick(collectionIdx);
  }

  // Strip file extensions and split trailing store IDs: "name--abc123" or "name-p-12345"
  segment = segment.replace(/\.(html?|php|aspx?)$/i, "");
  let slug = segment;
  let externalId: string | undefined;
  const dbl = segment.match(/^(.*?)--([a-z0-9]+)$/i);
  if (dbl) {
    slug = dbl[1];
    externalId = dbl[2];
  }

  const name = titleCase(slug.replace(/[-_]+/g, " ").trim());
  return { type, slug, externalId, name: name || undefined };
}

export function parseLandingUrl(input: string): ParsedLandingUrl {
  const trimmed = input.trim();
  const empty: ParsedLandingUrl = {
    input,
    valid: false,
    base: "",
    host: "",
    path: "",
    fragment: "",
    params: [],
    utmParams: [],
    otherParams: [],
    warnings: [],
    page: { type: "other" },
  };

  if (!trimmed) return { ...empty, error: "Enter a landing page URL." };
  if (/\s/.test(trimmed)) return { ...empty, error: "URL contains spaces. Remove or encode them." };

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return {
      ...empty,
      error: /^https?:\/\//i.test(trimmed)
        ? "This is not a valid URL."
        : "URL must start with https:// (or http://).",
    };
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return { ...empty, error: "Only http(s) landing pages are supported." };
  }
  if (!url.hostname.includes(".")) {
    return { ...empty, error: "Hostname looks incomplete (missing domain extension)." };
  }

  // Work on the raw string to preserve the exact query text.
  const hashIdx = trimmed.indexOf("#");
  const beforeHash = hashIdx === -1 ? trimmed : trimmed.slice(0, hashIdx);
  const fragment = hashIdx === -1 ? "" : trimmed.slice(hashIdx);
  const qIdx = beforeHash.indexOf("?");
  const base = qIdx === -1 ? beforeHash : beforeHash.slice(0, qIdx);
  const query = qIdx === -1 ? "" : beforeHash.slice(qIdx + 1);

  const params = parseQuery(query);
  const warnings: UrlWarning[] = [];

  if (url.protocol === "http:") {
    warnings.push({ code: "not_https", message: "Landing page uses http://. Ad platforms prefer https://." });
  }

  const seen = new Map<string, number>();
  for (const p of params) {
    const k = p.key.toLowerCase();
    seen.set(k, (seen.get(k) ?? 0) + 1);
    if (p.value !== p.value.trim()) {
      warnings.push({
        code: "whitespace_value",
        param: p.key,
        message: `${p.key} has leading/trailing whitespace ("${p.raw}" decodes to "${p.value}").`,
      });
    }
    if (p.isUtm && p.value.trim() === "") {
      warnings.push({ code: "empty_value", param: p.key, message: `${p.key} is empty.` });
    }
    if (p.isUtm && p.key !== p.key.toLowerCase()) {
      warnings.push({ code: "uppercase_utm", param: p.key, message: `${p.key} should be lowercase.` });
    }
    if (CLICK_IDS.includes(k)) {
      warnings.push({
        code: "click_id",
        param: p.key,
        message: `${p.key} is a click ID from a previous ad click and should not be in a landing URL.`,
      });
    }
  }
  for (const [k, n] of seen) {
    if (n > 1) warnings.push({ code: "duplicate_param", param: k, message: `${k} appears ${n} times.` });
  }

  return {
    input,
    valid: true,
    base,
    host: url.hostname.toLowerCase(),
    path: url.pathname,
    fragment,
    params,
    utmParams: params.filter((p) => p.isUtm),
    otherParams: params.filter((p) => !p.isUtm),
    warnings,
    page: detectPage(url.pathname),
  };
}

/* ------------------------------------------------------------------ */
/* Brand detection                                                     */
/* ------------------------------------------------------------------ */

export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

export interface BrandMatch {
  brand: Brand;
  reason: "slug" | "domain";
}

/**
 * Best-effort brand detection from host and slug. A slug match (e.g. "ajmal-kuro-…")
 * beats a domain match because marketplaces like Tira host many brands.
 */
export function detectBrands(parsed: ParsedLandingUrl, brands: Brand[]): BrandMatch[] {
  if (!parsed.valid) return [];
  const host = parsed.host.replace(/^www\./, "");
  const slug = (parsed.page.slug ?? "").toLowerCase();
  const matches: BrandMatch[] = [];

  for (const b of brands) {
    const nameKey = b.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const codeKey = b.code.toLowerCase();
    if (slug && (slug.startsWith(nameKey + "-") || slug.startsWith(codeKey + "-"))) {
      matches.push({ brand: b, reason: "slug" });
    }
  }
  for (const b of brands) {
    if (matches.some((m) => m.brand.id === b.id)) continue;
    const hosts = [hostOf(b.website), ...b.domains.map((d) => d.replace(/^www\./, ""))];
    if (hosts.includes(host)) matches.push({ brand: b, reason: "domain" });
  }
  return matches;
}

/* ------------------------------------------------------------------ */
/* Encoding + assembly                                                 */
/* ------------------------------------------------------------------ */

/**
 * Platform dynamic parameters (Meta `{{ad.name}}`, Google ValueTrack `{keyword}`) must stay
 * unencoded so the ad platform can substitute them at click time.
 */
const DYNAMIC_TOKEN = /(\{\{[a-z_.]+\}\}|\{[a-z_:]+\})/gi;

export function isDynamicValue(value: string): boolean {
  DYNAMIC_TOKEN.lastIndex = 0;
  return DYNAMIC_TOKEN.test(value);
}

export function encodeQueryValue(value: string): string {
  return value
    .split(DYNAMIC_TOKEN)
    .map((part, i) => (i % 2 === 1 ? part : encodeURIComponent(part)))
    .join("");
}

export interface BuildUrlResult {
  url: string;
  /** Existing utm_* parameters that were dropped (replace policy or duplicates). */
  removed: QueryParam[];
  /** Existing utm_* params kept as-is (keep policy). */
  kept: QueryParam[];
  /** Generated keys not applied because an existing value was kept. */
  skipped: UtmKey[];
}

/**
 * Assemble the final campaign URL.
 *  - Non-UTM parameters are preserved exactly, in their original order.
 *  - `replace`: all existing utm_* are removed, generated ones are appended.
 *  - `keep`: existing utm_* are kept (first occurrence wins); generated ones fill the gaps.
 * In both modes no utm_* key ever appears twice.
 */
export function buildCampaignUrl(
  parsed: ParsedLandingUrl,
  tracking: TrackingParams,
  policy: ExistingParamPolicy,
): BuildUrlResult {
  if (!parsed.valid) return { url: "", removed: [], kept: [], skipped: [] };

  const parts: string[] = [];
  const removed: QueryParam[] = [];
  const kept: QueryParam[] = [];
  const skipped: UtmKey[] = [];
  const usedKeys = new Set<string>();

  for (const p of parsed.params) {
    const k = p.key.toLowerCase();
    if (!p.isUtm) {
      parts.push(p.raw);
      continue;
    }
    if (policy === "replace" || usedKeys.has(k)) {
      removed.push(p);
      continue;
    }
    usedKeys.add(k);
    kept.push(p);
    parts.push(p.raw);
  }

  for (const key of UTM_KEYS) {
    const v = tracking[key];
    if (v === undefined || v === "") continue;
    const full = `utm_${key}`;
    if (usedKeys.has(full)) {
      skipped.push(key);
      continue;
    }
    usedKeys.add(full);
    parts.push(`${full}=${encodeQueryValue(v)}`);
  }

  const query = parts.length ? `?${parts.join("&")}` : "";
  return { url: `${parsed.base}${query}${parsed.fragment}`, removed, kept, skipped };
}

/** Count occurrences of each utm_* key in a final URL (used by validation). */
export function duplicateUtmKeys(url: string): string[] {
  const q = url.split("#")[0].split("?")[1] ?? "";
  const counts = new Map<string, number>();
  for (const p of parseQuery(q)) {
    if (!p.isUtm) continue;
    const k = p.key.toLowerCase();
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return [...counts].filter(([, n]) => n > 1).map(([k]) => k);
}
