"use client";

import Link from "next/link";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { Archive, ArchiveRestore, ExternalLink, Globe, Plus, SearchX, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BrandForm, domainsToList } from "@/components/brand/brand-form";
import { NamingRuleEditor } from "@/components/brand/naming-rule-editor";
import { UtmRuleEditor } from "@/components/brand/utm-rule-editor";
import { CampaignTable } from "@/components/campaign/campaign-table";
import { FieldLabel } from "@/components/campaign/field-control";
import { UrlInspector } from "@/components/campaign/url-inspector";
import { BrandAvatar, PlatformBadge, PlatformMark } from "@/components/shared/badges";
import { EmptyState, KeyValue, PageBody, PageHeader, PageSkeleton, Panel } from "@/components/shared/page";
import { FIELD_DEFS, PLATFORM_LABELS } from "@/lib/domain/fields";
import type { Brand, CampaignOSData } from "@/lib/domain/types";
import { namingPattern } from "@/lib/engine/naming";
import { hostOf, parseLandingUrl } from "@/lib/engine/url";
import { addLandingPage, removeLandingPage, updateBrand, useData } from "@/lib/store/store";
import { formatRelative } from "@/lib/utils/format";

const TABS = ["overview", "naming", "utm", "templates", "landing", "history"] as const;
type Tab = (typeof TABS)[number];

function LandingPages({ data, brand }: { data: CampaignOSData; brand: Brand }) {
  const [url, setUrl] = useState("");
  const [label, setLabel] = useState("");
  const parsed = useMemo(() => parseLandingUrl(url), [url]);
  const pages = data.landingPages.filter((l) => l.brandId === brand.id);

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
      <Panel title="Saved landing pages" description="Available as quick picks in the campaign wizard." bodyClassName="p-0">
        {pages.length === 0 ? (
          <EmptyState icon={Globe} title="No landing pages yet" description="Save frequently used product and collection URLs." />
        ) : (
          <ul className="divide-y">
            {pages.map((p) => (
              <li key={p.id} className="flex items-center gap-3 px-4 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{p.label} <span className="ml-1 text-xs font-normal text-muted-foreground capitalize">{p.pageType}</span></p>
                  <p className="truncate font-mono text-[11.5px] text-muted-foreground" title={p.url}>{p.url}</p>
                </div>
                <Button size="sm" variant="outline" asChild>
                  <Link href={`/campaigns/new?brand=${brand.id}&url=${encodeURIComponent(p.url)}`}>Use</Link>
                </Button>
                <Button size="icon-sm" variant="ghost" asChild aria-label="Open landing page">
                  <a href={p.url} target="_blank" rel="noopener noreferrer"><ExternalLink /></a>
                </Button>
                <Button size="icon-sm" variant="ghost" aria-label={`Remove ${p.label}`} onClick={() => { removeLandingPage(p.id); toast.success("Landing page removed"); }}>
                  <Trash2 />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Panel>
      <Panel title="Add landing page">
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!parsed.valid) return;
            addLandingPage({
              brandId: brand.id,
              url: url.trim(),
              label: label.trim() || parsed.page.name || parsed.host,
              productName: parsed.page.type === "product" ? parsed.page.name : undefined,
              pageType: parsed.page.type,
            });
            setUrl("");
            setLabel("");
            toast.success("Landing page saved");
          }}
        >
          <div>
            <FieldLabel htmlFor="lp-url" required>URL</FieldLabel>
            <Input id="lp-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" className="font-mono text-[12.5px]" />
          </div>
          {url && <UrlInspector parsed={parsed} compact />}
          <div>
            <FieldLabel htmlFor="lp-label" hint="Defaults to detected name">Label</FieldLabel>
            <Input id="lp-label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder={parsed.page.name ?? "e.g. Diwali collection"} />
          </div>
          <Button type="submit" disabled={!parsed.valid}><Plus /> Save landing page</Button>
        </form>
      </Panel>
    </div>
  );
}

function BrandDetail({ data, brand }: { data: CampaignOSData; brand: Brand }) {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const tab = (TABS.includes(sp.get("tab") as Tab) ? sp.get("tab") : "overview") as Tab;
  const setTab = (t: string) => router.replace(`${pathname}?tab=${t}`, { scroll: false });
  const campaigns = data.campaigns.filter((c) => c.brandId === brand.id).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const activity = data.brandActivity.filter((a) => a.brandId === brand.id);

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Brands", href: "/brands" }, { label: brand.name }]}
        title={
          <span className="flex items-center gap-2.5">
            <BrandAvatar name={brand.name} className="size-7" />
            {brand.name}
            <span className="font-mono text-xs font-normal text-muted-foreground">{brand.code}</span>
            {brand.archived && <span className="rounded border px-1.5 text-xs font-normal text-muted-foreground">Archived</span>}
          </span>
        }
        actions={
          <Button asChild className="bg-brand text-brand-foreground hover:bg-brand/90" disabled={brand.archived}>
            <Link href={`/campaigns/new?brand=${brand.id}`}><Plus /> Create Campaign</Link>
          </Button>
        }
      >
        <Tabs value={tab} onValueChange={setTab} className="mt-4">
          <TabsList variant="line" className="-mb-4 h-9">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="naming">Naming Rules</TabsTrigger>
            <TabsTrigger value="utm">UTM Rules</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="landing">Landing Pages</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>
        </Tabs>
      </PageHeader>

      <PageBody>
        {tab === "overview" && (
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
            <Panel title="Brand settings">
              <BrandForm
                key={brand.updatedAt}
                initial={{ ...brand, domains: brand.domains.join(", ") }}
                existing={data.brands}
                selfId={brand.id}
                submitLabel="Save changes"
                onSubmit={(v) => {
                  updateBrand(brand.id, { ...v, domains: domainsToList(v.domains) });
                  toast.success("Brand updated");
                }}
              />
            </Panel>
            <div className="space-y-4">
              <Panel title="Configuration" bodyClassName="py-1">
                <dl>
                  {brand.platforms.map((p) => {
                    const nr = data.namingRules.find((r) => r.id === brand.namingRuleIds[p]);
                    const ur = data.utmRules.find((r) => r.id === brand.utmRuleIds[p]);
                    return (
                      <div key={p} className="border-b py-2 last:border-b-0">
                        <PlatformBadge platform={p} className="mb-1 text-xs font-medium" />
                        <KeyValue label="Naming" mono>{nr ? namingPattern(nr) : "—"}</KeyValue>
                        <KeyValue label="UTM source / medium" mono>{ur ? `${ur.params.source} / ${ur.params.medium}` : "—"}</KeyValue>
                      </div>
                    );
                  })}
                </dl>
              </Panel>
              <Panel title="Usage" bodyClassName="py-1">
                <KeyValue label="Campaigns">{campaigns.length}</KeyValue>
                <KeyValue label="Landing pages">{data.landingPages.filter((l) => l.brandId === brand.id).length}</KeyValue>
                <KeyValue label="Website"><a className="hover:underline" href={brand.website} target="_blank" rel="noopener noreferrer">{hostOf(brand.website)}</a></KeyValue>
              </Panel>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  updateBrand(brand.id, { archived: !brand.archived }, brand.archived ? "Brand restored" : "Brand archived");
                  toast.success(brand.archived ? "Brand restored" : "Brand archived. It no longer appears in the wizard.");
                }}
              >
                {brand.archived ? <><ArchiveRestore /> Restore brand</> : <><Archive /> Archive brand</>}
              </Button>
            </div>
          </div>
        )}

        {tab === "naming" && (
          <div className="space-y-4">
            {brand.platforms.map((p) => {
              const rule = data.namingRules.find((r) => r.id === brand.namingRuleIds[p]);
              return (
                <Panel key={p} title={<span className="flex items-center gap-2"><PlatformMark platform={p} /> {PLATFORM_LABELS[p]} naming rule</span>} description={rule ? `Updated ${formatRelative(rule.updatedAt)}` : undefined}>
                  {rule ? <NamingRuleEditor key={rule.updatedAt} rule={rule} brand={brand} /> : <p className="text-sm text-muted-foreground">No rule configured.</p>}
                </Panel>
              );
            })}
          </div>
        )}

        {tab === "utm" && (
          <div className="space-y-4">
            {brand.platforms.map((p) => {
              const rule = data.utmRules.find((r) => r.id === brand.utmRuleIds[p]);
              return (
                <Panel key={p} title={<span className="flex items-center gap-2"><PlatformMark platform={p} /> {PLATFORM_LABELS[p]} UTM rule</span>} description={rule ? `Updated ${formatRelative(rule.updatedAt)}` : undefined}>
                  {rule ? <UtmRuleEditor key={rule.updatedAt} rule={rule} brand={brand} /> : <p className="text-sm text-muted-foreground">No rule configured.</p>}
                </Panel>
              );
            })}
          </div>
        )}

        {tab === "templates" && (
          <div className="space-y-4">
            {brand.platforms.map((p) => (
              <Panel key={p} title={<span className="flex items-center gap-2"><PlatformMark platform={p} /> {PLATFORM_LABELS[p]} templates</span>} description="Disabled templates are hidden in the wizard for this brand." bodyClassName="p-0">
                <ul className="divide-y">
                  {data.templates.filter((t) => t.platform === p).map((t) => {
                    const enabled = !brand.disabledTemplateIds.includes(t.id);
                    return (
                      <li key={t.id} className="flex items-center gap-3 px-4 py-2.5">
                        <Switch
                          checked={enabled}
                          aria-label={`${enabled ? "Disable" : "Enable"} ${t.name}`}
                          onCheckedChange={(on) =>
                            updateBrand(
                              brand.id,
                              { disabledTemplateIds: on ? brand.disabledTemplateIds.filter((x) => x !== t.id) : [...brand.disabledTemplateIds, t.id] },
                              `${t.name} template ${on ? "enabled" : "disabled"}`,
                            )
                          }
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">{t.name}</p>
                          <p className="truncate text-xs text-muted-foreground">Requires {t.requiredFields.map((f) => FIELD_DEFS[f].label).join(", ")}</p>
                        </div>
                        <Button size="sm" variant="outline" asChild disabled={!enabled}>
                          <Link href={`/campaigns/new?brand=${brand.id}&template=${t.id}`} aria-disabled={!enabled} className={enabled ? "" : "pointer-events-none opacity-50"}>Use</Link>
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              </Panel>
            ))}
          </div>
        )}

        {tab === "landing" && <LandingPages data={data} brand={brand} />}

        {tab === "history" && (
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
            <Panel title="Campaigns" bodyClassName="p-0">
              {campaigns.length ? (
                <CampaignTable campaigns={campaigns} data={data} columns={["campaign", "platform", "type", "owner", "status", "updated"]} />
              ) : (
                <EmptyState title="No campaigns for this brand yet" />
              )}
            </Panel>
            <Panel title="Configuration changes" bodyClassName="py-2">
              {activity.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">No changes recorded.</p>
              ) : (
                <ol className="space-y-2.5">
                  {activity.map((a) => (
                    <li key={a.id} className="flex gap-2.5 text-sm">
                      <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-muted-foreground/50" />
                      <span>
                        {a.detail}
                        <span className="block text-xs text-muted-foreground">
                          {data.users.find((u) => u.id === a.userId)?.name} · {formatRelative(a.at)}
                        </span>
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </Panel>
          </div>
        )}
      </PageBody>
    </>
  );
}

function Inner() {
  const data = useData();
  const { id } = useParams<{ id: string }>();
  if (!data) return <PageSkeleton />;
  const brand = data.brands.find((b) => b.id === id);
  if (!brand)
    return (
      <EmptyState
        icon={SearchX}
        title="Brand not found"
        action={<Button asChild variant="outline"><Link href="/brands">Back to brands</Link></Button>}
        className="py-24"
      />
    );
  return <BrandDetail data={data} brand={brand} />;
}

export default function BrandPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Inner />
    </Suspense>
  );
}
