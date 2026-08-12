import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowLeft, Package, Building2, Hash, Truck } from "lucide-react";
import { fetchInwardEntries } from "@/lib/inwardService";
import { fetchAllInventory } from "@/lib/inventoryService";
import { fetchB2bPartners } from "@/lib/b2bService";
import { fetchInstallerPartners } from "@/lib/installerService";

export const Route = createFileRoute("/inventory_/inward/$id")({ component: InwardDetailPage });

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

function fmtINR(n: number) {
  return "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function InwardDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();

  const { data: allEntries = [] } = useQuery({
    queryKey: ["inwardEntries"],
    queryFn: fetchInwardEntries,
  });
  const { data: inventoryData } = useQuery({ queryKey: ["inventory"], queryFn: fetchAllInventory });
  const { data: b2bPartners = [] } = useQuery({
    queryKey: ["b2bPartners"],
    queryFn: fetchB2bPartners,
  });
  const { data: installerPartners = [] } = useQuery({
    queryKey: ["installerPartners"],
    queryFn: fetchInstallerPartners,
  });

  const subs = inventoryData?.subs ?? [];
  const cats = inventoryData?.cats ?? [];
  const groups = inventoryData?.groups ?? [];
  const masters = inventoryData?.masters ?? [];

  // Find anchor entry by id, then group all entries with same inwardId
  const anchor = allEntries.find((e) => e.id === id);
  const inwardId = anchor?.inwardId ?? "";
  const entries = allEntries.filter((e) => e.inwardId === inwardId);

  // Look up supplier partner for contact/address details
  const supplierName = anchor?.supplier ?? "";
  const supplierType = anchor?.supplierType ?? "b2b";
  const allPartners = supplierType === "b2i" ? installerPartners : b2bPartners;
  const partner = allPartners.find((p) => p.companyName === supplierName);

  function getChain(subcategoryId: string) {
    const sub = subs.find((s) => s.id === subcategoryId);
    const cat = cats.find((c) => c.id === sub?.categoryId);
    const grp = groups.find((g) => g.id === cat?.groupId);
    const master = masters.find((m) => m.id === grp?.masterId);
    return { sub, cat, grp, master };
  }

  const grandTotal = entries.reduce((s, e) => {
    const gst = +((e.price * e.qty * e.gstPct) / 100).toFixed(2);
    return s + +(e.price * e.qty + gst).toFixed(2);
  }, 0);

  if (!anchor) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Package className="h-12 w-12 text-muted-foreground/20" />
        <p className="text-muted-foreground text-sm">Entry not found</p>
        <button
          onClick={() => navigate({ to: "/inventory", search: { tab: "inward" } })}
          className="text-sm text-primary underline"
        >
          Back to Inventory
        </button>
      </div>
    );
  }

  const supplierFields = [
    ["Invoice Date", fmtDate(anchor.invoiceDate)],
    ["Material Received Date", fmtDate(anchor.materialReceivedDate)],
    ["Supplier Name", supplierName || "—"],
    ["Supplier Type", supplierType === "b2i" ? "INSTALLER" : supplierType.toUpperCase()],
    ...(partner
      ? [
          ["Contact", (partner as any).contact || "—"],
          ["GST Number", (partner as any).gstin || "—"],
          ["Address", (partner as any).address || "—"],
          ["City", (partner as any).city || "—"],
          ["State", (partner as any).state || "—"],
          ["Pincode", (partner as any).pincode || "—"],
        ]
      : []),
    ["Bill Number", anchor.billNumber || "—"],
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6">
      {/* Back + Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate({ to: "/inventory", search: { tab: "inward" } })}
          className="grid h-9 w-9 place-items-center rounded-xl border bg-card text-muted-foreground hover:bg-primary-soft hover:text-primary hover:border-primary/30 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            Inventory · Inward
          </p>
          <h1 className="text-xl font-bold text-foreground">Inward Material Detail</h1>
        </div>
        <span className="ml-auto rounded-xl gradient-primary px-4 py-1.5 font-mono text-[13px] font-bold text-white shadow-glow">
          {inwardId}
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
              Entry Type
            </p>
            <p className="mt-0.5 text-xl font-bold text-white">
              {anchor.entryType ?? "New Materials"}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[11px] font-bold uppercase tracking-widest text-white/70">
              Total Value
            </p>
            <p className="mt-0.5 text-xl font-bold text-white">{fmtINR(grandTotal)}</p>
            <p className="text-[11px] text-white/70">
              {entries.length} material line{entries.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Supplier Details */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: 0.05 }}
        className="rounded-2xl border bg-card shadow-card overflow-hidden"
      >
        <div className="flex items-center gap-2.5 border-b bg-muted/40 px-5 py-3">
          <Building2 className="h-4 w-4 text-primary" />
          <span className="text-[12px] font-bold uppercase tracking-wide text-foreground">
            Material Supplier Details
          </span>
        </div>
        <div className="grid grid-cols-2 gap-0 sm:grid-cols-3">
          {supplierFields.map(([label, value], i) => (
            <div
              key={label}
              className={`px-5 py-4 ${i !== supplierFields.length - 1 ? "border-b sm:border-b-0 sm:border-r" : ""} ${Math.floor(i / 3) < Math.floor((supplierFields.length - 1) / 3) ? "sm:border-b" : ""}`}
            >
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                {label}
              </p>
              <p className="text-[13px] font-semibold text-foreground">{value}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Materials Table */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: 0.1 }}
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
                {[
                  "Master",
                  "Group / Brand",
                  "Category",
                  "Sub Category",
                  "Qty",
                  "Price/Unit",
                  "GST %",
                  "GST",
                  "Total",
                ].map((h) => (
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
                const gstAmt = +((e.price * e.qty * e.gstPct) / 100).toFixed(2);
                const rowTotal = +(e.price * e.qty + gstAmt).toFixed(2);
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
                    <td className="px-4 py-3 font-mono text-[12px] whitespace-nowrap">
                      ₹{e.price.toLocaleString("en-IN")}
                    </td>
                    <td className="px-4 py-3 text-[12px] text-muted-foreground whitespace-nowrap">
                      {e.gstPct}%
                    </td>
                    <td className="px-4 py-3 font-mono text-[12px] text-muted-foreground whitespace-nowrap">
                      ₹{gstAmt.toLocaleString("en-IN")}
                    </td>
                    <td className="px-4 py-3 font-mono text-[12px] font-bold text-emerald-700 whitespace-nowrap">
                      ₹{rowTotal.toLocaleString("en-IN")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 bg-muted/30">
                <td
                  colSpan={8}
                  className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wide text-muted-foreground"
                >
                  Grand Total
                </td>
                <td className="px-4 py-3 font-mono text-[13px] font-bold text-emerald-700">
                  {fmtINR(grandTotal)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </motion.div>

      {/* Serial Numbers per entry */}
      {entries.some((e) => e.serialNos?.length > 0) && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.15 }}
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
