-- =====================================================================
-- SKEMA DATABASE — WEBSITE PUBLIK HMIF UNPERBA
-- =====================================================================
-- Tabel-tabel di bawah ini SENGAJA diberi prefix "web_" agar terisolasi
-- dari tabel-tabel sistem admin internal yang sudah ada di project
-- Supabase yang sama. Tidak ada foreign key ke tabel internal, kecuali
-- referensi read-only ke tabel `anggota` yang sudah ada (lihat catatan
-- di bagian Beranda & Profil pada frontend, bukan di skema ini).
-- =====================================================================

-- Ekstensi untuk generate UUID (biasanya sudah aktif di Supabase)
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- 1. TABEL: web_karya  (Pojok Karya Mahasiswa)
-- ---------------------------------------------------------------------
create table if not exists public.web_karya (
  id              uuid primary key default gen_random_uuid(),
  judul_karya     text not null,
  kreator         text not null,              -- nama mahasiswa/tim
  deskripsi_html  text,                        -- deskripsi/artikel karya (rich text)
  kategori        text,                        -- misal: 'Web', 'Mobile', 'AI/ML', 'IoT'
  youtube_url     text,                        -- URL demo YouTube (thumbnail diekstrak di frontend)
  github_url      text,                        -- URL repository GitHub
  created_at      timestamptz not null default now()
);

comment on table public.web_karya is 'Katalog karya mahasiswa untuk halaman publik "Pojok Karya Mahasiswa"';

-- ---------------------------------------------------------------------
-- 2. TABEL: web_galeri  (Galeri Kegiatan)
-- ---------------------------------------------------------------------
create table if not exists public.web_galeri (
  id               uuid primary key default gen_random_uuid(),
  judul_foto       text not null,
  kategori_filter  text,                       -- misal: 'Hari ke-1', 'Seminar', 'Semua'
  image_url        text not null,
  created_at       timestamptz not null default now()
);

comment on table public.web_galeri is 'Dokumentasi kegiatan untuk halaman publik Galeri, difilter via tabs';

-- ---------------------------------------------------------------------
-- 3. TABEL: web_artikel  (Artikel/Essay/Berita)
-- ---------------------------------------------------------------------
create table if not exists public.web_artikel (
  id          uuid primary key default gen_random_uuid(),
  judul       text not null,
  konten      text not null,                   -- boleh HTML/markdown hasil rich text editor admin
  penulis     text,
  cover_url   text,
  created_at  timestamptz not null default now()
);

comment on table public.web_artikel is 'Artikel/essay/berita publikasi mahasiswa';

-- Index bantu untuk sorting terbaru & filter kategori (dipakai terus-menerus di frontend)
create index if not exists idx_web_karya_created_at on public.web_karya (created_at desc);
create index if not exists idx_web_karya_kategori    on public.web_karya (kategori);
create index if not exists idx_web_galeri_kategori   on public.web_galeri (kategori_filter);
create index if not exists idx_web_artikel_created_at on public.web_artikel (created_at desc);

-- =====================================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================================
-- Aturan: role anon (publik) HANYA boleh SELECT.
--         role authenticated (admin login) boleh SELECT + INSERT + UPDATE + DELETE.
-- Policy dipisah per-operasi (bukan pakai "for all") supaya lebih eksplisit
-- dan mudah diaudit satu per satu.
-- =====================================================================

alter table public.web_karya   enable row level security;
alter table public.web_galeri  enable row level security;
alter table public.web_artikel enable row level security;

-- ---------- web_karya ----------
create policy "web_karya: publik & admin bisa lihat"
  on public.web_karya for select
  to anon, authenticated
  using (true);

create policy "web_karya: admin bisa tambah"
  on public.web_karya for insert
  to authenticated
  with check (true);

create policy "web_karya: admin bisa ubah"
  on public.web_karya for update
  to authenticated
  using (true)
  with check (true);

create policy "web_karya: admin bisa hapus"
  on public.web_karya for delete
  to authenticated
  using (true);

-- ---------- web_galeri ----------
create policy "web_galeri: publik & admin bisa lihat"
  on public.web_galeri for select
  to anon, authenticated
  using (true);

create policy "web_galeri: admin bisa tambah"
  on public.web_galeri for insert
  to authenticated
  with check (true);

create policy "web_galeri: admin bisa ubah"
  on public.web_galeri for update
  to authenticated
  using (true)
  with check (true);

create policy "web_galeri: admin bisa hapus"
  on public.web_galeri for delete
  to authenticated
  using (true);

-- ---------- web_artikel ----------
create policy "web_artikel: publik & admin bisa lihat"
  on public.web_artikel for select
  to anon, authenticated
  using (true);

create policy "web_artikel: admin bisa tambah"
  on public.web_artikel for insert
  to authenticated
  with check (true);

create policy "web_artikel: admin bisa ubah"
  on public.web_artikel for update
  to authenticated
  using (true)
  with check (true);

create policy "web_artikel: admin bisa hapus"
  on public.web_artikel for delete
  to authenticated
  using (true);

-- =====================================================================
-- CATATAN PENTING SOAL ADMIN
-- =====================================================================
-- "authenticated" di Supabase berarti SIAPA SAJA yang berhasil login lewat
-- Supabase Auth (email/password, dsb) — bukan cuma pengurus HMIF.
-- Karena project ini sudah berbagi Supabase Auth dengan sistem admin
-- internal, pastikan hanya akun pengurus yang benar-benar didaftarkan di
-- Supabase Auth project ini. Jangan aktifkan public sign-up di halaman
-- admin/login.html — akun admin dibuat manual oleh super-admin lewat
-- Supabase Dashboard atau lewat endpoint terpisah yang tidak diekspos ke
-- publik. Untuk keamanan lebih ketat (opsional, level lanjutan), tambahkan
-- kolom role di tabel profil admin dan ganti `to authenticated` di atas
-- dengan pengecekan tambahan via fungsi `is_admin()`.

-- =====================================================================
-- CATATAN TAMBAHAN — TABEL `anggota` (SUDAH ADA, dipakai READ-ONLY oleh profil.html)
-- =====================================================================
-- Halaman Profil (Struktur Organisasi) melakukan SELECT ke tabel `anggota`
-- yang sudah ada di project ini. JANGAN jalankan CREATE TABLE untuk
-- `anggota` di sini — tabel itu milik sistem admin internal.
--
-- Yang perlu dipastikan HANYA satu hal: tabel `anggota` sudah punya RLS
-- policy yang mengizinkan role `anon` melakukan SELECT. Kalau sebelumnya
-- tabel itu hanya bisa diakses oleh `authenticated` (dari sistem admin
-- internal), tambahkan policy berikut supaya publik juga bisa membacanya
-- (read-only, tetap tidak bisa insert/update/delete):
--
-- create policy "Publik bisa lihat anggota"
--   on public.anggota for select
--   to anon
--   using (true);
--
-- Jalankan query di atas HANYA jika `anggota` belum punya policy select
-- untuk anon — cek dulu di Supabase Dashboard > Authentication > Policies.

-- =====================================================================
-- STORAGE BUCKET — untuk fitur upload gambar dari panel admin
-- (galeri-crud.html dan artikel-crud.html)
-- =====================================================================
-- Bucket ini dibuat public (boleh dibaca siapa saja lewat URL publiknya)
-- tapi upload/hapus tetap dibatasi hanya untuk admin (authenticated).

insert into storage.buckets (id, name, public)
values ('web-media', 'web-media', true)
on conflict (id) do nothing;

create policy "web-media: publik bisa lihat"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'web-media');

create policy "web-media: admin bisa upload"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'web-media');

create policy "web-media: admin bisa hapus"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'web-media');

-- Catatan: kalau query INSERT ke storage.buckets di atas gagal karena izin
-- (tergantung role yang menjalankan SQL Editor), buat bucket-nya manual
-- lewat Supabase Dashboard > Storage > New Bucket, nama "web-media",
-- centang "Public bucket" — lalu tetap jalankan 3 query CREATE POLICY
-- di atas supaya aturan aksesnya benar.

-- =====================================================================
-- FOTO PENGURUS + VIEW STRUKTUR ORGANISASI PUBLIK
-- =====================================================================
-- Tabel users, anggota_periode, jabatan, periode, divisi adalah tabel
-- SISTEM INTERNAL yang sudah ada. TIDAK ada satu pun ALTER TABLE ke
-- tabel-tabel itu di sini — foto pengurus disimpan di tabel baru
-- terpisah (web_anggota_foto), dihubungkan lewat id_user, sesuai prinsip
-- isolasi yang dipakai sejak awal proyek ini.

create table if not exists public.web_anggota_foto (
  id_user     uuid primary key references public.users (id_user) on delete cascade,
  foto_url    text not null,
  updated_at  timestamptz not null default now()
);

alter table public.web_anggota_foto enable row level security;

create policy "web_anggota_foto: publik & admin bisa lihat"
  on public.web_anggota_foto for select
  to anon, authenticated
  using (true);

create policy "web_anggota_foto: admin bisa tambah"
  on public.web_anggota_foto for insert
  to authenticated
  with check (true);

create policy "web_anggota_foto: admin bisa ubah"
  on public.web_anggota_foto for update
  to authenticated
  using (true)
  with check (true);

create policy "web_anggota_foto: admin bisa hapus"
  on public.web_anggota_foto for delete
  to authenticated
  using (true);

-- VIEW: gabungan pengurus dari PERIODE AKTIF + jabatan/divisi + foto.
-- Sengaja HANYA expose kolom yang aman untuk publik. Kolom sensitif di
-- users (password_hash, kode_kartu, nomor_whatsapp, nim, dll) TIDAK ikut
-- ter-expose sama sekali karena tidak disebut di SELECT ini.
create or replace view public.struktur_organisasi_publik as
select
  u.id_user,
  u.nama_lengkap,
  j.nama_jabatan,
  d.nama_divisi,
  wf.foto_url
from public.anggota_periode ap
join public.users u    on u.id_user = ap.id_user
join public.periode p  on p.id_periode = ap.id_periode
left join public.jabatan j            on j.id_jabatan = ap.id_jabatan
left join public.divisi d             on d.id_divisi = ap.id_divisi
left join public.web_anggota_foto wf  on wf.id_user = u.id_user
where p.status_aktif = true
  and u.deleted_at is null
  and u.status = 'Aktif';

grant select on public.struktur_organisasi_publik to anon, authenticated;

-- Catatan: view ini otomatis ikut periode yang status_aktif = true di
-- tabel periode. Kalau nanti pengurus sistem internal ganti periode
-- aktif, struktur organisasi di web publik ikut berubah otomatis tanpa
-- perlu ubah apa pun di sini.

-- =====================================================================
-- GALERI DUA TINGKAT: Kegiatan (album) -> Kategori (mis. Hari 1/Hari 2)
-- =====================================================================
-- Tambah kolom nama_kegiatan ke tabel web_galeri yang sudah ada (aman,
-- kolom baru boleh kosong untuk baris lama). Foto publik sekarang
-- dikelompokkan per kegiatan dulu, baru difilter per kategori di
-- dalam kegiatan itu (lihat public/galeri.html & galeri-detail.html).

alter table public.web_galeri add column if not exists nama_kegiatan text;

create index if not exists idx_web_galeri_kegiatan on public.web_galeri (nama_kegiatan);

-- =====================================================================
-- KATEGORI & FILTER UNTUK ARTIKEL
-- =====================================================================
alter table public.web_artikel add column if not exists kategori text;

create index if not exists idx_web_artikel_kategori on public.web_artikel (kategori);
