import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ChevronRight, Check } from "lucide-react";
import { PageHeader } from "@/components/crm/PageHeader";
import { useQueryClient } from "@tanstack/react-query";
import { createSubcategory } from "@/lib/inventoryService";

export const Route = createFileRoute("/inventory_/product/new")({ component: NewProductPage });

const inputCls =
  "h-10 w-full rounded-xl border bg-muted/40 px-3.5 text-sm outline-none transition focus:bg-card focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/60";

function NewProductPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSave = name.trim().length > 0;

  async function handleSave() {
    if (!canSave || saving) return;
    setSaving(true);
    setError(null);
    try {
      // categoryId is currently ignored by backend insert; keep '1' for compatibility
      await createSubcategory("1", name.trim());
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      navigate({ to: "/inventory", search: { tab: "products" } });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className="space-y-6"
    >
      <PageHeader
        eyebrow="Inventory / Products"
        title="Add Product"
        description="Add a new product SKU."
        actions={
          <button
            onClick={() => navigate({ to: "/inventory", search: { tab: "products" } })}
            className="inline-flex items-center gap-2 rounded-xl border bg-card px-4 py-2.5 text-[13px] font-semibold text-muted-foreground shadow-card hover:bg-muted transition-colors"
          >
            <ChevronRight className="h-4 w-4 rotate-180" /> Back to Products
          </button>
        }
      />

      <div className="rounded-2xl border bg-card px-6 py-6 shadow-card">
        <div className="max-w-2xl">
          <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Product Name <span className="text-red-500">*</span></label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter product name"
            className={inputCls + " mt-2"}
          />

          {error && (
            <div className="mt-3 rounded-md bg-red-50 px-3 py-2 text-red-700">{error}</div>
          )}

          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={() => navigate({ to: "/inventory", search: { tab: "products" } })}
              className="rounded-xl bg-red-500 px-5 py-2.5 text-[13px] font-bold text-white hover:bg-red-600 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!canSave || saving}
              className="inline-flex items-center gap-2 rounded-xl gradient-primary px-6 py-2.5 text-[13px] font-bold text-white disabled:opacity-40"
            >
              <Check className="h-4 w-4" /> {saving ? "Saving…" : "Save Product"}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
