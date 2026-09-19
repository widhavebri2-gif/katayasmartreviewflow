-- ============================================================
-- Kataya Smart Review — Skema Supabase
-- Jalankan seluruh isi file ini di Supabase Dashboard > SQL Editor
-- ============================================================

-- 1. TABEL BISNIS (branches, settings, qrSettings, reviews tetap JSON
--    supaya bentuk data sama persis dengan yang dipakai di dashboard.html,
--    developer.html, dll — jadi kode HTML tidak perlu diubah cara bacanya)
create table if not exists businesses (
  id                 text primary key,
  pin                text not null default '1234',
  business_name      text not null,
  business_type      text default 'Kuliner (F&B)',
  place_id           text,
  whatsapp           text,
  status             text not null default 'pending', -- 'pending' | 'active'
  package_type       text not null default 'single',  -- 'single' | 'multi' | 'franchise'
  activation_token   text,
  activation_used    boolean not null default false,
  has_nfc_feature    boolean not null default true,
  standee_code       text,
  google_rating      numeric,
  google_review_count integer,
  created_at         timestamptz not null default now(),
  activated_at       timestamptz,
  last_accessed_at   timestamptz not null default now(),
  upgraded_at        timestamptz,
  branches           jsonb not null default '[]'::jsonb,
  settings           jsonb not null default '{}'::jsonb,
  qr_settings        jsonb not null default '{}'::jsonb,
  reviews            jsonb not null default '[]'::jsonb
);

create index if not exists idx_businesses_standee_code on businesses (standee_code);
create index if not exists idx_businesses_whatsapp on businesses (whatsapp);

-- 2. TABEL STANDEE (barcode/NFC meja)
create table if not exists standees (
  code         text primary key,
  business_id  text references businesses(id) on delete set null,
  label        text,
  created_at   timestamptz not null default now(),
  claimed_at   timestamptz
);

-- 3. LOG BOT WHATSAPP DEVELOPER
create table if not exists bot_logs (
  id            bigserial primary key,
  created_at    timestamptz not null default now(),
  entry         jsonb not null
);

-- 4. PERMINTAAN RESET PIN MITRA
create table if not exists pin_requests (
  id            text primary key,
  business_id   text references businesses(id) on delete set null,
  business_name text,
  phone         text,
  dev_phone     text,
  status        text not null default 'MENUNGGU_DEVELOPER',
  request_message text,
  new_pin       text,
  created_at    timestamptz not null default now(),
  sent_at       timestamptz
);

-- 5. KONFIGURASI APLIKASI (nomor WA developer, dll) — key/value sederhana
create table if not exists app_config (
  key   text primary key,
  value text
);
insert into app_config (key, value) values ('dev_bot_phone', '6285856640045')
  on conflict (key) do nothing;

-- ============================================================
-- ROW LEVEL SECURITY
-- ⚠️ CATATAN PENTING SOAL KEAMANAN:
-- Aplikasi ini saat ini memverifikasi PIN developer ('2202') dan PIN
-- mitra langsung di kode JavaScript sisi browser (bukan di server).
-- Itu artinya siapa pun yang buka DevTools bisa lihat PIN developer
-- dan, dengan anon key, bisa langsung baca/tulis tabel-tabel ini
-- tanpa melalui pengecekan PIN sama sekali — persis seperti kondisi
-- localStorage sekarang (siapa saja yang pegang browser/device bisa
-- edit langsung), tapi sekarang berlaku untuk SEMUA device sekaligus.
-- Policy di bawah ini dibuat PERMISIF supaya aplikasi tetap jalan
-- sama seperti sekarang. Untuk keamanan produksi yang lebih baik,
-- langkah berikutnya adalah pindahkan aksi sensitif (activateBusiness,
-- verifyDeveloperPin, sendNewPinByDeveloper) ke Supabase Edge Function
-- yang pegang service role key, bukan dipanggil langsung dari browser.
-- ============================================================

alter table businesses enable row level security;
alter table standees enable row level security;
alter table bot_logs enable row level security;
alter table pin_requests enable row level security;
alter table app_config enable row level security;

create policy "public read businesses" on businesses for select using (true);
create policy "public insert businesses" on businesses for insert with check (true);
create policy "public update businesses" on businesses for update using (true);
create policy "public delete businesses" on businesses for delete using (true);

create policy "public read standees" on standees for select using (true);
create policy "public insert standees" on standees for insert with check (true);
create policy "public update standees" on standees for update using (true);

create policy "public read bot_logs" on bot_logs for select using (true);
create policy "public insert bot_logs" on bot_logs for insert with check (true);
create policy "public delete bot_logs" on bot_logs for delete using (true);

create policy "public read pin_requests" on pin_requests for select using (true);
create policy "public insert pin_requests" on pin_requests for insert with check (true);
create policy "public update pin_requests" on pin_requests for update using (true);

create policy "public read app_config" on app_config for select using (true);
create policy "public update app_config" on app_config for update using (true);
