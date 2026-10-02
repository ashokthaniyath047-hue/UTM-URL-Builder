"use client";

import { ExternalLink, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/shared/copy-button";
import { cn } from "@/lib/utils";
import { parseQuery } from "@/lib/engine/url";

/** Highlights the query portion and generated utm_* params of the final URL. */
function HighlightedUrl({ url }: { url: string }) {
  const [beforeHash, hash = ""] = url.split(/(?=#)/);
  const [base, query] = beforeHash.split("?");
  const params = query ? parseQuery(query) : [];
  return (
    <span>
      <span className="text-foreground">{base}</span>
      {params.map((p, i) => {
        const [k, ...rest] = p.raw.split("=");
        return (
          <span key={i}>
            <span className="text-muted-foreground">{i === 0 ? "?" : "&"}</span>
            <span className={cn(p.isUtm ? "text-brand" : "text-foreground/80")}>{k}</span>
            {rest.length > 0 && (
              <>
                <span className="text-muted-foreground">=</span>
                <span className={cn(p.isUtm ? "font-medium text-foreground" : "text-foreground/80")}>{rest.join("=")}</span>
              </>
            )}
          </span>
        );
      })}
      {hash && <span className="text-muted-foreground">{hash}</span>}
    </span>
  );
}

export function GeneratedUrl({
  url,
  onRegenerate,
  emptyText = "Enter a valid landing URL to generate the campaign URL.",
  className,
  label = "Generated Campaign URL",
}: {
  url: string;
  onRegenerate?: () => void;
  emptyText?: string;
  className?: string;
  label?: string;
}) {
  return (
    <div className={cn("rounded-lg border border-brand/30 bg-brand-soft/40", className)}>
      <div className="flex items-center justify-between gap-2 border-b border-brand/15 px-3 py-2">
        <span className="text-xs font-semibold tracking-wide text-brand uppercase">{label}</span>
        <div className="flex items-center gap-1.5">
          {onRegenerate && (
            <Button type="button" size="sm" variant="ghost" onClick={onRegenerate} disabled={!url}>
              <RefreshCw /> Regenerate
            </Button>
          )}
          <Button type="button" size="sm" variant="ghost" asChild disabled={!url}>
            <a href={url || undefined} target="_blank" rel="noopener noreferrer" aria-disabled={!url} className={cn(!url && "pointer-events-none opacity-50")}>
              <ExternalLink /> Open
            </a>
          </Button>
          <CopyButton value={url} label="Copy URL" toast="Campaign URL copied" variant="default" />
        </div>
      </div>
      <div className="px-3 py-3 font-mono text-[12.5px] leading-relaxed break-all select-all">
        {url ? <HighlightedUrl url={url} /> : <span className="font-sans text-sm text-muted-foreground">{emptyText}</span>}
      </div>
    </div>
  );
}
