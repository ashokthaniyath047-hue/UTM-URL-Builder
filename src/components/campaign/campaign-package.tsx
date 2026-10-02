"use client";

import { ClipboardCopy, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/shared/copy-button";
import { PlatformBadge } from "@/components/shared/badges";
import { campaignPackageRows, campaignPackageText, type ComputedCampaign } from "@/lib/engine/campaign";
import { UTM_KEYS } from "@/lib/domain/types";
import { campaignsToTable } from "@/lib/io/campaign-io";
import { csvFormat, downloadBlob } from "@/lib/io/formats";
import { getData } from "@/lib/store/store";
import { copyText } from "@/lib/utils/clipboard";
import { cn } from "@/lib/utils";
import { isDynamicValue } from "@/lib/engine/url";
import { GeneratedUrl } from "./generated-url";

export function exportCampaignCsv(c: ComputedCampaign, status?: ComputedCampaign["draft"]["status"]) {
  const table = campaignsToTable([{ ...c.draft, status }], getData());
  downloadBlob(csvFormat.serialize(table), `${c.name || c.draft.code}.csv`);
}

/** Polished summary of everything needed to build the campaign in Ads Manager / Google Ads. */
export function CampaignPackage({
  computed,
  actions,
  onRegenerate,
}: {
  computed: ComputedCampaign;
  actions?: React.ReactNode;
  onRegenerate?: () => void;
}) {
  const rows = campaignPackageRows(computed).filter((r) => !["UTM parameters", "Generated URL", "Platform", "Campaign name"].includes(r.label));
  const t = computed.tracking.params;

  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <PlatformBadge platform={computed.draft.platform} className="text-xs" />
            <span>·</span>
            <span>{computed.brand?.name}</span>
            <span>·</span>
            <span className="font-mono">{computed.draft.code}</span>
          </div>
          <div className="mt-1 flex items-center gap-2">
            <p className={cn("font-mono text-[15px] font-semibold break-all", !computed.name && "text-muted-foreground")}>
              {computed.name || "Name will be generated"}
            </p>
            {computed.name && <CopyButton value={computed.name} iconOnly size="icon-xs" variant="ghost" label="Copy name" toast="Campaign name copied" />}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Button type="button" size="sm" variant="outline" onClick={() => copyText(campaignPackageText(computed), "Campaign package copied")}>
            <ClipboardCopy /> Copy Campaign
          </Button>
          <CopyButton value={computed.generatedUrl} label="Copy URL" toast="Campaign URL copied" />
          <Button type="button" size="sm" variant="outline" onClick={() => exportCampaignCsv(computed, computed.draft.status)}>
            <Download /> Export CSV
          </Button>
          {actions}
        </div>
      </div>

      <div className="grid gap-0 2xl:grid-cols-2">
        <dl className="border-b px-4 py-2 2xl:border-r 2xl:border-b-0">
          {rows.map((r) => (
            <div key={r.label} className="grid grid-cols-[130px_1fr] gap-3 py-1.5 text-sm">
              <dt className="text-muted-foreground">{r.label}</dt>
              <dd className={cn("min-w-0 break-all", r.mono && "font-mono text-[12.5px]")}>
                {r.value || <span className="text-muted-foreground">—</span>}
              </dd>
            </div>
          ))}
        </dl>
        <div className="px-4 py-2">
          <p className="py-1.5 text-sm text-muted-foreground">UTM parameters</p>
          <table className="w-full text-sm">
            <tbody>
              {UTM_KEYS.map((k) => (
                <tr key={k} className="border-t first:border-t-0">
                  <td className="w-[140px] py-1.5 font-mono text-xs text-muted-foreground">utm_{k}</td>
                  <td className="py-1.5 font-mono text-[12.5px] break-all">
                    {t[k] ? (
                      <>
                        {t[k]}
                        {isDynamicValue(t[k]!) && (
                          <span className="ml-2 rounded bg-muted px-1 py-0.5 font-sans text-[10px] text-muted-foreground">dynamic</span>
                        )}
                      </>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="border-t p-3">
        <GeneratedUrl url={computed.generatedUrl} onRegenerate={onRegenerate} />
      </div>
    </div>
  );
}
