"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Copy, ExternalLink, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PlatformBadge, StatusBadge, StatusDot } from "@/components/shared/badges";
import { CAMPAIGN_STATUSES, type Campaign, type CampaignOSData, type CampaignStatus } from "@/lib/domain/types";
import { STATUS_LABELS } from "@/lib/domain/fields";
import { getTemplate } from "@/lib/engine/templates";
import { deleteCampaign, duplicateCampaign, setCampaignStatus } from "@/lib/store/store";
import { formatRelative } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

export type CampaignColumn = "campaign" | "brand" | "platform" | "objective" | "type" | "owner" | "status" | "updated";

export const ALL_COLUMNS: CampaignColumn[] = ["campaign", "brand", "platform", "objective", "type", "owner", "status", "updated"];

const HEAD: Record<CampaignColumn, string> = {
  campaign: "Campaign",
  brand: "Brand",
  platform: "Platform",
  objective: "Objective",
  type: "Type",
  owner: "Owner",
  status: "Status",
  updated: "Updated",
};

export function campaignTypeLabel(c: Campaign, data: CampaignOSData) {
  if (c.platform === "google" && c.fields.campaignType) return c.fields.campaignType;
  return getTemplate(data, c.templateId, c.platform)?.name ?? "Custom";
}

export function CampaignRowActions({ campaign, onDeleted }: { campaign: Campaign; onDeleted?: () => void }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);

  const changeStatus = (s: CampaignStatus) => {
    const res = setCampaignStatus(campaign.id, s);
    if (res.ok) toast.success(`Moved to ${STATUS_LABELS[s]}`);
    else
      toast.error(res.error, {
        action: { label: "Open", onClick: () => router.push(`/campaigns/${campaign.id}`) },
      });
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${campaign.name}`} onClick={(e) => e.stopPropagation()}>
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48" onClick={(e) => e.stopPropagation()}>
          <DropdownMenuItem onSelect={() => router.push(`/campaigns/${campaign.id}`)}>
            <ExternalLink /> Open
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => router.push(`/campaigns/${campaign.id}/edit`)}>
            <Pencil /> Edit
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => {
              const res = duplicateCampaign(campaign.id);
              if (res.ok) {
                toast.success(`Duplicated as ${res.value.code}`, {
                  action: { label: "Open", onClick: () => router.push(`/campaigns/${res.value.id}/edit`) },
                });
              }
            }}
          >
            <Copy /> Duplicate
          </DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <StatusDot status={campaign.status} />
              Change status
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuLabel className="text-xs">Move to</DropdownMenuLabel>
              {CAMPAIGN_STATUSES.map((s) => (
                <DropdownMenuItem key={s} disabled={s === campaign.status} onSelect={() => changeStatus(s)}>
                  <StatusDot status={s} /> {STATUS_LABELS[s]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => setConfirm(true)}>
            <Trash2 /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete campaign?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-mono">{campaign.name || campaign.code}</span> will be permanently removed. This can’t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                deleteCampaign(campaign.id);
                toast.success("Campaign deleted");
                onDeleted?.();
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function CampaignTable({
  campaigns,
  data,
  columns = ALL_COLUMNS,
  actions = true,
}: {
  campaigns: Campaign[];
  data: CampaignOSData;
  columns?: CampaignColumn[];
  actions?: boolean;
}) {
  const router = useRouter();
  const brand = (id: string) => data.brands.find((b) => b.id === id);
  const owner = (id: string) => data.users.find((u) => u.id === id);

  const cell = (c: Campaign, col: CampaignColumn) => {
    switch (col) {
      case "campaign":
        return (
          <div className="min-w-0">
            <Link
              href={`/campaigns/${c.id}`}
              className="block max-w-[min(420px,26vw)] truncate font-mono text-[12.5px] font-medium hover:underline"
              onClick={(e) => e.stopPropagation()}
              title={c.name}
            >
              {c.name || <span className="text-muted-foreground">Untitled</span>}
            </Link>
            <span className="font-mono text-[11px] text-muted-foreground">{c.code}</span>
          </div>
        );
      case "brand":
        return brand(c.brandId)?.name ?? "—";
      case "platform":
        return <PlatformBadge platform={c.platform} />;
      case "objective":
        return c.fields.objective ?? "—";
      case "type":
        return <span className="text-muted-foreground">{campaignTypeLabel(c, data)}</span>;
      case "owner":
        return <span className="text-muted-foreground">{owner(c.ownerId)?.name ?? "—"}</span>;
      case "status":
        return <StatusBadge status={c.status} />;
      case "updated":
        return (
          <span className="tabular text-muted-foreground" title={new Date(c.updatedAt).toLocaleString()}>
            {formatRelative(c.updatedAt)}
          </span>
        );
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs text-muted-foreground">
            {columns.map((col) => (
              <th key={col} className="h-9 px-3 font-medium whitespace-nowrap first:pl-4">
                {HEAD[col]}
              </th>
            ))}
            {actions && <th className="w-10" />}
          </tr>
        </thead>
        <tbody>
          {campaigns.map((c) => (
            <tr
              key={c.id}
              onClick={() => router.push(`/campaigns/${c.id}`)}
              className="group cursor-pointer border-b last:border-b-0 hover:bg-surface"
            >
              {columns.map((col) => (
                <td key={col} className={cn("h-11 px-3 whitespace-nowrap first:pl-4", col === "campaign" && "whitespace-normal")}>
                  {cell(c, col)}
                </td>
              ))}
              {actions && (
                <td className="pr-2 text-right" onClick={(e) => e.stopPropagation()}>
                  <CampaignRowActions campaign={c} />
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
