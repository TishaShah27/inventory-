-- ============================================================
-- 08: inventory_inward
-- Goods received into the godown
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
  subcategory_id         bigint      not null references inventory_products(id),
  qty                    integer     not null default 0,
  gst_pct                numeric     not null default 18,
  price                  numeric     not null default 0,
  serial_nos             text[]      not null default '{}',
  created_at             timestamptz not null default now()
);

alter table inventory_inward enable row level security;

drop policy if exists "authenticated full access" on inventory_inward;
drop policy if exists "public full access" on inventory_inward;
create policy "public full access" on inventory_inward
  for all to public using (true) with check (true);
