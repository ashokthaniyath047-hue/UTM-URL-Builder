"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FieldLabel } from "@/components/campaign/field-control";
import { PlatformMark } from "@/components/shared/badges";
import { COUNTRIES, CURRENCIES, MARKETS, PLATFORM_LABELS } from "@/lib/domain/fields";
import { PLATFORMS, type Brand, type Platform } from "@/lib/domain/types";

export type BrandFormValues = Pick<Brand, "name" | "code" | "website" | "country" | "currency" | "defaultMarket" | "platforms"> & {
  domains: string;
};

export function brandFormErrors(v: BrandFormValues, existing: Brand[], selfId?: string) {
  const e: Partial<Record<keyof BrandFormValues, string>> = {};
  if (!v.name.trim()) e.name = "Name is required.";
  if (!/^[A-Z0-9]{2,16}$/.test(v.code)) e.code = "2–16 uppercase letters or digits.";
  else if (existing.some((b) => b.code === v.code && b.id !== selfId)) e.code = "Another brand uses this code.";
  try {
    const u = new URL(v.website);
    if (!/^https?:$/.test(u.protocol)) throw new Error();
  } catch {
    e.website = "Enter a full URL, e.g. https://www.brand.com";
  }
  if (v.platforms.length === 0) e.platforms = "Enable at least one platform.";
  return e;
}

export function BrandForm({
  initial,
  existing,
  selfId,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial: BrandFormValues;
  existing: Brand[];
  selfId?: string;
  submitLabel: string;
  onSubmit: (v: BrandFormValues) => void;
  onCancel?: () => void;
}) {
  const [v, setV] = useState(initial);
  const [touched, setTouched] = useState(false);
  const errors = brandFormErrors(v, existing, selfId);
  const show = (k: keyof BrandFormValues) => touched && errors[k] && <p className="mt-1 text-xs text-destructive">{errors[k]}</p>;
  const set = <K extends keyof BrandFormValues>(k: K, val: BrandFormValues[K]) => setV((x) => ({ ...x, [k]: val }));

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        setTouched(true);
        if (Object.keys(errors).length === 0) onSubmit(v);
      }}
    >
      <div className="grid grid-cols-2 gap-4">
        <div>
          <FieldLabel htmlFor="b-name" required>Name</FieldLabel>
          <Input
            id="b-name"
            value={v.name}
            onChange={(e) => {
              const name = e.target.value;
              setV((x) => ({
                ...x,
                name,
                code: !selfId && (x.code === "" || x.code === x.name.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 16))
                  ? name.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 16)
                  : x.code,
              }));
            }}
            autoFocus={!selfId}
          />
          {show("name")}
        </div>
        <div>
          <FieldLabel htmlFor="b-code" required hint="Used as {BRAND}">Naming code</FieldLabel>
          <Input id="b-code" value={v.code} onChange={(e) => set("code", e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))} className="font-mono" />
          {show("code")}
        </div>
        <div>
          <FieldLabel htmlFor="b-web" required>Website</FieldLabel>
          <Input id="b-web" value={v.website} onChange={(e) => set("website", e.target.value)} placeholder="https://" className="font-mono text-[12.5px]" />
          {show("website")}
        </div>
        <div>
          <FieldLabel htmlFor="b-domains" hint="Comma separated">Other domains</FieldLabel>
          <Input id="b-domains" value={v.domains} onChange={(e) => set("domains", e.target.value)} placeholder="shop.brand.com, marketplace.com" className="font-mono text-[12.5px]" />
        </div>
        <div>
          <FieldLabel>Country</FieldLabel>
          <Select value={v.country} onValueChange={(x) => set("country", x)}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>{COUNTRIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel>Currency</FieldLabel>
            <Select value={v.currency} onValueChange={(x) => set("currency", x)}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>{CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <FieldLabel>Default market</FieldLabel>
            <Select value={v.defaultMarket} onValueChange={(x) => set("defaultMarket", x)}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>{MARKETS.map((m) => <SelectItem key={m.value} value={m.value}>{m.value} · {m.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
      </div>
      <div>
        <FieldLabel required>Platforms</FieldLabel>
        <div className="flex gap-4">
          {PLATFORMS.map((p: Platform) => (
            <Label key={p} className="flex items-center gap-2 font-normal">
              <Checkbox
                checked={v.platforms.includes(p)}
                onCheckedChange={(on) => set("platforms", on ? [...v.platforms, p] : v.platforms.filter((x) => x !== p))}
              />
              <PlatformMark platform={p} /> {PLATFORM_LABELS[p]}
            </Label>
          ))}
        </div>
        {show("platforms")}
        <p className="mt-1 text-xs text-muted-foreground">Enabling a platform creates default naming and UTM rules you can edit.</p>
      </div>
      <div className="flex justify-end gap-2">
        {onCancel && <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>}
        <Button type="submit">{submitLabel}</Button>
      </div>
    </form>
  );
}

export const domainsToList = (s: string) =>
  s.split(",").map((d) => d.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "")).filter(Boolean);
