// assets/js/galeri.js
// Halaman publik Galeri Kegiatan (galeri.html) — sekarang jadi daftar
// ALBUM per kegiatan (dikelompokkan dari kolom nama_kegiatan). Klik satu
// album membuka galeri-detail.html dengan foto-foto kegiatan itu.

(() => {
  const grid = document.getElementById('albumGrid');

  function escapeHtml(text = '') {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function renderSkeleton(count = 6) {
    return Array.from({ length: count })
      .map(
        () => `
        <div class="skeleton-card">
          <div class="skeleton skeleton-card__thumb"></div>
          <div class="skeleton-card__body">
            <div class="skeleton skeleton-line skeleton-line--wide"></div>
            <div class="skeleton skeleton-line skeleton-line--short"></div>
          </div>
        </div>`
      )
      .join('');
  }

  async function fetchAlbums() {
    grid.innerHTML = renderSkeleton();

    // Cuma ambil kolom yang perlu untuk daftar album — query tetap ringan
    // walau jumlah foto di database banyak.
    const { data, error } = await supabaseClient
      .from('web_galeri')
      .select('nama_kegiatan, image_url, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Gagal memuat galeri:', error);
      grid.innerHTML = `<p class="galeri-state">Gagal memuat galeri. Coba muat ulang halaman.</p>`;
      return;
    }

    renderAlbums(data || []);
  }

  function renderAlbums(rows) {
    if (rows.length === 0) {
      grid.innerHTML = `<p class="galeri-state">Belum ada dokumentasi kegiatan.</p>`;
      return;
    }

    const albums = new Map();
    rows.forEach((row) => {
      const nama = row.nama_kegiatan || 'Dokumentasi Lainnya';
      if (!albums.has(nama)) {
        albums.set(nama, { nama, cover: row.image_url, count: 0 });
      }
      albums.get(nama).count += 1;
    });

    grid.innerHTML = [...albums.values()]
      .map(
        (album, index) => {
          const delay = Math.min(index * 60, 480);
          return `
        <a class="album-card reveal" style="transition-delay:${delay}ms" href="galeri-detail.html?kegiatan=${encodeURIComponent(album.nama)}">
          <div class="album-card__thumb">
            <img src="${album.cover}" alt="${escapeHtml(album.nama)}" loading="lazy" decoding="async" />
          </div>
          <div class="album-card__caption">
            <h3 class="album-card__judul">${escapeHtml(album.nama)}</h3>
            <span class="album-card__count">${album.count} foto</span>
          </div>
        </a>`;
        }
      )
      .join('');

    window.initScrollReveal?.();
  }

  fetchAlbums();
})();
