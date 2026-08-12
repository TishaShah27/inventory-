/* ── Types ─────────────────────────────────────────────────────────────── */
export type Master = { id: string; name: string; unit: string };
export type Group = { id: string; masterId: string; name: string };
export type Category = { id: string; groupId: string; name: string };
export type Subcategory = {
  id: string;
  categoryId: string;
  name: string;
  stock: number;
  godownStock: number;
};
export type MovType = "in" | "out";
export type Movement = {
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

export type InwardEntry = {
  id: string;
  inwardId: string;
  entryType: string;
  invoiceDate: string;
  materialReceivedDate: string;
  billNumber: string;
  supplier: string;
  supplierType: "b2b" | "b2i";
  subcategoryId: string;
  qty: number;
  gstPct: number;
  price: number;
  serialNos: string[];
};

export type InstallerPartnerStock = {
  id: string;
  installerPartnerId: string;
  installerPartnerName: string;
  subcategoryId: string;
  qty: number;
};

export type OutwardEntry = {
  id: string;
  challanDate: string;
  billNumber: string;
  concernedPerson: string;
  deliveryTo: string;
  b2bCompanyName?: string;
  customerAddress: string;
  deliveryCity: string;
  gstDetails: string;
  driverName: string;
  driverContact: string;
  remarks: string;
  vehicleNo: string;
  deliveryContact: string;
  subcategoryId: string;
  qty: number;
  serialNos: string[];
};
export type InstallerType = "WIREMAN" | "FABRICATOR";

export type B2bPartner = {
  id: string;
  companyName: string;
  gstin: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  contact: string;
  installerType?: InstallerType;
};

/* ── Helpers ────────────────────────────────────────────────────────────── */
function uid() {
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

let _inwardSeq = 1620;
export function nextInwardId() {
  return `IN/${_inwardSeq++}`;
}
export function setInwardSeq(n: number) {
  if (n > _inwardSeq) _inwardSeq = n;
}

/* ── Seed data ──────────────────────────────────────────────────────────── */
const SEED_MASTERS: Master[] = [
  { id: "1", name: "SOLAR PANEL", unit: "NOS" },
  { id: "2", name: "SOLAR INVERTER", unit: "NOS" },
  { id: "3", name: "CABLE", unit: "MTR" },
  { id: "4", name: "ELECTRICAL ACCESSORIES", unit: "NOS" },
  { id: "5", name: "STRUCTURE ACCESSORIES", unit: "NOS" },
];

const SEED_GROUPS: Group[] = [
  // SOLAR PANEL
  { id: "1", masterId: "1", name: "WAAREE" },
  { id: "2", masterId: "1", name: "ADANI" },
  { id: "3", masterId: "1", name: "RAYZON" },
  // SOLAR INVERTER
  { id: "4", masterId: "2", name: "WAAREE" },
  { id: "5", masterId: "2", name: "SUNWAYS" },
  { id: "6", masterId: "2", name: "MINDRA" },
  // CABLE
  { id: "7", masterId: "3", name: "POLYCAB" },
  { id: "8", masterId: "3", name: "WAACAB" },
  { id: "9", masterId: "3", name: "GENOME" },
  // ELECTRICAL ACCESSORIES
  { id: "10", masterId: "4", name: "DISTRIBUTION BOX" },
  { id: "11", masterId: "4", name: "CONDUIT PIPE" },
  { id: "12", masterId: "4", name: "ELBOW" },
  { id: "13", masterId: "4", name: "TEE" },
  { id: "14", masterId: "4", name: "C-CLIP" },
  { id: "15", masterId: "4", name: "LUG" },
  { id: "16", masterId: "4", name: "CABLE TIE" },
  // STRUCTURE ACCESSORIES
  { id: "17", masterId: "5", name: "HDGI BOX PIPE" },
  { id: "18", masterId: "5", name: "OTHERS" },
];

const SEED_CATS: Category[] = [
  // WAAREE solar panel
  { id: "1", groupId: "1", name: "540wp" },
  { id: "2", groupId: "1", name: "545wp" },
  { id: "3", groupId: "1", name: "575wp" },
  { id: "4", groupId: "1", name: "580wp" },
  // ADANI solar panel
  { id: "5", groupId: "2", name: "540wp" },
  { id: "6", groupId: "2", name: "545wp" },
  { id: "7", groupId: "2", name: "555wp" },
  { id: "8", groupId: "2", name: "560wp" },
  { id: "9", groupId: "2", name: "565wp" },
  { id: "10", groupId: "2", name: "570wp" },
  { id: "11", groupId: "2", name: "575wp" },
  // RAYZON solar panel
  { id: "12", groupId: "3", name: "545wp" },
  // WAAREE inverter
  { id: "13", groupId: "4", name: "3.3kW" },
  { id: "14", groupId: "4", name: "4.6kW" },
  { id: "15", groupId: "4", name: "5kW" },
  { id: "16", groupId: "4", name: "6kW" },
  { id: "17", groupId: "4", name: "8kW" },
  { id: "18", groupId: "4", name: "10kW" },
  // SUNWAYS inverter
  { id: "19", groupId: "5", name: "3.3kW" },
  { id: "20", groupId: "5", name: "4.2kW" },
  { id: "21", groupId: "5", name: "5kW" },
  { id: "22", groupId: "5", name: "6kW" },
  { id: "23", groupId: "5", name: "10kW" },
  { id: "24", groupId: "5", name: "15kW" },
  { id: "25", groupId: "5", name: "20kW" },
  // MINDRA inverter
  { id: "26", groupId: "6", name: "6kW" },
  { id: "27", groupId: "6", name: "8kW" },
  { id: "28", groupId: "6", name: "40kW" },
  { id: "29", groupId: "6", name: "100kW" },
  // POLYCAB cable
  { id: "30", groupId: "7", name: "2.5sqmm" },
  { id: "31", groupId: "7", name: "4sqmm" },
  { id: "32", groupId: "7", name: "6sqmm" },
  // WAACAB cable
  { id: "33", groupId: "8", name: "2.5sqmm" },
  { id: "34", groupId: "8", name: "4sqmm" },
  { id: "35", groupId: "8", name: "6sqmm" },
  { id: "36", groupId: "8", name: "16sqmm" },
  // GENOME cable
  { id: "37", groupId: "9", name: "16sqmm" },
  // DISTRIBUTION BOX
  { id: "38", groupId: "10", name: "1-5kW" },
  { id: "39", groupId: "10", name: "6-10kW" },
  // CONDUIT PIPE
  { id: "40", groupId: "11", name: "20mm" },
  { id: "41", groupId: "11", name: "25mm" },
  // ELBOW
  { id: "42", groupId: "12", name: "20mm" },
  { id: "43", groupId: "12", name: "25mm" },
  // TEE
  { id: "44", groupId: "13", name: "20mm" },
  { id: "45", groupId: "13", name: "25mm" },
  // C-CLIP
  { id: "46", groupId: "14", name: "20mm" },
  { id: "47", groupId: "14", name: "25mm" },
  // LUG
  { id: "48", groupId: "15", name: "2.5sqmm" },
  { id: "49", groupId: "15", name: "4sqmm" },
  { id: "50", groupId: "15", name: "6sqmm" },
  { id: "51", groupId: "15", name: "16sqmm" },
  // CABLE TIE
  { id: "52", groupId: "16", name: "NYLON" },
  // HDGI BOX PIPE
  { id: "53", groupId: "17", name: "60x40mm" },
  { id: "54", groupId: "17", name: "40x40mm" },
  // OTHERS
  { id: "55", groupId: "18", name: "BASE PLATE" },
  { id: "56", groupId: "18", name: "PAATA CHAPLA" },
  { id: "57", groupId: "18", name: "CHEMICAL GUN" },
  { id: "58", groupId: "18", name: "NOZEL" },
  { id: "59", groupId: "18", name: "ZINK SPRAY" },
  { id: "60", groupId: "18", name: "FASTNER" },
];

const z = { stock: 0, godownStock: 0 };

const SEED_SUBS: Subcategory[] = [
  // WAAREE solar panel
  { id: "1", categoryId: "1", name: "DCR-PERC-BF", ...z },
  { id: "2", categoryId: "2", name: "NDCR-PERC-MF", ...z },
  { id: "3", categoryId: "2", name: "NDCR-PERC-BF", ...z },
  { id: "4", categoryId: "3", name: "NDCR-TOPCON-BF", ...z },
  { id: "5", categoryId: "4", name: "NDCR-TOPCON-BF", ...z },
  // ADANI solar panel
  { id: "6", categoryId: "5", name: "DCR-PERC-BF", ...z },
  { id: "7", categoryId: "6", name: "DCR-PERC-BF", ...z },
  { id: "8", categoryId: "7", name: "DCR-TOPCON-BF", ...z },
  { id: "9", categoryId: "8", name: "DCR-TOPCON-BF", ...z },
  { id: "10", categoryId: "9", name: "DCR-TOPCON-BF", ...z },
  { id: "11", categoryId: "10", name: "DCR-TOPCON-BF", ...z },
  { id: "12", categoryId: "11", name: "DCR-TOPCON-BF", ...z },
  // RAYZON solar panel
  { id: "13", categoryId: "12", name: "DCR-PERC-BF", ...z },
  // WAAREE inverter
  { id: "14", categoryId: "13", name: "SINGLE-STRING", ...z },
  { id: "15", categoryId: "14", name: "DUAL-STRING", ...z },
  { id: "16", categoryId: "15", name: "DUAL-STRING", ...z },
  { id: "17", categoryId: "16", name: "DUAL-STRING", ...z },
  { id: "18", categoryId: "17", name: "DUAL-STRING", ...z },
  { id: "19", categoryId: "18", name: "DUAL-STRING", ...z },
  // SUNWAYS inverter
  { id: "20", categoryId: "19", name: "SINGLE-STRING", ...z },
  { id: "21", categoryId: "20", name: "SINGLE-STRING", ...z },
  { id: "22", categoryId: "21", name: "SINGLE-STRING", ...z },
  { id: "23", categoryId: "22", name: "SINGLE-STRING", ...z },
  { id: "24", categoryId: "23", name: "SINGLE-STRING", ...z },
  { id: "25", categoryId: "24", name: "SINGLE-STRING", ...z },
  { id: "26", categoryId: "25", name: "SINGLE-STRING", ...z },
  // MINDRA inverter
  { id: "27", categoryId: "26", name: "DUAL-STRING", ...z },
  { id: "28", categoryId: "27", name: "DUAL-STRING", ...z },
  { id: "29", categoryId: "28", name: "MULTI-STRING", ...z },
  { id: "30", categoryId: "29", name: "MULTI-STRING", ...z },
  // POLYCAB cable
  { id: "31", categoryId: "30", name: "DC-RED-BLACK", ...z },
  { id: "32", categoryId: "30", name: "AC-RED", ...z },
  { id: "33", categoryId: "30", name: "AC-BLACK", ...z },
  { id: "34", categoryId: "30", name: "AC-GREEN", ...z },
  { id: "35", categoryId: "31", name: "DC-RED-BLACK", ...z },
  { id: "36", categoryId: "31", name: "AC-RED", ...z },
  { id: "37", categoryId: "31", name: "AC-BLACK", ...z },
  { id: "38", categoryId: "31", name: "AC-GREEN", ...z },
  { id: "39", categoryId: "32", name: "DC-RED-BLACK", ...z },
  { id: "40", categoryId: "32", name: "AC-RED", ...z },
  { id: "41", categoryId: "32", name: "AC-BLACK", ...z },
  { id: "42", categoryId: "32", name: "AC-GREEN", ...z },
  // WAACAB cable
  { id: "43", categoryId: "33", name: "DC-RED-BLACK", ...z },
  { id: "44", categoryId: "33", name: "AC-RED", ...z },
  { id: "45", categoryId: "33", name: "AC-BLACK", ...z },
  { id: "46", categoryId: "33", name: "AC-GREEN", ...z },
  { id: "47", categoryId: "34", name: "DC-RED-BLACK", ...z },
  { id: "48", categoryId: "34", name: "AC-RED", ...z },
  { id: "49", categoryId: "34", name: "AC-BLACK", ...z },
  { id: "50", categoryId: "34", name: "AC-GREEN", ...z },
  { id: "51", categoryId: "35", name: "DC-RED-BLACK", ...z },
  { id: "52", categoryId: "35", name: "AC-RED", ...z },
  { id: "53", categoryId: "35", name: "AC-BLACK", ...z },
  { id: "54", categoryId: "35", name: "AC-GREEN", ...z },
  { id: "55", categoryId: "36", name: "LA-GREEN", ...z },
  // GENOME cable
  { id: "56", categoryId: "37", name: "LA-GREEN", ...z },
  // DISTRIBUTION BOX
  { id: "57", categoryId: "38", name: "ACDB", ...z },
  { id: "58", categoryId: "38", name: "DCDB", ...z },
  { id: "59", categoryId: "39", name: "ACDB", ...z },
  { id: "60", categoryId: "39", name: "DCDB", ...z },
  // CONDUIT PIPE
  { id: "61", categoryId: "40", name: "POLYCAB", ...z },
  { id: "62", categoryId: "40", name: "BLP", ...z },
  { id: "63", categoryId: "41", name: "POLYCAB", ...z },
  { id: "64", categoryId: "41", name: "BLP", ...z },
  // ELBOW
  { id: "65", categoryId: "42", name: "POLYCAB", ...z },
  { id: "66", categoryId: "42", name: "BLP", ...z },
  { id: "67", categoryId: "43", name: "POLYCAB", ...z },
  { id: "68", categoryId: "43", name: "BLP", ...z },
  // TEE
  { id: "69", categoryId: "44", name: "POLYCAB", ...z },
  { id: "70", categoryId: "44", name: "BLP", ...z },
  { id: "71", categoryId: "45", name: "POLYCAB", ...z },
  { id: "72", categoryId: "45", name: "BLP", ...z },
  // C-CLIP
  { id: "73", categoryId: "46", name: "STANDARD", ...z },
  { id: "74", categoryId: "47", name: "STANDARD", ...z },
  // LUG
  { id: "75", categoryId: "48", name: "STANDARD", ...z },
  { id: "76", categoryId: "49", name: "STANDARD", ...z },
  { id: "77", categoryId: "50", name: "STANDARD", ...z },
  { id: "78", categoryId: "51", name: "STANDARD", ...z },
  // CABLE TIE
  { id: "79", categoryId: "52", name: "STANDARD", ...z },
  // HDGI BOX PIPE
  { id: "80", categoryId: "53", name: "HINDUSTAR", ...z },
  { id: "81", categoryId: "54", name: "HINDUSTAR", ...z },
  // OTHERS
  { id: "82", categoryId: "55", name: "STANDARD", ...z },
  { id: "83", categoryId: "56", name: "STANDARD", ...z },
  { id: "84", categoryId: "57", name: "STANDARD", ...z },
  { id: "85", categoryId: "58", name: "STANDARD", ...z },
  { id: "86", categoryId: "59", name: "STANDARD", ...z },
  { id: "87", categoryId: "60", name: "STANDARD", ...z },
];

const SEED_INSTALLER: B2bPartner[] = [
  {
    id: "i1",
    companyName: "SURYATECH SOLAR INSTALLERS",
    gstin: "24AABCS1234M1ZA",
    address: "Plot 12, GIDC Estate",
    city: "Surat",
    state: "Gujarat",
    pincode: "395010",
    contact: "9876501001",
  },
  {
    id: "i2",
    companyName: "GREEN POWER SOLUTIONS",
    gstin: "08AAFCG4567N1ZP",
    address: "Jagatpura Industrial Area",
    city: "Jaipur",
    state: "Rajasthan",
    pincode: "302017",
    contact: "9876501002",
  },
  {
    id: "i3",
    companyName: "SOLAR CRAFT ENTERPRISES",
    gstin: "27AAUFS7890G1ZB",
    address: "Bhosari MIDC, Phase III",
    city: "Pune",
    state: "Maharashtra",
    pincode: "411026",
    contact: "9876501003",
  },
  {
    id: "i4",
    companyName: "BRIGHT SUN INSTALLERS",
    gstin: "24AAACB2345R1ZH",
    address: "Naroda Industrial Estate",
    city: "Ahmedabad",
    state: "Gujarat",
    pincode: "382330",
    contact: "9876501004",
  },
  {
    id: "i5",
    companyName: "PIONEER SOLAR SERVICES",
    gstin: "08AABCP6789G1ZQ",
    address: "Sitapura Industrial Area",
    city: "Jodhpur",
    state: "Rajasthan",
    pincode: "342001",
    contact: "9876501005",
  },
];

const SEED_B2B: B2bPartner[] = [
  {
    id: "b1",
    companyName: "WAAREE ENERGIES LTD",
    gstin: "24AAACW0395M1ZA",
    address: "Surat-Hazira Road, Sachin",
    city: "Surat",
    state: "Gujarat",
    pincode: "394230",
    contact: "9876500001",
  },
  {
    id: "b2",
    companyName: "ADANI SOLAR PVT LTD",
    gstin: "24AABCA8464N1ZP",
    address: "Shantigram, Near Vaishnodevi",
    city: "Ahmedabad",
    state: "Gujarat",
    pincode: "382421",
    contact: "9876500002",
  },
  {
    id: "b3",
    companyName: "SUNWAYS SOLAR INDIA",
    gstin: "27AAUFS0632G1ZB",
    address: "MIDC Phase II, Hinjewadi",
    city: "Pune",
    state: "Maharashtra",
    pincode: "411057",
    contact: "9876500003",
  },
  {
    id: "b4",
    companyName: "TATA POWER SOLAR LTD",
    gstin: "27AAACT5574R1ZH",
    address: "Bombay House, Homi Mody St",
    city: "Mumbai",
    state: "Maharashtra",
    pincode: "400001",
    contact: "9876500004",
  },
  {
    id: "b5",
    companyName: "VIKRAM SOLAR LTD",
    gstin: "19AAACV5467G1ZH",
    address: "PS Srijan Corporate Park",
    city: "Kolkata",
    state: "West Bengal",
    pincode: "700091",
    contact: "9876500005",
  },
  {
    id: "b6",
    companyName: "LUMINOUS POWER TECHNOLOGIES",
    gstin: "07AAACL0285Q1Z0",
    address: "C-block, Sector 59",
    city: "Noida",
    state: "Uttar Pradesh",
    pincode: "201301",
    contact: "9876500006",
  },
  {
    id: "b7",
    companyName: "DYNESS BATTERY TECHNOLOGY",
    gstin: "29AAFCD3501N1ZX",
    address: "Electronic City Phase 1",
    city: "Bengaluru",
    state: "Karnataka",
    pincode: "560100",
    contact: "9876500007",
  },
  {
    id: "b8",
    companyName: "MINDRA ENERGY PVT LTD",
    gstin: "08AAFCM6789K1ZL",
    address: "VKI Area, Jhotwara Road",
    city: "Jaipur",
    state: "Rajasthan",
    pincode: "302013",
    contact: "9876500008",
  },
  {
    id: "b9",
    companyName: "RAYZON SOLAR PVT LTD",
    gstin: "24AABCR8943N1ZQ",
    address: "Surat Textile Market, Ring Road",
    city: "Surat",
    state: "Gujarat",
    pincode: "395002",
    contact: "9876500009",
  },
  {
    id: "b10",
    companyName: "GROWATT NEW ENERGY",
    gstin: "27AAFCG1023L1ZW",
    address: "Baner Road, Baner",
    city: "Pune",
    state: "Maharashtra",
    pincode: "411045",
    contact: "9876500010",
  },
];

/* ── Module-level mutable state ─────────────────────────────────────────── */
let masters: Master[] = [...SEED_MASTERS];
let groups: Group[] = [...SEED_GROUPS];
let cats: Category[] = [...SEED_CATS];
let subs: Subcategory[] = [...SEED_SUBS];
let movements: Movement[] = [];
let b2bPartners: B2bPartner[] = [...SEED_B2B];
let installerPartners: B2bPartner[] = [...SEED_INSTALLER];

const listeners = new Set<() => void>();
function notify() {
  listeners.forEach((fn) => fn());
}

export function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/* ── Getters ────────────────────────────────────────────────────────────── */
export function getMasters() {
  return masters;
}
export function getGroups() {
  return groups;
}
export function getCats() {
  return cats;
}
export function getSubs() {
  return subs;
}
export function getMovements() {
  return movements;
}
export function getB2bPartners() {
  return b2bPartners;
}
export function getB2bById(id: string) {
  return b2bPartners.find((p) => p.id === id) ?? null;
}
export function getInstallerPartners() {
  return installerPartners;
}
export function getInstallerById(id: string) {
  return installerPartners.find((p) => p.id === id) ?? null;
}

/* ── Masters ────────────────────────────────────────────────────────────── */
export function addMaster(name: string, unit: string) {
  masters = [...masters, { id: uid(), name, unit }];
  notify();
}
export function editMaster(id: string, name: string, unit: string) {
  masters = masters.map((m) => (m.id !== id ? m : { ...m, name, unit }));
  notify();
}
export function deleteMaster(id: string) {
  const gids = groups.filter((g) => g.masterId === id).map((g) => g.id);
  const cids = cats.filter((c) => gids.includes(c.groupId)).map((c) => c.id);
  movements = movements.filter(
    (m) => !subs.filter((s) => cids.includes(s.categoryId)).some((s) => s.id === m.subcategoryId),
  );
  subs = subs.filter((s) => !cids.includes(s.categoryId));
  cats = cats.filter((c) => !gids.includes(c.groupId));
  groups = groups.filter((g) => g.masterId !== id);
  masters = masters.filter((m) => m.id !== id);
  notify();
}

/* ── Groups ─────────────────────────────────────────────────────────────── */
export function addGroup(masterId: string, name: string) {
  groups = [...groups, { id: uid(), masterId, name }];
  notify();
}
export function editGroup(id: string, name: string) {
  groups = groups.map((g) => (g.id !== id ? g : { ...g, name }));
  notify();
}
export function deleteGroup(id: string) {
  const cids = cats.filter((c) => c.groupId === id).map((c) => c.id);
  movements = movements.filter(
    (m) => !subs.filter((s) => cids.includes(s.categoryId)).some((s) => s.id === m.subcategoryId),
  );
  subs = subs.filter((s) => !cids.includes(s.categoryId));
  cats = cats.filter((c) => c.groupId !== id);
  groups = groups.filter((g) => g.id !== id);
  notify();
}

/* ── Categories ─────────────────────────────────────────────────────────── */
export function addCat(groupId: string, name: string) {
  cats = [...cats, { id: uid(), groupId, name }];
  notify();
}
export function editCat(id: string, name: string) {
  cats = cats.map((c) => (c.id !== id ? c : { ...c, name }));
  notify();
}
export function deleteCat(id: string) {
  movements = movements.filter(
    (m) => !subs.filter((s) => s.categoryId === id).some((s) => s.id === m.subcategoryId),
  );
  subs = subs.filter((s) => s.categoryId !== id);
  cats = cats.filter((c) => c.id !== id);
  notify();
}

/* ── Subcategories ──────────────────────────────────────────────────────── */
export function addSub(catId: string, name: string) {
  subs = [...subs, { id: uid(), categoryId: catId, name, stock: 0, godownStock: 0 }];
  notify();
}
export function editSub(id: string, name: string) {
  subs = subs.map((s) => (s.id !== id ? s : { ...s, name }));
  notify();
}
export function deleteSub(id: string) {
  movements = movements.filter((m) => m.subcategoryId !== id);
  subs = subs.filter((s) => s.id !== id);
  notify();
}

/* ── Movements ──────────────────────────────────────────────────────────── */
export function addMovement(m: Movement) {
  movements = [...movements, m];
  subs = subs.map((s) => {
    if (s.id !== m.subcategoryId) return s;
    const godownStock =
      m.type === "in" ? s.godownStock + m.qty : Math.max(0, s.godownStock - m.qty);
    return { ...s, godownStock, stock: godownStock };
  });
  notify();
}

/* ── B2B Partners ───────────────────────────────────────────────────────── */
export function addB2b(data: Omit<B2bPartner, "id">) {
  b2bPartners = [...b2bPartners, { id: uid(), ...data }];
  notify();
}
export function editB2b(id: string, data: Omit<B2bPartner, "id">) {
  b2bPartners = b2bPartners.map((p) => (p.id !== id ? p : { id, ...data }));
  notify();
}
export function deleteB2b(id: string) {
  b2bPartners = b2bPartners.filter((p) => p.id !== id);
  notify();
}

export function addInstaller(data: Omit<B2bPartner, "id">) {
  installerPartners = [...installerPartners, { id: uid(), ...data }];
  notify();
}
export function editInstaller(id: string, data: Omit<B2bPartner, "id">) {
  installerPartners = installerPartners.map((p) => (p.id !== id ? p : { id, ...data }));
  notify();
}
export function deleteInstaller(id: string) {
  installerPartners = installerPartners.filter((p) => p.id !== id);
  notify();
}
