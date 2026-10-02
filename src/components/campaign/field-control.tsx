"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FIELD_DEFS, fieldOptions } from "@/lib/domain/fields";
import type { CampaignFieldKey, Platform } from "@/lib/domain/types";
import { fieldAnchor } from "@/lib/engine/validation";
import { cn } from "@/lib/utils";

export function FieldLabel({
  htmlFor,
  children,
  required,
  hint,
}: {
  htmlFor?: string;
  children: React.ReactNode;
  required?: boolean;
  hint?: React.ReactNode;
}) {
  return (
    <div className="mb-1.5 flex items-baseline justify-between gap-2">
      <Label htmlFor={htmlFor} className="text-[13px] font-medium">
        {children}
        {required && <span className="text-destructive">*</span>}
      </Label>
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </div>
  );
}

export function FieldControl({
  field,
  platform,
  value,
  onChange,
  required,
  error,
  currency,
}: {
  field: CampaignFieldKey;
  platform: Platform;
  value: string | undefined;
  onChange: (v: string) => void;
  required?: boolean;
  error?: string;
  currency?: string;
}) {
  const def = FIELD_DEFS[field];
  const id = fieldAnchor(field);
  const label = field === "budget" && currency ? `${def.label} (${currency})` : def.label;

  return (
    <div>
      <FieldLabel htmlFor={id} required={required}>
        {label}
      </FieldLabel>
      {def.input === "select" ? (
        <Select value={value ?? ""} onValueChange={onChange}>
          <SelectTrigger id={id} className="w-full" aria-invalid={!!error || undefined}>
            <SelectValue placeholder={`Select ${def.label.toLowerCase()}`} />
          </SelectTrigger>
          <SelectContent>
            {fieldOptions(field, platform).map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <Input
          id={id}
          type={def.input === "number" ? "number" : "text"}
          inputMode={def.input === "number" ? "decimal" : undefined}
          min={def.input === "number" ? 0 : undefined}
          value={value ?? ""}
          placeholder={def.placeholder}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={!!error || undefined}
          className={cn(def.input === "number" && "tabular")}
        />
      )}
      {error ? (
        <p className="mt-1 text-xs text-destructive">{error}</p>
      ) : (
        def.help && <p className="mt-1 text-xs text-muted-foreground">{def.help}</p>
      )}
    </div>
  );
}
