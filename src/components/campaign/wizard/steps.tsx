"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  ChevronDown,
  FilePlus2,
  Lock,
  Pencil,
  RotateCcw,
  Search,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BrandAvatar, Kbd, PlatformMark } from "@/components/shared/badges";
import { CopyButton } from "@/components/shared/copy-button";
import { PLATFORM_LABELS, STRUCTURE_LABELS } from "@/lib/domain/fields";
import type {
  Brand,
  CampaignDraft,
  CampaignFieldKey,
  CampaignOSData,
  CampaignTemplate,
  ExistingParamPolicy,
  Platform,
  UtmKey,
} from "@/lib/domain/types";
import { PLATFORMS, UTM_KEYS } from "@/lib/domain/types";
import type { ComputedCampaign } from "@/lib/engine/campaign";
import { namingPattern, NAMING_VARIABLE_MAP } from "@/lib/engine/naming";
import { SCRATCH_TEMPLATE_ID, templatesForBrand } from "@/lib/engine/templates";
import { detectBrands, isDynamicValue, parseLandingUrl } from "@/lib/engine/url";
import { UTM_LABELS } from "@/lib/engine/utm";
import { fieldAnchor, utmAnchor, type ValidationIssue } from "@/lib/engine/validation";
import { hostOf } from "@/lib/engine/url";
import { cn } from "@/lib/utils";
import { FieldControl, FieldLabel } from "../field-control";
import { GeneratedUrl } from "../generated-url";
import { UrlInspector } from "../url-inspector";
import { ValidationPanel, ValidationSummary } from "../validation-panel";
import { CampaignPackage } from "../campaign-package";

/* ------------------------------------------------------------------ */
/* Shared                                                              */
/* ------------------------------------------------------------------ */

export function StepHeading({ title, description }: { title: string; description?: React.ReactNode }) {
  return (
    <div className="mb-4">
      <h2 className="text-base font-semibold tracking-tight">{title}</h2>
      {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
    </div>
  );
}

function ChoiceCard({
  selected,
  disabled,
  onSelect,
  children,
  className,
  shortcut,
}: {
  selected?: boolean;
  disabled?: boolean;
  onSelect: () => void;
  children: React.ReactNode;
  className?: string;
  shortcut?: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        "group relative flex w-full flex-col items-start rounded-lg border bg-card p-3.5 text-left transition-colors outline-none",
        "hover:border-foreground/25 focus-visible:ring-3 focus-visible:ring-ring/50",
        selected && "border-brand bg-brand-soft/40 ring-1 ring-brand",
        disabled && "cursor-not-allowed opacity-50 hover:border-border",
        className,
      )}
    >
      {children}
      {shortcut && !disabled && <Kbd className="absolute top-3 right-3 opacity-0 group-hover:opacity-100">{shortcut}</Kbd>}
      {selected && (
        <span className="absolute top-3 right-3 flex size-4 items-center justify-center rounded-full bg-brand text-brand-foreground">
          <Check className="size-3" />
        </span>
      )}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Step 1 — Brand                                                      */
/* ------------------------------------------------------------------ */

export function StepBrand({
  data,
  draft,
  onSelect,
  onUrlDetected,
}: {
  data: CampaignOSData;
  draft: CampaignDraft;
  onSelect: (brand: Brand) => void;
  onUrlDetected: (url: string, brand: Brand) => void;
}) {
  const [q, setQ] = useState("");
  const [url, setUrl] = useState("");
  const brands = data.brands.filter((b) => !b.archived && b.name.toLowerCase().includes(q.toLowerCase()));
  const parsed = useMemo(() => parseLandingUrl(url), [url]);
  const matches = useMemo(() => detectBrands(parsed, data.brands), [parsed, data.brands]);

  return (
    <div>
      <StepHeading title="Which brand is this campaign for?" description="Brand settings drive naming, UTM rules and available templates." />

      <div className="mb-5 rounded-lg border border-dashed bg-surface p-3">
        <Label htmlFor="quick-url" className="mb-1.5 flex items-center gap-1.5 text-[13px] font-medium">
          <Sparkles className="size-3.5 text-brand" /> Start from a landing URL
          <span className="font-normal text-muted-foreground">(optional, detects the brand)</span>
        </Label>
        <Input
          id="quick-url"
          placeholder="https://www.tirabeauty.com/product/…"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="bg-background font-mono text-[12.5px]"
        />
        {url && parsed.valid && (
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
            {matches.length ? (
              <>
                <span className="text-muted-foreground">Detected:</span>
                {matches.map((m) => (
                  <Button key={m.brand.id} size="sm" variant="outline" onClick={() => onUrlDetected(url, m.brand)}>
                    {m.brand.name}
                    <span className="text-xs text-muted-foreground">{m.reason === "slug" ? "slug" : "domain"}</span>
                    <ArrowRight />
                  </Button>
                ))}
              </>
            ) : (
              <span className="text-muted-foreground">No brand matched {parsed.host}. Pick one below; the URL will be kept.</span>
            )}
          </div>
        )}
        {url && !parsed.valid && <p className="mt-1.5 text-xs text-destructive">{parsed.error}</p>}
      </div>

      {data.brands.length > 6 && (
        <div className="relative mb-3">
          <Search className="absolute top-2 left-2.5 size-4 text-muted-foreground" />
          <Input placeholder="Filter brands" value={q} onChange={(e) => setQ(e.target.value)} className="pl-8" />
        </div>
      )}

      <div role="radiogroup" aria-label="Brand" id="step-brand" className="grid grid-cols-2 gap-2.5 lg:grid-cols-3">
        {brands.map((b, i) => (
          <ChoiceCard
            key={b.id}
            selected={draft.brandId === b.id}
            onSelect={() => (url && parsed.valid ? onUrlDetected(url, b) : onSelect(b))}
            shortcut={i < 9 ? String(i + 1) : undefined}
          >
            <div className="flex items-center gap-2.5">
              <BrandAvatar name={b.name} className="size-8 text-xs" />
              <div className="min-w-0">
                <p className="font-medium">{b.name}</p>
                <p className="truncate text-xs text-muted-foreground">{hostOf(b.website)}</p>
              </div>
            </div>
            <div className="mt-3 flex w-full items-center justify-between text-xs text-muted-foreground">
              <span className="flex gap-1">
                {b.platforms.map((p) => (
                  <PlatformMark key={p} platform={p} />
                ))}
              </span>
              <span>
                {b.defaultMarket} · {b.currency}
              </span>
            </div>
          </ChoiceCard>
        ))}
      </div>
      {brands.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No brands match “{q}”.</p>}
      <p className="mt-4 text-xs text-muted-foreground">
        Missing a brand? <Link href="/brands" className="text-foreground underline underline-offset-2">Add it under Brands</Link>.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Step 2 — Platform                                                   */
/* ------------------------------------------------------------------ */

const PLATFORM_COPY: Record<Platform, string> = {
  meta: "Facebook & Instagram via Ads Manager. Campaign → Ad set → Ad.",
  google: "Search, Performance Max, Shopping, Display and YouTube. Campaign → Ad group → Ad.",
};

export function StepPlatform({
  brand,
  draft,
  onSelect,
}: {
  brand?: Brand;
  draft: CampaignDraft;
  onSelect: (p: Platform) => void;
}) {
  return (
    <div>
      <StepHeading title="Platform" description={brand ? `Platforms enabled for ${brand.name}.` : undefined} />
      <div role="radiogroup" aria-label="Platform" className="grid max-w-2xl grid-cols-2 gap-3">
        {PLATFORMS.map((p, i) => {
          const enabled = !!brand?.platforms.includes(p);
          return (
            <ChoiceCard key={p} selected={draft.platform === p && enabled} disabled={!enabled} onSelect={() => onSelect(p)} shortcut={String(i + 1)}>
              <div className="flex items-center gap-2">
                <PlatformMark platform={p} className="size-6 text-xs" />
                <span className="font-medium">{PLATFORM_LABELS[p]}</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{PLATFORM_COPY[p]}</p>
              {!enabled && brand && (
                <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                  <Lock className="size-3" /> Not enabled for {brand.name}.{" "}
                  <Link href={`/brands/${brand.id}`} className="underline" onClick={(e) => e.stopPropagation()}>
                    Brand settings
                  </Link>
                </p>
              )}
            </ChoiceCard>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Step 3 — Template                                                   */
/* ------------------------------------------------------------------ */

export function StepTemplate({
  data,
  brand,
  draft,
  onSelect,
}: {
  data: CampaignOSData;
  brand?: Brand;
  draft: CampaignDraft;
  onSelect: (templateId: string, template?: CampaignTemplate) => void;
}) {
  const templates = templatesForBrand(data, brand, draft.platform);
  return (
    <div>
      <StepHeading
        title={`${PLATFORM_LABELS[draft.platform]} template`}
        description="Templates prefill objective and delivery settings and define which fields are required."
      />
      <div role="radiogroup" aria-label="Template" className="grid grid-cols-2 gap-2.5 lg:grid-cols-3">
        {templates.map((t, i) => (
          <ChoiceCard key={t.id} selected={draft.templateId === t.id} onSelect={() => onSelect(t.id, t)} shortcut={i < 9 ? String(i + 1) : undefined}>
            <p className="pr-6 font-medium">{t.name}</p>
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{t.description}</p>
            <div className="mt-3 flex flex-wrap gap-1">
              {Object.entries(t.defaults)
                .filter(([k]) => ["objective", "audience", "campaignType", "optimization", "bidding"].includes(k))
                .slice(0, 3)
                .map(([k, v]) => (
                  <span key={k} className="rounded border bg-background px-1.5 py-0.5 text-[11px] text-muted-foreground">
                    {v}
                  </span>
                ))}
            </div>
          </ChoiceCard>
        ))}
        <ChoiceCard selected={draft.templateId === SCRATCH_TEMPLATE_ID} onSelect={() => onSelect(SCRATCH_TEMPLATE_ID)} className="border-dashed">
          <div className="flex items-center gap-2">
            <FilePlus2 className="size-4 text-muted-foreground" />
            <p className="font-medium">Start from scratch</p>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">All {PLATFORM_LABELS[draft.platform]} fields, no prefilled values.</p>
        </ChoiceCard>
      </div>
      {templates.length === 0 && (
        <p className="mt-3 text-sm text-muted-foreground">No templates are enabled for this brand on {PLATFORM_LABELS[draft.platform]}.</p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Step 4 — Campaign                                                   */
/* ------------------------------------------------------------------ */

const STRUCTURE_FIELDS: CampaignFieldKey[] = ["adSetName", "creativeName", "adGroupName", "adName", "keyword"];

export function StepCampaign({
  data,
  computed,
  setField,
  setLandingUrl,
  onSwitchBrand,
  showErrors,
  moreOpen,
  setMoreOpen,
}: {
  data: CampaignOSData;
  computed: ComputedCampaign;
  setField: (k: CampaignFieldKey, v: string) => void;
  setLandingUrl: (url: string) => void;
  onSwitchBrand: (brand: Brand) => void;
  showErrors: boolean;
  moreOpen: boolean;
  setMoreOpen: (o: boolean) => void;
}) {
  const { draft, resolved, parsedUrl, brand } = computed;
  const matches = useMemo(() => detectBrands(parsedUrl, data.brands), [parsedUrl, data.brands]);
  const slugMatch = matches.find((m) => m.reason === "slug");
  const brandMismatch = slugMatch && brand && slugMatch.brand.id !== brand.id;
  const savedPages = data.landingPages.filter((l) => l.brandId === draft.brandId);

  const errorFor = (k: CampaignFieldKey) =>
    showErrors ? computed.validation.issues.find((i) => i.anchor === fieldAnchor(k) && i.severity === "error")?.message : undefined;

  const required = new Set(resolved.required);
  const structure = resolved.fields.filter((f) => STRUCTURE_FIELDS.includes(f));
  const primary = resolved.fields.filter((f) => !STRUCTURE_FIELDS.includes(f) && (required.has(f) || f === "product"));
  const secondary = resolved.fields.filter((f) => !STRUCTURE_FIELDS.includes(f) && !primary.includes(f));
  const summary = secondary.map((f) => draft.fields[f]).filter(Boolean);

  const render = (k: CampaignFieldKey) => (
    <FieldControl
      key={k}
      field={k}
      platform={draft.platform}
      value={draft.fields[k]}
      onChange={(v) => setField(k, v)}
      required={required.has(k)}
      error={errorFor(k)}
      currency={brand?.currency}
    />
  );

  return (
    <div className="space-y-6">
      <section>
        <StepHeading title="Landing page" description="Paste the destination URL. Existing tracking parameters are detected automatically." />
        <FieldLabel htmlFor={fieldAnchor("landingUrl")} required>
          Landing URL
        </FieldLabel>
        <div className="flex gap-2">
          <Input
            id={fieldAnchor("landingUrl")}
            value={draft.landingUrl}
            onChange={(e) => setLandingUrl(e.target.value)}
            placeholder="https://"
            className="font-mono text-[12.5px]"
            aria-invalid={(showErrors && !parsedUrl.valid) || undefined}
            spellCheck={false}
            autoComplete="off"
          />
          {savedPages.length > 0 && (
            <Select value="" onValueChange={(id) => setLandingUrl(savedPages.find((p) => p.id === id)?.url ?? "")}>
              <SelectTrigger className="w-[190px] shrink-0">
                <SelectValue placeholder="Saved pages" />
              </SelectTrigger>
              <SelectContent align="end">
                {savedPages.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <UrlInspector parsed={parsedUrl} brandMatches={matches} className="mt-2.5" />
        {brandMismatch && (
          <div className="mt-2 flex items-center justify-between gap-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            <span className="flex items-center gap-1.5">
              <AlertTriangle className="size-4" /> This URL looks like a {slugMatch.brand.name} product, but the campaign brand is {brand.name}.
            </span>
            <Button size="sm" variant="outline" onClick={() => onSwitchBrand(slugMatch.brand)}>
              Switch to {slugMatch.brand.name}
            </Button>
          </div>
        )}
      </section>

      <section>
        <StepHeading title="Campaign details" description={computed.template ? `Prefilled from “${computed.template.name}”.` : undefined} />
        <div className="grid grid-cols-2 gap-x-4 gap-y-4">{primary.map(render)}</div>
      </section>

      {structure.length > 0 && (
        <section>
          <StepHeading
            title={`${STRUCTURE_LABELS[draft.platform].group} & ${STRUCTURE_LABELS[draft.platform].ad.toLowerCase()}`}
            description="Used for the campaign package and UTM content/term."
          />
          <div className="grid grid-cols-2 gap-x-4 gap-y-4">{structure.map(render)}</div>
        </section>
      )}

      {secondary.length > 0 && (
        <section className="rounded-lg border">
          <button
            type="button"
            onClick={() => setMoreOpen(!moreOpen)}
            aria-expanded={moreOpen}
            className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
          >
            <span>
              <span className="text-sm font-medium">{draft.platform === "meta" ? "Delivery settings" : "Bidding & targeting"}</span>
              {!moreOpen && (
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {summary.length ? summary.join(" · ") : `${secondary.length} optional fields`}
                </span>
              )}
            </span>
            <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", moreOpen && "rotate-180")} />
          </button>
          {moreOpen && <div className="grid grid-cols-2 gap-x-4 gap-y-4 border-t px-4 py-4">{secondary.map(render)}</div>}
        </section>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Step 5 — Tracking                                                   */
/* ------------------------------------------------------------------ */

export function StepTracking({
  computed,
  setNameOverride,
  setPolicy,
  setOverride,
  regenerate,
}: {
  computed: ComputedCampaign;
  setNameOverride: (v: string | null) => void;
  setPolicy: (p: ExistingParamPolicy) => void;
  setOverride: (k: UtmKey, v: string | undefined) => void;
  regenerate: () => void;
}) {
  const { draft, naming, rules, parsedUrl, built, tracking, brand } = computed;
  const editingName = !computed.nameIsGenerated;
  const existingUtm = parsedUrl.utmParams;

  return (
    <div className="space-y-6">
      {/* Name */}
      <section>
        <StepHeading
          title="Campaign name"
          description={
            rules.namingRule ? (
              <>
                Generated from {brand?.name}’s {PLATFORM_LABELS[draft.platform]} rule{" "}
                <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">{namingPattern(rules.namingRule)}</code>
              </>
            ) : (
              "No naming rule configured for this brand/platform."
            )
          }
        />
        <div className="rounded-lg border p-3" id={fieldAnchor("name")} tabIndex={-1}>
          {editingName ? (
            <div className="flex gap-2">
              <Input
                autoFocus
                value={draft.nameOverride ?? ""}
                onChange={(e) => setNameOverride(e.target.value)}
                className="font-mono text-[13px]"
                aria-label="Campaign name"
              />
              <Button variant="outline" onClick={() => setNameOverride(null)}>
                <RotateCcw /> Use generated
              </Button>
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between gap-3">
                <p className="font-mono text-[15px] font-semibold break-all">{computed.name || <span className="text-muted-foreground">—</span>}</p>
                <div className="flex shrink-0 gap-1">
                  <CopyButton value={computed.name} iconOnly size="icon-sm" variant="ghost" label="Copy name" toast="Name copied" />
                  <Button size="icon-sm" variant="ghost" aria-label="Edit name manually" onClick={() => setNameOverride(computed.name)}>
                    <Pencil />
                  </Button>
                </div>
              </div>
              {naming && (
                <div className="mt-2.5 flex flex-wrap items-center gap-1">
                  {naming.segments.map((s, i) => (
                    <span key={s.token.id} className="flex items-center gap-1">
                      {i > 0 && <span className="text-xs text-muted-foreground">{rules.namingRule?.separator}</span>}
                      <span
                        className={cn(
                          "inline-flex flex-col rounded border px-1.5 py-0.5 leading-tight",
                          s.missing ? "border-destructive/40 bg-destructive/5" : "bg-surface",
                        )}
                      >
                        <span className="text-[10px] tracking-wide text-muted-foreground uppercase">
                          {s.token.kind === "variable" ? NAMING_VARIABLE_MAP[s.token.variable].label : "Text"}
                        </span>
                        <span className={cn("font-mono text-xs", s.missing && "text-destructive")}>{s.missing ? "missing" : s.value}</span>
                      </span>
                    </span>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* Existing params */}
      {existingUtm.length > 0 && (
        <section id={fieldAnchor("existingPolicy")} tabIndex={-1}>
          <StepHeading
            title="Existing tracking parameters"
            description={`The landing URL already contains ${existingUtm.length} UTM parameter${existingUtm.length > 1 ? "s" : ""}. UTM keys are never duplicated.`}
          />
          <div className="mb-3 flex flex-wrap gap-1.5">
            {existingUtm.map((p, i) => (
              <code key={i} className="rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 font-mono text-[12px] text-amber-900">
                {p.raw}
              </code>
            ))}
          </div>
          <RadioGroup value={draft.existingParamPolicy} onValueChange={(v) => setPolicy(v as ExistingParamPolicy)} className="grid grid-cols-2 gap-2.5">
            {(
              [
                ["replace", "Replace tracking parameters", "Remove existing utm_* and apply the brand’s generated values.", true],
                ["keep", "Keep existing", "Keep existing utm_* values; only add parameters that are missing.", false],
              ] as const
            ).map(([value, title, desc, rec]) => (
              <Label
                key={value}
                htmlFor={`policy-${value}`}
                className={cn(
                  "flex cursor-pointer items-start gap-2.5 rounded-lg border p-3 font-normal",
                  draft.existingParamPolicy === value && "border-brand bg-brand-soft/40",
                )}
              >
                <RadioGroupItem id={`policy-${value}`} value={value} className="mt-0.5" />
                <span>
                  <span className="text-sm font-medium">
                    {title}
                    {rec && <span className="ml-1.5 text-xs font-normal text-muted-foreground">recommended</span>}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">{desc}</span>
                </span>
              </Label>
            ))}
          </RadioGroup>
          {built.removed.length > 0 && (
            <p className="mt-2 text-xs text-muted-foreground">
              Removing: {built.removed.map((p) => p.raw).join(", ")}
            </p>
          )}
        </section>
      )}

      {/* UTM */}
      <section>
        <div className="mb-4 flex items-end justify-between gap-3">
          <StepHeading
            title="UTM parameters"
            description={
              <>
                From {brand?.name}’s {PLATFORM_LABELS[draft.platform]} UTM rule.{" "}
                {brand && (
                  <Link href={`/brands/${brand.id}?tab=utm`} className="underline underline-offset-2">
                    Edit rule
                  </Link>
                )}
              </>
            }
          />
        </div>
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-surface text-left text-xs text-muted-foreground">
                <th className="w-[130px] px-3 py-2 font-medium">Parameter</th>
                <th className="px-3 py-2 font-medium">Value</th>
                <th className="w-[200px] px-3 py-2 font-medium">Rule</th>
              </tr>
            </thead>
            <tbody>
              {UTM_KEYS.map((k) => {
                const overridden = tracking.overridden.includes(k);
                const value = tracking.params[k] ?? "";
                const keptExisting = built.skipped.includes(k) ? built.kept.find((p) => p.key.toLowerCase() === `utm_${k}`) : undefined;
                return (
                  <tr key={k} className="border-b last:border-b-0">
                    <td className="px-3 py-1.5 align-middle">
                      <span className="text-xs font-semibold tracking-wide">{UTM_LABELS[k].label.toUpperCase()}</span>
                      <span className="block font-mono text-[11px] text-muted-foreground">{UTM_LABELS[k].param}</span>
                    </td>
                    <td className="px-3 py-1.5">
                      <div className="flex items-center gap-1.5">
                        <Input
                          id={utmAnchor(k)}
                          value={value}
                          onChange={(e) => setOverride(k, e.target.value)}
                          placeholder={UTM_LABELS[k].required ? "required" : "not used"}
                          className={cn("h-7 font-mono text-[12.5px]", overridden && "border-amber-300 bg-amber-50/50")}
                          spellCheck={false}
                        />
                        {overridden && (
                          <Button size="icon-xs" variant="ghost" aria-label={`Reset utm_${k} to rule`} onClick={() => setOverride(k, undefined)}>
                            <RotateCcw />
                          </Button>
                        )}
                      </div>
                      {keptExisting && (
                        <p className="mt-0.5 text-[11px] text-amber-800">Existing value kept in URL: {keptExisting.raw}</p>
                      )}
                      {value && isDynamicValue(value) && (
                        <p className="mt-0.5 text-[11px] text-muted-foreground">Dynamic: filled by {PLATFORM_LABELS[draft.platform]} at click time.</p>
                      )}
                    </td>
                    <td className="px-3 py-1.5 font-mono text-[11px] text-muted-foreground">
                      {overridden ? <span className="font-sans text-amber-700">Edited manually</span> : rules.utmRule?.params[k] || "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <GeneratedUrl url={computed.generatedUrl} onRegenerate={regenerate} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Step 6 — Review                                                     */
/* ------------------------------------------------------------------ */

export function StepReview({
  computed,
  onIssueClick,
  regenerate,
}: {
  computed: ComputedCampaign;
  onIssueClick: (i: ValidationIssue) => void;
  regenerate: () => void;
}) {
  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between">
        <StepHeading title="Review campaign package" description="Everything needed to build this campaign in the ad platform." />
        <ValidationSummary result={computed.validation} />
      </div>
      <div className="grid gap-5 xl:grid-cols-[280px_1fr]">
        <div>
          <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">Validation</p>
          <ValidationPanel result={computed.validation} onIssueClick={onIssueClick} />
        </div>
        <CampaignPackage computed={computed} onRegenerate={regenerate} />
      </div>
    </div>
  );
}

