"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Copy, Link2, Megaphone, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { CampaignTable } from "@/components/campaign/campaign-table";
import { PlatformMark, StatusBadge } from "@/components/shared/badges";
import { EmptyState, PageBody, PageHeader, PageSkeleton, Panel } from "@/components/shared/page";
import type { CampaignStatus } from "@/lib/domain/types";
import { duplicateCampaign, useData } from "@/lib/store/store";
import { toast } from "sonner";

function Stat({ label, value, href, hint }: { label: string; value: number; href: string; hint?: string }) {
  return (
    <Link href={href} className="group rounded-lg border bg-card px-4 py-3 transition-colors hover:border-foreground/20">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="tabular mt-1 text-2xl font-semibold tracking-tight">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </Link>
  );
}

function QuickAction({ icon, title, description, onClick, href }: { icon: React.ReactNode; title: string; description: string; onClick?: () => void; href?: string }) {
  const inner = (
    <>
      <span className="flex size-8 shrink-0 items-center justify-center rounded-md border bg-surface">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{title}</span>
        <span className="block truncate text-xs text-muted-foreground">{description}</span>
      </span>
      <ArrowRight className="size-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
    </>
  );
  const cls = "group flex w-full items-center gap-3 rounded-md px-2 py-2 text-left hover:bg-surface";
  return href ? (
    <Link href={href} className={cls}>
      {inner}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={cls}>
      {inner}
    </button>
  );
}

export default function DashboardPage() {
  const data = useData();
  const router = useRouter();
  const [dupOpen, setDupOpen] = useState(false);
  if (!data) return <PageSkeleton />;

  const now = new Date();
  const thisMonth = data.campaigns.filter((c) => {
    const d = new Date(c.createdAt);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;
  const count = (s: CampaignStatus) => data.campaigns.filter((c) => c.status === s).length;
  const recent = [...data.campaigns].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 8);
  const activeBrands = data.brands.filter((b) => !b.archived).length;
  const user = data.users.find((u) => u.id === data.settings.currentUserId);

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={`Welcome back${user ? `, ${user.name.split(" ")[0]}` : ""}.`}
        actions={
          <Button asChild className="bg-brand text-brand-foreground hover:bg-brand/90">
            <Link href="/campaigns/new">
              <Plus /> Create Campaign
            </Link>
          </Button>
        }
      />
      <PageBody className="space-y-5">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <Stat label="Active brands" value={activeBrands} href="/brands" />
          <Stat label="Campaigns this month" value={thisMonth} href="/campaigns" hint={now.toLocaleString("en-GB", { month: "long", year: "numeric" })} />
          <Stat label="Drafts" value={count("draft")} href="/campaigns?status=draft" />
          <Stat label="Pending review" value={count("review")} href="/campaigns?status=review" />
          <Stat label="Ready" value={count("ready")} href="/campaigns?status=ready" />
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <Panel
            className="min-w-0"
            title="Recent campaigns"
            actions={
              <Button asChild variant="ghost" size="sm">
                <Link href="/campaigns">
                  View all <ArrowRight />
                </Link>
              </Button>
            }
            bodyClassName="p-0"
          >
            {recent.length ? (
              <CampaignTable campaigns={recent} data={data} columns={["brand", "platform", "campaign", "type", "status", "updated"]} />
            ) : (
              <EmptyState
                icon={Megaphone}
                title="No campaigns yet"
                description="Create your first campaign. Naming and UTMs are generated from brand rules."
                action={
                  <Button asChild>
                    <Link href="/campaigns/new">
                      <Plus /> Create Campaign
                    </Link>
                  </Button>
                }
              />
            )}
          </Panel>

          <div className="min-w-0 space-y-5">
            <Panel title="Quick actions" bodyClassName="p-2">
              <QuickAction icon={<PlatformMark platform="meta" />} title="Create Meta campaign" description="Ads Manager campaign with UTMs" href="/campaigns/new?platform=meta" />
              <QuickAction icon={<PlatformMark platform="google" />} title="Create Google campaign" description="Search, PMax, Shopping, YouTube" href="/campaigns/new?platform=google" />
              <QuickAction icon={<Copy className="size-4 text-muted-foreground" />} title="Duplicate campaign" description="Start from an existing campaign" onClick={() => setDupOpen(true)} />
              <QuickAction icon={<Link2 className="size-4 text-muted-foreground" />} title="Build URL" description="Standalone UTM URL builder" href="/url-builder" />
            </Panel>
            <Panel title="Needs attention" bodyClassName="p-0">
              {data.campaigns.filter((c) => c.status === "review").length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-muted-foreground">Nothing waiting for review.</p>
              ) : (
                <ul className="divide-y">
                  {data.campaigns
                    .filter((c) => c.status === "review")
                    .map((c) => (
                      <li key={c.id}>
                        <Link href={`/campaigns/${c.id}`} className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-surface">
                          <PlatformMark platform={c.platform} />
                          <span className="min-w-0 flex-1 truncate font-mono text-xs">{c.name}</span>
                          <StatusBadge status={c.status} />
                        </Link>
                      </li>
                    ))}
                </ul>
              )}
            </Panel>
          </div>
        </div>
      </PageBody>

      <CommandDialog open={dupOpen} onOpenChange={setDupOpen} title="Duplicate campaign" description="Choose a campaign to duplicate">
        <CommandInput placeholder="Search campaigns to duplicate…" />
        <CommandList>
          <CommandEmpty>No campaigns found.</CommandEmpty>
          <CommandGroup heading="Campaigns">
            {data.campaigns.map((c) => (
              <CommandItem
                key={c.id}
                value={`${c.name} ${c.code}`}
                onSelect={() => {
                  setDupOpen(false);
                  const res = duplicateCampaign(c.id);
                  if (res.ok) {
                    toast.success(`Duplicated as ${res.value.code}`);
                    router.push(`/campaigns/${res.value.id}/edit`);
                  }
                }}
              >
                <PlatformMark platform={c.platform} />
                <span className="truncate font-mono text-xs">{c.name}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
