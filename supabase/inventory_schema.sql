-- ============================================================
-- INVENTORY MODULE — Complete Schema
-- Run this file on a fresh Supabase project to set up all
-- tables needed for the Inventory standalone app.
-- Order matters: parents before children.
-- ============================================================

-- Enable UUID generation (already available in Supabase by default)
-- create extension if not exists "pgcrypto";


-- ============================================================
-- 1. inventory_masters
--    Top-level material type (e.g. "Solar Panel", "Cable")
-- ============================================================
create table if not exists inventory_masters (
  id   bigint generated always as identity primary key,
  name text   not null,
  unit text   not null default 'NOS'   -- e.g. NOS, MTR, KG
);


-- ============================================================
-- 2. inventory_groups
--    A group belongs to one master
-- ============================================================
create table if not exists inventory_groups (
  id        bigint generated always as identity primary key,
  master_id bigint not null references inventory_masters(id) on delete cascade,
  name      text   not null
);


-- ============================================================
-- 3. inventory_categories
--    A category belongs to one group
-- ============================================================
create table if not exists inventory_categories (
  id       bigint generated always as identity primary key,
  group_id bigint not null references inventory_groups(id) on delete cascade,
  name     text   not null
);


-- ============================================================
-- 4. inventory_subcategories
--    Leaf node — holds actual godown stock count
-- ============================================================
create table if not exists inventory_subcategories (
  id           bigint generated always as identity primary key,
  category_id  bigint not null references inventory_categories(id) on delete cascade,
  name         text   not null,
  godown_stock integer not null default 0
);


-- ============================================================
-- 5. b2b_partners
--    External B2B supplier / buyer companies
-- ============================================================
create table if not exists b2b_partners (
  id           bigint generated always as identity primary key,
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
-- 6. b2i_partners
--    Installer / B2I partner companies (same shape as B2B
--    but with an extra installer_type column)
-- ============================================================
create table if not exists b2i_partners (
  id             bigint generated always as identity primary key,
  company_name   text   not null,
  gstin          text   not null default '',
  address        text   not null default '',
  city           text   not null default '',
  state          text   not null default '',
  pincode        text   not null default '',
  contact        text   not null default '',
  installer_type text,                         -- e.g. "Electrician", "Contractor"
  created_at     timestamptz not null default now()
);


-- ============================================================
-- 7. b2i_partner_inventory
--    Stock held by each installer partner per subcategory
-- ============================================================
create table if not exists b2i_partner_inventory (
  id                bigint generated always as identity primary key,
  b2i_partner_id    text   not null,   -- references b2i_partners.id (stored as text for flexibility)
  b2i_partner_name  text   not null default '',
  subcategory_id    bigint not null references inventory_subcategories(id) on delete cascade,
  qty               integer not null default 0,
  updated_at        timestamptz not null default now()
);

create unique index if not exists b2i_partner_inventory_unique
  on b2i_partner_inventory(b2i_partner_id, subcategory_id);


-- ============================================================
-- 8. inventory_inward
--    Records of material received into the godown
-- ============================================================
create table if not exists inventory_inward (
  id                     uuid primary key default gen_random_uuid(),
  inward_id              text   not null default '',   -- e.g. "IN/1621"
  entry_type             text   not null default 'New Materials',
  invoice_date           text   not null default '',
  material_received_date text   not null default '',
  bill_number            text   not null default '',
  supplier               text   not null default '',
  supplier_type          text   not null default 'b2b',  -- 'b2b' | 'b2i'
  subcategory_id         bigint not null references inventory_subcategories(id),
  qty                    integer not null default 0,
  gst_pct                numeric not null default 18,
  price                  numeric not null default 0,
  serial_nos             text[]  not null default '{}',
  created_at             timestamptz not null default now()
);


-- ============================================================
-- 9. inventory_outward
--    Records of material dispatched from the godown
-- ============================================================
create table if not exists inventory_outward (
  id                uuid primary key default gen_random_uuid(),
  challan_date      text   not null default '',
  bill_number       text   not null default '',
  concerned_person  text   not null default '',
  delivery_to       text   not null default 'B2C',  -- 'B2C' | 'B2B' | 'B2I'
  b2b_company_name  text,
  customer_address  text   not null default '',
  delivery_city     text   not null default '',
  gst_details       text   not null default '',
  driver_name       text   not null default '',
  driver_contact    text   not null default '',
  remarks           text   not null default '',
  vehicle_no        text   not null default '',
  delivery_contact  text   not null default '',
  subcategory_id    bigint not null references inventory_subcategories(id),
  qty               integer not null default 0,
  serial_nos        text[]  not null default '{}',
  created_at        timestamptz not null default now()
);


-- ============================================================
-- Row-Level Security (RLS)
-- By default Supabase blocks all access unless you enable RLS
-- and add policies. For a private internal tool you can use
-- the simple "allow all authenticated users" policy below.
-- ============================================================

alter table inventory_masters         enable row level security;
alter table inventory_groups          enable row level security;
alter table inventory_categories      enable row level security;
alter table inventory_subcategories   enable row level security;
alter table b2b_partners              enable row level security;
alter table b2i_partners              enable row level security;
alter table b2i_partner_inventory     enable row level security;
alter table inventory_inward          enable row level security;
alter table inventory_outward         enable row level security;

-- Allow any authenticated user to do everything
-- (Replace with more granular policies if needed)
do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'inventory_masters',
    'inventory_groups',
    'inventory_categories',
    'inventory_subcategories',
    'b2b_partners',
    'b2i_partners',
    'b2i_partner_inventory',
    'inventory_inward',
    'inventory_outward'
  ]
  loop
    execute format(
      'create policy if not exists "Allow authenticated full access" on %I
       for all to authenticated using (true) with check (true);',
      tbl
    );
  end loop;
end;
$$;
