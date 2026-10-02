"use client";

import { AlertTriangle, CheckCircle2, Globe, Info, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BrandMatch, ParsedLandingUrl } from "@/lib/engine/url";

const PAGE_TYPE_LABEL = { product: "Product page", collection: "Collection page", home: "Homepage", other: "Page" } as const;

/** Breakdown of a pasted landing URL: validity, page, detected brand/product, existing params. */
export function UrlInspector({
  parsed,
  brandMatches,
  className,
  compact,
}: {
  parsed: ParsedLandingUrl;
  brandMatches?: BrandMatch[];
  className?: string;
  compact?: boolean;
}) {
  if (!parsed.input.trim()) return null;

  if (!parsed.valid) {
    return (
      <div className={cn("flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive", className)}>
        <XCircle className="mt-0.5 size-4 shrink-0" />
        <span>{parsed.error}</span>
      </div>
    );
  }

  const { page } = parsed;
  return (
    <div className={cn("overflow-hidden rounded-md border bg-surface text-sm", className)}>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b bg-background px-3 py-2">
        <span className="flex items-center gap-1.5 font-medium text-emerald-700">
          <CheckCircle2 className="size-3.5" /> Valid URL
        </span>
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <Globe className="size-3.5" /> {parsed.host}
        </span>
        <span className="text-muted-foreground">{PAGE_TYPE_LABEL[page.type]}</span>
      </div>

      <dl className="grid grid-cols-[120px_1fr] gap-x-3 gap-y-1.5 px-3 py-2.5">
        <dt className="text-muted-foreground">Landing page</dt>
        <dd className="min-w-0 font-mono text-[12px] break-all">{parsed.base}</dd>

        {page.name && page.type !== "home" && (
          <>
            <dt className="text-muted-foreground">{page.type === "collection" ? "Collection" : "Product"}</dt>
            <dd>
              {page.name}
              {page.externalId && <span className="ml-2 font-mono text-xs text-muted-foreground">id {page.externalId}</span>}
              <span className="ml-2 text-xs text-muted-foreground">(from URL slug)</span>
            </dd>
          </>
        )}

        {brandMatches && (
          <>
            <dt className="text-muted-foreground">Brand</dt>
            <dd>
              {brandMatches.length === 0 ? (
                <span className="text-muted-foreground">Not detected — select manually</span>
              ) : (
                brandMatches.map((m, i) => (
                  <span key={m.brand.id}>
                    {i > 0 && <span className="text-muted-foreground">, </span>}
                    {m.brand.name}
                    <span className="ml-1 text-xs text-muted-foreground">
                      ({m.reason === "slug" ? "matched in product slug" : "matched domain"})
                    </span>
                  </span>
                ))
              )}
            </dd>
          </>
        )}
      </dl>

      {parsed.params.length > 0 && (
        <div className="border-t px-3 py-2.5">
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">
            Existing parameters detected · {parsed.params.length}
          </p>
          <ul className="space-y-1">
            {parsed.params.map((p, i) => (
              <li key={i} className="flex items-center gap-2">
                <code
                  className={cn(
                    "rounded border px-1.5 py-0.5 font-mono text-[12px]",
                    p.isUtm ? "border-amber-200 bg-amber-50 text-amber-900" : "bg-background",
                  )}
                >
                  {p.raw}
                </code>
                {p.isUtm ? (
                  <span className="text-xs text-muted-foreground">tracking</span>
                ) : (
                  <span className="text-xs text-muted-foreground">kept as-is</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {!compact && parsed.warnings.length > 0 && (
        <ul className="space-y-1 border-t bg-amber-50/50 px-3 py-2">
          {parsed.warnings.map((w, i) => (
            <li key={i} className="flex items-start gap-1.5 text-xs text-amber-900">
              <AlertTriangle className="mt-px size-3.5 shrink-0" /> {w.message}
            </li>
          ))}
        </ul>
      )}

      {!compact && (
        <p className="flex items-center gap-1.5 border-t px-3 py-1.5 text-xs text-muted-foreground">
          <Info className="size-3" /> Page metadata is not fetched. Product and brand are inferred from the URL only.
        </p>
      )}
    </div>
  );
}
