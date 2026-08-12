import { useMemo, useState } from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export type SelectOption = {
  value: string;
  label: string;
  description?: string;
};

interface CrmSelectProps {
  value: string;
  onValueChange: (v: string) => void;
  options: SelectOption[];
  placeholder?: string;
  error?: boolean;
  className?: string;
  /** Force the search box on/off. Defaults to showing it once there are enough options to need one. */
  searchable?: boolean;
  disabled?: boolean;
}

const SEARCH_THRESHOLD = 6;

export function CrmSelect({
  value,
  onValueChange,
  options,
  placeholder = "Select…",
  error,
  className,
  searchable,
  disabled,
}: CrmSelectProps) {
  const [query, setQuery] = useState("");
  const selected = options.find((o) => o.value === value);
  const showSearch = searchable ?? options.length > SEARCH_THRESHOLD;

  const filtered = useMemo(() => {
    if (!showSearch || !query.trim()) return options;
    const q = query.trim().toLowerCase();
    return options.filter(
      (o) => o.label.toLowerCase().includes(q) || o.description?.toLowerCase().includes(q),
    );
  }, [options, query, showSearch]);

  return (
    <SelectPrimitive.Root
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      onOpenChange={(open) => {
        if (!open) setQuery("");
      }}
    >
      <SelectPrimitive.Trigger
        className={cn(
          "flex h-10 w-full items-center justify-between gap-2 rounded-xl border bg-muted/40 px-3.5 text-sm outline-none transition",
          "focus:bg-card focus:border-primary focus:ring-2 focus:ring-primary/20",
          "hover:bg-card data-[state=open]:bg-card data-[state=open]:border-primary data-[state=open]:ring-2 data-[state=open]:ring-primary/20",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "data-[placeholder]:text-muted-foreground/60",
          error ? "border-destructive" : "border-border",
          className,
        )}
      >
        <SelectPrimitive.Value placeholder={placeholder}>
          {selected ? (
            <span className="text-foreground">{selected.label}</span>
          ) : (
            <span className="text-muted-foreground/60">{placeholder}</span>
          )}
        </SelectPrimitive.Value>
        <SelectPrimitive.Icon asChild>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>

      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={6}
          className={cn(
            "z-50 flex min-w-[var(--radix-select-trigger-width)] flex-col overflow-hidden",
            "rounded-2xl border bg-card shadow-2xl",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
            "data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2",
            "origin-[--radix-select-content-transform-origin]",
          )}
          style={{ maxHeight: "min(var(--radix-select-content-available-height), 320px)" }}
        >
          {showSearch && (
            <div className="shrink-0 border-b p-2" onKeyDown={(e) => e.stopPropagation()}>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search…"
                  className="h-9 w-full rounded-lg border bg-muted/40 pl-8 pr-3 text-sm outline-none transition focus:bg-card focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>
          )}

          <SelectPrimitive.ScrollUpButton className="flex cursor-default items-center justify-center py-1 text-muted-foreground">
            <ChevronDown className="h-4 w-4 rotate-180" />
          </SelectPrimitive.ScrollUpButton>

          <SelectPrimitive.Viewport className="min-h-0 flex-1 overflow-y-auto p-1.5">
            {filtered.length === 0 ? (
              <p className="px-3 py-6 text-center text-xs text-muted-foreground">
                No matches found.
              </p>
            ) : (
              filtered.map((opt) => (
                <SelectPrimitive.Item
                  key={opt.value}
                  value={opt.value}
                  className={cn(
                    "relative flex w-full cursor-pointer select-none items-center rounded-xl px-3 py-2.5 text-sm outline-none transition-colors",
                    "focus:bg-primary-soft focus:text-primary",
                    "data-[state=checked]:bg-primary-soft data-[state=checked]:text-primary data-[state=checked]:font-semibold",
                    "data-[disabled]:pointer-events-none data-[disabled]:opacity-40",
                  )}
                >
                  <SelectPrimitive.ItemText>
                    <span className="block leading-snug">{opt.label}</span>
                    {opt.description && (
                      <span className="block text-[11px] font-normal text-muted-foreground">
                        {opt.description}
                      </span>
                    )}
                  </SelectPrimitive.ItemText>
                  <SelectPrimitive.ItemIndicator className="absolute right-3 flex items-center">
                    <div className="grid h-4 w-4 place-items-center rounded-full bg-primary">
                      <Check className="h-2.5 w-2.5 text-white" />
                    </div>
                  </SelectPrimitive.ItemIndicator>
                </SelectPrimitive.Item>
              ))
            )}
          </SelectPrimitive.Viewport>

          <SelectPrimitive.ScrollDownButton className="flex cursor-default items-center justify-center py-1 text-muted-foreground">
            <ChevronDown className="h-4 w-4" />
          </SelectPrimitive.ScrollDownButton>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
