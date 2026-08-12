"use client";

import { useState, useEffect, useRef } from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";

const inputCls =
  "h-10 w-full rounded-xl border bg-muted/40 px-3.5 text-sm outline-none transition focus:bg-card focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/60";

const calClassNames = {
  months: "flex flex-col gap-3",
  month: "flex flex-col gap-3",
  nav: "absolute inset-x-0 top-0 flex items-center justify-between",
  button_previous: "h-7 w-7 rounded-lg border bg-card text-muted-foreground hover:bg-muted hover:text-foreground transition-colors flex items-center justify-center",
  button_next:     "h-7 w-7 rounded-lg border bg-card text-muted-foreground hover:bg-muted hover:text-foreground transition-colors flex items-center justify-center",
  month_caption: "flex h-7 items-center justify-center",
  caption_label: "text-sm font-bold",
  weekdays: "flex gap-0.5 mb-1",
  weekday: "flex-1 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground py-1",
  week: "flex gap-0.5",
  day: "flex-1 aspect-square",
  today: "bg-primary text-white rounded-lg font-bold",
  outside: "opacity-30",
  disabled: "opacity-25 cursor-not-allowed",
};

export function isoToDisplay(iso: string) {
  if (!iso) return "";
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
}

export function tryParseDate(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;

  const dmy = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/);
  if (dmy) {
    const year = dmy[3].length === 2 ? 2000 + +dmy[3] : +dmy[3];
    const d = new Date(year, +dmy[2] - 1, +dmy[1]);
    if (!isNaN(d.getTime()) && d.getMonth() === +dmy[2] - 1)
      return `${year}-${String(+dmy[2]).padStart(2, "0")}-${String(+dmy[1]).padStart(2, "0")}`;
  }

  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) {
    const d = new Date(+iso[1], +iso[2] - 1, +iso[3]);
    if (!isNaN(d.getTime())) return s;
  }

  const native = new Date(s);
  if (!isNaN(native.getTime())) {
    const local = new Date(native.getTime() - native.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
  }
  return null;
}

function toLocalIso(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

export function DatePicker({
  value,
  onChange,
  error,
  label = "Select Date",
  placeholder = "DD/MM/YYYY",
  disabled = false,
}: {
  value: string;
  onChange: (v: string) => void;
  error?: boolean;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [inputText, setInputText] = useState(() => isoToDisplay(value));
  const skipSync = useRef(false);

  useEffect(() => {
    if (skipSync.current) { skipSync.current = false; return; }
    setInputText(isoToDisplay(value));
  }, [value]);

  function applyDate(iso: string) {
    skipSync.current = true;
    onChange(iso);
    setInputText(isoToDisplay(iso));
    setOpen(false);
  }

  function handleTextChange(raw: string) {
    const digits = raw.replace(/\D/g, "").slice(0, 8);
    let formatted = digits;
    if (digits.length > 4) formatted = digits.slice(0, 2) + "/" + digits.slice(2, 4) + "/" + digits.slice(4);
    else if (digits.length > 2) formatted = digits.slice(0, 2) + "/" + digits.slice(2);

    setInputText(formatted);
    if (!digits) { skipSync.current = true; onChange(""); return; }
    if (digits.length === 8) {
      const iso = tryParseDate(formatted);
      if (iso) { skipSync.current = true; onChange(iso); }
    }
  }

  const selected = value ? new Date(value + "T00:00:00") : undefined;

  return (
    <>
      <div className="relative">
        <input
          type="text"
          value={inputText}
          onChange={e => handleTextChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={[inputCls, "pr-10", error ? "border-destructive" : "", disabled ? "opacity-60 cursor-not-allowed" : ""].join(" ")}
        />
        <button
          type="button"
          tabIndex={-1}
          title="Open calendar"
          onClick={() => !disabled && setOpen(true)}
          disabled={disabled}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 grid h-6 w-6 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-primary disabled:pointer-events-none disabled:opacity-50"
        >
          <CalendarIcon className="h-3.5 w-3.5" />
        </button>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px]" />
          <div
            className="relative z-10 w-[280px] overflow-hidden rounded-2xl border bg-card shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="relative flex items-center justify-center border-b px-4 py-2.5">
              <div className="flex items-center gap-2">
                <div className="grid h-6 w-6 place-items-center rounded-lg bg-primary-soft">
                  <CalendarIcon className="h-3 w-3 text-primary" />
                </div>
                <span className="text-[13px] font-semibold">{label}</span>
              </div>
              {value && (
                <button
                  type="button"
                  onClick={() => { onChange(""); setInputText(""); setOpen(false); }}
                  className="absolute right-3 rounded-lg px-2 py-1 text-[11px] font-semibold text-muted-foreground hover:bg-muted transition-colors"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Calendar */}
            <div className="p-2 [--cell-size:1.875rem]">
              <Calendar
                mode="single"
                selected={selected}
                onSelect={date => { if (date) applyDate(toLocalIso(date)); }}
                initialFocus
                classNames={calClassNames}
              />
            </div>

            {/* Quick buttons */}
            <div className="flex gap-1.5 border-t px-2.5 py-2">
              {[
                { label: "Today",    days: 0 },
                { label: "Tomorrow", days: 1 },
                { label: "+3 Days",  days: 3 },
                { label: "+7 Days",  days: 7 },
              ].map(({ label, days }) => (
                <button key={label} type="button"
                  onClick={() => { const d = new Date(); d.setDate(d.getDate() + days); applyDate(toLocalIso(d)); }}
                  className="flex-1 rounded-lg border bg-muted/40 py-1.5 text-[11px] font-semibold text-muted-foreground transition-colors hover:bg-primary-soft hover:text-primary hover:border-primary/30">
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
