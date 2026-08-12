import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  ClipboardList,
  Camera,
  X,
  CheckCircle2,
  Clock,
  AlertTriangle,
  CalendarClock,
  Briefcase,
  MessageSquare,
  Loader2,
  Aperture,
  PencilLine,
  History,
  ImageOff,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { CrmSelect } from "@/components/crm/CrmSelect";
import { Badge } from "@/components/ui/badge";
import { ACTION_COMMENTS, type Task, type TaskHistoryEntry } from "@/data/tasksStore";
import { submitTaskAction, fetchTaskHistory } from "@/lib/taskService";
import { uploadCustomerDoc } from "@/lib/storageService";
import { tryAdvanceMeterInstallStage } from "@/lib/netMeteringKanbanService";

// The file-input camera fallback only forces the OS camera app on mobile —
// desktop browsers ignore `capture` and open the plain file picker instead,
// which would defeat the whole point of disallowing gallery/old-photo uploads.
function isMobileDevice() {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function formatDateTime(iso: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export type Bucket = "all" | "pending" | "overdue" | "completed" | "future";

function todayStr() {
  return new Date().toDateString();
}

export function bucketOf(task: Task): Exclude<Bucket, "all"> {
  if (task.status === "Completed") return "completed";
  if (!task.dueDate) return "pending";
  const due = new Date(task.dueDate).toDateString();
  const today = todayStr();
  if (due === today) return "pending";
  if (new Date(task.dueDate) < new Date(today)) return "overdue";
  return "future";
}

export const BUCKET_META: Record<
  Exclude<Bucket, "all">,
  { label: string; icon: typeof Clock; badge: string; dot: string; rowHover: string }
> = {
  pending: {
    label: "Pending Today",
    icon: Clock,
    badge: "bg-amber-50 text-amber-700 border-0",
    dot: "bg-amber-500",
    rowHover: "hover:bg-muted/40",
  },
  overdue: {
    label: "Overdue",
    icon: AlertTriangle,
    badge: "bg-red-50 text-red-600 border-0",
    dot: "bg-red-500",
    rowHover: "hover:bg-red-50/60",
  },
  completed: {
    label: "Completed",
    icon: CheckCircle2,
    badge: "bg-[oklch(0.95_0.08_145)] text-[oklch(0.45_0.15_145)] border-0",
    dot: "bg-[oklch(0.55_0.15_145)]",
    rowHover: "hover:bg-[oklch(0.97_0.05_145)]",
  },
  future: {
    label: "Future",
    icon: CalendarClock,
    badge: "bg-violet-50 text-violet-600 border-0",
    dot: "bg-violet-500",
    rowHover: "hover:bg-violet-50/60",
  },
};

export function formatDue(dateStr: string) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export type TaskUpdateFormHandle = {
  stopCamera: () => void;
};

/* ── Inline form: pick action comment, capture photo if completing, submit ─ */
export const TaskUpdateForm = forwardRef<
  TaskUpdateFormHandle,
  {
    task: Task;
    onSaved: () => void;
    onCancel?: () => void;
  }
>(function TaskUpdateForm({ task, onSaved, onCancel }, ref) {
  const qc = useQueryClient();
  const [actionComment, setActionComment] = useState(task.actionComment || "");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isCompleting = actionComment === "Task Completed";
  const canSubmit = actionComment && !!photoFile;

  // Stop the camera stream whenever this form unmounts, regardless of how it closed.
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const CAMERA_ERROR_MESSAGES: Record<string, string> = {
    NotAllowedError:
      "Camera access is blocked. Enable it for this site in your browser's settings, then try again.",
    NotFoundError: "No camera was found on this device.",
    NotReadableError: "The camera is already in use by another app. Close it and try again.",
    OverconstrainedError: "This device's camera doesn't support the requested mode.",
    SecurityError: "Camera access requires a secure (HTTPS) connection.",
  };

  // Mobile always uses the OS camera app (native, permission-reliable);
  // desktop keeps the in-page live camera preview.
  function handleOpenCapture() {
    if (isMobileDevice()) {
      fileInputRef.current?.click();
      return;
    }
    openCamera();
  }

  async function openCamera() {
    setCameraError("");
    if (typeof window !== "undefined" && !window.isSecureContext) {
      setCameraError(
        "Camera access requires a secure (HTTPS) connection — open this page via its https:// link.",
      );
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      setCameraOpen(true);
    } catch (err) {
      const name = err instanceof DOMException ? err.name : "";
      setCameraError(CAMERA_ERROR_MESSAGES[name] ?? "Could not access the camera in this browser.");
      toast.error("Could not access the camera.");
    }
  }

  function handleFileCapture(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    setCameraError("");
  }

  useEffect(() => {
    if (cameraOpen && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [cameraOpen]);

  function closeCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraOpen(false);
  }

  // Lets the parent modal force the camera off immediately on backdrop/X close,
  // instead of waiting for the exit-animation-delayed unmount.
  useImperativeHandle(ref, () => ({ stopCamera: closeCamera }));

  function capturePhoto() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        setPhotoFile(new File([blob], `task-photo-${Date.now()}.jpg`, { type: "image/jpeg" }));
        setPhotoPreview(URL.createObjectURL(blob));
        closeCamera();
      },
      "image/jpeg",
      0.9,
    );
  }

  async function handleSubmit() {
    if (!canSubmit) return;
    closeCamera();
    setBusy(true);
    try {
      let photoUrl = task.photoUrl;
      if (photoFile) {
        photoUrl = await uploadCustomerDoc(
          task.customerId,
          "tasks",
          `${task.id}-${Date.now()}.jpg`,
          photoFile,
        );
      }
      await submitTaskAction(task.id, {
        actionComment,
        photoUrl,
        status: isCompleting ? "Completed" : "Pending",
      });

      // Completing a Net-Meter Start task auto-advances the customer's net metering stage.
      if (isCompleting && task.taskType === "Net-Meter Start") {
        const advanced = await tryAdvanceMeterInstallStage(task.customerId, task.assigneeName);
        if (advanced) qc.invalidateQueries({ queryKey: ["net-metering"] });
      }

      toast.success(isCompleting ? "Task marked completed" : "Task updated");
      onSaved();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update task.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Action taken / comment */}
      <div>
        <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          <MessageSquare className="h-3.5 w-3.5" /> Action Taken / Comment
        </label>
        <CrmSelect
          value={actionComment}
          onValueChange={(v) => {
            setActionComment(v);
            setPhotoFile(null);
            setPhotoPreview("");
          }}
          options={ACTION_COMMENTS.map((c) => ({ value: c, label: c }))}
          placeholder="Select action taken…"
        />
      </div>

      {/* Photo capture — live camera only, never the device gallery */}
      {actionComment && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <label className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <Camera className="h-3.5 w-3.5" /> Photo Proof
            </label>
            <span className="rounded-full bg-primary-soft px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
              Required
            </span>
          </div>

          <div className="mx-auto w-full max-w-sm">
            {cameraOpen ? (
              <div className="space-y-3">
                <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border-2 border-primary/30 bg-black shadow-card">
                  <video
                    ref={videoRef}
                    playsInline
                    muted
                    className="block h-full w-full object-cover"
                  />
                  <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-black/50 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur-sm">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" /> LIVE
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={capturePhoto}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl gradient-primary py-3 text-sm font-bold text-white shadow-glow transition hover:opacity-95 active:scale-[0.98]"
                  >
                    <Aperture className="h-4 w-4" /> Capture
                  </button>
                  <button
                    type="button"
                    onClick={closeCamera}
                    className="rounded-xl border bg-card px-5 py-3 text-sm font-semibold text-muted-foreground hover:bg-muted transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : photoPreview ? (
              <div className="space-y-3">
                <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border-2 border-primary/30 bg-black shadow-card">
                  <img
                    src={photoPreview}
                    alt="Captured proof"
                    className="block h-full w-full object-cover"
                  />
                  <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-[oklch(0.55_0.15_145)]/90 px-2.5 py-1 text-[10px] font-bold text-white">
                    <CheckCircle2 className="h-3 w-3" /> Captured
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleOpenCapture}
                  className="w-full rounded-xl border bg-card py-2.5 text-sm font-semibold text-muted-foreground hover:bg-muted transition-colors"
                >
                  Retake Photo
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleOpenCapture}
                className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-muted-foreground/25 bg-muted/20 text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary-soft/40"
              >
                <div className="grid h-14 w-14 place-items-center rounded-full bg-primary-soft">
                  <Camera className="h-6 w-6 text-primary" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-foreground">Tap to open camera</p>
                  <p className="mt-0.5 px-6 text-[11px] text-muted-foreground">
                    Live capture only — gallery uploads aren't allowed
                  </p>
                </div>
              </button>
            )}
          </div>

          {isMobileDevice() && (
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFileCapture}
            />
          )}

          {cameraError && (
            <p className="mx-auto mt-2 max-w-sm text-center text-[11px] text-red-500">
              {cameraError}
            </p>
          )}
          {!photoFile && !cameraOpen && (
            <p className="mx-auto mt-2 max-w-sm text-center text-[11px] text-red-500">
              A photo is required to save this update.
            </p>
          )}
        </div>
      )}

      <div className="flex gap-3 pt-1">
        <button
          type="button"
          disabled={!canSubmit || busy}
          onClick={handleSubmit}
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl gradient-primary py-3 text-sm font-bold text-white shadow-glow transition hover:opacity-95 active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle2 className="h-4 w-4" />
          )}
          {busy ? "Saving…" : isCompleting ? "Complete Task" : "Save Update"}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={() => {
              closeCamera();
              onCancel();
            }}
            className="rounded-xl border bg-card px-5 py-3 text-sm font-semibold text-muted-foreground hover:bg-muted transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
});

/* ── Modal wrapper around TaskUpdateForm, used for quick inline updates ──── */
export function TaskActionModal({
  task,
  onClose,
  onSaved,
}: {
  task: Task;
  onClose: () => void;
  onSaved: () => void;
}) {
  const formRef = useRef<TaskUpdateFormHandle>(null);

  function handleClose() {
    formRef.current?.stopCamera();
    onClose();
  }

  return (
    <>
      <motion.div
        key="ta-bg"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
        onClick={handleClose}
      />
      <motion.div
        key="ta-modal"
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        transition={{ duration: 0.22 }}
        className="fixed inset-x-4 top-1/2 z-50 mx-auto flex max-h-[90vh] max-w-md -translate-y-1/2 flex-col overflow-hidden rounded-2xl border bg-card shadow-2xl"
      >
        <div className="flex shrink-0 items-center justify-between border-b px-5 py-4">
          <div>
            <p className="text-sm font-bold">Update Task</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {task.customerName} ·{" "}
              {task.taskType === "Other GEB Task"
                ? task.taskTypeOther || task.taskType
                : task.taskType}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-5">
          <TaskUpdateForm
            ref={formRef}
            task={task}
            onSaved={() => {
              onSaved();
              onClose();
            }}
            onCancel={handleClose}
          />
        </div>
      </motion.div>
    </>
  );
}

/* ── Read-only view of a single task-history entry ────────────────────── */
function HistoryDetailModal({
  entry,
  onClose,
  onViewPhoto,
}: {
  entry: TaskHistoryEntry;
  onClose: () => void;
  onViewPhoto: (url: string) => void;
}) {
  const meta = BUCKET_META[entry.status === "Completed" ? "completed" : "pending"];
  return (
    <>
      <motion.div
        key="hd-bg"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        key="hd-modal"
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        transition={{ duration: 0.22 }}
        className="fixed inset-x-4 top-1/2 z-50 mx-auto flex max-h-[90vh] max-w-md -translate-y-1/2 flex-col overflow-hidden rounded-2xl border bg-card shadow-2xl"
      >
        <div className="flex shrink-0 items-center justify-between border-b px-5 py-4">
          <div>
            <p className="text-sm font-bold">Task History Entry</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {formatDateTime(entry.createdAt)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto px-5 py-5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Status
              </p>
              <Badge
                className={`${meta.badge} mt-1 font-semibold text-xs px-2.5 py-0.5 rounded-full`}
              >
                {entry.status}
              </Badge>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Date & Time
              </p>
              <p className="mt-0.5 text-sm font-semibold">{formatDateTime(entry.createdAt)}</p>
            </div>
          </div>

          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Action Taken
            </p>
            <p className="mt-0.5 text-sm">{entry.actionComment || "—"}</p>
          </div>

          <div>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Photo Proof
            </p>
            {entry.photoUrl ? (
              <button
                type="button"
                onClick={() => onViewPhoto(entry.photoUrl)}
                className="block w-full"
              >
                <img
                  src={entry.photoUrl}
                  alt="Update proof"
                  className="block aspect-[4/3] w-full rounded-xl border object-cover"
                />
              </button>
            ) : (
              <div className="flex aspect-[4/3] flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed text-muted-foreground">
                <ImageOff className="h-6 w-6" />
                <span className="text-xs">No photo was attached</span>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </>
  );
}

/* ── Status + history for one task, reused by both the field-staff and admin task detail pages ── */
export function TaskStatusHistory({
  task,
  onUpdated,
  showUpdateStatus = true,
}: {
  task: Task;
  onUpdated: () => void;
  showUpdateStatus?: boolean;
}) {
  const qc = useQueryClient();
  const [showUpdate, setShowUpdate] = useState(false);
  const [selectedHistory, setSelectedHistory] = useState<TaskHistoryEntry | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);

  const { data: history = [], isLoading: historyLoading } = useQuery({
    queryKey: ["task-history", task.id],
    queryFn: () => fetchTaskHistory(task.id),
    staleTime: 30 * 1000,
  });

  function handleSaved() {
    qc.invalidateQueries({ queryKey: ["task-history", task.id] });
    qc.invalidateQueries({ queryKey: ["tasks"] });
    onUpdated();
  }

  const bucket = bucketOf(task);
  const meta = BUCKET_META[bucket];

  return (
    <>
      {/* Update status */}
      {showUpdateStatus && (
        <div className="rounded-2xl border bg-card shadow-card overflow-hidden">
          <div className="gradient-primary flex items-center gap-2 px-4 py-3">
            <PencilLine className="h-4 w-4 text-white" />
            <h3 className="flex-1 text-[11px] font-bold uppercase tracking-wider text-white">
              Update Status
            </h3>
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  {["Due Date", "Last Action", "Status", "Action"].map((h) => (
                    <th
                      key={h}
                      className={`px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground ${h === "Action" ? "text-right" : ""}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr
                  onClick={() => task.status !== "Completed" && setShowUpdate(true)}
                  className={`transition-colors ${meta.rowHover} ${task.status !== "Completed" ? "cursor-pointer" : ""}`}
                >
                  <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                    {formatDue(task.dueDate)}
                  </td>
                  <td className="px-4 py-3 font-medium">{task.actionComment || "—"}</td>
                  <td className="px-4 py-3">
                    <Badge
                      className={`${meta.badge} font-semibold text-xs px-2.5 py-0.5 rounded-full`}
                    >
                      {meta.label}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {task.status !== "Completed" ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowUpdate(true);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-xl gradient-primary px-3.5 py-2 text-xs font-bold text-white shadow-glow transition hover:opacity-95 active:scale-[0.98]"
                      >
                        <PencilLine className="h-3.5 w-3.5" /> Update
                      </button>
                    ) : (
                      <span className="text-[11px] text-muted-foreground">Done</span>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Mobile card — same data as the table above, stacked instead of scrolled */}
          <div
            onClick={() => task.status !== "Completed" && setShowUpdate(true)}
            className={`p-4 transition-colors md:hidden ${meta.rowHover} ${task.status !== "Completed" ? "cursor-pointer" : ""}`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-muted-foreground">Due {formatDue(task.dueDate)}</span>
              <Badge className={`${meta.badge} font-semibold text-xs px-2.5 py-0.5 rounded-full`}>
                {meta.label}
              </Badge>
            </div>
            <p className="mt-1.5 font-medium">{task.actionComment || "—"}</p>
            <div className="mt-2">
              {task.status !== "Completed" ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowUpdate(true);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl gradient-primary px-3.5 py-2 text-xs font-bold text-white shadow-glow transition hover:opacity-95 active:scale-[0.98]"
                >
                  <PencilLine className="h-3.5 w-3.5" /> Update
                </button>
              ) : (
                <span className="text-[11px] text-muted-foreground">Done</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Task history */}
      <div className="rounded-2xl border bg-card shadow-card overflow-hidden">
        <div className="gradient-primary flex items-center gap-2 px-4 py-3">
          <History className="h-4 w-4 text-white" />
          <h3 className="flex-1 text-[11px] font-bold uppercase tracking-wider text-white">
            Task History
          </h3>
          <span className="rounded-full bg-black/20 px-2 py-0.5 text-[11px] font-bold text-white">
            {history.length}
          </span>
        </div>

        {historyLoading ? (
          <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
            Loading…
          </div>
        ) : history.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16">
            <History className="h-8 w-8 text-muted-foreground/30" />
            <p className="text-xs text-muted-foreground/60">No updates recorded yet</p>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    {["Date & Time", "Action Taken", "Status", "Photo"].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {history.map((entry) => {
                    const entryMeta =
                      BUCKET_META[entry.status === "Completed" ? "completed" : "pending"];
                    return (
                      <tr
                        key={entry.id}
                        onClick={() => setSelectedHistory(entry)}
                        className={`cursor-pointer transition-colors ${entryMeta.rowHover}`}
                      >
                        <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                          {formatDateTime(entry.createdAt)}
                        </td>
                        <td className="px-4 py-3 font-medium">{entry.actionComment || "—"}</td>
                        <td className="px-4 py-3">
                          <Badge
                            className={`${entryMeta.badge} font-semibold text-xs px-2.5 py-0.5 rounded-full`}
                          >
                            {entry.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          {entry.photoUrl ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setLightbox(entry.photoUrl);
                              }}
                            >
                              <img
                                src={entry.photoUrl}
                                alt="Update proof"
                                className="h-10 w-10 rounded-lg border object-cover hover:opacity-80 transition-opacity"
                              />
                            </button>
                          ) : (
                            <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-dashed text-muted-foreground/40">
                              <ImageOff className="h-4 w-4" />
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile card list — same data as the table above, stacked instead of scrolled */}
            <div className="divide-y divide-border/50 md:hidden">
              {history.map((entry) => {
                const entryMeta =
                  BUCKET_META[entry.status === "Completed" ? "completed" : "pending"];
                return (
                  <div
                    key={entry.id}
                    onClick={() => setSelectedHistory(entry)}
                    className={`flex items-center justify-between gap-3 p-4 transition-colors ${entryMeta.rowHover} cursor-pointer`}
                  >
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(entry.createdAt)}
                      </p>
                      <p className="mt-0.5 truncate font-medium">{entry.actionComment || "—"}</p>
                      <Badge
                        className={`${entryMeta.badge} mt-1 font-semibold text-xs px-2.5 py-0.5 rounded-full`}
                      >
                        {entry.status}
                      </Badge>
                    </div>
                    {entry.photoUrl ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setLightbox(entry.photoUrl);
                        }}
                        className="shrink-0"
                      >
                        <img
                          src={entry.photoUrl}
                          alt="Update proof"
                          className="h-12 w-12 rounded-lg border object-cover hover:opacity-80 transition-opacity"
                        />
                      </button>
                    ) : (
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-dashed text-muted-foreground/40">
                        <ImageOff className="h-4 w-4" />
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Photo lightbox */}
      <AnimatePresence>
        {lightbox && (
          <>
            <motion.div
              key="lb-bg"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm"
              onClick={() => setLightbox(null)}
            />
            <motion.div
              key="lb-img"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-x-4 top-1/2 z-[60] mx-auto max-w-lg -translate-y-1/2"
            >
              <button
                onClick={() => setLightbox(null)}
                className="absolute -top-10 right-0 grid h-8 w-8 place-items-center rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
              <img
                src={lightbox}
                alt="Task photo"
                className="w-full rounded-2xl border border-white/10 object-contain"
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Update status modal */}
      <AnimatePresence>
        {showUpdate && (
          <TaskActionModal task={task} onClose={() => setShowUpdate(false)} onSaved={handleSaved} />
        )}
      </AnimatePresence>

      {/* Task history entry detail modal */}
      <AnimatePresence>
        {selectedHistory && (
          <HistoryDetailModal
            entry={selectedHistory}
            onClose={() => setSelectedHistory(null)}
            onViewPhoto={setLightbox}
          />
        )}
      </AnimatePresence>
    </>
  );
}

/* ── Filter tiles + task table, reused by the all-tasks & per-customer pages ── */
export function FieldTaskBoard({
  tasks,
  isLoading,
  tableTitle = "Tasks",
  onRowClick,
}: {
  tasks: Task[];
  isLoading: boolean;
  tableTitle?: string;
  onRowClick?: (task: Task) => void;
}) {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<Bucket>("all");
  const [actionFor, setActionFor] = useState<Task | null>(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const refresh = () => qc.invalidateQueries({ queryKey: ["tasks"] });

  const counts: Record<Exclude<Bucket, "all">, number> = {
    pending: 0,
    overdue: 0,
    completed: 0,
    future: 0,
  };
  tasks.forEach((t) => counts[bucketOf(t)]++);

  const visibleTasks = filter === "all" ? tasks : tasks.filter((t) => bucketOf(t) === filter);

  const totalPages = Math.max(1, Math.ceil(visibleTasks.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedTasks = visibleTasks.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [filter]);

  function handleRowClick(task: Task) {
    if (onRowClick) {
      onRowClick(task);
      return;
    }
    if (task.status !== "Completed") setActionFor(task);
  }

  return (
    <>
      {/* Filter tiles */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {(Object.keys(BUCKET_META) as Exclude<Bucket, "all">[]).map((key, i) => {
          const meta = BUCKET_META[key];
          const Icon = meta.icon;
          const active = filter === key;
          return (
            <motion.button
              key={key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => setFilter(active ? "all" : key)}
              className={`rounded-2xl border p-5 text-left shadow-card transition-all ${
                active ? "bg-card ring-2 ring-primary border-primary" : "bg-card hover:shadow-md"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
                <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {meta.label}
                </div>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <Icon className="h-5 w-5 text-muted-foreground/70" />
                <span className="text-2xl font-bold">{counts[key]}</span>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Task list */}
      <div className="rounded-2xl border bg-card shadow-card overflow-hidden">
        <div className="gradient-primary flex items-center gap-2 px-4 py-3">
          <ClipboardList className="h-4 w-4 text-white" />
          <h3 className="flex-1 text-[11px] font-bold uppercase tracking-wider text-white">
            {filter === "all" ? tableTitle : BUCKET_META[filter].label}
          </h3>
          <span className="rounded-full bg-black/20 px-2 py-0.5 text-[11px] font-bold text-white">
            {visibleTasks.length}
          </span>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
            Loading…
          </div>
        ) : visibleTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16">
            <ClipboardList className="h-8 w-8 text-muted-foreground/30" />
            <p className="text-xs text-muted-foreground/60">No tasks in this list</p>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    {["Customer", "Task", "Due Date", "Status", "Action"].map((h) => (
                      <th
                        key={h}
                        className={`px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground ${h === "Action" ? "text-right" : ""}`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  <AnimatePresence>
                    {pagedTasks.map((task) => {
                      const bucket = bucketOf(task);
                      const meta = BUCKET_META[bucket];
                      const clickable = !!onRowClick || task.status !== "Completed";
                      return (
                        <motion.tr
                          key={task.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          onClick={() => handleRowClick(task)}
                          className={`transition-colors ${meta.rowHover} ${clickable ? "cursor-pointer" : ""}`}
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary-soft text-[12px] font-bold text-primary">
                                {task.customerName.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-semibold leading-snug">{task.customerName}</p>
                                <p className="text-[11px] text-muted-foreground">
                                  {task.customerId}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-medium leading-snug">
                              {task.taskType === "Other GEB Task"
                                ? task.taskTypeOther || task.taskType
                                : task.taskType}
                            </p>
                            {task.actionComment && (
                              <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">
                                {task.actionComment}
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="flex items-center gap-1.5 text-muted-foreground">
                              <Briefcase className="h-3 w-3 shrink-0" /> {formatDue(task.dueDate)}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <Badge
                              className={`${meta.badge} font-semibold text-xs px-2.5 py-0.5 rounded-full`}
                            >
                              {meta.label}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-right">
                            {task.status !== "Completed" ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRowClick(task);
                                }}
                                className="inline-flex items-center gap-1.5 rounded-xl gradient-primary px-3.5 py-2 text-xs font-bold text-white shadow-glow transition hover:opacity-95 active:scale-[0.98]"
                              >
                                <MessageSquare className="h-3.5 w-3.5" /> Update
                              </button>
                            ) : onRowClick ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRowClick(task);
                                }}
                                className="inline-flex items-center gap-1.5 rounded-xl border bg-card px-3.5 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted transition-colors"
                              >
                                View
                              </button>
                            ) : (
                              <span className="text-[11px] text-muted-foreground">Done</span>
                            )}
                          </td>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>

            {/* Mobile card list — same data as the table above, stacked instead of scrolled */}
            <div className="divide-y divide-border/50 md:hidden">
              <AnimatePresence>
                {pagedTasks.map((task) => {
                  const bucket = bucketOf(task);
                  const meta = BUCKET_META[bucket];
                  const clickable = !!onRowClick || task.status !== "Completed";
                  return (
                    <motion.div
                      key={task.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => handleRowClick(task)}
                      className={`p-4 transition-colors ${meta.rowHover} ${clickable ? "cursor-pointer" : ""}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary-soft text-[12px] font-bold text-primary">
                            {task.customerName.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-semibold leading-snug">
                              {task.customerName}
                            </p>
                            <p className="text-[11px] text-muted-foreground">{task.customerId}</p>
                          </div>
                        </div>
                        <Badge
                          className={`shrink-0 ${meta.badge} font-semibold text-xs px-2.5 py-0.5 rounded-full`}
                        >
                          {meta.label}
                        </Badge>
                      </div>

                      <p className="mt-2 truncate font-medium leading-snug">
                        {task.taskType === "Other GEB Task"
                          ? task.taskTypeOther || task.taskType
                          : task.taskType}
                      </p>

                      <div className="mt-1 flex items-center justify-between gap-2">
                        <span className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                          <Briefcase className="h-3 w-3 shrink-0" /> {formatDue(task.dueDate)}
                        </span>
                        {task.status !== "Completed" ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRowClick(task);
                            }}
                            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl gradient-primary px-3.5 py-2 text-xs font-bold text-white shadow-glow transition hover:opacity-95 active:scale-[0.98]"
                          >
                            <MessageSquare className="h-3.5 w-3.5" /> Update
                          </button>
                        ) : onRowClick ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRowClick(task);
                            }}
                            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border bg-card px-3.5 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted transition-colors"
                          >
                            View
                          </button>
                        ) : (
                          <span className="text-[11px] text-muted-foreground">Done</span>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </>
        )}

        {!isLoading && totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-4 py-3">
            <p className="text-[11px] text-muted-foreground">
              Page {currentPage} of {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="inline-flex items-center gap-1 rounded-lg border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-40"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Prev
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="inline-flex items-center gap-1 rounded-lg border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-40"
              >
                Next <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {!onRowClick && (
        <AnimatePresence>
          {actionFor && (
            <TaskActionModal
              task={actionFor}
              onClose={() => setActionFor(null)}
              onSaved={refresh}
            />
          )}
        </AnimatePresence>
      )}
    </>
  );
}
