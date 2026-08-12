-- ============================================================
-- 02: inventory_groups
-- Groups belonging to a master (e.g. WAAREE, ADANI, POLYCAB)
-- ============================================================

create table if not exists inventory_groups (
  id        bigint generated always as identity primary key,
  master_id bigint not null references inventory_masters(id) on delete cascade,
  name      text   not null
);

alter table inventory_groups enable row level security;

drop policy if exists "authenticated full access" on inventory_groups;
drop policy if exists "public full access" on inventory_groups;
create policy "public full access" on inventory_groups
  for all to public using (true) with check (true);

insert into inventory_groups (master_id, name) values
  (1, 'WAAREE'), (1, 'ADANI'), (1, 'RAYZON'),
  (2, 'WAAREE'), (2, 'SUNWAYS'), (2, 'MINDRA'),
  (3, 'POLYCAB'), (3, 'WAACAB'), (3, 'GENOME'),
  (4, 'DISTRIBUTION BOX'), (4, 'CONDUIT PIPE'), (4, 'ELBOW'),
  (4, 'TEE'), (4, 'C-CLIP'), (4, 'LUG'), (4, 'CABLE TIE'),
  (5, 'HDGI BOX PIPE'), (5, 'OTHERS');
