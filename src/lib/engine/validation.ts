/**
 * Campaign validation. Each issue carries the wizard step + field anchor so the UI can
 * link directly to the problem.
 */
import { FIELD_DEFS } from "@/lib/domain/fields";
import type { UtmKey } from "@/lib/domain/types";
import type { ComputedCampaign } from "./campaign";
import { fieldForVariable, NAMING_VARIABLE_MAP } from "./naming";
import { duplicateUtmKeys } from "./url";
import { validateTracking } from "./utm";

export type WizardStep = 1 | 2 | 3 | 4 | 5 | 6;

export const WIZARD_STEPS: { step: WizardStep; key: string; label: string }[] = [
  { step: 1, key: "brand", label: "Brand" },
  { step: 2, key: "platform", label: "Platform" },
  { step: 3, key: "template", label: "Template" },
  { step: 4, key: "campaign", label: "Campaign" },
  { step: 5, key: "tracking", label: "Tracking" },
  { step: 6, key: "review", label: "Review" },
];

export type CheckKey = "brand" | "platform" | "template" | "required" | "landingUrl" | "naming" | "utm" | "duplicates";

export interface ValidationIssue {
  id: string;
  check: CheckKey;
  severity: "error" | "warning";
  message: string;
  step: WizardStep;
  /** DOM id of the field to focus. */
  anchor?: string;
}

export interface ValidationCheck {
  key: CheckKey;
  label: string;
  status: "pass" | "warn" | "fail";
  issues: ValidationIssue[];
}

export interface ValidationResult {
  checks: ValidationCheck[];
  issues: ValidationIssue[];
  errors: number;
  warnings: number;
  /** True when there are no errors (warnings allowed) — required for Ready. */
  ok: boolean;
}

export const CHECK_LABELS: Record<CheckKey, string> = {
  brand: "Brand",
  platform: "Platform",
  template: "Template",
  required: "Required fields",
  landingUrl: "Valid landing URL",
  naming: "Naming convention",
  utm: "UTM validity",
  duplicates: "No duplicate UTM parameters",
};

export const fieldAnchor = (key: string) => `field-${key}`;
export const utmAnchor = (key: UtmKey) => `utm-${key}`;

export function validateComputed(c: Omit<ComputedCampaign, "validation" | "generatedUrl">): ValidationResult {
  const issues: ValidationIssue[] = [];
  let n = 0;
  const add = (i: Omit<ValidationIssue, "id">) => issues.push({ ...i, id: `${i.check}-${n++}` });

  // Brand
  if (!c.brand) add({ check: "brand", severity: "error", message: "Select a brand.", step: 1, anchor: "step-brand" });
  else if (c.brand.archived) add({ check: "brand", severity: "error", message: `${c.brand.name} is archived.`, step: 1 });

  // Platform
  if (c.brand && !c.brand.platforms.includes(c.draft.platform)) {
    add({ check: "platform", severity: "error", message: `${c.brand.name} is not enabled for this platform.`, step: 2 });
  }

  // Template
  if (c.draft.templateId && !c.template) {
    add({ check: "template", severity: "error", message: "The selected template no longer exists.", step: 3 });
  } else if (!c.draft.templateId) {
    add({ check: "template", severity: "error", message: "Choose a template or start from scratch.", step: 3 });
  } else if (c.template && c.template.platform !== c.draft.platform) {
    add({ check: "template", severity: "error", message: "Template belongs to another platform.", step: 3 });
  }

  // Required fields
  for (const key of c.resolved.required) {
    if (!c.draft.fields[key]?.toString().trim()) {
      add({
        check: "required",
        severity: "error",
        message: `${FIELD_DEFS[key].label} is required.`,
        step: 4,
        anchor: fieldAnchor(key),
      });
    }
  }
  if (c.draft.fields.budget && !(Number(c.draft.fields.budget) > 0)) {
    add({ check: "required", severity: "error", message: "Budget must be a positive number.", step: 4, anchor: fieldAnchor("budget") });
  }

  // Landing URL
  if (!c.parsedUrl.valid) {
    add({
      check: "landingUrl",
      severity: "error",
      message: c.parsedUrl.error ?? "Landing URL is invalid.",
      step: 4,
      anchor: fieldAnchor("landingUrl"),
    });
  } else {
    for (const w of c.parsedUrl.warnings) {
      if (w.code === "duplicate_param" && w.param?.startsWith("utm_")) continue; // reported under duplicates
      add({ check: "landingUrl", severity: "warning", message: w.message, step: 4, anchor: fieldAnchor("landingUrl") });
    }
  }

  // Naming
  if (c.brand && !c.rules.namingRule) {
    add({ check: "naming", severity: "error", message: `No ${c.draft.platform} naming rule configured for ${c.brand.name}.`, step: 5 });
  }
  if (!c.name.trim()) {
    add({ check: "naming", severity: "error", message: "Campaign name is empty.", step: 5, anchor: fieldAnchor("name") });
  }
  if (c.nameIsGenerated && c.naming) {
    for (const v of c.naming.missing) {
      const field = fieldForVariable(v);
      if (field && c.resolved.required.includes(field)) continue; // already reported as required
      const visible = field && c.resolved.fields.includes(field);
      add({
        check: "naming",
        severity: "error",
        message: `Naming rule needs {${v}} but ${field ? FIELD_DEFS[field].label : NAMING_VARIABLE_MAP[v].label} is empty.`,
        step: visible ? 4 : 5,
        anchor: visible ? fieldAnchor(field) : fieldAnchor("name"),
      });
    }
  }
  if (c.rules.namingRule && c.name.length > c.rules.namingRule.maxLength) {
    add({
      check: "naming",
      severity: "error",
      message: `Name is ${c.name.length} characters (limit ${c.rules.namingRule.maxLength}).`,
      step: 5,
      anchor: fieldAnchor("name"),
    });
  }
  if (!c.nameIsGenerated) {
    add({
      check: "naming",
      severity: "warning",
      message: "Name was edited manually and may not follow the brand convention.",
      step: 5,
      anchor: fieldAnchor("name"),
    });
  }

  // UTM
  if (c.brand && !c.rules.utmRule) {
    add({ check: "utm", severity: "error", message: `No ${c.draft.platform} UTM rule configured for ${c.brand.name}.`, step: 5 });
  }
  if (c.rules.utmRule) {
    for (const i of validateTracking(c.tracking.params, c.rules.utmRule)) {
      add({ check: "utm", severity: i.severity, message: i.message, step: 5, anchor: utmAnchor(i.key) });
    }
  }
  if (c.built.skipped.length) {
    add({
      check: "utm",
      severity: "warning",
      message: `Kept existing ${c.built.skipped.map((k) => `utm_${k}`).join(", ")} from the landing URL instead of the generated value.`,
      step: 5,
      anchor: fieldAnchor("existingPolicy"),
    });
  }

  // Duplicates (in the final URL)
  if (c.built.url) {
    const dups = duplicateUtmKeys(c.built.url);
    for (const d of dups) {
      add({ check: "duplicates", severity: "error", message: `${d} appears more than once in the generated URL.`, step: 5 });
    }
  }

  const checks: ValidationCheck[] = (Object.keys(CHECK_LABELS) as CheckKey[]).map((key) => {
    const ci = issues.filter((i) => i.check === key);
    const status = ci.some((i) => i.severity === "error") ? "fail" : ci.length ? "warn" : "pass";
    return { key, label: CHECK_LABELS[key], status, issues: ci };
  });

  const errors = issues.filter((i) => i.severity === "error").length;
  return { checks, issues, errors, warnings: issues.length - errors, ok: errors === 0 };
}
