import { useMemo, useState } from "react";
import { type Customer } from "@/data/customersStore";
import {
  type CustomerFilters,
  countActiveFilters,
  customerMatchesFilters,
  emptyCustomerFilters,
} from "@/lib/customerFilters";

export function useCustomerFilters<T extends Customer>(rows: T[]) {
  const [filters, setFilters] = useState<CustomerFilters>({ ...emptyCustomerFilters });
  const [filterOpen, setFilterOpen] = useState(false);

  const activeFilterCount = countActiveFilters(filters);

  const filteredRows = useMemo(
    () => rows.filter((r) => customerMatchesFilters(r, filters)),
    [rows, filters],
  );

  return { filters, setFilters, filterOpen, setFilterOpen, activeFilterCount, filteredRows };
}
