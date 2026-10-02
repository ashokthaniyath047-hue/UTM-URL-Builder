"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Building2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BrandForm, domainsToList } from "@/components/brand/brand-form";
import { BrandAvatar, PlatformMark } from "@/components/shared/badges";
import { EmptyState, PageHeader, PageSkeleton } from "@/components/shared/page";
import { namingPattern } from "@/lib/engine/naming";
import { hostOf } from "@/lib/engine/url";
import { createBrand, updateBrand, useData } from "@/lib/store/store";
import { formatRelative } from "@/lib/utils/format";

export default function BrandsPage() {
  const data = useData();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  if (!data) return <PageSkeleton />;

  return (
    <>
      <PageHeader
        title="Brands"
        description="Each brand owns its naming rules, UTM rules, templates and landing pages."
        actions={
          <>
            <Button variant="outline" onClick={() => setOpen(true)}>
              <Plus /> Add brand
            </Button>
            <Button asChild className="bg-brand text-brand-foreground hover:bg-brand/90">
              <Link href="/campaigns/new"><Plus /> Create Campaign</Link>
            </Button>
          </>
        }
      />
      <div className="mx-auto max-w-[1400px]">
        {data.brands.length === 0 ? (
          <EmptyState icon={Building2} title="No brands" description="Add a brand to start creating campaigns." className="py-20" action={<Button onClick={() => setOpen(true)}><Plus /> Add brand</Button>} />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="h-9 px-3 pl-6 font-medium">Brand</th>
                <th className="px-3 font-medium">Website</th>
                <th className="px-3 font-medium">Market</th>
                <th className="px-3 font-medium">Platforms</th>
                <th className="px-3 font-medium">Meta naming</th>
                <th className="px-3 text-right font-medium">Campaigns</th>
                <th className="px-3 pr-6 font-medium">Updated</th>
              </tr>
            </thead>
            <tbody>
              {data.brands.map((b) => {
                const metaRule = data.namingRules.find((r) => r.id === (b.namingRuleIds.meta ?? b.namingRuleIds.google));
                const n = data.campaigns.filter((c) => c.brandId === b.id).length;
                return (
                  <tr key={b.id} onClick={() => router.push(`/brands/${b.id}`)} className="h-12 cursor-pointer border-b hover:bg-surface">
                    <td className="px-3 pl-6">
                      <Link href={`/brands/${b.id}`} className="flex items-center gap-2.5 font-medium hover:underline" onClick={(e) => e.stopPropagation()}>
                        <BrandAvatar name={b.name} />
                        {b.name}
                        <span className="font-mono text-[11px] font-normal text-muted-foreground">{b.code}</span>
                        {b.archived && <span className="rounded border px-1 text-[10px] text-muted-foreground">Archived</span>}
                      </Link>
                    </td>
                    <td className="px-3 text-muted-foreground">{hostOf(b.website)}</td>
                    <td className="px-3 text-muted-foreground">{b.defaultMarket} · {b.currency}</td>
                    <td className="px-3"><span className="flex gap-1">{b.platforms.map((p) => <PlatformMark key={p} platform={p} />)}</span></td>
                    <td className="max-w-[320px] truncate px-3 font-mono text-[11px] text-muted-foreground">{metaRule ? namingPattern(metaRule) : "—"}</td>
                    <td className="tabular px-3 text-right">{n}</td>
                    <td className="px-3 pr-6 text-muted-foreground">{formatRelative(b.updatedAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Add brand</DialogTitle>
            <DialogDescription>Default naming and UTM rules are created for each enabled platform.</DialogDescription>
          </DialogHeader>
          <BrandForm
            initial={{ name: "", code: "", website: "https://", domains: "", country: "India", currency: "INR", defaultMarket: "IN", platforms: ["meta", "google"] }}
            existing={data.brands}
            submitLabel="Create brand"
            onCancel={() => setOpen(false)}
            onSubmit={(v) => {
              const b = createBrand({ ...v });
              if (v.domains) updateBrand(b.id, { domains: domainsToList(v.domains) }, "Domains set");
              setOpen(false);
              toast.success(`${b.name} created`);
              router.push(`/brands/${b.id}?tab=naming`);
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
