import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  User,
  Phone,
  Mail,
  MapPin,
  Zap,
  Calendar,
  IndianRupee,
  FileText,
  Hash,
  CreditCard,
  Building2,
  Layers,
  Navigation2,
  Link2,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { DatePicker } from "@/components/crm/DatePicker";
import { CrmSelect } from "@/components/crm/CrmSelect";
import { fetchSources } from "@/lib/sourceService";
import { fetchDiscoms } from "@/lib/discomService";
import { resolveMapsLink } from "@/lib/mapsLinkService";
import { lookupPincode } from "@/lib/pincodeService";
import { stripRupeeSymbol, computeDcCapacity, addYearsIso } from "@/lib/utils";
import { findContactOwner, contactOwnerMessage } from "@/lib/contactLookupService";
import type { Customer } from "@/data/customersStore";

export type CustomerFormValues = {
  customerType: "New" | "Old";
  scheme: string;
  name: string;
  consumerNo: string;
  source: string;
  finance: string;
  phone: string;
  email: string;
  aadhaarCard: string;
  address: string;
  pincode: string;
  city: string;
  latitude: string;
  longitude: string;
  capacity: string;
  wp: string;
  numPanels: string;
  panelBrand: string;
  inverterBrand: string;
  inverterKw: string;
  type: string;
  singlePhase: boolean | null;
  warrantyStartDate: string;
  warrantyEndDate: string;
  pdcFacilityGiven: "Yes" | "No" | null;
  paid: string;
  discomId: string;
  discom: string;
  circle: string;
  division: string;
  subDivision: string;
  status: string;
  notes: string;
  tag: string;
};

export const emptyCustomerForm: CustomerFormValues = {
  customerType: "New",
  scheme: "",
  name: "",
  consumerNo: "",
  source: "",
  finance: "",
  phone: "",
  email: "",
  aadhaarCard: "",
  address: "",
  pincode: "",
  city: "",
  latitude: "",
  longitude: "",
  capacity: "",
  wp: "",
  numPanels: "",
  panelBrand: "",
  inverterBrand: "",
  inverterKw: "",
  type: "On-grid",
  singlePhase: null,
  warrantyStartDate: "",
  warrantyEndDate: "",
  pdcFacilityGiven: null,
  paid: "",
  discomId: "",
  discom: "",
  circle: "",
  division: "",
  subDivision: "",
  status: "Active",
  notes: "",
  tag: "",
};

/** Maps a loaded Customer record onto the form's editable shape (for the Edit page's prefill). */
export function customerToFormValues(data: Customer): CustomerFormValues {
  return {
    customerType: data.customerType ?? "New",
    scheme: data.scheme ?? "",
    name: data.name,
    consumerNo: data.consumerNo ?? "",
    source: data.source ?? "",
    finance: data.finance ?? "",
    phone: data.phone,
    email: data.email,
    aadhaarCard: data.aadhaarCard ?? "",
    address: data.address ?? "",
    pincode: data.pincode ?? "",
    city: data.city,
    latitude: data.latitude ?? "",
    longitude: data.longitude ?? "",
    capacity: data.capacity.replace(" kW", ""),
    wp: data.wp ?? "",
    numPanels: data.numPanels != null ? String(data.numPanels) : "",
    panelBrand: data.panelBrand ?? "",
    inverterBrand: data.inverterBrand ?? "",
    inverterKw: data.inverterKw != null ? String(data.inverterKw) : "",
    type: data.type,
    singlePhase: data.singlePhase ?? null,
    warrantyStartDate: data.warrantyStartDate ?? "",
    warrantyEndDate: data.warrantyEndDate ?? "",
    pdcFacilityGiven: data.pdcFacilityGiven ?? null,
    paid: data.paid.replace(/₹/g, ""),
    // Not stored on the customer record — only drives the Discom dropdown's
    // own selection state, so it always starts empty on load.
    discomId: "",
    discom: data.discom ?? "",
    circle: data.circle ?? "",
    division: data.division ?? "",
    subDivision: data.subDivision ?? "",
    status: data.status,
    notes: data.notes,
    tag: data.tag ?? "",
  };
}

const inputCls =
  "h-10 w-full rounded-xl border bg-muted/40 px-3.5 text-sm outline-none transition focus:bg-card focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/60";

const labelCls =
  "mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground";

/**
 * The single Add/Edit Customer form — used as-is (empty) for adding, and
 * pre-filled for editing. Both routes just supply initialValues + onSubmit.
 */
export function CustomerForm({
  initialValues,
  onSubmit,
  submitting,
  submitLabel,
  submittingLabel,
  onCancel,
}: {
  initialValues: CustomerFormValues;
  onSubmit: (payload: Omit<Customer, "id" | "customerId">) => void;
  submitting: boolean;
  submitLabel: string;
  submittingLabel: string;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<CustomerFormValues>(initialValues);
  // The phone this customer already had when the form opened (empty for Add).
  // Only re-check for a duplicate when the phone actually changes — otherwise
  // editing a customer without touching their number always "conflicts" with
  // themselves.
  const [originalPhone] = useState(initialValues.phone);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [checkingPhone, setCheckingPhone] = useState(false);
  const [mapsLink, setMapsLink] = useState("");
  const [resolvingMaps, setResolvingMaps] = useState(false);
  const [resolvingPincode, setResolvingPincode] = useState(false);

  const { data: sources = [] } = useQuery({
    queryKey: ["lead-sources"],
    queryFn: fetchSources,
    staleTime: 5 * 60 * 1000,
  });

  const { data: discoms = [] } = useQuery({
    queryKey: ["discoms"],
    queryFn: fetchDiscoms,
    staleTime: 5 * 60 * 1000,
  });

  const subDivisionOptions = (() => {
    const seen = new Map<string, (typeof discoms)[number]>();
    for (const d of discoms) {
      if (d.subDivision && !seen.has(d.subDivision)) seen.set(d.subDivision, d);
    }
    return Array.from(seen.values())
      .sort((a, b) => a.subDivision.localeCompare(b.subDivision))
      .map((d) => ({
        value: d.subDivision,
        label: d.subDivision,
        description: `${d.discom} · ${d.circle} · ${d.division}`,
      }));
  })();

  function setF<K extends keyof CustomerFormValues>(field: K, value: CustomerFormValues[K]) {
    setForm((f) => ({ ...f, [field]: value }));
    if (typeof value === "string" && errors[field as string]) {
      setErrors((e) => ({ ...e, [field as string]: "" }));
    }
  }

  async function fillFromMapsLink(link: string, openInNewTab = false) {
    const url = link.trim();
    if (!url) return;
    setResolvingMaps(true);
    try {
      const coords = await resolveMapsLink({ data: url });
      if (coords) {
        setF("latitude", coords.lat);
        setF("longitude", coords.lng);
        toast.success("Latitude & longitude filled from map link");
        if (openInNewTab) {
          window.open(`https://www.google.com/maps?q=${coords.lat},${coords.lng}`, "_blank");
        }
      } else {
        toast.error("Couldn't find coordinates in that link");
      }
    } catch {
      toast.error("Couldn't resolve that map link");
    } finally {
      setResolvingMaps(false);
    }
  }

  // Auto-fill city from pincode via India Post lookup
  useEffect(() => {
    const pin = form.pincode.trim();
    if (!/^\d{6}$/.test(pin)) return;
    let cancelled = false;
    setResolvingPincode(true);
    lookupPincode({ data: pin })
      .then((result) => {
        if (cancelled || !result) return;
        setForm((f) => (f.pincode === pin ? { ...f, city: result.city.toUpperCase() } : f));
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setResolvingPincode(false);
      });
    return () => {
      cancelled = true;
    };
  }, [form.pincode]);

  // System Warranty End Date is always 5 years after Start Date
  useEffect(() => {
    if (!form.warrantyStartDate) return;
    setForm((f) => ({ ...f, warrantyEndDate: addYearsIso(f.warrantyStartDate, 5) }));
  }, [form.warrantyStartDate]);

  function validate() {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Required";
    if (!form.phone.trim()) e.phone = "Required";
    if (!form.city.trim()) e.city = "Required";
    if (!form.capacity.trim()) e.capacity = "Required";
    if (form.singlePhase === null) e.singlePhase = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    if (form.phone.trim() !== originalPhone.trim()) {
      setCheckingPhone(true);
      const owner = await findContactOwner(form.phone.trim());
      setCheckingPhone(false);
      if (owner) {
        setErrors((e) => ({ ...e, phone: contactOwnerMessage(owner) }));
        return;
      }
    }
    onSubmit({
      customerType: form.customerType,
      scheme: form.scheme,
      name: form.name,
      phone: form.phone,
      email: form.email,
      city: form.city,
      capacity: form.capacity ? `${form.capacity} kW` : "",
      type: form.type,
      since: "—",
      paid: stripRupeeSymbol(form.paid),
      status: form.status,
      notes: form.notes,
      tag: form.tag,
      consumerNo: form.consumerNo,
      source: form.source,
      finance: form.finance,
      aadhaarCard: form.aadhaarCard,
      address: form.address,
      pincode: form.pincode,
      latitude: form.latitude,
      longitude: form.longitude,
      wp: form.wp,
      numPanels: form.numPanels,
      dcCapacity: computeDcCapacity(form.wp, form.numPanels),
      panelBrand: form.panelBrand,
      inverterBrand: form.inverterBrand,
      inverterKw: form.inverterKw,
      singlePhase: form.singlePhase ?? false,
      warrantyStartDate: form.warrantyStartDate,
      warrantyEndDate: form.warrantyEndDate,
      pdcFacilityGiven: form.customerType === "New" ? (form.pdcFacilityGiven ?? undefined) : undefined,
      discom: form.discom,
      circle: form.circle,
      division: form.division,
      subDivision: form.subDivision,
    });
  }

  return (
    <div className="rounded-2xl border bg-card shadow-card">
      <form onSubmit={handleSubmit} className="divide-y" autoComplete="off">
        {/* ── Section 1: Customer / Contact Info ── */}
        <div className="px-6 py-5 space-y-4">
          <div className="flex items-center gap-2">
            <div className="grid h-7 w-7 place-items-center rounded-lg bg-primary-soft">
              <User className="h-3.5 w-3.5 text-primary" />
            </div>
            <h4 className="text-sm font-bold">Customer / Contact Info</h4>
          </div>

          <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className={labelCls}>
                <User className="h-3.5 w-3.5" /> Customer Type
              </label>
              <div className="flex gap-2 pt-1">
                {[
                  { label: "Old Customer", val: "Old" as const },
                  { label: "New Customer", val: "New" as const },
                ].map((opt) => (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => setF("customerType", opt.val)}
                    className={`flex-1 rounded-xl border py-2 text-xs font-semibold transition-all ${
                      form.customerType === opt.val
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
                <Layers className="h-3.5 w-3.5" /> Scheme
              </label>
              <CrmSelect
                value={form.scheme}
                onValueChange={(v) => setF("scheme", v)}
                placeholder="— Select scheme —"
                options={[
                  "PM SURYA GHAR",
                  "SURYA GUJARAT 2019-20",
                  "SURYA GUJARAT 2020-21",
                  "SURYA GUJARAT 2022-23",
                ].map((s) => ({
                  value: s,
                  label: s,
                }))}
              />
            </div>
            <div>
              <label className={labelCls}>
                <User className="h-3.5 w-3.5" /> Name *
              </label>
              <input
                value={form.name}
                onChange={(e) => setF("name", e.target.value)}
                placeholder="e.g. Sharma Residence"
                className={`${inputCls} ${errors.name ? "border-destructive" : ""}`}
              />
              {errors.name && <p className="mt-1 text-[11px] text-destructive">{errors.name}</p>}
            </div>

            <div>
              <label className={labelCls}>
                <Hash className="h-3.5 w-3.5" /> Tag
              </label>
              <input
                value={form.tag}
                onChange={(e) => setF("tag", e.target.value)}
                placeholder="e.g. VIP, Priority"
                className={inputCls}
              />
            </div>

            <div>
              <label className={labelCls}>
                <Hash className="h-3.5 w-3.5" /> Consumer No.
              </label>
              <input
                value={form.consumerNo}
                onChange={(e) => setF("consumerNo", e.target.value)}
                placeholder="e.g. MH-PNE-00112"
                className={inputCls}
              />
            </div>

            <div>
              <label className={labelCls}>
                <Layers className="h-3.5 w-3.5" /> Source
              </label>
              <CrmSelect
                value={form.source}
                onValueChange={(v) => setF("source", v)}
                placeholder="— Select source —"
                options={sources.map((s) => ({ value: s.name, label: s.name }))}
              />
            </div>

            <div>
              <label className={labelCls}>
                <IndianRupee className="h-3.5 w-3.5" /> Finance
              </label>
              <CrmSelect
                value={form.finance}
                onValueChange={(v) => setF("finance", v)}
                placeholder="— Select finance —"
                options={["SELF", "SOLFIN", "BAJAJ", "JAN SAMARTH"].map((f) => ({
                  value: f,
                  label: f,
                }))}
              />
            </div>

            <div>
              <label className={labelCls}>
                <CreditCard className="h-3.5 w-3.5" /> Aadhaar Card No.
              </label>
              <input
                value={form.aadhaarCard}
                onChange={(e) => setF("aadhaarCard", e.target.value)}
                placeholder="XXXX-XXXX-XXXX"
                className={inputCls}
              />
            </div>

            <div>
              <label className={labelCls}>
                <Phone className="h-3.5 w-3.5" /> Contact No. *
              </label>
              <input
                value={form.phone}
                onChange={(e) => setF("phone", e.target.value.replace(/\D/g, "").slice(0, 10))}
                placeholder="e.g. 9876543210"
                className={`${inputCls} ${errors.phone ? "border-destructive" : ""}`}
              />
              {errors.phone && <p className="mt-1 text-[11px] text-destructive">{errors.phone}</p>}
            </div>

            <div>
              <label className={labelCls}>
                <Mail className="h-3.5 w-3.5" /> Email
              </label>
              <input
                value={form.email}
                onChange={(e) => setF("email", e.target.value)}
                placeholder="email@example.com"
                className={inputCls}
              />
            </div>

            <div>
              <label className={labelCls}>
                <Zap className="h-3.5 w-3.5" /> Phase Type <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2 pt-1">
                {[
                  { label: "Single Phase", val: true },
                  { label: "Three Phase", val: false },
                ].map((opt) => (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => setF("singlePhase", opt.val)}
                    className={`flex-1 rounded-xl border py-2 text-xs font-semibold transition-all ${
                      form.singlePhase === opt.val
                        ? "gradient-primary text-white border-transparent shadow-glow"
                        : "bg-muted/60 text-muted-foreground border-border hover:bg-muted"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {errors.singlePhase && (
                <p className="mt-1 text-[11px] text-red-500">{errors.singlePhase}</p>
              )}
            </div>

            <div className="sm:col-span-2">
              <label className={labelCls}>
                <Building2 className="h-3.5 w-3.5" /> Address
              </label>
              <input
                value={form.address}
                onChange={(e) => setF("address", e.target.value)}
                placeholder="Street / House No. / Society"
                className={inputCls}
              />
            </div>

            <div>
              <label className={labelCls}>
                <MapPin className="h-3.5 w-3.5" /> Pin Code
              </label>
              <input
                value={form.pincode}
                onChange={(e) => setF("pincode", e.target.value)}
                placeholder="e.g. 411004"
                className={inputCls}
              />
            </div>

            <div>
              <label className={labelCls}>
                <MapPin className="h-3.5 w-3.5" /> City *
                {resolvingPincode && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
              </label>
              <input
                value={form.city}
                onChange={(e) => setF("city", e.target.value)}
                placeholder="e.g. Pune"
                className={`${inputCls} ${errors.city ? "border-destructive" : ""}`}
              />
              {errors.city && <p className="mt-1 text-[11px] text-destructive">{errors.city}</p>}
            </div>

            <div>
              <label className={labelCls}>
                <Link2 className="h-3.5 w-3.5" /> Google Maps Link
              </label>
              <div className="flex items-center gap-2">
                <input
                  value={mapsLink}
                  onChange={(e) => setMapsLink(e.target.value)}
                  onPaste={(e) => {
                    const pasted = e.clipboardData.getData("text");
                    if (pasted) {
                      setMapsLink(pasted);
                      fillFromMapsLink(pasted);
                    }
                  }}
                  placeholder="Paste a link…"
                  className={`${inputCls} flex-1`}
                />
                <button
                  type="button"
                  onClick={() => fillFromMapsLink(mapsLink, true)}
                  disabled={!mapsLink.trim() || resolvingMaps}
                  title="Fill latitude/longitude and open in Google Maps"
                  className="flex h-10 shrink-0 items-center gap-1.5 rounded-xl border-2 border-primary bg-primary-soft px-3 text-xs font-semibold text-primary transition-all hover:bg-primary hover:text-white disabled:opacity-40 disabled:pointer-events-none"
                >
                  {resolvingMaps ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Navigation2 className="h-3.5 w-3.5" />
                  )}
                  Fill
                </button>
              </div>
              {form.latitude && form.longitude && (
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  Lat {form.latitude}, Long {form.longitude}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ── Section 2: System & Installation Details ── */}
        <div className="px-6 py-5 space-y-4">
          <div className="flex items-center gap-2">
            <div className="grid h-7 w-7 place-items-center rounded-lg bg-primary-soft">
              <Zap className="h-3.5 w-3.5 text-primary" />
            </div>
            <h4 className="text-sm font-bold">System &amp; Installation Details</h4>
          </div>

          <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className={labelCls}>
                <Zap className="h-3.5 w-3.5" /> System Capacity (kW) *
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={form.capacity}
                onChange={(e) => setF("capacity", e.target.value)}
                placeholder="e.g. 10"
                className={`${inputCls} ${errors.capacity ? "border-destructive" : ""}`}
              />
              {errors.capacity && (
                <p className="mt-1 text-[11px] text-destructive">{errors.capacity}</p>
              )}
            </div>

            <div>
              <label className={labelCls}>
                <Zap className="h-3.5 w-3.5" /> Wp (Watt Peak)
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={form.wp}
                onChange={(e) => setF("wp", e.target.value)}
                placeholder="e.g. 580"
                className={inputCls}
              />
            </div>

            <div>
              <label className={labelCls}>
                <Layers className="h-3.5 w-3.5" /> No. of Panels
              </label>
              <input
                type="number"
                min="0"
                value={form.numPanels}
                onChange={(e) => setF("numPanels", e.target.value)}
                placeholder="e.g. 23"
                className={inputCls}
              />
            </div>

            <div>
              <label className={labelCls}>
                <Layers className="h-3.5 w-3.5" /> Panel Make
              </label>
              <input
                value={form.panelBrand}
                onChange={(e) => setF("panelBrand", e.target.value)}
                placeholder="e.g. Adani Solar, Waaree"
                className={inputCls}
              />
            </div>

            <div>
              <label className={labelCls}>
                <Zap className="h-3.5 w-3.5" /> Inverter Make
              </label>
              <input
                value={form.inverterBrand}
                onChange={(e) => setF("inverterBrand", e.target.value)}
                placeholder="e.g. Growatt, SMA"
                className={inputCls}
              />
            </div>

            <div>
              <label className={labelCls}>
                <Zap className="h-3.5 w-3.5" /> Inverter KW
              </label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={form.inverterKw}
                onChange={(e) => setF("inverterKw", e.target.value)}
                placeholder="e.g. 10"
                className={inputCls}
              />
            </div>

            <div>
              <label className={labelCls}>
                <Zap className="h-3.5 w-3.5" /> Installation Type
              </label>
              <CrmSelect
                value={form.type}
                onValueChange={(v) => setF("type", v)}
                options={["On-grid", "Off-grid", "Hybrid"].map((t) => ({
                  value: t,
                  label: t,
                }))}
              />
            </div>

            <div>
              <label className={labelCls}>
                <IndianRupee className="h-3.5 w-3.5" /> Total Cost (₹)
              </label>
              <input
                value={form.paid}
                onChange={(e) => setF("paid", e.target.value)}
                placeholder="e.g. 840000"
                className={inputCls}
              />
            </div>

            {form.customerType === "New" ? (
              <div>
                <label className={labelCls}>
                  <Calendar className="h-3.5 w-3.5" /> PDC Facility Given
                </label>
                <div className="flex gap-2 pt-1">
                  {[
                    { label: "Yes", val: "Yes" as const },
                    { label: "No", val: "No" as const },
                  ].map((opt) => (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() => setF("pdcFacilityGiven", opt.val)}
                      className={`flex-1 rounded-xl border py-2 text-xs font-semibold transition-all ${
                        form.pdcFacilityGiven === opt.val
                          ? "gradient-primary text-white border-transparent shadow-glow"
                          : "bg-muted/60 text-muted-foreground border-border hover:bg-muted"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <label className={labelCls}>
                  <Calendar className="h-3.5 w-3.5" /> System Warranty Start Date
                </label>
                <DatePicker
                  value={form.warrantyStartDate}
                  onChange={(v) => setF("warrantyStartDate", v)}
                  label="Warranty Start Date"
                />
              </div>
            )}
          </div>
        </div>

        {/* ── Section 3: DISCOM Info ── */}
        <div className="px-6 py-5 space-y-4">
          <div className="flex items-center gap-2">
            <div className="grid h-7 w-7 place-items-center rounded-lg bg-primary-soft">
              <Building2 className="h-3.5 w-3.5 text-primary" />
            </div>
            <h4 className="text-sm font-bold">DISCOM Info</h4>
          </div>
          <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className={labelCls}>
                <Building2 className="h-3.5 w-3.5" /> Discom
              </label>
              <CrmSelect
                value={form.discomId}
                onValueChange={(id) => {
                  const d = discoms.find((d) => d.id === id);
                  if (!d) return;
                  setForm((f) => ({
                    ...f,
                    discomId: d.id,
                    discom: d.discom,
                    circle: d.circle,
                    division: d.division,
                    subDivision: d.subDivision,
                  }));
                }}
                placeholder="— Select discom —"
                options={discoms.map((d) => ({
                  value: d.id,
                  label: d.discom,
                  description: `${d.circle} · ${d.division} · ${d.subDivision}`,
                }))}
              />
            </div>
            <div>
              <label className={labelCls}>
                <MapPin className="h-3.5 w-3.5" /> Circle
              </label>
              <input
                value={form.circle}
                onChange={(e) => setF("circle", e.target.value)}
                placeholder="e.g. Pune Urban"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>
                <MapPin className="h-3.5 w-3.5" /> Division
              </label>
              <input
                value={form.division}
                onChange={(e) => setF("division", e.target.value)}
                placeholder="e.g. Pune East"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>
                <MapPin className="h-3.5 w-3.5" /> Sub-Division
              </label>
              <CrmSelect
                value={form.subDivision}
                onValueChange={(v) => {
                  const d = discoms.find((d) => d.subDivision === v);
                  setForm((f) => ({
                    ...f,
                    subDivision: v,
                    ...(d && {
                      discomId: d.id,
                      discom: d.discom,
                      circle: d.circle,
                      division: d.division,
                    }),
                  }));
                }}
                placeholder="e.g. Koregaon Park"
                options={subDivisionOptions}
                searchable
              />
            </div>
          </div>
        </div>

        {/* ── Section 4: Remark ── */}
        <div className="px-6 py-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="grid h-7 w-7 place-items-center rounded-lg bg-primary-soft">
              <FileText className="h-3.5 w-3.5 text-primary" />
            </div>
            <h4 className="text-sm font-bold">Remark</h4>
          </div>
          <textarea
            value={form.notes}
            onChange={(e) => setF("notes", e.target.value)}
            placeholder="Any additional notes or remarks..."
            rows={3}
            className="w-full rounded-xl border bg-muted/40 px-3.5 py-2.5 text-sm outline-none transition focus:bg-card focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/60 resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 px-6 py-4">
          <button
            type="submit"
            disabled={checkingPhone || submitting}
            className="inline-flex items-center gap-2 rounded-xl gradient-primary px-6 py-2.5 text-sm font-bold text-white shadow-glow transition hover:opacity-95 active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none"
          >
            {checkingPhone || submitting ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            {checkingPhone ? "Checking…" : submitting ? submittingLabel : submitLabel}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border bg-card px-5 py-2.5 text-sm font-semibold text-muted-foreground hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <p className="ml-auto text-xs text-muted-foreground">* Required fields</p>
        </div>
      </form>
    </div>
  );
}
