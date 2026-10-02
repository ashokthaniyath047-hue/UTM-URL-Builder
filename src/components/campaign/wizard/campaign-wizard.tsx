"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, CircleAlert, Save, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Kbd, PlatformMark, StatusBadge } from "@/components/shared/badges";
import { CopyButton } from "@/components/shared/copy-button";
import { PageHeader } from "@/components/shared/page";
import { PLATFORM_LABELS } from "@/lib/domain/fields";
import type {
  Brand,
  CampaignDraft,
  CampaignFieldKey,
  CampaignOSData,
  CampaignStatus,
  CampaignTemplate,
  ExistingParamPolicy,
  Platform,
  UtmKey,
} from "@/lib/domain/types";
import { computeCampaign } from "@/lib/engine/campaign";
import { getTemplate, initialFieldsFor, resolveRules, SCRATCH_TEMPLATE_ID, templatesForBrand } from "@/lib/engine/templates";
import { parseLandingUrl } from "@/lib/engine/url";
import { WIZARD_STEPS, type ValidationIssue, type WizardStep } from "@/lib/engine/validation";
import { saveCampaign } from "@/lib/store/store";
import { copyText } from "@/lib/utils/clipboard";
import { cn } from "@/lib/utils";
import { ValidationSummary } from "../validation-panel";
import { StepBrand, StepCampaign, StepPlatform, StepReview, StepTemplate, StepTracking } from "./steps";

/** Fields the user typed that should survive a template switch. */
const CARRY_OVER: CampaignFieldKey[] = ["product", "budget", "adSetName", "creativeName", "adGroupName", "adName", "keyword", "location"];

function productFromUrl(url: string, brand?: Brand): string | undefined {
  const p = parseLandingUrl(url);
  if (!p.valid || !p.page.name || p.page.type === "home") return undefined;
  let name = p.page.name;
  if (brand && name.toLowerCase().startsWith(brand.name.toLowerCase() + " ")) name = name.slice(brand.name.length + 1);
  return name;
}

export function CampaignWizard({
  data,
  initialDraft,
  initialStep = 1,
  mode,
  focusAnchor,
}: {
  data: CampaignOSData;
  initialDraft: CampaignDraft;
  initialStep?: WizardStep;
  mode: "create" | "edit";
  focusAnchor?: string;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<CampaignDraft>(initialDraft);
  const [step, setStep] = useState<WizardStep>(initialStep);
  const [showErrors, setShowErrors] = useState(mode === "edit");
  const [moreOpen, setMoreOpen] = useState(false);
  const [pendingFocus, setPendingFocus] = useState<string | undefined>(focusAnchor);
  const [saving, setSaving] = useState(false);
  const productAuto = useRef(false);

  const computed = useMemo(() => computeCampaign(draft, data), [draft, data]);
  const brand = computed.brand;

  /* ---------------- mutations ---------------- */

  const policyFor = useCallback(
    (brandId: string, platform: Platform, templateId: string | null): ExistingParamPolicy => {
      const b = data.brands.find((x) => x.id === brandId);
      const t = getTemplate(data, templateId, platform);
      return resolveRules(data, b, platform, t).utmRule?.defaultExistingPolicy ?? data.settings.defaultExistingPolicy;
    },
    [data],
  );

  const selectBrand = (b: Brand, landingUrl?: string) => {
    setDraft((d) => {
      const platform = b.platforms.includes(d.platform) ? d.platform : b.platforms[0];
      const keepTemplate = platform === d.platform && d.templateId && !b.disabledTemplateIds.includes(d.templateId);
      const prev = data.brands.find((x) => x.id === d.brandId);
      const fields = { ...d.fields };
      if (!fields.market || fields.market === prev?.defaultMarket) fields.market = b.defaultMarket;
      if (!fields.country || fields.country === prev?.country) fields.country = b.country;
      const url = landingUrl ?? d.landingUrl;
      if (landingUrl && (!fields.product || productAuto.current)) {
        const detected = productFromUrl(landingUrl, b);
        if (detected) {
          fields.product = detected;
          productAuto.current = true;
        }
      }
      const templateId = keepTemplate ? d.templateId : null;
      return {
        ...d,
        brandId: b.id,
        platform,
        templateId,
        fields,
        landingUrl: url,
        existingParamPolicy: policyFor(b.id, platform, templateId),
      };
    });
    if (mode === "create") setStep(b.platforms.length === 1 ? 3 : 2);
  };

  const selectPlatform = (p: Platform) => {
    setDraft((d) => {
      if (d.platform === p) return d;
      const carried = Object.fromEntries(CARRY_OVER.filter((k) => d.fields[k]).map((k) => [k, d.fields[k]]));
      return {
        ...d,
        platform: p,
        templateId: null,
        fields: { ...initialFieldsFor(brand, undefined), ...carried },
        trackingOverrides: {},
        existingParamPolicy: policyFor(d.brandId, p, null),
      };
    });
    setStep(3);
  };

  const selectTemplate = (templateId: string, t?: CampaignTemplate) => {
    setDraft((d) => {
      const carried = Object.fromEntries(CARRY_OVER.filter((k) => d.fields[k]).map((k) => [k, d.fields[k]]));
      const fields = { ...initialFieldsFor(brand, t), ...carried };
      // Keep market/country if the user changed them.
      if (d.fields.market) fields.market = d.fields.market;
      if (d.fields.country) fields.country = d.fields.country;
      return { ...d, templateId, fields, existingParamPolicy: policyFor(d.brandId, d.platform, templateId) };
    });
    setStep(4);
  };

  const setField = (k: CampaignFieldKey, v: string) => {
    if (k === "product") productAuto.current = false;
    setDraft((d) => ({ ...d, fields: { ...d.fields, [k]: v } }));
  };

  const setLandingUrl = (url: string) => {
    setDraft((d) => {
      const fields = { ...d.fields };
      if (!fields.product || productAuto.current) {
        const detected = productFromUrl(url, data.brands.find((b) => b.id === d.brandId));
        if (detected) {
          fields.product = detected;
          productAuto.current = true;
        } else if (productAuto.current) {
          fields.product = "";
        }
      }
      return { ...d, landingUrl: url, fields };
    });
  };

  const setOverride = (k: UtmKey, v: string | undefined) =>
    setDraft((d) => {
      const o = { ...d.trackingOverrides };
      if (v === undefined) delete o[k];
      else o[k] = v;
      return { ...d, trackingOverrides: o };
    });

  const regenerate = () => {
    setDraft((d) => ({ ...d, nameOverride: null, trackingOverrides: {} }));
    toast.success("Regenerated from brand rules");
  };

  /* ---------------- navigation ---------------- */

  const canEnter = (s: WizardStep) => {
    if (mode === "edit") return true;
    if (s >= 2 && !brand) return false;
    if (s >= 3 && !brand?.platforms.includes(draft.platform)) return false;
    if (s >= 4 && !draft.templateId) return false;
    return true;
  };

  const stepDone = (s: WizardStep) => {
    const errs = computed.validation.issues.filter((i) => i.severity === "error" && i.step === s);
    if (s === 1) return !!brand;
    if (s === 2) return !!brand?.platforms.includes(draft.platform);
    if (s === 3) return !!draft.templateId;
    if (s === 6) return computed.validation.ok;
    return errs.length === 0 && (step > s || mode === "edit");
  };

  const next = () => {
    if (step === 4 && computed.validation.issues.some((i) => i.step === 4 && i.severity === "error")) setShowErrors(true);
    const n = (step + 1) as WizardStep;
    if (n <= 6 && canEnter(n)) setStep(n);
  };
  const back = () => step > 1 && setStep((step - 1) as WizardStep);

  const goToIssue = (issue: ValidationIssue) => {
    setShowErrors(true);
    if (issue.step === 4) setMoreOpen(true);
    setStep(issue.step);
    setPendingFocus(issue.anchor ?? `step-${issue.step}`);
  };

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [step]);

  useEffect(() => {
    if (!pendingFocus) return;
    const id = requestAnimationFrame(() => {
      const el = document.getElementById(pendingFocus);
      if (el) {
        el.scrollIntoView({ block: "center", behavior: "smooth" });
        (el as HTMLElement).focus({ preventScroll: true });
        el.classList.remove("field-flash");
        void el.offsetWidth;
        el.classList.add("field-flash");
      }
      setPendingFocus(undefined);
    });
    return () => cancelAnimationFrame(id);
  }, [pendingFocus, step, moreOpen]);

  /* ---------------- save ---------------- */

  const save = (status: CampaignStatus) => {
    setSaving(true);
    const res = saveCampaign({ ...draft, createdAt: draft.createdAt }, status);
    setSaving(false);
    if (!res.ok) {
      toast.error(res.error);
      setStep(6);
      return;
    }
    if (data.settings.copyUrlOnSave && res.value.generatedUrl) void copyText(res.value.generatedUrl, "Saved · URL copied");
    else toast.success(mode === "edit" ? "Campaign updated" : `Campaign ${res.value.code} saved as ${status}`);
    router.push(`/campaigns/${res.value.id}${mode === "create" ? "?created=1" : ""}`);
  };

  /* ---------------- keyboard ---------------- */

  const optionLists = useMemo(() => {
    const brands = data.brands.filter((b) => !b.archived);
    const templates = templatesForBrand(data, brand, draft.platform);
    return { brands, templates };
  }, [data, brand, draft.platform]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      const typing = ["INPUT", "TEXTAREA"].includes(t.tagName) || t.isContentEditable;
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        if (step < 6) next();
        else if (computed.validation.ok) save(mode === "edit" ? (draft.status ?? "draft") : "ready");
        else toast.error(`Fix ${computed.validation.errors} validation error(s) first.`);
        return;
      }
      if (typing || e.metaKey || e.ctrlKey || e.altKey || document.querySelector("[role=dialog],[role=listbox],[role=menu]")) return;
      const n = Number(e.key);
      if (!Number.isInteger(n) || n < 1 || n > 9) return;
      if (step === 1 && optionLists.brands[n - 1]) selectBrand(optionLists.brands[n - 1]);
      else if (step === 2 && n <= 2) {
        const p = (["meta", "google"] as Platform[])[n - 1];
        if (brand?.platforms.includes(p)) selectPlatform(p);
      } else if (step === 3 && optionLists.templates[n - 1]) selectTemplate(optionLists.templates[n - 1].id, optionLists.templates[n - 1]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  /* ---------------- render ---------------- */

  const template = computed.template;
  const isLast = step === 6;

  return (
    <div className="flex min-h-screen flex-col">
      <PageHeader
        breadcrumbs={[
          { label: "Campaigns", href: "/campaigns" },
          { label: mode === "edit" ? draft.code : "New campaign" },
        ]}
        title={mode === "edit" ? `Edit ${computed.name || draft.code}` : "Create campaign"}
        actions={mode === "edit" && draft.status ? <StatusBadge status={draft.status} /> : undefined}
      >
        <ol className="mt-4 flex items-center gap-1" aria-label="Steps">
          {WIZARD_STEPS.map((s, i) => {
            const active = s.step === step;
            const done = !active && stepDone(s.step);
            const enabled = canEnter(s.step);
            const hasErr = showErrors && computed.validation.issues.some((x) => x.step === s.step && x.severity === "error") && s.step >= 4;
            return (
              <li key={s.step} className="flex items-center gap-1">
                {i > 0 && <span className="h-px w-5 bg-border" />}
                <button
                  type="button"
                  disabled={!enabled}
                  onClick={() => setStep(s.step)}
                  aria-current={active ? "step" : undefined}
                  className={cn(
                    "flex h-7 items-center gap-2 rounded-md px-2 text-sm transition-colors disabled:opacity-40",
                    active ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-4.5 items-center justify-center rounded-full text-[10px] font-semibold",
                      active ? "bg-background text-foreground" : done ? "bg-emerald-600 text-white" : hasErr ? "bg-destructive text-white" : "border",
                    )}
                  >
                    {done ? <Check className="size-3" /> : hasErr ? "!" : s.step}
                  </span>
                  {s.label}
                </button>
              </li>
            );
          })}
        </ol>
      </PageHeader>

      <div className="mx-auto grid w-full max-w-[1400px] flex-1 gap-6 px-6 py-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className={cn("min-w-0", step < 6 && "max-w-[820px]")}>
          {step === 1 && <StepBrand data={data} draft={draft} onSelect={(b) => selectBrand(b)} onUrlDetected={(url, b) => selectBrand(b, url)} />}
          {step === 2 && <StepPlatform brand={brand} draft={draft} onSelect={selectPlatform} />}
          {step === 3 && <StepTemplate data={data} brand={brand} draft={draft} onSelect={selectTemplate} />}
          {step === 4 && (
            <StepCampaign
              data={data}
              computed={computed}
              setField={setField}
              setLandingUrl={setLandingUrl}
              onSwitchBrand={(b) => selectBrand(b)}
              showErrors={showErrors}
              moreOpen={moreOpen}
              setMoreOpen={setMoreOpen}
            />
          )}
          {step === 5 && (
            <StepTracking
              computed={computed}
              setNameOverride={(v) => setDraft((d) => ({ ...d, nameOverride: v }))}
              setPolicy={(p) => setDraft((d) => ({ ...d, existingParamPolicy: p }))}
              setOverride={setOverride}
              regenerate={regenerate}
            />
          )}
          {step === 6 && <StepReview computed={computed} onIssueClick={goToIssue} regenerate={regenerate} />}
        </div>

        {/* Live preview rail */}
        <aside className="hidden lg:block">
          <div className="sticky top-4 space-y-3">
            <div className="rounded-lg border bg-card">
              <p className="border-b px-3 py-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">Live preview</p>
              <dl className="space-y-2.5 px-3 py-3 text-sm">
                {(
                  [
                    [1, "Brand", brand?.name],
                    [2, "Platform", brand ? (
                      <span className="inline-flex items-center gap-1.5"><PlatformMark platform={draft.platform} />{PLATFORM_LABELS[draft.platform]}</span>
                    ) : undefined],
                    [3, "Template", draft.templateId === SCRATCH_TEMPLATE_ID ? "From scratch" : template?.name],
                  ] as [WizardStep, string, React.ReactNode][]
                ).map(([s, label, value]) => (
                  <div key={label} className="flex items-center justify-between gap-2">
                    <dt className="text-muted-foreground">{label}</dt>
                    <dd className="truncate text-right">
                      {value ? (
                        <button type="button" className="hover:underline" onClick={() => canEnter(s) && setStep(s)}>
                          {value}
                        </button>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
              <div className="border-t px-3 py-3">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Campaign name</span>
                  {computed.name && <CopyButton value={computed.name} iconOnly size="icon-xs" variant="ghost" label="Copy name" toast="Name copied" />}
                </div>
                <p className={cn("font-mono text-[12px] font-medium break-all", !computed.name && "text-muted-foreground")}>
                  {computed.name || "Generated after brand & details"}
                </p>
              </div>
              <div className="border-t px-3 py-3">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Campaign URL</span>
                  {computed.generatedUrl && <CopyButton value={computed.generatedUrl} iconOnly size="icon-xs" variant="ghost" label="Copy URL" toast="URL copied" />}
                </div>
                <p className={cn("line-clamp-4 font-mono text-[11.5px] break-all", !computed.generatedUrl && "text-muted-foreground")}>
                  {computed.generatedUrl || "Add a landing URL"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => canEnter(6) && setStep(6)}
                className="flex w-full items-center justify-between border-t px-3 py-2.5 text-left hover:bg-surface"
              >
                <ValidationSummary result={computed.validation} />
                <ArrowRight className="size-3.5 text-muted-foreground" />
              </button>
            </div>
            <p className="px-1 text-xs text-muted-foreground">
              <Kbd>⌘</Kbd> <Kbd>↵</Kbd> continue{step <= 3 && <> · <Kbd>1</Kbd>–<Kbd>9</Kbd> pick</>}
            </p>
          </div>
        </aside>
      </div>

      {/* Footer */}
      <div className="sticky bottom-0 z-10 border-t bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-3 px-6 py-3">
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={back} disabled={step === 1}>
              <ArrowLeft /> Back
            </Button>
            {!computed.validation.ok && step >= 4 && (
              <span className="hidden items-center gap-1 text-xs text-muted-foreground md:flex">
                <CircleAlert className="size-3.5" /> Drafts can be saved with errors. Ready requires all checks to pass.
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {brand && draft.templateId && (
              <Button variant="outline" disabled={saving} onClick={() => save(mode === "edit" ? draft.status ?? "draft" : "draft")}>
                <Save /> {mode === "edit" ? "Save changes" : "Save draft"}
              </Button>
            )}
            {isLast ? (
              <>
                <Button variant="outline" disabled={saving || !brand} onClick={() => save("review")}>
                  <Send /> Submit for review
                </Button>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span tabIndex={computed.validation.ok ? -1 : 0}>
                      <Button disabled={saving || !computed.validation.ok} onClick={() => save("ready")} className="bg-brand text-brand-foreground hover:bg-brand/90">
                        <Check /> Save as Ready
                        <Kbd className="border-white/25 bg-white/10 text-white/80">⌘↵</Kbd>
                      </Button>
                    </span>
                  </TooltipTrigger>
                  {!computed.validation.ok && <TooltipContent>Fix {computed.validation.errors} error(s) to mark Ready</TooltipContent>}
                </Tooltip>
              </>
            ) : (
              <Button onClick={next} disabled={!canEnter((step + 1) as WizardStep)}>
                Continue <ArrowRight />
                <Kbd className="border-white/20 bg-white/10 text-background/70">⌘↵</Kbd>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
