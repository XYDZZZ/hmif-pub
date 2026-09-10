// assets/js/admin-auth.js
// Fungsi auth yang dipakai bersama di semua halaman admin.
// Membutuhkan supabaseClient dari ../public/assets/js/supabase-client.js
// (dimuat lebih dulu di setiap halaman admin).

/**
 * Dipanggil di awal halaman admin SELAIN login.html, untuk memastikan
 * hanya admin yang sudah login yang bisa mengakses. Kalau belum login,
 * langsung redirect ke login.html.
 */
async function requireAuth() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) {
    window.location.href = 'login.html';
    return null;
  }
  return session;
}

/**
 * Dipanggil di login.html: kalau ternyata sesi masih aktif, langsung
 * lempar ke dashboard supaya admin tidak perlu login ulang.
 */
async function redirectIfAuthed() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (session) window.location.href = 'dashboard.html';
}

/** Dipasang ke tombol logout (default id: "logoutBtn"). */
function bindLogout(buttonId = 'logoutBtn') {
  const btn = document.getElementById(buttonId);
  if (!btn) return;
  btn.addEventListener('click', async () => {
    await supabaseClient.auth.signOut();
    window.location.href = 'login.html';
  });
}

/** Dipasang di login.html untuk menangani submit form login. */
function bindLoginForm(formId = 'loginForm') {
  const form = document.getElementById(formId);
  const errorEl = document.getElementById('loginError');
  if (!form) return;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    errorEl.textContent = '';

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const submitBtn = form.querySelector('button[type="submit"]');

    submitBtn.disabled = true;
    submitBtn.textContent = 'Memproses…';

    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });

    submitBtn.disabled = false;
    submitBtn.textContent = 'Masuk';

    if (error) {
      errorEl.textContent = 'Email atau password salah.';
      return;
    }
    window.location.href = 'dashboard.html';
  });
}
