import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowLeft, Package, Building2, Hash, Truck, User } from "lucide-react";
import { fetchOutwardEntries } from "@/lib/outwardService";
import { fetchAllInventory } from "@/lib/inventoryService";
import { fetchB2bPartners } from "@/lib/b2bService";
import { fetchInstallerPartners } from "@/lib/installerService";
import { fetchCustomers } from "@/lib/customerService";

export const Route = createFileRoute("/store_/outward/$id")({ component: StoreOutwardDetailPage });

function fmtDate(d?: string) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return d;
  }
}

function StoreOutwardDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();

  const { data: allEntries = [] } = useQuery({ queryKey: ["outwardEntries"], queryFn: fetchOutwardEntries });
  const { data: inventoryData } = useQuery({ queryKey: ["inventory"], queryFn: fetchAllInventory });
  const { data: b2bPartners = [] } = useQuery({ queryKey: ["b2bPartners"], queryFn: fetchB2bPartners });
  const { data: installerPartners = [] } = useQuery({ queryKey: ["installerPartners"], queryFn: fetchInstallerPartners });
  const { data: customers = [] } = useQuery({ queryKey: ["customers"], queryFn: fetchCustomers });

  const subs = inventoryData?.subs ?? [];
  const cats = inventoryData?.cats ?? [];
  const groups = inventoryData?.groups ?? [];
  const masters = inventoryData?.masters ?? [];

  const anchor = allEntries.find((e) => e.id === id);
  const billNumber = anchor?.billNumber ?? "";
  const entries = allEntries.filter((e) => e.outwardId === (anchor?.outwardId ?? ""));

  const deliveryTo = anchor?.deliveryTo ?? "BUYER";
  const partnerName = anchor?.deliveryPartner ?? "";

  function getChain(subcategoryId: string) {
    const sub = subs.find((s) => s.id === subcategoryId);
    const cat = cats.find((c) => c.id === sub?.categoryId);
    const grp = groups.find((g) => g.id === cat?.groupId);
    const master = masters.find((m) => m.id === grp?.masterId);
    return { sub, cat, grp, master };
  }

  if (!anchor) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Package className="h-12 w-12 text-muted-foreground/20" />
        <p className="text-muted-foreground text-sm">Entry not found</p>
        <button
          onClick={() => navigate({ to: "/store", search: { tab: "outward" } })}
          className="text-sm text-primary underline"
        >
          Back to Inventory
        </button>
      </div>
    );
  }

  const partnerLabel =
    deliveryTo === "SELLER"
      ? "Seller Details"
      : deliveryTo === "CUSTOMER"
      ? "Customer Details"
      : "Buyer Details";

  const partnerFields = [
    [deliveryTo === "CUSTOMER" ? "Customer Name" : "Company Name", partnerName || "—"],
    ["Contact", anchor.deliveryContact || (partner as any)?.contact || "—"],
    ["GST Number", anchor.gstDetails || (partner as any)?.gstin || "—"],
    ["Address", anchor.customerAddress || (partner as any)?.address || "—"],
    ["City", anchor.deliveryCity || (partner as any)?.city || "—"],
    ["State", (partner as any)?.state || "—"],
    ["Pincode", (partner as any)?.pincode || "—"],
    ["Bill Number", anchor.billNumber || "—"],
    ["Concerned Person", anchor.concernedPerson || "—"],
  ];

  const hasDriverInfo =
    anchor.driverName || anchor.driverContact || anchor.vehicleNo || anchor.remarks;
  const driverFields = [
    ["Driver Name", anchor.driverName || "—"],
    ["Driver Contact", anchor.driverContact || "—"],
    ["Vehicle No", anchor.vehicleNo || "—"],
    ["Remarks", anchor.remarks || "—"],
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6">
      {/* Back + Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate({ to: "/store", search: { tab: "outward" } })}
          className="grid h-9 w-9 place-items-center rounded-xl border bg-card text-muted-foreground hover:bg-primary-soft hover:text-primary hover:border-primary/30 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            Inventory · Outward
          </p>
          <h1 className="text-xl font-bold text-foreground">Outward Material Detail</h1>
        </div>
        <span className="ml-auto rounded-xl gradient-primary px-4 py-1.5 font-mono text-[13px] font-bold text-white shadow-glow">
          {billNumber}
        </span>
      </div>

      {/* Entry Type + Summary */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="rounded-2xl overflow-hidden border shadow-card"
      >
        <div className="gradient-primary px-6 py-5 flex items-center gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-white/15">
            <Truck className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-[11px] font-bold uppercase tracking-widest text-white/70">
              Outward Entry Type
            </p>
            <p className="mt-0.5 text-xl font-bold text-white">
              {deliveryTo === "SELLER"
                ? "SELLER"
                : deliveryTo === "BUYER"
                ? "BUYER"
                : deliveryTo === "CUSTOMER"
                ? "CUSTOMER"
                : deliveryTo}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[11px] font-bold uppercase tracking-widest text-white/70">
              Challan Date
            </p>
            <p className="mt-0.5 text-xl font-bold text-white">{fmtDate(anchor.challanDate)}</p>
            <p className="text-[11px] text-white/70">
              {entries.length} material line{entries.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Partner / Customer Details */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: 0.05 }}
        className="rounded-2xl border bg-card shadow-card overflow-hidden"
      >
        <div className="flex items-center gap-2.5 border-b bg-muted/40 px-5 py-3">
          <Building2 className="h-4 w-4 text-primary" />
          <span className="text-[12px] font-bold uppercase tracking-wide text-foreground">
            {partnerLabel}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-0 sm:grid-cols-3">
          {partnerFields.map(([label, value], i) => (
            <div
              key={label}
              className={`px-5 py-4 ${i !== partnerFields.length - 1 ? "border-b sm:border-b-0 sm:border-r" : ""} ${Math.floor(i / 3) < Math.floor((partnerFields.length - 1) / 3) ? "sm:border-b" : ""}`}
            >
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                {label}
              </p>
              <p className="text-[13px] font-semibold text-foreground">{value}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Driver Details */}
      {hasDriverInfo && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.1 }}
          className="rounded-2xl border bg-card shadow-card overflow-hidden"
        >
          <div className="flex items-center gap-2.5 border-b bg-muted/40 px-5 py-3">
            <User className="h-4 w-4 text-primary" />
            <span className="text-[12px] font-bold uppercase tracking-wide text-foreground">
              Driver Details
            </span>
          </div>
          <div className="grid grid-cols-2 gap-0 sm:grid-cols-4">
            {driverFields.map(([label, value], i) => (
              <div
                key={label}
                className={`px-5 py-4 ${i !== driverFields.length - 1 ? "border-b sm:border-b-0 sm:border-r" : ""}`}
              >
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  {label}
                </p>
                <p className="text-[13px] font-semibold text-foreground">{value}</p>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Materials Table */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: 0.15 }}
        className="rounded-2xl border bg-card shadow-card overflow-hidden"
      >
        <div className="flex items-center gap-2.5 border-b bg-muted/40 px-5 py-3">
          <Package className="h-4 w-4 text-primary" />
          <span className="text-[12px] font-bold uppercase tracking-wide text-foreground">
            Materials
          </span>
          <span className="ml-auto rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-bold text-primary">
            {entries.length} items
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b bg-muted/20">
                {["Master", "Group / Brand", "Category", "Sub Category", "Quantity"].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entries.map((e, i) => {
                const { sub, cat, grp, master } = getChain(e.subcategoryId);
                return (
                  <tr
                    key={e.id}
                    className={`border-b transition-colors hover:bg-primary-soft/10 ${i % 2 !== 0 ? "bg-muted/5" : ""}`}
                  >
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-full gradient-primary px-3 py-1 text-[10px] font-bold text-white whitespace-nowrap">
                        {master?.name ?? "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[12px] font-semibold whitespace-nowrap">
                      {grp?.name ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-[12px] text-muted-foreground whitespace-nowrap">
                      {cat?.name ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-[12px] font-semibold whitespace-nowrap">
                      {sub?.name ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-[12px] font-bold whitespace-nowrap">
                      {e.qty}{" "}
                      <span className="text-muted-foreground font-normal">{master?.unit}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Serial Numbers per entry */}
      {entries.some((e) => e.serialNos?.length > 0) && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.2 }}
          className="rounded-2xl border bg-card shadow-card overflow-hidden"
        >
          <div className="flex items-center gap-2.5 border-b bg-muted/40 px-5 py-3">
            <Hash className="h-4 w-4 text-primary" />
            <span className="text-[12px] font-bold uppercase tracking-wide text-foreground">
              Serial Numbers
            </span>
          </div>
          <div className="divide-y">
            {entries
              .filter((e) => e.serialNos?.length > 0)
              .map((e) => {
                const { sub } = getChain(e.subcategoryId);
                return (
                  <div key={e.id} className="px-5 py-4">
                    <p className="text-[11px] font-bold text-muted-foreground mb-2">
                      {sub?.name ?? e.subcategoryId} · {e.qty} units
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {e.serialNos.map((sn, i) => (
                        <span
                          key={i}
                          className="rounded-md bg-primary-soft px-2 py-0.5 font-mono text-[10px] font-semibold text-primary"
                        >
                          {sn}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
          </div>
        </motion.div>
      )}
    </div>
  );
}
