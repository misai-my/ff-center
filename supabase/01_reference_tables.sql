-- ============================================================================
-- Free Fire reference-data migration for Supabase / PostgreSQL
-- Generated from:
--   character.json  (64 records)
--   pet.json        (23 records)
--   loadout(2).json (4 records)
--   counter.json    (23 records)
--   weapon.json     (downloaded once during this migration from the current
--                    public repository source shown below)
--
-- Tables created:
--   public.ff_characters
--   public.ff_pets
--   public.ff_loadouts
--   public.ff_counters
--   public.ff_counter_matchups
--   public.ff_weapons
--
-- Safe to rerun: source rows are UPSERTED using stable keys.
-- Public/anonymous users receive SELECT only. Writes remain restricted to the
-- SQL editor, database owner, and service-role connections unless you add admin
-- write policies later.
-- ============================================================================

begin;

create schema if not exists extensions;
create extension if not exists http with schema extensions;

-- --------------------------------------------------------------------------
-- Shared updated_at trigger
-- --------------------------------------------------------------------------
create or replace function public.ff_reference_set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

-- --------------------------------------------------------------------------
-- Characters
-- --------------------------------------------------------------------------
create table if not exists public.ff_characters (
  api_id bigint primary key,
  name text not null unique,
  image_url text not null default '',
  skill text not null default '',
  description text not null default '',
  description_ms text not null default '',
  status text not null default '',
  skill_type text not null default '',
  role text not null default '',
  meta text not null default 'no',
  cs_meta text not null default 'no',
  is_meta boolean generated always as (lower(btrim(meta)) = 'yes') stored,
  is_cs_meta boolean generated always as (lower(btrim(cs_meta)) = 'yes') stored,
  sort_order integer not null default 0,
  raw_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ff_characters_name_lower_idx
  on public.ff_characters (lower(name));
create index if not exists ff_characters_skill_type_idx
  on public.ff_characters (skill_type);
create index if not exists ff_characters_role_idx
  on public.ff_characters (role);
create index if not exists ff_characters_meta_idx
  on public.ff_characters (is_meta, is_cs_meta);

-- --------------------------------------------------------------------------
-- Pets
-- --------------------------------------------------------------------------
create table if not exists public.ff_pets (
  name text primary key,
  image_url text not null default '',
  skill text not null default '',
  status text not null default '',
  skill_type text not null default 'Pet',
  role text not null default '',
  description text not null default '',
  description_ms text not null default '',
  sort_order integer not null default 0,
  raw_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ff_pets_name_lower_idx
  on public.ff_pets (lower(name));
create index if not exists ff_pets_role_idx
  on public.ff_pets (role);

-- --------------------------------------------------------------------------
-- Loadouts
-- Nested source fields remain JSONB so no BR/CS detail, cost item, gadget,
-- booster, image, or patch-history entry is lost.
-- --------------------------------------------------------------------------
create table if not exists public.ff_loadouts (
  id text primary key,
  name text not null unique,
  category text not null default 'Loadout',
  image_url text not null default '',
  fallback_image_url text,
  loadout_id text not null unique,
  tagline text,
  short_description text,
  description jsonb not null default '{}'::jsonb,
  description_ms jsonb not null default '{}'::jsonb,
  cost jsonb not null default '{}'::jsonb,
  patch_history jsonb not null default '[]'::jsonb,
  gadgets jsonb not null default '[]'::jsonb,
  images jsonb not null default '{}'::jsonb,
  boosters jsonb not null default '[]'::jsonb,
  logo_sources jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  raw_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ff_loadouts_name_lower_idx
  on public.ff_loadouts (lower(name));
create index if not exists ff_loadouts_loadout_id_idx
  on public.ff_loadouts (loadout_id);
create index if not exists ff_loadouts_description_gin_idx
  on public.ff_loadouts using gin (description);

-- --------------------------------------------------------------------------
-- Character counter summaries + normalized matchup rows
-- ff_counters.counters retains the original JSON array.
-- ff_counter_matchups makes individual counter relationships easy to query.
-- --------------------------------------------------------------------------
create table if not exists public.ff_counters (
  name text primary key,
  skill text not null default '',
  role text not null default '',
  description text not null default '',
  counter_category text not null default '',
  counters jsonb not null default '[]'::jsonb,
  sort_order integer not null default 0,
  raw_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ff_counter_matchups (
  id bigint generated by default as identity primary key,
  character_name text not null
    references public.ff_counters(name)
    on update cascade
    on delete cascade,
  counter_name text not null,
  counter_skill text not null default '',
  reason text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (character_name, counter_name)
);

create index if not exists ff_counters_name_lower_idx
  on public.ff_counters (lower(name));
create index if not exists ff_counters_role_idx
  on public.ff_counters (role);
create index if not exists ff_counter_matchups_counter_name_idx
  on public.ff_counter_matchups (counter_name);

-- --------------------------------------------------------------------------
-- Weapons
-- Several JSON values intentionally mix numbers and labels (for example
-- rate_of_fire may be 56 or "High", and range may be 72 or "Mid"). The source
-- values therefore stay as TEXT. Generated numeric columns are available for
-- sorting whenever a value is purely numeric.
-- --------------------------------------------------------------------------
create table if not exists public.ff_weapons (
  name text primary key,
  image_url text not null default '',
  type text not null default '',
  damage text not null default '',
  rate_of_fire text not null default '',
  "range" text not null default '',
  magazine_size text not null default '',
  special_attributes text not null default '',
  description text not null default '',
  clash_squad text not null default '',
  price text not null default '',
  armory text not null default '',
  aliases jsonb not null default '[]'::jsonb,
  attachments jsonb not null default '[]'::jsonb,
  recent_update jsonb not null default '[]'::jsonb,
  source_notes jsonb not null default '[]'::jsonb,
  last_verified date,
  data_confidence text not null default '',
  sources jsonb not null default '[]'::jsonb,
  is_clash_squad boolean generated always as (
    lower(btrim(clash_squad)) in ('cs', 'yes', 'true', '1')
  ) stored,
  damage_numeric numeric generated always as (
    case when btrim(damage) ~ '^-?[0-9]+([.][0-9]+)?$'
      then btrim(damage)::numeric else null end
  ) stored,
  rate_of_fire_numeric numeric generated always as (
    case when btrim(rate_of_fire) ~ '^-?[0-9]+([.][0-9]+)?$'
      then btrim(rate_of_fire)::numeric else null end
  ) stored,
  range_numeric numeric generated always as (
    case when btrim("range") ~ '^-?[0-9]+([.][0-9]+)?$'
      then btrim("range")::numeric else null end
  ) stored,
  magazine_size_numeric numeric generated always as (
    case when btrim(magazine_size) ~ '^-?[0-9]+([.][0-9]+)?$'
      then btrim(magazine_size)::numeric else null end
  ) stored,
  price_numeric numeric generated always as (
    case when btrim(price) ~ '^-?[0-9]+([.][0-9]+)?$'
      then btrim(price)::numeric else null end
  ) stored,
  sort_order integer not null default 0,
  raw_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ff_weapons_name_lower_idx
  on public.ff_weapons (lower(name));
create index if not exists ff_weapons_type_idx
  on public.ff_weapons (type);
create index if not exists ff_weapons_cs_idx
  on public.ff_weapons (is_clash_squad);
create index if not exists ff_weapons_price_numeric_idx
  on public.ff_weapons (price_numeric);
create index if not exists ff_weapons_aliases_gin_idx
  on public.ff_weapons using gin (aliases);
create index if not exists ff_weapons_attachments_gin_idx
  on public.ff_weapons using gin (attachments);

-- --------------------------------------------------------------------------
-- updated_at triggers
-- --------------------------------------------------------------------------
drop trigger if exists ff_characters_set_updated_at on public.ff_characters;
create trigger ff_characters_set_updated_at
before update on public.ff_characters
for each row execute function public.ff_reference_set_updated_at();

drop trigger if exists ff_pets_set_updated_at on public.ff_pets;
create trigger ff_pets_set_updated_at
before update on public.ff_pets
for each row execute function public.ff_reference_set_updated_at();

drop trigger if exists ff_loadouts_set_updated_at on public.ff_loadouts;
create trigger ff_loadouts_set_updated_at
before update on public.ff_loadouts
for each row execute function public.ff_reference_set_updated_at();

drop trigger if exists ff_counters_set_updated_at on public.ff_counters;
create trigger ff_counters_set_updated_at
before update on public.ff_counters
for each row execute function public.ff_reference_set_updated_at();

drop trigger if exists ff_counter_matchups_set_updated_at on public.ff_counter_matchups;
create trigger ff_counter_matchups_set_updated_at
before update on public.ff_counter_matchups
for each row execute function public.ff_reference_set_updated_at();

drop trigger if exists ff_weapons_set_updated_at on public.ff_weapons;
create trigger ff_weapons_set_updated_at
before update on public.ff_weapons
for each row execute function public.ff_reference_set_updated_at();

-- ============================================================================
-- Seed characters
-- ============================================================================
with source as (
  select item, ordinality::integer as sort_order
  from jsonb_array_elements(
$characters_json$
[
  {
    "name": "A124",
    "image_url": "https://i.imgur.com/xHoCTQm.png",
    "skill": "THRILL OF BATTLE",
    "description": "Active - 8m electromagnetic wave that disables enemy skills activation for 20s, inflicts 25 DMG. 75s cooldown",
    "description_ms": "Aktif - Gelombang elektromagnet 8m yang melumpuhkan pengaktifan kemahiran lawan selama 20 saat, memberikan 25 DMG. Cooldown 75 saat",
    "status": "",
    "skill_type": "Active",
    "role": "ATTACK",
    "meta": "yes",
    "cs_meta": "no",
    "api_id": 1901
  },
  {
    "name": "Alok",
    "image_url": "https://i.imgur.com/u5xch51.png",
    "skill": "DROP THAT BEAT",
    "description": "Active - Creates a 5m aura that increases movement speed by 15% and restores 5 HP per second for 10s. Effects do not stack. Cooldown 45s.",
    "description_ms": "Aktif - Mencipta aura 5m yang meningkatkan kelajuan pergerakan sebanyak 15% dan memulihkan 5 HP sesaat selama 10 saat. Kesan tidak bertindan. Cooldown 45 saat.",
    "status": "",
    "skill_type": "Active",
    "role": "SURVIVAL",
    "meta": "yes",
    "cs_meta": "no",
    "api_id": 2206
  },
  {
    "name": "Chrono",
    "image_url": "https://i.imgur.com/nOciCJx.png",
    "skill": "TIME TURNER",
    "description": "Active - Creates a 10sec force field that blocks 1000 damage. 60s Cooldown",
    "description_ms": "Aktif - Mencipta medan daya (force field) 10 saat yang menyekat 1000 damage. Cooldown 60 saat.",
    "status": "buffed",
    "skill_type": "Active",
    "role": "TEAM WORK",
    "meta": "yes",
    "cs_meta": "yes",
    "api_id": 3801
  },
  {
    "name": "Clu",
    "image_url": "https://i.imgur.com/rb0QZx7.png",
    "skill": "TRACING STEPS",
    "description": "Active - Locate positions of enemies within 80m who are not in prone or squat position. Lasts for 10s. Enemy positions are shared with teammates. Boosts movement speed by 10% while in effect. Cooldown: 455.",
    "description_ms": "Aktif - Cari kedudukan musuh dalam jarak 80m yang tidak berada dalam posisi meniarap atau mencangkung. Bertahan selama 10 saat. Kedudukan musuh dikongsi dengan rakan sepasukan. Meningkatkan kelajuan pergerakan sebanyak 10%. Cooldown: 455.",
    "status": "",
    "skill_type": "Active",
    "role": "INFO",
    "meta": "no",
    "cs_meta": "yes",
    "api_id": 3101
  },
  {
    "name": "Dimitri",
    "image_url": "https://i.imgur.com/13rPnSI.png",
    "skill": "HEALING HEARTBEAT",
    "description": "Active - Creates a 4m-diameter healing zone. Inside, user and allies recover 10HP/s. When downed, user and allies can self recover to get up. Lasts for 6s. Cooldown 75s.",
    "description_ms": "Aktif - Mencipta zon penyembuhan berdiameter 4m. Di dalam, pengguna dan rakan sepasukan memulihkan 10HP/s. Apabila ditumbangkan, pengguna dan rakan sepasukan boleh pulih sendiri / self-recover. Bertahan selama 6 saat. Tempoh penyejukan 75 saat.",
    "status": "buffed",
    "skill_type": "Active",
    "role": "TEAM WORK",
    "meta": "yes",
    "cs_meta": "no",
    "api_id": 4701
  },
  {
    "name": "Homer",
    "image_url": "https://i.imgur.com/ySk50DI.png",
    "skill": "SENSES SHOCKWAVE",
    "description": "Active - Releases a drone towards nearest enemy within 100m frontal distance creating a 5.5m diameter pulse which reduces movement speed by 40% and firing speed by 40% for 5s. 25 damage. 60s cooldown",
    "description_ms": "Aktif - Melepaskan dron ke arah musuh terdekat dalam jarak hadapan 100m, menghasilkan denyutan berdiameter 5.5m yang mengurangkan kelajuan pergerakan sebanyak 40% dan kelajuan menembak sebanyak 40% selama 5 saat. 25 damage. 60 saat cooldown.",
    "status": "buffed",
    "skill_type": "Active",
    "role": "INFO",
    "meta": "no",
    "cs_meta": "no",
    "api_id": 5501
  },
  {
    "name": "Ignis",
    "image_url": "https://i.imgur.com/tdPOAHI.png",
    "skill": "FLAME MIRAGE",
    "description": "Active - Deploys a 10m-wide flaming screen that lasts 10s and moves forward at 6m/s for up to 8s. While in effect, use the skill again to stop the screen. Enemies (or Gloo Walls) that get in touch with it will instantly take 25 (or 400) DMG, and then take 5 (or 100) DMG/s. Lasts 2s. Cooldown: 60s. Upto 2 skills can be stored with a 0.5s cooldown in between",
    "description_ms": "Aktif - Menggunakan skrin berapi selebar 10m yang bertahan selama 10 saat dan bergerak ke hadapan pada kelajuan 6m/s sehingga 8 saat. Apabila masih aktif, gunakan kemahiran ini sekali lagi untuk menghentikan skrin. Lawan (atau Dinding Gloo) yang menyentuhnya akan serta-merta mengambil 25 (atau 400) DMG, dan kemudian mengambil 5 (atau 100) DMG/s. Bertahan selama 2 saat. Cooldown: 60 saat. Boleh simpan sehingga 2 kemahiran, dengan tempoh penyejukan 0.5 saat di antara kedua-keduanya.",
    "status": "",
    "skill_type": "Active",
    "role": "ATTACK",
    "meta": "no",
    "cs_meta": "yes",
    "api_id": 6706
  },
  {
    "name": "Iris",
    "image_url": "https://i.imgur.com/SVvmZnM.png",
    "skill": "WALL BRAWL",
    "description": "Active - For 15s, firing at gloo will mark enemies within 7m and penetrate gloo to damage marked enemies. Max 5 gloo walls. 60s cooldown",
    "description_ms": "Aktif - Selama 15 saat, menembak gloo akan menandakan lawan dalam jarak 7m dan menembusi gloo untuk menyebabkan damage kepada lawan tersebut. Maksimum 5 dinding gloo. Cooldown 60 saat",
    "status": "",
    "skill_type": "Active",
    "role": "INFO",
    "meta": "no",
    "cs_meta": "yes",
    "api_id": 5601
  },
  {
    "name": "K",
    "image_url": "https://i.imgur.com/Xq8oACe.png",
    "skill": "MASTER OF ALL",
    "description": "Active - Max. EP increases by 50. \n \n Jiu-jitsu Mode: Allies within 15m get 600% increase in EP conversion rate. \n \n Psychology Mode: Recover 3 EP every 1s, up to 250 EP. \n \n Mode switch Cooldown: 6s.",
    "description_ms": "Aktif - EP maksimum meningkat sebanyak 50.\n \n Mod Jiu-jitsu: kadar penukaran EP rakan sepasukan dalam lingkungan 15m meningkat 600% \n \n Mod Psikologi: Pulihkan 3 EP setiap 1 saat, sehingga 250 EP.\n \n Mode switch cooldown: 6 saat.",
    "status": "",
    "skill_type": "Active",
    "role": "SURVIVAL",
    "meta": "no",
    "cs_meta": "no",
    "api_id": 3401
  },
  {
    "name": "Kassie",
    "image_url": "https://i.imgur.com/Ya0dxi1.png",
    "skill": "BASIC THERAPY / FOCUSED THERAPY",
    "description": "Active - Basic Therapy (no cooldown): Tap to create a 50m max healing bond with a teammate, restoring 3 HP/s for both. The bond breaks if the range is exceeded or can be manually canceled.\n \n Focused Therapy: Tap again to instantly restore 120 HP to the target (The skill will be auto-released while target's HP is below 50. Healing amount will be 80% when used manually.)\n \n  Cooldown: 45s.",
    "description_ms": "Aktif - Terapi Asas (tiada cooldown): Ketik untuk mencipta ikatan penyembuhan maksimum 50m dengan rakan sepasukan, memulihkan 3 HP/s untuk kedua-duanya. Ikatan tersebut akan putus jika julat tersebut dilampaui atau boleh dibatalkan secara manual.\n \n Terapi Fokus: Ketik sekali lagi untuk memulihkan 120 HP kepada sasaran serta-merta (Kemahiran ini akan dikeluarkan secara automatik semasa HP sasaran berada di bawah 50. Jumlah penyembuhan akan menjadi 80% apabila digunakan secara manual.)\n \n Coolingdown: 45s.",
    "status": "",
    "skill_type": "Active",
    "role": "TEAM WORK",
    "meta": "yes",
    "cs_meta": "yes",
    "api_id": 7006
  },
  {
    "name": "Kenta",
    "image_url": "https://i.imgur.com/6S0svrf.png",
    "skill": "SWORDSMAN'S WRATH",
    "description": "Active - Forms a shield of 5m width that reduces 60% weapon damage coming from the front. \n \n When firing, the shield's damage reduction reduces to 20%. Lasts for 5s. Cooldown: 70s.",
    "description_ms": "Aktif - Membentuk perisai selebar 5m yang mengurangkan 60% kerosakan senjata yang datang dari hadapan.\n \n Apabila menembak, pengurangan kerosakan perisai berkurangan kepada 20%. Bertahan selama 5 saat. Tempoh Penyejukan: 70 saat.",
    "status": "",
    "skill_type": "Active",
    "role": "SURVIVAL",
    "meta": "no",
    "cs_meta": "no",
    "api_id": 5401
  },
  {
    "name": "Koda",
    "image_url": "https://i.imgur.com/COE3DRg.png",
    "skill": "AURORA VISION",
    "description": "Active - Activates the Aurora power for 8s. Increases movement speed by 15% and discovers enemies behind cover within 50m every 1s (unable to detect those crouching or prone). Cooldown: 45s. (While parachuting, highlights enemy locations within the field of view but the effect is not shared with teammates.)",
    "description_ms": "Aktif - Mengaktifkan kuasa Aurora selama 8 saat. Meningkatkan kelajuan pergerakan sebanyak 15% dan menemui musuh di sebalik perlindungan dalam jarak 50m setiap 1 saat (tidak dapat mengesan mereka yang sedang mencangkung atau meniarap). Tempoh Penyejukan: 45 saat. (Semasa terjun payung, menonjolkan lokasi musuh dalam medan pandangan tetapi kesannya tidak dikongsi dengan rakan sepasukan.)",
    "status": "",
    "skill_type": "Active",
    "role": "SURVIVAL",
    "meta": "yes",
    "cs_meta": "yes",
    "api_id": 7206
  },
  {
    "name": "Morse",
    "image_url": "https://i.imgur.com/b7KHp6d.png",
    "skill": "STEALTH BYTES",
    "description": "Active - Enters the Stealth mode, during which the user is hard to be seen by enemies beyond 16m, cannot be detected by enemies, and gains a 20% speed boost. Meanwhile, aim assist will be triggered if there are enemies within 4m. Lasts up to 15s. While stealthed, the user cannot fire. Exiting Stealth has a 1s delay. Cooldowns: 45s.",
    "description_ms": "Aktif - Memasuki mod Stealth, di mana pengguna sukar dilihat oleh musuh melebihi 16m, tidak dapat dikesan oleh musuh, dan memperoleh peningkatan kelajuan 20%. Sementara itu, aim assist akan dicetuskan jika terdapat musuh dalam jarak 4m. Tahan sehingga 15s. Semasa disembunyikan, pengguna tidak boleh menembak. Keluar dari Stealth mempunyai kelewatan 1s. Tenang: 45s.",
    "status": "",
    "skill_type": "Active",
    "role": "SURVIVAL",
    "meta": "yes",
    "cs_meta": "no",
    "api_id": 7706
  },
  {
    "name": "Nero",
    "image_url": "https://i.imgur.com/p7gQoSG.png",
    "skill": "CRYO MIND",
    "description": "Active - Throws a 150-HP plushie. The plushie lasts for 12s, ignores any obstacles and can fly up to 50m (100m in BR). The plushie will track the nearest enemy in sight within 8m range and explode to create an 8m-radius dreamy space. Inside the space, the user and their enemies cannot place Gloo Walls. Their enemies also lose 10 HP/s (prev 14HP/s). The space disappears once the plushie is destroyed. The destroyer will be marked for 5s. Cooldown: 45s.",
    "description_ms": "Aktif - Melemparkan boneka 150-HP. Boneka ini bertahan selama 12 saat, mengabaikan sebarang halangan dan boleh terbang sehingga 50m (100m dalam BR). Boneka ini akan menjejaki musuh terdekat yang kelihatan dalam jarak 8m dan meletup untuk mewujudkan ruang impian berjejari 8m. Di dalam ruang tersebut, pengguna dan musuh mereka tidak boleh meletakkan Dinding Gloo. Musuh mereka juga kehilangan 10 HP/s (prev 14HP/s). Ruang tersebut hilang sebaik sahaja boneka dimusnahkan. Pemusnah akan ditanda selama 5 saat. Tempoh Sejuk: 45 saat.",
    "status": "",
    "skill_type": "Active",
    "role": "ATTACK",
    "meta": "yes",
    "cs_meta": "yes",
    "api_id": 7606
  },
  {
    "name": "Orion",
    "image_url": "https://i.imgur.com/icFg0cY.png",
    "skill": "CRIMSON CRUSH",
    "description": "Active - Replaces EP with 300 Crimson Energy. Consumes 200 Crimson Energy to activate its protection, during which you cannot take damage or attack enemies and will absorb 10 HP (ignoring enemy Shield Points) from foes within 5m. Lasts for 3s, during which your movement speed will decrease by 5%. Cooldown: 3s.",
    "description_ms": "Aktif - Menggantikan EP dengan 300 Tenaga Crimson. Menggunakan 200 Tenaga Crimson untuk mengaktifkan perlindungannya, di mana anda tidak boleh menerima kerosakan atau menyerang musuh dan akan menyerap 10 HP (mengabaikan Mata Perisai musuh) daripada musuh dalam jarak 5m. Bertahan selama 3 saat, di mana kelajuan pergerakan anda akan berkurangan sebanyak 5%. Tempoh Penyejukan: 3 saat.",
    "status": "",
    "skill_type": "Active",
    "role": "SURVIVAL",
    "meta": "no",
    "cs_meta": "yes",
    "api_id": 6201
  },
  {
    "name": "Oscar",
    "image_url": "https://i.imgur.com/Q5T5FRN.png",
    "skill": "VALIANT DASH",
    "description": "Active - Dashes towards the target direction, detonating the first 3 Gloo Walls in the way with 25 DMG, while also dealing 25 DMG to and knocking back enemies encountered. Cooldown: 45s",
    "description_ms": "Aktif - Berlari ke arah sasaran, meletupkan 3 Dinding Gloo pertama yang menghalang dengan 25 DMG, sambil turut memberikan 25 DMG dan menjatuhkan musuh yang ditemui. Tempoh Penyejukan: 45 saat",
    "status": "",
    "skill_type": "Active",
    "role": "ATTACK",
    "meta": "yes",
    "cs_meta": "yes",
    "api_id": 7406
  },
  {
    "name": "Ray",
    "image_url": "https://i.imgur.com/exkI81x.png",
    "skill": "BOND OF ECLIPSE",
    "description": "Active - Releases the sunpower forward in a 30m fan-shaped range to tag the first undowned enemy hit for 10s and creates a link with them (visible in 40m to only the skill user and their tagged enemy). If the user reduces the tagged enemy's HP to 30 (prev 40) or below, the enemy is knocked down instantly. If the enemy is knocked down or eliminated while tagged, moonpower will reset the skill and restore the user's HP by 10/s for 3s in total. Cooldown: 45s.",
    "description_ms": "Aktif - Melepaskan kuasa matahari ke hadapan dalam jarak 30m berbentuk kipas untuk menandai serangan musuh yang tidak dimiliki pertama selama 10s dan mencipta pautan dengan mereka (kelihatan dalam 40m hanya kepada pengguna kemahiran dan musuh mereka yang ditandai). Jika pengguna mengurangkan HP musuh yang ditag kepada 30 (prev 40) atau ke bawah, musuh akan ditumbangkan serta-merta. Jika musuh ditumbangkan atau disingkirkan semasa ditandakan, moonpower akan menetapkan semula kemahiran dan memulihkan HP pengguna sebanyak 10/s untuk 3s secara keseluruhan. Sejuk: 45s.",
    "status": "",
    "skill_type": "Active",
    "role": "ATTACK",
    "meta": "yes",
    "cs_meta": "yes",
    "api_id": 7806
  },
  {
    "name": "Ryden",
    "image_url": "https://i.imgur.com/UvI83b8.png",
    "skill": "SPIDER TRAP",
    "description": "Active - Release a destructible explosive spider in the target direction, lasting for 60s. Tap on the skill button again within 10s to stop the spider's movement. The spider will catch the first enemy it spotted within 5m, reduce their speed by 80% and cause them to lose 10 HP/s. Skill effects last for 4s. Cooldown: 60s. 2 skills can be used with 10s between.",
    "description_ms": "Aktif - Lepaskan labah-labah letupan yang boleh dimusnahkan ke arah sasaran, selama 60 saat. Ketik butang kemahiran sekali lagi dalam masa 10 saat untuk menghentikan pergerakan labah-labah. Labah-labah akan menangkap musuh pertama yang ditemuinya dalam jarak 5m, mengurangkan kelajuan mereka sebanyak 80% dan menyebabkan mereka kehilangan 10 HP/s. Kesan kemahiran berlangsung selama 4 saat. Tempoh Penyejukan: 60 saat. 2 kemahiran boleh digunakan dengan jarak 10 saat antara satu sama lain.",
    "status": "",
    "skill_type": "Active",
    "role": "ATTACK",
    "meta": "no",
    "cs_meta": "no",
    "api_id": 6806
  },
  {
    "name": "Santino",
    "image_url": "https://i.imgur.com/kfDV961.png",
    "skill": "SHAPE SPLITTER",
    "description": "Active - Spawn a 200 HP mannequin that autonomously travels for 25s. When the mannequin is within 90m, use the skill again to switch positions with it. You can only switch once within 3s, up to 2 time(s) in total. The player who destroys the mannequin will be marked for 5s. Cooldown: 60s. **Teleport height restriction (cannot teleport when the mannequin is 10m higher than the user)**",
    "description_ms": "Aktif - Melahirkan manekin 200 HP yang bergerak secara autonomi selama 25 saat. Apabila manekin berada dalam jarak 90m, gunakan kemahiran itu sekali lagi untuk bertukar posisi dengannya. Anda hanya boleh bertukar sekali dalam masa 3 saat, sehingga 2 kali secara keseluruhan. Pemain yang memusnahkan manekin akan ditanda selama 5 saat. Tempoh Penyejukan: 60 saat. **Sekatan ketinggian Teleport (tidak boleh teleport apabila manekin 10m lebih tinggi daripada pengguna)**",
    "status": "",
    "skill_type": "Active",
    "role": "SURVIVAL",
    "meta": "yes",
    "cs_meta": "yes",
    "api_id": 6001
  },
  {
    "name": "Skyler",
    "image_url": "https://i.imgur.com/f0H8bdb.png",
    "skill": "RIPTIDE RHYTHM",
    "description": "Active - Unleashes a sonic wave forward for up to 100m. \n \n When hitting an obstacle, the wave will explode and deal 500 DMG/s to Gloo Walls within 4m. \n \n Lasts 6s Cooldown: 45s. Up to 2 skill charges can be stored. Gloo Walls > 5m away is auto aimed.",
    "description_ms": "Aktif - Melepaskan gelombang sonik ke hadapan sehingga 100m.\n \n Apabila terkena halangan, gelombang akan meletup dan memberikan 500 DMG/s kepada Dinding Gloo dalam masa 4m.\n \n Bertahan selama 6 saat. Tempoh Penyejukan: 45 saat. Sehingga 2 cas kemahiran boleh disimpan. Dinding Gloo yang berada > 5m jauhnya disasarkan secara automatik.",
    "status": "",
    "skill_type": "Active",
    "role": "ATTACK",
    "meta": "yes",
    "cs_meta": "no",
    "api_id": 4001
  },
  {
    "name": "Steffie",
    "image_url": "https://i.imgur.com/f2PQFdX.png",
    "skill": "PAINTED REFUGE",
    "description": "Active - Creates 4m area where throwables are invalid. Allies in area will restore 10% armor every second and damage from ammo reduce by 20%. Lasts for 15s. 60s cooldown",
    "description_ms": "Aktif - Mencipta kawasan 4m di mana barang boleh lemparan tidak sah. Sekutu di kawasan tersebut akan memulihkan 10% perisai setiap saat dan kerosakan daripada peluru berkurangan sebanyak 20%. Bertahan selama 15 saat. Cooldown 60 saat.",
    "status": "",
    "skill_type": "Active",
    "role": "TEAM WORK",
    "meta": "yes",
    "cs_meta": "yes",
    "api_id": 2601
  },
  {
    "name": "Tatsuya",
    "image_url": "https://i.imgur.com/i9fECS9.png",
    "skill": "REBEL RUSH",
    "description": "Active - Dashes forward at a rapid speed for 0.3s and resets the cooldown by knocking down enemies. Dash replenish time: 90s (before 120).",
    "description_ms": "Aktif - Melumpat ke hadapan pada kelajuan pantas selama 0.3 saat dan menetapkan semula cooldown dengan menjatuhkan musuh. Masa pengisian semula melontar: 90 saat.",
    "status": "",
    "skill_type": "Active",
    "role": "SURVIVAL",
    "meta": "yes",
    "cs_meta": "no",
    "api_id": 5801
  },
  {
    "name": "Wukong",
    "image_url": "https://i.imgur.com/LxZHoRW.png",
    "skill": "CAMOUFLAGE",
    "description": "Active - Transforms into a bush with 10% reduction in movement speed, that lasts for 10s. Cooldown: 90s (before 120). \n \n Transformation ends when Wukong attacks. CD resets when Wukong takes down an enemy.",
    "description_ms": "Aktif - Berubah menjadi semak dengan pengurangan kelajuan pergerakan sebanyak 10%, yang berlangsung selama 10 saat. Tempoh Penyejukan: 90 saat.\n \n Transformasi berakhir apabila Wukong menyerang. CD ditetapkan semula apabila Wukong menjatuhkan musuh.",
    "status": "",
    "skill_type": "Active",
    "role": "SURVIVAL",
    "meta": "no",
    "cs_meta": "no",
    "api_id": 1201
  },
  {
    "name": "Xayne",
    "image_url": "https://i.imgur.com/zTvHTlu.png",
    "skill": "XTREME ENCOUNTER",
    "description": "Active - Enters Xtreme state and instantly obtains 70 (before 50) temporary Shield Points for 12s during which each knochdown of an enemy restores the temporary Shield Points gained through this skill back to 50 and resets the state duration. Once state ends, the Shield Points earned from this process will be removed. Cooldown: 75s.",
    "description_ms": "Aktif - Memasuki keadaan Xtreme dan serta-merta memperoleh 70 Mata Perisai sementara selama 12 saat di mana setiap tumbukan musuh akan mengembalikan Mata Perisai sementara yang diperoleh melalui kemahiran ini kembali kepada 50 dan menetapkan semula tempoh keadaan. Setelah keadaan tamat, Mata Perisai yang diperoleh daripada proses ini akan dialih keluar. Tempoh Penyejukan: 75 saat.",
    "status": "",
    "skill_type": "Active",
    "role": "SURVIVAL",
    "meta": "no",
    "cs_meta": "yes",
    "api_id": 4401
  },
  {
    "name": "Alvaro",
    "image_url": "https://i.imgur.com/BjxSoDK.png",
    "skill": "SPLIT BLITZ",
    "description": "Passive - Damage of explosive increase by 25% (Buffed: 20% ‚Üí 25%) and range increases by 10%. Each grenade will split into 3 mini grenades after explosion, dealing 25% damage of the original grenade.",
    "description_ms": "Pasif - Kerosakan akibat letupan meningkat sebanyak 25% (Ditingkatkan: 20% ‚Üí 25%) dan jarak serangan meningkat sebanyak 10%. Setiap bom tangan akan berpecah kepada 3 bom tangan mini selepas letupan, mengakibatkan kerosakan 25% daripada bom tangan asal.",
    "status": "",
    "skill_type": "Passive",
    "role": "ATTACK",
    "meta": "yes",
    "cs_meta": "no",
    "api_id": 2306
  },
  {
    "name": "Andrew",
    "image_url": "https://i.imgur.com/s9bFMQZ.png",
    "skill": "WOLF PACK",
    "description": "Passive - Armor durability loss decreases by 40% and armor DMG reduction increases by 4%. Obtains 1% DMG reduction bonus for each teammate present within 15m.",
    "description_ms": "Pasif - Kehilangan ketahanan perisai berkurangan sebanyak 40% dan pengurangan DMG perisai meningkat sebanyak 4%. Memperoleh bonus pengurangan DMG 1% untuk setiap rakan sepasukan yang berada dalam lingkungan 15m.",
    "status": "",
    "skill_type": "Passive",
    "role": "SURVIVAL",
    "meta": "no",
    "cs_meta": "no",
    "api_id": 4206
  },
  {
    "name": "Antonio",
    "image_url": "https://i.imgur.com/kOAxVZS.png",
    "skill": "GANSTER SPIRIT",
    "description": "Passive - Gets 20 extra shield point at the start of match and recovers sheild points after surviving combat",
    "description_ms": "Pasif - Mendapat 20 mata perisai tambahan pada permulaan perlawanan dan mendapatkan semula mata perisai selepas terselamat dalam pertempuran",
    "status": "",
    "skill_type": "Passive",
    "role": "SURVIVAL",
    "meta": "no",
    "cs_meta": "yes",
    "api_id": 1301
  },
  {
    "name": "Caroline",
    "image_url": "https://i.imgur.com/0hEEZlL.png",
    "skill": "AGILITY",
    "description": "Passive - When holding a shotgun, movement speed increase by 16%",
    "description_ms": "Pasif - Apabila memegang senapang patah, kelajuan pergerakan meningkat sebanyak 16%",
    "status": "",
    "skill_type": "Passive",
    "role": "SURVIVAL",
    "meta": "no",
    "cs_meta": "no",
    "api_id": 1101
  },
  {
    "name": "D-Bee",
    "image_url": "https://i.imgur.com/sqG0U3u.png",
    "skill": "BULLET BEATS",
    "description": "Passive - When firing while moving, movement speed increases by 50%, accuracy increases by 60%",
    "description_ms": "Pasif - Apabila menembak sambil bergerak, kelajuan pergerakan meningkat sebanyak 50%, ketepatan meningkat sebanyak 60%",
    "status": "",
    "skill_type": "Passive",
    "role": "ATTACK",
    "meta": "no",
    "cs_meta": "no",
    "api_id": 4501
  },
  {
    "name": "Dasha",
    "image_url": "https://i.imgur.com/loOR3hg.png",
    "skill": "PARTYING ON",
    "description": "Passive - After knocking down an enemy, enter Highlight Mode, which gain an 18% increase in fire rate and 12% in movement speed for 6s. Continuous knockdowns reset the timer and further boost fire rate by 4% and movement speed by 3%.",
    "description_ms": "Pasif - Selepas menjatuhkan musuh, masuk ke Mod Sorotan, yang akan meningkatkan kadar tembakan sebanyak 18% dan kelajuan pergerakan sebanyak 12% selama 6 saat. Serangan berterusan akan menetapkan semula pemasa dan seterusnya meningkatkan kadar tembakan sebanyak 4% dan kelajuan pergerakan sebanyak 3%.",
    "status": "",
    "skill_type": "Passive",
    "role": "ATTACK",
    "meta": "no",
    "cs_meta": "no",
    "api_id": 3501
  },
  {
    "name": "Ford",
    "image_url": "https://i.imgur.com/9LWbDNP.png",
    "skill": "IRON WILL",
    "description": "Passive - Gain 10 HP/s for 3s (previously 4) when taking damage. After releasing an active skill, this passive skill will reset immediately. Cooldown: 20s.",
    "description_ms": "Pasif - Dapatkan 10 HP/s selama 3 saat (sebelum ini 4) apabila menerima kerosakan. Selepas melepaskan kemahiran aktif, kemahiran pasif ini akan ditetapkan semula serta-merta. Tempoh Penyejukan: 20 saat.",
    "status": "",
    "skill_type": "Passive",
    "role": "SURVIVAL",
    "meta": "no",
    "cs_meta": "yes",
    "api_id": 301
  },
  {
    "name": "Hayato",
    "image_url": "https://i.imgur.com/R9CggPC.png",
    "skill": "BUSHIDO",
    "description": "Passive - Every 10% HP lost, armor penetration increases by 3.5% and frontal DMG taken decreases by 2%.",
    "description_ms": "Pasif - Setiap 10% HP yang hilang, penembusan perisai meningkat sebanyak 3.5% dan DMG hadapan yang diambil berkurangan sebanyak 2%.",
    "status": "",
    "skill_type": "Passive",
    "role": "ATTACK",
    "meta": "no",
    "cs_meta": "no",
    "api_id": 1506
  },
  {
    "name": "J.Biebs",
    "image_url": "https://i.imgur.com/nJsGTtn.png",
    "skill": "SILENT SENTINEL",
    "description": "Passive - User and allies within 15m can block 8% damage using EP. In this case, the amount of EP deducted from allies will be added to the skill user's EP.",
    "description_ms": "Pasif - Pengguna dan sekutu dalam jarak 15m boleh menyekat kerosakan 8% menggunakan EP. Dalam kes ini, jumlah EP yang ditolak daripada sekutu akan ditambah kepada EP pengguna kemahiran.",
    "status": "",
    "skill_type": "Passive",
    "role": "SURVIVAL",
    "meta": "yes",
    "cs_meta": "yes",
    "api_id": 5701
  },
  {
    "name": "Jai",
    "image_url": "https://i.imgur.com/h3AX0sw.png",
    "skill": "RAGING RELOAD",
    "description": "Passive - After knocking down an enemy or using an active skill, 100% of the gun's magazine reloads automatically",
    "description_ms": "Pasif - Selepas menjatuhkan musuh atau menggunakan kemahiran aktif, 100% magasin senjata akan dimuat semula secara automatik",
    "status": "",
    "skill_type": "Passive",
    "role": "ATTACK",
    "meta": "no",
    "cs_meta": "no",
    "api_id": 3301
  },
  {
    "name": "Joseph",
    "image_url": "https://i.imgur.com/lFp1NEL.png",
    "skill": "SILVER SPOON",
    "description": "Passive - Become immune from disruptive effects (e.g. slowdown, marking, skill-silencing) and have a 10% movement speed boost for 55. Cooldown: 45s.",
    "description_ms": "Pasif - Menjadi kebal daripada kesan gangguan (cth. perlambatan, penandaan, penyenyapan kemahiran) dan mempunyai peningkatan kelajuan pergerakan 10% selama 55. Tempoh Penyejukan: 45 saat.",
    "status": "",
    "skill_type": "Passive",
    "role": "SURVIVAL",
    "meta": "yes",
    "cs_meta": "yes",
    "api_id": 2001
  },
  {
    "name": "Jota",
    "image_url": "https://i.imgur.com/QLjDhkY.png",
    "skill": "SUSTAINED RAIDS",
    "description": "Passive - When the skill user is using guns, hitting an enemy recovers some HP and knocking down an enemy recovers 20% HP",
    "description_ms": "Pasif - Apabila pengguna kemahiran menggunakan senjata, memukul musuh akan memulihkan sedikit HP dan menjatuhkan musuh akan memulihkan 20% HP.",
    "status": "",
    "skill_type": "Passive",
    "role": "ATTACK",
    "meta": "no",
    "cs_meta": "no",
    "api_id": 2701
  },
  {
    "name": "Kairos",
    "image_url": "https://i.imgur.com/h89p30Y.png",
    "skill": "DEFENSE BREAKER",
    "description": "Passive - Defense Mode: Automatically recovers 2 EP/s until full.\n \n Breaker Mode: Activates with full EP when hitting shielded/armored enemies, consuming 20 EP/s (Nerfed:10 EP/s ‚Üí 20 EP/s). Each hit reduces their Shield Points or Armor Durability by 90% (previously 120%) of the damage dealt. Returns to Defense Mode when EP reaches 0.",
    "description_ms": "Pasif - Mod Pertahanan: Memulihkan 2 EP/s secara automatik sehingga penuh.\n \n Mod Pemutus: Aktif dengan EP penuh apabila mengenai musuh yang dilindungi/diperisai, menggunakan 20 EP/s (Nerfed:10 EP/s ‚Üí 20 EP/s). Setiap serangan mengurangkan Mata Perisai atau Ketahanan Perisai mereka sebanyak 90% (sebelum ini 120%) daripada kerosakan yang dikenakan. Kembali ke Mod Pertahanan apabila EP mencapai 0.",
    "status": "",
    "skill_type": "Passive",
    "role": "ATTACK",
    "meta": "no",
    "cs_meta": "no",
    "api_id": 6906
  },
  {
    "name": "Kapella",
    "image_url": "https://i.imgur.com/0xIQbAa.png",
    "skill": "REMEDY ROUNDS",
    "description": "Passive - Heal teammates with ammo by 20% of the damage dealt. When using a Heal Pistol, increase healing effects by 20%.",
    "description_ms": "Pasif - Sembuhkan rakan sepasukan dengan peluru sebanyak 20% daripada kerosakan yang dikenakan. Apabila menggunakan Pistol Sembuh, tingkatkan kesan penyembuhan sebanyak 20%.",
    "status": "",
    "skill_type": "Passive",
    "role": "TEAM WORK",
    "meta": "no",
    "cs_meta": "no",
    "api_id": 2801
  },
  {
    "name": "Kelly",
    "image_url": "https://i.imgur.com/St3HV3s.png",
    "skill": "DASH",
    "description": "Passive - Sprinting speed increases by 6%. After sprinting for 4s, damage of the first 1 shot landed increases to 106%.",
    "description_ms": "Pasif - Kelajuan pecutan meningkat sebanyak 6%. Selepas pecutan selama 4 saat, kerosakan 1 tembakan pertama yang mendarat meningkat kepada 106%.",
    "status": "",
    "skill_type": "Passive",
    "role": "SURVIVAL",
    "meta": "no",
    "cs_meta": "yes",
    "api_id": 2506
  },
  {
    "name": "Kla",
    "image_url": "https://i.imgur.com/mOAMXaH.png",
    "skill": "MUAY THAI",
    "description": "Passive - Fist damage increase by 400%",
    "description_ms": "Pasif - Kerosakan penumbuk meningkat sebanyak 400%",
    "status": "",
    "skill_type": "Passive",
    "role": "ATTACK",
    "meta": "no",
    "cs_meta": "no",
    "api_id": 801
  },
  {
    "name": "Laura",
    "image_url": "https://i.imgur.com/wsFhbfY.png",
    "skill": "SHARP SHOOTER",
    "description": "Passive - Accuracy increases by 60% (Buffed: 50% ‚Üí 60%) when scoped in",
    "description_ms": "Pasif - Ketepatan meningkat sebanyak 60% (Ditingkatkan: 50% ‚Üí 60%) apabila diliputi dalam",
    "status": "",
    "skill_type": "Passive",
    "role": "ATTACK",
    "meta": "no",
    "cs_meta": "no",
    "api_id": 1701
  },
  {
    "name": "Leon",
    "image_url": "https://i.imgur.com/A8bpTFX.png",
    "skill": "BUZZER BEATER",
    "description": "Passive - 4s after being attacked, recover 4HP/s for 15s",
    "description_ms": "Pasif - 4 saat selepas diserang, pulihkan 4HP/s selama 15 saat",
    "status": "",
    "skill_type": "Passive",
    "role": "SURVIVAL",
    "meta": "no",
    "cs_meta": "no",
    "api_id": 4901
  },
  {
    "name": "Lila",
    "image_url": "https://i.imgur.com/H9hq2iX.png",
    "skill": "GLOO STRIKE",
    "description": "Passive - When Lila hits an enemy or a vehicle with an assault and marksman rifle, the enemy‚'s movement slows down by 10% or the vehicle's movement speed by 80% for 3 secs. If the enemy is knocked down while decelerated, freezes them for upto 3s and obtains 2 extra Gloo Wall.",
    "description_ms": "Pasif - Apabila Lila mengenai musuh atau kenderaan dengan senapang serangan dan penembak tepat, pergerakan musuh akan menjadi perlahan sebanyak 10% atau kelajuan pergerakan kenderaan sebanyak 80% selama 3 saat. Jika musuh dilanggar semasa diperlahankan, ia akan membekukan mereka sehingga 3 saat dan memperoleh 2 Dinding Gloo tambahan.",
    "status": "",
    "skill_type": "Passive",
    "role": "ATTACK",
    "meta": "no",
    "cs_meta": "no",
    "api_id": 7106
  },
  {
    "name": "Luna",
    "image_url": "https://i.imgur.com/pSQQblu.png",
    "skill": "FIGHT OR FLIGHT",
    "description": "Passive - Increases firing rate by 8%. When user hits an enemy, a max of 10% of firing rate converts to movement speed. Skill resets when user survives combat.",
    "description_ms": "Pasif - Meningkatkan kadar tembakan sebanyak 8%. Apabila pengguna mengenai musuh, maksimum 10% daripada kadar tembakan akan ditukar kepada kelajuan pergerakan. Kemahiran akan ditetapkan semula apabila pengguna terselamat dalam pertempuran.",
    "status": "",
    "skill_type": "Passive",
    "role": "ATTACK",
    "meta": "yes",
    "cs_meta": "yes",
    "api_id": 5301
  },
  {
    "name": "Luqueta",
    "image_url": "https://i.imgur.com/Kfz3Qc5.png",
    "skill": "HAT TRICK",
    "description": "Passive - Every elimination increases the max Shield Points permanently by 15. Max boost: 45. Clears the effect once the player is eliminated or the round is reset.",
    "description_ms": "Pasif - Setiap penyingkiran meningkatkan Mata Perisai maksimum secara kekal sebanyak 15. Peningkatan maksimum: 45. Menghapuskan kesan sebaik sahaja pemain disingkirkan atau pusingan ditetapkan semula.",
    "status": "",
    "skill_type": "Passive",
    "role": "SURVIVAL",
    "meta": "no",
    "cs_meta": "no",
    "api_id": 2901
  },
  {
    "name": "Maro",
    "image_url": "https://i.imgur.com/CoTcXYW.png",
    "skill": "FALCON FERVOR",
    "description": "Passive - Dmg increases with distance up to 25%\n \n Dmg to marked enemies increases by 5%",
    "description_ms": "Pasif - Dmg meningkat dengan jarak sehingga 25%\n \n Dmg kepada musuh yang ditanda meningkat sebanyak 5%",
    "status": "",
    "skill_type": "Passive",
    "role": "ATTACK",
    "meta": "yes",
    "cs_meta": "no",
    "api_id": 4301
  },
  {
    "name": "Maxim",
    "image_url": "https://i.imgur.com/d4qjVdp.png",
    "skill": "GLUTTONY",
    "description": "Passive - Eating mushrooms and using Med Kits faster by 25%",
    "description_ms": "Pasif - Makan cendawan dan menggunakan Kit Med dengan lebih pantas sebanyak 25%",
    "status": "",
    "skill_type": "Passive",
    "role": "SURVIVAL",
    "meta": "no",
    "cs_meta": "no",
    "api_id": 701
  },
  {
    "name": "Miguel",
    "image_url": "https://i.imgur.com/MiVt2oZ.png",
    "skill": "CRAZY SLAYER",
    "description": "Passive - Gain 200 EP for knocking down an enemy",
    "description_ms": "Pasif - Dapatkan 200 EP jika menjatuhkan musuh",
    "status": "",
    "skill_type": "Passive",
    "role": "ATTACK",
    "meta": "no",
    "cs_meta": "yes",
    "api_id": 1001
  },
  {
    "name": "Misha",
    "image_url": "https://i.imgur.com/cWWOMGa.png",
    "skill": "AFTERBURNER",
    "description": "Passive - Driving speed increases by 10%. While in vehicle, character is harder to be targeted at, and damage taken is decreased by 20%",
    "description_ms": "Pasif - Kelajuan pemanduan meningkat sebanyak 10%. Semasa di dalam kenderaan, watak lebih sukar untuk disasarkan, dan kerosakan yang diterima berkurangan sebanyak 20%.",
    "status": "",
    "skill_type": "Passive",
    "role": "SURVIVAL",
    "meta": "no",
    "cs_meta": "no",
    "api_id": 601
  },
  {
    "name": "Moco",
    "image_url": "https://i.imgur.com/U25JAH2.png",
    "skill": "ENIGMAS EYE",
    "description": "Passive - Marks the enemy hit, exposes their location in the FOV, the minimap and shares it with teammates for 3s. The enemy, if moving while marked, will have their location exposed for a longer time, up to 4s.",
    "description_ms": "Pasif - Menandakan musuh yang terkena, mendedahkan lokasi mereka dalam FOV, peta mini dan berkongsinya dengan rakan sepasukan selama 3 saat. Musuh, jika bergerak semasa ditanda, lokasi mereka akan terdedah untuk masa yang lebih lama, sehingga 4 saat.",
    "status": "",
    "skill_type": "Passive",
    "role": "INFO",
    "meta": "yes",
    "cs_meta": "yes",
    "api_id": 1401
  },
  {
    "name": "Nairi",
    "image_url": "https://i.imgur.com/bBA4y4O.png",
    "skill": "ICE IRON",
    "description": "Passive - Within 1.5s (Nerfed:2.1s ‚Üí 1.5s) after deploying Gloo Walls, restores 106 durability/ for them and restores 10HP/s for teammates within 5m. The healing effect cannot be stacked by deploying multiple Gloo Walls.",
    "description_ms": "Pasif - Dalam masa 1.5 saat (Nerfed:2.1 saat ‚Üí 1.5 saat) selepas menggunakan Gloo Walls, memulihkan 106 ketahanan/ untuk mereka dan memulihkan 10HP/s untuk rakan sepasukan dalam masa 5m. Kesan penyembuhan tidak boleh ditumpuk dengan menggunakan berbilang Gloo Walls.",
    "status": "",
    "skill_type": "Passive",
    "role": "SURVIVAL",
    "meta": "no",
    "cs_meta": "no",
    "api_id": 5201
  },
  {
    "name": "Nikita",
    "image_url": "https://i.imgur.com/i3XCg37.png",
    "skill": "FIREARMS EXPERT",
    "description": "Passive - Reload speed increases by 20% (prev 30%). Every time the skill user hits an enemy, said target will get a 50% healing deduction that lasts for 6s (max. deduction: 50%).",
    "description_ms": "Pasif - Kelajuan tambah nilai meningkat sebanyak 20% (prev 30%). Setiap kali pengguna kemahiran mengenai musuh, sasaran tersebut akan mendapat potongan penyembuhan sebanyak 50% yang berlangsung selama 6 saat (potongan maksimum: 50%).",
    "status": "",
    "skill_type": "Passive",
    "role": "ATTACK",
    "meta": "yes",
    "cs_meta": "yes",
    "api_id": 501
  },
  {
    "name": "Notora",
    "image_url": "https://i.imgur.com/qpkQ1J0.png",
    "skill": "RACER'S BLESSING",
    "description": "Passive - When driving, restores 5 HP every 2s for everyone in the vehicle, up to a maximum of 200 HP.",
    "description_ms": "Pasif - Semasa memandu, memulihkan 5 HP setiap 2 saat untuk semua orang di dalam kenderaan, sehingga maksimum 200 HP.",
    "status": "",
    "skill_type": "Passive",
    "role": "SURVIVAL",
    "meta": "no",
    "cs_meta": "no",
    "api_id": 2401
  },
  {
    "name": "Olivia",
    "image_url": "https://i.imgur.com/ONpMyvg.png",
    "skill": "HEALING TOUCH",
    "description": "Passive - Increase healing effects by 30% and spread 80% of the user's single-target healing\n \n amount to teammates within 15m",
    "description_ms": "Pasif - Meningkatkan kesan penyembuhan sebanyak 30% dan menyebarkan 80% daripada jumlah penyembuhan sasaran tunggal pengguna kepada rakan sepasukan dalam jarak 15m",
    "status": "",
    "skill_type": "Passive",
    "role": "TEAM WORK",
    "meta": "yes",
    "cs_meta": "yes",
    "api_id": 101
  },
  {
    "name": "Otho",
    "image_url": "https://i.imgur.com/awjix7g.png",
    "skill": "MEMORY MIST",
    "description": "Passive - After knocking down enemy, mark enemies within 20m and slows their movement by 25%. Lasts for 3s. When user is knocked, marks and slows down nearby enemies",
    "description_ms": "Pasif - Selepas menjatuhkan musuh, tandakan musuh dalam lingkungan 20m dan perlahankan pergerakan mereka sebanyak 25%. Bertahan selama 3 saat. Apabila pengguna dilanggar, tandakan dan perlahankan musuh berdekatan.",
    "status": "",
    "skill_type": "Passive",
    "role": "ATTACK",
    "meta": "no",
    "cs_meta": "yes",
    "api_id": 5001
  },
  {
    "name": "Paloma",
    "image_url": "https://i.imgur.com/i7VsSjh.png",
    "skill": "SHATTERBURST",
    "description": "Passive - Weapon accuracy increases for 10s after destroying a Gloo Wall.",
    "description_ms": "Pasif - Ketepatan senjata meningkat selama 10 saat selepas memusnahkan Tembok Gloo.",
    "status": "",
    "skill_type": "Passive",
    "role": "ATTACK",
    "meta": "no",
    "cs_meta": "no",
    "api_id": 901
  },
  {
    "name": "Rafael",
    "image_url": "https://i.imgur.com/25KB7bS.png",
    "skill": "DEAD SILENT",
    "description": "Passive - When using Snipers or Marksmen rifles, firing sound is silenced and knocked enemies bleed 85% faster",
    "description_ms": "Pasif - Apabila menggunakan senapang Penembak Tepat atau Penembak Jitu, bunyi tembakan disenyapkan dan musuh yang terkena akan berdarah 85% lebih pantas.",
    "status": "",
    "skill_type": "Passive",
    "role": "ATTACK",
    "meta": "yes",
    "cs_meta": "no",
    "api_id": 1801
  },
  {
    "name": "Rin",
    "image_url": "https://i.imgur.com/NYrVZIG.png",
    "skill": "GALE OF KUNAI",
    "description": "Passive - Summons a kunai nearby every 8s, up to 3 kunai in total. The kunai can deal significant damage to Gloo Walls and will auto-target at any enemy or Gloo Wall that the user hits, dealing up to 12 DMG. The damage increases with distance.",
    "description_ms": "Pasif - Memanggil kunai berdekatan setiap 8 saat, sehingga 3 kunai secara keseluruhan. Kunai tersebut boleh menyebabkan kerosakan yang ketara pada Dinding Gloo dan akan menyasarkan secara automatik mana-mana musuh atau Dinding Gloo yang dilanggar pengguna, mengakibatkan sehingga 12 DMG. Kerosakan meningkat dengan jarak.",
    "status": "",
    "skill_type": "Passive",
    "role": "ATTACK",
    "meta": "no",
    "cs_meta": "no",
    "api_id": 7506
  },
  {
    "name": "Shani",
    "image_url": "https://i.imgur.com/DeRg7XI.png",
    "skill": "GEAR RECYCLE",
    "description": "Passive - When using an active skill, gives 30 Shield Points to self and team mates within 10m, The Shield Points decay after 5s, after which players can obtain the effect again. Cooldown: 10s",
    "description_ms": "Pasif - Apabila menggunakan kemahiran aktif, memberikan 30 Mata Perisai kepada diri sendiri dan rakan sepasukan dalam jarak 10m, Mata Perisai berkurangan selepas 5 saat, selepas itu pemain boleh mendapatkan kesan tersebut sekali lagi. Tempoh Sejuk: 10 saat",
    "status": "",
    "skill_type": "Passive",
    "role": "TEAM WORK",
    "meta": "yes",
    "cs_meta": "yes",
    "api_id": 2101
  },
  {
    "name": "Shirou",
    "image_url": "https://i.imgur.com/20g7qRn.png",
    "skill": "DAMAGE DELIVERED",
    "description": "Passive - When user is hit by enemy from within 100m, said attacker is marked for 8s (intel is shared with teammates.) Max 4 markings.",
    "description_ms": "Pasif - Apabila pengguna dilanggar musuh dari jarak 100m, penyerang tersebut akan ditanda selama 8 saat (intel dikongsi dengan rakan sepasukan.) Maksimum 4 tanda.",
    "status": "",
    "skill_type": "Passive",
    "role": "INFO",
    "meta": "no",
    "cs_meta": "no",
    "api_id": 4101
  },
  {
    "name": "Sonia",
    "image_url": "https://i.imgur.com/U2Nsxxp.png",
    "skill": "NANO LIFESHIELD",
    "description": "Passive - After taking fatal damage, enter an invulnerable and immobile state for 0.4s. Then, gain a 1 HP shield (50 HP Shield ‚Üí 1 HP Shield) that lasts for 2s. The skill user will be eliminated when the shield disappears. Cooldown: 180s.",
    "description_ms": "Pasif - Selepas menerima kerosakan maut, masukkan keadaan kebal dan tidak bergerak selama 0.4 saat. Kemudian, dapatkan perisai 1 HP (50 Perisai HP ‚Üí 1 Perisai HP) yang berlangsung selama 2 saat. Pengguna kemahiran akan dihapuskan apabila perisai itu hilang. Tempoh Penyejukan: 180 saat.",
    "status": "",
    "skill_type": "Passive",
    "role": "SURVIVAL",
    "meta": "no",
    "cs_meta": "no",
    "api_id": 6506
  },
  {
    "name": "Suzy",
    "image_url": "https://i.imgur.com/Wnbgzc5.png",
    "skill": "MONEY MARK",
    "description": "Passive - Your enemy markings have bounty value. Anyone on ally team who eliminates a marked enemy will earn 200 in-match currency. \n \n You will earn an extra 100 for eliminating an enemy. Receive extra 100 FF Coins from Coin Machines in BR matches.",
    "description_ms": "Pasif - Tanda musuh anda mempunyai nilai ganjaran. Sesiapa sahaja dalam pasukan sekutu yang menghapuskan musuh yang ditanda akan memperoleh 200 mata wang dalam perlawanan.\n \n Anda akan memperoleh tambahan 100 untuk menghapuskan musuh. Terima tambahan 100 Syiling FF daripada Mesin Syiling dalam perlawanan BR.",
    "status": "",
    "skill_type": "Passive",
    "role": "INFO",
    "meta": "yes",
    "cs_meta": "no",
    "api_id": 6606
  },
  {
    "name": "Thiva",
    "image_url": "https://i.imgur.com/21ulo2C.png",
    "skill": "VITAL VIBES",
    "description": "Passive - The speed of helping up teammates is increased by 70%. Cooldown: 90s. The helped up teammates recovers 60HP in 3s",
    "description_ms": "Pasif - Kelajuan membantu rakan sepasukan meningkat sebanyak 70%. Tempoh Penyejukan: 90 saat. Rakan sepasukan yang dibantu memulihkan 60HP dalam 3 saat.",
    "status": "",
    "skill_type": "Passive",
    "role": "TEAM WORK",
    "meta": "yes",
    "cs_meta": "yes",
    "api_id": 4601
  },
  {
    "name": "Wolfrahh",
    "image_url": "https://i.imgur.com/oN94Iw9.png",
    "skill": "LIMELIGHT",
    "description": "Passive - Every elimination will add one spectator, and the number of spectators will not reduce. With each additional spectator, damage taken from headshots reduces by 4% (max. 12%) and headshot damage to enemies increases by 10% (max. 30%).",
    "description_ms": "Pasif - Setiap penyingkiran akan menambah seorang penonton, dan bilangan penonton tidak akan berkurangan. Dengan setiap penonton tambahan, kerosakan yang diambil daripada headshot berkurangan sebanyak 4% (maksimum 12%) dan kerosakan headshot kepada musuh meningkat sebanyak 10% (maksimum 30%).",
    "status": "",
    "skill_type": "Passive",
    "role": "ATTACK",
    "meta": "no",
    "cs_meta": "no",
    "api_id": 3001
  }
]
$characters_json$::jsonb
  ) with ordinality as src(item, ordinality)
)
insert into public.ff_characters (
  api_id, name, image_url, skill, description, description_ms, status,
  skill_type, role, meta, cs_meta, sort_order, raw_data
)
select
  (item ->> 'api_id')::bigint,
  item ->> 'name',
  coalesce(item ->> 'image_url', ''),
  coalesce(item ->> 'skill', ''),
  coalesce(item ->> 'description', ''),
  coalesce(item ->> 'description_ms', ''),
  coalesce(item ->> 'status', ''),
  coalesce(item ->> 'skill_type', ''),
  coalesce(item ->> 'role', ''),
  coalesce(item ->> 'meta', 'no'),
  coalesce(item ->> 'cs_meta', 'no'),
  sort_order,
  item
from source
where nullif(item ->> 'api_id', '') is not null
  and nullif(item ->> 'name', '') is not null
on conflict (api_id) do update set
  name = excluded.name,
  image_url = excluded.image_url,
  skill = excluded.skill,
  description = excluded.description,
  description_ms = excluded.description_ms,
  status = excluded.status,
  skill_type = excluded.skill_type,
  role = excluded.role,
  meta = excluded.meta,
  cs_meta = excluded.cs_meta,
  sort_order = excluded.sort_order,
  raw_data = excluded.raw_data;

-- ============================================================================
-- Seed pets
-- ============================================================================
with source as (
  select item, ordinality::integer as sort_order
  from jsonb_array_elements(
$pets_json$
[
  {
    "name": "Arvon",
    "image_url": "https://i.imgur.com/FISOMJy.png",
    "skill": "DINOCULARS",
    "status": "",
    "skill_type": "Pet",
    "role": "INFO",
    "description": "Detect the number of enemies in a 50m radius no matter what position they are in. Lasts for 6s. Info is shared with team. Max use x3 per match",
    "description_ms": "Mengesan bilangan musuh dalam radius 50m tidak kira kedudukan mereka. Bertahan selama 6 saat. Maklumat dikongsi dengan pasukan. Penggunaan maksimum x3 setiap perlawanan"
  },
  {
    "name": "Agent Hop",
    "image_url": "https://i.imgur.com/rvCcY1n.png",
    "skill": "BOUNCING BONUS",
    "status": "",
    "skill_type": "Pet",
    "role": "SURVIVAL",
    "description": "Gain EP everytime the Safe Zone shrinks.",
    "description_ms": "Dapatkan EP setiap kali Zon Selamat mengecut."
  },
  {
    "name": "Beaston",
    "image_url": "https://i.imgur.com/OBhKB23.png",
    "skill": "HELPING HAND",
    "status": "",
    "skill_type": "Pet",
    "role": "ATTACK",
    "description": "Throwing distances of grenade, gloowall, flashbang & smoke increases by 30%",
    "description_ms": "Jarak lontaran bom tangan, gloowall, flashbang & smoke meningkat sebanyak 30%"
  },
  {
    "name": "Detective Panda",
    "image_url": "https://i.imgur.com/1VpKm0M.png",
    "skill": "PANDA'S BLESSING",
    "status": "",
    "skill_type": "Pet",
    "role": "SURVIVAL",
    "description": "Restore 10HP upon eliminating an opponent.",
    "description_ms": "Pulihkan 10HP setelah menyingkirkan lawan."
  },
  {
    "name": "Dreki",
    "image_url": "https://i.imgur.com/fpcIgCd.png",
    "skill": "DRAGON GLARE",
    "status": "",
    "skill_type": "Pet",
    "role": "INFO",
    "description": "Owner is able to spot 4 opponents who are using med kits within a 30m range. Marking lasts 5s",
    "description_ms": "Pemilik dapat melihat 4 lawan yang menggunakan kit perubatan dalam jarak 30m. Penandaan berlangsung selama 5 saat"
  },
  {
    "name": "Dr. Beanie",
    "image_url": "https://i.imgur.com/tVR1NjI.png",
    "skill": "DASHY DUCKWALK",
    "status": "",
    "skill_type": "Pet",
    "role": "MOVEMENT",
    "description": "When in crouch position, movement speed increases by 60%.",
    "description_ms": "Apabila dalam posisi mencangkung, kelajuan pergerakan meningkat sebanyak 60%."
  },
  {
    "name": "Falco",
    "image_url": "https://i.imgur.com/jJQ4XJ8.png",
    "skill": "SKYLINE SPREE",
    "status": "",
    "skill_type": "Pet",
    "role": "SURVIVAL",
    "description": "Disables enemy auto-aim while the owner is parachuting.",
    "description_ms": "Melumpuhkan sasaran automatik musuh semasa pemiliknya sedang terjun payung."
  },
  {
    "name": "Fang",
    "image_url": "https://i.imgur.com/LDma2s6.png",
    "skill": "WOLF PACK",
    "status": "",
    "skill_type": "Pet",
    "role": "SURVIVAL",
    "description": "Receive EP/HP whenever a teammate is knocked down by the enemy.",
    "description_ms": "Terima EP/HP setiap kali rakan sepasukan dijatuhkan oleh musuh."
  },
  {
    "name": "Finn",
    "image_url": "https://i.imgur.com/fMEt9HF.png",
    "skill": "DASH SPLASH",
    "status": "",
    "skill_type": "Pet",
    "role": "MOVEMENT",
    "description": "When a nearby player is knocked down or eliminated, owner and teammates will receive a movement boost.",
    "description_ms": "Apabila pemain berdekatan dijatuhkan atau disingkirkan, pemilik dan rakan sepasukan akan menerima rangsangan pergerakan."
  },
  {
    "name": "Flash",
    "image_url": "https://i.imgur.com/VUq5fqP.png",
    "skill": "STEEL SHELL",
    "status": "",
    "skill_type": "Pet",
    "role": "SURVIVAL",
    "description": "Reduce damage from knife and bullets from behind",
    "description_ms": "Kurangkan damage akibat pisau dan peluru dari belakang"
  },
  {
    "name": "Hoot",
    "image_url": "https://i.imgur.com/dKNbKTC.png",
    "skill": "FAR-SIGHTED",
    "status": "",
    "skill_type": "Pet",
    "role": "INFO",
    "description": "Increases the range and duration for scanning items and skills. No cooldown.",
    "description_ms": "Meningkatkan julat dan tempoh untuk mengimbas item dan kemahiran. Tiada masa penyejukan."
  },
  {
    "name": "Kaktus",
    "image_url": "https://i.imgur.com/K7WLWW9.png",
    "skill": "SELF-SUFFICIENT",
    "status": "",
    "skill_type": "Pet",
    "role": "SURVIVAL",
    "description": "When owner stays still for 6s, they will restore 10 EP up to 100EP or upon moving",
    "description_ms": "Apabila pemilik tidak bergerak selama 6 saat, mereka akan memulihkan 10 EP sehingga 100EP atau semasa bergerak."
  },
  {
    "name": "Moony",
    "image_url": "https://i.imgur.com/N8USbxf.png",
    "skill": "PARANORMAL PROTECTION",
    "status": "",
    "skill_type": "Pet",
    "role": "SURVIVAL",
    "description": "35% damage reduction when owner is in interaction countdown (e.g. using Med Kit, eating mushroom, etc.)",
    "description_ms": "Damage berkurang sebanyak 35% apabila pemilik berada dalam kiraan detik interaksi / interaction countdown (cth. menggunakan Med Kit, makan cendawan, dsb.)"
  },
  {
    "name": "Mr. Waggor",
    "image_url": "https://i.imgur.com/aECLdnx.png",
    "skill": "SMOOTH GLOO",
    "status": "",
    "skill_type": "Pet",
    "role": "INVENTORY",
    "description": "When owner has less then 2 Gloo Walls, Mr. Waggor gives 1 Gloo Wall every 100s. He also gives 200 Gloo Maker EXP in the first 200s of the match.",
    "description_ms": "Apabila pemilik mempunyai kurang daripada 2 Gloo Walls, Encik Waggor akan memberikan 1 Gloo Wall setiap 100s. Dia juga memberikan 200 Gloo Maker EXP dalam 200s pertama perlawanan."
  },
  {
    "name": "Night Panther",
    "image_url": "https://i.imgur.com/YD3kw1m.png",
    "skill": "WEIGHT TRAINING",
    "status": "",
    "skill_type": "Pet",
    "role": "INVENTORY",
    "description": "Increase 45 inventory space.",
    "description_ms": "Meningkatkan 45 ruang inventori."
  },
  {
    "name": "Ottero",
    "image_url": "https://i.imgur.com/rg7GPSp.png",
    "skill": "DOUBLE BUBBLE",
    "status": "",
    "skill_type": "Pet",
    "role": "SURVIVAL",
    "description": "When using Heal Pistol or Med Kit, the receiver will also recover some EP. Amount of EP recovered is 65% of HP recovered.",
    "description_ms": "Apabila menggunakan Heal Pistol atau Med Kit, penerima juga akan mendapatkan semula sebahagian EP. Jumlah EP yang diperoleh semula ialah 65% daripada HP yang diperoleh semula."
  },
  {
    "name": "Robo",
    "image_url": "https://i.imgur.com/2k7pgD0.png",
    "skill": "WALL REINFORCEMENT",
    "status": "",
    "skill_type": "Pet",
    "role": "SURVIVAL",
    "description": "Adds a sheild to the gloowall providing an additional 100HP",
    "description_ms": "Menambah perisai pada Gloo Wall yang memberikan tambahan 100HP"
  },
  {
    "name": "Rockie",
    "image_url": "https://i.imgur.com/6Xyo5f2.png",
    "skill": "STAY CHILL",
    "status": "",
    "skill_type": "Pet",
    "role": "ATTACK",
    "description": "Reduce cooltime for active skill for it's owner",
    "description_ms": "Kurangkan tempoh menunggu / cooltime kemahiran aktif"
  },
  {
    "name": "Sensei Tig",
    "image_url": "https://i.imgur.com/Xi2bOc5.png",
    "skill": "NIMBLE NINJA",
    "status": "",
    "skill_type": "Pet",
    "role": "SURVIVAL",
    "description": "Reduces the duration of enemies 'man-marking skills.'",
    "description_ms": "Mengurangkan tempoh 'kemahiran menanda' / man marking skills lawan."
  },
  {
    "name": "Shiba",
    "image_url": "https://i.imgur.com/LfyWPMu.png",
    "skill": "MUSHROOM SENSE",
    "status": "",
    "skill_type": "Pet",
    "role": "SURVIVAL",
    "description": "Mark 1 of the surrounding mushrooms on the map every 120s. The mark lasts foir 30s.",
    "description_ms": "Tandakan 1 cendawan berdekatan pada peta setiap 120 saat. Tanda ini bertahan 30 saat."
  },
  {
    "name": "Spirit Fox",
    "image_url": "https://i.imgur.com/0f2SFWb.png",
    "skill": "WELL FED",
    "status": "",
    "skill_type": "Pet",
    "role": "SURVIVAL",
    "description": "Restores extra 10 HP when using a Med Kit.",
    "description_ms": "Memulihkan 10 HP tambahan apabila menggunakan Kit Med."
  },
  {
    "name": "Yeti",
    "image_url": "https://i.imgur.com/qcOCUux.png",
    "skill": "FROST FOREST",
    "status": "",
    "skill_type": "Pet",
    "role": "SURVIVAL",
    "description": "Reduces 30% damage taken from explosives every 90s",
    "description_ms": "Mengurangkan 30% damage daripada bahan letupan setiap 90 saat"
  },
  {
    "name": "Zasil",
    "image_url": "https://i.imgur.com/yHtTSRa.png",
    "skill": "EXTRA LUCK",
    "status": "",
    "skill_type": "Pet",
    "role": "SURVIVAL",
    "description": "Every time owner consumes an Inhaler/Med Kit/Repair Kit, there's a possibility of getting an additional one.",
    "description_ms": "Setiap kali pemilik menggunakan Inhaler/Kit Perubatan/Kit Pembaikan, ada kemungkinan untuk mendapatkan satu lagi."
  }
]
$pets_json$::jsonb
  ) with ordinality as src(item, ordinality)
)
insert into public.ff_pets (
  name, image_url, skill, status, skill_type, role, description,
  description_ms, sort_order, raw_data
)
select
  item ->> 'name',
  coalesce(item ->> 'image_url', ''),
  coalesce(item ->> 'skill', ''),
  coalesce(item ->> 'status', ''),
  coalesce(item ->> 'skill_type', 'Pet'),
  coalesce(item ->> 'role', ''),
  coalesce(item ->> 'description', ''),
  coalesce(item ->> 'description_ms', ''),
  sort_order,
  item
from source
where nullif(item ->> 'name', '') is not null
on conflict (name) do update set
  image_url = excluded.image_url,
  skill = excluded.skill,
  status = excluded.status,
  skill_type = excluded.skill_type,
  role = excluded.role,
  description = excluded.description,
  description_ms = excluded.description_ms,
  sort_order = excluded.sort_order,
  raw_data = excluded.raw_data;

-- ============================================================================
-- Seed loadouts
-- ============================================================================
with source as (
  select item, ordinality::integer as sort_order
  from jsonb_array_elements(
$loadouts_json$
[
  {
    "id": "enhance_hammer",
    "name": "Enhance Hammer",
    "category": "Loadout",
    "image_url": "https://i.imgur.com/gClc4RN.png",
    "loadout_id": "500000008",
    "description": {
      "br": "Enhance your or your teammates' weapon on the panel.\n\n- Current BR enhancement cost: 400 FF Coins per enhancement.\n- Weapons can be enhanced through the panel for either your own or a teammate's weapon.\n- All attachments on an enhanced weapon are upgraded to the maximum level, with one attachment further boosted to the highest red-tier.\n- Enhanced attachments are permanently fixed to the weapon and cannot be removed.\n\nPatch note: OB51 launched this at 600 FF Coins, then OB52 reduced the enhancement cost from 600 to 400 FF Coins.",
      "cs": "Earn tokens via eliminations and enhance weapons / gloo walls during purchase phase.\n\n- A hammer token is granted for every two eliminations.\n- Tokens can be used during the purchase phase to enhance weapons in the CS Store, with the effect shared across the team.\n- Hammer tokens can also be spent to enhance Gloo Walls for your team to carry up to 6 Gloo Walls."
    },
    "description_ms": {
      "br": "Tingkatkan senjata anda atau rakan sepasukan melalui panel.\n\n- Kos peningkatan BR semasa: 400 Syiling FF untuk setiap peningkatan.\n- Senjata boleh ditingkatkan melalui panel untuk senjata anda sendiri atau rakan sepasukan.\n- Semua aksesori pada senjata yang ditingkatkan dinaik taraf ke tahap maksimum, dengan satu aksesori dipertingkatkan lagi ke tahap tertinggi (gred merah).\n- Aksesori yang telah ditingkatkan akan kekal pada senjata dan tidak boleh ditanggalkan.\n\nNota patch: OB51 bermula pada 600 Syiling FF, kemudian OB52 menurunkan kos peningkatan daripada 600 kepada 400 Syiling FF.",
      "cs": "Dapatkan token melalui eliminasi dan tingkatkan senjata / Gloo Wall semasa fasa pembelian.\n\n- Token tukul diberikan bagi setiap dua eliminasi.\n- Token boleh digunakan semasa fasa pembelian untuk meningkatkan senjata di Kedai CS, dan kesannya dikongsi bersama pasukan.\n- Token tukul juga boleh digunakan untuk meningkatkan Gloo Wall supaya pasukan anda boleh membawa sehingga 6 Gloo Wall."
    },
    "cost": {
      "br": {
        "currency": "FF Coins",
        "items": [
          {
            "id": "weapon_enhancement",
            "name": "Weapon Enhancement",
            "cost": 400,
            "previous_cost": 600,
            "changed_in": "OB52",
            "note": "Cost is per enhancement."
          }
        ]
      },
      "cs": {
        "currency": "Hammer Token",
        "items": [
          {
            "id": "hammer_token",
            "name": "Hammer Token",
            "cost": 0,
            "earn_rule": "1 token per 2 eliminations",
            "note": "Used during purchase phase for team weapon or Gloo Wall enhancement."
          }
        ]
      }
    },
    "patch_history": [
      {
        "version": "OB51",
        "change": "Introduced as one of the four reworked loadouts; BR enhancement cost was 600 FF Coins."
      },
      {
        "version": "OB52",
        "change": "BR enhancement cost reduced from 600 to 400 FF Coins."
      }
    ]
  },
  {
    "id": "super_leg_pocket",
    "name": "Super Leg Pocket",
    "category": "Loadout",
    "image_url": "https://i.imgur.com/hVW6fWi.png",
    "loadout_id": "500000003",
    "description": {
      "br": "Start with extra utility items and inventory advantages.\n\n- Receive bonfire, additional backpack space, extra armor, and other items at the start of the match.",
      "cs": "Start each match with key items and extra protection.\n\n- Receive bonfire, katana, extra armor, and other items at the start of the match."
    },
    "description_ms": {
      "br": "Mulakan dengan item utiliti tambahan dan kelebihan inventori.\n\n- Terima unggun api, ruang beg tambahan, perisai tambahan, dan item lain pada permulaan perlawanan.",
      "cs": "Mulakan setiap perlawanan dengan item penting dan perlindungan tambahan.\n\n- Terima unggun api, katana, perisai tambahan, dan item lain pada permulaan perlawanan."
    },
    "cost": {
      "br": {
        "currency": "FF Coins",
        "items": [],
        "note": "No direct purchase cost listed in official patch notes; this loadout grants starting utility."
      },
      "cs": {
        "currency": "CS Cash",
        "items": [],
        "note": "No direct purchase cost listed in official patch notes; this loadout grants starting utility."
      }
    }
  },
  {
    "id": "tactical_market",
    "name": "Tactical Market",
    "category": "Loadout",
    "image_url": "https://i.imgur.com/OBnERWB.png",
    "fallback_image_url": "https://i.imgur.com/OBnERWB.png",
    "loadout_id": "500000004",
    "tagline": "Make the battlefield your playground!",
    "short_description": "Access utility tools and tactical gadgets through an anytime market in BR, and deploy gadgets through a tactical panel in CS.",
    "description": {
      "br": "Access the tactical market anytime, anywhere.\n\nCurrent OB53 BR notes:\n- Removed Hit List and Arsenal Key.\n- Monster Truck Drop can only be purchased within the first 600s of the match.\n- Dinoculars price changed from 200 FF Coins to 100 FF Coins.\n- Launch Pads now have unlimited use; price increased to 1400 FF Coins.\n- Removed active skill cards.\n- UAV-Lite is now single-use and has purple rarity; purchase limit 2.\n- Added Heal UAV-Lite; purchase limit 2.\n\nOriginal OB51 note:\n- Tactical Market originally included Info Box, Arsenal Key, Hit List, Tactical Gadgets, Monster Truck, and Bolt Maker.\n- Bolt Maker could create a 30s Lightning Zone that randomly strikes enemies once per second for 60 damage. Teammates are immune.",
      "cs": "Get a tactical panel each round and deploy a chosen gadget.\n\nCurrent OB53 CS notes:\n- Added an in-match Tactical Market button during the battle phase.\n- Tap to deploy the default or last-used gadget at your current location.\n- Hold to open the selection wheel and drag to the chosen gadget to deploy it immediately.\n- Tactical Market can be used while moving.\n- Gadget durations now start after the preparation phase.\n- UAV-Lites were removed from the Tactical Market.\n- Jammer devices were added as anti-scan utility.\n\nCore gadgets:\n- Super Bonfire: Heals teammates within 8m over time and provides combat boosts.\n- Smoke Vortex: Generates a swirling smoke field that blocks enemy vision.\n- Cyber Barricade: Deploys large barriers for cover."
    },
    "description_ms": {
      "br": "Akses Tactical Market bila-bila masa, di mana-mana sahaja.\n\nNota BR OB53 semasa:\n- Hit List dan Arsenal Key telah dibuang.\n- Monster Truck Drop hanya boleh dibeli dalam 600s pertama perlawanan.\n- Harga Dinoculars berubah daripada 200 kepada 100 Syiling FF.\n- Launch Pad kini boleh digunakan tanpa had; harga meningkat kepada 1400 Syiling FF.\n- Kad skill aktif telah dibuang.\n- UAV-Lite kini sekali guna, mempunyai rarity ungu, dan had pembelian 2.\n- Heal UAV-Lite ditambah dengan had pembelian 2.\n\nNota asal OB51:\n- Tactical Market asalnya termasuk Info Box, Arsenal Key, Hit List, Tactical Gadgets, Monster Truck, dan Bolt Maker.\n- Bolt Maker boleh mencipta Lightning Zone selama 30s yang menyambar musuh secara rawak sekali setiap saat untuk 60 damage. Rakan sepasukan kebal.",
      "cs": "Dapatkan panel taktikal setiap pusingan dan letakkan gajet pilihan.\n\nNota CS OB53 semasa:\n- Butang Tactical Market dalam perlawanan ditambah semasa fasa battle.\n- Tekan untuk letakkan gajet default atau gajet terakhir digunakan di lokasi semasa.\n- Tahan untuk buka roda pilihan dan seret ke gajet pilihan untuk letak segera.\n- Tactical Market boleh digunakan sambil bergerak.\n- Tempoh aktif gajet kini bermula selepas fasa persediaan.\n- UAV-Lite dibuang daripada Tactical Market.\n- Jammer ditambah sebagai utiliti anti-scan.\n\nGajet utama:\n- Super Bonfire: Menyembuhkan rakan sepasukan dalam jarak 8m dari masa ke masa dan memberi boost pertempuran.\n- Smoke Vortex: Menghasilkan medan asap berpusing yang menghalang penglihatan musuh.\n- Cyber Barricade: Meletakkan penghadang besar sebagai perlindungan."
    },
    "cost": {
      "br": {
        "currency": "FF Coins",
        "items": [
          {
            "id": "Dinoculars",
            "name": "Dinoculars",
            "cost": 100,
            "previous_cost": 200,
            "changed_in": "OB53",
            "image_url": "assets/tactical_market/dinoculars.png"
          },
          {
            "id": "launch_pad",
            "name": "Launch Pad",
            "cost": 1400,
            "previous_cost": 800,
            "changed_in": "OB53",
            "usage": "Unlimited use",
            "cooldown": "300s",
            "image_url": "assets/tactical_market/launch_pad.png"
          },
          {
            "id": "monster_truck_drop",
            "name": "Monster Truck Drop",
            "cost": null,
            "previous_cost_ob52": 400,
            "availability": "Only purchasable within the first 600s of the match.",
            "image_url": "assets/tactical_market/monster_truck_drop.png"
          },
          {
            "id": "uav_lite",
            "name": "UAV-Lite",
            "cost": null,
            "purchase_limit": 2,
            "rarity": "Purple",
            "usage": "Single-use",
            "changed_in": "OB53",
            "image_url": "assets/tactical_market/uav_lite.png"
          },
          {
            "id": "heal_uav_lite",
            "name": "Heal UAV-Lite",
            "cost": null,
            "purchase_limit": 2,
            "added_in": "OB53",
            "image_url": "assets/tactical_market/heal_uav_lite.png"
          }
        ],
        "removed_items": [
          {
            "id": "hit_list",
            "name": "Hit List",
            "removed_in": "OB53",
            "previous_cost_ob52": 200,
            "previous_purchase_limit": 5,
            "image_url": "assets/tactical_market/hit_list.png"
          },
          {
            "id": "arsenal_key",
            "name": "Arsenal Key",
            "removed_in": "OB53",
            "image_url": "assets/tactical_market/arsenal_key.png"
          },
          {
            "id": "active_skill_cards",
            "name": "Active Skill Cards",
            "removed_in": "OB53",
            "image_url": "assets/tactical_market/active_skill_cards.png"
          }
        ],
        "historical_items_ob52": [
          {
            "id": "gloo_uav_lite",
            "name": "Gloo UAV-Lite",
            "cost_ob52": 800,
            "previous_cost": 400,
            "image_url": "assets/tactical_market/gloo_uav_lite.png"
          },
          {
            "id": "info_box",
            "name": "Info Box",
            "cost_ob52": 100,
            "previous_cost": 300,
            "individual_purchase_limit": 2,
            "image_url": "assets/tactical_market/info_box.png"
          },
          {
            "id": "supply_box",
            "name": "Supply Box",
            "cost_ob52": 300,
            "previous_cost": 600,
            "purchase_limit": 5,
            "image_url": "assets/tactical_market/supply_box.png"
          },
          {
            "id": "ammo",
            "name": "Ammo - All Types",
            "cost_ob52": 100,
            "previous_cost": 200,
            "image_url": "assets/tactical_market/ammo.png"
          },
          {
            "id": "clu_skill_card",
            "name": "Clu Skill Card",
            "cost_ob52": 800,
            "previous_cost": 1200,
            "purchase_limit": 5,
            "image_url": "assets/tactical_market/clu_skill_card.png"
          },
          {
            "id": "homer_skill_card",
            "name": "Homer Skill Card",
            "cost_ob52": 800,
            "previous_cost": 1200,
            "purchase_limit": 5,
            "image_url": "assets/tactical_market/homer_skill_card.png"
          }
        ]
      },
      "cs": {
        "currency": "CS Cash",
        "items": [
          {
            "id": "super_bonfire",
            "name": "Super Bonfire",
            "cost": null,
            "effect": "Heals teammates within 8m over time and provides combat boosts.",
            "balance_note": "OB53 reduced Tactical Market Super Bonfire speed boost in CS from 10% to 5%, and the speed/rate-of-fire boosts dissipate more quickly after leaving the bonfire area.",
            "image_url": "assets/tactical_market/super_bonfire.png"
          },
          {
            "id": "smoke_vortex",
            "name": "Smoke Vortex",
            "cost": null,
            "duration": "40s",
            "effect": "Generates a swirling smoke field that blocks enemy vision.",
            "changed_in": "OB52",
            "image_url": "assets/tactical_market/smoke_vortex.png"
          },
          {
            "id": "cyber_barricade",
            "name": "Cyber Barricade",
            "cost": null,
            "effect": "Deploys large barriers for cover.",
            "image_url": "assets/tactical_market/cyber_barricade.png"
          },
          {
            "id": "jammer",
            "name": "Jammer",
            "cost": null,
            "added_in": "OB53",
            "effect": "Anti-scan utility added after UAV-Lites were removed from CS Tactical Market.",
            "image_url": "assets/tactical_market/jammer.png"
          }
        ],
        "removed_items": [
          {
            "id": "uav_lite",
            "name": "UAV-Lite",
            "removed_in": "OB53",
            "reason": "Scanning in CS was considered too powerful and reduced tactical uncertainty.",
            "image_url": "assets/tactical_market/uav_lite.png"
          }
        ]
      }
    },
    "gadgets": [
      {
        "id": "super_bonfire",
        "name": "Super Bonfire",
        "mode": "cs",
        "image_url": "assets/tactical_market/super_bonfire.png",
        "effect": "Heals teammates within 8m over time and provides combat boosts.",
        "notes": "OB53 reduced the speed boost from 10% to 5%."
      },
      {
        "id": "smoke_vortex",
        "name": "Smoke Vortex",
        "mode": "cs",
        "image_url": "assets/tactical_market/smoke_vortex.png",
        "effect": "Creates a swirling smoke field that blocks enemy vision.",
        "duration": "40s"
      },
      {
        "id": "cyber_barricade",
        "name": "Cyber Barricade",
        "mode": "cs",
        "image_url": "assets/tactical_market/cyber_barricade.png",
        "effect": "Deploys large barricades for cover."
      },
      {
        "id": "bolt_maker",
        "name": "Bolt Maker",
        "mode": "br",
        "image_url": "assets/tactical_market/bolt_maker.png",
        "availability": "OB51 original Tactical Market item.",
        "limit": "Up to 5 per match",
        "available_until": "600s after match start",
        "effect": "Creates a 30s Lightning Zone. Lightning strikes randomly once per second and deals 60 damage to enemies. Teammates are immune."
      },
      {
        "id": "jammer",
        "name": "Jammer",
        "mode": "cs",
        "image_url": "assets/tactical_market/jammer.png",
        "added_in": "OB53",
        "effect": "Anti-scan gadget added to replace UAV-Lite pressure in CS Tactical Market."
      }
    ],
    "images": {
      "main_icon": "assets/loadouts/tactical_market.png",
      "fallback_main_icon": "https://i.imgur.com/OBnERWB.png",
      "official_loadout_system_image": "https://dl.dir.freefiremobile.com/common/web_event/official2.ff.garena.all/202510/d6bca55b3cdd6bfae9db30ed8aa11bec.jpeg",
      "official_cs_improved_loadout_image": "https://dl.dir.freefiremobile.com/common/web_event/official2.ff.garena.all/20264/0b4a1faa98d337705d45733891ba1d24.jpeg"
    },
    "patch_history": [
      {
        "version": "OB51",
        "change": "Tactical Market introduced as one of the four new loadouts. BR version included Info Box, Arsenal Key, Hit List, Tactical Gadgets, Monster Truck, and Bolt Maker. CS version introduced Super Bonfire, Smoke Vortex, and Cyber Barricade."
      },
      {
        "version": "OB52",
        "change": "Major price adjustments for Tactical Market items. Smoke Vortex duration reduced to 40s."
      },
      {
        "version": "OB53",
        "change": "Removed Hit List, Arsenal Key, and active skill cards. Added Heal UAV-Lite. Launch Pads became unlimited-use at 1400 FF Coins. CS received one-tap/hold-to-wheel in-match deployment, moving deployment, duration timing after prep phase, UAV-Lite removal, and Jammer addition."
      }
    ]
  },
  {
    "id": "team_booster",
    "name": "Team Booster",
    "category": "Loadout",
    "image_url": "https://i.imgur.com/RAG1acC.png",
    "loadout_id": "500000005",
    "description": {
      "br": "Equip up to 3 unique team boosts and swap anytime.\n\n- You'll have up to 3 boost slots to equip any 3 out of 6 available boosts.\n- Each boost can only be selected once per team and is applied to all teammates.\n- Current slot costs: Slot 1 is free at match start; Slot 2 costs 300 FF Coins; Slot 3 costs 600 FF Coins.\n- You can swap boosts at any time during the match, and unlocked slots remain active after you're revived.\n\nCurrent BR boost values after OB52:\n- HP/EP Recovery: Restore 2 EP and 1 HP every second.\n- Speed Up: Move 4% faster after not firing or not taking damage for 4s.\n- Extra Heal: Receive 10% more healing. The effect disappears 2s after taking out-of-zone damage.\n- Out-Zone Buff: When outside the Safe Zone, EP conversion rate +100% and move 12% faster.\n- Gloo Wall: Increase Gloo Wall's HP by 100.\n- Armor: Restore 3% armor durability every second.",
      "cs": "Helper Bot revives teammates remotely + Secret Bazaar team buffs in CS Store.\n\n- Get a Helper Bot per round.\n- When a teammate is knocked down within 16m, you can release the bot to help them up remotely.\n- The Helper Bot can be destroyed if shot.\n- The Helper Bot takes 7.5s to help up a teammate, reduced to 4s with Thiva's skill.\n- The Secret Bazaar section is available in the CS Store, offering team buffs for purchase."
    },
    "description_ms": {
      "br": "Lengkapkan sehingga 3 boost pasukan unik dan tukar bila-bila masa.\n\n- Anda mempunyai sehingga 3 slot boost untuk melengkapkan mana-mana 3 daripada 6 boost yang tersedia.\n- Setiap boost hanya boleh dipilih sekali setiap pasukan dan digunakan kepada semua rakan sepasukan.\n- Kos slot semasa: Slot 1 percuma pada permulaan perlawanan; Slot 2 berharga 300 Syiling FF; Slot 3 berharga 600 Syiling FF.\n- Anda boleh menukar boost pada bila-bila masa semasa perlawanan, dan slot yang dibuka kekal aktif selepas anda dihidupkan semula.\n\nNilai boost BR semasa selepas OB52:\n- HP/EP Recovery: Pulihkan 2 EP dan 1 HP setiap saat.\n- Speed Up: Bergerak 4% lebih laju selepas tidak menembak atau tidak menerima damage selama 4s.\n- Extra Heal: Terima 10% lebih banyak penyembuhan. Kesan hilang 2s selepas menerima damage di luar zon.\n- Out-Zone Buff: Semasa di luar Safe Zone, kadar penukaran EP +100% dan bergerak 12% lebih laju.\n- Gloo Wall: Tingkatkan HP Gloo Wall sebanyak 100.\n- Armor: Pulihkan 3% ketahanan armor setiap saat.",
      "cs": "Helper Bot menghidupkan rakan sepasukan dari jauh + Secret Bazaar buff pasukan di Kedai CS.\n\n- Dapatkan Helper Bot setiap pusingan.\n- Jika rakan sepasukan tumbang dalam jarak 16m, anda boleh lepaskan bot untuk membantu mereka bangun dari jauh.\n- Helper Bot boleh dimusnahkan jika ditembak.\n- Helper Bot mengambil masa 7.5s untuk membantu rakan sepasukan bangun, dikurangkan kepada 4s dengan skill Thiva.\n- Seksyen Secret Bazaar tersedia di Kedai CS untuk membeli buff pasukan."
    },
    "cost": {
      "br": {
        "currency": "FF Coins",
        "slot_unlocks": [
          {
            "slot": 1,
            "name": "Boost Slot 1",
            "cost": 0,
            "cost_text": "Free",
            "unlock": "Automatically unlocked at match start."
          },
          {
            "slot": 2,
            "name": "Boost Slot 2",
            "cost": 300,
            "previous_cost": 400,
            "changed_in": "OB52"
          },
          {
            "slot": 3,
            "name": "Boost Slot 3",
            "cost": 600,
            "previous_cost": 800,
            "changed_in": "OB52"
          }
        ],
        "boost_selection_cost": 0,
        "note": "The cost is for unlocking extra boost slots. Selecting/swapping a boost has no separate official cost listed."
      },
      "cs": {
        "currency": "CS Cash",
        "items": [
          {
            "id": "helper_bot",
            "name": "Helper Bot",
            "cost": 0,
            "cost_text": "Granted per round",
            "note": "Can revive a knocked teammate remotely if they are within 16m."
          },
          {
            "id": "secret_bazaar",
            "name": "Secret Bazaar Team Buffs",
            "cost": null,
            "cost_text": "Varies / not listed",
            "note": "Official notes confirm the Secret Bazaar offers team buffs for purchase, but do not list every buff price."
          }
        ]
      }
    },
    "boosters": [
      {
        "id": "hp_ep_recovery",
        "name": "HP/EP Recovery",
        "short_name": "Recover",
        "mode": "br",
        "icon_key": "recover",
        "icon_label": "HP",
        "icon_emoji": "❤",
        "icon_url": "assets/img/team-boosters/recover.png",
        "cost": 0,
        "currency": "FF Coins",
        "effect": "Restore 2 EP and 1 HP every second.",
        "effect_ms": "Pulihkan 2 EP dan 1 HP setiap saat.",
        "effect_ob51": "Restore 2 EP and 1 HP every second.",
        "logo_note": "Use official cropped icon if available; UI includes a built-in fallback logo."
      },
      {
        "id": "speed_up",
        "name": "Speed Up",
        "short_name": "Speed Up",
        "mode": "br",
        "icon_key": "speed",
        "icon_label": "SPD",
        "icon_emoji": "➤",
        "icon_url": "assets/img/team-boosters/speed-up.png",
        "cost": 0,
        "currency": "FF Coins",
        "effect": "Move 4% faster after not firing or not taking damage for 4s.",
        "effect_ms": "Bergerak 4% lebih laju selepas tidak menembak atau tidak menerima damage selama 4s.",
        "effect_ob51": "Move 7% faster after not firing or not taking damage for 4s.",
        "changed_in": "OB52",
        "change_note": "Out-of-combat sprint speed buff reduced from 7% to 4%.",
        "logo_note": "Use official cropped icon if available; UI includes a built-in fallback logo."
      },
      {
        "id": "extra_heal",
        "name": "Extra Heal",
        "short_name": "Extra Heal",
        "mode": "br",
        "icon_key": "extra_heal",
        "icon_label": "+",
        "icon_emoji": "✚",
        "icon_url": "assets/img/team-boosters/extra-heal.png",
        "cost": 0,
        "currency": "FF Coins",
        "effect": "Receive 10% more healing. The effect disappears 2s after taking out-of-zone damage.",
        "effect_ms": "Terima 10% lebih banyak penyembuhan. Kesan hilang 2s selepas menerima damage di luar zon.",
        "effect_ob51": "Receive 10% more healing. The effect disappears 2s after taking out-of-zone damage.",
        "logo_note": "Use official cropped icon if available; UI includes a built-in fallback logo."
      },
      {
        "id": "out_zone_buff",
        "name": "Out-Zone Buff",
        "short_name": "Out-Zone",
        "mode": "br",
        "icon_key": "out_zone",
        "icon_label": "ZONE",
        "icon_emoji": "◎",
        "icon_url": "assets/img/team-boosters/out-zone-buff.png",
        "cost": 0,
        "currency": "FF Coins",
        "effect": "When outside the Safe Zone, EP conversion rate +100% and move 12% faster.",
        "effect_ms": "Semasa di luar Safe Zone, kadar penukaran EP +100% dan bergerak 12% lebih laju.",
        "effect_ob51": "When outside the Safe Zone, EP conversion rate +200% and move 7% faster.",
        "changed_in": "OB52",
        "change_note": "EP conversion changed from +200% to +100%; movement speed changed from +7% to +12%.",
        "logo_note": "Use official cropped icon if available; UI includes a built-in fallback logo."
      },
      {
        "id": "gloo_wall",
        "name": "Gloo Wall",
        "short_name": "Gloo Wall",
        "mode": "br",
        "icon_key": "gloo_wall",
        "icon_label": "GW",
        "icon_emoji": "▰",
        "icon_url": "assets/img/team-boosters/gloo-wall.png",
        "cost": 0,
        "currency": "FF Coins",
        "effect": "Increase Gloo Wall's HP by 100.",
        "effect_ms": "Tingkatkan HP Gloo Wall sebanyak 100.",
        "effect_ob51": "Increase Gloo Wall's HP by 100.",
        "logo_note": "Use official cropped icon if available; UI includes a built-in fallback logo."
      },
      {
        "id": "armor",
        "name": "Armor",
        "short_name": "Armor",
        "mode": "br",
        "icon_key": "armor",
        "icon_label": "ARM",
        "icon_emoji": "◆",
        "icon_url": "assets/img/team-boosters/armor.png",
        "cost": 0,
        "currency": "FF Coins",
        "effect": "Restore 3% armor durability every second.",
        "effect_ms": "Pulihkan 3% ketahanan armor setiap saat.",
        "effect_ob51": "Restore 3% armor durability every second.",
        "logo_note": "Use official cropped icon if available; UI includes a built-in fallback logo."
      },
      {
        "id": "helper_bot",
        "name": "Helper Bot",
        "short_name": "Helper Bot",
        "mode": "cs",
        "icon_key": "helper_bot",
        "icon_label": "BOT",
        "icon_emoji": "⚙",
        "cost": 0,
        "currency": "CS Cash",
        "cost_text": "Granted per round",
        "effect": "Remote revive bot for knocked teammates within 16m. Revive takes 7.5s, or 4s with Thiva's skill.",
        "effect_ms": "Bot bantuan untuk menghidupkan rakan sepasukan dari jauh dalam jarak 16m. Proses mengambil 7.5s, atau 4s dengan skill Thiva.",
        "logo_note": "Use official cropped icon if available; UI includes a built-in fallback logo."
      }
    ],
    "logo_sources": {
      "main_loadout_image": "https://i.imgur.com/RAG1acC.png",
      "official_patch_image_contains_loadout_logo": "https://dl.dir.freefiremobile.com/common/web_event/official2.ff.garena.all/202510/d6bca55b3cdd6bfae9db30ed8aa11bec.jpeg",
      "standalone_booster_icons_status": "Six Battle Royale Team Booster icons are bundled locally; Helper Bot uses the built-in fallback icon.",
      "official_loadout_system_image": "https://dl.dir.freefiremobile.com/common/web_event/official2.ff.garena.all/202510/d6bca55b3cdd6bfae9db30ed8aa11bec.jpeg"
    },
    "patch_history": [
      {
        "version": "OB51",
        "change": "Team Booster introduced. BR slot costs were Slot 1 free, Slot 2 400 FF Coins, Slot 3 800 FF Coins."
      },
      {
        "version": "OB52",
        "change": "Team Booster Slot 2 reduced to 300 FF Coins and Slot 3 reduced to 600 FF Coins. Speed Up reduced from 7% to 4%. Out-Zone changed from +200% EP conversion / +7% speed to +100% EP conversion / +12% speed."
      },
      {
        "version": "OB53",
        "change": "Quick Messages added prompts when selecting a team buff or deploying Helper Bot; Helper Bot display/progress was optimized."
      }
    ]
  }
]
$loadouts_json$::jsonb
  ) with ordinality as src(item, ordinality)
)
insert into public.ff_loadouts (
  id, name, category, image_url, fallback_image_url, loadout_id,
  tagline, short_description, description, description_ms, cost,
  patch_history, gadgets, images, boosters, logo_sources,
  sort_order, raw_data
)
select
  item ->> 'id',
  item ->> 'name',
  coalesce(item ->> 'category', 'Loadout'),
  coalesce(item ->> 'image_url', ''),
  nullif(item ->> 'fallback_image_url', ''),
  item ->> 'loadout_id',
  nullif(item ->> 'tagline', ''),
  nullif(item ->> 'short_description', ''),
  coalesce(item -> 'description', '{}'::jsonb),
  coalesce(item -> 'description_ms', '{}'::jsonb),
  coalesce(item -> 'cost', '{}'::jsonb),
  coalesce(item -> 'patch_history', '[]'::jsonb),
  coalesce(item -> 'gadgets', '[]'::jsonb),
  coalesce(item -> 'images', '{}'::jsonb),
  coalesce(item -> 'boosters', '[]'::jsonb),
  coalesce(item -> 'logo_sources', '{}'::jsonb),
  sort_order,
  item
from source
where nullif(item ->> 'id', '') is not null
  and nullif(item ->> 'name', '') is not null
  and nullif(item ->> 'loadout_id', '') is not null
on conflict (id) do update set
  name = excluded.name,
  category = excluded.category,
  image_url = excluded.image_url,
  fallback_image_url = excluded.fallback_image_url,
  loadout_id = excluded.loadout_id,
  tagline = excluded.tagline,
  short_description = excluded.short_description,
  description = excluded.description,
  description_ms = excluded.description_ms,
  cost = excluded.cost,
  patch_history = excluded.patch_history,
  gadgets = excluded.gadgets,
  images = excluded.images,
  boosters = excluded.boosters,
  logo_sources = excluded.logo_sources,
  sort_order = excluded.sort_order,
  raw_data = excluded.raw_data;

-- ============================================================================
-- Seed counter summaries
-- ============================================================================
with source as (
  select item, ordinality::integer as sort_order
  from jsonb_array_elements(
$counters_json$
[
  {
    "name": "A124",
    "skill": "THRILL OF BATTLE",
    "role": "ATTACK",
    "description": "8m electromagnetic wave that disables enemy skill activation for 20s and inflicts 25 damage.",
    "counter_category": "pre-shield / mitigation / disengage",
    "counters": [
      {
        "name": "Chrono",
        "skill": "TIME TURNER",
        "reason": "Force field helps absorb the engage if activated before A124 gets in range."
      },
      {
        "name": "Kenta",
        "skill": "SWORDSMAN'S WRATH",
        "reason": "Front-facing damage reduction helps survive the close-range punish window."
      },
      {
        "name": "Tatsuya",
        "skill": "REBEL RUSH",
        "reason": "Fast dash helps escape the 8m disable zone."
      }
    ]
  },
  {
    "name": "Alok",
    "skill": "DROP THAT BEAT",
    "role": "SURVIVAL",
    "description": "Creates a 5m aura that increases movement speed and restores HP for 10s.",
    "counter_category": "interrupt / slow / anti-sustain",
    "counters": [
      {
        "name": "A124",
        "skill": "THRILL OF BATTLE",
        "reason": "Can deny activation in close-range engagements."
      },
      {
        "name": "Homer",
        "skill": "SENSES SHOCKWAVE",
        "reason": "Slow and firing-speed reduction reduce Alok's chase value."
      },
      {
        "name": "Nero",
        "skill": "CRYO MIND",
        "reason": "Anti-Gloo zone and HP drain punish teams trying to stabilize in the aura."
      }
    ]
  },
  {
    "name": "Chrono",
    "skill": "TIME TURNER",
    "role": "TEAM WORK",
    "description": "Creates a 10-second force field that blocks 1000 damage.",
    "counter_category": "post-shield punish / anti-cover pressure",
    "counters": [
      {
        "name": "Skyler",
        "skill": "RIPTIDE RHYTHM",
        "reason": "Strong at breaking nearby Gloo setups and forcing movement after the shield ends."
      },
      {
        "name": "Ignis",
        "skill": "FLAME MIRAGE",
        "reason": "Can burn exit paths and punish where the user leaves the shield."
      },
      {
        "name": "Iris",
        "skill": "WALL BRAWL",
        "reason": "Useful when Chrono is layered with Gloo cover and defensive setups."
      }
    ]
  },
  {
    "name": "Clu",
    "skill": "TRACING STEPS",
    "role": "INFO",
    "description": "Reveals enemies within 80m who are not crouching or prone and shares info with teammates.",
    "counter_category": "anti-detection / misdirection",
    "counters": [
      {
        "name": "Morse",
        "skill": "STEALTH BYTES",
        "reason": "Cannot be detected while in stealth mode."
      },
      {
        "name": "Wukong",
        "skill": "CAMOUFLAGE",
        "reason": "Disguise and patient positioning reduce the value of scans."
      },
      {
        "name": "Santino",
        "skill": "SHAPE SPLITTER",
        "reason": "Mannequin pressure and swaps create confusion around real positioning."
      }
    ]
  },
  {
    "name": "Dimitri",
    "skill": "HEALING HEARTBEAT",
    "role": "TEAM WORK",
    "description": "Creates a healing zone where allies recover HP and can self-revive while downed.",
    "counter_category": "zone denial / anti-heal hold",
    "counters": [
      {
        "name": "Ignis",
        "skill": "FLAME MIRAGE",
        "reason": "Burns the area and punishes stationary healing setups."
      },
      {
        "name": "Nero",
        "skill": "CRYO MIND",
        "reason": "Prevents comfortable bunker play and adds HP drain pressure."
      },
      {
        "name": "Homer",
        "skill": "SENSES SHOCKWAVE",
        "reason": "Slows and debuffs targets before the healing zone can swing the fight."
      }
    ]
  },
  {
    "name": "Homer",
    "skill": "SENSES SHOCKWAVE",
    "role": "INFO",
    "description": "Sends a drone that slows enemy movement and firing speed while dealing damage.",
    "counter_category": "defensive stall / burst reposition",
    "counters": [
      {
        "name": "Chrono",
        "skill": "TIME TURNER",
        "reason": "Lets a team turtle through the slow-and-focus window."
      },
      {
        "name": "Kenta",
        "skill": "SWORDSMAN'S WRATH",
        "reason": "Protects frontal hold positions while waiting out the debuff."
      },
      {
        "name": "Tatsuya",
        "skill": "REBEL RUSH",
        "reason": "Can quickly break away before follow-up damage lands."
      }
    ]
  },
  {
    "name": "Ignis",
    "skill": "FLAME MIRAGE",
    "role": "ATTACK",
    "description": "Deploys a moving flaming screen that damages enemies and Gloo Walls.",
    "counter_category": "mobility / lane escape",
    "counters": [
      {
        "name": "Chrono",
        "skill": "TIME TURNER",
        "reason": "Provides emergency safety during flame pressure."
      },
      {
        "name": "Tatsuya",
        "skill": "REBEL RUSH",
        "reason": "Dash helps cross or sidestep the burning lane."
      },
      {
        "name": "Santino",
        "skill": "SHAPE SPLITTER",
        "reason": "Can reposition out of the danger line and create angle confusion."
      }
    ]
  },
  {
    "name": "Iris",
    "skill": "WALL BRAWL",
    "role": "INFO",
    "description": "For 15s, firing at Gloo marks nearby enemies and penetrates Gloo to damage them.",
    "counter_category": "anti-gloo dependency / wall break",
    "counters": [
      {
        "name": "Skyler",
        "skill": "RIPTIDE RHYTHM",
        "reason": "Removing Gloo cover reduces Iris's special value."
      },
      {
        "name": "Oscar",
        "skill": "VALIANT DASH",
        "reason": "Destroys the first Gloo Walls in his path and breaks cover setups."
      },
      {
        "name": "Chrono",
        "skill": "TIME TURNER",
        "reason": "Gives a brief safety window to reposition after cover is compromised."
      }
    ]
  },
  {
    "name": "K",
    "skill": "MASTER OF ALL",
    "role": "SURVIVAL",
    "description": "Provides EP utility through mode switching, including EP conversion and regeneration.",
    "counter_category": "anti-sustain tempo / force fast fights",
    "counters": [
      {
        "name": "A124",
        "skill": "THRILL OF BATTLE",
        "reason": "Close-range skill denial can disrupt sustain timing."
      },
      {
        "name": "Homer",
        "skill": "SENSES SHOCKWAVE",
        "reason": "Debuffs reduce the user's ability to get long-value trades."
      },
      {
        "name": "Clu",
        "skill": "TRACING STEPS",
        "reason": "Info pressure helps force faster collapses before sustain matters."
      }
    ]
  },
  {
    "name": "Kassie",
    "skill": "BASIC THERAPY / FOCUSED THERAPY",
    "role": "TEAM WORK",
    "description": "Creates a healing bond with a teammate and can trigger a large instant heal.",
    "counter_category": "force separation / burst the linked duo",
    "counters": [
      {
        "name": "Homer",
        "skill": "SENSES SHOCKWAVE",
        "reason": "Slows bonded teammates and makes isolation easier."
      },
      {
        "name": "Ignis",
        "skill": "FLAME MIRAGE",
        "reason": "Punishes teams trying to hold one line while bonded."
      },
      {
        "name": "Clu",
        "skill": "TRACING STEPS",
        "reason": "Provides info to focus the supported target quickly."
      }
    ]
  },
  {
    "name": "Kenta",
    "skill": "SWORDSMAN'S WRATH",
    "role": "SURVIVAL",
    "description": "Creates a frontal shield that reduces incoming weapon damage.",
    "counter_category": "re-angle / attack from the side / bait shots",
    "counters": [
      {
        "name": "Tatsuya",
        "skill": "REBEL RUSH",
        "reason": "Dash helps break frontal alignment."
      },
      {
        "name": "Santino",
        "skill": "SHAPE SPLITTER",
        "reason": "Teleport repositioning changes the fight angle."
      },
      {
        "name": "Homer",
        "skill": "SENSES SHOCKWAVE",
        "reason": "Slows Kenta and punishes him when he tries to fire through shield uptime."
      }
    ]
  },
  {
    "name": "Koda",
    "skill": "AURORA VISION",
    "role": "SURVIVAL",
    "description": "Boosts movement speed and reveals enemies behind cover within 50m.",
    "counter_category": "anti-detection / low-profile play / misdirection",
    "counters": [
      {
        "name": "Morse",
        "skill": "STEALTH BYTES",
        "reason": "Stealth prevents enemy detection during the active window."
      },
      {
        "name": "Wukong",
        "skill": "CAMOUFLAGE",
        "reason": "Crouch-prone discipline and disguise reduce scan value."
      },
      {
        "name": "Santino",
        "skill": "SHAPE SPLITTER",
        "reason": "Fake presence and teleporting make reads less reliable."
      }
    ]
  },
  {
    "name": "Morse",
    "skill": "STEALTH BYTES",
    "role": "SURVIVAL",
    "description": "Enters stealth, becomes hard to see, cannot be detected, and gains movement speed.",
    "counter_category": "predictive control / trap exits",
    "counters": [
      {
        "name": "Clu",
        "skill": "TRACING STEPS",
        "reason": "Strong once Morse exits stealth or teammates around him are exposed."
      },
      {
        "name": "Homer",
        "skill": "SENSES SHOCKWAVE",
        "reason": "Can punish likely exit timings and nearby re-entry paths."
      },
      {
        "name": "Ryden",
        "skill": "SPIDER TRAP",
        "reason": "Trap placement is strong against predicted escape routes."
      }
    ]
  },
  {
    "name": "Nero",
    "skill": "CRYO MIND",
    "role": "ATTACK",
    "description": "Throws a plushie that creates a zone where enemies lose HP and cannot place Gloo Walls.",
    "counter_category": "leave the zone / survive the collapse",
    "counters": [
      {
        "name": "Skyler",
        "skill": "RIPTIDE RHYTHM",
        "reason": "Useful when fights are heavily tied to Gloo control."
      },
      {
        "name": "Chrono",
        "skill": "TIME TURNER",
        "reason": "Provides a stall window if caught in the anti-Gloo zone."
      },
      {
        "name": "Tatsuya",
        "skill": "REBEL RUSH",
        "reason": "Fast reposition helps escape the dangerous area."
      }
    ]
  },
  {
    "name": "Orion",
    "skill": "CRIMSON CRUSH",
    "role": "SURVIVAL",
    "description": "Consumes Crimson Energy to become untouchable for a short time while draining HP from nearby enemies.",
    "counter_category": "kite the duration / punish after invulnerability",
    "counters": [
      {
        "name": "Steffie",
        "skill": "PAINTED REFUGE",
        "reason": "Helps reduce follow-up ammo damage after Orion exits protection."
      },
      {
        "name": "Chrono",
        "skill": "TIME TURNER",
        "reason": "Lets a team absorb the immediate post-activation collapse."
      },
      {
        "name": "Homer",
        "skill": "SENSES SHOCKWAVE",
        "reason": "Excellent for punishing Orion once he commits into close range."
      }
    ]
  },
  {
    "name": "Oscar",
    "skill": "VALIANT DASH",
    "role": "ATTACK",
    "description": "Dashes forward, detonates Gloo Walls, damages enemies, and knocks them back.",
    "counter_category": "survive first contact / punish landing point",
    "counters": [
      {
        "name": "Chrono",
        "skill": "TIME TURNER",
        "reason": "Safest direct answer to a hard entry."
      },
      {
        "name": "Kenta",
        "skill": "SWORDSMAN'S WRATH",
        "reason": "Front-facing mitigation helps live through the dash hit."
      },
      {
        "name": "Ryden",
        "skill": "SPIDER TRAP",
        "reason": "Punishes predictable paths and post-dash positioning."
      }
    ]
  },
  {
    "name": "Ryden",
    "skill": "SPIDER TRAP",
    "role": "ATTACK",
    "description": "Deploys an explosive spider that catches enemies, slows them heavily, and drains HP.",
    "counter_category": "mobility / angle change / team protection",
    "counters": [
      {
        "name": "Tatsuya",
        "skill": "REBEL RUSH",
        "reason": "Dash helps avoid or break trap pathing."
      },
      {
        "name": "Santino",
        "skill": "SHAPE SPLITTER",
        "reason": "Teleport and decoy pressure can waste trap value."
      },
      {
        "name": "Chrono",
        "skill": "TIME TURNER",
        "reason": "Provides cover if someone gets trapped and focused."
      }
    ]
  },
  {
    "name": "Santino",
    "skill": "SHAPE SPLITTER",
    "role": "SURVIVAL",
    "description": "Spawns a mannequin and allows position swaps with it.",
    "counter_category": "persistent info / punish swap timing",
    "counters": [
      {
        "name": "Clu",
        "skill": "TRACING STEPS",
        "reason": "Shared scan info helps identify the real target after repositioning."
      },
      {
        "name": "Koda",
        "skill": "AURORA VISION",
        "reason": "Repeated cover detection is strong against teleport mind games."
      },
      {
        "name": "Homer",
        "skill": "SENSES SHOCKWAVE",
        "reason": "Can punish Santino right after the swap or retreat."
      }
    ]
  },
  {
    "name": "Skyler",
    "skill": "RIPTIDE RHYTHM",
    "role": "ATTACK",
    "description": "Sends a sonic wave that destroys nearby Gloo Walls.",
    "counter_category": "reposition immediately / avoid static cover dependence",
    "counters": [
      {
        "name": "Tatsuya",
        "skill": "REBEL RUSH",
        "reason": "Fast movement helps leave broken-cover positions."
      },
      {
        "name": "Santino",
        "skill": "SHAPE SPLITTER",
        "reason": "Teleport repositioning reduces the value of the wave."
      },
      {
        "name": "Chrono",
        "skill": "TIME TURNER",
        "reason": "Provides emergency safety when your Gloo line is broken."
      }
    ]
  },
  {
    "name": "Steffie",
    "skill": "PAINTED REFUGE",
    "role": "TEAM WORK",
    "description": "Creates a zone that nullifies throwables, restores armor, and reduces ammo damage.",
    "counter_category": "overwrite the zone / force them out",
    "counters": [
      {
        "name": "Ignis",
        "skill": "FLAME MIRAGE",
        "reason": "Area denial punishes teams holding one fixed spot."
      },
      {
        "name": "Nero",
        "skill": "CRYO MIND",
        "reason": "Anti-Gloo and HP drain pressure bunker play."
      },
      {
        "name": "A124",
        "skill": "THRILL OF BATTLE",
        "reason": "Close-range activation denial is strong when enemies anchor tightly."
      }
    ]
  },
  {
    "name": "Tatsuya",
    "skill": "REBEL RUSH",
    "role": "SURVIVAL",
    "description": "Rapid dash forward that can reset on knockdowns.",
    "counter_category": "path punish / deny the burst entry",
    "counters": [
      {
        "name": "Ryden",
        "skill": "SPIDER TRAP",
        "reason": "Strong against predictable dash routes."
      },
      {
        "name": "Homer",
        "skill": "SENSES SHOCKWAVE",
        "reason": "Slow and fire-rate debuff reduce follow-up after the dash."
      },
      {
        "name": "Chrono",
        "skill": "TIME TURNER",
        "reason": "Blocks immediate burst when Tatsuya dives in."
      }
    ]
  },
  {
    "name": "Wukong",
    "skill": "CAMOUFLAGE",
    "role": "SURVIVAL",
    "description": "Transforms into a bush for 10s and resets cooldown on takedown.",
    "counter_category": "info check / reveal hidden angle",
    "counters": [
      {
        "name": "Clu",
        "skill": "TRACING STEPS",
        "reason": "Scan value is strong once Wukong moves or exits disguise."
      },
      {
        "name": "Koda",
        "skill": "AURORA VISION",
        "reason": "Helps reveal suspicious cover positions."
      },
      {
        "name": "Homer",
        "skill": "SENSES SHOCKWAVE",
        "reason": "Drone pressure checks hidden positions and punishes the reveal."
      }
    ]
  },
  {
    "name": "Xayne",
    "skill": "XTREME ENCOUNTER",
    "role": "SURVIVAL",
    "description": "Enters a temporary state with bonus Shield Points that can refresh on knockdowns.",
    "counter_category": "stall the window / reduce burst conversion",
    "counters": [
      {
        "name": "Homer",
        "skill": "SENSES SHOCKWAVE",
        "reason": "Slows the push and lowers her ability to convert aggression."
      },
      {
        "name": "Chrono",
        "skill": "TIME TURNER",
        "reason": "Prevents the shielded engage from becoming a clean knock."
      },
      {
        "name": "Kenta",
        "skill": "SWORDSMAN'S WRATH",
        "reason": "Helps absorb her frontal all-in timing."
      }
    ]
  }
]
$counters_json$::jsonb
  ) with ordinality as src(item, ordinality)
)
insert into public.ff_counters (
  name, skill, role, description, counter_category, counters,
  sort_order, raw_data
)
select
  item ->> 'name',
  coalesce(item ->> 'skill', ''),
  coalesce(item ->> 'role', ''),
  coalesce(item ->> 'description', ''),
  coalesce(item ->> 'counter_category', ''),
  coalesce(item -> 'counters', '[]'::jsonb),
  sort_order,
  item
from source
where nullif(item ->> 'name', '') is not null
on conflict (name) do update set
  skill = excluded.skill,
  role = excluded.role,
  description = excluded.description,
  counter_category = excluded.counter_category,
  counters = excluded.counters,
  sort_order = excluded.sort_order,
  raw_data = excluded.raw_data;

-- Replace matchup rows only for characters present in this source payload.
with source_names as (
  select item ->> 'name' as name
  from jsonb_array_elements(
$counters_delete_json$
[
  {
    "name": "A124",
    "skill": "THRILL OF BATTLE",
    "role": "ATTACK",
    "description": "8m electromagnetic wave that disables enemy skill activation for 20s and inflicts 25 damage.",
    "counter_category": "pre-shield / mitigation / disengage",
    "counters": [
      {
        "name": "Chrono",
        "skill": "TIME TURNER",
        "reason": "Force field helps absorb the engage if activated before A124 gets in range."
      },
      {
        "name": "Kenta",
        "skill": "SWORDSMAN'S WRATH",
        "reason": "Front-facing damage reduction helps survive the close-range punish window."
      },
      {
        "name": "Tatsuya",
        "skill": "REBEL RUSH",
        "reason": "Fast dash helps escape the 8m disable zone."
      }
    ]
  },
  {
    "name": "Alok",
    "skill": "DROP THAT BEAT",
    "role": "SURVIVAL",
    "description": "Creates a 5m aura that increases movement speed and restores HP for 10s.",
    "counter_category": "interrupt / slow / anti-sustain",
    "counters": [
      {
        "name": "A124",
        "skill": "THRILL OF BATTLE",
        "reason": "Can deny activation in close-range engagements."
      },
      {
        "name": "Homer",
        "skill": "SENSES SHOCKWAVE",
        "reason": "Slow and firing-speed reduction reduce Alok's chase value."
      },
      {
        "name": "Nero",
        "skill": "CRYO MIND",
        "reason": "Anti-Gloo zone and HP drain punish teams trying to stabilize in the aura."
      }
    ]
  },
  {
    "name": "Chrono",
    "skill": "TIME TURNER",
    "role": "TEAM WORK",
    "description": "Creates a 10-second force field that blocks 1000 damage.",
    "counter_category": "post-shield punish / anti-cover pressure",
    "counters": [
      {
        "name": "Skyler",
        "skill": "RIPTIDE RHYTHM",
        "reason": "Strong at breaking nearby Gloo setups and forcing movement after the shield ends."
      },
      {
        "name": "Ignis",
        "skill": "FLAME MIRAGE",
        "reason": "Can burn exit paths and punish where the user leaves the shield."
      },
      {
        "name": "Iris",
        "skill": "WALL BRAWL",
        "reason": "Useful when Chrono is layered with Gloo cover and defensive setups."
      }
    ]
  },
  {
    "name": "Clu",
    "skill": "TRACING STEPS",
    "role": "INFO",
    "description": "Reveals enemies within 80m who are not crouching or prone and shares info with teammates.",
    "counter_category": "anti-detection / misdirection",
    "counters": [
      {
        "name": "Morse",
        "skill": "STEALTH BYTES",
        "reason": "Cannot be detected while in stealth mode."
      },
      {
        "name": "Wukong",
        "skill": "CAMOUFLAGE",
        "reason": "Disguise and patient positioning reduce the value of scans."
      },
      {
        "name": "Santino",
        "skill": "SHAPE SPLITTER",
        "reason": "Mannequin pressure and swaps create confusion around real positioning."
      }
    ]
  },
  {
    "name": "Dimitri",
    "skill": "HEALING HEARTBEAT",
    "role": "TEAM WORK",
    "description": "Creates a healing zone where allies recover HP and can self-revive while downed.",
    "counter_category": "zone denial / anti-heal hold",
    "counters": [
      {
        "name": "Ignis",
        "skill": "FLAME MIRAGE",
        "reason": "Burns the area and punishes stationary healing setups."
      },
      {
        "name": "Nero",
        "skill": "CRYO MIND",
        "reason": "Prevents comfortable bunker play and adds HP drain pressure."
      },
      {
        "name": "Homer",
        "skill": "SENSES SHOCKWAVE",
        "reason": "Slows and debuffs targets before the healing zone can swing the fight."
      }
    ]
  },
  {
    "name": "Homer",
    "skill": "SENSES SHOCKWAVE",
    "role": "INFO",
    "description": "Sends a drone that slows enemy movement and firing speed while dealing damage.",
    "counter_category": "defensive stall / burst reposition",
    "counters": [
      {
        "name": "Chrono",
        "skill": "TIME TURNER",
        "reason": "Lets a team turtle through the slow-and-focus window."
      },
      {
        "name": "Kenta",
        "skill": "SWORDSMAN'S WRATH",
        "reason": "Protects frontal hold positions while waiting out the debuff."
      },
      {
        "name": "Tatsuya",
        "skill": "REBEL RUSH",
        "reason": "Can quickly break away before follow-up damage lands."
      }
    ]
  },
  {
    "name": "Ignis",
    "skill": "FLAME MIRAGE",
    "role": "ATTACK",
    "description": "Deploys a moving flaming screen that damages enemies and Gloo Walls.",
    "counter_category": "mobility / lane escape",
    "counters": [
      {
        "name": "Chrono",
        "skill": "TIME TURNER",
        "reason": "Provides emergency safety during flame pressure."
      },
      {
        "name": "Tatsuya",
        "skill": "REBEL RUSH",
        "reason": "Dash helps cross or sidestep the burning lane."
      },
      {
        "name": "Santino",
        "skill": "SHAPE SPLITTER",
        "reason": "Can reposition out of the danger line and create angle confusion."
      }
    ]
  },
  {
    "name": "Iris",
    "skill": "WALL BRAWL",
    "role": "INFO",
    "description": "For 15s, firing at Gloo marks nearby enemies and penetrates Gloo to damage them.",
    "counter_category": "anti-gloo dependency / wall break",
    "counters": [
      {
        "name": "Skyler",
        "skill": "RIPTIDE RHYTHM",
        "reason": "Removing Gloo cover reduces Iris's special value."
      },
      {
        "name": "Oscar",
        "skill": "VALIANT DASH",
        "reason": "Destroys the first Gloo Walls in his path and breaks cover setups."
      },
      {
        "name": "Chrono",
        "skill": "TIME TURNER",
        "reason": "Gives a brief safety window to reposition after cover is compromised."
      }
    ]
  },
  {
    "name": "K",
    "skill": "MASTER OF ALL",
    "role": "SURVIVAL",
    "description": "Provides EP utility through mode switching, including EP conversion and regeneration.",
    "counter_category": "anti-sustain tempo / force fast fights",
    "counters": [
      {
        "name": "A124",
        "skill": "THRILL OF BATTLE",
        "reason": "Close-range skill denial can disrupt sustain timing."
      },
      {
        "name": "Homer",
        "skill": "SENSES SHOCKWAVE",
        "reason": "Debuffs reduce the user's ability to get long-value trades."
      },
      {
        "name": "Clu",
        "skill": "TRACING STEPS",
        "reason": "Info pressure helps force faster collapses before sustain matters."
      }
    ]
  },
  {
    "name": "Kassie",
    "skill": "BASIC THERAPY / FOCUSED THERAPY",
    "role": "TEAM WORK",
    "description": "Creates a healing bond with a teammate and can trigger a large instant heal.",
    "counter_category": "force separation / burst the linked duo",
    "counters": [
      {
        "name": "Homer",
        "skill": "SENSES SHOCKWAVE",
        "reason": "Slows bonded teammates and makes isolation easier."
      },
      {
        "name": "Ignis",
        "skill": "FLAME MIRAGE",
        "reason": "Punishes teams trying to hold one line while bonded."
      },
      {
        "name": "Clu",
        "skill": "TRACING STEPS",
        "reason": "Provides info to focus the supported target quickly."
      }
    ]
  },
  {
    "name": "Kenta",
    "skill": "SWORDSMAN'S WRATH",
    "role": "SURVIVAL",
    "description": "Creates a frontal shield that reduces incoming weapon damage.",
    "counter_category": "re-angle / attack from the side / bait shots",
    "counters": [
      {
        "name": "Tatsuya",
        "skill": "REBEL RUSH",
        "reason": "Dash helps break frontal alignment."
      },
      {
        "name": "Santino",
        "skill": "SHAPE SPLITTER",
        "reason": "Teleport repositioning changes the fight angle."
      },
      {
        "name": "Homer",
        "skill": "SENSES SHOCKWAVE",
        "reason": "Slows Kenta and punishes him when he tries to fire through shield uptime."
      }
    ]
  },
  {
    "name": "Koda",
    "skill": "AURORA VISION",
    "role": "SURVIVAL",
    "description": "Boosts movement speed and reveals enemies behind cover within 50m.",
    "counter_category": "anti-detection / low-profile play / misdirection",
    "counters": [
      {
        "name": "Morse",
        "skill": "STEALTH BYTES",
        "reason": "Stealth prevents enemy detection during the active window."
      },
      {
        "name": "Wukong",
        "skill": "CAMOUFLAGE",
        "reason": "Crouch-prone discipline and disguise reduce scan value."
      },
      {
        "name": "Santino",
        "skill": "SHAPE SPLITTER",
        "reason": "Fake presence and teleporting make reads less reliable."
      }
    ]
  },
  {
    "name": "Morse",
    "skill": "STEALTH BYTES",
    "role": "SURVIVAL",
    "description": "Enters stealth, becomes hard to see, cannot be detected, and gains movement speed.",
    "counter_category": "predictive control / trap exits",
    "counters": [
      {
        "name": "Clu",
        "skill": "TRACING STEPS",
        "reason": "Strong once Morse exits stealth or teammates around him are exposed."
      },
      {
        "name": "Homer",
        "skill": "SENSES SHOCKWAVE",
        "reason": "Can punish likely exit timings and nearby re-entry paths."
      },
      {
        "name": "Ryden",
        "skill": "SPIDER TRAP",
        "reason": "Trap placement is strong against predicted escape routes."
      }
    ]
  },
  {
    "name": "Nero",
    "skill": "CRYO MIND",
    "role": "ATTACK",
    "description": "Throws a plushie that creates a zone where enemies lose HP and cannot place Gloo Walls.",
    "counter_category": "leave the zone / survive the collapse",
    "counters": [
      {
        "name": "Skyler",
        "skill": "RIPTIDE RHYTHM",
        "reason": "Useful when fights are heavily tied to Gloo control."
      },
      {
        "name": "Chrono",
        "skill": "TIME TURNER",
        "reason": "Provides a stall window if caught in the anti-Gloo zone."
      },
      {
        "name": "Tatsuya",
        "skill": "REBEL RUSH",
        "reason": "Fast reposition helps escape the dangerous area."
      }
    ]
  },
  {
    "name": "Orion",
    "skill": "CRIMSON CRUSH",
    "role": "SURVIVAL",
    "description": "Consumes Crimson Energy to become untouchable for a short time while draining HP from nearby enemies.",
    "counter_category": "kite the duration / punish after invulnerability",
    "counters": [
      {
        "name": "Steffie",
        "skill": "PAINTED REFUGE",
        "reason": "Helps reduce follow-up ammo damage after Orion exits protection."
      },
      {
        "name": "Chrono",
        "skill": "TIME TURNER",
        "reason": "Lets a team absorb the immediate post-activation collapse."
      },
      {
        "name": "Homer",
        "skill": "SENSES SHOCKWAVE",
        "reason": "Excellent for punishing Orion once he commits into close range."
      }
    ]
  },
  {
    "name": "Oscar",
    "skill": "VALIANT DASH",
    "role": "ATTACK",
    "description": "Dashes forward, detonates Gloo Walls, damages enemies, and knocks them back.",
    "counter_category": "survive first contact / punish landing point",
    "counters": [
      {
        "name": "Chrono",
        "skill": "TIME TURNER",
        "reason": "Safest direct answer to a hard entry."
      },
      {
        "name": "Kenta",
        "skill": "SWORDSMAN'S WRATH",
        "reason": "Front-facing mitigation helps live through the dash hit."
      },
      {
        "name": "Ryden",
        "skill": "SPIDER TRAP",
        "reason": "Punishes predictable paths and post-dash positioning."
      }
    ]
  },
  {
    "name": "Ryden",
    "skill": "SPIDER TRAP",
    "role": "ATTACK",
    "description": "Deploys an explosive spider that catches enemies, slows them heavily, and drains HP.",
    "counter_category": "mobility / angle change / team protection",
    "counters": [
      {
        "name": "Tatsuya",
        "skill": "REBEL RUSH",
        "reason": "Dash helps avoid or break trap pathing."
      },
      {
        "name": "Santino",
        "skill": "SHAPE SPLITTER",
        "reason": "Teleport and decoy pressure can waste trap value."
      },
      {
        "name": "Chrono",
        "skill": "TIME TURNER",
        "reason": "Provides cover if someone gets trapped and focused."
      }
    ]
  },
  {
    "name": "Santino",
    "skill": "SHAPE SPLITTER",
    "role": "SURVIVAL",
    "description": "Spawns a mannequin and allows position swaps with it.",
    "counter_category": "persistent info / punish swap timing",
    "counters": [
      {
        "name": "Clu",
        "skill": "TRACING STEPS",
        "reason": "Shared scan info helps identify the real target after repositioning."
      },
      {
        "name": "Koda",
        "skill": "AURORA VISION",
        "reason": "Repeated cover detection is strong against teleport mind games."
      },
      {
        "name": "Homer",
        "skill": "SENSES SHOCKWAVE",
        "reason": "Can punish Santino right after the swap or retreat."
      }
    ]
  },
  {
    "name": "Skyler",
    "skill": "RIPTIDE RHYTHM",
    "role": "ATTACK",
    "description": "Sends a sonic wave that destroys nearby Gloo Walls.",
    "counter_category": "reposition immediately / avoid static cover dependence",
    "counters": [
      {
        "name": "Tatsuya",
        "skill": "REBEL RUSH",
        "reason": "Fast movement helps leave broken-cover positions."
      },
      {
        "name": "Santino",
        "skill": "SHAPE SPLITTER",
        "reason": "Teleport repositioning reduces the value of the wave."
      },
      {
        "name": "Chrono",
        "skill": "TIME TURNER",
        "reason": "Provides emergency safety when your Gloo line is broken."
      }
    ]
  },
  {
    "name": "Steffie",
    "skill": "PAINTED REFUGE",
    "role": "TEAM WORK",
    "description": "Creates a zone that nullifies throwables, restores armor, and reduces ammo damage.",
    "counter_category": "overwrite the zone / force them out",
    "counters": [
      {
        "name": "Ignis",
        "skill": "FLAME MIRAGE",
        "reason": "Area denial punishes teams holding one fixed spot."
      },
      {
        "name": "Nero",
        "skill": "CRYO MIND",
        "reason": "Anti-Gloo and HP drain pressure bunker play."
      },
      {
        "name": "A124",
        "skill": "THRILL OF BATTLE",
        "reason": "Close-range activation denial is strong when enemies anchor tightly."
      }
    ]
  },
  {
    "name": "Tatsuya",
    "skill": "REBEL RUSH",
    "role": "SURVIVAL",
    "description": "Rapid dash forward that can reset on knockdowns.",
    "counter_category": "path punish / deny the burst entry",
    "counters": [
      {
        "name": "Ryden",
        "skill": "SPIDER TRAP",
        "reason": "Strong against predictable dash routes."
      },
      {
        "name": "Homer",
        "skill": "SENSES SHOCKWAVE",
        "reason": "Slow and fire-rate debuff reduce follow-up after the dash."
      },
      {
        "name": "Chrono",
        "skill": "TIME TURNER",
        "reason": "Blocks immediate burst when Tatsuya dives in."
      }
    ]
  },
  {
    "name": "Wukong",
    "skill": "CAMOUFLAGE",
    "role": "SURVIVAL",
    "description": "Transforms into a bush for 10s and resets cooldown on takedown.",
    "counter_category": "info check / reveal hidden angle",
    "counters": [
      {
        "name": "Clu",
        "skill": "TRACING STEPS",
        "reason": "Scan value is strong once Wukong moves or exits disguise."
      },
      {
        "name": "Koda",
        "skill": "AURORA VISION",
        "reason": "Helps reveal suspicious cover positions."
      },
      {
        "name": "Homer",
        "skill": "SENSES SHOCKWAVE",
        "reason": "Drone pressure checks hidden positions and punishes the reveal."
      }
    ]
  },
  {
    "name": "Xayne",
    "skill": "XTREME ENCOUNTER",
    "role": "SURVIVAL",
    "description": "Enters a temporary state with bonus Shield Points that can refresh on knockdowns.",
    "counter_category": "stall the window / reduce burst conversion",
    "counters": [
      {
        "name": "Homer",
        "skill": "SENSES SHOCKWAVE",
        "reason": "Slows the push and lowers her ability to convert aggression."
      },
      {
        "name": "Chrono",
        "skill": "TIME TURNER",
        "reason": "Prevents the shielded engage from becoming a clean knock."
      },
      {
        "name": "Kenta",
        "skill": "SWORDSMAN'S WRATH",
        "reason": "Helps absorb her frontal all-in timing."
      }
    ]
  }
]
$counters_delete_json$::jsonb
  ) as src(item)
)
delete from public.ff_counter_matchups matchup
using source_names
where matchup.character_name = source_names.name;

with source as (
  select item, parent_order
  from jsonb_array_elements(
$counters_matchups_json$
[
  {
    "name": "A124",
    "skill": "THRILL OF BATTLE",
    "role": "ATTACK",
    "description": "8m electromagnetic wave that disables enemy skill activation for 20s and inflicts 25 damage.",
    "counter_category": "pre-shield / mitigation / disengage",
    "counters": [
      {
        "name": "Chrono",
        "skill": "TIME TURNER",
        "reason": "Force field helps absorb the engage if activated before A124 gets in range."
      },
      {
        "name": "Kenta",
        "skill": "SWORDSMAN'S WRATH",
        "reason": "Front-facing damage reduction helps survive the close-range punish window."
      },
      {
        "name": "Tatsuya",
        "skill": "REBEL RUSH",
        "reason": "Fast dash helps escape the 8m disable zone."
      }
    ]
  },
  {
    "name": "Alok",
    "skill": "DROP THAT BEAT",
    "role": "SURVIVAL",
    "description": "Creates a 5m aura that increases movement speed and restores HP for 10s.",
    "counter_category": "interrupt / slow / anti-sustain",
    "counters": [
      {
        "name": "A124",
        "skill": "THRILL OF BATTLE",
        "reason": "Can deny activation in close-range engagements."
      },
      {
        "name": "Homer",
        "skill": "SENSES SHOCKWAVE",
        "reason": "Slow and firing-speed reduction reduce Alok's chase value."
      },
      {
        "name": "Nero",
        "skill": "CRYO MIND",
        "reason": "Anti-Gloo zone and HP drain punish teams trying to stabilize in the aura."
      }
    ]
  },
  {
    "name": "Chrono",
    "skill": "TIME TURNER",
    "role": "TEAM WORK",
    "description": "Creates a 10-second force field that blocks 1000 damage.",
    "counter_category": "post-shield punish / anti-cover pressure",
    "counters": [
      {
        "name": "Skyler",
        "skill": "RIPTIDE RHYTHM",
        "reason": "Strong at breaking nearby Gloo setups and forcing movement after the shield ends."
      },
      {
        "name": "Ignis",
        "skill": "FLAME MIRAGE",
        "reason": "Can burn exit paths and punish where the user leaves the shield."
      },
      {
        "name": "Iris",
        "skill": "WALL BRAWL",
        "reason": "Useful when Chrono is layered with Gloo cover and defensive setups."
      }
    ]
  },
  {
    "name": "Clu",
    "skill": "TRACING STEPS",
    "role": "INFO",
    "description": "Reveals enemies within 80m who are not crouching or prone and shares info with teammates.",
    "counter_category": "anti-detection / misdirection",
    "counters": [
      {
        "name": "Morse",
        "skill": "STEALTH BYTES",
        "reason": "Cannot be detected while in stealth mode."
      },
      {
        "name": "Wukong",
        "skill": "CAMOUFLAGE",
        "reason": "Disguise and patient positioning reduce the value of scans."
      },
      {
        "name": "Santino",
        "skill": "SHAPE SPLITTER",
        "reason": "Mannequin pressure and swaps create confusion around real positioning."
      }
    ]
  },
  {
    "name": "Dimitri",
    "skill": "HEALING HEARTBEAT",
    "role": "TEAM WORK",
    "description": "Creates a healing zone where allies recover HP and can self-revive while downed.",
    "counter_category": "zone denial / anti-heal hold",
    "counters": [
      {
        "name": "Ignis",
        "skill": "FLAME MIRAGE",
        "reason": "Burns the area and punishes stationary healing setups."
      },
      {
        "name": "Nero",
        "skill": "CRYO MIND",
        "reason": "Prevents comfortable bunker play and adds HP drain pressure."
      },
      {
        "name": "Homer",
        "skill": "SENSES SHOCKWAVE",
        "reason": "Slows and debuffs targets before the healing zone can swing the fight."
      }
    ]
  },
  {
    "name": "Homer",
    "skill": "SENSES SHOCKWAVE",
    "role": "INFO",
    "description": "Sends a drone that slows enemy movement and firing speed while dealing damage.",
    "counter_category": "defensive stall / burst reposition",
    "counters": [
      {
        "name": "Chrono",
        "skill": "TIME TURNER",
        "reason": "Lets a team turtle through the slow-and-focus window."
      },
      {
        "name": "Kenta",
        "skill": "SWORDSMAN'S WRATH",
        "reason": "Protects frontal hold positions while waiting out the debuff."
      },
      {
        "name": "Tatsuya",
        "skill": "REBEL RUSH",
        "reason": "Can quickly break away before follow-up damage lands."
      }
    ]
  },
  {
    "name": "Ignis",
    "skill": "FLAME MIRAGE",
    "role": "ATTACK",
    "description": "Deploys a moving flaming screen that damages enemies and Gloo Walls.",
    "counter_category": "mobility / lane escape",
    "counters": [
      {
        "name": "Chrono",
        "skill": "TIME TURNER",
        "reason": "Provides emergency safety during flame pressure."
      },
      {
        "name": "Tatsuya",
        "skill": "REBEL RUSH",
        "reason": "Dash helps cross or sidestep the burning lane."
      },
      {
        "name": "Santino",
        "skill": "SHAPE SPLITTER",
        "reason": "Can reposition out of the danger line and create angle confusion."
      }
    ]
  },
  {
    "name": "Iris",
    "skill": "WALL BRAWL",
    "role": "INFO",
    "description": "For 15s, firing at Gloo marks nearby enemies and penetrates Gloo to damage them.",
    "counter_category": "anti-gloo dependency / wall break",
    "counters": [
      {
        "name": "Skyler",
        "skill": "RIPTIDE RHYTHM",
        "reason": "Removing Gloo cover reduces Iris's special value."
      },
      {
        "name": "Oscar",
        "skill": "VALIANT DASH",
        "reason": "Destroys the first Gloo Walls in his path and breaks cover setups."
      },
      {
        "name": "Chrono",
        "skill": "TIME TURNER",
        "reason": "Gives a brief safety window to reposition after cover is compromised."
      }
    ]
  },
  {
    "name": "K",
    "skill": "MASTER OF ALL",
    "role": "SURVIVAL",
    "description": "Provides EP utility through mode switching, including EP conversion and regeneration.",
    "counter_category": "anti-sustain tempo / force fast fights",
    "counters": [
      {
        "name": "A124",
        "skill": "THRILL OF BATTLE",
        "reason": "Close-range skill denial can disrupt sustain timing."
      },
      {
        "name": "Homer",
        "skill": "SENSES SHOCKWAVE",
        "reason": "Debuffs reduce the user's ability to get long-value trades."
      },
      {
        "name": "Clu",
        "skill": "TRACING STEPS",
        "reason": "Info pressure helps force faster collapses before sustain matters."
      }
    ]
  },
  {
    "name": "Kassie",
    "skill": "BASIC THERAPY / FOCUSED THERAPY",
    "role": "TEAM WORK",
    "description": "Creates a healing bond with a teammate and can trigger a large instant heal.",
    "counter_category": "force separation / burst the linked duo",
    "counters": [
      {
        "name": "Homer",
        "skill": "SENSES SHOCKWAVE",
        "reason": "Slows bonded teammates and makes isolation easier."
      },
      {
        "name": "Ignis",
        "skill": "FLAME MIRAGE",
        "reason": "Punishes teams trying to hold one line while bonded."
      },
      {
        "name": "Clu",
        "skill": "TRACING STEPS",
        "reason": "Provides info to focus the supported target quickly."
      }
    ]
  },
  {
    "name": "Kenta",
    "skill": "SWORDSMAN'S WRATH",
    "role": "SURVIVAL",
    "description": "Creates a frontal shield that reduces incoming weapon damage.",
    "counter_category": "re-angle / attack from the side / bait shots",
    "counters": [
      {
        "name": "Tatsuya",
        "skill": "REBEL RUSH",
        "reason": "Dash helps break frontal alignment."
      },
      {
        "name": "Santino",
        "skill": "SHAPE SPLITTER",
        "reason": "Teleport repositioning changes the fight angle."
      },
      {
        "name": "Homer",
        "skill": "SENSES SHOCKWAVE",
        "reason": "Slows Kenta and punishes him when he tries to fire through shield uptime."
      }
    ]
  },
  {
    "name": "Koda",
    "skill": "AURORA VISION",
    "role": "SURVIVAL",
    "description": "Boosts movement speed and reveals enemies behind cover within 50m.",
    "counter_category": "anti-detection / low-profile play / misdirection",
    "counters": [
      {
        "name": "Morse",
        "skill": "STEALTH BYTES",
        "reason": "Stealth prevents enemy detection during the active window."
      },
      {
        "name": "Wukong",
        "skill": "CAMOUFLAGE",
        "reason": "Crouch-prone discipline and disguise reduce scan value."
      },
      {
        "name": "Santino",
        "skill": "SHAPE SPLITTER",
        "reason": "Fake presence and teleporting make reads less reliable."
      }
    ]
  },
  {
    "name": "Morse",
    "skill": "STEALTH BYTES",
    "role": "SURVIVAL",
    "description": "Enters stealth, becomes hard to see, cannot be detected, and gains movement speed.",
    "counter_category": "predictive control / trap exits",
    "counters": [
      {
        "name": "Clu",
        "skill": "TRACING STEPS",
        "reason": "Strong once Morse exits stealth or teammates around him are exposed."
      },
      {
        "name": "Homer",
        "skill": "SENSES SHOCKWAVE",
        "reason": "Can punish likely exit timings and nearby re-entry paths."
      },
      {
        "name": "Ryden",
        "skill": "SPIDER TRAP",
        "reason": "Trap placement is strong against predicted escape routes."
      }
    ]
  },
  {
    "name": "Nero",
    "skill": "CRYO MIND",
    "role": "ATTACK",
    "description": "Throws a plushie that creates a zone where enemies lose HP and cannot place Gloo Walls.",
    "counter_category": "leave the zone / survive the collapse",
    "counters": [
      {
        "name": "Skyler",
        "skill": "RIPTIDE RHYTHM",
        "reason": "Useful when fights are heavily tied to Gloo control."
      },
      {
        "name": "Chrono",
        "skill": "TIME TURNER",
        "reason": "Provides a stall window if caught in the anti-Gloo zone."
      },
      {
        "name": "Tatsuya",
        "skill": "REBEL RUSH",
        "reason": "Fast reposition helps escape the dangerous area."
      }
    ]
  },
  {
    "name": "Orion",
    "skill": "CRIMSON CRUSH",
    "role": "SURVIVAL",
    "description": "Consumes Crimson Energy to become untouchable for a short time while draining HP from nearby enemies.",
    "counter_category": "kite the duration / punish after invulnerability",
    "counters": [
      {
        "name": "Steffie",
        "skill": "PAINTED REFUGE",
        "reason": "Helps reduce follow-up ammo damage after Orion exits protection."
      },
      {
        "name": "Chrono",
        "skill": "TIME TURNER",
        "reason": "Lets a team absorb the immediate post-activation collapse."
      },
      {
        "name": "Homer",
        "skill": "SENSES SHOCKWAVE",
        "reason": "Excellent for punishing Orion once he commits into close range."
      }
    ]
  },
  {
    "name": "Oscar",
    "skill": "VALIANT DASH",
    "role": "ATTACK",
    "description": "Dashes forward, detonates Gloo Walls, damages enemies, and knocks them back.",
    "counter_category": "survive first contact / punish landing point",
    "counters": [
      {
        "name": "Chrono",
        "skill": "TIME TURNER",
        "reason": "Safest direct answer to a hard entry."
      },
      {
        "name": "Kenta",
        "skill": "SWORDSMAN'S WRATH",
        "reason": "Front-facing mitigation helps live through the dash hit."
      },
      {
        "name": "Ryden",
        "skill": "SPIDER TRAP",
        "reason": "Punishes predictable paths and post-dash positioning."
      }
    ]
  },
  {
    "name": "Ryden",
    "skill": "SPIDER TRAP",
    "role": "ATTACK",
    "description": "Deploys an explosive spider that catches enemies, slows them heavily, and drains HP.",
    "counter_category": "mobility / angle change / team protection",
    "counters": [
      {
        "name": "Tatsuya",
        "skill": "REBEL RUSH",
        "reason": "Dash helps avoid or break trap pathing."
      },
      {
        "name": "Santino",
        "skill": "SHAPE SPLITTER",
        "reason": "Teleport and decoy pressure can waste trap value."
      },
      {
        "name": "Chrono",
        "skill": "TIME TURNER",
        "reason": "Provides cover if someone gets trapped and focused."
      }
    ]
  },
  {
    "name": "Santino",
    "skill": "SHAPE SPLITTER",
    "role": "SURVIVAL",
    "description": "Spawns a mannequin and allows position swaps with it.",
    "counter_category": "persistent info / punish swap timing",
    "counters": [
      {
        "name": "Clu",
        "skill": "TRACING STEPS",
        "reason": "Shared scan info helps identify the real target after repositioning."
      },
      {
        "name": "Koda",
        "skill": "AURORA VISION",
        "reason": "Repeated cover detection is strong against teleport mind games."
      },
      {
        "name": "Homer",
        "skill": "SENSES SHOCKWAVE",
        "reason": "Can punish Santino right after the swap or retreat."
      }
    ]
  },
  {
    "name": "Skyler",
    "skill": "RIPTIDE RHYTHM",
    "role": "ATTACK",
    "description": "Sends a sonic wave that destroys nearby Gloo Walls.",
    "counter_category": "reposition immediately / avoid static cover dependence",
    "counters": [
      {
        "name": "Tatsuya",
        "skill": "REBEL RUSH",
        "reason": "Fast movement helps leave broken-cover positions."
      },
      {
        "name": "Santino",
        "skill": "SHAPE SPLITTER",
        "reason": "Teleport repositioning reduces the value of the wave."
      },
      {
        "name": "Chrono",
        "skill": "TIME TURNER",
        "reason": "Provides emergency safety when your Gloo line is broken."
      }
    ]
  },
  {
    "name": "Steffie",
    "skill": "PAINTED REFUGE",
    "role": "TEAM WORK",
    "description": "Creates a zone that nullifies throwables, restores armor, and reduces ammo damage.",
    "counter_category": "overwrite the zone / force them out",
    "counters": [
      {
        "name": "Ignis",
        "skill": "FLAME MIRAGE",
        "reason": "Area denial punishes teams holding one fixed spot."
      },
      {
        "name": "Nero",
        "skill": "CRYO MIND",
        "reason": "Anti-Gloo and HP drain pressure bunker play."
      },
      {
        "name": "A124",
        "skill": "THRILL OF BATTLE",
        "reason": "Close-range activation denial is strong when enemies anchor tightly."
      }
    ]
  },
  {
    "name": "Tatsuya",
    "skill": "REBEL RUSH",
    "role": "SURVIVAL",
    "description": "Rapid dash forward that can reset on knockdowns.",
    "counter_category": "path punish / deny the burst entry",
    "counters": [
      {
        "name": "Ryden",
        "skill": "SPIDER TRAP",
        "reason": "Strong against predictable dash routes."
      },
      {
        "name": "Homer",
        "skill": "SENSES SHOCKWAVE",
        "reason": "Slow and fire-rate debuff reduce follow-up after the dash."
      },
      {
        "name": "Chrono",
        "skill": "TIME TURNER",
        "reason": "Blocks immediate burst when Tatsuya dives in."
      }
    ]
  },
  {
    "name": "Wukong",
    "skill": "CAMOUFLAGE",
    "role": "SURVIVAL",
    "description": "Transforms into a bush for 10s and resets cooldown on takedown.",
    "counter_category": "info check / reveal hidden angle",
    "counters": [
      {
        "name": "Clu",
        "skill": "TRACING STEPS",
        "reason": "Scan value is strong once Wukong moves or exits disguise."
      },
      {
        "name": "Koda",
        "skill": "AURORA VISION",
        "reason": "Helps reveal suspicious cover positions."
      },
      {
        "name": "Homer",
        "skill": "SENSES SHOCKWAVE",
        "reason": "Drone pressure checks hidden positions and punishes the reveal."
      }
    ]
  },
  {
    "name": "Xayne",
    "skill": "XTREME ENCOUNTER",
    "role": "SURVIVAL",
    "description": "Enters a temporary state with bonus Shield Points that can refresh on knockdowns.",
    "counter_category": "stall the window / reduce burst conversion",
    "counters": [
      {
        "name": "Homer",
        "skill": "SENSES SHOCKWAVE",
        "reason": "Slows the push and lowers her ability to convert aggression."
      },
      {
        "name": "Chrono",
        "skill": "TIME TURNER",
        "reason": "Prevents the shielded engage from becoming a clean knock."
      },
      {
        "name": "Kenta",
        "skill": "SWORDSMAN'S WRATH",
        "reason": "Helps absorb her frontal all-in timing."
      }
    ]
  }
]
$counters_matchups_json$::jsonb
  ) with ordinality as src(item, parent_order)
), expanded as (
  select
    source.item ->> 'name' as character_name,
    matchup.item as matchup,
    matchup.ordinality::integer as sort_order
  from source
  cross join lateral jsonb_array_elements(
    coalesce(source.item -> 'counters', '[]'::jsonb)
  ) with ordinality as matchup(item, ordinality)
)
insert into public.ff_counter_matchups (
  character_name, counter_name, counter_skill, reason, sort_order
)
select
  character_name,
  matchup ->> 'name',
  coalesce(matchup ->> 'skill', ''),
  coalesce(matchup ->> 'reason', ''),
  sort_order
from expanded
where nullif(character_name, '') is not null
  and nullif(matchup ->> 'name', '') is not null
on conflict (character_name, counter_name) do update set
  counter_skill = excluded.counter_skill,
  reason = excluded.reason,
  sort_order = excluded.sort_order;

-- ============================================================================
-- Reusable weapon JSON importer
-- Accepts either a top-level array or an object containing one of:
-- weapons, weapon, data, items, guns.
-- ============================================================================
create or replace function public.seed_ff_weapons(p_payload jsonb)
returns integer
language plpgsql
set search_path = public
as $function$
declare
  v_items jsonb;
  v_affected integer := 0;
begin
  v_items := case jsonb_typeof(p_payload)
    when 'array' then p_payload
    when 'object' then coalesce(
      p_payload -> 'weapons',
      p_payload -> 'weapon',
      p_payload -> 'data',
      p_payload -> 'items',
      p_payload -> 'guns'
    )
    else null
  end;

  if v_items is null or jsonb_typeof(v_items) <> 'array' then
    raise exception 'Weapon payload must be a JSON array or contain a recognized array key.';
  end if;

  insert into public.ff_weapons (
    name, image_url, type, damage, rate_of_fire, "range", magazine_size,
    special_attributes, description, clash_squad, price, armory,
    aliases, attachments, recent_update, source_notes, last_verified,
    data_confidence, sources, sort_order, raw_data
  )
  select
    item ->> 'name',
    coalesce(item ->> 'image_url', ''),
    coalesce(item ->> 'type', ''),
    coalesce(item ->> 'damage', ''),
    coalesce(item ->> 'rate_of_fire', ''),
    coalesce(item ->> 'range', ''),
    coalesce(item ->> 'magazine_size', ''),
    coalesce(item ->> 'special_attributes', ''),
    coalesce(item ->> 'description', ''),
    coalesce(item ->> 'clash_squad', ''),
    coalesce(item ->> 'price', ''),
    coalesce(item ->> 'armory', ''),
    coalesce(item -> 'aliases', '[]'::jsonb),
    coalesce(item -> 'attachments', '[]'::jsonb),
    coalesce(item -> 'recent_update', '[]'::jsonb),
    coalesce(item -> 'source_notes', '[]'::jsonb),
    case
      when coalesce(item ->> 'last_verified', '') ~ '^\d{4}-\d{2}-\d{2}$'
        then (item ->> 'last_verified')::date
      else null
    end,
    coalesce(item ->> 'data_confidence', ''),
    coalesce(item -> 'sources', '[]'::jsonb),
    ordinality::integer,
    item
  from jsonb_array_elements(v_items) with ordinality as src(item, ordinality)
  where nullif(item ->> 'name', '') is not null
  on conflict (name) do update set
    image_url = excluded.image_url,
    type = excluded.type,
    damage = excluded.damage,
    rate_of_fire = excluded.rate_of_fire,
    "range" = excluded."range",
    magazine_size = excluded.magazine_size,
    special_attributes = excluded.special_attributes,
    description = excluded.description,
    clash_squad = excluded.clash_squad,
    price = excluded.price,
    armory = excluded.armory,
    aliases = excluded.aliases,
    attachments = excluded.attachments,
    recent_update = excluded.recent_update,
    source_notes = excluded.source_notes,
    last_verified = excluded.last_verified,
    data_confidence = excluded.data_confidence,
    sources = excluded.sources,
    sort_order = excluded.sort_order,
    raw_data = excluded.raw_data;

  get diagnostics v_affected = row_count;
  return v_affected;
end;
$function$;

-- Keep the administrative seed function unavailable to browser roles.
revoke all on function public.seed_ff_weapons(jsonb) from public;
revoke all on function public.seed_ff_weapons(jsonb) from anon;
revoke all on function public.seed_ff_weapons(jsonb) from authenticated;

-- Fetch and store weapon.json once. After this succeeds, the database no longer
-- depends on the JSON file for normal application reads.
do $weapon_http_seed$
declare
  v_status integer;
  v_content text;
  v_count integer;
begin
  select response.status, response.content
    into v_status, v_content
  from extensions.http_get(
    'https://raw.githubusercontent.com/misai-my/freefire-esports/refs/heads/main/weapon.json'
  ) as response;

  if v_status < 200 or v_status >= 300 then
    raise exception 'weapon.json returned HTTP status %', v_status;
  end if;

  v_count := public.seed_ff_weapons(v_content::jsonb);
  raise notice 'Seeded or updated % weapon records.', v_count;
exception
  when others then
    raise warning 'Automatic weapon import failed: %. The ff_weapons table and seed_ff_weapons(jsonb) function were still created.', sqlerrm;
end;
$weapon_http_seed$;

-- ============================================================================
-- Row Level Security: public read, no browser-side writes by default
-- ============================================================================
alter table public.ff_characters enable row level security;
alter table public.ff_pets enable row level security;
alter table public.ff_loadouts enable row level security;
alter table public.ff_counters enable row level security;
alter table public.ff_counter_matchups enable row level security;
alter table public.ff_weapons enable row level security;

drop policy if exists "Public read Free Fire characters" on public.ff_characters;
create policy "Public read Free Fire characters"
on public.ff_characters for select
to anon, authenticated
using (true);

drop policy if exists "Public read Free Fire pets" on public.ff_pets;
create policy "Public read Free Fire pets"
on public.ff_pets for select
to anon, authenticated
using (true);

drop policy if exists "Public read Free Fire loadouts" on public.ff_loadouts;
create policy "Public read Free Fire loadouts"
on public.ff_loadouts for select
to anon, authenticated
using (true);

drop policy if exists "Public read Free Fire counters" on public.ff_counters;
create policy "Public read Free Fire counters"
on public.ff_counters for select
to anon, authenticated
using (true);

drop policy if exists "Public read Free Fire counter matchups" on public.ff_counter_matchups;
create policy "Public read Free Fire counter matchups"
on public.ff_counter_matchups for select
to anon, authenticated
using (true);

drop policy if exists "Public read Free Fire weapons" on public.ff_weapons;
create policy "Public read Free Fire weapons"
on public.ff_weapons for select
to anon, authenticated
using (true);

grant select on table
  public.ff_characters,
  public.ff_pets,
  public.ff_loadouts,
  public.ff_counters,
  public.ff_counter_matchups,
  public.ff_weapons
  to anon, authenticated;

revoke insert, update, delete, truncate, references, trigger on table
  public.ff_characters,
  public.ff_pets,
  public.ff_loadouts,
  public.ff_counters,
  public.ff_counter_matchups,
  public.ff_weapons
  from anon, authenticated;

comment on table public.ff_characters is
  'Free Fire character and skill reference data imported from character.json.';
comment on table public.ff_pets is
  'Free Fire pet and pet-skill reference data imported from pet.json.';
comment on table public.ff_loadouts is
  'Free Fire loadout reference data; nested mode/cost/patch fields are JSONB.';
comment on table public.ff_counters is
  'Free Fire character counter summaries; original counters array retained as JSONB.';
comment on table public.ff_counter_matchups is
  'Normalized individual counter relationships generated from ff_counters.counters.';
comment on table public.ff_weapons is
  'Free Fire weapon reference data imported from weapon.json; mixed source values are retained as text.';

commit;

-- ============================================================================
-- Verification: the SQL editor should return one row per dataset.
-- ============================================================================
select 'characters' as dataset, count(*)::bigint as records from public.ff_characters
union all
select 'pets', count(*)::bigint from public.ff_pets
union all
select 'loadouts', count(*)::bigint from public.ff_loadouts
union all
select 'counters', count(*)::bigint from public.ff_counters
union all
select 'counter_matchups', count(*)::bigint from public.ff_counter_matchups
union all
select 'weapons', count(*)::bigint from public.ff_weapons
order by dataset;

-- Manual weapon fallback, only needed if the HTTP seed produced a warning:
-- 1. Copy the complete contents of weapon.json.
-- 2. Uncomment the statement below.
-- 3. Replace [] with the copied JSON array and run only that statement as an
--    owner/service-role connection.
--
-- select public.seed_ff_weapons($weapon_json$[]$weapon_json$::jsonb);
