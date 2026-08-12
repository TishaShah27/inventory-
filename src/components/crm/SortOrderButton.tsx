import { ArrowUpDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

export type SortOrder = "latest" | "oldest";

const LABEL: Record<SortOrder, string> = {
  latest: "Latest First",
  oldest: "Oldest First",
};

/** Standalone Latest/Oldest sort control for a kanban board's toolbar. Defaults to "latest". */
export function SortOrderButton({
  value,
  onChange,
}: {
  value: SortOrder;
  onChange: (v: SortOrder) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={`inline-flex h-10 items-center gap-2 rounded-lg border px-3.5 text-sm font-medium transition-colors ${
            value === "oldest"
              ? "bg-primary-soft text-primary border-primary/30"
              : "bg-card hover:bg-muted"
          }`}
        >
          <ArrowUpDown className="h-4 w-4" /> {LABEL[value]}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onChange("latest")}>Latest First</DropdownMenuItem>
        <DropdownMenuItem onClick={() => onChange("oldest")}>Oldest First</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
