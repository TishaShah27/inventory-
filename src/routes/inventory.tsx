import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import * as InvStore from "@/data/inventoryStore";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package,
  Plus,
  X,
  ChevronRight,
  ChevronDown,
  ArrowDownToLine,
  ArrowUpFromLine,
  QrCode,
  Search,
  Filter,
  AlertTriangle,
  BarChart3,
  ShieldCheck,
  Layers,
  Tag,
  Box,
  Boxes,
  FileText,
  Check,
  Copy,
  Activity,
  TrendingUp,
  RefreshCw,
  PackageSearch,
  Zap,
  Pencil,
  Trash2,
  Eye,
  Printer,
  Menu,
  Building2,
  Phone,
  MapPin,
  Sun,
  BatteryCharging,
  Cable,
  type LucideIcon,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
} from "recharts";
import { PageHeader } from "@/components/crm/PageHeader";
import { StatCard } from "@/components/crm/StatCard";
import { CrmSelect } from "@/components/crm/CrmSelect";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { fetchInstallerPartners, deleteInstallerPartner } from "@/lib/installerService";
import { fetchB2bPartners, deleteB2bPartner } from "@/lib/b2bService";
import {
  fetchAllInventory,
  createMaster,
  updateMaster,
  deleteMaster,
  createGroup,
  updateGroup,
  deleteGroup,
  createCategory,
  updateCategory,
  deleteCategory,
  createSubcategory,
  updateSubcategory,
  deleteSubcategory,
} from "@/lib/inventoryService";
import { fetchInwardEntries, fetchMaxInwardSeq } from "@/lib/inwardService";
import { fetchOutwardEntries } from "@/lib/outwardService";
import { fetchInstallerPartnerStock } from "@/lib/installerInventoryService";

export const Route = createFileRoute("/inventory")({
  validateSearch: (s: Record<string, unknown>) => ({ tab: (s.tab as string) ?? "dashboard" }),
  component: InventoryPage,
});

/* ══════════════════════════════════════════════════════════════════════════
   TYPES
══════════════════════════════════════════════════════════════════════════ */
type Master = { id: string; name: string; unit: string };
type Group = { id: string; masterId: string; name: string };
type Category = { id: string; groupId: string; name: string };
type Subcategory = {
  id: string;
  categoryId: string;
  name: string;
  stock: number;
  godownStock: number;
};
type MovType = "in" | "out";
type Movement = {
  id: string;
  subcategoryId: string;
  type: MovType;
  qty: number;
  date: string;
  ref: string;
  note: string;
  inwardId?: string;
  supplier?: string;
  invoiceDate?: string;
  billNumber?: string;
  materialReceivedDate?: string;
  entryType?: string;
};

type B2bPartner = {
  id: string;
  companyName: string;
  gstin: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  contact: string;
  
};

/* ══════════════════════════════════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════════════════════════════════ */
function uid() {
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function StockBadge({ stock }: { stock: number }) {
  const level = stockLevel(stock);
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold border ${
        level === "empty"
          ? "bg-red-50 text-red-600 border-red-200"
          : level === "low"
            ? "bg-amber-50 text-amber-600 border-amber-200"
            : "bg-emerald-50 text-emerald-700 border-emerald-200"
      }`}
    >
      {level !== "healthy" ? <AlertTriangle className="h-2.5 w-2.5" /> : null}
      {stock}
    </span>
  );
}

/* ── Modal shell ─────────────────────────────────────────────────────────── */
function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ duration: 0.18 }}
        onClick={(e) => e.stopPropagation()}
        className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border bg-card shadow-2xl"
      >
        <div className="gradient-primary flex items-center justify-between px-5 py-4">
          <p className="text-[15px] font-bold text-white">{title}</p>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full bg-white/10 text-white hover:bg-white/25 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </motion.div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}

const inputCls =
  "h-10 w-full rounded-xl border bg-muted/40 px-3.5 text-sm outline-none transition focus:bg-card focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/60";
const selectCls = inputCls + " cursor-pointer";

/* ── QR Code modal ───────────────────────────────────────────────────────── */
function QrModal({
  sub,
  cat,
  group,
  master,
  onClose,
}: {
  sub: Subcategory;
  cat: Category;
  group: Group;
  master: Master;
  onClose: () => void;
}) {
  const code =
    `ASPL-${master.name.replace(/\s+/g, "-").toUpperCase()}-${group.name}-${cat.name}-${sub.name}-${sub.id}`.toUpperCase();
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  // Simple visual QR-like pattern using the code hash
  const cells = Array.from({ length: 7 * 7 }, (_, i) => {
    const c = code.charCodeAt(i % code.length);
    return (c + i * 13 + i * i) % 3 !== 0;
  });

  return (
    <Modal title="QR Code" onClose={onClose}>
      <div className="p-5 space-y-4">
        <div className="flex flex-col items-center gap-4">
          {/* QR grid */}
          <div className="rounded-2xl border-4 border-foreground p-3 bg-white">
            <div className="grid gap-0.5" style={{ gridTemplateColumns: "repeat(7,1fr)" }}>
              {cells.map((filled, i) => (
                <div
                  key={i}
                  className={`h-5 w-5 rounded-[2px] ${filled ? "bg-foreground" : "bg-white"}`}
                />
              ))}
            </div>
          </div>
          <div className="text-center">
            <p className="text-[10px] font-mono font-bold text-muted-foreground break-all">
              {code}
            </p>
          </div>
        </div>

        <div className="rounded-xl border bg-muted/30 p-3 space-y-1 text-xs">
          {[
            ["Master", master.name],
            ["Group", group.name],
            ["Category", cat.name],
            ["Subcategory", sub.name],
            ["Stock", `${sub.stock} ${master.unit}`],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between">
              <span className="text-muted-foreground">{k}</span>
              <span className="font-semibold">{v}</span>
            </div>
          ))}
        </div>

        <button
          onClick={copy}
          className={`w-full inline-flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition-all ${copied ? "bg-emerald-500 text-white" : "gradient-primary text-white shadow-glow"}`}
        >
          {copied ? (
            <>
              <Check className="h-4 w-4" /> Copied!
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" /> Copy Product Code
            </>
          )}
        </button>
      </div>
    </Modal>
  );
}

/* ── Movement modal ──────────────────────────────────────────────────────── */
function MovementModal({
  sub,
  cat,
  group,
  master,
  type: initType,
  onSave,
  onClose,
}: {
  sub: Subcategory;
  cat: Category;
  group: Group;
  master: Master;
  type: MovType;
  onSave: (m: Movement) => void;
  onClose: () => void;
}) {
  const [type, setType] = useState<MovType>(initType);
  const [qty, setQty] = useState(1);
  const [ref, setRef] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  function save() {
    onSave({ id: uid(), subcategoryId: sub.id, type, qty, ref, note, date });
    onClose();
  }

  return (
    <Modal title={type === "in" ? "Stock Inward" : "Stock Outward"} onClose={onClose}>
      <div className="p-5 space-y-4">
        <div className="rounded-xl border bg-primary-soft px-4 py-2.5 text-xs space-y-0.5">
          <p className="font-bold text-primary">
            {master.name} → {group.name} → {cat.name} → {sub.name}
          </p>
          <p className="text-muted-foreground">
            Current stock:{" "}
            <span className="font-bold text-foreground">
              {sub.stock} {master.unit}
            </span>
          </p>
        </div>

        {/* In / Out toggle */}
        <div className="grid grid-cols-2 gap-2">
          {(["in", "out"] as MovType[]).map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`rounded-xl border py-2.5 text-sm font-bold transition-all ${
                type === t
                  ? t === "in"
                    ? "gradient-primary text-white border-transparent shadow-glow"
                    : "bg-red-500 text-white border-transparent"
                  : "bg-card text-muted-foreground hover:bg-muted"
              }`}
            >
              {t === "in" ? "↓ Inward" : "↑ Outward"}
            </button>
          ))}
        </div>

        <Field label="Date">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={inputCls}
          />
        </Field>

        <Field label={`Quantity (${master.unit})`}>
          <input
            type="number"
            min={1}
            value={qty}
            onChange={(e) => setQty(Math.max(1, Number(e.target.value)))}
            className={inputCls}
          />
        </Field>

        <Field label="Reference (PO / SO / Challan No.)">
          <input
            value={ref}
            onChange={(e) => setRef(e.target.value)}
            placeholder="e.g. PO-023"
            className={inputCls}
          />
        </Field>

        <Field label="Note">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="Optional note…"
            className="w-full rounded-xl border bg-muted/40 px-3.5 py-2.5 text-sm outline-none transition focus:bg-card focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/60 resize-none"
          />
        </Field>

        <div className="flex gap-3">
          <button
            onClick={save}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl gradient-primary py-2.5 text-sm font-bold text-white shadow-glow transition hover:opacity-95"
          >
            <Check className="h-4 w-4" /> Save {type === "in" ? "Inward" : "Outward"}
          </button>
          <button
            onClick={onClose}
            className="rounded-xl border bg-card px-4 text-sm font-semibold text-muted-foreground hover:bg-muted transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   TAB: OVERVIEW  (dashboard-grade)
══════════════════════════════════════════════════════════════════════════ */
function OverviewTab({
  masters,
  groups,
  cats,
  subs,
  movements,
}: {
  masters: Master[];
  groups: Group[];
  cats: Category[];
  subs: Subcategory[];
  movements: Movement[];
}) {
  const totalStock = subs.reduce((s, x) => s + x.stock, 0);
  const lowStock = subs.filter(
    (x) => x.godownStock > 0 && x.godownStock < LOW_STOCK_THRESHOLD,
  ).length;
  const outOfStock = subs.filter((x) => x.godownStock === 0).length;
  const totalInward = movements.filter((m) => m.type === "in").reduce((s, m) => s + m.qty, 0);
  const totalOut = movements.filter((m) => m.type === "out").reduce((s, m) => s + m.qty, 0);
  const stockHealth =
    subs.length > 0
      ? Math.round(
          (subs.filter((s) => s.godownStock >= LOW_STOCK_THRESHOLD).length / subs.length) * 100,
        )
      : 0;

  // Dynamic movement chart — last 12 months from real data
  const nowDate = new Date();
  const movementChartData = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(nowDate.getFullYear(), nowDate.getMonth() - (11 - i), 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const m = d.toLocaleDateString("en-IN", { month: "short" });
    const inward = movements
      .filter((mv) => mv.type === "in" && mv.date?.startsWith(key))
      .reduce((s, mv) => s + mv.qty, 0);
    const outward = movements
      .filter((mv) => mv.type === "out" && mv.date?.startsWith(key))
      .reduce((s, mv) => s + mv.qty, 0);
    return { m, inward, outward };
  });

  // Month-over-month change for inward and outward
  const thisMonth = `${nowDate.getFullYear()}-${String(nowDate.getMonth() + 1).padStart(2, "0")}`;
  const prevMonthDate = new Date(nowDate.getFullYear(), nowDate.getMonth() - 1, 1);
  const lastMonth = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, "0")}`;
  const thisMonthIn = movements
    .filter((mv) => mv.type === "in" && mv.date?.startsWith(thisMonth))
    .reduce((s, mv) => s + mv.qty, 0);
  const lastMonthIn = movements
    .filter((mv) => mv.type === "in" && mv.date?.startsWith(lastMonth))
    .reduce((s, mv) => s + mv.qty, 0);
  const thisMonthOut = movements
    .filter((mv) => mv.type === "out" && mv.date?.startsWith(thisMonth))
    .reduce((s, mv) => s + mv.qty, 0);
  const lastMonthOut = movements
    .filter((mv) => mv.type === "out" && mv.date?.startsWith(lastMonth))
    .reduce((s, mv) => s + mv.qty, 0);
  const inwardChange =
    lastMonthIn > 0 ? Math.round(((thisMonthIn - lastMonthIn) / lastMonthIn) * 100) : undefined;
  const outwardChange =
    lastMonthOut > 0 ? Math.round(((thisMonthOut - lastMonthOut) / lastMonthOut) * 100) : undefined;

  // Dynamic recent activity from real movements
  function daysDiff(dateStr: string) {
    return Math.floor((Date.now() - new Date(dateStr + "T00:00:00").getTime()) / 86400000);
  }
  const recentActivity = [...movements]
    .filter((mv) => mv.date)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5)
    .map((mv) => {
      const sub = subs.find((s) => s.id === mv.subcategoryId);
      const cat = cats.find((c) => c.id === sub?.categoryId);
      const grp = groups.find((g) => g.id === cat?.groupId);
      const label = [grp?.name, cat?.name, sub?.name].filter(Boolean).join(" ");
      const dir = mv.type === "in" ? "inward" : "outward";
      const d = daysDiff(mv.date);
      const when = d === 0 ? "today" : `${d}d`;
      const color = mv.type === "in" ? "bg-primary" : "bg-amber-400";
      return {
        text: `${mv.qty} unit${mv.qty !== 1 ? "s" : ""} ${dir}${label ? ` — ${label}` : ""}`,
        when,
        color,
      };
    });

  // Stock by master (for funnel-style chart)
  const masterStock = masters
    .map((m) => {
      const gids = groups.filter((g) => g.masterId === m.id).map((g) => g.id);
      const cids = cats.filter((c) => gids.includes(c.groupId)).map((c) => c.id);
      const stock = subs
        .filter((s) => cids.includes(s.categoryId))
        .reduce((sum, s) => sum + s.stock, 0);
      const products = subs.filter((s) => cids.includes(s.categoryId)).length;
      return { name: m.name.replace("Solar ", ""), stock, products };
    })
    .filter((x) => x.products > 0);

  const maxStock = Math.max(...masterStock.map((x) => x.stock), 1);

  // Top products by stock
  const topProducts = [...subs]
    .sort((a, b) => b.stock - a.stock)
    .slice(0, 6)
    .map((s) => {
      const cat = cats.find((c) => c.id === s.categoryId)!;
      const grp = groups.find((g) => g.id === cat?.groupId)!;
      const master = masters.find((m) => m.id === grp?.masterId)!;
      return { ...s, catName: cat?.name, grpName: grp?.name, masterName: master?.name };
    });

  const tooltipStyle = {
    backgroundColor: "var(--card)",
    border: "1px solid var(--border)",
    borderRadius: "12px",
    fontSize: "12px",
  };

  return (
    <div className="space-y-6">
      {/* ── 8 Stat cards ── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Boxes}
          label="Total Stock Units"
          value={String(totalStock)}
          sub={`across ${subs.length} products`}
          tone="primary"
          index={0}
        />
        <StatCard
          icon={Package}
          label="Product SKUs"
          value={String(subs.length)}
          sub={`in ${masters.length} categories`}
          tone="info"
          index={1}
        />
        <StatCard
          icon={ArrowDownToLine}
          label="Total Inward"
          value={String(totalInward)}
          sub="all time receipts"
          change={inwardChange}
          tone="primary"
          index={2}
        />
        <StatCard
          icon={ArrowUpFromLine}
          label="Total Outward"
          value={String(totalOut)}
          sub="all time dispatches"
          change={outwardChange}
          tone="warning"
          index={3}
        />
        <StatCard
          icon={ShieldCheck}
          label="Stock Health"
          value={`${stockHealth}%`}
          sub="godown stock ≥ 100 units"
          tone="primary"
          index={4}
        />
        <StatCard
          icon={AlertTriangle}
          label="Low Stock"
          value={String(lowStock)}
          sub="godown stock below 100"
          tone="warning"
          index={5}
        />
        <StatCard
          icon={PackageSearch}
          label="Out of Stock"
          value={String(outOfStock)}
          sub="zero units in godown"
          tone="destructive"
          index={6}
        />
        <StatCard
          icon={RefreshCw}
          label="Movements (Total)"
          value={String(movements.length)}
          sub="inward + outward entries"
          tone="info"
          index={7}
        />
      </div>

      {/* ── Charts row ── */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Large area chart — col-span-2 */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="col-span-2 rounded-2xl border bg-card p-6 shadow-card"
        >
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-semibold">Stock Movement</h2>
              <p className="text-xs text-muted-foreground">Inward vs Outward — last 12 months</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-primary" /> Inward
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-amber-400" /> Outward
              </span>
            </div>
          </div>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={movementChartData}
                margin={{ left: -10, right: 0, top: 10, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="invIn" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.72 0.18 145)" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="oklch(0.72 0.18 145)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="invOut" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.75 0.18 75)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="oklch(0.75 0.18 75)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="m"
                  stroke="var(--muted-foreground)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="var(--muted-foreground)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Area
                  type="monotone"
                  dataKey="inward"
                  name="Inward"
                  stroke="oklch(0.72 0.18 145)"
                  strokeWidth={2.5}
                  fill="url(#invIn)"
                  dot={false}
                />
                <Area
                  type="monotone"
                  dataKey="outward"
                  name="Outward"
                  stroke="oklch(0.72 0.18 75)"
                  strokeWidth={2.5}
                  fill="url(#invOut)"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Stock health radial + funnel */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="rounded-2xl border bg-card p-6 shadow-card"
        >
          <h2 className="text-lg font-semibold">Stock Health</h2>
          <p className="text-xs text-muted-foreground">Products above minimum level</p>

          <div className="mt-2 rounded-xl bg-primary-soft p-4">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-primary">Health Score</span>
              <span className="font-bold text-primary">{stockHealth}%</span>
            </div>
            <div className="h-36">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart
                  innerRadius="65%"
                  outerRadius="100%"
                  data={[{ name: "health", value: stockHealth }]}
                  startAngle={90}
                  endAngle={-270}
                >
                  <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                  <RadialBar
                    background
                    dataKey="value"
                    cornerRadius={10}
                    fill="oklch(0.72 0.18 145)"
                  />
                </RadialBarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {[
              {
                label: "Healthy (≥100)",
                value: subs.filter((s) => s.godownStock >= LOW_STOCK_THRESHOLD).length,
                color: "bg-primary",
              },
              { label: "Low Stock (<100)", value: lowStock, color: "bg-amber-400" },
              { label: "Out of Stock", value: outOfStock, color: "bg-red-400" },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex items-center gap-2">
                <span className={`h-2 w-2 shrink-0 rounded-full ${color}`} />
                <span className="flex-1 text-xs text-muted-foreground">{label}</span>
                <span className="text-xs font-bold">{value}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* ── Middle row: category bar + top products ── */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Horizontal bar by master */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="rounded-2xl border bg-card p-6 shadow-card"
        >
          <h2 className="text-lg font-semibold">Stock by Category</h2>
          <p className="text-xs text-muted-foreground">Units per master category</p>
          <div className="mt-4 h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={masterStock} layout="vertical" margin={{ left: 0, right: 16 }}>
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="name"
                  stroke="var(--muted-foreground)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  width={72}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar
                  dataKey="stock"
                  name="Stock"
                  radius={[0, 6, 6, 0]}
                  fill="oklch(0.72 0.18 145)"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Top products table */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="col-span-2 rounded-2xl border bg-card shadow-card"
        >
          <div className="flex items-center justify-between border-b p-6">
            <div>
              <h2 className="text-lg font-semibold">Top Stock Products</h2>
              <p className="text-xs text-muted-foreground">
                Highest inventory items across all categories
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-xs font-semibold text-primary">
              <Activity className="h-3.5 w-3.5" /> Live
            </span>
          </div>
          <div className="divide-y">
            {topProducts.map((p, i) => {
              const pct = Math.round((p.stock / (totalStock || 1)) * 100);
              return (
                <div
                  key={p.id}
                  className="flex items-center gap-4 px-6 py-3.5 hover:bg-muted/30 transition-colors"
                >
                  <span className="w-5 shrink-0 text-center text-[11px] font-bold text-muted-foreground/50">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold truncate">
                      {p.masterName} · {p.grpName} · {p.catName}
                    </p>
                    <p className="text-[11px] text-muted-foreground">{p.name}</p>
                    <div className="mt-1.5">
                      <Progress value={pct} className="h-1.5 bg-muted [&>div]:bg-primary" />
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-0.5">
                    <StockBadge stock={p.stock} />
                    <span className="text-[10px] text-muted-foreground">{pct}% of total</span>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>

      {/* ── Bottom row: alerts + activity ── */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Low stock alerts panel */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="rounded-2xl border bg-card p-6 shadow-card"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Stock Alerts</h2>
            {lowStock + outOfStock > 0 && (
              <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-700">
                {lowStock + outOfStock} alerts
              </span>
            )}
          </div>
          <ul className="mt-4 space-y-3">
            {subs
              .filter((s) => s.godownStock < LOW_STOCK_THRESHOLD)
              .slice(0, 5)
              .map((s) => {
                const cat = cats.find((c) => c.id === s.categoryId)!;
                const grp = groups.find((g) => g.id === cat?.groupId)!;
                const master = masters.find((m) => m.id === grp?.masterId)!;
                const isEmpty = s.godownStock === 0;
                return (
                  <li
                    key={s.id}
                    className="flex items-start gap-3 rounded-xl border bg-background/50 p-3 transition hover:shadow-soft"
                  >
                    <div
                      className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${isEmpty ? "bg-[oklch(0.96_0.04_25)] text-[oklch(0.55_0.2_25)]" : "bg-amber-50 text-amber-600"}`}
                    >
                      <AlertTriangle className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-semibold truncate">
                        {grp?.name} {cat?.name} · {s.name}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate">{master?.name}</p>
                      <p
                        className={`text-[11px] font-bold mt-0.5 ${isEmpty ? "text-[oklch(0.55_0.2_25)]" : "text-amber-600"}`}
                      >
                        {isEmpty ? "Out of stock" : `${s.godownStock} in godown — below 100`}
                      </p>
                    </div>
                  </li>
                );
              })}
            {lowStock + outOfStock === 0 && (
              <li className="flex flex-col items-center justify-center py-8 text-center">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary-soft mb-3">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                </div>
                <p className="text-sm font-semibold text-primary">All stocked up!</p>
                <p className="text-xs text-muted-foreground mt-1">No low stock alerts right now</p>
              </li>
            )}
          </ul>
        </motion.div>

        {/* Recent activity timeline */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="col-span-2 rounded-2xl border bg-card p-6 shadow-card"
        >
          <h2 className="text-lg font-semibold">Recent Activity</h2>
          <p className="text-xs text-muted-foreground">Latest inventory movements and alerts</p>

          {recentActivity.length === 0 ? (
            <p className="mt-5 text-sm text-muted-foreground">No movements recorded yet.</p>
          ) : (
            <ol className="relative mt-5 space-y-5 border-l pl-5">
              {recentActivity.map((a, i) => (
                <li key={i} className="relative">
                  <span
                    className={`absolute -left-[27px] top-1.5 h-3 w-3 rounded-full ring-4 ring-card ${a.color}`}
                  />
                  <div className="text-sm text-foreground">{a.text}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {a.when === "today" ? "Today" : `${a.when} ago`}
                  </div>
                </li>
              ))}
            </ol>
          )}

          {/* Category breakdown progress bars */}
          <div className="mt-6 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Category Breakdown
            </p>
            {masterStock.map((m) => (
              <div key={m.name} className="flex items-center gap-3">
                <span className="w-24 shrink-0 truncate text-[12px] font-medium text-muted-foreground">
                  {m.name}
                </span>
                <div className="flex-1">
                  <Progress
                    value={Math.round((m.stock / maxStock) * 100)}
                    className="h-2 bg-muted [&>div]:gradient-primary"
                  />
                </div>
                <span className="w-8 shrink-0 text-right text-[12px] font-bold">{m.stock}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   TAB: STOCK OVERVIEW
══════════════════════════════════════════════════════════════════════════ */

function fmtINR(n: number) {
  return "₹ " + Math.round(n).toLocaleString("en-IN");
}

const LOW_STOCK_THRESHOLD = 100;

type StockLevel = "healthy" | "low" | "empty";
function stockLevel(godownStock: number): StockLevel {
  if (godownStock === 0) return "empty";
  if (godownStock < LOW_STOCK_THRESHOLD) return "low";
  return "healthy";
}

const LEVEL_STYLES: Record<
  StockLevel,
  { card: string; bar: string; badge: string; badgeText: string; label: string }
> = {
  healthy: {
    card: "border-primary/20 bg-card",
    bar: "bg-primary",
    badge: "bg-primary/10",
    badgeText: "text-primary",
    label: "",
  },
  low: {
    card: "border-amber-300/60 bg-amber-50/40 dark:bg-amber-950/10",
    bar: "bg-amber-400",
    badge: "bg-amber-100",
    badgeText: "text-amber-700",
    label: "Low Stock",
  },
  empty: {
    card: "border-red-200/60 bg-red-50/30 dark:bg-red-950/10",
    bar: "bg-red-400",
    badge: "bg-red-100",
    badgeText: "text-red-600",
    label: "Out of Stock",
  },
};

const MASTER_ICONS: Record<string, LucideIcon> = {
  m1: Sun,
  m2: Zap,
  m3: BatteryCharging,
  m4: Layers,
  m5: Cable,
};

type LocationFilter = "godown" | "installer";

function StockOverviewTab({
  masters,
  groups,
  cats,
  subs,
  inwardEntries,
  installerPartners = [],
  installerPartnerStocks = [],
}: {
  masters: Master[];
  groups: Group[];
  cats: Category[];
  subs: Subcategory[];
  inwardEntries: InvStore.InwardEntry[];
  installerPartners?: InvStore.B2bPartner[];
  installerPartnerStocks?: InvStore.InstallerPartnerStock[];
}) {
  const [activeMaster, setActiveMaster] = useState<string>("total");
  const [showOutOfStock, setShowOutOfStock] = useState(false);
  const [location, setLocation] = useState<LocationFilter>("godown");

  // Weighted average purchase price per subcategory from real inward data
  const priceMap = new Map<string, { avgPrice: number; gstRate: number }>();
  {
    const acc = new Map<string, { totalVal: number; totalQty: number; lastGst: number }>();
    for (const e of inwardEntries) {
      const prev = acc.get(e.subcategoryId);
      if (prev) {
        prev.totalVal += e.price * e.qty;
        prev.totalQty += e.qty;
        prev.lastGst = e.gstPct;
      } else {
        acc.set(e.subcategoryId, { totalVal: e.price * e.qty, totalQty: e.qty, lastGst: e.gstPct });
      }
    }
    for (const [id, { totalVal, totalQty, lastGst }] of acc) {
      priceMap.set(id, {
        avgPrice: totalQty > 0 ? totalVal / totalQty : 0,
        gstRate: lastGst / 100,
      });
    }
  }

  function getStock(s: Subcategory) {
    return s.godownStock;
  }
  function skuBase(id: string, stock: number) {
    const p = priceMap.get(id);
    return p ? stock * p.avgPrice : 0;
  }
  function skuGst(id: string, stock: number) {
    const p = priceMap.get(id);
    return p ? stock * p.avgPrice * p.gstRate : 0;
  }

  const masterData = masters.map((m) => {
    const gids = groups.filter((g) => g.masterId === m.id).map((g) => g.id);
    const cids = cats.filter((c) => gids.includes(c.groupId)).map((c) => c.id);
    const items = subs.filter((s) => cids.includes(s.categoryId));
    const totalStock = items.reduce((sum, s) => sum + getStock(s), 0);
    const baseValue = items.reduce((sum, s) => sum + skuBase(s.id, getStock(s)), 0);
    const gstValue = items.reduce((sum, s) => sum + skuGst(s.id, getStock(s)), 0);
    const skuCount = items.length;
    const lowCount = items.filter(
      (s) => getStock(s) > 0 && getStock(s) < LOW_STOCK_THRESHOLD,
    ).length;
    const emptyCount = items.filter((s) => getStock(s) === 0).length;
    const grpData = groups
      .filter((g) => g.masterId === m.id)
      .map((g) => {
        const gcids = cats.filter((c) => c.groupId === g.id).map((c) => c.id);
        const gitems = subs.filter((s) => gcids.includes(s.categoryId));
        return {
          group: g,
          items: gitems.map((s) => {
            const cat = cats.find((c) => c.id === s.categoryId)!;
            return { sub: { ...s, stock: getStock(s) }, catName: cat?.name ?? "" };
          }),
        };
      })
      .filter((gd) => gd.items.length > 0);
    return {
      master: m,
      totalStock,
      baseValue,
      gstValue,
      grpData,
      items,
      skuCount,
      lowCount,
      emptyCount,
    };
  });

  const grandBase = masterData.reduce((s, m) => s + m.baseValue, 0);
  const grandGst = masterData.reduce((s, m) => s + m.gstValue, 0);
  const grandTotal = grandBase + grandGst;
  const grandStock = masterData.reduce((s, m) => s + m.totalStock, 0);

  const activeMasterData = masterData.find((m) => m.master.id === activeMaster);

  const LOCATION_OPTS: { id: LocationFilter; label: string }[] = [
    { id: "godown", label: "Godown" },
    { id: "installer", label: "Seller" },
  ];

  // Installer summary — use all stock records (no partner join needed for totals)
  const installerFilteredMd =
    activeMaster === "total" ? masterData : masterData.filter((m) => m.master.id === activeMaster);
  const installerAllSubIds = new Set(
    installerFilteredMd.flatMap((md) => md.grpData.flatMap((gd) => gd.items.map((i) => i.sub.id))),
  );
  const installerRelevant = installerPartnerStocks.filter(
    (ps) =>
      installerAllSubIds.has(ps.subcategoryId) ||
      installerAllSubIds.has(String(Number(ps.subcategoryId))),
  );
  const installerTotalUnits = installerRelevant.reduce((s, ps) => s + ps.qty, 0);
  const installerActiveDealers = new Set(
    installerRelevant
      .filter((ps) => ps.qty > 0)
      .map((ps) => ps.installerPartnerName.trim().toLowerCase()),
  ).size;
  const installerSkusInStock = new Set(
    installerRelevant.filter((ps) => ps.qty > 0).map((ps) => ps.subcategoryId),
  ).size;
  const installerSummary = (
    <div className="rounded-2xl overflow-hidden border shadow-card">
      <div className="gradient-primary px-6 py-5 flex items-center gap-4">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-white/15">
          <Building2 className="h-6 w-6 text-white" />
        </div>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-white/70">
            Seller Stock
          </p>
          <p className="mt-0.5 text-2xl font-bold text-white">
            {installerTotalUnits.toLocaleString("en-IN")} Units
          </p>
          <p className="mt-0.5 text-[12px] text-white/70">across all seller partners</p>
        </div>
      </div>
      <div className="grid grid-cols-3 divide-x bg-card">
        <div className="flex items-center gap-3 px-5 py-3.5">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary-soft">
            <Boxes className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
              Total Units
            </p>
            <p className="mt-0.5 text-lg font-bold text-foreground">
              {installerTotalUnits.toLocaleString("en-IN")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 px-5 py-3.5">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary-soft">
            <Building2 className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
              Active Dealers
            </p>
            <p className="mt-0.5 text-lg font-bold text-foreground">
              {installerActiveDealers} / {installerPartners.length}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 px-5 py-3.5">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary-soft">
            <PackageSearch className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
              SKUs in Stock
            </p>
            <p className="mt-0.5 text-lg font-bold text-foreground">{installerSkusInStock}</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* ── Location filter ── */}
      <div className="inline-flex items-center gap-1 rounded-xl border bg-card p-1 shadow-card">
        {LOCATION_OPTS.map((opt) => (
          <button
            key={opt.id}
            onClick={() => {
              setLocation(opt.id);
              setActiveMaster("total");
            }}
            className={`rounded-lg px-4 py-1.5 text-[12px] font-semibold transition-all ${
              location === opt.id
                ? "gradient-primary text-white shadow-glow"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* ══════════════ SELLER PARTNER VIEW ══════════════ */}
      {location === "installer" && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="space-y-5"
        >
          {/* Master filter tabs */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex flex-wrap gap-1.5">
              <button
                onClick={() => setActiveMaster("total")}
                className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-[12px] font-semibold transition-all ${
                  activeMaster === "total"
                    ? "gradient-primary text-white shadow-glow"
                    : "border bg-card text-muted-foreground hover:border-primary/40 hover:text-primary shadow-card"
                }`}
              >
                Total
              </button>
              {masterData.map((md) => (
                <button
                  key={md.master.id}
                  onClick={() => setActiveMaster(md.master.id)}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-[12px] font-semibold transition-all ${
                    activeMaster === md.master.id
                      ? "gradient-primary text-white shadow-glow"
                      : "border bg-card text-muted-foreground hover:border-primary/40 hover:text-primary shadow-card"
                  }`}
                >
                  {md.master.name}
                </button>
              ))}
            </div>
            <label className="inline-flex cursor-pointer select-none items-center gap-2.5">
              <span className="text-[12px] font-medium text-muted-foreground">
                Show Out of Stock
              </span>
              <button
                role="switch"
                aria-checked={showOutOfStock}
                onClick={() => setShowOutOfStock((v) => !v)}
                className={`relative h-5 w-9 rounded-full transition-colors duration-200 ${showOutOfStock ? "bg-primary" : "bg-border"}`}
              >
                <span
                  className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${showOutOfStock ? "translate-x-4" : "translate-x-0.5"}`}
                />
              </button>
            </label>
          </div>

          {/* Seller summary hero */}
          {installerSummary}

          {installerPartners.length === 0 ? (
            <EmptyState
              icon={Building2}
              title="No seller partners yet"
              sub="Add seller partners to track their stock"
            />
          ) : (
            installerPartners.map((partner) => {
              // Match by name (case-insensitive, trimmed) as primary key — IDs may differ in format
              const partnerName = partner.companyName.trim().toLowerCase();
              const filteredMd =
                activeMaster === "total"
                  ? masterData
                  : masterData.filter((m) => m.master.id === activeMaster);
              const allSubs = filteredMd.flatMap((md) =>
                md.grpData.flatMap((gd) =>
                  gd.items.map(({ sub, catName }) => ({
                    sub,
                    catName,
                    grp: gd.group,
                    master: md.master,
                    qty:
                      installerPartnerStocks.find(
                        (ps) =>
                          ps.installerPartnerName.trim().toLowerCase() === partnerName &&
                          (ps.subcategoryId === sub.id ||
                            Number(ps.subcategoryId) === Number(sub.id)),
                      )?.qty ?? 0,
                  })),
                ),
              );

              const visibleItems = showOutOfStock ? allSubs : allSubs.filter((i) => i.qty > 0);
              const totalQty = allSubs.reduce((sum, i) => sum + i.qty, 0);
              const nonZero = allSubs.filter((i) => i.qty > 0).length;

              return (
                <div
                  key={partner.id}
                  className="rounded-2xl border bg-card shadow-card overflow-hidden"
                >
                  {/* Dealer header */}
                  <div className="gradient-primary flex items-center justify-between px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <p className="text-[14px] font-bold text-white">{partner.companyName}</p>
                      <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-bold text-white">
                        {nonZero} / {allSubs.length} items
                      </span>
                    </div>
                    <p className="text-[12px] text-white/80">
                      {totalQty.toLocaleString("en-IN")} units total
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
                    {visibleItems.map(({ sub, catName, grp, master, qty }) => {
                      const level = stockLevel(qty);
                      const st = LEVEL_STYLES[level];
                      const skuPct = totalQty > 0 ? Math.round((qty / totalQty) * 100) : 0;
                      return (
                        <div
                          key={`${partner.id}-${sub.id}`}
                          className="group rounded-2xl border bg-card shadow-card p-5 hover:border-primary/40 hover:shadow-soft transition-all"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2.5">
                              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-soft">
                                <Box className="h-5 w-5 text-primary" />
                              </div>
                              <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground leading-tight">
                                {catName} {sub.name}
                              </p>
                            </div>
                            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-bold text-primary shrink-0">
                              {skuPct}%
                            </span>
                          </div>

                          <div className="flex items-baseline justify-end gap-1.5 mt-1">
                            <p className="text-2xl font-bold text-foreground leading-none">
                              {qty.toLocaleString("en-IN")}
                            </p>
                            <span className="text-sm font-medium text-muted-foreground">
                              {master.unit}
                            </span>
                          </div>

                          <div className="mt-4 h-1 rounded-full bg-muted overflow-hidden">
                            <div
                              className={`h-full rounded-full ${level === "healthy" ? "gradient-primary" : st.bar} transition-all`}
                              style={{ width: `${skuPct}%` }}
                            />
                          </div>

                          {st.label && (
                            <div className="mt-3 flex flex-wrap gap-1.5">
                              <span
                                className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${st.badge} ${st.badgeText}`}
                              >
                                {st.label}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {visibleItems.length === 0 && (
                      <div className="col-span-full py-8 text-center text-[12px] text-muted-foreground">
                        No stock — toggle "Show Out of Stock" to see all items
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </motion.div>
      )}

      {/* ══════════════ GODOWN VIEW ══════════════ */}
      {location === "godown" && (
        <>
          {/* ── Sub-tab bar + toggle ── */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex flex-wrap gap-1.5">
              <button
                onClick={() => setActiveMaster("total")}
                className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-[12px] font-semibold transition-all ${
                  activeMaster === "total"
                    ? "gradient-primary text-white shadow-glow"
                    : "border bg-card text-muted-foreground hover:border-primary/40 hover:text-primary shadow-card"
                }`}
              >
                Total
              </button>
              {masterData.map((md) => (
                <button
                  key={md.master.id}
                  onClick={() => setActiveMaster(md.master.id)}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-[12px] font-semibold transition-all ${
                    activeMaster === md.master.id
                      ? "gradient-primary text-white shadow-glow"
                      : "border bg-card text-muted-foreground hover:border-primary/40 hover:text-primary shadow-card"
                  }`}
                >
                  {md.master.name}
                </button>
              ))}
            </div>

            <label className="inline-flex cursor-pointer select-none items-center gap-2.5">
              <span className="text-[12px] font-medium text-muted-foreground">
                Show Out of Stock
              </span>
              <button
                role="switch"
                aria-checked={showOutOfStock}
                onClick={() => setShowOutOfStock((v) => !v)}
                className={`relative h-5 w-9 rounded-full transition-colors duration-200 ${showOutOfStock ? "bg-primary" : "bg-border"}`}
              >
                <span
                  className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${showOutOfStock ? "translate-x-4" : "translate-x-0.5"}`}
                />
              </button>
            </label>
          </div>

          {/* ── TOTAL view ── */}
          {activeMaster === "total" && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-5"
            >
              {/* Grand total hero card */}
              <div className="rounded-2xl overflow-hidden border shadow-card">
                <div className="gradient-primary px-6 py-5 flex items-center gap-4">
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-white/15">
                    <TrendingUp className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-widest text-white/70">
                      Total Stock Value
                    </p>
                    <p className="mt-0.5 text-2xl font-bold text-white">{fmtINR(grandTotal)}</p>
                    <p className="mt-0.5 text-[12px] text-white/70">
                      {fmtINR(grandBase)} + {fmtINR(grandGst)} GST
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-3 divide-x bg-card">
                  <div className="flex items-center gap-3 px-5 py-3.5">
                    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary-soft">
                      <Boxes className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                        Total Units
                      </p>
                      <p className="mt-0.5 text-lg font-bold text-foreground">
                        {grandStock.toLocaleString("en-IN")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 px-5 py-3.5">
                    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary-soft">
                      <Tag className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                        Categories
                      </p>
                      <p className="mt-0.5 text-lg font-bold text-foreground">{masters.length}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 px-5 py-3.5">
                    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary-soft">
                      <PackageSearch className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                        SKUs Tracked
                      </p>
                      <p className="mt-0.5 text-lg font-bold text-foreground">{subs.length}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Per-master summary cards */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {(() => {
                  const maxMasterStock = Math.max(...masterData.map((m) => m.totalStock), 1);
                  return masterData
                    .filter((md) => showOutOfStock || md.totalStock > 0)
                    .map((md, i) => {
                      const total = md.baseValue + md.gstValue;
                      const pct = grandTotal > 0 ? Math.round((total / grandTotal) * 100) : 0;
                      const barPct = Math.round((md.totalStock / maxMasterStock) * 100);
                      return (
                        <motion.button
                          key={md.master.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2, delay: i * 0.05 }}
                          onClick={() => setActiveMaster(md.master.id)}
                          className="group text-left rounded-2xl border bg-card shadow-card p-5 hover:border-primary/40 hover:shadow-soft transition-all"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2.5">
                              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-soft">
                                {(() => {
                                  const Icon = MASTER_ICONS[md.master.id] ?? Package;
                                  return <Icon className="h-5 w-5 text-primary" />;
                                })()}
                              </div>
                              <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground group-hover:text-primary transition-colors leading-tight">
                                {md.master.name}
                              </p>
                            </div>
                            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-bold text-primary shrink-0">
                              {pct}%
                            </span>
                          </div>

                          <div className="flex items-baseline justify-end gap-1.5 mt-1">
                            <p className="text-2xl font-bold text-foreground leading-none">
                              {md.totalStock.toLocaleString("en-IN")}
                            </p>
                            <span className="text-sm font-medium text-muted-foreground">
                              {md.master.unit}
                            </span>
                          </div>
                          <p className="mt-3 text-[13px] font-semibold text-foreground">
                            {fmtINR(total)}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {fmtINR(md.baseValue)} + {fmtINR(md.gstValue)} GST
                          </p>

                          <div className="mt-4 h-1 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full gradient-primary transition-all"
                              style={{ width: `${barPct}%` }}
                            />
                          </div>

                          {/* Alert chips */}
                          {(md.lowCount > 0 || md.emptyCount > 0) && (
                            <div className="mt-3 flex flex-wrap gap-1.5">
                              {md.emptyCount > 0 && (
                                <span className="rounded-md bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-500">
                                  {md.emptyCount} out of stock
                                </span>
                              )}
                              {md.lowCount > 0 && (
                                <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-600">
                                  {md.lowCount} low stock
                                </span>
                              )}
                            </div>
                          )}
                        </motion.button>
                      );
                    });
                })()}
              </div>
            </motion.div>
          )}

          {/* ── Master detail view ── */}
          {activeMaster !== "total" && activeMasterData && (
            <motion.div
              key={activeMaster}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-5"
            >
              {/* Master hero */}
              <div className="rounded-2xl overflow-hidden border shadow-card">
                <div className="gradient-primary px-6 py-5 flex items-center gap-4">
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-white/15">
                    {(() => {
                      const Icon = MASTER_ICONS[activeMasterData.master.id] ?? Package;
                      return <Icon className="h-6 w-6 text-white" />;
                    })()}
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-widest text-white/70">
                      {activeMasterData.master.name}
                    </p>
                    <p className="mt-0.5 text-2xl font-bold text-white">
                      {fmtINR(activeMasterData.baseValue + activeMasterData.gstValue)}
                    </p>
                    <p className="text-[12px] text-white/70">
                      {fmtINR(activeMasterData.baseValue)} + {fmtINR(activeMasterData.gstValue)} GST
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-3 divide-x bg-card">
                  <div className="flex items-center gap-3 px-5 py-3.5">
                    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary-soft">
                      <Boxes className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                        Total Units
                      </p>
                      <p className="mt-0.5 text-lg font-bold text-foreground">
                        {activeMasterData.totalStock.toLocaleString("en-IN")}
                        <span className="ml-1 text-xs font-medium text-muted-foreground">
                          {activeMasterData.master.unit}
                        </span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 px-5 py-3.5">
                    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary-soft">
                      <PackageSearch className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                        SKUs
                      </p>
                      <p className="mt-0.5 text-lg font-bold text-foreground">
                        {activeMasterData.skuCount}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 px-5 py-3.5">
                    <div
                      className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${activeMasterData.emptyCount > 0 ? "bg-red-50" : activeMasterData.lowCount > 0 ? "bg-amber-50" : "bg-primary-soft"}`}
                    >
                      <AlertTriangle
                        className={`h-4 w-4 ${activeMasterData.emptyCount > 0 ? "text-red-500" : activeMasterData.lowCount > 0 ? "text-amber-500" : "text-primary"}`}
                      />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                        Alerts
                      </p>
                      <p
                        className={`mt-0.5 text-lg font-bold ${activeMasterData.emptyCount > 0 ? "text-red-500" : activeMasterData.lowCount > 0 ? "text-amber-600" : "text-primary"}`}
                      >
                        {activeMasterData.lowCount + activeMasterData.emptyCount === 0
                          ? "None"
                          : `${activeMasterData.lowCount + activeMasterData.emptyCount}`}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Brand sections */}
              {activeMasterData.grpData.map((gd) => {
                const filteredItems = showOutOfStock
                  ? gd.items
                  : gd.items.filter((i) => i.sub.stock > 0);
                if (filteredItems.length === 0) return null;
                const grpStock = filteredItems.reduce((s, i) => s + i.sub.stock, 0);
                const grpBase = filteredItems.reduce(
                  (s, { sub }) => s + skuBase(sub.id, sub.stock),
                  0,
                );
                const grpGst = filteredItems.reduce(
                  (s, { sub }) => s + skuGst(sub.id, sub.stock),
                  0,
                );

                return (
                  <div
                    key={gd.group.id}
                    className="rounded-2xl border bg-card shadow-card overflow-hidden"
                  >
                    {/* Brand header */}
                    <div className="gradient-primary flex items-center justify-between px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <p className="text-[13px] font-bold text-white">{gd.group.name}</p>
                        <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-bold text-white">
                          {filteredItems.length} SKUs
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="text-[12px] font-semibold text-white">
                          {fmtINR(grpBase + grpGst)}
                        </p>
                        <p className="text-[10px] text-white/70">
                          {grpStock.toLocaleString("en-IN")} {activeMasterData.master.unit}
                        </p>
                      </div>
                    </div>

                    {/* Item cards grid */}
                    <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
                      {(() => {
                        const maxSkuStock = Math.max(...filteredItems.map((i) => i.sub.stock), 1);
                        return filteredItems.map(({ sub, catName }) => {
                          const base = skuBase(sub.id, sub.stock);
                          const gst = skuGst(sub.id, sub.stock);
                          const level = stockLevel(sub.godownStock ?? sub.stock);
                          const s = LEVEL_STYLES[level];

                          const skuPct = Math.round((sub.stock / maxSkuStock) * 100);

                          return (
                            <div
                              key={sub.id}
                              className="group rounded-2xl border bg-card shadow-card p-5 hover:border-primary/40 hover:shadow-soft transition-all"
                            >
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-2.5">
                                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-soft">
                                    <Box className="h-5 w-5 text-primary" />
                                  </div>
                                  <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground leading-tight">
                                    {catName} {sub.name}
                                  </p>
                                </div>
                                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-bold text-primary shrink-0">
                                  {skuPct}%
                                </span>
                              </div>

                              <div className="flex items-baseline justify-end gap-1.5 mt-1">
                                <p className="text-2xl font-bold text-foreground leading-none">
                                  {sub.stock.toLocaleString("en-IN")}
                                </p>
                                <span className="text-sm font-medium text-muted-foreground">
                                  {activeMasterData.master.unit}
                                </span>
                              </div>

                              {sub.stock > 0 && (
                                <>
                                  <p className="mt-3 text-[13px] font-semibold text-foreground">
                                    {fmtINR(base + gst)}
                                  </p>
                                  <p className="text-[11px] text-muted-foreground">
                                    {fmtINR(base)}/- + {fmtINR(gst)}/- GST
                                  </p>
                                </>
                              )}

                              <div className="mt-4 h-1 rounded-full bg-muted overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${level === "healthy" ? "gradient-primary" : s.bar} transition-all`}
                                  style={{ width: `${skuPct}%` }}
                                />
                              </div>

                              {s.label && (
                                <div className="mt-3 flex flex-wrap gap-1.5">
                                  <span
                                    className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${s.badge} ${s.badgeText}`}
                                  >
                                    {s.label}
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                );
              })}
            </motion.div>
          )}
        </>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   PRODUCT SUB-TAB HELPERS
══════════════════════════════════════════════════════════════════════════ */

const AVATAR_PALETTE = [
  "from-emerald-500 to-teal-600",
  "from-sky-500 to-blue-600",
  "from-amber-400 to-orange-500",
  "from-violet-500 to-purple-600",
  "from-rose-500 to-pink-500",
  "from-cyan-400 to-sky-500",
];

function ItemAvatar({
  name,
  index,
  size = "md",
}: {
  name: string;
  index: number;
  size?: "sm" | "md";
}) {
  const grad = AVATAR_PALETTE[index % AVATAR_PALETTE.length];
  return (
    <div
      className={`shrink-0 bg-gradient-to-br ${grad} flex items-center justify-center font-bold text-white shadow-sm ${
        size === "sm" ? "h-8 w-8 rounded-lg text-[12px]" : "h-10 w-10 rounded-xl text-[14px]"
      }`}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

function SubTabHeader({
  icon: Icon,
  title,
  description,
  count,
  countLabel,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  count: number;
  countLabel: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border bg-card px-5 py-4 shadow-card">
      <div className="flex items-center gap-3.5">
        <div className="grid h-11 w-11 place-items-center rounded-xl gradient-primary shadow-glow">
          <Icon className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-[15px] font-bold leading-tight">{title}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">{description}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="rounded-full border border-primary/20 bg-primary-soft px-3.5 py-1 text-[12px] font-bold text-primary">
          {count} {countLabel}
        </span>
      </div>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  sub,
}: {
  icon: React.ElementType;
  title: string;
  sub: string;
}) {
  return (
    <div className="flex flex-col items-center py-14 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-muted/60 mb-3">
        <Icon className="h-6 w-6 text-muted-foreground/40" />
      </div>
      <p className="text-[13px] font-semibold text-muted-foreground">{title}</p>
      <p className="text-[11px] text-muted-foreground/60 mt-1">{sub}</p>
    </div>
  );
}

function DeleteConfirmButtons({
  onConfirm,
  onCancel,
}: {
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={onConfirm}
        className="rounded-lg bg-red-500 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-red-600 transition-colors shadow-sm"
      >
        Delete
      </button>
      <button
        onClick={onCancel}
        className="rounded-lg border bg-card px-3 py-1.5 text-[11px] font-semibold text-muted-foreground hover:bg-muted transition-colors"
      >
        Cancel
      </button>
    </div>
  );
}

function RowActions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={onEdit}
        title="Edit"
        className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[11px] font-semibold text-amber-600 hover:bg-amber-100 transition-colors"
      >
        <Pencil className="h-3 w-3" /> Edit
      </button>
      <button
        onClick={onDelete}
        title="Delete"
        className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-[11px] font-semibold text-red-500 hover:bg-red-100 transition-colors"
      >
        <Trash2 className="h-3 w-3" /> Delete
      </button>
    </div>
  );
}

/* ── Master sub-tab ─────────────────────────────────────────────────────── */
function MasterSubTab({
  masters,
  onAdd,
  onEdit,
  onDelete,
}: {
  masters: Master[];
  onAdd: (name: string, unit: string) => void;
  onEdit: (id: string, name: string, unit: string) => void;
  onDelete: (id: string) => void;
}) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editItem, setEditItem] = useState<Master | null>(null);
  const [editName, setEditName] = useState("");
  const [editUnit, setEditUnit] = useState("NOS");
  const [showAdd, setShowAdd] = useState(false);
  const [addName, setAddName] = useState("");
  const [addUnit, setAddUnit] = useState("NOS");

  const UNITS = ["NOS", "MTR"];

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border bg-card shadow-card overflow-hidden">
        {masters.length === 0 ? (
          <EmptyState
            icon={Boxes}
            title="No masters yet"
            sub="Add your first product master to get started"
          />
        ) : (
          masters.map((m, i) => (
            <div
              key={m.id}
              className={`flex items-center gap-4 px-5 py-4 transition-colors hover:bg-primary-soft/20 ${i > 0 ? "border-t" : ""}`}
            >
              <ItemAvatar name={m.name} index={i} />
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-bold leading-tight">{m.name}</p>
                <div className="mt-1 flex items-center gap-2">
                  <span className="rounded-md bg-primary/10 px-2 py-0.5 font-mono text-[10px] font-bold text-primary">
                    {m.unit}
                  </span>
                  <span className="text-[11px] text-muted-foreground">unit of measurement</span>
                </div>
              </div>
              <div className="shrink-0">
                {deletingId === m.id ? (
                  <DeleteConfirmButtons
                    onConfirm={() => {
                      onDelete(m.id);
                      setDeletingId(null);
                    }}
                    onCancel={() => setDeletingId(null)}
                  />
                ) : (
                  <RowActions
                    onEdit={() => {
                      setEditItem(m);
                      setEditName(m.name);
                      setEditUnit(m.unit);
                    }}
                    onDelete={() => setDeletingId(m.id)}
                  />
                )}
              </div>
            </div>
          ))
        )}
        <div className="flex items-center justify-between border-t bg-gradient-to-r from-primary-soft/10 to-primary-soft/30 px-5 py-3.5">
          <p className="text-[11px] text-muted-foreground">
            Masters define your top-level product hierarchy
          </p>
          <button
            onClick={() => setShowAdd(true)}
            className="inline-flex items-center gap-2 rounded-xl gradient-primary px-4 py-2.5 text-[12px] font-bold text-white shadow-glow hover:opacity-90 transition"
          >
            <Plus className="h-3.5 w-3.5" /> Add New Master
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showAdd && (
          <Modal title="Add New Master" onClose={() => setShowAdd(false)}>
            <div className="p-5 space-y-4">
              <Field label="Master Name">
                <input
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  placeholder="e.g. Solar Panel"
                  className={inputCls}
                />
              </Field>
              <Field label="Unit">
                <select
                  value={addUnit}
                  onChange={(e) => setAddUnit(e.target.value)}
                  className={selectCls}
                >
                  {UNITS.map((u) => (
                    <option key={u}>{u}</option>
                  ))}
                </select>
              </Field>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    if (addName.trim()) {
                      onAdd(addName.trim(), addUnit);
                      setAddName("");
                      setShowAdd(false);
                    }
                  }}
                  disabled={!addName.trim()}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl gradient-primary py-2.5 text-sm font-bold text-white shadow-glow disabled:opacity-40"
                >
                  <Plus className="h-4 w-4" /> Add Master
                </button>
                <button
                  onClick={() => setShowAdd(false)}
                  className="rounded-xl border bg-card px-4 text-sm font-semibold text-muted-foreground hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editItem && (
          <Modal title="Edit Master" onClose={() => setEditItem(null)}>
            <div className="p-5 space-y-4">
              <Field label="Master Name">
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="Unit">
                <select
                  value={editUnit}
                  onChange={(e) => setEditUnit(e.target.value)}
                  className={selectCls}
                >
                  {UNITS.map((u) => (
                    <option key={u}>{u}</option>
                  ))}
                </select>
              </Field>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    if (editName.trim()) {
                      onEdit(editItem.id, editName.trim(), editUnit);
                      setEditItem(null);
                    }
                  }}
                  disabled={!editName.trim()}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl gradient-primary py-2.5 text-sm font-bold text-white shadow-glow disabled:opacity-40"
                >
                  <Check className="h-4 w-4" /> Save Changes
                </button>
                <button
                  onClick={() => setEditItem(null)}
                  className="rounded-xl border bg-card px-4 text-sm font-semibold text-muted-foreground hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Group sub-tab ──────────────────────────────────────────────────────── */
function GroupSubTab({
  masters,
  groups,
  onAdd,
  onEdit,
  onDelete,
}: {
  masters: Master[];
  groups: Group[];
  onAdd: (masterId: string, name: string) => void;
  onEdit: (id: string, name: string) => void;
  onDelete: (id: string) => void;
}) {
  const [selectedMasterId, setSelectedMasterId] = useState(masters[0]?.id ?? "");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editItem, setEditItem] = useState<Group | null>(null);
  const [editName, setEditName] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [addName, setAddName] = useState("");

  const filtered = groups.filter((g) => g.masterId === selectedMasterId);
  const selectedMaster = masters.find((m) => m.id === selectedMasterId);

  return (
    <div className="space-y-4">
      {/* Master filter pills */}
      <div className="rounded-2xl border bg-card px-5 py-4 shadow-card">
        <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Filter by Master
        </p>
        <div className="flex flex-wrap gap-2">
          {masters.map((m, i) => {
            const active = selectedMasterId === m.id;
            const grad = AVATAR_PALETTE[i % AVATAR_PALETTE.length];
            return (
              <button
                key={m.id}
                onClick={() => setSelectedMasterId(m.id)}
                className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[12px] font-semibold transition-all ${
                  active
                    ? "gradient-primary border-transparent text-white shadow-glow"
                    : "bg-card text-muted-foreground hover:bg-muted"
                }`}
              >
                <span className={`h-4 w-4 rounded-full bg-gradient-to-br ${grad} inline-block`} />
                {m.name}
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border bg-card shadow-card overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState
            icon={Layers}
            title="No groups for this master"
            sub="Add a brand or manufacturer group below"
          />
        ) : (
          filtered.map((g, i) => (
            <div
              key={g.id}
              className={`flex items-center gap-4 px-5 py-4 transition-colors hover:bg-primary-soft/20 ${i > 0 ? "border-t" : ""}`}
            >
              <ItemAvatar name={g.name} index={i} />
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-bold leading-tight">{g.name}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Under{" "}
                  <span className="font-semibold text-foreground">{selectedMaster?.name}</span>
                </p>
              </div>
              <div className="shrink-0">
                {deletingId === g.id ? (
                  <DeleteConfirmButtons
                    onConfirm={() => {
                      onDelete(g.id);
                      setDeletingId(null);
                    }}
                    onCancel={() => setDeletingId(null)}
                  />
                ) : (
                  <RowActions
                    onEdit={() => {
                      setEditItem(g);
                      setEditName(g.name);
                    }}
                    onDelete={() => setDeletingId(g.id)}
                  />
                )}
              </div>
            </div>
          ))
        )}
        <div className="flex items-center justify-between border-t bg-gradient-to-r from-primary-soft/10 to-primary-soft/30 px-5 py-3.5">
          <p className="text-[11px] text-muted-foreground">
            Groups represent brands or manufacturers
          </p>
          <button
            onClick={() => setShowAdd(true)}
            className="inline-flex items-center gap-2 rounded-xl gradient-primary px-4 py-2.5 text-[12px] font-bold text-white shadow-glow hover:opacity-90 transition"
          >
            <Plus className="h-3.5 w-3.5" /> Add New Group
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showAdd && (
          <Modal
            title={`Add Group under ${selectedMaster?.name}`}
            onClose={() => setShowAdd(false)}
          >
            <div className="p-5 space-y-4">
              <Field label="Group Name (Brand)">
                <input
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  placeholder="e.g. WAAREE"
                  className={inputCls}
                />
              </Field>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    if (addName.trim()) {
                      onAdd(selectedMasterId, addName.trim().toUpperCase());
                      setAddName("");
                      setShowAdd(false);
                    }
                  }}
                  disabled={!addName.trim()}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl gradient-primary py-2.5 text-sm font-bold text-white shadow-glow disabled:opacity-40"
                >
                  <Plus className="h-4 w-4" /> Add Group
                </button>
                <button
                  onClick={() => setShowAdd(false)}
                  className="rounded-xl border bg-card px-4 text-sm font-semibold text-muted-foreground hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editItem && (
          <Modal title="Edit Group" onClose={() => setEditItem(null)}>
            <div className="p-5 space-y-4">
              <Field label="Group Name">
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className={inputCls}
                />
              </Field>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    if (editName.trim()) {
                      onEdit(editItem.id, editName.trim().toUpperCase());
                      setEditItem(null);
                    }
                  }}
                  disabled={!editName.trim()}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl gradient-primary py-2.5 text-sm font-bold text-white shadow-glow disabled:opacity-40"
                >
                  <Check className="h-4 w-4" /> Save Changes
                </button>
                <button
                  onClick={() => setEditItem(null)}
                  className="rounded-xl border bg-card px-4 text-sm font-semibold text-muted-foreground hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Category sub-tab ───────────────────────────────────────────────────── */
function CategorySubTab({
  masters,
  groups,
  cats,
  onAdd,
  onEdit,
  onDelete,
}: {
  masters: Master[];
  groups: Group[];
  cats: Category[];
  onAdd: (groupId: string, name: string) => void;
  onEdit: (id: string, name: string) => void;
  onDelete: (id: string) => void;
}) {
  const [selectedMasterId, setSelectedMasterId] = useState(masters[0]?.id ?? "");
  const [selectedGroupId, setSelectedGroupId] = useState(
    groups.find((g) => g.masterId === masters[0]?.id)?.id ?? "",
  );
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editItem, setEditItem] = useState<Category | null>(null);
  const [editName, setEditName] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [addName, setAddName] = useState("");

  const groupsForMaster = groups.filter((g) => g.masterId === selectedMasterId);
  const filtered = cats.filter((c) => c.groupId === selectedGroupId);
  const selectedGroupName = groups.find((g) => g.id === selectedGroupId)?.name;
  const selectedMaster = masters.find((m) => m.id === selectedMasterId);

  return (
    <div className="space-y-4">
      {/* Breadcrumb filter */}
      <div className="rounded-2xl border bg-card px-5 py-4 shadow-card">
        <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Filter Hierarchy
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
              Master
            </span>
            <div className="flex flex-wrap gap-1.5">
              {masters.map((m, i) => (
                <button
                  key={m.id}
                  onClick={() => {
                    setSelectedMasterId(m.id);
                    const first = groups.find((g) => g.masterId === m.id)?.id ?? "";
                    setSelectedGroupId(first);
                  }}
                  className={`rounded-full border px-3 py-1 text-[11px] font-semibold transition-all ${
                    selectedMasterId === m.id
                      ? "gradient-primary border-transparent text-white shadow-glow"
                      : "bg-card text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {m.name}
                </button>
              ))}
            </div>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/40 mt-4" />
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
              Group
            </span>
            <div className="flex flex-wrap gap-1.5">
              {groupsForMaster.map((g) => (
                <button
                  key={g.id}
                  onClick={() => setSelectedGroupId(g.id)}
                  className={`rounded-full border px-3 py-1 text-[11px] font-semibold transition-all ${
                    selectedGroupId === g.id
                      ? "gradient-primary border-transparent text-white shadow-glow"
                      : "bg-card text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {g.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border bg-card shadow-card overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState
            icon={Tag}
            title="No categories for this group"
            sub="Add a size or spec to this group"
          />
        ) : (
          filtered.map((c, i) => (
            <div
              key={c.id}
              className={`flex items-center gap-4 px-5 py-4 transition-colors hover:bg-primary-soft/20 ${i > 0 ? "border-t" : ""}`}
            >
              <ItemAvatar name={c.name} index={i} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-bold leading-tight">{c.name}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {selectedMaster?.name} ›{" "}
                  <span className="font-semibold text-foreground">{selectedGroupName}</span>
                </p>
              </div>
              <div className="shrink-0">
                {deletingId === c.id ? (
                  <DeleteConfirmButtons
                    onConfirm={() => {
                      onDelete(c.id);
                      setDeletingId(null);
                    }}
                    onCancel={() => setDeletingId(null)}
                  />
                ) : (
                  <RowActions
                    onEdit={() => {
                      setEditItem(c);
                      setEditName(c.name);
                    }}
                    onDelete={() => setDeletingId(c.id)}
                  />
                )}
              </div>
            </div>
          ))
        )}
        <div className="flex items-center justify-between border-t bg-gradient-to-r from-primary-soft/10 to-primary-soft/30 px-5 py-3.5">
          <p className="text-[11px] text-muted-foreground">
            Categories represent sizes, wattages or specifications
          </p>
          <button
            onClick={() => setShowAdd(true)}
            disabled={!selectedGroupId}
            className="inline-flex items-center gap-2 rounded-xl gradient-primary px-4 py-2.5 text-[12px] font-bold text-white shadow-glow hover:opacity-90 transition disabled:opacity-40"
          >
            <Plus className="h-3.5 w-3.5" /> Add New Category
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showAdd && (
          <Modal
            title={`Add Category under ${selectedGroupName}`}
            onClose={() => setShowAdd(false)}
          >
            <div className="p-5 space-y-4">
              <Field label="Category Name (Size / Spec)">
                <input
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  placeholder="e.g. 540wp, 5kW"
                  className={inputCls}
                />
              </Field>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    if (addName.trim()) {
                      onAdd(selectedGroupId, addName.trim());
                      setAddName("");
                      setShowAdd(false);
                    }
                  }}
                  disabled={!addName.trim()}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl gradient-primary py-2.5 text-sm font-bold text-white shadow-glow disabled:opacity-40"
                >
                  <Plus className="h-4 w-4" /> Add Category
                </button>
                <button
                  onClick={() => setShowAdd(false)}
                  className="rounded-xl border bg-card px-4 text-sm font-semibold text-muted-foreground hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editItem && (
          <Modal title="Edit Category" onClose={() => setEditItem(null)}>
            <div className="p-5 space-y-4">
              <Field label="Category Name">
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className={inputCls}
                />
              </Field>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    if (editName.trim()) {
                      onEdit(editItem.id, editName.trim());
                      setEditItem(null);
                    }
                  }}
                  disabled={!editName.trim()}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl gradient-primary py-2.5 text-sm font-bold text-white shadow-glow disabled:opacity-40"
                >
                  <Check className="h-4 w-4" /> Save Changes
                </button>
                <button
                  onClick={() => setEditItem(null)}
                  className="rounded-xl border bg-card px-4 text-sm font-semibold text-muted-foreground hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── SubCategory sub-tab ────────────────────────────────────────────────── */
function SubCategorySubTab({
  masters,
  groups,
  cats,
  subs,
  onAdd,
  onEdit,
  onDelete,
}: {
  masters: Master[];
  groups: Group[];
  cats: Category[];
  subs: Subcategory[];
  onAdd: (catId: string, name: string) => void;
  onEdit: (id: string, name: string) => void;
  onDelete: (id: string) => void;
}) {
  const [selectedMasterId, setSelectedMasterId] = useState(masters[0]?.id ?? "");
  const [selectedGroupId, setSelectedGroupId] = useState(
    groups.find((g) => g.masterId === masters[0]?.id)?.id ?? "",
  );
  const [selectedCatId, setSelectedCatId] = useState(
    cats.find((c) => c.groupId === groups.find((g) => g.masterId === masters[0]?.id)?.id)?.id ?? "",
  );
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editItem, setEditItem] = useState<Subcategory | null>(null);
  const [editName, setEditName] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [addName, setAddName] = useState("");

  const groupsForMaster = groups.filter((g) => g.masterId === selectedMasterId);
  const catsForGroup = cats.filter((c) => c.groupId === selectedGroupId);
  const filtered = subs.filter((s) => s.categoryId === selectedCatId);
  const masterUnit = masters.find((m) => m.id === selectedMasterId)?.unit ?? "NOS";

  const selectedMasterName = masters.find((m) => m.id === selectedMasterId)?.name;
  const selectedGroupName = groups.find((g) => g.id === selectedGroupId)?.name;
  const selectedCatName = cats.find((c) => c.id === selectedCatId)?.name;

  return (
    <div className="space-y-4">
      {/* 3-level cascade filter */}
      <div className="rounded-2xl border bg-card px-5 py-4 shadow-card">
        <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Drill Down
        </p>
        <div className="flex flex-wrap items-start gap-x-2 gap-y-3">
          {/* Master pills */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Master
            </span>
            <div className="flex flex-wrap gap-1.5">
              {masters.map((m) => (
                <button
                  key={m.id}
                  onClick={() => {
                    setSelectedMasterId(m.id);
                    const grp = groups.find((g) => g.masterId === m.id)?.id ?? "";
                    setSelectedGroupId(grp);
                    setSelectedCatId(cats.find((c) => c.groupId === grp)?.id ?? "");
                  }}
                  className={`rounded-full border px-3 py-1 text-[11px] font-semibold transition-all ${selectedMasterId === m.id ? "gradient-primary border-transparent text-white shadow-glow" : "bg-card text-muted-foreground hover:bg-muted"}`}
                >
                  {m.name}
                </button>
              ))}
            </div>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/30 mt-6" />
          {/* Group pills */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Group
            </span>
            <div className="flex flex-wrap gap-1.5">
              {groupsForMaster.map((g) => (
                <button
                  key={g.id}
                  onClick={() => {
                    setSelectedGroupId(g.id);
                    setSelectedCatId(cats.find((c) => c.groupId === g.id)?.id ?? "");
                  }}
                  className={`rounded-full border px-3 py-1 text-[11px] font-semibold transition-all ${selectedGroupId === g.id ? "gradient-primary border-transparent text-white shadow-glow" : "bg-card text-muted-foreground hover:bg-muted"}`}
                >
                  {g.name}
                </button>
              ))}
            </div>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/30 mt-6" />
          {/* Category pills */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Category
            </span>
            <div className="flex flex-wrap gap-1.5">
              {catsForGroup.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCatId(c.id)}
                  className={`rounded-full border px-3 py-1 text-[11px] font-semibold transition-all ${selectedCatId === c.id ? "gradient-primary border-transparent text-white shadow-glow" : "bg-card text-muted-foreground hover:bg-muted"}`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border bg-card shadow-card overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState
            icon={Box}
            title="No subcategories here"
            sub="Add a product type or variant to this category"
          />
        ) : (
          filtered.map((s, i) => (
            <div
              key={s.id}
              className={`flex items-center gap-4 px-5 py-4 transition-colors hover:bg-primary-soft/20 ${i > 0 ? "border-t" : ""}`}
            >
              <div
                className={`relative shrink-0 h-10 w-10 rounded-xl bg-gradient-to-br ${AVATAR_PALETTE[i % AVATAR_PALETTE.length]} flex items-center justify-center`}
              >
                <Box className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-bold leading-tight">{s.name}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span className="rounded-md bg-primary/10 px-2 py-0.5 font-mono text-[10px] font-bold text-primary uppercase">
                    {masterUnit}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {selectedMasterName} › {selectedGroupName} › {selectedCatName}
                  </span>
                </div>
              </div>
              <div className="shrink-0">
                {deletingId === s.id ? (
                  <DeleteConfirmButtons
                    onConfirm={() => {
                      onDelete(s.id);
                      setDeletingId(null);
                    }}
                    onCancel={() => setDeletingId(null)}
                  />
                ) : (
                  <RowActions
                    onEdit={() => {
                      setEditItem(s);
                      setEditName(s.name);
                    }}
                    onDelete={() => setDeletingId(s.id)}
                  />
                )}
              </div>
            </div>
          ))
        )}
        <div className="flex items-center justify-between border-t bg-gradient-to-r from-primary-soft/10 to-primary-soft/30 px-5 py-3.5">
          <p className="text-[11px] text-muted-foreground">
            SubCategories are the leaf-level items with stock tracking
          </p>
          <button
            onClick={() => setShowAdd(true)}
            disabled={!selectedCatId}
            className="inline-flex items-center gap-2 rounded-xl gradient-primary px-4 py-2.5 text-[12px] font-bold text-white shadow-glow hover:opacity-90 transition disabled:opacity-40"
          >
            <Plus className="h-3.5 w-3.5" /> Add New SubCategory
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showAdd && (
          <Modal title="Add New SubCategory" onClose={() => setShowAdd(false)}>
            <div className="p-5 space-y-4">
              <Field label="SubCategory Name">
                <input
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  placeholder="e.g. DCR-PERC-BF"
                  className={inputCls}
                />
              </Field>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    if (addName.trim()) {
                      onAdd(selectedCatId, addName.trim().toUpperCase());
                      setAddName("");
                      setShowAdd(false);
                    }
                  }}
                  disabled={!addName.trim()}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl gradient-primary py-2.5 text-sm font-bold text-white shadow-glow disabled:opacity-40"
                >
                  <Plus className="h-4 w-4" /> Add SubCategory
                </button>
                <button
                  onClick={() => setShowAdd(false)}
                  className="rounded-xl border bg-card px-4 text-sm font-semibold text-muted-foreground hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editItem && (
          <Modal title="Edit SubCategory" onClose={() => setEditItem(null)}>
            <div className="p-5 space-y-4">
              <Field label="SubCategory Name">
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className={inputCls}
                />
              </Field>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    if (editName.trim()) {
                      onEdit(editItem.id, editName.trim().toUpperCase());
                      setEditItem(null);
                    }
                  }}
                  disabled={!editName.trim()}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl gradient-primary py-2.5 text-sm font-bold text-white shadow-glow disabled:opacity-40"
                >
                  <Check className="h-4 w-4" /> Save Changes
                </button>
                <button
                  onClick={() => setEditItem(null)}
                  className="rounded-xl border bg-card px-4 text-sm font-semibold text-muted-foreground hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}

// TAB: PRODUCTS
//
//
function ProductsTab({
  subs,
  onAddSub,
  onEditSub,
  onDeleteSub,
}: {
  masters?: Master[];
  groups?: Group[];
  cats?: Category[];
  subs: Subcategory[];
  onAddMaster?: (name: string, unit: string) => void;
  onEditMaster?: (id: string, name: string, unit: string) => void;
  onDeleteMaster?: (id: string) => void;
  onAddGroup?: (masterId: string, name: string) => void;
  onEditGroup?: (id: string, name: string) => void;
  onDeleteGroup?: (id: string) => void;
  onAddCat?: (groupId: string, name: string) => void;
  onEditCat?: (id: string, name: string) => void;
  onDeleteCat?: (id: string) => void;
  onAddSub: (catId: string, name: string) => void;
  onEditSub: (id: string, name: string) => void;
  onDeleteSub: (id: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [newProductName, setNewProductName] = useState("");
  const [editingSub, setEditingSub] = useState<Subcategory | null>(null);
  const [editName, setEditName] = useState("");
  const [viewingSub, setViewingSub] = useState<Subcategory | null>(null);
  const [deletingSub, setDeletingSub] = useState<Subcategory | null>(null);

  const filteredSubs = subs.filter((s) =>
    !search ? true : s.name.toLowerCase().includes(search.toLowerCase())
  );

  function handleSaveNewProduct(e: React.FormEvent) {
    e.preventDefault();
    if (!newProductName.trim()) return;
    onAddSub("1", newProductName.trim());
    setNewProductName("");
    setShowAddModal(false);
  }

  function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingSub || !editName.trim()) return;
    onEditSub(editingSub.id, editName.trim());
    setEditingSub(null);
  }

  function handleConfirmDelete() {
    if (!deletingSub) return;
    onDeleteSub(deletingSub.id);
    setDeletingSub(null);
  }

  return (
    <div className="space-y-6">
      {/* Stat summary card */}
      <div className="rounded-2xl border bg-card p-5 shadow-card max-w-xs">
        <div className="flex items-center justify-between">
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Total Products
          </div>
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary">
            <Boxes className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2 text-2xl font-bold text-primary">{subs.length}</div>
      </div>

      {/* Toolbar: Search + Add Product button */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products by name..."
            className="h-10 w-full rounded-xl border bg-card pl-10 pr-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
          />
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="shrink-0 inline-flex items-center gap-2 rounded-xl gradient-primary px-5 py-2.5 text-[13px] font-bold text-white shadow-glow hover:opacity-95 transition-opacity"
        >
          <Plus className="h-4 w-4" /> Add Product
        </button>
      </div>

      {/* Product List Table */}
      <div className="rounded-2xl border bg-card shadow-card overflow-hidden">
        <div className="grid grid-cols-[80px_1fr_120px] gap-3 border-b bg-muted/40 px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          <span>ID</span>
          <span>Product Name</span>
          <span className="text-center">Action</span>
        </div>

        {filteredSubs.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
            <Boxes className="h-8 w-8 opacity-30" />
            <p className="text-sm font-medium">No products found</p>
          </div>
        ) : (
          <div className="divide-y">
            {filteredSubs.map((item, idx) => (
              <div
                key={item.id}
                className="grid grid-cols-[80px_1fr_120px] items-center gap-3 px-5 py-3.5 text-sm transition-colors hover:bg-muted/30"
              >
                <span className="font-mono text-xs text-muted-foreground">#{item.id || idx + 1}</span>
                <span className="font-semibold text-foreground">{item.name}</span>
                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={() => setViewingSub(item)}
                    className="grid h-8 w-8 place-items-center rounded-lg border bg-card text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                    title="View Product"
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      setEditingSub(item);
                      setEditName(item.name);
                    }}
                    className="grid h-8 w-8 place-items-center rounded-lg border bg-card text-muted-foreground hover:border-amber-500 hover:text-amber-500 transition-colors"
                    title="Edit Product"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setDeletingSub(item)}
                    className="grid h-8 w-8 place-items-center rounded-lg border bg-card text-muted-foreground hover:border-destructive hover:text-destructive transition-colors"
                    title="Delete Product"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {/* Add Product Modal */}
        {showAddModal && (
          <Modal title="Add New Product" onClose={() => setShowAddModal(false)}>
            <form onSubmit={handleSaveNewProduct} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Product Name <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  autoFocus
                  value={newProductName}
                  onChange={(e) => setNewProductName(e.target.value)}
                  placeholder="Enter product name"
                  className="h-10 w-full rounded-xl border bg-muted/40 px-3.5 text-sm outline-none focus:bg-card focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-xl border px-4 py-2.5 text-xs font-semibold text-muted-foreground hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl gradient-primary px-5 py-2.5 text-xs font-bold text-white shadow-glow hover:opacity-95 transition-opacity"
                >
                  Save Product
                </button>
              </div>
            </form>
          </Modal>
        )}

        {/* View Product Details Modal */}
        {viewingSub && (
          <Modal title="Product Details" onClose={() => setViewingSub(null)}>
            <div className="p-6 space-y-4">
              <div className="rounded-xl border bg-muted/20 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Product ID</span>
                  <span className="font-mono text-xs font-bold text-foreground">#{viewingSub.id}</span>
                </div>
                <div className="flex items-center justify-between border-t pt-3">
                  <span className="text-xs font-medium text-muted-foreground">Product Name</span>
                  <span className="text-sm font-bold text-foreground">{viewingSub.name}</span>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setViewingSub(null)}
                  className="rounded-xl border px-5 py-2.5 text-xs font-semibold text-muted-foreground hover:bg-muted transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </Modal>
        )}

        {/* Edit Product Modal */}
        {editingSub && (
          <Modal title="Edit Product" onClose={() => setEditingSub(null)}>
            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Product Name <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  autoFocus
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="h-10 w-full rounded-xl border bg-muted/40 px-3.5 text-sm outline-none focus:bg-card focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setEditingSub(null)}
                  className="rounded-xl border px-4 py-2.5 text-xs font-semibold text-muted-foreground hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl gradient-primary px-5 py-2.5 text-xs font-bold text-white shadow-glow hover:opacity-95 transition-opacity"
                >
                  Update Product
                </button>
              </div>
            </form>
          </Modal>
        )}

        {/* Confirm Delete Product Modal */}
        {deletingSub && (
          <Modal title="Delete Product" onClose={() => setDeletingSub(null)}>
            <div className="p-6 space-y-4">
              <p className="text-sm text-muted-foreground">
                Are you sure you want to delete product{" "}
                <span className="font-bold text-foreground">"{deletingSub.name}"</span>? This action cannot be undone.
              </p>
              <div className="flex items-center justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setDeletingSub(null)}
                  className="rounded-xl border px-4 py-2.5 text-xs font-semibold text-muted-foreground hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="rounded-xl bg-destructive px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:opacity-90 transition-opacity"
                >
                  Confirm Delete
                </button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Outward Delivery Challan print helper ───────────────────────────────── */
function printOutwardChallan(
  entries: InvStore.OutwardEntry[],
  getChain: (subcategoryId: string) => {
    sub?: Subcategory;
    cat?: Category;
    grp?: Group;
    master?: Master;
  },
) {
  if (entries.length === 0) return;
  const anchor = entries[0];
  const fmt = (d: string) => {
    try {
      return new Date(d).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch {
      return d;
    }
  };

  const rows = entries
    .map((e, i) => {
      const { sub, cat, grp, master } = getChain(e.subcategoryId);
      const desc = [master?.name, grp?.name, cat?.name, sub?.name].filter(Boolean).join(" - ");
      const serials =
        e.serialNos && e.serialNos.length > 0
          ? `<br/><span style="font-size:11px;color:#6b7280;">${e.serialNos.join(", ")}</span>`
          : "";
      return `<tr>
      <td style="padding:12px 14px;border:1px solid #111;font-size:13px;vertical-align:top;">${i + 1}</td>
      <td style="padding:12px 14px;border:1px solid #111;font-size:13px;vertical-align:top;">${desc}${serials}</td>
      <td style="padding:12px 14px;border:1px solid #111;font-size:13px;vertical-align:top;">${e.qty}</td>
    </tr>`;
    })
    .join("");

  const html = `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="UTF-8"/>
<title>Delivery Challan – ${anchor.billNumber}</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; color: #111; background: #fff; }
  @media print { @page { size: A4; margin: 14mm; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } .no-print { display: none; } }

  .page { max-width: 800px; margin: 0 auto; padding: 24px; }

  .header-row { display: flex; justify-content: space-between; align-items: flex-start; }
  .company-name { font-size: 24px; font-weight: 800; color: #15803d; }
  .company-info { font-size: 12px; color: #111; margin-top: 6px; line-height: 1.6; }
  .company-info b { font-weight: 700; }
  .doc-meta { text-align: right; font-size: 12px; }
  .doc-meta b { font-weight: 700; }

  hr { border: none; border-top: 1px solid #111; margin: 16px 0; }

  .title { text-align: center; font-size: 22px; font-weight: 800; color: #15803d; }
  .subtitle { text-align: center; font-size: 13px; font-weight: 700; margin-top: 2px; }

  .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 18px; font-size: 12.5px; line-height: 1.7; }
  .details-grid b { font-weight: 700; }

  table { width: 100%; border-collapse: collapse; margin-top: 22px; }
  th { border: 1px solid #111; padding: 10px 14px; font-size: 12.5px; font-weight: 700; text-align: left; background: #fff; }

  .driver-block { margin-top: 24px; font-size: 12.5px; line-height: 1.8; }
  .driver-block b { font-weight: 700; }

  .sig-block { margin-top: 60px; text-align: right; font-size: 12.5px; }

  .print-btn { display: block; margin: 24px auto 0; padding: 10px 32px; background: #15803d; color: #fff; border: none; border-radius: 6px; font-size: 14px; font-weight: 700; cursor: pointer; letter-spacing: 0.04em; }
</style>
</head>
<body>
<div class="page">

  <div class="header-row">
    <div>
      <div class="company-name">ARIS SOLAR PRIVATE LIMITED</div>
      <div class="company-info">
        19-B Ravi Park Society, Vasna Road,<br/>
        Near Kalyan Party Plot, Vadodara, Gujarat - 390020<br/>
        <b>Email:</b> info@arissolar.in<br/>
        <b>Website:</b> www.arissolar.in<br/>
        <b>Contact:</b> +91 91062 60019
      </div>
    </div>
    <div class="doc-meta">
      <div><b>GSTIN:</b> 24ABBCA8273A1Z2</div>
      <div style="margin-top:10px;"><b>Challan No:</b> ${anchor.billNumber}</div>
      <div><b>Challan Date:</b> ${fmt(anchor.challanDate)}</div>
    </div>
  </div>

  <hr/>

  <div class="title">DELIVERY CHALLAN</div>
  <div class="subtitle">Customer Copy</div>

  <hr/>

  <div class="details-grid">
    <div>
      <b>Company Details:</b><br/>
      ${anchor.b2bCompanyName || "—"}<br/>
      Contact No: ${anchor.deliveryContact || "—"}<br/>
      Address: ${anchor.customerAddress || "—"}<br/>
      ${anchor.deliveryCity || "—"}<br/>
      GSTIN: ${anchor.gstDetails || "—"}
    </div>
    <div>
      <b>Delivery Details:</b><br/>
      ${anchor.b2bCompanyName || "—"}<br/>
      Contact No: ${anchor.deliveryContact || "—"}<br/>
      Address: ${anchor.customerAddress || "—"}<br/>
      ${anchor.deliveryCity || "—"}<br/>
      GSTIN: ${anchor.gstDetails || "—"}
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width:48px;">Sr No</th>
        <th>Particulars</th>
        <th style="width:100px;">Quantity</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>

  <div class="driver-block">
    <b>Driver Name:</b> ${anchor.driverName || "—"}<br/>
    <b>Driver Contact No:</b> ${anchor.driverContact || "—"}<br/>
    <b>Vehicle No:</b> ${anchor.vehicleNo || "—"}<br/>
    <b>Remarks:</b> ${anchor.remarks || "—"}<br/>
    <b>Delivery Contact Person:</b> ${anchor.concernedPerson || "—"}
  </div>

  <div class="sig-block">
    (Authorized Signature)<br/>
    for ARIS SOLAR PRIVATE LIMITED
  </div>

  <button class="print-btn no-print" onclick="window.print()">Print / Save as PDF</button>

</div>
</body></html>`;

  const w = window.open("", "_blank", "width=920,height=780");
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => {
    w.print();
  }, 500);
}

/* ══════════════════════════════════════════════════════════════════════════
   TAB: OUTWARD
══════════════════════════════════════════════════════════════════════════ */
function OutwardTab({
  movements,
  subs,
  cats,
  groups,
  masters,
  onNewOutward,
  outwardEntries,
}: {
  movements: Movement[];
  subs: Subcategory[];
  cats: Category[];
  groups: Group[];
  masters: Master[];
  onNewOutward: () => void;
  outwardEntries?: InvStore.OutwardEntry[];
}) {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [masterFilter, setMasterFilter] = useState<string>("all");
  const [deliveryToFilter, setDeliveryToFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  function getChain(subcategoryId: string) {
    const sub = subs.find((s) => s.id === subcategoryId);
    const cat = cats.find((c) => c.id === sub?.categoryId);
    const grp = groups.find((g) => g.id === cat?.groupId);
    const master = masters.find((m) => m.id === grp?.masterId);
    return { sub, cat, grp, master };
  }

  const outwardEntryById = new Map((outwardEntries ?? []).map((e) => [e.id, e]));

  const masterOptions = masters.filter((mst) =>
    movements.some((m) => m.type === "out" && getChain(m.subcategoryId).master?.id === mst.id),
  );
  const deliveryToOptions = Array.from(
    new Set((outwardEntries ?? []).map((e) => e.deliveryTo).filter(Boolean)),
  );
  const activeFilterCount =
    (masterFilter !== "all" ? 1 : 0) +
    (deliveryToFilter !== "all" ? 1 : 0) +
    (dateFrom ? 1 : 0) +
    (dateTo ? 1 : 0);

  const outward = [...movements]
    .filter((m) => m.type === "out")
    .sort((a, b) => b.date.localeCompare(a.date))
    .filter((m) => {
      const q = search.trim().toLowerCase();
      if (!q) return true;
      const { sub, cat, grp, master } = getChain(m.subcategoryId);
      const haystack = [sub?.name, cat?.name, grp?.name, master?.name, m.ref, m.note]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    })
    .filter((m) => masterFilter === "all" || getChain(m.subcategoryId).master?.id === masterFilter)
    .filter(
      (m) => deliveryToFilter === "all" || outwardEntryById.get(m.id)?.deliveryTo === deliveryToFilter,
    )
    .filter((m) => !dateFrom || m.date >= dateFrom)
    .filter((m) => !dateTo || m.date <= dateTo);

  function fmtDate(d?: string) {
    if (!d) return "—";
    return new Date(d + "T00:00:00").toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  const thisMonth = new Date().toISOString().slice(0, 7);
  const monthOut = outward.filter((m) => m.date.startsWith(thisMonth));
  const totalQtyOut = outward.reduce((s, m) => s + m.qty, 0);

  return (
    <div className="space-y-5">
      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { label: "Total Outward", value: outward.length, color: "text-primary" },
          {
            label: "Total Qty Dispatched",
            value: totalQtyOut,
            color: "text-[oklch(0.45_0.15_145)]",
          },
          { label: "This Month", value: monthOut.length, color: "text-[oklch(0.5_0.14_70)]" },
          {
            label: "Unique Products",
            value: new Set(outward.map((m) => m.subcategoryId)).size,
            color: "text-[oklch(0.5_0.15_240)]",
          },
        ].map(({ label, value, color }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-2xl border bg-card p-5 shadow-card"
          >
            <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {label}
            </div>
            <div className={`mt-2 text-2xl font-bold ${color}`}>{value}</div>
          </motion.div>
        ))}
      </div>

      {/* Search + button */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search product, reference…"
            className="h-10 w-full rounded-xl border bg-card pl-10 pr-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
          />
        </div>
        <button
          onClick={() => setShowFilters((v) => !v)}
          className={`shrink-0 inline-flex h-10 items-center gap-2 rounded-xl border px-3.5 text-sm font-medium transition-colors ${
            showFilters || activeFilterCount > 0
              ? "bg-primary-soft text-primary border-primary/30"
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
        <button
          onClick={onNewOutward}
          className="shrink-0 inline-flex items-center gap-2 rounded-xl gradient-primary px-5 py-2.5 text-[13px] font-bold text-white shadow-glow hover:opacity-95 transition"
        >
          <Plus className="h-4 w-4" /> New Outward Entry
        </button>
      </div>

      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden rounded-2xl border bg-card shadow-card"
          >
            <div className="flex flex-wrap items-end gap-3 p-4">
              <div className="w-[160px]">
                <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                  Material
                </p>
                <CrmSelect
                  value={masterFilter === "all" ? "__all__" : masterFilter}
                  onValueChange={(v) => setMasterFilter(v === "__all__" ? "all" : v)}
                  options={[
                    { value: "__all__", label: "All Materials" },
                    ...masterOptions.map((mst) => ({ value: mst.id, label: mst.name })),
                  ]}
                />
              </div>
              <div className="w-[140px]">
                <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                  Delivery To
                </p>
                <CrmSelect
                  value={deliveryToFilter === "all" ? "__all__" : deliveryToFilter}
                  onValueChange={(v) => setDeliveryToFilter(v === "__all__" ? "all" : v)}
                  options={[
                    { value: "__all__", label: "All" },
                    ...deliveryToOptions.map((dt) => ({
                      value: dt,
                      label: dt === "B2I" ? "Seller" : dt,
                    })),
                  ]}
                />
              </div>
              <div className="flex shrink-0 items-end gap-2">
                <div>
                  <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                    From
                  </p>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="h-10 w-[150px] rounded-xl border bg-card px-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
                  />
                </div>
                <div>
                  <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                    To
                  </p>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="h-10 w-[150px] rounded-xl border bg-card px-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
                  />
                </div>
              </div>
              {activeFilterCount > 0 && (
                <button
                  onClick={() => {
                    setMasterFilter("all");
                    setDeliveryToFilter("all");
                    setDateFrom("");
                    setDateTo("");
                  }}
                  className="inline-flex h-10 items-center gap-1.5 rounded-lg border bg-card px-3 text-xs font-medium text-muted-foreground hover:bg-muted"
                >
                  <X className="h-3.5 w-3.5" /> Clear
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="rounded-2xl border bg-card shadow-card overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b bg-muted/40">
              {["ID", "Product", "Date", "Reference", "Qty", "Material Name", "Note", "Action"].map(
                (h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap"
                  >
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {outward.length === 0 && (
              <tr>
                <td colSpan={8} className="py-12 text-center text-sm text-muted-foreground/60">
                  {search.trim() || activeFilterCount > 0
                    ? "No outward entries match your search/filters"
                    : "No outward entries yet"}
                </td>
              </tr>
            )}
            {outward.map((m, i) => {
              const { sub, cat, grp, master } = getChain(m.subcategoryId);
              return (
                <tr
                  key={m.id}
                  className={`border-b transition-colors hover:bg-red-50/30 ${i % 2 !== 0 ? "bg-muted/5" : ""}`}
                >
                  <td className="px-4 py-3">
                    <span className="rounded-lg bg-red-50 px-2.5 py-1 font-mono text-[12px] font-bold text-red-500 whitespace-nowrap border border-red-200">
                      {m.ref || "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[13px] font-semibold">
                    <span className="text-muted-foreground text-[11px]">
                      {master?.name} › {grp?.name} › {cat?.name} ›{" "}
                    </span>
                    <span>{sub?.name}</span>
                  </td>
                  <td className="px-4 py-3 text-[12px] text-muted-foreground whitespace-nowrap">
                    {fmtDate(m.date)}
                  </td>
                  <td className="px-4 py-3 font-mono text-[12px] text-muted-foreground whitespace-nowrap">
                    {m.ref || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-50 border border-red-200 px-2.5 py-0.5 text-[11px] font-bold text-red-600 whitespace-nowrap">
                      <ArrowUpFromLine className="h-2.5 w-2.5" />
                      {m.qty} {master?.unit}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {master && (
                      <span className="inline-flex items-center rounded-full bg-red-500 px-3 py-1 text-[11px] font-bold text-white shadow-sm whitespace-nowrap">
                        {master.name.toUpperCase()}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[12px] text-muted-foreground max-w-[140px] truncate">
                    {m.note || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() =>
                          navigate({ to: "/inventory/outward/$id", params: { id: m.id } })
                        }
                        title="View details"
                        className="grid h-8 w-8 place-items-center rounded-lg border bg-card text-muted-foreground hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-colors"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          const batch = (outwardEntries ?? []).filter(
                            (e) => e.billNumber === (m.ref || ""),
                          );
                          printOutwardChallan(
                            batch.length > 0
                              ? batch
                              : (outwardEntries ?? []).filter((e) => e.id === m.id),
                            getChain,
                          );
                        }}
                        title="Print delivery challan"
                        className="grid h-8 w-8 place-items-center rounded-lg border bg-card text-muted-foreground hover:bg-primary-soft hover:text-primary hover:border-primary/30 transition-colors"
                      >
                        <Printer className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   RECORD INWARD MODAL
══════════════════════════════════════════════════════════════════════════ */
function RecordInwardModal({
  masters,
  groups,
  cats,
  subs,
  onSave,
  onClose,
}: {
  masters: Master[];
  groups: Group[];
  cats: Category[];
  subs: Subcategory[];
  onSave: (m: Movement) => void;
  onClose: () => void;
}) {
  const [selectedMasterId, setSelectedMasterId] = useState(masters[0]?.id ?? "");
  const [selectedGroupId, setSelectedGroupId] = useState(
    groups.find((g) => g.masterId === masters[0]?.id)?.id ?? "",
  );
  const [selectedCatId, setSelectedCatId] = useState(
    cats.find((c) => c.groupId === groups.find((g) => g.masterId === masters[0]?.id)?.id)?.id ?? "",
  );
  const [selectedSubId, setSelectedSubId] = useState(
    subs.find(
      (s) =>
        s.categoryId ===
        cats.find((c) => c.groupId === groups.find((g) => g.masterId === masters[0]?.id)?.id)?.id,
    )?.id ?? "",
  );

  const [qty, setQty] = useState(1);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [supplier, setSupplier] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [billNumber, setBillNumber] = useState("");
  const [receivedDate, setReceivedDate] = useState(new Date().toISOString().slice(0, 10));
  const [entryType, setEntryType] = useState("New Materials");
  const [note, setNote] = useState("");

  const groupsForMaster = groups.filter((g) => g.masterId === selectedMasterId);
  const catsForGroup = cats.filter((c) => c.groupId === selectedGroupId);
  const subsForCat = subs.filter((s) => s.categoryId === selectedCatId);

  function save() {
    if (!selectedSubId) return;
    onSave({
      id: uid(),
      subcategoryId: selectedSubId,
      type: "in",
      qty,
      date,
      ref: billNumber,
      note,
      supplier,
      invoiceDate,
      billNumber,
      materialReceivedDate: receivedDate,
      entryType,
    });
    onClose();
  }

  return (
    <Modal title="Record Inward Entry" onClose={onClose}>
      <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
        {/* Product selection */}
        <div className="rounded-xl border bg-primary-soft/40 p-3 space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-wide text-primary">
            Select Product
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Master">
              <select
                value={selectedMasterId}
                onChange={(e) => {
                  setSelectedMasterId(e.target.value);
                  const grp = groups.find((g) => g.masterId === e.target.value)?.id ?? "";
                  setSelectedGroupId(grp);
                  const ct = cats.find((c) => c.groupId === grp)?.id ?? "";
                  setSelectedCatId(ct);
                  setSelectedSubId(subs.find((s) => s.categoryId === ct)?.id ?? "");
                }}
                className={selectCls}
              >
                {masters.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Group (Brand)">
              <select
                value={selectedGroupId}
                onChange={(e) => {
                  setSelectedGroupId(e.target.value);
                  const ct = cats.find((c) => c.groupId === e.target.value)?.id ?? "";
                  setSelectedCatId(ct);
                  setSelectedSubId(subs.find((s) => s.categoryId === ct)?.id ?? "");
                }}
                className={selectCls}
              >
                {groupsForMaster.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Category (Size)">
              <select
                value={selectedCatId}
                onChange={(e) => {
                  setSelectedCatId(e.target.value);
                  setSelectedSubId(subs.find((s) => s.categoryId === e.target.value)?.id ?? "");
                }}
                className={selectCls}
              >
                {catsForGroup.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="SubCategory (Type)">
              <select
                value={selectedSubId}
                onChange={(e) => setSelectedSubId(e.target.value)}
                className={selectCls}
              >
                {subsForCat.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Entry Type">
            <select
              value={entryType}
              onChange={(e) => setEntryType(e.target.value)}
              className={selectCls}
            >
              {["New Materials", "Return", "Transfer In", "Adjustment"].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </Field>
          <Field
            label={`Quantity (${masters.find((m) => m.id === selectedMasterId)?.unit ?? "NOS"})`}
          >
            <input
              type="number"
              min={1}
              value={qty}
              onChange={(e) => setQty(Math.max(1, Number(e.target.value)))}
              className={inputCls}
            />
          </Field>
        </div>

        <Field label="Material Supplier *">
          <input
            value={supplier}
            onChange={(e) => setSupplier(e.target.value)}
            placeholder="e.g. WAAREE ENERGIES LTD"
            className={inputCls}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Invoice Date">
            <input
              type="date"
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Bill Number">
            <input
              value={billNumber}
              onChange={(e) => setBillNumber(e.target.value)}
              placeholder="e.g. WE/INV/26-27/001"
              className={inputCls}
            />
          </Field>
          <Field label="Material Received Date">
            <input
              type="date"
              value={receivedDate}
              onChange={(e) => setReceivedDate(e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Entry Date">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={inputCls}
            />
          </Field>
        </div>

        <Field label="Note">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="Optional note…"
            className="w-full rounded-xl border bg-muted/40 px-3.5 py-2.5 text-sm outline-none transition focus:bg-card focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/60 resize-none"
          />
        </Field>

        <div className="flex gap-3">
          <button
            onClick={save}
            disabled={!selectedSubId || !supplier.trim()}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl gradient-primary py-2.5 text-sm font-bold text-white shadow-glow disabled:opacity-40 transition"
          >
            <ArrowDownToLine className="h-4 w-4" /> Save Inward Entry
          </button>
          <button
            onClick={onClose}
            className="rounded-xl border bg-card px-4 text-sm font-semibold text-muted-foreground hover:bg-muted transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   TAB: MOVEMENTS
══════════════════════════════════════════════════════════════════════════ */
function MovementsTab({
  movements,
  subs,
  cats,
  groups,
  masters,
  onNewInward,
  inwardEntries,
}: {
  movements: Movement[];
  subs: Subcategory[];
  cats: Category[];
  groups: Group[];
  masters: Master[];
  onNewInward: () => void;
  inwardEntries?: InvStore.InwardEntry[];
}) {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [entryTypeFilter, setEntryTypeFilter] = useState<string>("all");
  const [supplierFilter, setSupplierFilter] = useState<string>("all");
  const [supplierTypeFilter, setSupplierTypeFilter] = useState<string>("all");
  const [masterFilter, setMasterFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  function getChain(subcategoryId: string) {
    const sub = subs.find((s) => s.id === subcategoryId);
    const cat = cats.find((c) => c.id === sub?.categoryId);
    const grp = groups.find((g) => g.id === cat?.groupId);
    const master = masters.find((m) => m.id === grp?.masterId);
    return { sub, cat, grp, master };
  }

  function fmtDate(d?: string) {
    if (!d) return "—";
    return new Date(d + "T00:00:00").toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  const ENTRY_TYPE_COLORS: Record<string, string> = {
    "New Materials": "bg-emerald-100 text-emerald-700 border-emerald-200",
    Return: "bg-sky-100 text-sky-700 border-sky-200",
    "Transfer In": "bg-violet-100 text-violet-700 border-violet-200",
    Adjustment: "bg-amber-100 text-amber-700 border-amber-200",
  };

  const inwardEntryById = new Map((inwardEntries ?? []).map((e) => [e.id, e]));

  const supplierOptions = Array.from(
    new Set(
      movements
        .filter((m) => m.type === "in" && m.supplier)
        .map((m) => m.supplier as string),
    ),
  ).sort();
  const entryTypeOptions = Array.from(
    new Set(
      movements
        .filter((m) => m.type === "in" && m.entryType)
        .map((m) => m.entryType as string),
    ),
  );
  const masterOptions = masters.filter((mst) =>
    movements.some((m) => m.type === "in" && getChain(m.subcategoryId).master?.id === mst.id),
  );
  const activeFilterCount =
    (entryTypeFilter !== "all" ? 1 : 0) +
    (supplierFilter !== "all" ? 1 : 0) +
    (supplierTypeFilter !== "all" ? 1 : 0) +
    (masterFilter !== "all" ? 1 : 0) +
    (dateFrom ? 1 : 0) +
    (dateTo ? 1 : 0);

  const inwardMovements = [...movements]
    .filter((m) => m.type === "in")
    .sort((a, b) => b.date.localeCompare(a.date))
    .filter((m) => {
      const q = search.trim().toLowerCase();
      if (!q) return true;
      const { master } = getChain(m.subcategoryId);
      const haystack = [m.supplier, m.billNumber, m.ref, m.inwardId, master?.name]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    })
    .filter((m) => entryTypeFilter === "all" || m.entryType === entryTypeFilter)
    .filter((m) => supplierFilter === "all" || m.supplier === supplierFilter)
    .filter(
      (m) =>
        supplierTypeFilter === "all" || inwardEntryById.get(m.id)?.supplierType === supplierTypeFilter,
    )
    .filter((m) => masterFilter === "all" || getChain(m.subcategoryId).master?.id === masterFilter)
    .filter((m) => !dateFrom || m.date >= dateFrom)
    .filter((m) => !dateTo || m.date <= dateTo);

  const thisMonthIn = new Date().toISOString().slice(0, 7);
  const monthIn = inwardMovements.filter((m) => m.date.startsWith(thisMonthIn));
  const totalQtyIn = inwardMovements.reduce((s, m) => s + m.qty, 0);
  const uniqueSuppliers = new Set(inwardMovements.map((m) => m.supplier).filter(Boolean)).size;

  return (
    <div className="space-y-5">
      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { label: "Total Inward", value: inwardMovements.length, color: "text-primary" },
          { label: "Total Qty Received", value: totalQtyIn, color: "text-[oklch(0.45_0.15_145)]" },
          { label: "This Month", value: monthIn.length, color: "text-[oklch(0.5_0.14_70)]" },
          {
            label: "Unique Suppliers",
            value: uniqueSuppliers,
            color: "text-[oklch(0.5_0.15_240)]",
          },
        ].map(({ label, value, color }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-2xl border bg-card p-5 shadow-card"
          >
            <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {label}
            </div>
            <div className={`mt-2 text-2xl font-bold ${color}`}>{value}</div>
          </motion.div>
        ))}
      </div>

      {/* Search + button */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search supplier, bill number…"
            className="h-10 w-full rounded-xl border bg-card pl-10 pr-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
          />
        </div>
        <button
          onClick={() => setShowFilters((v) => !v)}
          className={`shrink-0 inline-flex h-10 items-center gap-2 rounded-xl border px-3.5 text-sm font-medium transition-colors ${
            showFilters || activeFilterCount > 0
              ? "bg-primary-soft text-primary border-primary/30"
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
        <button
          onClick={onNewInward}
          className="shrink-0 inline-flex items-center gap-2 rounded-xl gradient-primary px-5 py-2.5 text-[13px] font-bold text-white shadow-glow hover:opacity-95 transition"
        >
          <Plus className="h-4 w-4" /> New Inward Entry
        </button>
      </div>

      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden rounded-2xl border bg-card shadow-card"
          >
            <div className="flex flex-wrap items-end gap-3 p-4">
              <div className="w-[150px]">
                <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                  Entry Type
                </p>
                <CrmSelect
                  value={entryTypeFilter === "all" ? "__all__" : entryTypeFilter}
                  onValueChange={(v) => setEntryTypeFilter(v === "__all__" ? "all" : v)}
                  options={[
                    { value: "__all__", label: "All Entry Types" },
                    ...entryTypeOptions.map((et) => ({ value: et, label: et })),
                  ]}
                />
              </div>
              <div className="w-[160px]">
                <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                  Supplier
                </p>
                <CrmSelect
                  value={supplierFilter === "all" ? "__all__" : supplierFilter}
                  onValueChange={(v) => setSupplierFilter(v === "__all__" ? "all" : v)}
                  options={[
                    { value: "__all__", label: "All Suppliers" },
                    ...supplierOptions.map((sp) => ({ value: sp, label: sp })),
                  ]}
                />
              </div>
              <div className="w-[130px]">
                <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                  Supplier Type
                </p>
                <CrmSelect
                  value={supplierTypeFilter === "all" ? "__all__" : supplierTypeFilter}
                  onValueChange={(v) => setSupplierTypeFilter(v === "__all__" ? "all" : v)}
                  options={[
                    { value: "__all__", label: "All" },
                    { value: "b2b", label: "B2B" },
                    { value: "b2i", label: "Seller" },
                  ]}
                />
              </div>
              <div className="w-[160px]">
                <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                  Material
                </p>
                <CrmSelect
                  value={masterFilter === "all" ? "__all__" : masterFilter}
                  onValueChange={(v) => setMasterFilter(v === "__all__" ? "all" : v)}
                  options={[
                    { value: "__all__", label: "All Materials" },
                    ...masterOptions.map((mst) => ({ value: mst.id, label: mst.name })),
                  ]}
                />
              </div>
              <div className="flex shrink-0 items-end gap-2">
                <div>
                  <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                    From
                  </p>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="h-10 w-[150px] rounded-xl border bg-card px-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
                  />
                </div>
                <div>
                  <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                    To
                  </p>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="h-10 w-[150px] rounded-xl border bg-card px-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
                  />
                </div>
              </div>
              {activeFilterCount > 0 && (
                <button
                  onClick={() => {
                    setEntryTypeFilter("all");
                    setSupplierFilter("all");
                    setSupplierTypeFilter("all");
                    setMasterFilter("all");
                    setDateFrom("");
                    setDateTo("");
                  }}
                  className="inline-flex h-10 items-center gap-1.5 rounded-lg border bg-card px-3 text-xs font-medium text-muted-foreground hover:bg-muted"
                >
                  <X className="h-3.5 w-3.5" /> Clear
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Inward table */}
      <div className="rounded-2xl border bg-card shadow-card overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b bg-muted/40">
              {[
                "ID",
                "Material Supplier",
                "Invoice Date",
                "Bill Number",
                "Received Date",
                "Material Name",
                "Date",
                "Action",
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
            {inwardMovements.length === 0 && (
              <tr>
                <td colSpan={8} className="py-12 text-center text-sm text-muted-foreground/60">
                  {search.trim() || activeFilterCount > 0
                    ? "No inward entries match your search/filters"
                    : "No inward entries yet"}
                </td>
              </tr>
            )}
            {inwardMovements.map((m, i) => {
              const { master } = getChain(m.subcategoryId);
              const etColor =
                ENTRY_TYPE_COLORS[m.entryType ?? ""] ??
                "bg-muted text-muted-foreground border-border";
              return (
                <tr
                  key={m.id}
                  className={`border-b transition-colors hover:bg-primary-soft/10 ${i % 2 !== 0 ? "bg-muted/5" : ""}`}
                >
                  <td className="px-4 py-3">
                    <span className="rounded-lg bg-primary/10 px-2.5 py-1 font-mono text-[12px] font-bold text-primary whitespace-nowrap">
                      {m.inwardId ?? "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[13px] font-semibold max-w-[180px]">
                    {m.supplier ?? <span className="text-muted-foreground/50">—</span>}
                  </td>
                  <td className="px-4 py-3 text-[12px] text-muted-foreground whitespace-nowrap">
                    {fmtDate(m.invoiceDate)}
                  </td>
                  <td className="px-4 py-3 font-mono text-[12px] text-muted-foreground whitespace-nowrap">
                    {m.billNumber || m.ref || "—"}
                  </td>
                  <td className="px-4 py-3 text-[12px] text-muted-foreground whitespace-nowrap">
                    {fmtDate(m.materialReceivedDate)}
                  </td>
                  <td className="px-4 py-3">
                    {master && (
                      <span className="inline-flex items-center rounded-full gradient-primary px-3 py-1 text-[11px] font-bold text-white shadow-sm whitespace-nowrap">
                        {master.name.toUpperCase()}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[12px] text-muted-foreground whitespace-nowrap">
                    {fmtDate(m.date)}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() =>
                        navigate({ to: "/inventory/inward/$id", params: { id: m.id } })
                      }
                      title="View details"
                      className="grid h-8 w-8 place-items-center rounded-lg border bg-card text-muted-foreground hover:bg-primary-soft hover:text-primary hover:border-primary/30 transition-colors"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   TAB: SETUP (Master CRUD)
══════════════════════════════════════════════════════════════════════════ */
function SetupTab({
  masters,
  onAdd,
}: {
  masters: Master[];
  onAdd: (name: string, unit: string) => void;
}) {
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("NOS");

  return (
    <div className="space-y-4 max-w-lg">
      <div className="rounded-2xl border bg-card p-5 shadow-card space-y-4">
        <p className="text-sm font-bold">Add Master Category</p>
        <Field label="Master Name (e.g. Solar Panel)">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Wire & Cable"
            className={inputCls}
          />
        </Field>
        <Field label="Unit">
          <select value={unit} onChange={(e) => setUnit(e.target.value)} className={selectCls}>
            {["NOS", "MTR"].map((u) => (
              <option key={u}>{u}</option>
            ))}
          </select>
        </Field>
        <button
          onClick={() => {
            if (name.trim()) {
              onAdd(name.trim(), unit);
              setName("");
            }
          }}
          disabled={!name.trim()}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl gradient-primary py-2.5 text-sm font-bold text-white shadow-glow disabled:opacity-40 transition"
        >
          <Plus className="h-4 w-4" /> Add Master
        </button>
      </div>

      <div className="rounded-2xl border bg-card shadow-card overflow-hidden">
        <div className="border-b bg-muted/30 px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          All Masters ({masters.length})
        </div>
        {masters.map((m, i) => (
          <div
            key={m.id}
            className={`flex items-center gap-3 px-4 py-3 ${i < masters.length - 1 ? "border-b" : ""}`}
          >
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary-soft">
              <Boxes className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-[13px] font-bold">{m.name}</p>
              <p className="text-[10px] text-muted-foreground">Unit: {m.unit}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   NEW INWARD ENTRY PAGE
══════════════════════════════════════════════════════════════════════════ */
const B2B_SUPPLIERS = [
  "WAAREE ENERGIES LTD",
  "ADANI SOLAR PVT LTD",
  "SUNWAYS SOLAR INDIA",
  "TATA POWER SOLAR LTD",
  "VIKRAM SOLAR LTD",
  "LUMINOUS POWER TECHNOLOGIES",
  "DYNESS BATTERY TECHNOLOGY",
  "MINDRA ENERGY PVT LTD",
  "RAYZON SOLAR PVT LTD",
  "FRONIUS INDIA PVT LTD",
  "GROWATT NEW ENERGY",
  "SOLIS TECHNOLOGY INDIA",
];

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

function defaultLine(
  masters: Master[],
  groups: Group[],
  cats: Category[],
  subs: Subcategory[],
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

function NewInwardPage({
  masters,
  groups,
  cats,
  subs,
  movements,
  b2bPartners,
  onSave,
  onBack,
}: {
  masters: Master[];
  groups: Group[];
  cats: Category[];
  subs: Subcategory[];
  movements: Movement[];
  b2bPartners: B2bPartner[];
  onSave: (m: Movement) => void;
  onBack: () => void;
}) {
  const today = new Date().toISOString().slice(0, 10);

  const [entryMode, setEntryMode] = useState<"new" | "return">("new");
  const [invoiceDate, setInvoiceDate] = useState(today);
  const [receivedDate, setReceivedDate] = useState(today);
  const [billNumber, setBillNumber] = useState("");
  const [b2b, setB2b] = useState("");
  const [outwardRef, setOutwardRef] = useState("");
  const [note, setNote] = useState("");
  const [lines, setLines] = useState<MatLine[]>([defaultLine(masters, groups, cats, subs)]);

  const outwardMovements = movements.filter((m) => m.type === "out");

  function addLine() {
    setLines((p) => [...p, defaultLine(masters, groups, cats, subs)]);
  }
  function removeLine(id: string) {
    setLines((p) => p.filter((l) => l.id !== id));
  }

  function updateLine(id: string, patch: Partial<MatLine>) {
    setLines((p) => p.map((l) => (l.id !== id ? l : { ...l, ...patch })));
  }

  const canSave =
    billNumber.trim() &&
    b2b &&
    lines.length > 0 &&
    lines.every((l) => l.subId && l.serialNos.length === l.qty);

  function handleSave() {
    if (!canSave) return;
    lines.forEach((line) => {
      onSave({
        id: uid(),
        subcategoryId: line.subId,
        type: "in",
        qty: line.qty,
        date: receivedDate,
        ref: billNumber,
        note,
        invoiceDate,
        billNumber,
        materialReceivedDate: receivedDate,
        supplier: b2b,
        entryType: entryMode === "new" ? "New Materials" : "Return Materials",
      });
    });
    onBack();
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
      className="space-y-6"
    >
      {/* ── Page header ── */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Stock / Movements / Inward
          </p>
          <h2 className="text-[26px] font-bold leading-tight mt-0.5">Inward Entry</h2>
        </div>
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-xl border bg-card px-4 py-2.5 text-[13px] font-semibold text-muted-foreground shadow-card hover:bg-muted transition-colors"
        >
          <ChevronRight className="h-4 w-4 rotate-180" /> Back
        </button>
      </div>

      {/* ── Entry type radio ── */}
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

      {/* ── Material Details (New Materials mode) ── */}
      {entryMode === "new" && (
        <div className="rounded-2xl border bg-card shadow-card overflow-hidden">
          <div className="border-b bg-muted/30 px-6 py-3">
            <p className="text-[13px] font-bold text-primary">Material Details</p>
          </div>
          <div className="p-6 space-y-5">
            {/* Row 1: Invoice Date | Received Date | Bill Number | B2B dropdown */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                  Invoice Date
                </label>
                <input
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                  Material Received Date
                </label>
                <input
                  type="date"
                  value={receivedDate}
                  onChange={(e) => setReceivedDate(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                  Bill Number <span className="text-red-500">*</span>
                </label>
                <input
                  value={billNumber}
                  onChange={(e) => setBillNumber(e.target.value)}
                  placeholder="e.g. WE/INV/26-27/001"
                  className={inputCls}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                  B2B <span className="text-red-500">*</span>
                </label>
                <select value={b2b} onChange={(e) => setB2b(e.target.value)} className={selectCls}>
                  <option value="">Select Supplier…</option>
                  {b2bPartners.map((p) => (
                    <option key={p.id} value={p.companyName}>
                      {p.companyName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Material lines — only shown after Bill Number + B2B are filled */}
            <AnimatePresence>
              {billNumber.trim() && b2b && (
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
                    const unit = masters.find((m) => m.id === line.masterId)?.unit ?? "NOS";
                    const lineSub = subs.find((s) => s.id === line.subId);
                    const gstAmt = +((line.price * line.qty * line.gstPct) / 100).toFixed(2);
                    const total = +(line.price * line.qty + gstAmt).toFixed(2);

                    return (
                      <div key={line.id} className="rounded-xl border bg-muted/20 p-4 space-y-4">
                        {/* Badge + remove */}
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
                                updateLine(line.id, {
                                  masterId: m,
                                  groupId: g,
                                  catId: c,
                                  subId: s,
                                });
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

                        {/* Row 2: Quantity · GST% · Price · GST amt · Total */}
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

                        {/* Row 3: Total + Serial Number */}
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
                                  // comma-separated — split, trim, filter blanks, add all
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
                                  // scan or manual — add single entry
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
                            {/* Mode radios + count */}
                            <div className="flex flex-wrap items-center gap-5 pt-1.5">
                              {(
                                [
                                  {
                                    mode: "scan",
                                    label: "Scan Code",
                                    hint: "Barcode gun — each scan adds 1 serial",
                                  },
                                  {
                                    mode: "manual",
                                    label: "Manual Entry",
                                    hint: "Type one serial, press Enter",
                                  },
                                  {
                                    mode: "multiple",
                                    label: "Multiple Entry",
                                    hint: "Comma-separated — scan or type, press Enter",
                                  },
                                ] as { mode: SerialMode; label: string; hint: string }[]
                              ).map(({ mode, label, hint }) => (
                                <label
                                  key={mode}
                                  className="group flex cursor-pointer items-center gap-1.5"
                                  title={hint}
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
                                    {label}
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
                            {/* Mode hint text */}
                            <p className="text-[10px] text-muted-foreground/60">
                              {line.serialMode === "scan"
                                ? "Point barcode gun at each item — serial is added on every scan (Enter)."
                                : line.serialMode === "manual"
                                  ? "Type one serial number and press Enter to add it."
                                  : "Enter multiple serials separated by commas (e.g. SN001, SN002) then press Enter."}
                            </p>
                            {/* Added serial chips */}
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

                        {/* Stock preview */}
                        {lineSub && (
                          <p className="text-[11px] text-muted-foreground border-t pt-2">
                            Current stock:{" "}
                            <span className="font-bold text-foreground">
                              {lineSub.stock} {unit}
                            </span>
                            <span className="mx-1.5">·</span>
                            After inward:{" "}
                            <span className="font-bold text-emerald-600">
                              {lineSub.stock + line.qty} {unit}
                            </span>
                          </p>
                        )}
                      </div>
                    );
                  })}

                  {/* Action buttons */}
                  <div className="flex items-center justify-end gap-3 border-t pt-4">
                    <button
                      onClick={addLine}
                      className="inline-flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-5 py-2.5 text-[13px] font-bold text-amber-700 hover:bg-amber-100 transition-colors"
                    >
                      <Plus className="h-4 w-4" /> Add Material
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={!canSave}
                      className="inline-flex items-center gap-2 rounded-xl gradient-primary px-7 py-2.5 text-[13px] font-bold text-white shadow-glow disabled:opacity-40 transition hover:opacity-95"
                    >
                      <Check className="h-4 w-4" /> Submit
                    </button>
                    <button
                      onClick={onBack}
                      className="rounded-xl bg-red-500 px-5 py-2.5 text-[13px] font-bold text-white hover:bg-red-600 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Hint when fields not yet filled */}
            {!(billNumber.trim() && b2b) && (
              <p className="text-[12px] text-muted-foreground/60 text-center py-4 border-t">
                Fill in <span className="font-semibold text-foreground">Bill Number</span> and
                select a <span className="font-semibold text-foreground">B2B Supplier</span> to add
                materials.
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Outward Entry link (Return Materials mode) ── */}
      {entryMode === "return" && (
        <div className="rounded-2xl border bg-card p-6 shadow-card space-y-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              OutWard Entry
            </label>
            <select
              value={outwardRef}
              onChange={(e) => setOutwardRef(e.target.value)}
              className={selectCls}
            >
              <option value="">Select OutWard Entry</option>
              {outwardMovements.map((m) => {
                const sub = subs.find((s) => s.id === m.subcategoryId);
                const cat = cats.find((c) => c.id === sub?.categoryId);
                const grp = groups.find((g) => g.id === cat?.groupId);
                const mst = masters.find((x) => x.id === grp?.masterId);
                return (
                  <option key={m.id} value={m.id}>
                    {new Date(m.date + "T00:00:00").toLocaleDateString("en-IN")} — {mst?.name} ›{" "}
                    {grp?.name} › {sub?.name} ({m.qty} {mst?.unit})
                  </option>
                );
              })}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              Bill Number <span className="text-red-500">*</span>
            </label>
            <input
              value={billNumber}
              onChange={(e) => setBillNumber(e.target.value)}
              placeholder="e.g. WE/INV/26-27/001"
              className={inputCls}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                Invoice Date
              </label>
              <input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className={inputCls}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                Material Received Date
              </label>
              <input
                type="date"
                value={receivedDate}
                onChange={(e) => setReceivedDate(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>
          {/* Material lines for return */}
          <div className="space-y-3">
            {lines.map((line, idx) => {
              const grpsForMaster = groups.filter((g) => g.masterId === line.masterId);
              const ctsForGrp = cats.filter((c) => c.groupId === line.groupId);
              const subsForCat = subs.filter((s) => s.categoryId === line.catId);
              const lineMasterUnit = masters.find((m) => m.id === line.masterId)?.unit ?? "NOS";
              return (
                <div key={line.id} className="rounded-xl border bg-muted/20 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-primary">
                      Return Item {idx + 1}
                    </span>
                    {lines.length > 1 && (
                      <button
                        onClick={() => removeLine(line.id)}
                        className="grid h-6 w-6 place-items-center rounded-md bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
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
                        SubCategory
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
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-muted-foreground">
                        Qty ({lineMasterUnit})
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
                  </div>
                </div>
              );
            })}
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 border-t pt-4">
            <button
              onClick={addLine}
              className="inline-flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-5 py-2.5 text-[13px] font-bold text-amber-700 hover:bg-amber-100 transition-colors"
            >
              <Plus className="h-4 w-4" /> Add Material
            </button>
            <button
              onClick={handleSave}
              disabled={!canSave}
              className="inline-flex items-center gap-2 rounded-xl gradient-primary px-7 py-2.5 text-[13px] font-bold text-white shadow-glow disabled:opacity-40 transition hover:opacity-95"
            >
              <Check className="h-4 w-4" /> Submit
            </button>
            <button
              onClick={onBack}
              className="rounded-xl bg-red-500 px-5 py-2.5 text-[13px] font-bold text-white hover:bg-red-600 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   B2B PARTNER FORM  (add / edit)
══════════════════════════════════════════════════════════════════════════ */
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

function B2bForm({
  initial,
  onSave,
  onBack,
}: {
  initial?: B2bPartner;
  onSave: (p: Omit<B2bPartner, "id">) => void;
  onBack: () => void;
}) {
  const [companyName, setCompanyName] = useState(initial?.companyName ?? "");
  const [gstin, setGstin] = useState(initial?.gstin ?? "");
  const [address, setAddress] = useState(initial?.address ?? "");
  const [city, setCity] = useState(initial?.city ?? "");
  const [state, setState] = useState(initial?.state ?? "");
  const [pincode, setPincode] = useState(initial?.pincode ?? "");
  const [contact, setContact] = useState(initial?.contact ?? "");

  const canSubmit =
    companyName.trim() &&
    gstin.trim() &&
    address.trim() &&
    city.trim() &&
    state &&
    pincode.trim() &&
    contact.trim();

  function handleSubmit() {
    if (!canSubmit) return;
    onSave({
      companyName: companyName.trim(),
      gstin: gstin.trim(),
      address: address.trim(),
      city: city.trim(),
      state,
      pincode: pincode.trim(),
      contact: contact.trim(),
    });
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Inventory / B2B / {initial ? "Edit Partner" : "Create Partner"}
          </p>
          <h2 className="text-[26px] font-bold leading-tight mt-0.5">
            {initial ? "Edit Buyer Partner" : "Create Buyer Partner"}
          </h2>
        </div>
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-xl border bg-card px-4 py-2.5 text-[13px] font-semibold text-muted-foreground shadow-card hover:bg-muted transition-colors"
        >
          <ChevronRight className="h-4 w-4 rotate-180" /> Back
        </button>
      </div>

      {/* Form card */}
      <div className="rounded-2xl border bg-card shadow-card overflow-hidden">
        <div className="border-b bg-muted/30 px-6 py-3">
          <p className="text-[13px] font-bold text-primary">Partner Details</p>
        </div>
        <div className="p-6 space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {/* Company Name */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                Company Name <span className="text-red-500">*</span>
              </label>
              <input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. WAAREE ENERGIES LTD"
                className={inputCls}
              />
            </div>
            {/* Address */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                Address <span className="text-red-500">*</span>
              </label>
              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Street / Area"
                className={inputCls}
              />
            </div>
            {/* City */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                City <span className="text-red-500">*</span>
              </label>
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="City"
                className={inputCls}
              />
            </div>
            {/* GSTIN */}
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
              />
            </div>
            {/* State */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                State <span className="text-red-500">*</span>
              </label>
              <select
                value={state}
                onChange={(e) => setState(e.target.value)}
                className={selectCls}
              >
                <option value="">Select State…</option>
                {INDIAN_STATES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            {/* Pincode */}
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
              />
            </div>
            {/* Contact */}
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
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t pt-4">
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="inline-flex items-center gap-2 rounded-xl gradient-primary px-7 py-2.5 text-[13px] font-bold text-white shadow-glow disabled:opacity-40 transition hover:opacity-95"
            >
              <Check className="h-4 w-4" /> {initial ? "Save Changes" : "Submit"}
            </button>
            <button
              onClick={onBack}
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

/* ── Buyer Partners list tab ───────────────────────────────────────────────── */
function B2bTab({
  partners,
  onAdd,
  onEdit,
  onDelete,
  onRefresh,
}: {
  partners: B2bPartner[];
  onAdd: () => void;
  onEdit: (p: B2bPartner) => void;
  onDelete: (id: string) => void;
  onRefresh: () => void;
}) {
  const [search, setSearch] = useState("");
  const [viewItem, setViewItem] = useState<B2bPartner | null>(null);
  const [deletingPartner, setDeletingPartner] = useState<B2bPartner | null>(null);

  // Refresh from DB each time this tab is shown
  useEffect(() => {
    onRefresh();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = partners.filter((p) => {
    const q = search.toLowerCase();
    return (
      !q ||
      p.companyName.toLowerCase().includes(q) ||
      p.gstin.toLowerCase().includes(q) ||
      p.city.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { label: "Total Partners", value: partners.length, color: "text-primary" },
          {
            label: "States Covered",
            value: new Set(partners.map((p) => p.state)).size,
            color: "text-[oklch(0.5_0.15_240)]",
          },
          {
            label: "Cities Covered",
            value: new Set(partners.map((p) => p.city)).size,
            color: "text-[oklch(0.5_0.14_70)]",
          },
          {
            label: "With GSTIN",
            value: partners.filter((p) => p.gstin && p.gstin !== "NA").length,
            color: "text-[oklch(0.45_0.15_145)]",
          },
        ].map(({ label, value, color }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-2xl border bg-card p-5 shadow-card"
          >
            <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {label}
            </div>
            <div className={`mt-2 text-2xl font-bold ${color}`}>{value}</div>
          </motion.div>
        ))}
      </div>

      {/* Search + button */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search company, GSTIN, city…"
            className="h-10 w-full rounded-xl border bg-card pl-10 pr-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
          />
        </div>
        <button
          onClick={onAdd}
          className="shrink-0 inline-flex items-center gap-2 rounded-xl gradient-primary px-5 py-2.5 text-[13px] font-bold text-white shadow-glow hover:opacity-95 transition-opacity"
        >
          <Plus className="h-4 w-4" /> Add Partner
        </button>
      </div>

      {/* Table */}
      <div className="rounded-2xl border bg-card shadow-card overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[48px_1fr_160px_1fr_100px_110px] gap-3 border-b bg-muted/40 px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          <span>ID</span>
          <span>Company Name</span>
          <span>GSTIN</span>
          <span>Address</span>
          <span>Pin Code</span>
          <span className="text-center">Action</span>
        </div>

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-2 py-16">
            <Building2 className="h-8 w-8 text-muted-foreground/30" />
            <p className="text-[12px] text-muted-foreground/60">
              {search ? "No matching partners" : "No Buyer partners yet. Click Add Partner."}
            </p>
          </div>
        )}

        {filtered.map((p, i) => (
          <div
            key={p.id}
            className="grid grid-cols-[48px_1fr_160px_1fr_100px_110px] gap-3 items-center border-b px-5 py-3.5 hover:bg-muted/20 transition-colors"
          >
            <span className="text-[12px] font-bold text-muted-foreground">{i + 1}</span>
            <div className="min-w-0">
              <p className="text-[13px] font-semibold truncate">{p.companyName}</p>
              <p className="text-[11px] text-muted-foreground flex items-center gap-1 truncate">
                <Phone className="h-2.5 w-2.5 shrink-0" />
                {p.contact}
              </p>
            </div>
            <span className="font-mono text-[11px] text-muted-foreground">{p.gstin || "—"}</span>
            <div className="min-w-0">
              <p className="text-[11px] truncate text-muted-foreground">{p.address}</p>
              <p className="text-[11px] text-muted-foreground flex items-center gap-1 truncate">
                <MapPin className="h-2.5 w-2.5 shrink-0" />
                {p.city}, {p.state}
              </p>
            </div>
            <span className="font-mono text-[12px]">{p.pincode}</span>
            <div className="flex items-center justify-center gap-1.5">
              <button
                onClick={() => setViewItem(p)}
                title="View"
                className="grid h-7 w-7 place-items-center rounded-lg bg-[oklch(0.95_0.04_145)] text-[oklch(0.40_0.15_145)] hover:opacity-80 transition-opacity"
              >
                <Eye className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => onEdit(p)}
                title="Edit"
                className="grid h-7 w-7 place-items-center rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setDeletingPartner(p)}
                title="Delete"
                className="grid h-7 w-7 place-items-center rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* View detail modal */}
      <AnimatePresence>
                {deletingPartner && (
          <Modal title="Confirm Delete" onClose={() => setDeletingPartner(null)}>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3 text-destructive">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-destructive/10">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-foreground">Delete Buyer Partner?</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Are you sure you want to delete <strong className="text-foreground">"{deletingPartner.companyName}"</strong>? This action cannot be undone.
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setDeletingPartner(null)}
                  className="rounded-xl border px-4 py-2.5 text-xs font-semibold text-muted-foreground hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onDelete(deletingPartner.id);
                    setDeletingPartner(null);
                  }}
                  className="rounded-xl bg-destructive px-5 py-2.5 text-xs font-bold text-destructive-foreground shadow-sm hover:opacity-90 transition-opacity"
                >
                  Delete Partner
                </button>
              </div>
            </div>
          </Modal>
        )}
                {deletingPartner && (
          <Modal title="Confirm Delete" onClose={() => setDeletingPartner(null)}>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3 text-destructive">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-destructive/10">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-foreground">Delete Seller Partner?</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Are you sure you want to delete <strong className="text-foreground">"{deletingPartner.companyName}"</strong>? This action cannot be undone.
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setDeletingPartner(null)}
                  className="rounded-xl border px-4 py-2.5 text-xs font-semibold text-muted-foreground hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onDelete(deletingPartner.id);
                    setDeletingPartner(null);
                  }}
                  className="rounded-xl bg-destructive px-5 py-2.5 text-xs font-bold text-destructive-foreground shadow-sm hover:opacity-90 transition-opacity"
                >
                  Delete Partner
                </button>
              </div>
            </div>
          </Modal>
        )}
        {viewItem && (
          <Modal title="Buyer Partner Details" onClose={() => setViewItem(null)}>
            <div className="p-5 space-y-3">
              <div className="flex items-center gap-3 rounded-xl bg-primary-soft px-4 py-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/20">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-[14px] font-bold text-primary">{viewItem.companyName}</p>
                  <p className="font-mono text-[11px] text-primary/70">{viewItem.gstin}</p>
                </div>
              </div>
              <div className="rounded-xl border bg-muted/30 divide-y text-[12px]">
                {[
                  ["Address", viewItem.address],
                  ["City", viewItem.city],
                  ["State", viewItem.state],
                  ["Pincode", viewItem.pincode],
                  ["Contact", viewItem.contact],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between px-4 py-2.5">
                    <span className="text-muted-foreground">{k}</span>
                    <span className="font-semibold">{v}</span>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setViewItem(null)}
                className="w-full rounded-xl border bg-card py-2.5 text-sm font-semibold text-muted-foreground hover:bg-muted transition-colors"
              >
                Close
              </button>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Seller partners list tab ─────────────────────────────────────────────── */
function InstallerTab({
  partners,
  onAdd,
  onEdit,
  onDelete,
  onRefresh,
}: {
  partners: B2bPartner[];
  onAdd: () => void;
  onEdit: (p: B2bPartner) => void;
  onDelete: (id: string) => void;
  onRefresh: () => void;
}) {
  const [search, setSearch] = useState("");
  const [viewItem, setViewItem] = useState<B2bPartner | null>(null);
  const [deletingPartner, setDeletingPartner] = useState<B2bPartner | null>(null);

  // Refresh from DB each time this tab is shown
  useEffect(() => {
    onRefresh();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = partners.filter((p) => {
    const q = search.toLowerCase();
    return (
      !q ||
      p.companyName.toLowerCase().includes(q) ||
      p.gstin.toLowerCase().includes(q) ||
      p.city.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { label: "Total Sellers", value: partners.length, color: "text-primary" },
          {
            label: "States Covered",
            value: new Set(partners.map((p) => p.state)).size,
            color: "text-[oklch(0.5_0.15_240)]",
          },
          {
            label: "Cities Covered",
            value: new Set(partners.map((p) => p.city)).size,
            color: "text-[oklch(0.5_0.14_70)]",
          },
          {
            label: "With GSTIN",
            value: partners.filter((p) => p.gstin && p.gstin !== "NA").length,
            color: "text-[oklch(0.45_0.15_145)]",
          },
        ].map(({ label, value, color }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-2xl border bg-card p-5 shadow-card"
          >
            <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {label}
            </div>
            <div className={`mt-2 text-2xl font-bold ${color}`}>{value}</div>
          </motion.div>
        ))}
      </div>

      {/* Search + button */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search company, GSTIN, city…"
            className="h-10 w-full rounded-xl border bg-card pl-10 pr-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
          />
        </div>
        <button
          onClick={onAdd}
          className="shrink-0 inline-flex items-center gap-2 rounded-xl gradient-primary px-5 py-2.5 text-[13px] font-bold text-white shadow-glow hover:opacity-95 transition-opacity"
        >
          <Plus className="h-4 w-4" /> Add Seller
        </button>
      </div>

      {/* Table */}
      <div className="rounded-2xl border bg-card shadow-card overflow-hidden">
        <div className="grid grid-cols-[48px_1fr_160px_1fr_100px_110px] gap-3 border-b bg-muted/40 px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          <span>ID</span>
          <span>Company Name</span>
          <span>GSTIN</span>
          <span>Address</span>
          <span>Pin Code</span>
          <span className="text-center">Action</span>
        </div>

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-2 py-16">
            <Building2 className="h-8 w-8 text-muted-foreground/30" />
            <p className="text-[12px] text-muted-foreground/60">
              {search ? "No matching installers" : "No sellers yet. Click Add Seller."}
            </p>
          </div>
        )}

        {filtered.map((p, i) => (
          <div
            key={p.id}
            className="grid grid-cols-[48px_1fr_160px_1fr_100px_110px] gap-3 items-center border-b px-5 py-3.5 hover:bg-muted/20 transition-colors"
          >
            <span className="text-[12px] font-bold text-muted-foreground">{i + 1}</span>
            <div className="min-w-0">
              <p className="text-[13px] font-semibold truncate">{p.companyName}</p>
              <p className="text-[11px] text-muted-foreground flex items-center gap-1 truncate">
                <Phone className="h-2.5 w-2.5 shrink-0" />
                {p.contact}
              </p>
            </div>
            <span className="font-mono text-[11px] text-muted-foreground">{p.gstin || "—"}</span>
            
            <div className="min-w-0">
              <p className="text-[11px] truncate text-muted-foreground">{p.address}</p>
              <p className="text-[11px] text-muted-foreground flex items-center gap-1 truncate">
                <MapPin className="h-2.5 w-2.5 shrink-0" />
                {p.city}, {p.state}
              </p>
            </div>
            <span className="font-mono text-[12px]">{p.pincode}</span>
            <div className="flex items-center justify-center gap-1.5">
              <button
                onClick={() => setViewItem(p)}
                title="View"
                className="grid h-7 w-7 place-items-center rounded-lg bg-[oklch(0.95_0.04_145)] text-[oklch(0.40_0.15_145)] hover:opacity-80 transition-opacity"
              >
                <Eye className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => onEdit(p)}
                title="Edit"
                className="grid h-7 w-7 place-items-center rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setDeletingPartner(p)}
                title="Delete"
                className="grid h-7 w-7 place-items-center rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* View detail modal */}
      <AnimatePresence>
        {viewItem && (
          <Modal title="Seller Details" onClose={() => setViewItem(null)}>
            <div className="p-5 space-y-3">
              <div className="flex items-center gap-3 rounded-xl bg-primary-soft px-4 py-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/20">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-[14px] font-bold text-primary">{viewItem.companyName}</p>
                  <p className="font-mono text-[11px] text-primary/70">{viewItem.gstin}</p>
                </div>
              </div>
              <div className="rounded-xl border bg-muted/30 divide-y text-[12px]">
                {[
                  
                  ["Address", viewItem.address],
                  ["City", viewItem.city],
                  ["State", viewItem.state],
                  ["Pincode", viewItem.pincode],
                  ["Contact", viewItem.contact],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between px-4 py-2.5">
                    <span className="text-muted-foreground">{k}</span>
                    <span className="font-semibold">{v}</span>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setViewItem(null)}
                className="w-full rounded-xl border bg-card py-2.5 text-sm font-semibold text-muted-foreground hover:bg-muted transition-colors"
              >
                Close
              </button>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════════════════════════ */
function InventoryPage() {
  const navigate = useNavigate();
  const { tab } = useSearch({ from: "/inventory" });
  const activeTab = (tab as string) || "dashboard";

  const queryClient = useQueryClient();

  const { data: inventoryData } = useQuery({
    queryKey: ["inventory"],
    queryFn: fetchAllInventory,
  });
  const masters = inventoryData?.masters ?? [];
  const groups = inventoryData?.groups ?? [];
  const cats = inventoryData?.cats ?? [];
  const subs = inventoryData?.subs ?? [];

  const { data: inwardEntries = [] } = useQuery({
    queryKey: ["inwardEntries"],
    queryFn: fetchInwardEntries,
  });
  const { data: outwardEntries = [] } = useQuery({
    queryKey: ["outwardEntries"],
    queryFn: fetchOutwardEntries,
  });
  const { data: installerPartners = [] } = useQuery({
    queryKey: ["installerPartners"],
    queryFn: fetchInstallerPartners,
  });
  const { data: b2bPartners = [] } = useQuery({
    queryKey: ["b2bPartners"],
    queryFn: fetchB2bPartners,
  });
  const { data: installerPartnerStocks = [] } = useQuery({
    queryKey: ["installerPartnerStocks"],
    queryFn: () => fetchInstallerPartnerStock(),
    staleTime: 0,
  });

  // Sync the in-memory sequence counter — side effect only, not rendered state
  useEffect(() => {
    fetchMaxInwardSeq().then(InvStore.setInwardSeq).catch(console.error);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const movements: Movement[] = [
    ...inwardEntries.map((e) => ({
      id: e.id,
      subcategoryId: e.subcategoryId,
      type: "in" as const,
      qty: e.qty,
      date: e.materialReceivedDate,
      ref: e.billNumber,
      note: "",
      inwardId: e.inwardId,
      supplier: e.supplier,
      invoiceDate: e.invoiceDate,
      billNumber: e.billNumber,
      materialReceivedDate: e.materialReceivedDate,
      entryType: e.entryType,
    })),
    ...outwardEntries.map((e) => ({
      id: e.id,
      subcategoryId: e.subcategoryId,
      type: "out" as const,
      qty: e.qty,
      date: e.challanDate,
      ref: e.billNumber,
      note: e.remarks,
      supplier: e.b2bCompanyName,
    })),
  ];

  function invalidateInventory() {
    queryClient.invalidateQueries({ queryKey: ["inventory"] });
  }

  function handleAddMaster(name: string, unit: string) {
    void createMaster(name, unit).then(invalidateInventory).catch(console.error);
  }
  function handleEditMaster(id: string, name: string, unit: string) {
    void updateMaster(id, name, unit).then(invalidateInventory).catch(console.error);
  }
  function handleDeleteMaster(id: string) {
    void deleteMaster(id).then(invalidateInventory).catch(console.error);
  }

  function handleAddGroup(masterId: string, name: string) {
    void createGroup(masterId, name).then(invalidateInventory).catch(console.error);
  }
  function handleEditGroup(id: string, name: string) {
    void updateGroup(id, name).then(invalidateInventory).catch(console.error);
  }
  function handleDeleteGroup(id: string) {
    void deleteGroup(id).then(invalidateInventory).catch(console.error);
  }

  function handleAddCat(groupId: string, name: string) {
    void createCategory(groupId, name).then(invalidateInventory).catch(console.error);
  }
  function handleEditCat(id: string, name: string) {
    void updateCategory(id, name).then(invalidateInventory).catch(console.error);
  }
  function handleDeleteCat(id: string) {
    void deleteCategory(id).then(invalidateInventory).catch(console.error);
  }

  function handleAddSub(catId: string, name: string) {
    void createSubcategory(catId, name).then(invalidateInventory).catch(console.error);
  }
  function handleEditSub(id: string, name: string) {
    void updateSubcategory(id, name).then(invalidateInventory).catch(console.error);
  }
  function handleDeleteSub(id: string) {
    void deleteSubcategory(id).then(invalidateInventory).catch(console.error);
  }

  async function handleDeleteInstaller(id: string) {
    await deleteInstallerPartner(id).catch(console.error);
    queryClient.invalidateQueries({ queryKey: ["installerPartners"] });
  }

  async function handleDeleteB2b(id: string) {
    await deleteB2bPartner(id).catch(console.error);
    queryClient.invalidateQueries({ queryKey: ["b2bPartners"] });
  }

  function setTab(t: string) {
    navigate({ to: "/inventory", search: { tab: t } });
  }

  const tabs = [
    { id: "dashboard", label: "Dashboard", icon: BarChart3 },
    { id: "overview", label: "Overview", icon: Layers },
  ] as const;

  const moreTabs = [
    { id: "products", label: "Products", icon: Boxes },
    { id: "b2b", label: "Buyer", icon: Building2 },
    { id: "installer", label: "Seller", icon: Building2 },
  ] as const;

  const movementTabs = [
    { id: "inward", label: "Inward", icon: ArrowDownToLine },
    { id: "outward", label: "Outward", icon: ArrowUpFromLine },
  ] as const;

  const moreActive = moreTabs.some((t) => t.id === activeTab);

  return (
    <>
      <div className="space-y-6">
        <PageHeader eyebrow="Main Menu" title="Inventory" />

        {/* Tab bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex items-center gap-1 rounded-xl border bg-card p-1 shadow-card">
            {tabs.map((t) => {
              const Icon = t.icon;
              const active = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-[13px] font-semibold transition-all ${
                    active
                      ? "gradient-primary border-transparent text-white shadow-glow"
                      : "border-transparent bg-transparent text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {t.label}
                </button>
              );
            })}
          </div>

          
        </div>

        {/* Tab content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
          >
            {activeTab === "dashboard" && (
              <OverviewTab
                masters={masters}
                groups={groups}
                cats={cats}
                subs={subs}
                movements={movements}
              />
            )}
            {activeTab === "overview" && (
              <StockOverviewTab
                masters={masters}
                groups={groups}
                cats={cats}
                subs={subs}
                inwardEntries={inwardEntries}
                installerPartners={installerPartners}
                installerPartnerStocks={installerPartnerStocks}
              />
            )}
            {activeTab === "products" && (
              <ProductsTab
                masters={masters}
                groups={groups}
                cats={cats}
                subs={subs}
                onAddMaster={handleAddMaster}
                onEditMaster={handleEditMaster}
                onDeleteMaster={handleDeleteMaster}
                onAddGroup={handleAddGroup}
                onEditGroup={handleEditGroup}
                onDeleteGroup={handleDeleteGroup}
                onAddCat={handleAddCat}
                onEditCat={handleEditCat}
                onDeleteCat={handleDeleteCat}
                onAddSub={handleAddSub}
                onEditSub={handleEditSub}
                onDeleteSub={handleDeleteSub}
              />
            )}
            {activeTab === "inward" && (
              <MovementsTab
                movements={movements}
                subs={subs}
                cats={cats}
                groups={groups}
                masters={masters}
                onNewInward={() => navigate({ to: "/inventory/inward/new" })}
                inwardEntries={inwardEntries}
              />
            )}
            {activeTab === "outward" && (
              <OutwardTab
                movements={movements}
                subs={subs}
                cats={cats}
                groups={groups}
                masters={masters}
                onNewOutward={() => navigate({ to: "/inventory/outward/new" })}
                outwardEntries={outwardEntries}
              />
            )}
            {activeTab === "b2b" && (
              <B2bTab
                partners={b2bPartners}
                onAdd={() => navigate({ to: "/inventory/b2b/add" })}
                onEdit={(p) => navigate({ to: "/inventory/b2b/$id", params: { id: p.id } })}
                onDelete={handleDeleteB2b}
                onRefresh={() => queryClient.invalidateQueries({ queryKey: ["b2bPartners"] })}
              />
            )}
            {activeTab === "installer" && (
              <InstallerTab
                partners={installerPartners}
                onAdd={() => navigate({ to: "/inventory/installer/add" })}
                onEdit={(p) => navigate({ to: "/inventory/installer/$id", params: { id: p.id } })}
                onDelete={handleDeleteInstaller}
                onRefresh={() => queryClient.invalidateQueries({ queryKey: ["installerPartners"] })}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </>
  );
}
