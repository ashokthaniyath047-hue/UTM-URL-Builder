"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { CheckCircle2, Download, FileUp, TriangleAlert, Upload, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageBody, PageHeader, PageSkeleton, Panel } from "@/components/shared/page";
import { STATUS_LABELS } from "@/lib/domain/fields";
import { CAMPAIGN_STATUSES, type CampaignOSData } from "@/lib/domain/types";
import {
  autoMap,
  campaignsToTable,
  IMPORT_TARGETS,
  SAMPLE_IMPORT_CSV,
  validateImport,
  type ImportRowResult,
  type ImportTarget,
} from "@/lib/io/campaign-io";
import { csvFormat, downloadBlob, formatForFile, FORMATS, parseCsv, type Table } from "@/lib/io/formats";
import { importCampaigns, useData } from "@/lib/store/store";
import { cn } from "@/lib/utils";

type Stage = "upload" | "map" | "validate" | "done";
const STAGES: { key: Stage; label: string }[] = [
  { key: "upload", label: "Upload" },
  { key: "map", label: "Map columns" },
  { key: "validate", label: "Validate" },
  { key: "done", label: "Import" },
];
const SKIP = "__skip";

function ImportFlow({ data }: { data: CampaignOSData }) {
  const [stage, setStage] = useState<Stage>("upload");
  const [fileName, setFileName] = useState("");
  const [table, setTable] = useState<Table | null>(null);
  const [mapping, setMapping] = useState<Record<number, ImportTarget | "">>({});
  const [results, setResults] = useState<ImportRowResult[]>([]);
  const [error, setError] = useState("");
  const [imported, setImported] = useState(0);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = (t: Table, name: string) => {
    if (!t.headers.length || !t.rows.length) {
      setError("The file has no data rows. The first row must contain column headers.");
      return;
    }
    setError("");
    setTable(t);
    setFileName(name);
    setMapping(autoMap(t.headers));
    setStage("map");
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    const format = formatForFile(file);
    if (!format) {
      setError(`Unsupported file type. Supported: ${FORMATS.flatMap((f) => f.extensions).join(", ")}`);
      return;
    }
    try {
      load(await format.parse(file), file.name);
    } catch {
      setError("Could not read the file.");
    }
  };

  const missing = IMPORT_TARGETS.filter((t) => t.required && !Object.values(mapping).includes(t.key));
  const valid = results.filter((r) => r.draft);
  const reset = () => {
    setStage("upload");
    setTable(null);
    setResults([]);
    setError("");
  };

  return (
    <Panel
      title="Import campaigns"
      description="Rows are imported as Drafts. Names and UTMs are generated from brand rules unless a name column is mapped."
      actions={
        <Button size="sm" variant="ghost" onClick={() => downloadBlob(new Blob([SAMPLE_IMPORT_CSV], { type: "text/csv" }), "campaign-os-import-sample.csv")}>
          <Download /> Sample CSV
        </Button>
      }
    >
      <ol className="mb-5 flex items-center gap-1 text-sm">
        {STAGES.map((s, i) => {
          const idx = STAGES.findIndex((x) => x.key === stage);
          return (
            <li key={s.key} className="flex items-center gap-1">
              {i > 0 && <span className="h-px w-6 bg-border" />}
              <span className={cn("flex items-center gap-1.5 rounded-md px-2 py-1", i === idx ? "bg-foreground text-background" : i < idx ? "text-foreground" : "text-muted-foreground")}>
                <span className={cn("flex size-4 items-center justify-center rounded-full text-[10px]", i < idx ? "bg-emerald-600 text-white" : "border")}>{i < idx ? "✓" : i + 1}</span>
                {s.label}
              </span>
            </li>
          );
        })}
      </ol>

      {stage === "upload" && (
        <div>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); void onFile(e.dataTransfer.files[0]); }}
            className={cn("flex flex-col items-center justify-center rounded-lg border border-dashed px-6 py-10 text-center", dragging && "border-brand bg-brand-soft/40")}
          >
            <FileUp className="mb-2 size-6 text-muted-foreground" />
            <p className="text-sm font-medium">Drop a CSV file here</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Columns: brand, platform, landing_url (required) + template, objective, market, audience…</p>
            <div className="mt-4 flex gap-2">
              <Button onClick={() => inputRef.current?.click()}><Upload /> Choose file</Button>
              <Button variant="outline" onClick={() => load(parseCsv(SAMPLE_IMPORT_CSV), "sample.csv")}>Use sample data</Button>
            </div>
            <input ref={inputRef} type="file" accept={FORMATS.flatMap((f) => f.extensions).join(",")} className="hidden" onChange={(e) => { void onFile(e.target.files?.[0]); e.target.value = ""; }} />
          </div>
          {error && <p className="mt-2 flex items-center gap-1.5 text-sm text-destructive"><XCircle className="size-4" /> {error}</p>}
        </div>
      )}

      {stage === "map" && table && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{fileName} · {table.rows.length} rows · {table.headers.length} columns</p>
          <div className="overflow-hidden rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-surface text-left text-xs text-muted-foreground">
                  <th className="px-3 py-2 font-medium">File column</th>
                  <th className="px-3 py-2 font-medium">Sample value</th>
                  <th className="w-[260px] px-3 py-2 font-medium">Maps to</th>
                </tr>
              </thead>
              <tbody>
                {table.headers.map((h, i) => (
                  <tr key={i} className="border-b last:border-b-0">
                    <td className="px-3 py-1.5 font-mono text-[12.5px]">{h || <span className="text-muted-foreground">(blank)</span>}</td>
                    <td className="max-w-[320px] truncate px-3 py-1.5 text-muted-foreground">{table.rows[0]?.[i]}</td>
                    <td className="px-3 py-1">
                      <Select value={mapping[i] || SKIP} onValueChange={(v) => setMapping((m) => ({ ...m, [i]: v === SKIP ? "" : (v as ImportTarget) }))}>
                        <SelectTrigger size="sm" className="w-full"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value={SKIP}>Don’t import</SelectItem>
                          {IMPORT_TARGETS.map((t) => (
                            <SelectItem key={t.key} value={t.key} disabled={Object.entries(mapping).some(([j, v]) => v === t.key && Number(j) !== i)}>
                              {t.label}{t.required && " *"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {missing.length > 0 && (
            <p className="text-sm text-destructive">Map required columns: {missing.map((m) => m.label).join(", ")}</p>
          )}
          <div className="flex gap-2">
            <Button variant="ghost" onClick={reset}>Back</Button>
            <Button disabled={missing.length > 0} onClick={() => { setResults(validateImport(table, mapping, data)); setStage("validate"); }}>
              Validate {table.rows.length} rows
            </Button>
          </div>
        </div>
      )}

      {stage === "validate" && (
        <div className="space-y-4">
          <div className="flex gap-4 text-sm">
            <span className="flex items-center gap-1.5 text-emerald-700"><CheckCircle2 className="size-4" /> {valid.length} ready to import</span>
            {results.length - valid.length > 0 && <span className="flex items-center gap-1.5 text-destructive"><XCircle className="size-4" /> {results.length - valid.length} will be skipped</span>}
          </div>
          <div className="max-h-[420px] overflow-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-surface">
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="w-12 px-3 py-2 font-medium">Row</th>
                  <th className="px-3 py-2 font-medium">Brand</th>
                  <th className="px-3 py-2 font-medium">Platform</th>
                  <th className="px-3 py-2 font-medium">Generated name</th>
                  <th className="px-3 py-2 font-medium">Result</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r) => (
                  <tr key={r.index} className="border-b align-top last:border-b-0">
                    <td className="tabular px-3 py-2 text-muted-foreground">{r.index + 2}</td>
                    <td className="px-3 py-2">{r.preview.brand || "—"}</td>
                    <td className="px-3 py-2">{r.preview.platform || "—"}</td>
                    <td className="px-3 py-2 font-mono text-[12px]">{r.preview.name || "—"}</td>
                    <td className="px-3 py-2 text-xs">
                      {r.errors.map((e, i) => <p key={i} className="flex items-center gap-1 text-destructive"><XCircle className="size-3" /> {e}</p>)}
                      {r.warnings.map((w, i) => <p key={i} className="flex items-center gap-1 text-amber-800"><TriangleAlert className="size-3" /> {w}</p>)}
                      {!r.errors.length && !r.warnings.length && <p className="flex items-center gap-1 text-emerald-700"><CheckCircle2 className="size-3" /> OK</p>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setStage("map")}>Back</Button>
            <Button
              disabled={valid.length === 0}
              onClick={() => {
                const n = importCampaigns(valid.map((r) => r.draft!));
                setImported(n);
                setStage("done");
                toast.success(`Imported ${n} campaign${n === 1 ? "" : "s"} as Draft`);
              }}
            >
              Import {valid.length} campaign{valid.length === 1 ? "" : "s"}
            </Button>
          </div>
        </div>
      )}

      {stage === "done" && (
        <div className="flex flex-col items-center py-8 text-center">
          <CheckCircle2 className="mb-2 size-8 text-emerald-600" />
          <p className="font-medium">{imported} campaign{imported === 1 ? "" : "s"} imported as Draft</p>
          <p className="mt-1 text-sm text-muted-foreground">Open each draft to complete required fields and move it to Review.</p>
          <div className="mt-4 flex gap-2">
            <Button asChild><Link href="/campaigns?status=draft">View drafts</Link></Button>
            <Button variant="outline" onClick={reset}>Import another file</Button>
          </div>
        </div>
      )}
    </Panel>
  );
}

function ExportPanel({ data }: { data: CampaignOSData }) {
  const [brand, setBrand] = useState("all");
  const [status, setStatus] = useState("all");
  const list = data.campaigns.filter((c) => (brand === "all" || c.brandId === brand) && (status === "all" || c.status === status));
  return (
    <Panel title="Export campaigns" description="Full campaign package incl. generated names, UTMs and URLs.">
      <div className="space-y-3">
        <Select value={brand} onValueChange={setBrand}>
          <SelectTrigger className="w-full" aria-label="Brand"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All brands</SelectItem>
            {data.brands.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-full" aria-label="Status"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {CAMPAIGN_STATUSES.map((s) => <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value="csv" disabled>
          <SelectTrigger className="w-full" aria-label="Format"><SelectValue /></SelectTrigger>
          <SelectContent>
            {FORMATS.map((f) => <SelectItem key={f.id} value={f.id}>{f.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button
          className="w-full"
          disabled={!list.length}
          onClick={() => {
            downloadBlob(csvFormat.serialize(campaignsToTable(list, data)), `campaign-os-export-${new Date().toISOString().slice(0, 10)}.csv`);
            toast.success(`Exported ${list.length} campaigns`);
          }}
        >
          <Download /> Export {list.length} campaign{list.length === 1 ? "" : "s"}
        </Button>
      </div>
    </Panel>
  );
}

export default function ImportExportPage() {
  const data = useData();
  if (!data) return <PageSkeleton />;
  return (
    <>
      <PageHeader title="Import / Export" description="Move campaigns in and out of Campaign OS as CSV." />
      <PageBody>
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
          <ImportFlow data={data} />
          <ExportPanel data={data} />
        </div>
      </PageBody>
    </>
  );
}
