"use client";

import { useMemo, useState } from "react";
import { Braces } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FieldLabel } from "@/components/campaign/field-control";
import { GeneratedUrl } from "@/components/campaign/generated-url";
import type { Brand, ExistingParamPolicy, UTMRule, UtmKey } from "@/lib/domain/types";
import { UTM_KEYS } from "@/lib/domain/types";
import { generateName, sampleNamingContext } from "@/lib/engine/naming";
import { buildCampaignUrl, parseLandingUrl } from "@/lib/engine/url";
import { generateTracking, UTM_LABELS, UTM_PLACEHOLDERS } from "@/lib/engine/utm";
import { updateUtmRule } from "@/lib/store/store";
import { getData } from "@/lib/store/store";

const DYNAMIC: Record<"meta" | "google", { token: string; label: string }[]> = {
  meta: [
    { token: "{{campaign.name}}", label: "Meta campaign name" },
    { token: "{{adset.name}}", label: "Meta ad set name" },
    { token: "{{ad.name}}", label: "Meta ad name" },
    { token: "{{site_source_name}}", label: "Meta site source" },
  ],
  google: [
    { token: "{keyword}", label: "ValueTrack keyword" },
    { token: "{matchtype}", label: "ValueTrack match type" },
    { token: "{campaignid}", label: "ValueTrack campaign ID" },
    { token: "{creative}", label: "ValueTrack creative ID" },
    { token: "{network}", label: "ValueTrack network" },
  ],
};

export function UtmRuleEditor({ rule, brand }: { rule: UTMRule; brand: Brand }) {
  const [draft, setDraft] = useState<UTMRule>(rule);
  const dirty = JSON.stringify(draft) !== JSON.stringify(rule);

  const setParam = (k: UtmKey, v: string) => setDraft((d) => ({ ...d, params: { ...d.params, [k]: v } }));
  const toggleRequired = (k: UtmKey, on: boolean) =>
    setDraft((d) => ({ ...d, required: on ? [...new Set([...d.required, k])] : d.required.filter((x) => x !== k) }));

  const preview = useMemo(() => {
    const ctx = sampleNamingContext(brand, draft.platform);
    const namingRule = getData().namingRules.find((r) => r.id === brand.namingRuleIds[draft.platform]);
    const name = namingRule ? generateName(namingRule, ctx).name : "SAMPLE_CAMPAIGN";
    const fields = { ...ctx.fields, creativeName: "kuro_video_15s", adName: "rsa_v1", adSetName: "IN_BROAD", adGroupName: "kuro_exact" };
    const t = generateTracking(draft, { brand, platform: draft.platform, fields, campaignName: name, campaignCode: ctx.campaignCode });
    const url = buildCampaignUrl(parseLandingUrl(brand.website), t.params, "replace").url;
    return { params: t.params, url };
  }, [draft, brand]);

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-surface text-left text-xs text-muted-foreground">
              <th className="w-[140px] px-3 py-2 font-medium">Parameter</th>
              <th className="px-3 py-2 font-medium">Template</th>
              <th className="w-[90px] px-3 py-2 text-center font-medium">Required</th>
              <th className="w-[220px] px-3 py-2 font-medium">Example</th>
            </tr>
          </thead>
          <tbody>
            {UTM_KEYS.map((k) => {
              const alwaysRequired = UTM_LABELS[k].required;
              return (
                <tr key={k} className="border-b last:border-b-0">
                  <td className="px-3 py-1.5">
                    <span className="text-xs font-semibold tracking-wide">{UTM_LABELS[k].label.toUpperCase()}</span>
                    <span className="block font-mono text-[11px] text-muted-foreground">{UTM_LABELS[k].param}</span>
                  </td>
                  <td className="px-3 py-1.5">
                    <div className="flex gap-1">
                      <Input
                        value={draft.params[k]}
                        onChange={(e) => setParam(k, e.target.value)}
                        placeholder="not used"
                        className="h-7 font-mono text-[12.5px]"
                        aria-label={`${UTM_LABELS[k].param} template`}
                        spellCheck={false}
                      />
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon-sm" variant="outline" aria-label={`Insert variable into ${UTM_LABELS[k].param}`}>
                            <Braces />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="max-h-80 w-64 overflow-y-auto">
                          <DropdownMenuLabel className="text-xs">Campaign variables</DropdownMenuLabel>
                          {UTM_PLACEHOLDERS.map((p) => (
                            <DropdownMenuItem key={p.token} onSelect={() => setParam(k, draft.params[k] + `{${p.token}}`)}>
                              <span className="font-mono text-xs">{`{${p.token}}`}</span>
                              <span className="ml-auto text-xs text-muted-foreground">{p.label}</span>
                            </DropdownMenuItem>
                          ))}
                          <DropdownMenuSeparator />
                          <DropdownMenuLabel className="text-xs">Platform dynamic</DropdownMenuLabel>
                          {DYNAMIC[draft.platform].map((p) => (
                            <DropdownMenuItem key={p.token} onSelect={() => setParam(k, draft.params[k] + p.token)}>
                              <span className="font-mono text-xs">{p.token}</span>
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </td>
                  <td className="px-3 py-1.5 text-center">
                    <Checkbox
                      checked={alwaysRequired || draft.required.includes(k)}
                      disabled={alwaysRequired}
                      onCheckedChange={(v) => toggleRequired(k, v === true)}
                      aria-label={`${UTM_LABELS[k].param} required`}
                    />
                  </td>
                  <td className="truncate px-3 py-1.5 font-mono text-[11.5px] text-muted-foreground" title={preview.params[k]}>
                    {preview.params[k] ?? "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="grid max-w-2xl grid-cols-3 gap-3">
        <div>
          <FieldLabel>Value case</FieldLabel>
          <Select value={draft.casing} onValueChange={(v) => setDraft((d) => ({ ...d, casing: v as UTMRule["casing"] }))}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="lower">lowercase (recommended)</SelectItem>
              <SelectItem value="preserve">Preserve</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <FieldLabel>Spaces become</FieldLabel>
          <Select value={draft.spaceReplacement} onValueChange={(v) => setDraft((d) => ({ ...d, spaceReplacement: v as UTMRule["spaceReplacement"] }))}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_">Underscore _</SelectItem>
              <SelectItem value="-">Hyphen -</SelectItem>
              <SelectItem value="keep">Keep (encoded %20)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <FieldLabel>Existing UTMs in URL</FieldLabel>
          <Select value={draft.defaultExistingPolicy} onValueChange={(v) => setDraft((d) => ({ ...d, defaultExistingPolicy: v as ExistingParamPolicy }))}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="replace">Replace by default</SelectItem>
              <SelectItem value="keep">Keep by default</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <GeneratedUrl url={preview.url} label="Example URL" />

      <div className="flex items-center gap-2">
        <Button
          disabled={!dirty}
          onClick={() => {
            updateUtmRule(draft);
            toast.success("UTM rule saved");
          }}
        >
          Save UTM rule
        </Button>
        <Button variant="ghost" disabled={!dirty} onClick={() => setDraft(rule)}>
          Discard
        </Button>
        {dirty && <span className="text-xs text-muted-foreground">Unsaved changes</span>}
      </div>
    </div>
  );
}
