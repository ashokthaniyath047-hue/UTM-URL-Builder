/**
 * Tabular file formats. CSV ships in the MVP; XLSX can be added by implementing
 * `TabularFormat` (e.g. with SheetJS) and registering it in FORMATS.
 */

export interface Table {
  headers: string[];
  rows: string[][];
}

export interface TabularFormat {
  id: "csv" | "xlsx";
  label: string;
  extensions: string[];
  mime: string;
  parse(file: File): Promise<Table>;
  serialize(table: Table): Blob;
}

export function parseCsv(text: string): Table {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  const src = text.replace(/^﻿/, "");

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += ch;
      continue;
    }
    if (ch === '"') inQuotes = true;
    else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += ch;
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  const nonEmpty = rows.filter((r) => r.some((c) => c.trim() !== ""));
  const [headers = [], ...body] = nonEmpty;
  return { headers: headers.map((h) => h.trim()), rows: body };
}

function csvCell(v: string): string {
  return /[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

export function toCsv(table: Table): string {
  return [table.headers, ...table.rows].map((r) => r.map((c) => csvCell(c ?? "")).join(",")).join("\r\n");
}

export const csvFormat: TabularFormat = {
  id: "csv",
  label: "CSV",
  extensions: [".csv"],
  mime: "text/csv",
  async parse(file) {
    return parseCsv(await file.text());
  },
  serialize(table) {
    // BOM so Excel opens UTF-8 correctly.
    return new Blob(["﻿" + toCsv(table)], { type: "text/csv;charset=utf-8" });
  },
};

export const FORMATS: TabularFormat[] = [csvFormat];

export function formatForFile(file: File): TabularFormat | undefined {
  const name = file.name.toLowerCase();
  return FORMATS.find((f) => f.extensions.some((ext) => name.endsWith(ext)));
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
