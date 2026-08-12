import { AnimatePresence, motion } from "framer-motion";
import { Building2, Calendar, Filter, Layers, MapPin, X, Zap } from "lucide-react";
import { type Customer } from "@/data/customersStore";
import {
  type CustomerFilters,
  emptyCustomerFilters,
  uniqueValues,
  withAllOption,
} from "@/lib/customerFilters";
import { CrmSelect } from "@/components/crm/CrmSelect";

const inputCls =
  "h-10 w-full rounded-xl border bg-muted/40 px-3.5 text-sm outline-none transition focus:bg-card focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/60";

const labelCls =
  "mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground";

interface CustomerFilterButtonProps {
  rows: Customer[];
  sourceOptions: string[];
  filters: CustomerFilters;
  onChange: (filters: CustomerFilters) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeFilterCount: number;
}

export function CustomerFilterButton({
  rows,
  sourceOptions,
  filters,
  onChange,
  open,
  onOpenChange,
  activeFilterCount,
}: CustomerFilterButtonProps) {
  function setFilter<K extends keyof CustomerFilters>(field: K, value: CustomerFilters[K]) {
    onChange({ ...filters, [field]: value });
  }

  const cityOptions = uniqueValues(rows, (r) => r.city);
  const panelBrandOptions = uniqueValues(rows, (r) => r.panelBrand);
  const inverterBrandOptions = uniqueValues(rows, (r) => r.inverterBrand);
  const circleOptions = uniqueValues(rows, (r) => r.circle);
  const divisionOptions = uniqueValues(rows, (r) => r.division);
  const subDivisionOptions = uniqueValues(rows, (r) => r.subDivision);
  const discomOptions = uniqueValues(rows, (r) => r.discom);

  return (
    <>
      <button
        onClick={() => onOpenChange(true)}
        className={`inline-flex h-10 items-center gap-2 rounded-lg border px-3 text-sm font-medium transition ${
          activeFilterCount > 0
            ? "border-primary bg-primary-soft text-primary"
            : "bg-card hover:bg-muted"
        }`}
      >
        <Filter className="h-4 w-4" /> Filter
        {activeFilterCount > 0 && (
          <span className="grid h-5 w-5 place-items-center rounded-full bg-primary text-[10px] font-bold text-white">
            {activeFilterCount}
          </span>
        )}
      </button>
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="filter-bg"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
              onClick={() => onOpenChange(false)}
            />
            <motion.div
              key="filter-panel"
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 16 }}
              transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="fixed inset-x-4 top-1/2 z-50 mx-auto flex max-h-[85vh] w-full max-w-3xl -translate-y-1/2 flex-col overflow-hidden rounded-2xl border bg-card shadow-2xl"
            >
              <div className="flex shrink-0 items-center justify-between border-b px-6 py-4">
                <h4 className="text-sm font-bold">Filter Customers</h4>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => onOpenChange(false)}
                    className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="grid flex-1 grid-cols-1 gap-x-4 gap-y-4 overflow-y-auto px-6 py-5 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <label className={labelCls}>
                    <Layers className="h-3.5 w-3.5" /> Source
                  </label>
                  <CrmSelect
                    value={filters.source || "__all__"}
                    onValueChange={(v) => setFilter("source", v === "__all__" ? "" : v)}
                    options={withAllOption(sourceOptions, "All Sources")}
                  />
                </div>

                <div>
                  <label className={labelCls}>
                    <Zap className="h-3.5 w-3.5" /> Phase
                  </label>
                  <div className="flex gap-2 pt-1">
                    {[
                      { label: "All", val: "" as const },
                      { label: "Single", val: "single" as const },
                      { label: "Three", val: "three" as const },
                    ].map((opt) => (
                      <button
                        key={opt.label}
                        type="button"
                        onClick={() => setFilter("phase", opt.val)}
                        className={`flex-1 rounded-xl border py-2 text-xs font-semibold transition-all ${
                          filters.phase === opt.val
                            ? "gradient-primary text-white border-transparent shadow-glow"
                            : "bg-muted/60 text-muted-foreground border-border hover:bg-muted"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className={labelCls}>
                    <MapPin className="h-3.5 w-3.5" /> City
                  </label>
                  <CrmSelect
                    value={filters.city || "__all__"}
                    onValueChange={(v) => setFilter("city", v === "__all__" ? "" : v)}
                    options={withAllOption(cityOptions, "All Cities")}
                  />
                </div>

                <div>
                  <label className={labelCls}>
                    <Zap className="h-3.5 w-3.5" /> System Capacity (kW)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={filters.kwMin}
                      onChange={(e) => setFilter("kwMin", e.target.value)}
                      placeholder="Min"
                      className={inputCls}
                    />
                    <span className="text-xs text-muted-foreground">to</span>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={filters.kwMax}
                      onChange={(e) => setFilter("kwMax", e.target.value)}
                      placeholder="Max"
                      className={inputCls}
                    />
                  </div>
                </div>

                <div>
                  <label className={labelCls}>
                    <Zap className="h-3.5 w-3.5" /> Wp (Watt Peak)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={filters.wpMin}
                      onChange={(e) => setFilter("wpMin", e.target.value)}
                      placeholder="Min"
                      className={inputCls}
                    />
                    <span className="text-xs text-muted-foreground">to</span>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={filters.wpMax}
                      onChange={(e) => setFilter("wpMax", e.target.value)}
                      placeholder="Max"
                      className={inputCls}
                    />
                  </div>
                </div>

                <div>
                  <label className={labelCls}>
                    <Layers className="h-3.5 w-3.5" /> No. of Panels
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      value={filters.panelsMin}
                      onChange={(e) => setFilter("panelsMin", e.target.value)}
                      placeholder="Min"
                      className={inputCls}
                    />
                    <span className="text-xs text-muted-foreground">to</span>
                    <input
                      type="number"
                      min="0"
                      value={filters.panelsMax}
                      onChange={(e) => setFilter("panelsMax", e.target.value)}
                      placeholder="Max"
                      className={inputCls}
                    />
                  </div>
                </div>

                <div>
                  <label className={labelCls}>
                    <Layers className="h-3.5 w-3.5" /> Panel Make
                  </label>
                  <CrmSelect
                    value={filters.panelBrand || "__all__"}
                    onValueChange={(v) => setFilter("panelBrand", v === "__all__" ? "" : v)}
                    options={withAllOption(panelBrandOptions, "All Panel Makes")}
                  />
                </div>

                <div>
                  <label className={labelCls}>
                    <Zap className="h-3.5 w-3.5" /> Inverter Make
                  </label>
                  <CrmSelect
                    value={filters.inverterBrand || "__all__"}
                    onValueChange={(v) => setFilter("inverterBrand", v === "__all__" ? "" : v)}
                    options={withAllOption(inverterBrandOptions, "All Inverter Makes")}
                  />
                </div>

                <div>
                  <label className={labelCls}>
                    <Zap className="h-3.5 w-3.5" /> Inverter KW
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={filters.inverterKwMin}
                      onChange={(e) => setFilter("inverterKwMin", e.target.value)}
                      placeholder="Min"
                      className={inputCls}
                    />
                    <span className="text-xs text-muted-foreground">to</span>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={filters.inverterKwMax}
                      onChange={(e) => setFilter("inverterKwMax", e.target.value)}
                      placeholder="Max"
                      className={inputCls}
                    />
                  </div>
                </div>

                <div>
                  <label className={labelCls}>
                    <Calendar className="h-3.5 w-3.5" /> PDC Facility
                  </label>
                  <div className="flex gap-2 pt-1">
                    {[
                      { label: "All", val: "" as const },
                      { label: "Yes", val: "Yes" as const },
                      { label: "No", val: "No" as const },
                    ].map((opt) => (
                      <button
                        key={opt.label}
                        type="button"
                        onClick={() => setFilter("pdc", opt.val)}
                        className={`flex-1 rounded-xl border py-2 text-xs font-semibold transition-all ${
                          filters.pdc === opt.val
                            ? "gradient-primary text-white border-transparent shadow-glow"
                            : "bg-muted/60 text-muted-foreground border-border hover:bg-muted"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className={labelCls}>
                    <Zap className="h-3.5 w-3.5" /> Installation Type
                  </label>
                  <CrmSelect
                    value={filters.installType || "__all__"}
                    onValueChange={(v) => setFilter("installType", v === "__all__" ? "" : v)}
                    options={withAllOption(["On-grid", "Off-grid", "Hybrid"], "All Types")}
                  />
                </div>

                <div>
                  <label className={labelCls}>
                    <Building2 className="h-3.5 w-3.5" /> Discom
                  </label>
                  <CrmSelect
                    value={filters.discom || "__all__"}
                    onValueChange={(v) => setFilter("discom", v === "__all__" ? "" : v)}
                    options={withAllOption(discomOptions, "All Discoms")}
                  />
                </div>

                <div>
                  <label className={labelCls}>
                    <MapPin className="h-3.5 w-3.5" /> Circle
                  </label>
                  <CrmSelect
                    value={filters.circle || "__all__"}
                    onValueChange={(v) => setFilter("circle", v === "__all__" ? "" : v)}
                    options={withAllOption(circleOptions, "All Circles")}
                  />
                </div>

                <div>
                  <label className={labelCls}>
                    <MapPin className="h-3.5 w-3.5" /> Division
                  </label>
                  <CrmSelect
                    value={filters.division || "__all__"}
                    onValueChange={(v) => setFilter("division", v === "__all__" ? "" : v)}
                    options={withAllOption(divisionOptions, "All Divisions")}
                  />
                </div>

                <div>
                  <label className={labelCls}>
                    <MapPin className="h-3.5 w-3.5" /> Sub-Division
                  </label>
                  <CrmSelect
                    value={filters.subDivision || "__all__"}
                    onValueChange={(v) => setFilter("subDivision", v === "__all__" ? "" : v)}
                    options={withAllOption(subDivisionOptions, "All Sub-Divisions")}
                  />
                </div>
              </div>

              <div className="flex shrink-0 items-center justify-end gap-3 border-t px-6 py-4">
                {activeFilterCount > 0 && (
                  <button
                    onClick={() => onChange({ ...emptyCustomerFilters })}
                    className="text-xs font-semibold text-muted-foreground hover:text-destructive"
                  >
                    Clear all
                  </button>
                )}
                <button
                  onClick={() => onOpenChange(false)}
                  className="rounded-xl gradient-primary px-5 py-2.5 text-sm font-semibold text-white shadow-glow transition hover:opacity-95 active:scale-[0.98]"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
