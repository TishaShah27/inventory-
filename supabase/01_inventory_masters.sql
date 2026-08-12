-- ============================================================
-- 01: inventory_masters
-- Top-level material types (e.g. SOLAR PANEL, CABLE)
-- ============================================================

create table if not exists inventory_masters (
  id   bigint generated always as identity primary key,
  name text   not null,
  unit text   not null default 'NOS'
);

alter table inventory_masters enable row level security;

drop policy if exists "authenticated full access" on inventory_masters;
drop policy if exists "public full access" on inventory_masters;
create policy "public full access" on inventory_masters
  for all to public using (true) with check (true);

insert into inventory_masters (name, unit) values
  ('SOLAR PANEL',           'NOS'),
  ('SOLAR INVERTER',        'NOS'),
  ('CABLE',                 'MTR'),
  ('ELECTRICAL ACCESSORIES','NOS'),
  ('STRUCTURE ACCESSORIES', 'NOS');
