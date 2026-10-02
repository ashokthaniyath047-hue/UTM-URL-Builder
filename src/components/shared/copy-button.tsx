"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { copyText } from "@/lib/utils/clipboard";

export function CopyButton({
  value,
  label,
  toast = "Copied",
  size = "sm",
  variant = "outline",
  disabled,
  iconOnly,
}: {
  value: string;
  label?: string;
  toast?: string;
  size?: "sm" | "xs" | "default" | "icon-sm" | "icon-xs";
  variant?: "outline" | "ghost" | "default" | "secondary";
  disabled?: boolean;
  iconOnly?: boolean;
}) {
  const [done, setDone] = useState(false);
  const onClick = async () => {
    if (await copyText(value, toast)) {
      setDone(true);
      setTimeout(() => setDone(false), 1500);
    }
  };
  const Icon = done ? Check : Copy;
  if (iconOnly) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button type="button" size={size} variant={variant} onClick={onClick} disabled={disabled || !value} aria-label={label ?? "Copy"}>
            <Icon />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{label ?? "Copy"}</TooltipContent>
      </Tooltip>
    );
  }
  return (
    <Button type="button" size={size} variant={variant} onClick={onClick} disabled={disabled || !value}>
      <Icon />
      {label ?? "Copy"}
    </Button>
  );
}
