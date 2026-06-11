-- Optional asset metadata and team-logo tables for the standalone package.
-- Run after 01_reference_tables.sql.

begin;

alter table if exists public.ff_characters
  add column if not exists local_image_path text not null default '';
alter table if exists public.ff_pets
  add column if not exists local_image_path text not null default '';
alter table if exists public.ff_loadouts
  add column if not exists local_image_path text not null default '';
alter table if exists public.ff_weapons
  add column if not exists local_image_path text not null default '';

create table if not exists public.ff_team_logos (
  team_code text primary key,
  team_name text not null default '',
  image_url text not null default '',
  local_image_path text not null default '',
  storage_bucket text not null default '',
  storage_path text not null default '',
  aliases text[] not null default '{}'::text[],
  is_placeholder boolean not null default false,
  raw_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ff_team_logos_team_name_lower_idx
  on public.ff_team_logos (lower(team_name));
create index if not exists ff_team_logos_aliases_gin_idx
  on public.ff_team_logos using gin (aliases);

alter table public.ff_team_logos enable row level security;
drop policy if exists "Public can read team logos" on public.ff_team_logos;
create policy "Public can read team logos"
  on public.ff_team_logos for select
  to anon, authenticated
  using (true);

-- Keep browser-side writes disabled. Edit through the SQL editor, an admin API,
-- or a protected service-role function.
revoke insert, update, delete on public.ff_team_logos from anon, authenticated;
grant select on public.ff_team_logos to anon, authenticated;


-- Local asset paths bundled with the repository.
with asset_paths(name, local_image_path) as (values
  ('A124', 'assets/img/characters/a124.png'),
  ('Alok', 'assets/img/characters/alok.png'),
  ('Chrono', 'assets/img/characters/chrono.png'),
  ('Clu', 'assets/img/characters/clu.png'),
  ('Dimitri', 'assets/img/characters/dimitri.png'),
  ('Homer', 'assets/img/characters/homer.png'),
  ('Ignis', 'assets/img/characters/ignis.png'),
  ('Iris', 'assets/img/characters/iris.png'),
  ('K', 'assets/img/characters/k.png'),
  ('Kassie', 'assets/img/characters/kassie.png'),
  ('Kenta', 'assets/img/characters/kenta.png'),
  ('Koda', 'assets/img/characters/koda.png'),
  ('Morse', 'assets/img/characters/morse.png'),
  ('Nero', 'assets/img/characters/nero.png'),
  ('Orion', 'assets/img/characters/orion.png'),
  ('Oscar', 'assets/img/characters/oscar.png'),
  ('Ray', 'assets/img/characters/ray.svg'),
  ('Ryden', 'assets/img/characters/ryden.png'),
  ('Santino', 'assets/img/characters/santino.png'),
  ('Skyler', 'assets/img/characters/skyler.png'),
  ('Steffie', 'assets/img/characters/steffie.png'),
  ('Tatsuya', 'assets/img/characters/tatsuya.png'),
  ('Wukong', 'assets/img/characters/wukong.png'),
  ('Xayne', 'assets/img/characters/xayne.png'),
  ('Alvaro', 'assets/img/characters/alvaro.png'),
  ('Andrew', 'assets/img/characters/andrew.png'),
  ('Antonio', 'assets/img/characters/antonio.png'),
  ('Caroline', 'assets/img/characters/caroline.png'),
  ('D-Bee', 'assets/img/characters/d-bee.png'),
  ('Dasha', 'assets/img/characters/dasha.png'),
  ('Ford', 'assets/img/characters/ford.png'),
  ('Hayato', 'assets/img/characters/hayato.png'),
  ('J.Biebs', 'assets/img/characters/j-biebs.png'),
  ('Jai', 'assets/img/characters/jai.png'),
  ('Joseph', 'assets/img/characters/joseph.png'),
  ('Jota', 'assets/img/characters/jota.png'),
  ('Kairos', 'assets/img/characters/kairos.png'),
  ('Kapella', 'assets/img/characters/kapella.png'),
  ('Kelly', 'assets/img/characters/kelly.png'),
  ('Kla', 'assets/img/characters/kla.png'),
  ('Laura', 'assets/img/characters/laura.png'),
  ('Leon', 'assets/img/characters/leon.png'),
  ('Lila', 'assets/img/characters/lila.png'),
  ('Luna', 'assets/img/characters/luna.png'),
  ('Luqueta', 'assets/img/characters/luqueta.png'),
  ('Maro', 'assets/img/characters/maro.png'),
  ('Maxim', 'assets/img/characters/maxim.png'),
  ('Miguel', 'assets/img/characters/miguel.png'),
  ('Misha', 'assets/img/characters/misha.png'),
  ('Moco', 'assets/img/characters/moco.png'),
  ('Nairi', 'assets/img/characters/nairi.png'),
  ('Nikita', 'assets/img/characters/nikita.png'),
  ('Notora', 'assets/img/characters/notora.png'),
  ('Olivia', 'assets/img/characters/olivia.png'),
  ('Otho', 'assets/img/characters/otho.png'),
  ('Paloma', 'assets/img/characters/paloma.png'),
  ('Rafael', 'assets/img/characters/rafael.png'),
  ('Rin', 'assets/img/characters/rin.png'),
  ('Shani', 'assets/img/characters/shani.png'),
  ('Shirou', 'assets/img/characters/shirou.png'),
  ('Sonia', 'assets/img/characters/sonia.png'),
  ('Suzy', 'assets/img/characters/suzy.png'),
  ('Thiva', 'assets/img/characters/thiva.png'),
  ('Wolfrahh', 'assets/img/characters/wolfrahh.png')
)
update public.ff_characters t
set local_image_path = a.local_image_path
from asset_paths a
where lower(t.name) = lower(a.name);
with asset_paths(name, local_image_path) as (values
  ('Arvon', 'assets/img/pets/arvon.png'),
  ('Agent Hop', 'assets/img/pets/agent-hop.png'),
  ('Beaston', 'assets/img/pets/beaston.png'),
  ('Detective Panda', 'assets/img/pets/detective-panda.png'),
  ('Dreki', 'assets/img/pets/dreki.png'),
  ('Dr. Beanie', 'assets/img/pets/dr-beanie.png'),
  ('Falco', 'assets/img/pets/falco.png'),
  ('Fang', 'assets/img/pets/fang.png'),
  ('Finn', 'assets/img/pets/finn.png'),
  ('Flash', 'assets/img/pets/flash.png'),
  ('Hoot', 'assets/img/pets/hoot.png'),
  ('Kaktus', 'assets/img/pets/kaktus.png'),
  ('Moony', 'assets/img/pets/moony.png'),
  ('Mr. Waggor', 'assets/img/pets/mr-waggor.png'),
  ('Night Panther', 'assets/img/pets/night-panther.png'),
  ('Ottero', 'assets/img/pets/ottero.png'),
  ('Robo', 'assets/img/pets/robo.png'),
  ('Rockie', 'assets/img/pets/rockie.png'),
  ('Sensei Tig', 'assets/img/pets/sensei-tig.png'),
  ('Shiba', 'assets/img/pets/shiba.png'),
  ('Spirit Fox', 'assets/img/pets/spirit-fox.png'),
  ('Yeti', 'assets/img/pets/yeti.png'),
  ('Zasil', 'assets/img/pets/zasil.png')
)
update public.ff_pets t
set local_image_path = a.local_image_path
from asset_paths a
where lower(t.name) = lower(a.name);
with asset_paths(name, local_image_path) as (values
  ('Enhance Hammer', 'assets/img/loadouts/enhance-hammer.png'),
  ('Super Leg Pocket', 'assets/img/loadouts/super-leg-pocket.png'),
  ('Tactical Market', 'assets/img/loadouts/tactical-market.png'),
  ('Team Booster', 'assets/img/loadouts/team-booster.png')
)
update public.ff_loadouts t
set local_image_path = a.local_image_path
from asset_paths a
where lower(t.name) = lower(a.name);
with asset_paths(name, local_image_path) as (values
  ('AK47', 'assets/img/weapons/ak47.png'),
  ('AN94', 'assets/img/weapons/an94.png'),
  ('AUG', 'assets/img/weapons/aug.png'),
  ('FAMAS', 'assets/img/weapons/famas.png'),
  ('G36', 'assets/img/weapons/g36.png'),
  ('Groza', 'assets/img/weapons/groza.png'),
  ('Kingfisher', 'assets/img/weapons/kingfisher.png'),
  ('M14', 'assets/img/weapons/m14.png'),
  ('M4A1', 'assets/img/weapons/m4a1.png'),
  ('PARAFAL', 'assets/img/weapons/parafal.png'),
  ('PLASMA', 'assets/img/weapons/plasma.png'),
  ('SCAR', 'assets/img/weapons/scar.png'),
  ('XM8', 'assets/img/weapons/xm8.png'),
  ('Treatment Laser Gun', 'assets/img/weapons/treatment-laser-gun.svg'),
  ('Shield Gun', 'assets/img/weapons/shield-gun.png'),
  ('Crossbow', 'assets/img/weapons/crossbow.svg'),
  ('M79', 'assets/img/weapons/m79.png'),
  ('MGL140', 'assets/img/weapons/mgl140.svg'),
  ('RGS-50', 'assets/img/weapons/rgs-50.png'),
  ('Gatling', 'assets/img/weapons/gatling.svg'),
  ('Kord', 'assets/img/weapons/kord.png'),
  ('M249', 'assets/img/weapons/m249.png'),
  ('M60', 'assets/img/weapons/m60.png'),
  ('AC80', 'assets/img/weapons/ac80.png'),
  ('SKS', 'assets/img/weapons/sks.png'),
  ('SVD', 'assets/img/weapons/svd.png'),
  ('Winchester', 'assets/img/weapons/winchester.png'),
  ('Woodpecker', 'assets/img/weapons/woodpecker.png'),
  ('Bat', 'assets/img/weapons/bat.png'),
  ('FF Knife', 'assets/img/weapons/ff-knife.svg'),
  ('Katana', 'assets/img/weapons/katana.png'),
  ('Pan', 'assets/img/weapons/pan.png'),
  ('Parang', 'assets/img/weapons/parang.png'),
  ('Scythe', 'assets/img/weapons/scythe.png'),
  ('Desert Eagle', 'assets/img/weapons/desert-eagle.png'),
  ('G18', 'assets/img/weapons/g18.png'),
  ('Hand Cannon', 'assets/img/weapons/hand-cannon.png'),
  ('M1873', 'assets/img/weapons/m1873.png'),
  ('M1917', 'assets/img/weapons/m1917.png'),
  ('M500', 'assets/img/weapons/m500.png'),
  ('USP', 'assets/img/weapons/usp.png'),
  ('USP-2', 'assets/img/weapons/usp-2.png'),
  ('UZI', 'assets/img/weapons/uzi.png'),
  ('FGL-24', 'assets/img/weapons/fgl-24.png'),
  ('Healing Pistol', 'assets/img/weapons/healing-pistol.png'),
  ('Flamethrower', 'assets/img/weapons/flamethrower.svg'),
  ('Flash Freeze', 'assets/img/weapons/flash-freeze.png'),
  ('Gloo Melter', 'assets/img/weapons/gloo-melter.png'),
  ('Gloo Wall', 'assets/img/weapons/gloo-wall.png'),
  ('Bizon', 'assets/img/weapons/bizon.png'),
  ('CG15', 'assets/img/weapons/cg15.svg'),
  ('MAC10', 'assets/img/weapons/mac10.png'),
  ('MP40', 'assets/img/weapons/mp40.png'),
  ('MP5', 'assets/img/weapons/mp5.png'),
  ('P90', 'assets/img/weapons/p90.png'),
  ('Thompson', 'assets/img/weapons/thompson.png'),
  ('UMP', 'assets/img/weapons/ump.png'),
  ('Vector', 'assets/img/weapons/vector.png'),
  ('VSS', 'assets/img/weapons/vss.png'),
  ('Charge Buster', 'assets/img/weapons/charge-buster.png'),
  ('M1014', 'assets/img/weapons/m1014.png'),
  ('M1887', 'assets/img/weapons/m1887.png'),
  ('M590', 'assets/img/weapons/m590.png'),
  ('MAG-7', 'assets/img/weapons/mag-7.png'),
  ('SPAS12', 'assets/img/weapons/spas12.png'),
  ('Trogon', 'assets/img/weapons/trogon.png'),
  ('AWM', 'assets/img/weapons/awm.png'),
  ('Healing Sniper', 'assets/img/weapons/healing-sniper.png'),
  ('Kar98k', 'assets/img/weapons/kar98k.png'),
  ('M24', 'assets/img/weapons/m24.png'),
  ('M82B', 'assets/img/weapons/m82b.png'),
  ('VSK94', 'assets/img/weapons/vsk94.png'),
  ('Hydro Blaster', 'assets/img/weapons/hydro-blaster.svg'),
  ('Grenade', 'assets/img/weapons/grenade.png'),
  ('Smoke Grenade', 'assets/img/weapons/smoke-grenade.png')
)
update public.ff_weapons t
set local_image_path = a.local_image_path
from asset_paths a
where lower(t.name) = lower(a.name);
insert into public.ff_team_logos (team_code, team_name, image_url, local_image_path, aliases, is_placeholder, raw_data) values
  ('AG', 'All Gamers', 'assets/logo/ag.png', 'assets/logo/ag.png', ARRAY['AG','All Gamers']::text[], false, '{"team_code":"AG","team_name":"All Gamers","image_url":"assets/logo/ag.png","remote_image_url":"","aliases":["AG","All Gamers"],"is_placeholder":false,"local_image_path":"assets/logo/ag.png"}'::jsonb),
  ('AHL', 'AHL', 'assets/logo/ahl.png', 'assets/logo/ahl.png', ARRAY['AHL']::text[], false, '{"team_code":"AHL","team_name":"AHL","image_url":"assets/logo/ahl.png","local_image_path":"assets/logo/ahl.png","remote_image_url":"","aliases":["AHL"],"is_placeholder":false}'::jsonb),
  ('AUR', 'AUR', 'assets/logo/aur.png', 'assets/logo/aur.png', ARRAY['AUR']::text[], false, '{"team_code":"AUR","team_name":"AUR","image_url":"assets/logo/aur.png","local_image_path":"assets/logo/aur.png","remote_image_url":"","aliases":["AUR"],"is_placeholder":false}'::jsonb),
  ('AVD', 'AVD', 'assets/logo/avd.png', 'assets/logo/avd.png', ARRAY['AVD']::text[], false, '{"team_code":"AVD","team_name":"AVD","image_url":"assets/logo/avd.png","local_image_path":"assets/logo/avd.png","remote_image_url":"","aliases":["AVD"],"is_placeholder":false}'::jsonb),
  ('BRU', 'Buriram United Esports', 'assets/logo/bru.png', 'assets/logo/bru.png', ARRAY['BRU','Buriram United Esports']::text[], false, '{"team_code":"BRU","team_name":"Buriram United Esports","image_url":"assets/logo/bru.png","remote_image_url":"","aliases":["BRU","Buriram United Esports"],"is_placeholder":false,"local_image_path":"assets/logo/bru.png"}'::jsonb),
  ('BTR', 'BTR', 'assets/logo/btr.png', 'assets/logo/btr.png', ARRAY['BTR']::text[], false, '{"team_code":"BTR","team_name":"BTR","image_url":"assets/logo/btr.png","local_image_path":"assets/logo/btr.png","remote_image_url":"","aliases":["BTR"],"is_placeholder":false}'::jsonb),
  ('CLVS', 'Corinthians Esports', 'assets/logo/clvs.svg', 'assets/logo/clvs.svg', ARRAY['CLVS','Corinthians Esports']::text[], true, '{"team_code":"CLVS","team_name":"Corinthians Esports","image_url":"assets/logo/clvs.svg","remote_image_url":"","aliases":["CLVS","Corinthians Esports"],"is_placeholder":true,"local_image_path":"assets/logo/clvs.svg"}'::jsonb),
  ('DP', 'DP', 'assets/logo/dp.png', 'assets/logo/dp.png', ARRAY['DP']::text[], false, '{"team_code":"DP","team_name":"DP","image_url":"assets/logo/dp.png","local_image_path":"assets/logo/dp.png","remote_image_url":"","aliases":["DP"],"is_placeholder":false}'::jsonb),
  ('DRS', 'DRS', 'assets/logo/drs.png', 'assets/logo/drs.png', ARRAY['DRS']::text[], false, '{"team_code":"DRS","team_name":"DRS","image_url":"assets/logo/drs.png","local_image_path":"assets/logo/drs.png","remote_image_url":"","aliases":["DRS"],"is_placeholder":false}'::jsonb),
  ('E1', 'E1 Sports', 'assets/logo/e1.svg', 'assets/logo/e1.svg', ARRAY['E1','E1 Sports']::text[], true, '{"team_code":"E1","team_name":"E1 Sports","image_url":"assets/logo/e1.svg","remote_image_url":"","aliases":["E1","E1 Sports"],"is_placeholder":true,"local_image_path":"assets/logo/e1.svg"}'::jsonb),
  ('EVOS', 'EVOS Divine', 'assets/logo/evos.png', 'assets/logo/evos.png', ARRAY['EVOS','EVOS Divine']::text[], false, '{"team_code":"EVOS","team_name":"EVOS Divine","image_url":"assets/logo/evos.png","remote_image_url":"","aliases":["EVOS","EVOS Divine"],"is_placeholder":false,"local_image_path":"assets/logo/evos.png"}'::jsonb),
  ('FF', 'FF', 'assets/logo/ff.png', 'assets/logo/ff.png', ARRAY['FF']::text[], false, '{"team_code":"FF","team_name":"FF","image_url":"assets/logo/ff.png","local_image_path":"assets/logo/ff.png","remote_image_url":"","aliases":["FF"],"is_placeholder":false}'::jsonb),
  ('FL', 'FL', 'assets/logo/fl.png', 'assets/logo/fl.png', ARRAY['FL']::text[], false, '{"team_code":"FL","team_name":"FL","image_url":"assets/logo/fl.png","local_image_path":"assets/logo/fl.png","remote_image_url":"","aliases":["FL"],"is_placeholder":false}'::jsonb),
  ('FLCN', 'Team Falcons', 'assets/logo/flcn.png', 'assets/logo/flcn.png', ARRAY['FLCN','Team Falcons']::text[], false, '{"team_code":"FLCN","team_name":"Team Falcons","image_url":"assets/logo/flcn.png","remote_image_url":"","aliases":["FLCN","Team Falcons"],"is_placeholder":false,"local_image_path":"assets/logo/flcn.png"}'::jsonb),
  ('FX', 'Fluxo', 'assets/logo/fx.png', 'assets/logo/fx.png', ARRAY['FX','Fluxo']::text[], false, '{"team_code":"FX","team_name":"Fluxo","image_url":"assets/logo/fx.png","remote_image_url":"","aliases":["FX","Fluxo"],"is_placeholder":false,"local_image_path":"assets/logo/fx.png"}'::jsonb),
  ('GOW', 'GOW Esports', 'assets/logo/gow.png', 'assets/logo/gow.png', ARRAY['GOW','GOW Esports']::text[], false, '{"team_code":"GOW","team_name":"GOW Esports","image_url":"assets/logo/gow.png","remote_image_url":"","aliases":["GOW","GOW Esports"],"is_placeholder":false,"local_image_path":"assets/logo/gow.png"}'::jsonb),
  ('HEV', 'Heavy', 'assets/logo/hev.png', 'assets/logo/hev.png', ARRAY['HEV','Heavy']::text[], false, '{"team_code":"HEV","team_name":"Heavy","image_url":"assets/logo/hev.png","remote_image_url":"","aliases":["HEV","Heavy"],"is_placeholder":false,"local_image_path":"assets/logo/hev.png"}'::jsonb),
  ('HS', 'Hotshot Esports', 'assets/logo/hs.svg', 'assets/logo/hs.svg', ARRAY['HS','Hotshot Esports']::text[], true, '{"team_code":"HS","team_name":"Hotshot Esports","image_url":"assets/logo/hs.svg","remote_image_url":"","aliases":["HS","Hotshot Esports"],"is_placeholder":true,"local_image_path":"assets/logo/hs.svg"}'::jsonb),
  ('LOUD', 'LOUD', 'assets/logo/loud.png', 'assets/logo/loud.png', ARRAY['LOUD']::text[], false, '{"team_code":"LOUD","team_name":"LOUD","image_url":"assets/logo/loud.png","local_image_path":"assets/logo/loud.png","remote_image_url":"","aliases":["LOUD"],"is_placeholder":false}'::jsonb),
  ('LYON', 'LYON', 'assets/logo/lyon.png', 'assets/logo/lyon.png', ARRAY['LYON']::text[], false, '{"team_code":"LYON","team_name":"LYON","image_url":"assets/logo/lyon.png","local_image_path":"assets/logo/lyon.png","remote_image_url":"","aliases":["LYON"],"is_placeholder":false}'::jsonb),
  ('MEC', 'MEC', 'assets/logo/mec.png', 'assets/logo/mec.png', ARRAY['MEC']::text[], false, '{"team_code":"MEC","team_name":"MEC","image_url":"assets/logo/mec.png","local_image_path":"assets/logo/mec.png","remote_image_url":"","aliases":["MEC"],"is_placeholder":false}'::jsonb),
  ('MIA', 'MIA', 'assets/logo/mia.png', 'assets/logo/mia.png', ARRAY['MIA']::text[], false, '{"team_code":"MIA","team_name":"MIA","image_url":"assets/logo/mia.png","local_image_path":"assets/logo/mia.png","remote_image_url":"","aliases":["MIA"],"is_placeholder":false}'::jsonb),
  ('MIBR', 'MIBR', 'assets/logo/mibr.png', 'assets/logo/mibr.png', ARRAY['MIBR']::text[], false, '{"team_code":"MIBR","team_name":"MIBR","image_url":"assets/logo/mibr.png","local_image_path":"assets/logo/mibr.png","remote_image_url":"","aliases":["MIBR"],"is_placeholder":false}'::jsonb),
  ('NVL', 'Nova Legion', 'assets/logo/nvl.svg', 'assets/logo/nvl.svg', ARRAY['NVL','Nova Legion']::text[], true, '{"team_code":"NVL","team_name":"Nova Legion","image_url":"assets/logo/nvl.svg","remote_image_url":"","aliases":["NVL","Nova Legion"],"is_placeholder":true,"local_image_path":"assets/logo/nvl.svg"}'::jsonb),
  ('ONIC', 'ONIC', 'assets/logo/onic.png', 'assets/logo/onic.png', ARRAY['ONIC']::text[], false, '{"team_code":"ONIC","team_name":"ONIC","image_url":"assets/logo/onic.png","local_image_path":"assets/logo/onic.png","remote_image_url":"","aliases":["ONIC"],"is_placeholder":false}'::jsonb),
  ('PDX', 'PDX', 'assets/logo/pdx.png', 'assets/logo/pdx.png', ARRAY['PDX']::text[], false, '{"team_code":"PDX","team_name":"PDX","image_url":"assets/logo/pdx.png","local_image_path":"assets/logo/pdx.png","remote_image_url":"","aliases":["PDX"],"is_placeholder":false}'::jsonb),
  ('PE', 'P Esports', 'assets/logo/pe.png', 'assets/logo/pe.png', ARRAY['PE','P Esports']::text[], false, '{"team_code":"PE","team_name":"P Esports","image_url":"assets/logo/pe.png","remote_image_url":"","aliases":["PE","P Esports"],"is_placeholder":false,"local_image_path":"assets/logo/pe.png"}'::jsonb),
  ('R7', 'R7 Esports', 'assets/logo/r7.svg', 'assets/logo/r7.svg', ARRAY['R7','R7 Esports']::text[], true, '{"team_code":"R7","team_name":"R7 Esports","image_url":"assets/logo/r7.svg","remote_image_url":"","aliases":["R7","R7 Esports"],"is_placeholder":true,"local_image_path":"assets/logo/r7.svg"}'::jsonb),
  ('RC', 'Red Canids', 'assets/logo/rc.svg', 'assets/logo/rc.svg', ARRAY['RC','Red Canids']::text[], true, '{"team_code":"RC","team_name":"Red Canids","image_url":"assets/logo/rc.svg","remote_image_url":"","aliases":["RC","Red Canids"],"is_placeholder":true,"local_image_path":"assets/logo/rc.svg"}'::jsonb),
  ('RHK', 'Rex Regum Hikari', 'assets/logo/rhk.svg', 'assets/logo/rhk.svg', ARRAY['RHK','Rex Regum Hikari']::text[], true, '{"team_code":"RHK","team_name":"Rex Regum Hikari","image_url":"assets/logo/rhk.svg","remote_image_url":"","aliases":["RHK","Rex Regum Hikari"],"is_placeholder":true,"local_image_path":"assets/logo/rhk.svg"}'::jsonb),
  ('RRQ', 'RRQ Kazu', 'assets/logo/rrq.png', 'assets/logo/rrq.png', ARRAY['RRQ','RRQ Kazu']::text[], false, '{"team_code":"RRQ","team_name":"RRQ Kazu","image_url":"assets/logo/rrq.png","remote_image_url":"","aliases":["RRQ","RRQ Kazu"],"is_placeholder":false,"local_image_path":"assets/logo/rrq.png"}'::jsonb),
  ('SE', 'SE', 'assets/logo/se.png', 'assets/logo/se.png', ARRAY['SE']::text[], false, '{"team_code":"SE","team_name":"SE","image_url":"assets/logo/se.png","local_image_path":"assets/logo/se.png","remote_image_url":"","aliases":["SE"],"is_placeholder":false}'::jsonb),
  ('SH', 'SH', 'assets/logo/sh.png', 'assets/logo/sh.png', ARRAY['SH']::text[], false, '{"team_code":"SH","team_name":"SH","image_url":"assets/logo/sh.png","local_image_path":"assets/logo/sh.png","remote_image_url":"","aliases":["SH"],"is_placeholder":false}'::jsonb),
  ('TEC', 'TEC', 'assets/logo/tec.png', 'assets/logo/tec.png', ARRAY['TEC']::text[], false, '{"team_code":"TEC","team_name":"TEC","image_url":"assets/logo/tec.png","local_image_path":"assets/logo/tec.png","remote_image_url":"","aliases":["TEC"],"is_placeholder":false}'::jsonb),
  ('TS', 'Team Solid', 'assets/logo/ts.svg', 'assets/logo/ts.svg', ARRAY['TS','Team Solid']::text[], true, '{"team_code":"TS","team_name":"Team Solid","image_url":"assets/logo/ts.svg","remote_image_url":"","aliases":["TS","Team Solid"],"is_placeholder":true,"local_image_path":"assets/logo/ts.svg"}'::jsonb),
  ('TWIS', 'TWIS', 'assets/logo/twis.png', 'assets/logo/twis.png', ARRAY['TWIS']::text[], false, '{"team_code":"TWIS","team_name":"TWIS","image_url":"assets/logo/twis.png","local_image_path":"assets/logo/twis.png","remote_image_url":"","aliases":["TWIS"],"is_placeholder":false}'::jsonb),
  ('WAG', 'WAG', 'assets/logo/wag.png', 'assets/logo/wag.png', ARRAY['WAG','WAG']::text[], false, '{"team_code":"WAG","team_name":"WAG","image_url":"assets/logo/wag.png","remote_image_url":"","aliases":["WAG","WAG"],"is_placeholder":false,"local_image_path":"assets/logo/wag.png"}'::jsonb)
on conflict (team_code) do update set
  team_name=excluded.team_name, image_url=excluded.image_url, local_image_path=excluded.local_image_path,
  aliases=excluded.aliases, is_placeholder=excluded.is_placeholder, raw_data=excluded.raw_data, updated_at=now();

commit;
