-- ============================================================
-- 05: b2b_partners
-- External B2B supplier & buyer companies
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

alter table b2b_partners enable row level security;

drop policy if exists "authenticated full access" on b2b_partners;
drop policy if exists "public full access" on b2b_partners;
create policy "public full access" on b2b_partners
  for all to public using (true) with check (true);
