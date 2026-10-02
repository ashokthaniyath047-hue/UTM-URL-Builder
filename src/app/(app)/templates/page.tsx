"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Copy, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TemplateEditor } from "@/components/campaign/template-editor";
import { PlatformMark } from "@/components/shared/badges";
import { PageBody, PageHeader, PageSkeleton } from "@/components/shared/page";
import { FIELD_DEFS, PLATFORM_LABELS } from "@/lib/domain/fields";
import type { CampaignOSData, CampaignTemplate, Platform } from "@/lib/domain/types";
import { namingPattern } from "@/lib/engine/naming";
import { deleteTemplate, duplicateTemplate, upsertTemplate, useData } from "@/lib/store/store";

function TemplateCard({ t, data, onEdit }: { t: CampaignTemplate; data: CampaignOSData; onEdit: () => void }) {
  const brands = data.brands.filter((b) => b.platforms.includes(t.platform) && !b.archived);
  const enabledFor = brands.filter((b) => !b.disabledTemplateIds.includes(t.id));
  const override = t.namingRuleId ? data.namingRules.find((r) => r.id === t.namingRuleId) : undefined;
  const sample = enabledFor[0];
  const sampleNaming = sample && data.namingRules.find((r) => r.id === sample.namingRuleIds[t.platform]);
  const sampleUtm = sample && data.utmRules.find((r) => r.id === (t.utmRuleId ?? sample.utmRuleIds[t.platform]));

  return (
    <div className="flex flex-col rounded-lg border bg-card">
      <div className="flex-1 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-medium">{t.name}</h3>
          {!t.builtIn && <span className="rounded border px-1.5 text-[10px] text-muted-foreground">Custom</span>}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{t.description}</p>

        <dl className="mt-3 space-y-2 text-xs">
          <div>
            <dt className="mb-1 text-muted-foreground">Required fields</dt>
            <dd className="flex flex-wrap gap-1">
              {t.requiredFields.map((f) => (
                <span key={f} className="rounded border bg-surface px-1.5 py-0.5">{FIELD_DEFS[f].label}</span>
              ))}
            </dd>
          </div>
          <div>
            <dt className="mb-0.5 text-muted-foreground">Naming rule</dt>
            <dd className="font-mono text-[11px] break-all">
              {override ? namingPattern(override) : <>Brand default{sampleNaming && <span className="text-muted-foreground"> · e.g. {sample.name}: {namingPattern(sampleNaming)}</span>}</>}
            </dd>
          </div>
          <div>
            <dt className="mb-0.5 text-muted-foreground">UTM rule</dt>
            <dd className="font-mono text-[11px]">
              {t.utmRuleId ? "Template override" : "Brand default"}
              {sampleUtm && <span className="text-muted-foreground"> · e.g. {sample.name}: {sampleUtm.params.source} / {sampleUtm.params.medium}</span>}
            </dd>
          </div>
          <div>
            <dt className="mb-0.5 text-muted-foreground">Enabled for</dt>
            <dd>{enabledFor.length === brands.length ? `All ${brands.length} ${PLATFORM_LABELS[t.platform]} brands` : enabledFor.map((b) => b.name).join(", ") || "No brands"}</dd>
          </div>
        </dl>
      </div>
      <div className="flex items-center gap-1.5 border-t px-3 py-2">
        <Button size="sm" asChild>
          <Link href={`/campaigns/new?platform=${t.platform}&template=${t.id}`}>Use</Link>
        </Button>
        <Button size="sm" variant="outline" onClick={onEdit}><Pencil /> Edit</Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            const copy = duplicateTemplate(t.id);
            if (copy) toast.success(`Created “${copy.name}”`);
          }}
        >
          <Copy /> Duplicate
        </Button>
        {!t.builtIn && (
          <Button size="icon-sm" variant="ghost" className="ml-auto" aria-label={`Delete ${t.name}`} onClick={() => { deleteTemplate(t.id); toast.success("Template deleted"); }}>
            <Trash2 />
          </Button>
        )}
      </div>
    </div>
  );
}

function TemplatesView({ data }: { data: CampaignOSData }) {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const platform = (sp.get("platform") === "google" ? "google" : "meta") as Platform;
  const [editing, setEditing] = useState<CampaignTemplate | null>(null);
  const templates = data.templates.filter((t) => t.platform === platform);

  return (
    <>
      <PageHeader
        title="Templates"
        description="Reusable campaign setups. Naming and UTM rules resolve from each brand unless a template overrides them."
        actions={
          <>
            <Button
              variant="outline"
              onClick={() =>
                setEditing({
                  id: `t_${Date.now().toString(36)}`,
                  platform,
                  name: "",
                  description: "",
                  fields: platform === "meta" ? ["objective", "market", "country", "product", "audience", "budget", "adSetName", "creativeName"] : ["objective", "market", "country", "product", "campaignType", "bidding", "adGroupName", "adName"],
                  requiredFields: ["objective", "market"],
                  defaults: {},
                  builtIn: false,
                  updatedAt: new Date().toISOString(),
                })
              }
            >
              <Plus /> New template
            </Button>
            <Button asChild className="bg-brand text-brand-foreground hover:bg-brand/90">
              <Link href="/campaigns/new"><Plus /> Create Campaign</Link>
            </Button>
          </>
        }
      >
        <Tabs value={platform} onValueChange={(v) => router.replace(`${pathname}?platform=${v}`, { scroll: false })} className="mt-4">
          <TabsList variant="line" className="-mb-4 h-9">
            <TabsTrigger value="meta"><PlatformMark platform="meta" /> Meta <span className="text-xs text-muted-foreground">{data.templates.filter((t) => t.platform === "meta").length}</span></TabsTrigger>
            <TabsTrigger value="google"><PlatformMark platform="google" /> Google <span className="text-xs text-muted-foreground">{data.templates.filter((t) => t.platform === "google").length}</span></TabsTrigger>
          </TabsList>
        </Tabs>
      </PageHeader>
      <PageBody>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {templates.map((t) => (
            <TemplateCard key={t.id} t={t} data={data} onEdit={() => setEditing(t)} />
          ))}
        </div>
      </PageBody>
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing && data.templates.some((t) => t.id === editing.id) ? `Edit ${editing.name}` : `New ${PLATFORM_LABELS[platform]} template`}</DialogTitle>
            <DialogDescription>Choose which fields appear in the wizard, which are required and their defaults.</DialogDescription>
          </DialogHeader>
          {editing && (
            <TemplateEditor
              template={editing}
              onCancel={() => setEditing(null)}
              onSave={(t) => {
                upsertTemplate(t);
                setEditing(null);
                toast.success("Template saved");
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function Inner() {
  const data = useData();
  if (!data) return <PageSkeleton />;
  return <TemplatesView data={data} />;
}

export default function TemplatesPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Inner />
    </Suspense>
  );
}
