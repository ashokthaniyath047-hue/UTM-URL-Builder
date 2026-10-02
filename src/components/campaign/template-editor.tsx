"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FIELD_DEFS, fieldOptions, PLATFORM_FIELDS } from "@/lib/domain/fields";
import type { CampaignTemplate } from "@/lib/domain/types";
import { FieldLabel } from "./field-control";

const NONE = "__none";

export function TemplateEditor({
  template,
  onSave,
  onCancel,
}: {
  template: CampaignTemplate;
  onSave: (t: CampaignTemplate) => void;
  onCancel: () => void;
}) {
  const [t, setT] = useState(template);
  const fields = PLATFORM_FIELDS[t.platform];

  const toggleField = (k: (typeof fields)[number], on: boolean) =>
    setT((x) => ({
      ...x,
      fields: on ? fields.filter((f) => x.fields.includes(f) || f === k) : x.fields.filter((f) => f !== k),
      requiredFields: on ? x.requiredFields : x.requiredFields.filter((f) => f !== k),
    }));
  const toggleRequired = (k: (typeof fields)[number], on: boolean) =>
    setT((x) => ({ ...x, requiredFields: on ? [...new Set([...x.requiredFields, k])] : x.requiredFields.filter((f) => f !== k) }));
  const setDefault = (k: (typeof fields)[number], v: string) =>
    setT((x) => {
      const defaults = { ...x.defaults };
      if (v) defaults[k] = v;
      else delete defaults[k];
      return { ...x, defaults };
    });

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (t.name.trim()) onSave({ ...t, name: t.name.trim() });
      }}
    >
      <div className="grid grid-cols-2 gap-4">
        <div>
          <FieldLabel htmlFor="t-name" required>Name</FieldLabel>
          <Input id="t-name" value={t.name} onChange={(e) => setT({ ...t, name: e.target.value })} />
        </div>
        <div className="col-span-2">
          <FieldLabel htmlFor="t-desc">Description</FieldLabel>
          <Textarea id="t-desc" rows={2} value={t.description} onChange={(e) => setT({ ...t, description: e.target.value })} />
        </div>
      </div>
      <div className="max-h-[46vh] overflow-y-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-surface">
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th className="px-3 py-2 font-medium">Field</th>
              <th className="w-16 px-2 py-2 text-center font-medium">Shown</th>
              <th className="w-20 px-2 py-2 text-center font-medium">Required</th>
              <th className="w-[220px] px-3 py-2 font-medium">Default</th>
            </tr>
          </thead>
          <tbody>
            {fields.map((k) => {
              const def = FIELD_DEFS[k];
              const shown = t.fields.includes(k);
              return (
                <tr key={k} className="border-b last:border-b-0">
                  <td className="px-3 py-1.5">{def.label}</td>
                  <td className="px-2 text-center">
                    <Checkbox checked={shown} onCheckedChange={(v) => toggleField(k, v === true)} aria-label={`Show ${def.label}`} />
                  </td>
                  <td className="px-2 text-center">
                    <Checkbox checked={t.requiredFields.includes(k)} disabled={!shown} onCheckedChange={(v) => toggleRequired(k, v === true)} aria-label={`${def.label} required`} />
                  </td>
                  <td className="px-3 py-1">
                    {def.input === "select" ? (
                      <Select value={t.defaults[k] ?? NONE} onValueChange={(v) => setDefault(k, v === NONE ? "" : v)} disabled={!shown}>
                        <SelectTrigger size="sm" className="w-full"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NONE}>No default</SelectItem>
                          {fieldOptions(k, t.platform).map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input className="h-7" value={t.defaults[k] ?? ""} disabled={!shown} onChange={(e) => setDefault(k, e.target.value)} placeholder="No default" />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={!t.name.trim()}>Save template</Button>
      </div>
    </form>
  );
}
