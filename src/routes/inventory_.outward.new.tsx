import { useState, useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ChevronRight, Plus, X, Check } from "lucide-react";
import { PageHeader } from "@/components/crm/PageHeader";
import { DatePicker } from "@/components/crm/DatePicker";
import {
  getMasters,
  getGroups,
  getCats,
  getSubs,
  addMovement,
  subscribe,
} from "@/data/inventoryStore";
import type { B2bPartner } from "@/data/inventoryStore";
import { createOutwardEntry } from "@/lib/outwardService";
import { fetchAllInventory } from "@/lib/inventoryService";
import { fetchB2bPartners } from "@/lib/b2bService";
import { fetchInstallerPartners } from "@/lib/installerService";
import { fetchCustomers } from "@/lib/customerService";
import type { Customer } from "@/data/customersStore";

export const Route = createFileRoute("/inventory_/outward/new")({ component: NewOutwardPage });

const inputCls =
  "h-10 w-full rounded-xl border bg-muted/40 px-3.5 text-sm outline-none transition focus:bg-card focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/60";
const selectCls = inputCls + " cursor-pointer";

const CONCERNED_PERSONS = [
  "Ramesh Kumar",
  "Suresh Sharma",
  "Ankit Patel",
  "Mohit Verma",
  "Deepa Joshi",
  "Priya Singh",
];

type DeliveryTo = "B2B" | "B2C" | "B2I";
type SerialMode = "scan" | "manual" | "multiple";

type MatLine = {
  id: string;
  masterId: string;
  groupId: string;
  catId: string;
  subId: string;
  qty: number;
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
    serialMode: "scan",
    serialInput: "",
    serialNos: [],
  };
}

function NewOutwardPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [, forceUpdate] = useState(0);
  useEffect(() => {
    const unsub = subscribe(() => forceUpdate((n) => n + 1));
    return () => {
      unsub();
    };
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
  const [customers, setCustomers] = useState<Customer[]>([]);
  useEffect(() => {
    fetchB2bPartners().then(setB2bPartners).catch(console.error);
    fetchInstallerPartners().then(setInstallerPartners).catch(console.error);
    fetchCustomers().then(setCustomers).catch(console.error);
  }, []);

  const today = new Date().toISOString().slice(0, 10);

  const [deliveryTo, setDeliveryTo] = useState<DeliveryTo>("B2B");
  const [challanDate, setChallanDate] = useState(today);
  const [billNumber, setBillNumber] = useState("");
  const [concernedPerson, setConcernedPerson] = useState("");
  const [selectedId, setSelectedId] = useState(""); // B2B id / Installer id / Customer id

  // Reset selection when delivery type changes
  function changeDeliveryTo(t: DeliveryTo) {
    setDeliveryTo(t);
    setSelectedId("");
    setSameAsAbove(false);
  }

  const b2bData = deliveryTo === "B2B" ? b2bPartners.find((p) => p.id === selectedId) : undefined;
  const installerData =
    deliveryTo === "B2I" ? installerPartners.find((p) => p.id === selectedId) : undefined;
  const customerData =
    deliveryTo === "B2C" ? customers.find((c) => String(c.id) === selectedId) : undefined;

  const [custAddress, setCustAddress] = useState("");
  const [deliveryCity, setDeliveryCity] = useState("");
  const [gstDetails, setGstDetails] = useState("");
  const [sameAsAbove, setSameAsAbove] = useState(false);

  const [driverName, setDriverName] = useState("");
  const [driverContact, setDriverContact] = useState("");
  const [remarks, setRemarks] = useState("");
  const [vehicleNo, setVehicleNo] = useState("");
  const [delivContact, setDelivContact] = useState("");

  const [lines, setLines] = useState<MatLine[]>(() => [defaultLine(masters, groups, cats, subs)]);
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

  const needsSelection = deliveryTo === "B2B" || deliveryTo === "B2I" || deliveryTo === "B2C";
  const canSubmit =
    billNumber.trim() &&
    concernedPerson &&
    (!needsSelection || selectedId) &&
    lines.length > 0 &&
    lines.every((l) => l.subId && l.serialNos.length === l.qty);

  // Auto-fill address from selected partner/customer
  const autoAddress = b2bData?.address ?? installerData?.address ?? customerData?.address ?? "";
  const autoCity = b2bData?.city ?? installerData?.city ?? customerData?.city ?? "";
  const autoGstin = b2bData?.gstin ?? installerData?.gstin ?? "";

  async function handleSubmit() {
    if (!canSubmit || saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      const supplierType: "b2b" | "b2i" = deliveryTo === "B2I" ? "b2i" : "b2b";
      for (const line of lines) {
        await createOutwardEntry(
          {
            id: uid(),
            challanDate,
            billNumber,
            concernedPerson,
            deliveryTo,
            b2bCompanyName:
              b2bData?.companyName ?? installerData?.companyName ?? customerData?.name,
            customerAddress: sameAsAbove ? autoAddress : custAddress,
            deliveryCity: sameAsAbove ? autoCity : deliveryCity,
            gstDetails: sameAsAbove ? autoGstin : gstDetails,
            driverName,
            driverContact,
            remarks,
            vehicleNo,
            deliveryContact: delivContact,
            subcategoryId: line.subId,
            qty: line.qty,
            serialNos: line.serialNos,
          },
          supplierType,
          deliveryTo === "B2I" ? selectedId : undefined,
          deliveryTo === "B2I" ? installerData?.companyName : undefined,
        );
        addMovement({
          id: uid(),
          subcategoryId: line.subId,
          type: "out",
          qty: line.qty,
          date: challanDate,
          ref: billNumber,
          note: remarks,
          supplier: b2bData?.companyName ?? installerData?.companyName ?? customerData?.name,
        });
      }
      queryClient.invalidateQueries({ queryKey: ["installerPartnerStocks"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      navigate({ to: "/inventory", search: { tab: "outward" } });
    } catch (e) {
      console.error("Failed to save outward entry:", e);
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
        eyebrow="Inventory / Outward"
        title="New Outward Entry"
        description="Record materials dispatched from stock."
        actions={
          <button
            onClick={() => navigate({ to: "/inventory", search: { tab: "outward" } })}
            className="inline-flex items-center gap-2 rounded-xl border bg-card px-4 py-2.5 text-[13px] font-semibold text-muted-foreground shadow-card hover:bg-muted transition-colors"
          >
            <ChevronRight className="h-4 w-4 rotate-180" /> Back to Outward
          </button>
        }
      />

      {/* ══ Section 1: Outward Details ══ */}
      <div className="rounded-2xl border bg-card shadow-card overflow-hidden">
        <div className="gradient-primary px-6 py-3">
          <p className="text-[13px] font-bold text-white">Outward Details</p>
        </div>
        <div className="p-6 space-y-5">
          {/* Row 1: Delivery To+selector · Challan Date · Bill Number · Concerned Person */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 items-end">
            {/* Col 1: Delivery To radios + dropdown below */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-3">
                <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground shrink-0">
                  Delivery To <span className="text-red-500">*</span>
                </label>
                {(["B2B", "B2C", "B2I"] as DeliveryTo[]).map((opt) => (
                  <label key={opt} className="flex cursor-pointer items-center gap-1">
                    <div
                      onClick={() => changeDeliveryTo(opt)}
                      className={`h-3.5 w-3.5 rounded-full border-2 flex items-center justify-center transition-all ${deliveryTo === opt ? "border-primary" : "border-muted-foreground/40"}`}
                    >
                      {deliveryTo === opt && (
                        <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                      )}
                    </div>
                    <span
                      className={`text-[11px] font-semibold ${deliveryTo === opt ? "text-primary" : "text-muted-foreground"}`}
                    >
                      {opt === "B2I" ? "INSTALLER" : opt}
                    </span>
                  </label>
                ))}
              </div>
              <select
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                className={selectCls}
              >
                <option value="">
                  {deliveryTo === "B2B"
                    ? "Select B2B…"
                    : deliveryTo === "B2I"
                      ? "Select Installer Dealer…"
                      : "Select Customer…"}
                </option>
                {deliveryTo === "B2B" &&
                  b2bPartners.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.companyName}
                    </option>
                  ))}
                {deliveryTo === "B2I" &&
                  installerPartners.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.companyName}
                    </option>
                  ))}
                {deliveryTo === "B2C" &&
                  customers.map((c) => (
                    <option key={c.id} value={String(c.id)}>
                      {c.name} — {c.city}
                    </option>
                  ))}
              </select>
            </div>

            {/* Col 2: Challan Date */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                Challan Date
              </label>
              <DatePicker value={challanDate} onChange={setChallanDate} label="Challan Date" />
            </div>

            {/* Col 3: Bill Number */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                Bill Number <span className="text-red-500">*</span>
              </label>
              <input
                value={billNumber}
                onChange={(e) => setBillNumber(e.target.value)}
                placeholder="e.g. DC-2026-001"
                className={inputCls}
              />
            </div>

            {/* Col 4: Concerned Person */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                Concerned Person <span className="text-red-500">*</span>
              </label>
              <select
                value={concernedPerson}
                onChange={(e) => setConcernedPerson(e.target.value)}
                className={selectCls}
              >
                <option value="">Select Concerned Person</option>
                {CONCERNED_PERSONS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Auto-filled info */}
          {(b2bData || installerData || customerData) && (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
              {[
                { label: "Address", value: autoAddress },
                { label: "City", value: autoCity },
                { label: "State", value: b2bData?.state ?? installerData?.state ?? "" },
                {
                  label: "Contact",
                  value: b2bData?.contact ?? installerData?.contact ?? customerData?.phone ?? "",
                },
                ...(autoGstin ? [{ label: "GSTIN", value: autoGstin }] : []),
              ]
                .filter((x) => x.value)
                .map(({ label, value }) => (
                  <div key={label} className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-muted-foreground">
                      {label}
                    </label>
                    <div
                      className={
                        inputCls +
                        " flex items-center bg-muted/60 text-[12px] text-muted-foreground font-mono"
                      }
                    >
                      {value}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* ══ Section 2: Delivery Details ══ */}
      <div className="rounded-2xl border bg-card shadow-card overflow-hidden">
        <div className="gradient-primary px-6 py-3">
          <p className="text-[13px] font-bold text-white">Delivery Details</p>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                Customer Address
              </label>
              <input
                value={sameAsAbove ? autoAddress : custAddress}
                onChange={(e) => {
                  if (!sameAsAbove) setCustAddress(e.target.value);
                }}
                readOnly={sameAsAbove}
                placeholder="Customer address"
                className={inputCls + (sameAsAbove ? " bg-muted/60" : "")}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                City
              </label>
              <input
                value={sameAsAbove ? autoCity : deliveryCity}
                onChange={(e) => {
                  if (!sameAsAbove) setDeliveryCity(e.target.value);
                }}
                readOnly={sameAsAbove}
                placeholder="City"
                className={inputCls + (sameAsAbove ? " bg-muted/60" : "")}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                GST Details
              </label>
              <input
                value={sameAsAbove ? autoGstin : gstDetails}
                onChange={(e) => {
                  if (!sameAsAbove) setGstDetails(e.target.value);
                }}
                readOnly={sameAsAbove}
                placeholder="GST details"
                className={inputCls + (sameAsAbove ? " bg-muted/60 font-mono" : "")}
              />
            </div>
          </div>
          <label className="flex cursor-pointer items-center gap-2">
            <div
              onClick={() => setSameAsAbove((v) => !v)}
              className={`h-4 w-4 rounded border-2 flex items-center justify-center transition-all ${sameAsAbove ? "border-primary bg-primary" : "border-muted-foreground/40"}`}
            >
              {sameAsAbove && <Check className="h-2.5 w-2.5 text-white" />}
            </div>
            <span className="text-[12px] font-medium text-muted-foreground">
              Delivery address same as above
            </span>
          </label>
        </div>
      </div>

      {/* ══ Section 3: Driver Details ══ */}
      <div className="rounded-2xl border bg-card shadow-card overflow-hidden">
        <div className="gradient-primary px-6 py-3">
          <p className="text-[13px] font-bold text-white">Driver Details</p>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                Driver Name
              </label>
              <input
                value={driverName}
                onChange={(e) => setDriverName(e.target.value)}
                placeholder="Driver Name"
                className={inputCls}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                Driver Contact No
              </label>
              <input
                value={driverContact}
                onChange={(e) => setDriverContact(e.target.value.replace(/\D/g, "").slice(0, 10))}
                placeholder="Driver Contact No"
                className={inputCls}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                Remarks
              </label>
              <input
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Remarks"
                className={inputCls}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                Vehicle Number
              </label>
              <input
                value={vehicleNo}
                onChange={(e) => setVehicleNo(e.target.value.toUpperCase())}
                placeholder="e.g. RJ14 AB 1234"
                className={inputCls + " font-mono"}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                Delivery Contact Person
              </label>
              <input
                value={delivContact}
                onChange={(e) => setDelivContact(e.target.value)}
                placeholder="Delivery Contact Person"
                className={inputCls}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ══ Section 4: Materials ══ */}
      <div className="rounded-2xl border bg-card shadow-card overflow-hidden">
        <div className="gradient-primary px-6 py-3">
          <p className="text-[13px] font-bold text-white">Materials</p>
        </div>
        <div className="divide-y">
          {lines.map((line, idx) => {
            const grpsForMaster = groups.filter((g) => g.masterId === line.masterId);
            const ctsForGrp = cats.filter((c) => c.groupId === line.groupId);
            const subsForCat = subs.filter((s) => s.categoryId === line.catId);
            const unit = masters.find((m) => m.id === line.masterId)?.unit ?? "pcs";
            const lineSub = subs.find((s) => s.id === line.subId);

            return (
              <div key={line.id} className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="rounded-lg bg-primary/10 px-2.5 py-0.5 text-[11px] font-bold text-primary">
                    Material {idx + 1}
                  </span>
                  {lines.length > 1 && (
                    <button
                      onClick={() => removeLine(line.id)}
                      className="grid h-7 w-7 place-items-center rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
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
                      className={selectCls}
                    >
                      {masters.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name.toUpperCase()}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
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
                      className={selectCls}
                    >
                      <option value="">Select Group</option>
                      {grpsForMaster.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                      Category
                    </label>
                    <select
                      value={line.catId}
                      onChange={(e) => {
                        const c = e.target.value;
                        const s = subs.find((x) => x.categoryId === c)?.id ?? "";
                        updateLine(line.id, { catId: c, subId: s });
                      }}
                      className={selectCls}
                    >
                      <option value="">Select</option>
                      {ctsForGrp.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                      SubCategory
                    </label>
                    <select
                      value={line.subId}
                      onChange={(e) => updateLine(line.id, { subId: e.target.value })}
                      className={selectCls}
                    >
                      <option value="">Select Sub-Category</option>
                      {subsForCat.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                      Quantity ({unit})
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={line.qty}
                      onChange={(e) =>
                        updateLine(line.id, {
                          qty: Math.max(1, Number(e.target.value)),
                          serialNos: [],
                        })
                      }
                      className={inputCls}
                    />
                  </div>
                  <div className="space-y-1.5 lg:col-span-3">
                    <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                      Serial Numbers
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
                      className={inputCls}
                    />

                    <div className="flex flex-wrap items-center gap-5 pt-1">
                      {(["scan", "manual", "multiple"] as SerialMode[]).map((mode) => (
                        <label key={mode} className="flex cursor-pointer items-center gap-1.5">
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
                    const afterQty = godownStock - line.qty;
                    return (
                      <p className="text-[11px] text-muted-foreground border-t pt-2">
                        Godown stock:{" "}
                        <span className="font-bold text-foreground">
                          {godownStock} {unit}
                        </span>
                        <span className="mx-1.5">·</span>
                        After outward:{" "}
                        <span
                          className={`font-bold ${afterQty < 0 ? "text-red-500" : "text-amber-600"}`}
                        >
                          {Math.max(0, afterQty)} {unit}
                        </span>
                        {afterQty < 0 && (
                          <span className="ml-2 text-red-500 font-semibold">
                            ⚠ Insufficient stock
                          </span>
                        )}
                      </p>
                    );
                  })()}
              </div>
            );
          })}
        </div>

        {saveError && (
          <div className="mx-6 mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[12px] text-red-700">
            <p className="font-bold mb-0.5">Save failed</p>
            <p className="font-mono break-all">{saveError}</p>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 border-t bg-muted/10 px-6 py-4">
          <button
            onClick={addLine}
            className="inline-flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-5 py-2.5 text-[13px] font-bold text-amber-700 hover:bg-amber-100 transition-colors"
          >
            <Plus className="h-4 w-4" /> Add Material
          </button>
          <button
            onClick={() => {
              void handleSubmit();
            }}
            disabled={!canSubmit || saving}
            className="inline-flex items-center gap-2 rounded-xl gradient-primary px-7 py-2.5 text-[13px] font-bold text-white shadow-glow disabled:opacity-40 transition hover:opacity-95"
          >
            <Check className="h-4 w-4" /> {saving ? "Saving…" : "Submit"}
          </button>
          <button
            onClick={() => navigate({ to: "/inventory", search: { tab: "outward" } })}
            className="rounded-xl bg-red-500 px-5 py-2.5 text-[13px] font-bold text-white hover:bg-red-600 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </motion.div>
  );
}
