export type Customer = {
  id: number;
  customerId: string;
  // Core
  name: string; phone: string; email: string;
  capacity: string; city: string; since: string;
  paid: string; status: string; type: string; notes: string;
  customerType?: "New" | "Old";
  // Extended contact
  consumerNo?: string; source?: string; finance?: string; scheme?: string;
  aadhaarCard?: string; address?: string; pincode?: string;
  latitude?: string; longitude?: string;
  // System
  wp?: string; numPanels?: string; panelBrand?: string;
  inverterBrand?: string; inverterKw?: string; singlePhase?: boolean;
  dcCapacity?: string;
  warrantyStartDate?: string; warrantyEndDate?: string;
  pdcFacilityGiven?: "Yes" | "No";
  tag?: string;
  // DISCOM
  discom?: string; circle?: string; division?: string; subDivision?: string;
  // Auth
  password?: string;
};

export const customersStore: Customer[] = [];

export function getNextId()     { return 0; }
export function getNextCustId() { return ""; }
