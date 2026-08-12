-- ============================================================
-- 07: b2i_partner_inventory
-- Stock held by each installer partner per subcategory
-- ============================================================

create table if not exists b2i_partner_inventory (
  id               bigint  generated always as identity primary key,
  b2i_partner_id   text    not null,
  b2i_partner_name text    not null default '',
  subcategory_id   bigint  not null references inventory_subcategories(id) on delete cascade,
  qty              integer not null default 0,
  updated_at       timestamptz not null default now()
);

create unique index if not exists b2i_partner_inventory_unique
  on b2i_partner_inventory(b2i_partner_id, subcategory_id);

alter table b2i_partner_inventory enable row level security;

drop policy if exists "authenticated full access" on b2i_partner_inventory;
drop policy if exists "public full access" on b2i_partner_inventory;
create policy "public full access" on b2i_partner_inventory
  for all to public using (true) with check (true);
