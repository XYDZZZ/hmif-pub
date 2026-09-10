// assets/js/supabase-client.js
//
// Inisialisasi Supabase Client (dipakai bersama di seluruh halaman publik).
// GANTI dua nilai di bawah dengan URL & anon key project Supabase kamu —
// bisa dilihat di Dashboard Supabase > Project Settings > API.
//
// anon key AMAN untuk ditaruh di kode frontend (client-side): akses
// sesungguhnya dibatasi oleh policy Row Level Security di database,
// bukan oleh rahasia key ini. JANGAN pernah taruh service_role key di sini.

const SUPABASE_URL = "https://guozgesniwfpnzzjttzy.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd1b3pnZXNuaXdmcG56emp0dHp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ0MjM5NzIsImV4cCI6MjA5OTk5OTk3Mn0.hIQSMrKBx1ktIoBtW7pfxv0dpLs7iHn_LXFozJYl4EY";

// `supabase` (huruf kecil) adalah objek global dari <script> CDN.
// Kita simpan instance client sebagai `supabaseClient` agar tidak bentrok
// nama dengan objek global tersebut.
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
