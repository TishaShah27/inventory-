-- ============================================================
-- 06: b2i_partners
-- Installer & technician partner companies (+ installer_type)
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
  installer_type text,                         -- 'WIREMAN' | 'FABRICATOR'
  created_at     timestamptz not null default now()
);

alter table b2i_partners enable row level security;

drop policy if exists "authenticated full access" on b2i_partners;
drop policy if exists "public full access" on b2i_partners;
create policy "public full access" on b2i_partners
  for all to public using (true) with check (true);
