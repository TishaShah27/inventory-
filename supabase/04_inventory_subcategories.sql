-- ============================================================
-- 04: inventory_subcategories
-- Leaf product node holding godown stock count
-- ============================================================

create table if not exists inventory_subcategories (
  id           bigint  generated always as identity primary key,
  category_id  bigint  not null references inventory_categories(id) on delete cascade,
  name         text    not null,
  godown_stock integer not null default 0
);

alter table inventory_subcategories enable row level security;

drop policy if exists "authenticated full access" on inventory_subcategories;
drop policy if exists "public full access" on inventory_subcategories;
create policy "public full access" on inventory_subcategories
  for all to public using (true) with check (true);

insert into inventory_subcategories (category_id, name, godown_stock) values
  (1,'DCR-PERC-BF',0),
  (2,'NDCR-PERC-MF',0),(2,'NDCR-PERC-BF',0),
  (3,'NDCR-TOPCON-BF',0),
  (4,'NDCR-TOPCON-BF',0),
  (5,'DCR-PERC-BF',0),(6,'DCR-PERC-BF',0),(7,'DCR-TOPCON-BF',0),
  (8,'DCR-TOPCON-BF',0),(9,'DCR-TOPCON-BF',0),(10,'DCR-TOPCON-BF',0),(11,'DCR-TOPCON-BF',0),
  (12,'DCR-PERC-BF',0),
  (13,'SINGLE-STRING',0),(14,'DUAL-STRING',0),(15,'DUAL-STRING',0),
  (16,'DUAL-STRING',0),(17,'DUAL-STRING',0),(18,'DUAL-STRING',0),
  (19,'SINGLE-STRING',0),(20,'SINGLE-STRING',0),(21,'SINGLE-STRING',0),
  (22,'SINGLE-STRING',0),(23,'SINGLE-STRING',0),(24,'SINGLE-STRING',0),(25,'SINGLE-STRING',0),
  (26,'DUAL-STRING',0),(27,'DUAL-STRING',0),(28,'MULTI-STRING',0),(29,'MULTI-STRING',0),
  (30,'DC-RED-BLACK',0),(30,'AC-RED',0),(30,'AC-BLACK',0),(30,'AC-GREEN',0),
  (31,'DC-RED-BLACK',0),(31,'AC-RED',0),(31,'AC-BLACK',0),(31,'AC-GREEN',0),
  (32,'DC-RED-BLACK',0),(32,'AC-RED',0),(32,'AC-BLACK',0),(32,'AC-GREEN',0),
  (33,'DC-RED-BLACK',0),(33,'AC-RED',0),(33,'AC-BLACK',0),(33,'AC-GREEN',0),
  (34,'DC-RED-BLACK',0),(34,'AC-RED',0),(34,'AC-BLACK',0),(34,'AC-GREEN',0),
  (35,'DC-RED-BLACK',0),(35,'AC-RED',0),(35,'AC-BLACK',0),(35,'AC-GREEN',0),
  (36,'LA-GREEN',0),
  (37,'LA-GREEN',0),
  (38,'ACDB',0),(38,'DCDB',0),(39,'ACDB',0),(39,'DCDB',0),
  (40,'POLYCAB',0),(40,'BLP',0),(41,'POLYCAB',0),(41,'BLP',0),
  (42,'POLYCAB',0),(42,'BLP',0),(43,'POLYCAB',0),(43,'BLP',0),
  (44,'POLYCAB',0),(44,'BLP',0),(45,'POLYCAB',0),(45,'BLP',0),
  (46,'STANDARD',0),(47,'STANDARD',0),
  (48,'STANDARD',0),(49,'STANDARD',0),(50,'STANDARD',0),(51,'STANDARD',0),
  (52,'STANDARD',0),
  (53,'HINDUSTAR',0),(54,'HINDUSTAR',0),
  (55,'STANDARD',0),(56,'STANDARD',0),(57,'STANDARD',0),
  (58,'STANDARD',0),(59,'STANDARD',0),(60,'STANDARD',0);
