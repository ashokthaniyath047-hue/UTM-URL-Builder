"use client";

import { useSyncExternalStore } from "react";
import type {
  Brand,
  Campaign,
  CampaignDraft,
  CampaignOSData,
  CampaignStatus,
  CampaignTemplate,
  ID,
  LandingPage,
  NamingRule,
  Platform,
  Settings,
  UTMRule,
} from "@/lib/domain/types";
import { STATUS_LABELS } from "@/lib/domain/fields";
import { computeCampaign } from "@/lib/engine/campaign";
import { LocalStorageRepository, type CampaignOSRepository } from "./repository";

/* ------------------------------------------------------------------ */
/* Core store                                                          */
/* ------------------------------------------------------------------ */

const repo: CampaignOSRepository = new LocalStorageRepository();
let state: CampaignOSData | null = null;
const listeners = new Set<() => void>();

function ensure(): CampaignOSData {
  if (!state) state = repo.load();
  return state;
}

function commit(next: CampaignOSData) {
  state = next;
  repo.save(next);
  listeners.forEach((l) => l());
}

function update(fn: (d: CampaignOSData) => CampaignOSData) {
  commit(fn(ensure()));
}

function subscribe(l: () => void) {
  listeners.add(l);
  // Sync across tabs.
  const onStorage = (e: StorageEvent) => {
    if (e.key === "campaign-os:data") {
      state = repo.load();
      l();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(l);
    window.removeEventListener("storage", onStorage);
  };
}

/** Returns null during SSR / first hydration render, then the live data. */
export function useData(): CampaignOSData | null {
  return useSyncExternalStore(subscribe, ensure, () => null);
}

export function getData(): CampaignOSData {
  return ensure();
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const now = () => new Date().toISOString();
export const uid = (prefix: string) =>
  `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

function currentUser(d: CampaignOSData) {
  return d.settings.currentUserId;
}

export function peekCampaignCode(d: CampaignOSData = ensure()): string {
  return `C${d.settings.nextCampaignSeq}`;
}

function snapshot(draft: CampaignDraft, d: CampaignOSData) {
  const c = computeCampaign(draft, d);
  return { name: c.name, generatedUrl: c.generatedUrl, computed: c };
}

/* ------------------------------------------------------------------ */
/* Campaign actions                                                    */
/* ------------------------------------------------------------------ */

export type ActionResult<T = void> = { ok: true; value: T } | { ok: false; error: string };

export function saveCampaign(draft: CampaignDraft, status: CampaignStatus): ActionResult<Campaign> {
  const d = ensure();
  const existing = draft.id ? d.campaigns.find((c) => c.id === draft.id) : undefined;
  const { name, generatedUrl, computed } = snapshot(draft, d);

  if ((status === "ready" || status === "launched") && !computed.validation.ok) {
    return { ok: false, error: `Fix ${computed.validation.errors} validation error(s) before marking ${STATUS_LABELS[status]}.` };
  }

  const t = now();
  const userId = currentUser(d);

  if (existing) {
    const history = [...existing.history, { id: uid("h"), at: t, userId, action: "updated" as const }];
    if (existing.status !== status) {
      history.push({ id: uid("h"), at: t, userId, action: "status_changed", detail: `${STATUS_LABELS[existing.status]} → ${STATUS_LABELS[status]}` });
    }
    const updated: Campaign = { ...existing, ...draft, id: existing.id, status, name, generatedUrl, updatedAt: t, createdAt: existing.createdAt, history };
    commit({ ...d, campaigns: d.campaigns.map((c) => (c.id === existing.id ? updated : c)) });
    return { ok: true, value: updated };
  }

  // New campaign: allocate the code now so concurrent drafts never collide.
  const seq = d.settings.nextCampaignSeq;
  const code = draft.code && draft.code !== `C${seq}` && !d.campaigns.some((c) => c.code === draft.code) ? draft.code : `C${seq}`;
  const finalDraft = { ...draft, code, createdAt: draft.createdAt ?? t };
  const snap = code === draft.code ? { name, generatedUrl } : snapshot(finalDraft, d);
  const campaign: Campaign = {
    ...finalDraft,
    id: uid("cmp"),
    status,
    name: snap.name,
    generatedUrl: snap.generatedUrl,
    createdAt: finalDraft.createdAt,
    updatedAt: t,
    history: [{ id: uid("h"), at: t, userId, action: "created", detail: `Saved as ${STATUS_LABELS[status]}` }],
  };
  commit({
    ...d,
    campaigns: [campaign, ...d.campaigns],
    settings: { ...d.settings, nextCampaignSeq: code === `C${seq}` ? seq + 1 : d.settings.nextCampaignSeq },
  });
  return { ok: true, value: campaign };
}

export function setCampaignStatus(id: ID, status: CampaignStatus): ActionResult {
  const d = ensure();
  const c = d.campaigns.find((x) => x.id === id);
  if (!c) return { ok: false, error: "Campaign not found." };
  if (c.status === status) return { ok: true, value: undefined };
  const computed = computeCampaign(c, d);
  if ((status === "ready" || status === "launched") && !computed.validation.ok) {
    return { ok: false, error: `${c.name || c.code} has ${computed.validation.errors} validation error(s). Open it to fix before marking ${STATUS_LABELS[status]}.` };
  }
  const t = now();
  update((s) => ({
    ...s,
    campaigns: s.campaigns.map((x) =>
      x.id === id
        ? {
            ...x,
            status,
            name: computed.name,
            generatedUrl: computed.generatedUrl,
            updatedAt: t,
            history: [...x.history, { id: uid("h"), at: t, userId: currentUser(s), action: "status_changed", detail: `${STATUS_LABELS[x.status]} → ${STATUS_LABELS[status]}` }],
          }
        : x,
    ),
  }));
  return { ok: true, value: undefined };
}

export function duplicateCampaign(id: ID): ActionResult<Campaign> {
  const d = ensure();
  const src = d.campaigns.find((c) => c.id === id);
  if (!src) return { ok: false, error: "Campaign not found." };
  const draft: CampaignDraft = {
    code: peekCampaignCode(d),
    brandId: src.brandId,
    platform: src.platform,
    templateId: src.templateId,
    ownerId: currentUser(d),
    fields: { ...src.fields },
    landingUrl: src.landingUrl,
    existingParamPolicy: src.existingParamPolicy,
    nameOverride: src.nameOverride,
    trackingOverrides: { ...src.trackingOverrides },
  };
  const res = saveCampaign(draft, "draft");
  if (res.ok) {
    update((s) => ({
      ...s,
      campaigns: s.campaigns.map((c) =>
        c.id === res.value.id
          ? { ...c, history: [{ ...c.history[0], action: "duplicated", detail: `Duplicated from ${src.code}` }] }
          : c,
      ),
    }));
  }
  return res;
}

export function deleteCampaign(id: ID) {
  update((s) => ({ ...s, campaigns: s.campaigns.filter((c) => c.id !== id) }));
}

export function importCampaigns(drafts: CampaignDraft[]): number {
  const d = ensure();
  let seq = d.settings.nextCampaignSeq;
  const t = now();
  const created: Campaign[] = drafts.map((draft) => {
    const code = `C${seq++}`;
    const full = { ...draft, code, createdAt: t };
    const snap = snapshot(full, d);
    return {
      ...full,
      id: uid("cmp"),
      status: "draft",
      name: snap.name,
      generatedUrl: snap.generatedUrl,
      createdAt: t,
      updatedAt: t,
      history: [{ id: uid("h"), at: t, userId: currentUser(d), action: "imported", detail: "Imported from CSV" }],
    };
  });
  commit({ ...d, campaigns: [...created, ...d.campaigns], settings: { ...d.settings, nextCampaignSeq: seq } });
  return created.length;
}

/* ------------------------------------------------------------------ */
/* Brand actions                                                       */
/* ------------------------------------------------------------------ */

function logBrand(s: CampaignOSData, brandId: ID, detail: string): CampaignOSData {
  return {
    ...s,
    brandActivity: [{ id: uid("ba"), brandId, at: now(), userId: currentUser(s), detail }, ...s.brandActivity],
  };
}

function defaultNamingRule(brand: Brand, platform: Platform): NamingRule {
  const vars = platform === "meta"
    ? (["BRAND", "PLATFORM", "OBJECTIVE", "AUDIENCE", "MARKET", "MONTH"] as const)
    : (["BRAND", "PLATFORM", "CAMPAIGN_TYPE", "OBJECTIVE", "MARKET", "MONTH"] as const);
  return {
    id: uid("nr"),
    brandId: brand.id,
    platform,
    name: `${brand.name} · ${platform === "meta" ? "Meta" : "Google"}`,
    tokens: vars.map((variable) => ({ id: uid("tk"), kind: "variable", variable })),
    separator: "_",
    casing: "upper",
    maxLength: 150,
    updatedAt: now(),
  };
}

function defaultUtmRule(brand: Brand, platform: Platform): UTMRule {
  return {
    id: uid("ur"),
    brandId: brand.id,
    platform,
    params:
      platform === "meta"
        ? { source: "meta", medium: "paid_social", campaign: "{campaign_name}", term: "", content: "{creative_name}", id: "{campaign_id}" }
        : { source: "google", medium: "paid_search", campaign: "{campaign_name}", term: "{keyword}", content: "{ad_name}", id: "{campaign_id}" },
    required: ["source", "medium", "campaign"],
    casing: "lower",
    spaceReplacement: "_",
    defaultExistingPolicy: "replace",
    updatedAt: now(),
  };
}

/** Make sure every enabled platform has naming + UTM rules. */
function withRules(s: CampaignOSData, brand: Brand): CampaignOSData {
  let next = s;
  let b = brand;
  for (const p of brand.platforms) {
    if (!b.namingRuleIds[p] || !next.namingRules.some((r) => r.id === b.namingRuleIds[p])) {
      const r = defaultNamingRule(b, p);
      next = { ...next, namingRules: [...next.namingRules, r] };
      b = { ...b, namingRuleIds: { ...b.namingRuleIds, [p]: r.id } };
    }
    if (!b.utmRuleIds[p] || !next.utmRules.some((r) => r.id === b.utmRuleIds[p])) {
      const r = defaultUtmRule(b, p);
      next = { ...next, utmRules: [...next.utmRules, r] };
      b = { ...b, utmRuleIds: { ...b.utmRuleIds, [p]: r.id } };
    }
  }
  return { ...next, brands: next.brands.some((x) => x.id === b.id) ? next.brands.map((x) => (x.id === b.id ? b : x)) : [...next.brands, b] };
}

export function createBrand(input: Pick<Brand, "name" | "code" | "website" | "country" | "currency" | "defaultMarket" | "platforms">): Brand {
  const t = now();
  const brand: Brand = {
    ...input,
    id: uid("b"),
    domains: [],
    namingRuleIds: {},
    utmRuleIds: {},
    disabledTemplateIds: [],
    archived: false,
    createdAt: t,
    updatedAt: t,
  };
  update((s) => logBrand(withRules(s, brand), brand.id, `Brand created with ${input.platforms.map((p) => (p === "meta" ? "Meta" : "Google")).join(" + ")}`));
  return ensure().brands.find((b) => b.id === brand.id)!;
}

export function updateBrand(id: ID, patch: Partial<Brand>, detail = "Brand settings updated") {
  update((s) => {
    const b = s.brands.find((x) => x.id === id);
    if (!b) return s;
    return logBrand(withRules(s, { ...b, ...patch, updatedAt: now() }), id, detail);
  });
}

export function updateNamingRule(rule: NamingRule) {
  update((s) =>
    logBrand(
      { ...s, namingRules: s.namingRules.map((r) => (r.id === rule.id ? { ...rule, updatedAt: now() } : r)) },
      rule.brandId,
      `${rule.platform === "meta" ? "Meta" : "Google"} naming rule updated`,
    ),
  );
}

export function updateUtmRule(rule: UTMRule) {
  update((s) =>
    logBrand(
      { ...s, utmRules: s.utmRules.map((r) => (r.id === rule.id ? { ...rule, updatedAt: now() } : r)) },
      rule.brandId,
      `${rule.platform === "meta" ? "Meta" : "Google"} UTM rule updated`,
    ),
  );
}

export function addLandingPage(lp: Omit<LandingPage, "id" | "createdAt">) {
  update((s) => logBrand({ ...s, landingPages: [{ ...lp, id: uid("lp"), createdAt: now() }, ...s.landingPages] }, lp.brandId, `Landing page added: ${lp.label}`));
}

export function removeLandingPage(id: ID) {
  update((s) => ({ ...s, landingPages: s.landingPages.filter((l) => l.id !== id) }));
}

/* ------------------------------------------------------------------ */
/* Templates                                                           */
/* ------------------------------------------------------------------ */

export function upsertTemplate(t: CampaignTemplate) {
  update((s) => ({
    ...s,
    templates: s.templates.some((x) => x.id === t.id)
      ? s.templates.map((x) => (x.id === t.id ? { ...t, updatedAt: now() } : x))
      : [...s.templates, { ...t, updatedAt: now() }],
  }));
}

export function duplicateTemplate(id: ID): CampaignTemplate | undefined {
  const src = ensure().templates.find((t) => t.id === id);
  if (!src) return;
  const copy: CampaignTemplate = { ...src, id: uid("t"), name: `${src.name} (copy)`, builtIn: false, updatedAt: now() };
  update((s) => {
    const idx = s.templates.findIndex((t) => t.id === id);
    const templates = [...s.templates];
    templates.splice(idx + 1, 0, copy);
    return { ...s, templates };
  });
  return copy;
}

export function deleteTemplate(id: ID) {
  update((s) => ({ ...s, templates: s.templates.filter((t) => t.id !== id) }));
}

/* ------------------------------------------------------------------ */
/* Settings                                                            */
/* ------------------------------------------------------------------ */

export function updateSettings(patch: Partial<Settings>) {
  update((s) => ({ ...s, settings: { ...s.settings, ...patch } }));
}

export function updateUser(id: ID, patch: { name?: string; email?: string }) {
  update((s) => ({
    ...s,
    users: s.users.map((u) =>
      u.id === id
        ? {
            ...u,
            ...patch,
            initials: (patch.name ?? u.name)
              .split(/\s+/)
              .map((p) => p[0])
              .join("")
              .slice(0, 2)
              .toUpperCase(),
          }
        : u,
    ),
  }));
}

export function resetDemoData() {
  commit(repo.reset());
}

export function replaceAllData(data: CampaignOSData) {
  commit(data);
}
