"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, GripVertical, Plus, Type, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CopyButton } from "@/components/shared/copy-button";
import { FieldLabel } from "@/components/campaign/field-control";
import type { Brand, NamingCase, NamingRule, NamingSeparator, NamingToken } from "@/lib/domain/types";
import { generateName, NAMING_VARIABLE_MAP, NAMING_VARIABLES, namingPattern, sampleNamingContext } from "@/lib/engine/naming";
import { uid, updateNamingRule } from "@/lib/store/store";
import { cn } from "@/lib/utils";

const SEPARATORS: { value: NamingSeparator; label: string }[] = [
  { value: "_", label: "Underscore  _" },
  { value: "-", label: "Hyphen  -" },
  { value: "|", label: "Pipe  |" },
  { value: ".", label: "Dot  ." },
  { value: " ", label: "Space" },
];

export function NamingRuleEditor({ rule, brand }: { rule: NamingRule; brand: Brand }) {
  const [draft, setDraft] = useState<NamingRule>(rule);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [literal, setLiteral] = useState("");
  const dirty = JSON.stringify(draft) !== JSON.stringify(rule);

  const preview = useMemo(() => generateName(draft, sampleNamingContext(brand, draft.platform)), [draft, brand]);
  const used = new Set(draft.tokens.filter((t) => t.kind === "variable").map((t) => (t as Extract<NamingToken, { kind: "variable" }>).variable));

  const setTokens = (tokens: NamingToken[]) => setDraft((d) => ({ ...d, tokens }));
  const move = (from: number, to: number) => {
    if (to < 0 || to >= draft.tokens.length) return;
    const t = [...draft.tokens];
    const [x] = t.splice(from, 1);
    t.splice(to, 0, x);
    setTokens(t);
  };

  return (
    <div className="space-y-4">
      <div>
        <FieldLabel hint="Drag or use arrows to reorder">Pattern</FieldLabel>
        <div className="flex min-h-12 flex-wrap items-center gap-1.5 rounded-lg border bg-surface p-2" role="list" aria-label="Naming tokens">
          {draft.tokens.length === 0 && <span className="px-1 text-sm text-muted-foreground">Add variables below.</span>}
          {draft.tokens.map((t, i) => (
            <div key={t.id} className="flex items-center gap-1.5" role="listitem">
              {i > 0 && <span className="font-mono text-sm text-muted-foreground">{draft.separator === " " ? "␣" : draft.separator}</span>}
              <div
                draggable
                onDragStart={() => setDragIdx(i)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (dragIdx !== null) move(dragIdx, i);
                  setDragIdx(null);
                }}
                className={cn(
                  "group flex h-8 items-center gap-0.5 rounded-md border bg-background pr-0.5 pl-1 text-xs font-medium shadow-xs",
                  t.kind === "literal" && "border-dashed",
                  dragIdx === i && "opacity-50",
                )}
              >
                <GripVertical className="size-3.5 cursor-grab text-muted-foreground/60" />
                <span className="px-1 font-mono">{t.kind === "variable" ? t.variable : `"${t.value}"`}</span>
                <Button size="icon-xs" variant="ghost" aria-label="Move left" disabled={i === 0} onClick={() => move(i, i - 1)} className="hidden group-hover:inline-flex group-focus-within:inline-flex">
                  <ArrowLeft />
                </Button>
                <Button size="icon-xs" variant="ghost" aria-label="Move right" disabled={i === draft.tokens.length - 1} onClick={() => move(i, i + 1)} className="hidden group-hover:inline-flex group-focus-within:inline-flex">
                  <ArrowRight />
                </Button>
                <Button size="icon-xs" variant="ghost" aria-label={`Remove ${t.kind === "variable" ? t.variable : t.value}`} onClick={() => setTokens(draft.tokens.filter((x) => x.id !== t.id))}>
                  <X />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <FieldLabel>Add variable</FieldLabel>
        <div className="flex flex-wrap gap-1.5">
          {NAMING_VARIABLES.map((v) => (
            <Button
              key={v.variable}
              size="xs"
              variant="outline"
              disabled={used.has(v.variable)}
              title={v.description}
              onClick={() => setTokens([...draft.tokens, { id: uid("tk"), kind: "variable", variable: v.variable }])}
            >
              <Plus /> <span className="font-mono">{v.variable}</span>
            </Button>
          ))}
        </div>
        <form
          className="mt-2 flex max-w-sm gap-1.5"
          onSubmit={(e) => {
            e.preventDefault();
            if (!literal.trim()) return;
            setTokens([...draft.tokens, { id: uid("tk"), kind: "literal", value: literal.trim() }]);
            setLiteral("");
          }}
        >
          <Input value={literal} onChange={(e) => setLiteral(e.target.value)} placeholder="Fixed text, e.g. AO" className="h-7" aria-label="Fixed text token" />
          <Button size="sm" variant="outline" type="submit" disabled={!literal.trim()}>
            <Type /> Add text
          </Button>
        </form>
      </div>

      <div className="grid max-w-xl grid-cols-3 gap-3">
        <div>
          <FieldLabel htmlFor={`sep-${rule.id}`}>Separator</FieldLabel>
          <Select value={draft.separator} onValueChange={(v) => setDraft((d) => ({ ...d, separator: v as NamingSeparator }))}>
            <SelectTrigger id={`sep-${rule.id}`} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SEPARATORS.map((s) => (
                <SelectItem key={s.label} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <FieldLabel htmlFor={`case-${rule.id}`}>Case</FieldLabel>
          <Select value={draft.casing} onValueChange={(v) => setDraft((d) => ({ ...d, casing: v as NamingCase }))}>
            <SelectTrigger id={`case-${rule.id}`} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="upper">UPPERCASE</SelectItem>
              <SelectItem value="lower">lowercase</SelectItem>
              <SelectItem value="preserve">Preserve</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <FieldLabel htmlFor={`max-${rule.id}`}>Max length</FieldLabel>
          <Input
            id={`max-${rule.id}`}
            type="number"
            min={20}
            max={400}
            value={draft.maxLength}
            onChange={(e) => setDraft((d) => ({ ...d, maxLength: Number(e.target.value) || 0 }))}
            className="tabular"
          />
        </div>
      </div>

      <div className="rounded-lg border">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Live preview</span>
          <code className="font-mono text-[11px] text-muted-foreground">{namingPattern(draft)}</code>
        </div>
        <div className="flex items-center justify-between gap-3 px-3 py-3">
          <p className="font-mono text-sm font-semibold break-all">{preview.name || <span className="font-sans font-normal text-muted-foreground">Empty pattern</span>}</p>
          <CopyButton value={preview.name} iconOnly size="icon-sm" variant="ghost" label="Copy example" />
        </div>
        <p className="border-t px-3 py-1.5 text-xs text-muted-foreground">
          Example values: {Object.values(sampleNamingContext(brand, draft.platform).fields).join(" · ")}
          {preview.tooLong && <span className="ml-2 text-destructive">Exceeds {draft.maxLength} characters</span>}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Button
          disabled={!dirty || draft.tokens.length === 0}
          onClick={() => {
            updateNamingRule(draft);
            toast.success("Naming rule saved. New and edited campaigns use it immediately.");
          }}
        >
          Save naming rule
        </Button>
        <Button variant="ghost" disabled={!dirty} onClick={() => setDraft(rule)}>
          Discard
        </Button>
        {dirty && <span className="text-xs text-muted-foreground">Unsaved changes</span>}
      </div>
      <p className="text-xs text-muted-foreground">
        Variables: {NAMING_VARIABLES.map((v) => `${v.variable} (${NAMING_VARIABLE_MAP[v.variable].description})`).join(", ")}.
      </p>
    </div>
  );
}
