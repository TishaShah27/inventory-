-- ============================================================
-- 01: inventory_products
-- Product table schema for Inventory management
-- ============================================================

create table if not exists inventory_subcategories (
  id           bigint      generated always as identity primary key,
  name         text        not null,
  category_id  bigint      not null default 1,
  godown_stock integer     not null default 0,
  created_at   timestamptz not null default now()
);

alter table inventory_subcategories enable row level security;

drop policy if exists "authenticated full access" on inventory_subcategories;
drop policy if exists "public full access" on inventory_subcategories;
create policy "public full access" on inventory_subcategories
  for all to public using (true) with check (true);
