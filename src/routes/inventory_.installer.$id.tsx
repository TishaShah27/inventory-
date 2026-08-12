import { useState, useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Check, ChevronRight, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/crm/PageHeader";
import { fetchInstallerById, updateInstallerPartner } from "@/lib/installerService";
import type { B2bPartner } from "@/data/inventoryStore";

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
    contact.trim();
    

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
