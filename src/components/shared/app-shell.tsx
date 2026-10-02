"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import {
  ArrowLeftRight,
  Building2,
  FileStack,
  LayoutDashboard,
  Link2,
  Megaphone,
  Plus,
  Search,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { useData } from "@/lib/store/store";
import { Kbd, PlatformMark, StatusDot } from "./badges";
import type { CampaignStatus } from "@/lib/domain/types";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/campaigns", label: "Campaigns", icon: Megaphone, children: true },
  { href: "/brands", label: "Brands", icon: Building2 },
  { href: "/templates", label: "Templates", icon: FileStack },
  { href: "/url-builder", label: "URL Builder", icon: Link2 },
  { href: "/import-export", label: "Import / Export", icon: ArrowLeftRight },
  { href: "/settings", label: "Settings", icon: Settings },
];

const CAMPAIGN_VIEWS: { label: string; status?: CampaignStatus }[] = [
  { label: "All" },
  { label: "Drafts", status: "draft" },
  { label: "Review", status: "review" },
  { label: "Ready", status: "ready" },
];

function SidebarNav() {
  const pathname = usePathname();
  const params = useSearchParams();
  const data = useData();
  const statusParam = params.get("status");
  const counts = (s?: CampaignStatus) =>
    data ? data.campaigns.filter((c) => (s ? c.status === s : true)).length : undefined;

  return (
    <nav className="flex flex-col gap-0.5 px-2" aria-label="Main">
      {NAV.map((item) => {
        const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href + "/"));
        const isCampaignsList = pathname === "/campaigns";
        return (
          <div key={item.href}>
            <Link
              href={item.href}
              className={cn(
                "flex h-8 items-center gap-2.5 rounded-md px-2 text-sm text-sidebar-foreground/75 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground",
                active && !item.children && "bg-sidebar-accent font-medium text-sidebar-foreground",
                item.children && pathname.startsWith("/campaigns") && "text-sidebar-foreground font-medium",
              )}
            >
              <item.icon className="size-4 opacity-80" />
              {item.label}
            </Link>
            {item.children && (
              <div className="mt-0.5 mb-1 ml-[18px] flex flex-col gap-0.5 border-l pl-2">
                {CAMPAIGN_VIEWS.map((v) => {
                  const href = v.status ? `/campaigns?status=${v.status}` : "/campaigns";
                  const isActive = isCampaignsList && (statusParam ?? undefined) === v.status;
                  const n = counts(v.status);
                  return (
                    <Link
                      key={v.label}
                      href={href}
                      className={cn(
                        "flex h-7 items-center justify-between rounded-md px-2 text-[13px] text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                        isActive && "bg-sidebar-accent font-medium text-sidebar-foreground",
                      )}
                    >
                      <span className="flex items-center gap-2">
                        {v.status && <StatusDot status={v.status} />}
                        {v.label}
                      </span>
                      {n !== undefined && <span className="tabular text-xs text-muted-foreground">{n}</span>}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}

function CommandMenu({ open, setOpen }: { open: boolean; setOpen: (o: boolean) => void }) {
  const router = useRouter();
  const data = useData();
  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };
  return (
    <CommandDialog open={open} onOpenChange={setOpen} title="Command menu" description="Jump to a page, campaign or action">
      <CommandInput placeholder="Search campaigns, brands, actions…" />
      <CommandList>
        <CommandEmpty>No results.</CommandEmpty>
        <CommandGroup heading="Create">
          <CommandItem onSelect={() => go("/campaigns/new")}>
            <Plus /> Create campaign
          </CommandItem>
          <CommandItem onSelect={() => go("/campaigns/new?platform=meta")}>
            <PlatformMark platform="meta" /> Create Meta campaign
          </CommandItem>
          <CommandItem onSelect={() => go("/campaigns/new?platform=google")}>
            <PlatformMark platform="google" /> Create Google campaign
          </CommandItem>
          <CommandItem onSelect={() => go("/url-builder")}>
            <Link2 /> Build URL
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Go to">
          {NAV.map((n) => (
            <CommandItem key={n.href} onSelect={() => go(n.href)}>
              <n.icon /> {n.label}
            </CommandItem>
          ))}
        </CommandGroup>
        {data && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Campaigns">
              {data.campaigns.slice(0, 50).map((c) => (
                <CommandItem key={c.id} value={`${c.name} ${c.code}`} onSelect={() => go(`/campaigns/${c.id}`)}>
                  <PlatformMark platform={c.platform} />
                  <span className="truncate font-mono text-xs">{c.name || c.code}</span>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandGroup heading="Brands">
              {data.brands.map((b) => (
                <CommandItem key={b.id} value={`brand ${b.name}`} onSelect={() => go(`/brands/${b.id}`)}>
                  <Building2 /> {b.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [cmdOpen, setCmdOpen] = useState(false);
  const router = useRouter();
  const data = useData();
  const user = data?.users.find((u) => u.id === data.settings.currentUserId);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmdOpen((o) => !o);
      }
      // "c" to create a campaign when not typing.
      const t = e.target as HTMLElement;
      const typing = t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName) || t.getAttribute("role") === "combobox";
      if (!typing && !e.metaKey && !e.ctrlKey && !e.altKey && e.key === "c" && !document.querySelector("[role=dialog]")) {
        e.preventDefault();
        router.push("/campaigns/new");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  return (
    <div className="flex min-h-screen bg-surface">
      <aside className="sticky top-0 flex h-screen w-[232px] shrink-0 flex-col border-r bg-sidebar">
        <div className="flex h-12 items-center gap-2 px-4">
          <div className="flex size-6 items-center justify-center rounded-md bg-foreground text-[11px] font-bold text-background">C</div>
          <span className="text-sm font-semibold tracking-tight">Campaign OS</span>
        </div>
        <div className="space-y-2 px-3 pb-3">
          <Button asChild className="w-full justify-start bg-brand text-brand-foreground hover:bg-brand/90">
            <Link href="/campaigns/new">
              <Plus /> Create Campaign
              <Kbd className="ml-auto border-white/25 bg-white/10 text-white/80">C</Kbd>
            </Link>
          </Button>
          <button
            type="button"
            onClick={() => setCmdOpen(true)}
            className="flex h-8 w-full items-center gap-2 rounded-md border bg-background px-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <Search className="size-3.5" />
            Search
            <span className="ml-auto flex gap-0.5">
              <Kbd>⌘</Kbd>
              <Kbd>K</Kbd>
            </span>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <Suspense fallback={null}>
            <SidebarNav />
          </Suspense>
        </div>
        <div className="border-t p-3">
          <Link href="/settings" className="flex items-center gap-2 rounded-md p-1 hover:bg-sidebar-accent">
            <span className="flex size-7 items-center justify-center rounded-full bg-brand-soft text-[11px] font-semibold text-brand">
              {user?.initials ?? "··"}
            </span>
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-sm font-medium">{user?.name ?? "Loading…"}</span>
              <span className="block truncate text-xs text-muted-foreground">Senior Marketing Executive</span>
            </span>
          </Link>
        </div>
      </aside>
      <main className="min-w-0 flex-1 bg-background">{children}</main>
      <CommandMenu open={cmdOpen} setOpen={setCmdOpen} />
    </div>
  );
}
