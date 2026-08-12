export const INSTALLATION_STAGES = [
  "Material Upload",
  "Structure Fabrication",
  "Panel Mounting",
  "AC Wiring",
  "DC Wiring",
] as const;

export type InstallationStage = (typeof INSTALLATION_STAGES)[number];

export type InstallationCard = {
  customerId: string;
  customerName: string;
  phone: string;
  city: string;
  capacity: string;
  since: string;
  source?: string;
  finance?: string;
  paid?: string;
  panelBrand?: string;
  wp?: string;
  numPanels?: string;
  inverterBrand?: string;
  inverterKw?: string;
  pdcFacilityGiven?: "Yes" | "No";
};
