"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo } from "react";
import { Download, Megaphone, Plus, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CampaignTable, campaignTypeLabel } from "@/components/campaign/campaign-table";
import { EmptyState, PageHeader, PageSkeleton } from "@/components/shared/page";
import { PLATFORM_LABELS, STATUS_LABELS } from "@/lib/domain/fields";
import { CAMPAIGN_STATUSES, PLATFORMS, type CampaignOSData } from "@/lib/domain/types";
import { campaignsToTable } from "@/lib/io/campaign-io";
import { csvFormat, downloadBlob } from "@/lib/io/formats";
import { useData } from "@/lib/store/store";

const ALL = "__all";

function FilterSelect({ value, onChange, placeholder, options }: { value: string; onChange: (v: string) => void; placeholder: string; options: { value: string; label: string }[] }) {
  return (
    <Select value={value || ALL} onValueChange={(v) => onChange(v === ALL ? "" : v)}>
      <SelectTrigger size="sm" className="min-w-[130px]" aria-label={placeholder}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>All {placeholder.toLowerCase()}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function CampaignsView({ data }: { data: CampaignOSData }) {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const q = sp.get("q") ?? "";
  const brand = sp.get("brand") ?? "";
  const platform = sp.get("platform") ?? "";
  const type = sp.get("type") ?? "";
  const status = sp.get("status") ?? "";

  const setParam = (k: string, v: string) => {
    const next = new URLSearchParams(sp.toString());
    if (v) next.set(k, v);
    else next.delete(k);
    router.replace(`${pathname}${next.toString() ? `?${next}` : ""}`, { scroll: false });
  };

  const types = useMemo(() => [...new Set(data.campaigns.map((c) => campaignTypeLabel(c, data)))].sort(), [data]);

  const filtered = useMemo(() => {
    const needle = q.toLowerCase().trim();
    return data.campaigns
      .filter((c) => (!brand || c.brandId === brand) && (!platform || c.platform === platform) && (!status || c.status === status))
      .filter((c) => !type || campaignTypeLabel(c, data) === type)
      .filter((c) => {
        if (!needle) return true;
        const b = data.brands.find((x) => x.id === c.brandId)?.name ?? "";
        return [c.name, c.code, b, c.fields.product ?? "", c.landingUrl].some((s) => s.toLowerCase().includes(needle));
      })
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [data, q, brand, platform, type, status]);

  const hasFilters = !!(q || brand || platform || type || status);
  const title = status ? `${STATUS_LABELS[status as keyof typeof STATUS_LABELS]} campaigns` : "All campaigns";

  return (
    <>
      <PageHeader
        title={title}
        description={`${filtered.length} of ${data.campaigns.length} campaigns`}
        actions={
          <>
            <Button
              variant="outline"
              disabled={!filtered.length}
              onClick={() => downloadBlob(csvFormat.serialize(campaignsToTable(filtered, data)), `campaigns-${new Date().toISOString().slice(0, 10)}.csv`)}
            >
              <Download /> Export
            </Button>
            <Button asChild className="bg-brand text-brand-foreground hover:bg-brand/90">
              <Link href="/campaigns/new">
                <Plus /> Create Campaign
              </Link>
            </Button>
          </>
        }
      >
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <div className="relative w-72">
            <Search className="absolute top-1.5 left-2.5 size-4 text-muted-foreground" />
            <Input
              key={q === "" ? "empty" : "q"}
              defaultValue={q}
              onChange={(e) => setParam("q", e.target.value)}
              placeholder="Search name, ID, product, URL…"
              className="h-7 pl-8"
              aria-label="Search campaigns"
            />
          </div>
          <FilterSelect value={brand} onChange={(v) => setParam("brand", v)} placeholder="Brands" options={data.brands.map((b) => ({ value: b.id, label: b.name }))} />
          <FilterSelect value={platform} onChange={(v) => setParam("platform", v)} placeholder="Platforms" options={PLATFORMS.map((p) => ({ value: p, label: PLATFORM_LABELS[p] }))} />
          <FilterSelect value={type} onChange={(v) => setParam("type", v)} placeholder="Types" options={types.map((t) => ({ value: t, label: t }))} />
          <FilterSelect value={status} onChange={(v) => setParam("status", v)} placeholder="Statuses" options={CAMPAIGN_STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] }))} />
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={() => router.replace(pathname)}>
              <X /> Clear
            </Button>
          )}
        </div>
      </PageHeader>
      <div className="mx-auto max-w-[1400px]">
        {filtered.length ? (
          <CampaignTable campaigns={filtered} data={data} />
        ) : data.campaigns.length === 0 ? (
          <EmptyState
            icon={Megaphone}
            title="No campaigns yet"
            description="Campaigns you create or import will appear here."
            action={<Button asChild><Link href="/campaigns/new"><Plus /> Create Campaign</Link></Button>}
            className="py-20"
          />
        ) : (
          <EmptyState
            icon={Search}
            title="No campaigns match these filters"
            action={<Button variant="outline" onClick={() => router.replace(pathname)}>Clear filters</Button>}
            className="py-20"
          />
        )}
      </div>
    </>
  );
}

function CampaignsPageInner() {
  const data = useData();
  if (!data) return <PageSkeleton />;
  return <CampaignsView data={data} />;
}

export default function CampaignsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <CampaignsPageInner />
    </Suspense>
  );
}
