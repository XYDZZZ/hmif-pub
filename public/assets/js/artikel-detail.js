// assets/js/artikel-detail.js
// Logika halaman detail satu artikel (artikel-detail.html?id=...).

(() => {
  const container = document.getElementById('artikelDetail');

  function escapeHtml(text = '') {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function formatTanggal(isoString) {
    return new Date(isoString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  async function fetchArtikel() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');

    if (!id) {
      container.innerHTML = `<p class="artikel-state">Artikel tidak ditemukan.</p>`;
      return;
    }

    const { data: artikel, error } = await supabaseClient
      .from('web_artikel')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !artikel) {
      container.innerHTML = `<p class="artikel-state">Artikel tidak ditemukan atau sudah dihapus.</p>`;
      return;
    }

    document.title = `${artikel.judul} — HMIF Unperba`;

    container.innerHTML = `
      ${
        artikel.cover_url
          ? `<div class="artikel-detail__cover"><img src="${artikel.cover_url}" alt="${escapeHtml(artikel.judul)}" /></div>`
          : ''
      }
      <span class="artikel-detail__meta">${escapeHtml(artikel.penulis || 'HMIF Unperba')} &middot; ${formatTanggal(artikel.created_at)}</span>
      <h1>${escapeHtml(artikel.judul)}</h1>
      <div class="artikel-detail__content">${artikel.konten || ''}</div>
    `;
  }

  fetchArtikel();
})();
