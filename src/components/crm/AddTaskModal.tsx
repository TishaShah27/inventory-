import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  X,
  ClipboardList,
  User,
  Calendar as CalendarIcon,
  MessageSquare,
  CheckCircle2,
  Check,
  ChevronsUpDown,
  Building2,
  Briefcase,
} from "lucide-react";
import { CrmSelect } from "@/components/crm/CrmSelect";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { SERVICE_TASK_TYPES, ACTION_TASK_TYPES, type TaskType } from "@/data/tasksStore";
import { addTask } from "@/lib/taskService";
import type { Customer } from "@/data/customersStore";

const inputCls =
  "h-10 w-full rounded-xl border bg-muted/40 px-3.5 text-sm outline-none transition focus:bg-card focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/60";

function FieldLbl({ icon: Icon, text }: { icon: React.ElementType; text: string }) {
  return (
    <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
      <Icon className="h-3.5 w-3.5" /> {text}
    </label>
  );
}

/* ── Searchable customer combobox ─────────────────────────────────────────── */
function CustomerCombobox({
  customers,
  value,
  onChange,
  error,
  disabled,
}: {
  customers: Customer[];
  value: string;
  onChange: (customerId: string) => void;
  error?: boolean;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = customers.find((c) => c.customerId === value);

  return (
    <Popover open={open && !disabled} onOpenChange={(v) => !disabled && setOpen(v)}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "flex h-10 w-full items-center justify-between gap-2 rounded-xl border bg-muted/40 px-3.5 text-sm outline-none transition",
            "focus:bg-card focus:border-primary focus:ring-2 focus:ring-primary/20 hover:bg-card",
            open && "bg-card border-primary ring-2 ring-primary/20",
            error ? "border-destructive" : "border-border",
            disabled && "cursor-not-allowed opacity-60 hover:bg-muted/40",
          )}
        >
          {selected ? (
            <span className="truncate">
              {selected.name} <span className="text-muted-foreground">· {selected.customerId}</span>
            </span>
          ) : (
            <span className="text-muted-foreground/60">Search & select a customer…</span>
          )}
          <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search customer by name or ID…" />
          <CommandList className="overscroll-contain">
            <CommandEmpty>No customer found.</CommandEmpty>
            <CommandGroup>
              {customers.map((c) => (
                <CommandItem
                  key={c.customerId}
                  value={`${c.name} ${c.customerId}`}
                  onSelect={() => {
                    onChange(c.customerId);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn("h-4 w-4", value === c.customerId ? "opacity-100" : "opacity-0")}
                  />
                  <span className="flex-1 truncate">{c.name}</span>
                  <span className="text-xs text-muted-foreground">{c.customerId}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export const STAFF_TYPES = ["Service", "Action"] as const;
export type StaffType = (typeof STAFF_TYPES)[number];

const staffTypeRole: Record<StaffType, string> = {
  Service: "Service Staff",
  Action: "Action Staff",
};

const emptyForm = {
  customerId: "",
  staffType: "" as StaffType | "",
  taskType: "" as TaskType | "",
  taskTypeOther: "",
  dueDate: "",
  comment: "",
  assigneeId: "",
};

/* ── Add Task Modal ────────────────────────────────────────────────────────
 * Reused as-is from the Customer Tasks page. A caller (e.g. a Kanban move
 * that should always spin off a task) can pre-fill and lock the customer,
 * Service/Action toggle, and task type via the initial* props — due date and
 * assignee are always left open for the person confirming to fill in. ──── */
export function AddTaskModal({
  customers,
  employees,
  onClose,
  onAdded,
  initialCustomerId,
  initialStaffType,
  initialTaskType,
  lockInitialFields,
}: {
  customers: Customer[];
  employees: { id: string; name: string; role: string | null }[];
  onClose: () => void;
  onAdded: () => void;
  initialCustomerId?: string;
  initialStaffType?: StaffType;
  initialTaskType?: TaskType;
  lockInitialFields?: boolean;
}) {
  const [form, setForm] = useState(() => ({
    ...emptyForm,
    customerId: initialCustomerId ?? "",
    staffType: initialStaffType ?? "",
    taskType: initialTaskType ?? "",
  }));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const filteredEmployees = form.staffType
    ? employees.filter((e) => e.role === staffTypeRole[form.staffType as StaffType])
    : [];

  const taskTypeOptions =
    form.staffType === "Service"
      ? SERVICE_TASK_TYPES
      : form.staffType === "Action"
        ? ACTION_TASK_TYPES
        : [];

  function setF<K extends keyof typeof form>(field: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [field]: value }));
    if (errors[field]) setErrors((e) => ({ ...e, [field]: "" }));
  }

  function setStaffType(v: StaffType) {
    setForm((f) => ({ ...f, staffType: v, assigneeId: "", taskType: "", taskTypeOther: "" }));
    setErrors((e) => ({ ...e, staffType: "", assigneeId: "", taskType: "" }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!form.customerId) errs.customerId = "Select a customer";
    if (!form.staffType) errs.staffType = "Select Service or Action";
    if (!form.taskType) errs.taskType = "Select a task type";
    if (form.taskType === "Other GEB Task" && !form.taskTypeOther.trim())
      errs.taskTypeOther = "Describe the task";
    if (!form.dueDate) errs.dueDate = "Required";
    if (!form.assigneeId) errs.assigneeId = "Select an employee";
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }

    const customer = customers.find((c) => c.customerId === form.customerId)!;
    const employee = employees.find((e) => e.id === form.assigneeId)!;

    setLoading(true);
    try {
      await addTask({
        customerId: customer.customerId,
        customerName: customer.name,
        taskType: form.taskType as TaskType,
        taskTypeOther: form.taskType === "Other GEB Task" ? form.taskTypeOther.trim() : "",
        dueDate: form.dueDate,
        comment: form.comment.trim(),
        assigneeId: employee.id,
        assigneeName: employee.name,
      });
      toast.success("Task added successfully");
      onAdded();
      onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to add task.");
    } finally {
      setLoading(false);
    }
  }

  const lockCustomer = lockInitialFields && !!initialCustomerId;
  const lockStaffType = lockInitialFields && !!initialStaffType;
  const lockTaskType = lockInitialFields && !!initialTaskType;

  return (
    <>
      <motion.div
        key="at-bg"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        key="at-modal"
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="fixed inset-x-4 top-1/2 z-50 mx-auto max-w-md -translate-y-1/2 overflow-hidden rounded-2xl border bg-card shadow-2xl"
      >
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary-soft">
              <ClipboardList className="h-4 w-4 text-primary" />
            </div>
            <p className="text-sm font-bold">Add Task</p>
          </div>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <form
          onSubmit={handleSubmit}
          className="max-h-[75vh] space-y-4 overflow-y-auto px-5 py-5"
          autoComplete="off"
        >
          <div>
            <FieldLbl icon={Building2} text="Choose Customer *" />
            <CustomerCombobox
              customers={customers}
              value={form.customerId}
              onChange={(v) => setF("customerId", v)}
              error={!!errors.customerId}
              disabled={lockCustomer}
            />
            {errors.customerId && (
              <p className="mt-1 text-[11px] text-red-500">{errors.customerId}</p>
            )}
          </div>

          <div>
            <FieldLbl icon={Briefcase} text="Service / Action *" />
            <div className="flex gap-2">
              {STAFF_TYPES.map((s) => (
                <button
                  key={s}
                  type="button"
                  disabled={lockStaffType}
                  onClick={() => setStaffType(s)}
                  className={`flex-1 rounded-xl border py-2 text-sm font-semibold transition-all ${
                    form.staffType === s
                      ? "gradient-primary text-white border-transparent shadow-glow"
                      : "bg-muted/40 text-muted-foreground border-border hover:bg-muted"
                  } ${lockStaffType ? "cursor-not-allowed opacity-60" : ""}`}
                >
                  {s}
                </button>
              ))}
            </div>
            {errors.staffType && (
              <p className="mt-1 text-[11px] text-red-500">{errors.staffType}</p>
            )}
          </div>

          <div>
            <FieldLbl icon={ClipboardList} text="Task Type *" />
            <CrmSelect
              value={form.taskType}
              onValueChange={(v) => setF("taskType", v as TaskType)}
              options={taskTypeOptions.map((t) => ({ value: t, label: t }))}
              placeholder={form.staffType ? "Select task type…" : "Select Service / Action first…"}
              error={!!errors.taskType}
              disabled={lockTaskType}
            />
            {errors.taskType && <p className="mt-1 text-[11px] text-red-500">{errors.taskType}</p>}
            <AnimatePresence initial={false}>
              {form.taskType === "Other GEB Task" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="mt-2 overflow-hidden"
                >
                  <input
                    value={form.taskTypeOther}
                    onChange={(e) => setF("taskTypeOther", e.target.value)}
                    placeholder="Describe the GEB task…"
                    autoFocus
                    className={`${inputCls} ${errors.taskTypeOther ? "border-destructive" : ""}`}
                  />
                  {errors.taskTypeOther && (
                    <p className="mt-1 text-[11px] text-red-500">{errors.taskTypeOther}</p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div>
            <FieldLbl icon={CalendarIcon} text="To Be Completed By *" />
            <input
              type="date"
              value={form.dueDate}
              onChange={(e) => setF("dueDate", e.target.value)}
              className={`${inputCls} ${errors.dueDate ? "border-destructive" : ""}`}
            />
            {errors.dueDate && <p className="mt-1 text-[11px] text-red-500">{errors.dueDate}</p>}
          </div>

          <div>
            <FieldLbl icon={MessageSquare} text="Comment (optional)" />
            <textarea
              value={form.comment}
              onChange={(e) => setF("comment", e.target.value)}
              placeholder="Additional notes or instructions…"
              rows={2}
              className="w-full resize-none rounded-xl border bg-muted/40 px-3.5 py-2.5 text-sm outline-none transition focus:bg-card focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/60"
            />
          </div>

          <div>
            <FieldLbl icon={User} text="Assign To *" />
            <CrmSelect
              value={form.assigneeId}
              onValueChange={(v) => setF("assigneeId", v)}
              options={filteredEmployees.map((e) => ({
                value: e.id,
                label: e.name,
                description: e.role ?? undefined,
              }))}
              placeholder={form.staffType ? "Select employee…" : "Select Service / Action first…"}
              error={!!errors.assigneeId}
            />
            {errors.assigneeId && (
              <p className="mt-1 text-[11px] text-red-500">{errors.assigneeId}</p>
            )}
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl gradient-primary py-2.5 text-sm font-bold text-white shadow-glow transition hover:opacity-95 active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none"
            >
              {loading ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              {loading ? "Adding…" : "Add Task"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border bg-card px-5 py-2.5 text-sm font-semibold text-muted-foreground hover:bg-muted transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </motion.div>
    </>
  );
}
