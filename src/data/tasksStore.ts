export const SERVICE_TASK_TYPES = [
  "Generation issue",
  "Inverter fault",
  "Structure issue",
  "Earthing fault",
] as const;

export const ACTION_TASK_TYPES = [
  "Net-Meter Start",
  "Wifi Configuration",
  "Payment Collection",
  "Customer File Delivery",
  "Site Visit",
  "SR Generation",
  "Inspection Approval",
  "Other GEB Task",
] as const;

export const TASK_TYPES = [...SERVICE_TASK_TYPES, ...ACTION_TASK_TYPES] as const;

export type TaskType = (typeof TASK_TYPES)[number];

export const TASK_STATUSES = ["Pending", "Completed"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

// Action-taken options a field staff member picks when working a task.
// "Task Completed" requires a camera photo before the task can be marked done.
export const ACTION_COMMENTS = [
  "Task Completed",
  "Customer Not Available",
  "Site Not Accessible",
  "Material Pending",
  "Rescheduled by Customer",
  "Other",
] as const;
export type ActionComment = (typeof ACTION_COMMENTS)[number];

export type Task = {
  id: string;
  customerId: string;
  customerName: string;
  taskType: TaskType;
  taskTypeOther: string;
  dueDate: string;
  comment: string;
  assigneeId: string;
  assigneeName: string;
  status: TaskStatus;
  actionComment: string;
  photoUrl: string;
  createdAt: string;
  completedAt: string;
};

export type TaskHistoryEntry = {
  id: string;
  taskId: string;
  actionComment: string;
  photoUrl: string;
  status: TaskStatus;
  createdAt: string;
};
