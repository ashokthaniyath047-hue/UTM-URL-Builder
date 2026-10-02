"use client";

import { AlertTriangle, ArrowUpRight, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ValidationIssue, ValidationResult } from "@/lib/engine/validation";

const ICON = {
  pass: <CheckCircle2 className="size-4 text-emerald-600" />,
  warn: <AlertTriangle className="size-4 text-amber-500" />,
  fail: <XCircle className="size-4 text-destructive" />,
};

export function ValidationSummary({ result }: { result: ValidationResult }) {
  if (result.ok && result.warnings === 0)
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-emerald-700">
        <CheckCircle2 className="size-4" /> All checks passed
      </span>
    );
  return (
    <span className="inline-flex items-center gap-3 text-sm">
      {result.errors > 0 && (
        <span className="inline-flex items-center gap-1 text-destructive">
          <XCircle className="size-4" /> {result.errors} error{result.errors > 1 && "s"}
        </span>
      )}
      {result.warnings > 0 && (
        <span className="inline-flex items-center gap-1 text-amber-700">
          <AlertTriangle className="size-4" /> {result.warnings} warning{result.warnings > 1 && "s"}
        </span>
      )}
    </span>
  );
}

/** Checklist of validation checks; each issue links to its field via `onIssueClick`. */
export function ValidationPanel({
  result,
  onIssueClick,
  className,
}: {
  result: ValidationResult;
  onIssueClick?: (issue: ValidationIssue) => void;
  className?: string;
}) {
  return (
    <ul className={cn("divide-y rounded-lg border", className)}>
      {result.checks.map((check) => (
        <li key={check.key} className="px-3 py-2">
          <div className="flex items-center gap-2 text-sm">
            {ICON[check.status]}
            <span className={cn(check.status === "pass" && "text-foreground/80")}>{check.label}</span>
          </div>
          {check.issues.length > 0 && (
            <ul className="mt-1 ml-6 space-y-0.5">
              {check.issues.map((issue) => (
                <li key={issue.id}>
                  <button
                    type="button"
                    disabled={!onIssueClick}
                    onClick={() => onIssueClick?.(issue)}
                    className={cn(
                      "group inline-flex items-start gap-1 text-left text-xs",
                      issue.severity === "error" ? "text-destructive" : "text-amber-800",
                      onIssueClick && "hover:underline",
                    )}
                  >
                    {issue.message}
                    {onIssueClick && <ArrowUpRight className="mt-px size-3 shrink-0 opacity-60 group-hover:opacity-100" />}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ul>
  );
}
