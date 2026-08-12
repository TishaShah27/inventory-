-- ============================================================
-- INVENTORY MODULE — Complete Schema (mirrored from Aris Solar)
-- Derived directly from solarflow-crm service files:
--   inventoryService.ts, inwardService.ts, outwardService.ts,
--   b2bService.ts, installerService.ts, installerInventoryService.ts
--   installer_type_schema.sql (the only SQL file that existed)
-- Run top-to-bottom on a fresh Supabase project.
-- ============================================================


-- ============================================================
-- TABLE 1: inventory_masters
-- Columns: id (bigint identity PK), name (text), unit (text)
-- Source: inventoryService.ts → masterFromDB()
--   row.id → bigint, row.name → text, row.unit → text
-- ============================================================
create table if not exists inventory_masters (
  id   bigint generated always as identity primary key,
  name text   not null,
  unit text   not null default 'NOS'
);


-- ============================================================
-- TABLE 2: inventory_groups
-- Columns: id (bigint), master_id (bigint FK), name (text)
-- Source: inventoryService.ts → groupFromDB()
--   row.master_id → bigint (passed as Number(masterId) on insert)
-- ============================================================
create table if not exists inventory_groups (
  id        bigint generated always as identity primary key,
  master_id bigint not null references inventory_masters(id) on delete cascade,
  name      text   not null
);


-- ============================================================
-- TABLE 3: inventory_categories
-- Columns: id (bigint), group_id (bigint FK), name (text)
-- Source: inventoryService.ts → catFromDB()
-- ============================================================
create table if not exists inventory_categories (
  id       bigint generated always as identity primary key,
  group_id bigint not null references inventory_groups(id) on delete cascade,
  name     text   not null
);


-- ============================================================
-- TABLE 4: inventory_subcategories
-- Columns: id (bigint), category_id (bigint FK), name (text),
--          godown_stock (integer default 0)
-- Source: inventoryService.ts → subFromDB()
--   godown_stock is updated directly on every inward/outward
-- ============================================================
create table if not exists inventory_subcategories (
  id           bigint  generated always as identity primary key,
  category_id  bigint  not null references inventory_categories(id) on delete cascade,
  name         text    not null,
  godown_stock integer not null default 0
);


-- ============================================================
-- TABLE 5: b2b_partners
-- Columns: id (text PK!), company_name, gstin, address,
--          city, state, pincode, contact
-- IMPORTANT: ID is TEXT because seed data uses "b1","b2"...
--   and service passes id as String(row.id).
--   The app does: .eq("id", id) where id is a string.
-- Source: b2bService.ts → fromDB() / toDB()
-- ============================================================
create table if not exists b2b_partners (
  id           text   primary key default gen_random_uuid()::text,
  company_name text   not null,
  gstin        text   not null default '',
  address      text   not null default '',
  city         text   not null default '',
  state        text   not null default '',
  pincode      text   not null default '',
  contact      text   not null default '',
  created_at   timestamptz not null default now()
);


-- ============================================================
-- TABLE 6: b2i_partners
-- Same shape as b2b_partners + installer_type column
-- installer_type added via installer_type_schema.sql in aris solar
-- Source: installerService.ts → fromDB() / toDB()
--         + installer_type_schema.sql:
--           alter table b2i_partners add column if not exists installer_type text;
-- ============================================================
create table if not exists b2i_partners (
  id             text   primary key default gen_random_uuid()::text,
  company_name   text   not null,
  gstin          text   not null default '',
  address        text   not null default '',
  city           text   not null default '',
  state          text   not null default '',
  pincode        text   not null default '',
  contact        text   not null default '',
  installer_type text,
  created_at     timestamptz not null default now()
);


-- ============================================================
-- TABLE 7: b2i_partner_inventory
-- Tracks stock held by each installer partner per subcategory.
-- Columns: id (bigint), b2i_partner_id (text), b2i_partner_name (text),
--          subcategory_id (bigint FK), qty (integer)
-- Source: installerInventoryService.ts → fromDB() / upsertInstallerPartnerStock()
--   .select("id, qty")
--   .eq("b2i_partner_id", installerPartnerId)  ← text comparison
--   .eq("subcategory_id", Number(subcategoryId)) ← bigint comparison
--   .update({ qty: newQty, b2i_partner_name: ... })
--   .insert({ b2i_partner_id, b2i_partner_name, subcategory_id, qty })
-- ============================================================
create table if not exists b2i_partner_inventory (
  id               bigint  generated always as identity primary key,
  b2i_partner_id   text    not null,
  b2i_partner_name text    not null default '',
  subcategory_id   bigint  not null references inventory_subcategories(id) on delete cascade,
  qty              integer not null default 0,
  updated_at       timestamptz not null default now()
);

-- Unique: one row per (partner, subcategory) — upsert logic depends on this
create unique index if not exists b2i_partner_inventory_unique
  on b2i_partner_inventory(b2i_partner_id, subcategory_id);


-- ============================================================
-- TABLE 8: inventory_inward
-- Columns: id (uuid PK), inward_id, entry_type, invoice_date,
--          material_received_date, bill_number, supplier,
--          supplier_type, subcategory_id, qty, gst_pct, price,
--          serial_nos (text[]), created_at
-- Source: inwardService.ts → fromDB() / createInwardEntry()
--   id: e.id  ← app generates UUID before insert
--   inward_id: "IN/1621" format
--   supplier_type: "b2b" | "b2i"
--   subcategory_id: Number(e.subcategoryId) ← bigint
--   serial_nos: string[] ← text array
-- ============================================================
create table if not exists inventory_inward (
  id                     uuid        primary key default gen_random_uuid(),
  inward_id              text        not null default '',
  entry_type             text        not null default 'New Materials',
  invoice_date           text        not null default '',
  material_received_date text        not null default '',
  bill_number            text        not null default '',
  supplier               text        not null default '',
  supplier_type          text        not null default 'b2b',
  subcategory_id         bigint      not null references inventory_subcategories(id),
  qty                    integer     not null default 0,
  gst_pct                numeric     not null default 18,
  price                  numeric     not null default 0,
  serial_nos             text[]      not null default '{}',
  created_at             timestamptz not null default now()
);


-- ============================================================
-- TABLE 9: inventory_outward
-- Columns: id (uuid PK), challan_date, bill_number,
--          concerned_person, delivery_to, b2b_company_name (nullable),
--          customer_address, delivery_city, gst_details,
--          driver_name, driver_contact, remarks, vehicle_no,
--          delivery_contact, subcategory_id, qty,
--          serial_nos (text[]), created_at
-- Source: outwardService.ts → fromDB() / createOutwardEntry()
--   delivery_to: "B2C" | "B2B" | "B2I"
--   b2b_company_name: nullable (e.b2bCompanyName ?? null)
--   subcategory_id: Number(e.subcategoryId) ← bigint
-- ============================================================
create table if not exists inventory_outward (
  id               uuid        primary key default gen_random_uuid(),
  challan_date     text        not null default '',
  bill_number      text        not null default '',
  concerned_person text        not null default '',
  delivery_to      text        not null default 'B2C',
  b2b_company_name text,
  customer_address text        not null default '',
  delivery_city    text        not null default '',
  gst_details      text        not null default '',
  driver_name      text        not null default '',
  driver_contact   text        not null default '',
  remarks          text        not null default '',
  vehicle_no       text        not null default '',
  delivery_contact text        not null default '',
  subcategory_id   bigint      not null references inventory_subcategories(id),
  qty              integer     not null default 0,
  serial_nos       text[]      not null default '{}',
  created_at       timestamptz not null default now()
);


-- ============================================================
-- ROW LEVEL SECURITY
-- Matches Aris Solar pattern — authenticated users have full access
-- ============================================================
alter table inventory_masters       enable row level security;
alter table inventory_groups        enable row level security;
alter table inventory_categories    enable row level security;
alter table inventory_subcategories enable row level security;
alter table b2b_partners            enable row level security;
alter table b2i_partners            enable row level security;
alter table b2i_partner_inventory   enable row level security;
alter table inventory_inward        enable row level security;
alter table inventory_outward       enable row level security;

create policy "authenticated full access" on inventory_masters
  for all to authenticated using (true) with check (true);
create policy "authenticated full access" on inventory_groups
  for all to authenticated using (true) with check (true);
create policy "authenticated full access" on inventory_categories
  for all to authenticated using (true) with check (true);
create policy "authenticated full access" on inventory_subcategories
  for all to authenticated using (true) with check (true);
create policy "authenticated full access" on b2b_partners
  for all to authenticated using (true) with check (true);
create policy "authenticated full access" on b2i_partners
  for all to authenticated using (true) with check (true);
create policy "authenticated full access" on b2i_partner_inventory
  for all to authenticated using (true) with check (true);
create policy "authenticated full access" on inventory_inward
  for all to authenticated using (true) with check (true);
create policy "authenticated full access" on inventory_outward
  for all to authenticated using (true) with check (true);


-- ============================================================
-- SEED DATA (copied from inventoryStore.ts SEED_MASTERS,
-- SEED_GROUPS, SEED_CATS, SEED_SUBS — exact same data as
-- aris solar uses as its in-memory defaults)
-- ============================================================

-- Masters
insert into inventory_masters (name, unit) values
  ('SOLAR PANEL',           'NOS'),
  ('SOLAR INVERTER',        'NOS'),
  ('CABLE',                 'MTR'),
  ('ELECTRICAL ACCESSORIES','NOS'),
  ('STRUCTURE ACCESSORIES', 'NOS');

-- Groups (master_id matches insertion order above: 1-5)
insert into inventory_groups (master_id, name) values
  (1, 'WAAREE'), (1, 'ADANI'), (1, 'RAYZON'),
  (2, 'WAAREE'), (2, 'SUNWAYS'), (2, 'MINDRA'),
  (3, 'POLYCAB'), (3, 'WAACAB'), (3, 'GENOME'),
  (4, 'DISTRIBUTION BOX'), (4, 'CONDUIT PIPE'), (4, 'ELBOW'),
  (4, 'TEE'), (4, 'C-CLIP'), (4, 'LUG'), (4, 'CABLE TIE'),
  (5, 'HDGI BOX PIPE'), (5, 'OTHERS');

-- Categories
insert into inventory_categories (group_id, name) values
  -- WAAREE panel (group 1)
  (1,'540wp'),(1,'545wp'),(1,'575wp'),(1,'580wp'),
  -- ADANI panel (group 2)
  (2,'540wp'),(2,'545wp'),(2,'555wp'),(2,'560wp'),(2,'565wp'),(2,'570wp'),(2,'575wp'),
  -- RAYZON panel (group 3)
  (3,'545wp'),
  -- WAAREE inverter (group 4)
  (4,'3.3kW'),(4,'4.6kW'),(4,'5kW'),(4,'6kW'),(4,'8kW'),(4,'10kW'),
  -- SUNWAYS inverter (group 5)
  (5,'3.3kW'),(5,'4.2kW'),(5,'5kW'),(5,'6kW'),(5,'10kW'),(5,'15kW'),(5,'20kW'),
  -- MINDRA inverter (group 6)
  (6,'6kW'),(6,'8kW'),(6,'40kW'),(6,'100kW'),
  -- POLYCAB cable (group 7)
  (7,'2.5sqmm'),(7,'4sqmm'),(7,'6sqmm'),
  -- WAACAB cable (group 8)
  (8,'2.5sqmm'),(8,'4sqmm'),(8,'6sqmm'),(8,'16sqmm'),
  -- GENOME cable (group 9)
  (9,'16sqmm'),
  -- DISTRIBUTION BOX (group 10)
  (10,'1-5kW'),(10,'6-10kW'),
  -- CONDUIT PIPE (group 11)
  (11,'20mm'),(11,'25mm'),
  -- ELBOW (group 12)
  (12,'20mm'),(12,'25mm'),
  -- TEE (group 13)
  (13,'20mm'),(13,'25mm'),
  -- C-CLIP (group 14)
  (14,'20mm'),(14,'25mm'),
  -- LUG (group 15)
  (15,'2.5sqmm'),(15,'4sqmm'),(15,'6sqmm'),(15,'16sqmm'),
  -- CABLE TIE (group 16)
  (16,'NYLON'),
  -- HDGI BOX PIPE (group 17)
  (17,'60x40mm'),(17,'40x40mm'),
  -- OTHERS (group 18)
  (18,'BASE PLATE'),(18,'PAATA CHAPLA'),(18,'CHEMICAL GUN'),
  (18,'NOZEL'),(18,'ZINK SPRAY'),(18,'FASTNER');

-- Subcategories (category_id matches insertion order above: 1-60)
insert into inventory_subcategories (category_id, name, godown_stock) values
  -- WAAREE panel
  (1,'DCR-PERC-BF',0),
  (2,'NDCR-PERC-MF',0),(2,'NDCR-PERC-BF',0),
  (3,'NDCR-TOPCON-BF',0),
  (4,'NDCR-TOPCON-BF',0),
  -- ADANI panel
  (5,'DCR-PERC-BF',0),(6,'DCR-PERC-BF',0),(7,'DCR-TOPCON-BF',0),
  (8,'DCR-TOPCON-BF',0),(9,'DCR-TOPCON-BF',0),(10,'DCR-TOPCON-BF',0),(11,'DCR-TOPCON-BF',0),
  -- RAYZON panel
  (12,'DCR-PERC-BF',0),
  -- WAAREE inverter
  (13,'SINGLE-STRING',0),(14,'DUAL-STRING',0),(15,'DUAL-STRING',0),
  (16,'DUAL-STRING',0),(17,'DUAL-STRING',0),(18,'DUAL-STRING',0),  -- wait, cat 18 is 10kW (group4)
  -- SUNWAYS inverter
  (19,'SINGLE-STRING',0),(20,'SINGLE-STRING',0),(21,'SINGLE-STRING',0),
  (22,'SINGLE-STRING',0),(23,'SINGLE-STRING',0),(24,'SINGLE-STRING',0),(25,'SINGLE-STRING',0),
  -- MINDRA inverter
  (26,'DUAL-STRING',0),(27,'DUAL-STRING',0),(28,'MULTI-STRING',0),(29,'MULTI-STRING',0),
  -- POLYCAB cable
  (30,'DC-RED-BLACK',0),(30,'AC-RED',0),(30,'AC-BLACK',0),(30,'AC-GREEN',0),
  (31,'DC-RED-BLACK',0),(31,'AC-RED',0),(31,'AC-BLACK',0),(31,'AC-GREEN',0),
  (32,'DC-RED-BLACK',0),(32,'AC-RED',0),(32,'AC-BLACK',0),(32,'AC-GREEN',0),
  -- WAACAB cable
  (33,'DC-RED-BLACK',0),(33,'AC-RED',0),(33,'AC-BLACK',0),(33,'AC-GREEN',0),
  (34,'DC-RED-BLACK',0),(34,'AC-RED',0),(34,'AC-BLACK',0),(34,'AC-GREEN',0),
  (35,'DC-RED-BLACK',0),(35,'AC-RED',0),(35,'AC-BLACK',0),(35,'AC-GREEN',0),
  (36,'LA-GREEN',0),
  -- GENOME cable
  (37,'LA-GREEN',0),
  -- DISTRIBUTION BOX
  (38,'ACDB',0),(38,'DCDB',0),(39,'ACDB',0),(39,'DCDB',0),
  -- CONDUIT PIPE
  (40,'POLYCAB',0),(40,'BLP',0),(41,'POLYCAB',0),(41,'BLP',0),
  -- ELBOW
  (42,'POLYCAB',0),(42,'BLP',0),(43,'POLYCAB',0),(43,'BLP',0),
  -- TEE
  (44,'POLYCAB',0),(44,'BLP',0),(45,'POLYCAB',0),(45,'BLP',0),
  -- C-CLIP
  (46,'STANDARD',0),(47,'STANDARD',0),
  -- LUG
  (48,'STANDARD',0),(49,'STANDARD',0),(50,'STANDARD',0),(51,'STANDARD',0),
  -- CABLE TIE
  (52,'STANDARD',0),
  -- HDGI BOX PIPE
  (53,'HINDUSTAR',0),(54,'HINDUSTAR',0),
  -- OTHERS
  (55,'STANDARD',0),(56,'STANDARD',0),(57,'STANDARD',0),
  (58,'STANDARD',0),(59,'STANDARD',0),(60,'STANDARD',0);
