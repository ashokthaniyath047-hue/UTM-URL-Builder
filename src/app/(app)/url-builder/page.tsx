"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, Eraser, Sparkles, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FieldLabel } from "@/components/campaign/field-control";
import { GeneratedUrl } from "@/components/campaign/generated-url";
import { UrlInspector } from "@/components/campaign/url-inspector";
import { PlatformMark } from "@/components/shared/badges";
import { PageBody, PageHeader, PageSkeleton, Panel } from "@/components/shared/page";
import { DEMO_URL } from "@/lib/data/seed";
import { PLATFORM_LABELS } from "@/lib/domain/fields";
import type { ExistingParamPolicy, TrackingParams, UtmKey } from "@/lib/domain/types";
import { buildCampaignUrl, detectBrands, parseLandingUrl } from "@/lib/engine/url";
import { UTM_LABELS, validateTracking } from "@/lib/engine/utm";
import { useData } from "@/lib/store/store";

const FORM: { key: UtmKey; label: string; placeholder: string; required?: boolean }[] = [
  { key: "source", label: "Campaign Source", placeholder: "e.g. google, newsletter", required: true },
  { key: "medium", label: "Campaign Medium", placeholder: "e.g. cpc, banner, email", required: true },
  { key: "campaign", label: "Campaign Name", placeholder: "e.g. ajmal_meta_sales_prospecting_in_oct26", required: true },
  { key: "id", label: "Campaign ID", placeholder: "e.g. C1042" },
  { key: "term", label: "Campaign Term", placeholder: "Identify the paid keywords" },
  { key: "content", label: "Campaign Content", placeholder: "Use to differentiate ads" },
];

const NONE = "__none";

export default function UrlBuilderPage() {
  const data = useData();
  const [url, setUrl] = useState("");
  const [params, setParams] = useState<TrackingParams>({});
  const [policy, setPolicy] = useState<ExistingParamPolicy>("replace");
  const [preset, setPreset] = useState(NONE);

  const parsed = useMemo(() => parseLandingUrl(url), [url]);
  const matches = useMemo(() => (data ? detectBrands(parsed, data.brands) : []), [parsed, data]);
  const clean = useMemo(() => Object.fromEntries(Object.entries(params).map(([k, v]) => [k, v?.trim()]).filter(([, v]) => v)) as TrackingParams, [params]);
  const built = useMemo(() => buildCampaignUrl(parsed, clean, policy), [parsed, clean, policy]);
  const issues = validateTracking(clean, { required: [] }).filter((i) => clean[i.key] || i.key !== "id");
  const missingRequired = FORM.filter((f) => f.required && !clean[f.key]);

  if (!data) return <PageSkeleton />;

  const presets = data.brands.flatMap((b) =>
    b.platforms.map((p) => ({ id: `${b.id}:${p}`, brand: b, platform: p, rule: data.utmRules.find((r) => r.id === b.utmRuleIds[p]) })),
  );

  const applyPreset = (id: string) => {
    setPreset(id);
    const pr = presets.find((x) => x.id === id);
    if (!pr?.rule) return;
    const literal = (s: string) => (/\{[a-z_]+\}/.test(s) && !/\{keyword\}|\{\{/.test(s) ? "" : s);
    setParams((p) => ({
      ...p,
      source: pr.rule!.params.source,
      medium: pr.rule!.params.medium,
      term: literal(pr.rule!.params.term) || p.term,
    }));
    setPolicy(pr.rule.defaultExistingPolicy);
  };

  const finalUrl = missingRequired.length === 0 ? built.url : "";

  return (
    <>
      <PageHeader
        title="URL Builder"
        description="Add campaign parameters to any URL. For full campaigns use Create Campaign, which generates these from brand rules."
        actions={
          <Button asChild className="bg-brand text-brand-foreground hover:bg-brand/90">
            <Link href="/campaigns/new">Create Campaign</Link>
          </Button>
        }
      />
      <PageBody className="space-y-5">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <Panel
            title="Campaign URL"
            actions={
              <>
                <Button size="sm" variant="ghost" onClick={() => setUrl(DEMO_URL)}>
                  <Sparkles /> Try example
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setUrl(""); setParams({}); setPreset(NONE); }}>
                  <Eraser /> Clear
                </Button>
              </>
            }
          >
            <div className="space-y-4">
              <div>
                <FieldLabel htmlFor="ub-url" required hint="The full landing page URL">Landing URL</FieldLabel>
                <Input id="ub-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.example.com/product/…" className="font-mono text-[12.5px]" spellCheck={false} />
                <UrlInspector parsed={parsed} brandMatches={matches} className="mt-2" />
              </div>

              {parsed.utmParams.length > 0 && (
                <RadioGroup value={policy} onValueChange={(v) => setPolicy(v as ExistingParamPolicy)} className="flex gap-4" aria-label="Existing UTM parameters">
                  <Label className="flex items-center gap-2 font-normal"><RadioGroupItem value="replace" /> Replace tracking parameters</Label>
                  <Label className="flex items-center gap-2 font-normal"><RadioGroupItem value="keep" /> Keep existing</Label>
                </RadioGroup>
              )}

              <div>
                <FieldLabel hint="Optional">Brand preset</FieldLabel>
                <Select value={preset} onValueChange={applyPreset}>
                  <SelectTrigger className="w-full max-w-sm"><SelectValue placeholder="Apply a brand’s source & medium" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>No preset</SelectItem>
                    {presets.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        <PlatformMark platform={p.platform} /> {p.brand.name} · {PLATFORM_LABELS[p.platform]}
                        <span className="text-muted-foreground"> ({p.rule?.params.source} / {p.rule?.params.medium})</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-3.5">
                {FORM.map((f) => (
                  <div key={f.key}>
                    <FieldLabel htmlFor={`ub-${f.key}`} required={f.required} hint={<span className="font-mono">{UTM_LABELS[f.key].param}</span>}>
                      {f.label}
                    </FieldLabel>
                    <Input
                      id={`ub-${f.key}`}
                      value={params[f.key] ?? ""}
                      onChange={(e) => setParams((p) => ({ ...p, [f.key]: e.target.value }))}
                      placeholder={f.placeholder}
                      className="font-mono text-[12.5px]"
                      spellCheck={false}
                    />
                  </div>
                ))}
              </div>
              {issues.length > 0 && (
                <ul className="space-y-1">
                  {issues.map((i, n) => (
                    <li key={n} className="flex items-center gap-1.5 text-xs text-amber-800"><TriangleAlert className="size-3.5" /> {i.message}</li>
                  ))}
                </ul>
              )}
            </div>
          </Panel>

          <div className="space-y-3">
            <GeneratedUrl
              url={finalUrl}
              emptyText={
                !parsed.valid
                  ? "Enter a valid landing URL."
                  : `Fill in ${missingRequired.map((f) => f.label.replace("Campaign ", "").toLowerCase()).join(", ")} to generate the URL.`
              }
            />
            {built.removed.length > 0 && finalUrl && (
              <p className="text-xs text-muted-foreground">Removed existing: {built.removed.map((p) => p.raw).join(", ")}</p>
            )}
            {built.skipped.length > 0 && finalUrl && (
              <p className="text-xs text-amber-800">Kept existing value for {built.skipped.map((k) => `utm_${k}`).join(", ")}.</p>
            )}
            <Button variant="outline" className="w-full" asChild disabled={!parsed.valid}>
              <Link
                href={`/campaigns/new?url=${encodeURIComponent(url)}${matches[0] ? `&brand=${matches[0].brand.id}` : ""}`}
                className={parsed.valid ? "" : "pointer-events-none opacity-50"}
              >
                Create a campaign from this URL <ArrowRight />
              </Link>
            </Button>
          </div>
        </div>

        <Panel title="Parameter reference" bodyClassName="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="h-9 px-4 font-medium">Parameter</th>
                <th className="px-3 font-medium">Required</th>
                <th className="px-3 font-medium">Example</th>
                <th className="px-3 font-medium">Description</th>
              </tr>
            </thead>
            <tbody>
              {(["id", "source", "medium", "campaign", "term", "content"] as UtmKey[]).map((k) => (
                <tr key={k} className="border-b last:border-b-0">
                  <td className="px-4 py-2.5 font-mono text-[12.5px]">{UTM_LABELS[k].param}</td>
                  <td className="px-3 py-2.5">{UTM_LABELS[k].required ? "Yes" : <span className="text-muted-foreground">No</span>}</td>
                  <td className="px-3 py-2.5 font-mono text-[12px] text-muted-foreground">{UTM_LABELS[k].example}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{UTM_LABELS[k].description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      </PageBody>
    </>
  );
}
