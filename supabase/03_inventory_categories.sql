-- ============================================================
-- 03: inventory_categories
-- Categories belonging to a group (e.g. 540wp, 3.3kW, 4sqmm)
-- ============================================================

create table if not exists inventory_categories (
  id       bigint generated always as identity primary key,
  group_id bigint not null references inventory_groups(id) on delete cascade,
  name     text   not null
);

alter table inventory_categories enable row level security;

drop policy if exists "authenticated full access" on inventory_categories;
drop policy if exists "public full access" on inventory_categories;
create policy "public full access" on inventory_categories
  for all to public using (true) with check (true);

insert into inventory_categories (group_id, name) values
  (1,'540wp'),(1,'545wp'),(1,'575wp'),(1,'580wp'),
  (2,'540wp'),(2,'545wp'),(2,'555wp'),(2,'560wp'),(2,'565wp'),(2,'570wp'),(2,'575wp'),
  (3,'545wp'),
  (4,'3.3kW'),(4,'4.6kW'),(4,'5kW'),(4,'6kW'),(4,'8kW'),(4,'10kW'),
  (5,'3.3kW'),(5,'4.2kW'),(5,'5kW'),(5,'6kW'),(5,'10kW'),(5,'15kW'),(5,'20kW'),
  (6,'6kW'),(6,'8kW'),(6,'40kW'),(6,'100kW'),
  (7,'2.5sqmm'),(7,'4sqmm'),(7,'6sqmm'),
  (8,'2.5sqmm'),(8,'4sqmm'),(8,'6sqmm'),(8,'16sqmm'),
  (9,'16sqmm'),
  (10,'1-5kW'),(10,'6-10kW'),
  (11,'20mm'),(11,'25mm'),
  (12,'20mm'),(12,'25mm'),
  (13,'20mm'),(13,'25mm'),
  (14,'20mm'),(14,'25mm'),
  (15,'2.5sqmm'),(15,'4sqmm'),(15,'6sqmm'),(15,'16sqmm'),
  (16,'NYLON'),
  (17,'60x40mm'),(17,'40x40mm'),
  (18,'BASE PLATE'),(18,'PAATA CHAPLA'),(18,'CHEMICAL GUN'),
  (18,'NOZEL'),(18,'ZINK SPRAY'),(18,'FASTNER');
