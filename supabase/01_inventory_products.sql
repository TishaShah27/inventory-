-- ============================================================
-- 01: inventory_products
-- Product table schema for Inventory management
-- ============================================================

create table if not exists inventory_products (
  id           bigint      generated always as identity primary key,
  name         text        not null,
  created_at   timestamptz not null default now()
);

alter table inventory_products enable row level security;

drop policy if exists "authenticated full access" on inventory_products;
drop policy if exists "public full access" on inventory_products;
create policy "public full access" on inventory_products
  for all to public using (true) with check (true);
