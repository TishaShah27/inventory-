-- ============================================================
-- 09: inventory_outward
-- Goods dispatched from the godown
-- ============================================================

create table if not exists inventory_outward (
  id               uuid        primary key default gen_random_uuid(),
  challan_date     text        not null default '',
  bill_number      text        not null default '',
  concerned_person text        not null default '',
  delivery_to      text        not null default 'CUSTOMER',
  b2b_company_name text,
  customer_address text        not null default '',
  delivery_city    text        not null default '',
  gst_details      text        not null default '',
  driver_name      text        not null default '',
  driver_contact   text        not null default '',
  remarks          text        not null default '',
  vehicle_no       text        not null default '',
  delivery_contact text        not null default '',
  subcategory_id   bigint      not null references inventory_products(id),
  qty              integer     not null default 0,
  serial_nos       text[]      not null default '{}',
  created_at       timestamptz not null default now()
);

alter table inventory_outward enable row level security;

drop policy if exists "authenticated full access" on inventory_outward;
drop policy if exists "public full access" on inventory_outward;
create policy "public full access" on inventory_outward
  for all to public using (true) with check (true);
