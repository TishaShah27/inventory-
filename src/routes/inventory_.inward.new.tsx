import { useState, useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, Plus, X, Check, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/crm/PageHeader";
import { DatePicker } from "@/components/crm/DatePicker";
import {
  getMasters,
  getGroups,
  getCats,
  getSubs,
  addMovement,
  nextInwardId,
  subscribe,
} from "@/data/inventoryStore";
import type { B2bPartner } from "@/data/inventoryStore";
import { createInwardEntry } from "@/lib/inwardService";
import { fetchAllInventory } from "@/lib/inventoryService";
import { fetchB2bPartners } from "@/lib/b2bService";
import { fetchInstallerPartners } from "@/lib/installerService";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/inventory_/inward/new")({ component: NewInwardPage });

const inputCls =
  "h-10 w-full rounded-xl border bg-muted/40 px-3.5 text-sm outline-none transition focus:bg-card focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/60";
const selectCls = inputCls + " cursor-pointer";

const GST_RATES = [5, 12, 18, 28];
type SerialMode = "scan" | "manual" | "multiple";
type MatLine = {
  id: string;
  masterId: string;
  groupId: string;
  catId: string;
  subId: string;
  qty: number;
  gstPct: number;
  price: number;
  serialMode: SerialMode;
  serialInput: string;
  serialNos: string[];
};

function uid() {
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function defaultLine(
  masters: ReturnType<typeof getMasters>,
  groups: ReturnType<typeof getGroups>,
  cats: ReturnType<typeof getCats>,
  subs: ReturnType<typeof getSubs>,
): MatLine {
  const m = masters[0]?.id ?? "";
  const g = groups.find((x) => x.masterId === m)?.id ?? "";
  const c = cats.find((x) => x.groupId === g)?.id ?? "";
  const s = subs.find((x) => x.categoryId === c)?.id ?? "";
  return {
    id: uid(),
    masterId: m,
    groupId: g,
    catId: c,
    subId: s,
    qty: 1,
    gstPct: 18,
    price: 0,
    serialMode: "scan",
    serialInput: "",
    serialNos: [],
  };
}

function NewInwardPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [, forceUpdate] = useState(0);
  useEffect(() => {
    subscribe(() => forceUpdate((n) => n + 1));
  }, []);

  const masters = getMasters();
  const groups = getGroups();
  const cats = getCats();
  const subs = getSubs();

  // Live godown stock from Supabase — used for "Current stock" display
  const { data: liveInventory } = useQuery({
    queryKey: ["inventory"],
    queryFn: fetchAllInventory,
    staleTime: 30 * 1000,
  });
  const liveSubs = liveInventory?.subs ?? [];

  const [b2bPartners, setB2bPartners] = useState<B2bPartner[]>([]);
  const [installerPartners, setInstallerPartners] = useState<B2bPartner[]>([]);
  useEffect(() => {
    fetchB2bPartners().then(setB2bPartners).catch(console.error);
    fetchInstallerPartners().then(setInstallerPartners).catch(console.error);
  }, []);

  const today = new Date().toISOString().slice(0, 10);
  const [entryMode, setEntryMode] = useState<"new" | "return">("new");
  const [invoiceDate, setInvoiceDate] = useState(today);
  const [receivedDate, setReceivedDate] = useState(today);
  const [billNumber, setBillNumber] = useState("");
  const [supplierType, setSupplierType] = useState<"b2b" | "b2i">("b2b");
  const [supplier, setSupplier] = useState("");
  const [lines, setLines] = useState<MatLine[]>(() => [defaultLine(masters, groups, cats, subs)]);

  const partnerList = supplierType === "b2b" ? b2bPartners : installerPartners;
  const selectedPartner = partnerList.find((p) => p.companyName === supplier);

  const canSave =
    billNumber.trim() &&
    supplier &&
    lines.length > 0 &&
    lines.every((l) => l.subId && l.serialNos.length === l.qty);

  function addLine() {
    setLines((p) => [...p, defaultLine(masters, groups, cats, subs)]);
  }
  function removeLine(id: string) {
    setLines((p) => p.filter((l) => l.id !== id));
  }
  function updateLine(id: string, patch: Partial<MatLine>) {
    setLines((p) => p.map((l) => (l.id !== id ? l : { ...l, ...patch })));
  }

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  async function handleSave() {
    if (!canSave || saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      const inwardId = nextInwardId();
      const entryType = entryMode === "new" ? "New Materials" : "Return Materials";
      for (const line of lines) {
        await createInwardEntry(
          {
            id: uid(),
            inwardId,
            entryType,
            invoiceDate,
            materialReceivedDate: receivedDate,
            billNumber,
            supplier,
            supplierType,
            subcategoryId: line.subId,
            qty: line.qty,
            gstPct: line.gstPct,
            price: line.price,
            serialNos: line.serialNos,
          },
          selectedPartner?.id,
        );
        addMovement({
          id: uid(),
          subcategoryId: line.subId,
          type: "in",
          qty: line.qty,
          date: receivedDate,
          ref: billNumber,
          note: "",
          invoiceDate,
          billNumber,
          materialReceivedDate: receivedDate,
          supplier,
          inwardId,
          entryType,
        });
      }
      queryClient.invalidateQueries({ queryKey: ["installerPartnerStocks"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      navigate({ to: "/inventory", search: { tab: "inward" } });
    } catch (e) {
      console.error("Failed to save inward entry:", e);
      const msg = e instanceof Error ? e.message : String(e);
      setSaveError(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
      className="space-y-6"
    >
      <PageHeader
        eyebrow="Inventory / Inward"
        title="New Inward Entry"
        description="Record new stock received from suppliers."
        actions={
          <button
            onClick={() => navigate({ to: "/inventory", search: { tab: "inward" } })}
            className="inline-flex items-center gap-2 rounded-xl border bg-card px-4 py-2.5 text-[13px] font-semibold text-muted-foreground shadow-card hover:bg-muted transition-colors"
          >
            <ChevronRight className="h-4 w-4 rotate-180" /> Back to Inward
          </button>
        }
      />

      {/* Entry type */}
      <div className="rounded-2xl border bg-card px-6 py-4 shadow-card">
        <div className="flex items-center gap-8">
          {(["new", "return"] as const).map((mode) => (
            <label key={mode} className="flex cursor-pointer items-center gap-2.5">
              <div
                onClick={() => setEntryMode(mode)}
                className={`h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all ${entryMode === mode ? "border-primary" : "border-muted-foreground/40"}`}
              >
                {entryMode === mode && <div className="h-2.5 w-2.5 rounded-full bg-primary" />}
              </div>
              <span
                className={`text-[14px] font-semibold ${entryMode === mode ? "text-primary" : "text-muted-foreground"}`}
              >
                {mode === "new" ? "New Materials" : "Return Materials"}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Material details card */}
      <div className="rounded-2xl border bg-card shadow-card overflow-hidden">
        <div className="gradient-primary px-6 py-3">
          <p className="text-[13px] font-bold text-white">Material Details</p>
        </div>
        <div className="p-6 space-y-5">
          {/* Header fields — always 4 columns */}
          <div className="grid grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                Invoice Date
              </label>
              <DatePicker value={invoiceDate} onChange={setInvoiceDate} label="Invoice Date" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                Material Received Date
              </label>
              <DatePicker value={receivedDate} onChange={setReceivedDate} label="Received Date" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                Bill Number <span className="text-red-500">*</span>
              </label>
              <input
                value={billNumber}
                onChange={(e) => setBillNumber(e.target.value)}
                placeholder="e.g. INV/26-27/001"
                className={inputCls}
              />
            </div>

            {/* Supplier — label + radios on one line, dropdown below */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-3">
                <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground shrink-0">
                  Supplier <span className="text-red-500">*</span>
                </label>
                {(["b2b", "b2i"] as const).map((type) => (
                  <label key={type} className="flex cursor-pointer items-center gap-1">
                    <div
                      onClick={() => {
                        setSupplierType(type);
                        setSupplier("");
                      }}
                      className={`h-3.5 w-3.5 rounded-full border-2 flex items-center justify-center transition-all ${supplierType === type ? "border-primary" : "border-muted-foreground/40"}`}
                    >
                      {supplierType === type && (
                        <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                      )}
                    </div>
                    <span
                      className={`text-[11px] font-semibold ${supplierType === type ? "text-primary" : "text-muted-foreground"}`}
                    >
                      {type === "b2i" ? "INSTALLER" : type.toUpperCase()}
                    </span>
                  </label>
                ))}
              </div>
              <select
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                className={selectCls}
              >
                <option value="">
                  Select {supplierType === "b2i" ? "INSTALLER" : supplierType.toUpperCase()}…
                </option>
                {partnerList.map((p) => (
                  <option key={p.id} value={p.companyName}>
                    {p.companyName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Material lines — only after bill + supplier filled */}
          <AnimatePresence>
            {billNumber.trim() && supplier && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                  Materials
                </p>

                {lines.map((line, idx) => {
                  const grpsForMaster = groups.filter((g) => g.masterId === line.masterId);
                  const ctsForGrp = cats.filter((c) => c.groupId === line.groupId);
                  const subsForCat = subs.filter((s) => s.categoryId === line.catId);
                  const unit = masters.find((m) => m.id === line.masterId)?.unit ?? "pcs";
                  const lineSub = subs.find((s) => s.id === line.subId);
                  const gstAmt = +((line.price * line.qty * line.gstPct) / 100).toFixed(2);
                  const total = +(line.price * line.qty + gstAmt).toFixed(2);

                  return (
                    <div key={line.id} className="rounded-xl border bg-muted/20 p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="rounded-lg bg-primary/10 px-2.5 py-0.5 text-[11px] font-bold text-primary">
                          Material {idx + 1}
                        </span>
                        {lines.length > 1 && (
                          <button
                            onClick={() => removeLine(line.id)}
                            className="grid h-7 w-7 place-items-center rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Row 1: Master · Group · Category · Subcategory */}
                      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase text-muted-foreground">
                            Master
                          </label>
                          <select
                            value={line.masterId}
                            onChange={(e) => {
                              const m = e.target.value;
                              const g = groups.find((x) => x.masterId === m)?.id ?? "";
                              const c = cats.find((x) => x.groupId === g)?.id ?? "";
                              const s = subs.find((x) => x.categoryId === c)?.id ?? "";
                              updateLine(line.id, { masterId: m, groupId: g, catId: c, subId: s });
                            }}
                            className={selectCls + " text-[12px]"}
                          >
                            {masters.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase text-muted-foreground">
                            Group
                          </label>
                          <select
                            value={line.groupId}
                            onChange={(e) => {
                              const g = e.target.value;
                              const c = cats.find((x) => x.groupId === g)?.id ?? "";
                              const s = subs.find((x) => x.categoryId === c)?.id ?? "";
                              updateLine(line.id, { groupId: g, catId: c, subId: s });
                            }}
                            className={selectCls + " text-[12px]"}
                          >
                            {grpsForMaster.map((g) => (
                              <option key={g.id} value={g.id}>
                                {g.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase text-muted-foreground">
                            Category
                          </label>
                          <select
                            value={line.catId}
                            onChange={(e) => {
                              const c = e.target.value;
                              const s = subs.find((x) => x.categoryId === c)?.id ?? "";
                              updateLine(line.id, { catId: c, subId: s });
                            }}
                            className={selectCls + " text-[12px]"}
                          >
                            {ctsForGrp.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase text-muted-foreground">
                            Subcategory
                          </label>
                          <select
                            value={line.subId}
                            onChange={(e) => updateLine(line.id, { subId: e.target.value })}
                            className={selectCls + " text-[12px]"}
                          >
                            {subsForCat.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Row 2: Qty · GST% · Price · GST Amt */}
                      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase text-muted-foreground">
                            Quantity ({unit})
                          </label>
                          <input
                            type="number"
                            min={1}
                            value={line.qty}
                            onChange={(e) =>
                              updateLine(line.id, { qty: Math.max(1, Number(e.target.value)) })
                            }
                            className={inputCls + " text-[12px]"}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase text-muted-foreground">
                            GST Percentage
                          </label>
                          <select
                            value={line.gstPct}
                            onChange={(e) =>
                              updateLine(line.id, { gstPct: Number(e.target.value) })
                            }
                            className={selectCls + " text-[12px]"}
                          >
                            {GST_RATES.map((r) => (
                              <option key={r} value={r}>
                                {r} %
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase text-muted-foreground">
                            Price (per unit ₹)
                          </label>
                          <input
                            type="number"
                            min={0}
                            value={line.price}
                            onChange={(e) =>
                              updateLine(line.id, { price: Math.max(0, Number(e.target.value)) })
                            }
                            className={inputCls + " text-[12px]"}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase text-muted-foreground">
                            GST Amount (₹)
                          </label>
                          <div
                            className={
                              inputCls +
                              " flex items-center bg-muted/60 text-[12px] text-muted-foreground"
                            }
                          >
                            {gstAmt.toLocaleString("en-IN")}
                          </div>
                        </div>
                      </div>

                      {/* Row 3: Total · Serial Number */}
                      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase text-muted-foreground">
                            Total (₹)
                          </label>
                          <div
                            className={
                              inputCls +
                              " flex items-center bg-emerald-50 border-emerald-200 text-[12px] font-bold text-emerald-700"
                            }
                          >
                            {total.toLocaleString("en-IN")}
                          </div>
                        </div>
                        <div className="space-y-1 lg:col-span-3">
                          <label className="text-[10px] font-bold uppercase text-muted-foreground">
                            Serial Number
                          </label>
                          <input
                            value={line.serialInput}
                            autoComplete="off"
                            onChange={(e) => updateLine(line.id, { serialInput: e.target.value })}
                            onKeyDown={(e) => {
                              if (e.key !== "Enter") return;
                              e.preventDefault();
                              const raw = line.serialInput.trim();
                              if (!raw) return;
                              if (line.serialMode === "multiple") {
                                const entries = raw
                                  .split(",")
                                  .map((s) => s.trim())
                                  .filter(Boolean);
                                if (entries.length)
                                  updateLine(line.id, {
                                    serialNos: [...line.serialNos, ...entries],
                                    serialInput: "",
                                  });
                              } else {
                                updateLine(line.id, {
                                  serialNos: [...line.serialNos, raw],
                                  serialInput: "",
                                });
                              }
                            }}
                            placeholder={
                              line.serialMode === "scan"
                                ? "Scan barcode — each scan adds automatically…"
                                : line.serialMode === "manual"
                                  ? "Type serial number and press Enter…"
                                  : "SN001, SN002, SN003 — press Enter to add all…"
                            }
                            className={inputCls + " text-[12px]"}
                          />

                          <div className="flex flex-wrap items-center gap-5 pt-1.5">
                            {(["scan", "manual", "multiple"] as SerialMode[]).map((mode) => (
                              <label
                                key={mode}
                                className="flex cursor-pointer items-center gap-1.5"
                              >
                                <div
                                  onClick={() =>
                                    updateLine(line.id, { serialMode: mode, serialInput: "" })
                                  }
                                  className={`h-4 w-4 rounded-full border-2 flex items-center justify-center transition-all ${line.serialMode === mode ? "border-primary" : "border-muted-foreground/40"}`}
                                >
                                  {line.serialMode === mode && (
                                    <div className="h-2 w-2 rounded-full bg-primary" />
                                  )}
                                </div>
                                <span
                                  className={`text-[11px] font-medium ${line.serialMode === mode ? "text-primary font-semibold" : "text-muted-foreground"}`}
                                >
                                  {mode === "scan"
                                    ? "Scan Code"
                                    : mode === "manual"
                                      ? "Manual Entry"
                                      : "Multiple Entry"}
                                </span>
                              </label>
                            ))}
                            <span
                              className={`ml-auto inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold border ${
                                line.serialNos.length === line.qty
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : line.serialNos.length > line.qty
                                    ? "bg-red-50 text-red-600 border-red-200"
                                    : "bg-amber-50 text-amber-600 border-amber-200"
                              }`}
                            >
                              Serial Numbers Added: {line.serialNos.length}/{line.qty}
                              {line.serialNos.length === line.qty
                                ? " ✓"
                                : line.serialNos.length > line.qty
                                  ? " — too many!"
                                  : ` — ${line.qty - line.serialNos.length} remaining`}
                            </span>
                          </div>
                          <p className="text-[10px] text-muted-foreground/60">
                            {line.serialMode === "scan"
                              ? "Point barcode gun at each item — serial is added on every scan (Enter)."
                              : line.serialMode === "manual"
                                ? "Type one serial number and press Enter to add it."
                                : "Enter multiple serials separated by commas then press Enter."}
                          </p>
                          {line.serialNos.length > 0 && (
                            <div className="mt-1.5 flex flex-wrap gap-1.5">
                              {line.serialNos.map((sn, si) => (
                                <span
                                  key={si}
                                  className="inline-flex items-center gap-1 rounded-md bg-primary-soft px-2 py-0.5 text-[10px] font-mono font-semibold text-primary"
                                >
                                  {sn}
                                  <button
                                    onClick={() =>
                                      updateLine(line.id, {
                                        serialNos: line.serialNos.filter((_, ii) => ii !== si),
                                      })
                                    }
                                    className="hover:text-red-500 transition-colors"
                                  >
                                    <X className="h-2.5 w-2.5" />
                                  </button>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {lineSub &&
                        (() => {
                          const godownStock =
                            liveSubs.find((s) => s.id === line.subId)?.godownStock ?? lineSub.stock;
                          return (
                            <p className="text-[11px] text-muted-foreground border-t pt-2">
                              Godown stock:{" "}
                              <span className="font-bold text-foreground">
                                {godownStock} {unit}
                              </span>
                              <span className="mx-1.5">·</span>
                              After inward:{" "}
                              <span className="font-bold text-emerald-600">
                                {godownStock + line.qty} {unit}
                              </span>
                            </p>
                          );
                        })()}
                    </div>
                  );
                })}

                {/* Error banner */}
                {saveError && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[12px] text-red-700">
                    <p className="font-bold mb-0.5">Save failed</p>
                    <p className="font-mono break-all">{saveError}</p>
                  </div>
                )}

                {/* Buttons */}
                <div className="flex items-center justify-end gap-3 border-t pt-4">
                  <button
                    onClick={addLine}
                    className="inline-flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-5 py-2.5 text-[13px] font-bold text-amber-700 hover:bg-amber-100 transition-colors"
                  >
                    <Plus className="h-4 w-4" /> Add Material
                  </button>
                  <button
                    onClick={() => {
                      void handleSave();
                    }}
                    disabled={!canSave || saving}
                    className="inline-flex items-center gap-2 rounded-xl gradient-primary px-7 py-2.5 text-[13px] font-bold text-white shadow-glow disabled:opacity-40 transition hover:opacity-95"
                  >
                    <Check className="h-4 w-4" /> {saving ? "Saving…" : "Submit"}
                  </button>
                  <button
                    onClick={() => navigate({ to: "/inventory", search: { tab: "inward" } })}
                    className="rounded-xl bg-red-500 px-5 py-2.5 text-[13px] font-bold text-white hover:bg-red-600 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {!(billNumber.trim() && supplier) && (
            <p className="text-[12px] text-muted-foreground/60 text-center py-4 border-t">
              Fill in <span className="font-semibold text-foreground">Bill Number</span> and select
              a <span className="font-semibold text-foreground">Supplier</span> to add materials.
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
