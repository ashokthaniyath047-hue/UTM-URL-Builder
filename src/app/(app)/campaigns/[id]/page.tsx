"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo } from "react";
import { ChevronDown, CircleCheck, Copy, Pencil, RefreshCw, SearchX, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CampaignPackage } from "@/components/campaign/campaign-package";
import { CampaignRowActions } from "@/components/campaign/campaign-table";
import { ValidationPanel, ValidationSummary } from "@/components/campaign/validation-panel";
import { StatusBadge, StatusDot } from "@/components/shared/badges";
import { EmptyState, KeyValue, PageBody, PageHeader, PageSkeleton, Panel } from "@/components/shared/page";
import { FIELD_DEFS, STATUS_LABELS } from "@/lib/domain/fields";
import { CAMPAIGN_STATUSES, type Campaign, type CampaignOSData } from "@/lib/domain/types";
import { computeCampaign } from "@/lib/engine/campaign";
import { draftFromCampaign } from "@/lib/engine/draft";
import { duplicateCampaign, saveCampaign, setCampaignStatus, useData } from "@/lib/store/store";
import { formatDateTime, formatMoney, formatRelative } from "@/lib/utils/format";

const NEXT_STATUS = { draft: "review", review: "ready", ready: "launched", launched: null } as const;

function CampaignDetail({ data, campaign }: { data: CampaignOSData; campaign: Campaign }) {
  const router = useRouter();
  const sp = useSearchParams();
  const computed = useMemo(() => computeCampaign(campaign, data), [campaign, data]);
  const brand = computed.brand;
  const owner = data.users.find((u) => u.id === campaign.ownerId);
  const drifted = computed.name !== campaign.name || computed.generatedUrl !== campaign.generatedUrl;
  const next = NEXT_STATUS[campaign.status];

  const move = (s: (typeof CAMPAIGN_STATUSES)[number]) => {
    const res = setCampaignStatus(campaign.id, s);
    if (res.ok) toast.success(`Moved to ${STATUS_LABELS[s]}`);
    else toast.error(res.error);
  };

  const editHref = (step?: number, field?: string) =>
    `/campaigns/${campaign.id}/edit${step ? `?step=${step}${field ? `&field=${field}` : ""}` : ""}`;

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Campaigns", href: "/campaigns" }, { label: campaign.code }]}
        title={<span className="font-mono text-base">{computed.name || campaign.code}</span>}
        actions={
          <>
            <StatusBadge status={campaign.status} />
            <Button variant="outline" asChild>
              <Link href={editHref()}>
                <Pencil /> Edit
              </Link>
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                const res = duplicateCampaign(campaign.id);
                if (res.ok) {
                  toast.success(`Duplicated as ${res.value.code}`);
                  router.push(`/campaigns/${res.value.id}/edit`);
                }
              }}
            >
              <Copy /> Duplicate
            </Button>
            <div className="flex">
              {next && (
                <Button className="rounded-r-none" onClick={() => move(next)}>
                  Move to {STATUS_LABELS[next]}
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant={next ? "default" : "outline"} size={next ? "icon" : "default"} className={next ? "rounded-l-none border-l border-l-white/20" : ""} aria-label="Change status">
                    {!next && "Change status"}
                    <ChevronDown />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {CAMPAIGN_STATUSES.map((s) => (
                    <DropdownMenuItem key={s} disabled={s === campaign.status} onSelect={() => move(s)}>
                      <StatusDot status={s} /> {STATUS_LABELS[s]}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <CampaignRowActions campaign={campaign} onDeleted={() => router.push("/campaigns")} />
          </>
        }
      />
      <PageBody className="space-y-4">
        {sp.get("created") && (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-900">
            <span className="flex items-center gap-2">
              <CircleCheck className="size-4" /> Campaign {campaign.code} saved as {STATUS_LABELS[campaign.status]}. It’s now listed in Campaigns.
            </span>
            <Button size="sm" variant="outline" asChild>
              <Link href="/campaigns">View in Campaigns</Link>
            </Button>
          </div>
        )}
        {drifted && (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-900">
            <span className="flex items-center gap-2">
              <TriangleAlert className="size-4" /> {brand?.name}’s rules changed since this campaign was saved. The package below reflects current rules.
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const res = saveCampaign(draftFromCampaign(campaign), campaign.status);
                if (res.ok) toast.success("Saved with regenerated values");
                else toast.error(res.error);
              }}
            >
              <RefreshCw /> Save regenerated values
            </Button>
          </div>
        )}

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0 space-y-4">
            <CampaignPackage computed={computed} />
            <Panel title="All settings" bodyClassName="py-2">
              <dl className="grid gap-x-8 md:grid-cols-2">
                {computed.resolved.fields.map((k) => (
                  <KeyValue key={k} label={FIELD_DEFS[k].label}>
                    {k === "budget" ? formatMoney(campaign.fields.budget, brand?.currency ?? "INR") : campaign.fields[k]}
                  </KeyValue>
                ))}
                <KeyValue label="Existing UTMs">{campaign.existingParamPolicy === "replace" ? "Replaced" : "Kept"}</KeyValue>
                <KeyValue label="Name">{campaign.nameOverride === null ? "Generated" : "Manual override"}</KeyValue>
              </dl>
            </Panel>
          </div>

          <div className="space-y-4">
            <Panel title="Validation" actions={<ValidationSummary result={computed.validation} />} bodyClassName="p-2">
              <ValidationPanel
                result={computed.validation}
                onIssueClick={(i) => router.push(editHref(i.step, i.anchor))}
                className="border-0"
              />
            </Panel>
            <Panel title="Details" bodyClassName="py-1">
              <dl>
                <KeyValue label="Brand">{brand ? <Link className="hover:underline" href={`/brands/${brand.id}`}>{brand.name}</Link> : "—"}</KeyValue>
                <KeyValue label="Template">{computed.template?.name ?? "Custom"}</KeyValue>
                <KeyValue label="Owner">{owner?.name}</KeyValue>
                <KeyValue label="Created">{formatDateTime(campaign.createdAt)}</KeyValue>
                <KeyValue label="Updated">{formatRelative(campaign.updatedAt)}</KeyValue>
              </dl>
            </Panel>
            <Panel title="History" bodyClassName="py-2">
              <ol className="space-y-2.5">
                {[...campaign.history].reverse().map((h) => (
                  <li key={h.id} className="flex gap-2.5 text-sm">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-muted-foreground/50" />
                    <span className="min-w-0">
                      <span className="capitalize">{h.action.replace("_", " ")}</span>
                      {h.detail && <span className="text-muted-foreground"> · {h.detail}</span>}
                      <span className="block text-xs text-muted-foreground">
                        {data.users.find((u) => u.id === h.userId)?.name ?? "Someone"} · {formatRelative(h.at)}
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
            </Panel>
          </div>
        </div>
      </PageBody>
    </>
  );
}

function Inner() {
  const data = useData();
  const { id } = useParams<{ id: string }>();
  if (!data) return <PageSkeleton />;
  const campaign = data.campaigns.find((c) => c.id === id);
  if (!campaign)
    return (
      <EmptyState
        icon={SearchX}
        title="Campaign not found"
        description="It may have been deleted, or the link is wrong."
        action={<Button asChild variant="outline"><Link href="/campaigns">Back to campaigns</Link></Button>}
        className="py-24"
      />
    );
  return <CampaignDetail data={data} campaign={campaign} />;
}

export default function CampaignDetailPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Inner />
    </Suspense>
  );
}
