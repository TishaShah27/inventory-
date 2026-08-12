import { supabase } from "./supabase";
import type { Task, TaskType, TaskStatus, TaskHistoryEntry } from "@/data/tasksStore";

function historyFromDB(row: Record<string, unknown>): TaskHistoryEntry {
  return {
    id: row.id as string,
    taskId: row.task_id as string,
    actionComment: (row.action_comment as string) ?? "",
    photoUrl: (row.photo_url as string) ?? "",
    status: row.status as TaskStatus,
    createdAt: row.created_at as string,
  };
}

function fromDB(row: Record<string, unknown>): Task {
  return {
    id: row.id as string,
    customerId: row.customer_id as string,
    customerName: row.customer_name as string,
    taskType: row.task_type as TaskType,
    taskTypeOther: (row.task_type_other as string) ?? "",
    dueDate: row.due_date as string,
    comment: (row.comment as string) ?? "",
    assigneeId: row.assignee_id as string,
    assigneeName: row.assignee_name as string,
    status: row.status as TaskStatus,
    actionComment: (row.action_comment as string) ?? "",
    photoUrl: (row.photo_url as string) ?? "",
    createdAt: row.created_at as string,
    completedAt: (row.completed_at as string) ?? "",
  };
}

export async function fetchTasks(): Promise<Task[]> {
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(fromDB);
}

export async function addTask(input: {
  customerId: string;
  customerName: string;
  taskType: TaskType;
  taskTypeOther: string;
  dueDate: string;
  comment: string;
  assigneeId: string;
  assigneeName: string;
}): Promise<string> {
  const { data, error } = await supabase
    .from("tasks")
    .insert({
      customer_id: input.customerId,
      customer_name: input.customerName,
      task_type: input.taskType,
      task_type_other: input.taskTypeOther || null,
      due_date: input.dueDate,
      comment: input.comment || null,
      assignee_id: input.assigneeId,
      assignee_name: input.assigneeName,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data.id as string;
}

export async function updateTaskStatus(id: string, status: TaskStatus): Promise<void> {
  const { error } = await supabase.from("tasks").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function submitTaskAction(
  id: string,
  input: {
    actionComment: string;
    photoUrl: string;
    status: TaskStatus;
  },
): Promise<void> {
  const { error } = await supabase
    .from("tasks")
    .update({
      action_comment: input.actionComment,
      photo_url: input.photoUrl || null,
      status: input.status,
      completed_at: input.status === "Completed" ? new Date().toISOString() : null,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);

  const { error: historyError } = await supabase.from("task_history").insert({
    task_id: id,
    action_comment: input.actionComment,
    photo_url: input.photoUrl || null,
    status: input.status,
  });
  if (historyError) throw new Error(historyError.message);
}

export async function fetchTaskHistory(taskId: string): Promise<TaskHistoryEntry[]> {
  const { data, error } = await supabase
    .from("task_history")
    .select("*")
    .eq("task_id", taskId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(historyFromDB);
}

export async function fetchTaskById(id: string): Promise<Task | null> {
  const { data, error } = await supabase.from("tasks").select("*").eq("id", id).single();
  if (error || !data) return null;
  return fromDB(data);
}

export async function deleteTask(id: string): Promise<void> {
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
