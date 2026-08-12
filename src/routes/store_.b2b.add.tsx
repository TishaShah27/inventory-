import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Check, ChevronRight, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/crm/PageHeader";
import { createB2bPartner } from "@/lib/b2bService";

export const Route = createFileRoute("/store_/b2b/add")({ component: StoreAddB2bPage });

const inputCls  = "h-10 w-full rounded-xl border bg-muted/40 px-3.5 text-sm outline-none transition focus:bg-card focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/60";
const selectCls = inputCls + " cursor-pointer";

const INDIAN_STATES = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat",
  "Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh",
  "Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab",
  "Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh",
  "Uttarakhand","West Bengal","Delhi","Jammu & Kashmir","Ladakh",
];

function StoreAddB2bPage() {
  const navigate = useNavigate();

  const [companyName, setCompanyName] = useState("");
  const [gstin,       setGstin]       = useState("");
  const [address,     setAddress]     = useState("");
  const [city,        setCity]        = useState("");
  const [state,       setState]       = useState("");
  const [pincode,     setPincode]     = useState("");
  const [contact,     setContact]     = useState("");
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState<string | null>(null);

  const canSubmit = !saving && companyName.trim() && gstin.trim() && address.trim() && city.trim() && state && pincode.trim() && contact.trim();

  async function handleSubmit() {
    if (!canSubmit) return;
    setSaving(true);
    setError(null);
    try {
      await createB2bPartner({
        companyName: companyName.trim(),
        gstin:       gstin.trim().toUpperCase(),
        address:     address.trim(),
        city:        city.trim(),
        state,
        pincode:     pincode.trim(),
        contact:     contact.trim(),
      });
      navigate({ to: "/store", search: { tab: "b2b" } });
    } catch (err) {
      console.error("[B2B Add]", err);
      const msg = (err as { message?: string })?.message;
      setError(msg ? `Error: ${msg}` : "Failed to save. Please try again.");
      setSaving(false);
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}
      className="space-y-6">

      <PageHeader
        eyebrow="Inventory / B2B"
        title="Add B2B Partner"
        description="Add a new supplier or B2B partner to the inventory."
        actions={
          <button onClick={() => navigate({ to: "/store", search: { tab: "b2b" } })}
            className="inline-flex items-center gap-2 rounded-xl border bg-card px-4 py-2.5 text-[13px] font-semibold text-muted-foreground shadow-card hover:bg-muted transition-colors">
            <ChevronRight className="h-4 w-4 rotate-180" /> Back to B2B
          </button>
        }
      />

      <div className="rounded-2xl border bg-card shadow-card overflow-hidden">
        <div className="gradient-primary px-6 py-3">
          <p className="text-[13px] font-bold text-white">Partner Details</p>
        </div>
        <div className="p-6 space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Company Name <span className="text-red-500">*</span></label>
              <input value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="e.g. WAAREE ENERGIES LTD" className={inputCls} autoComplete="off" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Address <span className="text-red-500">*</span></label>
              <input value={address} onChange={e => setAddress(e.target.value)} placeholder="Street / Area" className={inputCls} autoComplete="off" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">City <span className="text-red-500">*</span></label>
              <input value={city} onChange={e => setCity(e.target.value)} placeholder="City" className={inputCls} autoComplete="off" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">GSTIN <span className="text-red-500">*</span></label>
              <input value={gstin} onChange={e => setGstin(e.target.value.toUpperCase())} placeholder="e.g. 24AAACW0395M1ZA" className={inputCls + " font-mono"} maxLength={15} autoComplete="off" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">State <span className="text-red-500">*</span></label>
              <select value={state} onChange={e => setState(e.target.value)} className={selectCls} autoComplete="off">
                <option value="">Select State…</option>
                {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Pincode <span className="text-red-500">*</span></label>
              <input value={pincode} onChange={e => setPincode(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="6-digit pincode" className={inputCls} maxLength={6} autoComplete="off" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Contact No. <span className="text-red-500">*</span></label>
              <input value={contact} onChange={e => setContact(e.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="10-digit mobile" className={inputCls} maxLength={10} autoComplete="off" />
            </div>
          </div>

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-600">{error}</p>
          )}

          <div className="flex items-center justify-end gap-3 border-t pt-4">
            <button onClick={handleSubmit} disabled={!canSubmit}
              className="inline-flex items-center gap-2 rounded-xl gradient-primary px-7 py-2.5 text-[13px] font-bold text-white shadow-glow disabled:opacity-40 transition hover:opacity-95">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {saving ? "Saving…" : "Submit"}
            </button>
            <button onClick={() => navigate({ to: "/store", search: { tab: "b2b" } })}
              className="rounded-xl bg-red-500 px-5 py-2.5 text-[13px] font-bold text-white hover:bg-red-600 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
