import { useState, useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Check, ChevronRight, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/crm/PageHeader";
import { fetchInstallerById, updateInstallerPartner } from "@/lib/installerService";
import type { B2bPartner, InstallerType } from "@/data/inventoryStore";

export const Route = createFileRoute("/inventory_/installer/$id")({ component: EditInstallerPage });

const inputCls =
  "h-10 w-full rounded-xl border bg-muted/40 px-3.5 text-sm outline-none transition focus:bg-card focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/60";
const selectCls = inputCls + " cursor-pointer";

const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Delhi",
  "Jammu & Kashmir",
  "Ladakh",
];

function EditInstallerPage() {
  const navigate = useNavigate();
  const { id } = Route.useParams();

  const [partner, setPartner] = useState<B2bPartner | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [companyName, setCompanyName] = useState("");
  const [gstin, setGstin] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");
  const [contact, setContact] = useState("");
  const [installerType, setInstallerType] = useState<InstallerType | "">("");

  useEffect(() => {
    fetchInstallerById(id).then((p) => {
      if (p) {
        setPartner(p);
        setCompanyName(p.companyName);
        setGstin(p.gstin);
        setAddress(p.address);
        setCity(p.city);
        setState(p.state);
        setPincode(p.pincode);
        setContact(p.contact);
        setInstallerType(p.installerType ?? "");
      }
      setLoading(false);
    });
  }, [id]);

  const canSubmit =
    !saving &&
    companyName.trim() &&
    gstin.trim() &&
    address.trim() &&
    city.trim() &&
    state &&
    pincode.trim() &&
    contact.trim() &&
    installerType;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!partner) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <p className="text-lg font-semibold text-muted-foreground">Installer not found</p>
        <button
          onClick={() => navigate({ to: "/inventory", search: { tab: "installer" } })}
          className="rounded-xl border bg-card px-4 py-2 text-sm font-semibold hover:bg-muted transition-colors"
        >
          Back to Installer
        </button>
      </div>
    );
  }

  async function handleSubmit() {
    if (!canSubmit) return;
    setSaving(true);
    setError(null);
    try {
      await updateInstallerPartner(id, {
        companyName: companyName.trim(),
        gstin: gstin.trim().toUpperCase(),
        address: address.trim(),
        city: city.trim(),
        state,
        pincode: pincode.trim(),
        contact: contact.trim(),
        installerType: installerType || undefined,
      });
      navigate({ to: "/inventory", search: { tab: "installer" } });
    } catch {
      setError("Failed to save. Please try again.");
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
        eyebrow="Inventory / Installer"
        title="Edit Installer"
        description={`Editing: ${partner.companyName}`}
        actions={
          <button
            onClick={() => navigate({ to: "/inventory", search: { tab: "installer" } })}
            className="inline-flex items-center gap-2 rounded-xl border bg-card px-4 py-2.5 text-[13px] font-semibold text-muted-foreground shadow-card hover:bg-muted transition-colors"
          >
            <ChevronRight className="h-4 w-4 rotate-180" /> Back to Installer
          </button>
        }
      />

      <div className="rounded-2xl border bg-card shadow-card overflow-hidden">
        <div className="border-b bg-muted/30 px-6 py-3">
          <p className="text-[13px] font-bold text-primary">Installer Details</p>
        </div>
        <div className="p-6 space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                Company Name <span className="text-red-500">*</span>
              </label>
              <input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. SURYATECH SOLAR INSTALLERS"
                className={inputCls}
                autoComplete="off"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                Address <span className="text-red-500">*</span>
              </label>
              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Street / Area"
                className={inputCls}
                autoComplete="off"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                City <span className="text-red-500">*</span>
              </label>
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="City"
                className={inputCls}
                autoComplete="off"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                GSTIN <span className="text-red-500">*</span>
              </label>
              <input
                value={gstin}
                onChange={(e) => setGstin(e.target.value.toUpperCase())}
                placeholder="e.g. 24AAACW0395M1ZA"
                className={inputCls + " font-mono"}
                maxLength={15}
                autoComplete="off"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                State <span className="text-red-500">*</span>
              </label>
              <select
                value={state}
                onChange={(e) => setState(e.target.value)}
                className={selectCls}
                autoComplete="off"
              >
                <option value="">Select State…</option>
                {INDIAN_STATES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                Pincode <span className="text-red-500">*</span>
              </label>
              <input
                value={pincode}
                onChange={(e) => setPincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="6-digit pincode"
                className={inputCls}
                maxLength={6}
                autoComplete="off"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                Contact No. <span className="text-red-500">*</span>
              </label>
              <input
                value={contact}
                onChange={(e) => setContact(e.target.value.replace(/\D/g, "").slice(0, 10))}
                placeholder="10-digit mobile"
                className={inputCls}
                maxLength={10}
                autoComplete="off"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                Installer Type <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2 pt-1">
                {(
                  [
                    { label: "Wireman", val: "WIREMAN" },
                    { label: "Fabricator", val: "FABRICATOR" },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.val}
                    type="button"
                    onClick={() => setInstallerType(opt.val)}
                    className={`flex-1 rounded-xl border py-2 text-xs font-semibold transition-all ${
                      installerType === opt.val
                        ? "gradient-primary text-white border-transparent shadow-glow"
                        : "bg-muted/60 text-muted-foreground border-border hover:bg-muted"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-600">
              {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-3 border-t pt-4">
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="inline-flex items-center gap-2 rounded-xl gradient-primary px-7 py-2.5 text-[13px] font-bold text-white shadow-glow disabled:opacity-40 transition hover:opacity-95"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              {saving ? "Saving…" : "Save Changes"}
            </button>
            <button
              onClick={() => navigate({ to: "/inventory", search: { tab: "installer" } })}
              className="rounded-xl bg-red-500 px-5 py-2.5 text-[13px] font-bold text-white hover:bg-red-600 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
