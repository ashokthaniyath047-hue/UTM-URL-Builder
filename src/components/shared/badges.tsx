import { cn } from "@/lib/utils";
import { PLATFORM_LABELS, STATUS_LABELS } from "@/lib/domain/fields";
import type { CampaignStatus, Platform } from "@/lib/domain/types";

const STATUS_STYLES: Record<CampaignStatus, string> = {
  draft: "bg-muted text-muted-foreground border-border",
  review: "bg-amber-50 text-amber-800 border-amber-200",
  ready: "bg-emerald-50 text-emerald-800 border-emerald-200",
  launched: "bg-sky-50 text-sky-800 border-sky-200",
};

const STATUS_DOT: Record<CampaignStatus, string> = {
  draft: "bg-neutral-400",
  review: "bg-amber-500",
  ready: "bg-emerald-500",
  launched: "bg-sky-500",
};

export function StatusBadge({ status, className }: { status: CampaignStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center gap-1.5 rounded-md border px-1.5 text-xs font-medium whitespace-nowrap",
        STATUS_STYLES[status],
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", STATUS_DOT[status])} />
      {STATUS_LABELS[status]}
    </span>
  );
}

export function StatusDot({ status }: { status: CampaignStatus }) {
  return <span className={cn("inline-block size-1.5 rounded-full", STATUS_DOT[status])} />;
}

const PLATFORM_MARK: Record<Platform, string> = {
  meta: "bg-[#0866ff] text-white",
  google: "bg-white text-neutral-800 ring-1 ring-inset ring-neutral-300",
};

export function PlatformMark({ platform, className }: { platform: Platform; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex size-4 shrink-0 items-center justify-center rounded text-[9px] font-bold",
        PLATFORM_MARK[platform],
        className,
      )}
    >
      {platform === "meta" ? "M" : "G"}
    </span>
  );
}

export function PlatformBadge({ platform, className }: { platform: Platform; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-sm whitespace-nowrap", className)}>
      <PlatformMark platform={platform} />
      {PLATFORM_LABELS[platform]}
    </span>
  );
}

export function BrandAvatar({ name, className }: { name: string; className?: string }) {
  const initials = name
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex size-6 shrink-0 items-center justify-center rounded-md border bg-surface text-[10px] font-semibold text-foreground/80",
        className,
      )}
    >
      {initials}
    </span>
  );
}

export function Kbd({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded border bg-background px-1 font-sans text-[11px] font-medium text-muted-foreground",
        className,
      )}
    >
      {children}
    </kbd>
  );
}
