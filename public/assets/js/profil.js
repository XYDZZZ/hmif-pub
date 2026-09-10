// assets/js/profil.js
// Menampilkan struktur organisasi dari VIEW `struktur_organisasi_publik`
// (lihat database/schema.sql) — view ini sudah menggabungkan
// anggota_periode + users + jabatan + divisi + foto, dan cuma mengekspos
// kolom yang aman untuk publik (nama, jabatan/divisi, foto).

(() => {
  const grid = document.getElementById('strukturGrid');
  if (!grid) return;

  function escapeHtml(text = '') {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function getInisial(nama = '') {
    return nama.trim().charAt(0).toUpperCase() || '?';
  }

  async function fetchStruktur() {
    const { data, error } = await supabaseClient
      .from('struktur_organisasi_publik')
      .select('*');

    if (error) {
      console.error('Gagal memuat data pengurus:', error);
      grid.innerHTML = `<p class="struktur-state">Gagal memuat struktur organisasi. Coba muat ulang halaman.</p>`;
      return;
    }

    renderStruktur(data || []);
  }

  function renderStruktur(anggotaList) {
    if (anggotaList.length === 0) {
      grid.innerHTML = `<p class="struktur-state">Data pengurus belum tersedia.</p>`;
      return;
    }

    grid.innerHTML = anggotaList
      .map((anggota, index) => {
        const nama = anggota.nama_lengkap || 'Tanpa nama';
        const jabatan = anggota.nama_jabatan || anggota.nama_divisi || '';
        const fotoUrl = anggota.foto_url || '';
        const delay = Math.min(index * 60, 480);

        return `
        <div class="member-card reveal" style="transition-delay:${delay}ms">
          <div class="member-card__photo">
            ${
              fotoUrl
                ? `<img src="${fotoUrl}" alt="Foto ${escapeHtml(nama)}" loading="lazy" />`
                : getInisial(nama)
            }
          </div>
          <h3 class="member-card__nama">${escapeHtml(nama)}</h3>
          ${jabatan ? `<span class="member-card__jabatan">${escapeHtml(jabatan)}</span>` : ''}
        </div>`;
      })
      .join('');

    window.initScrollReveal?.();
  }

  fetchStruktur();
})();
