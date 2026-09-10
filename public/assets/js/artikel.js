// assets/js/artikel.js
// Logika halaman publik daftar Artikel (artikel.html).
// Sekarang dengan filter kategori (tab, server-side) DIGABUNG dengan
// pencarian judul (server-side, debounced) dan pagination "Muat Lebih
// Banyak" — semua bisa dipakai bersamaan.

(() => {
  const PAGE_SIZE = 6;
  const SEARCH_DEBOUNCE_MS = 400;

  const grid = document.getElementById('artikelGrid');
  const tabsContainer = document.getElementById('filterTabs');
  const loadMoreWrap = document.getElementById('loadMoreWrap');
  const loadMoreBtn = document.getElementById('loadMoreBtn');
  const searchInput = document.getElementById('searchInput');

  let currentItems = [];
  let currentPage = 0;
  let totalCount = 0;
  let searchTerm = '';
  let activeKategori = 'Semua';
  let isLoading = false;
  let debounceTimer = null;

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

  function buatExcerpt(html = '', maxLength = 140) {
    const teksPolos = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    if (teksPolos.length <= maxLength) return teksPolos;
    const potong = teksPolos.slice(0, maxLength);
    return `${potong.slice(0, potong.lastIndexOf(' '))}…`;
  }

  function renderSkeleton(count = PAGE_SIZE) {
    return Array.from({ length: count })
      .map(
        () => `
        <div class="skeleton-card">
          <div class="skeleton skeleton-card__thumb"></div>
          <div class="skeleton-card__body">
            <div class="skeleton skeleton-line skeleton-line--short"></div>
            <div class="skeleton skeleton-line skeleton-line--wide"></div>
            <div class="skeleton skeleton-line skeleton-line--mid"></div>
          </div>
        </div>`
      )
      .join('');
  }

  async function loadKategoriTabs() {
    const { data, error } = await supabaseClient.from('web_artikel').select('kategori');
    if (error) {
      console.error('Gagal memuat kategori:', error);
      return;
    }
    const kategoriUnik = [...new Set((data || []).map((a) => a.kategori).filter(Boolean))];
    if (kategoriUnik.length === 0) {
      tabsContainer.innerHTML = '';
      return;
    }
    const kategoriList = ['Semua', ...kategoriUnik];

    tabsContainer.innerHTML = kategoriList
      .map(
        (kategori, index) => `
        <button
          class="filter-tab ${index === 0 ? 'is-active' : ''}"
          data-kategori="${escapeHtml(kategori)}"
          role="tab"
          aria-selected="${index === 0}"
        >${escapeHtml(kategori)}</button>`
      )
      .join('');
  }

  async function fetchPage(page, { append = false } = {}) {
    if (isLoading) return;
    isLoading = true;

    if (!append) grid.innerHTML = renderSkeleton();
    loadMoreBtn.disabled = true;
    loadMoreBtn.textContent = 'Memuat…';

    let query = supabaseClient
      .from('web_artikel')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

    if (activeKategori !== 'Semua') {
      query = query.eq('kategori', activeKategori);
    }
    if (searchTerm) {
      query = query.ilike('judul', `%${searchTerm}%`);
    }

    const { data, error, count } = await query;
    isLoading = false;

    if (error) {
      console.error('Gagal memuat artikel:', error);
      grid.innerHTML = `<p class="artikel-state">Gagal memuat artikel. Coba muat ulang halaman.</p>`;
      loadMoreWrap.hidden = true;
      return;
    }

    totalCount = count ?? 0;
    currentItems = append ? [...currentItems, ...(data || [])] : (data || []);
    currentPage = page;

    renderGrid();
    updateLoadMoreButton();
  }

  function renderGrid() {
    if (currentItems.length === 0) {
      grid.innerHTML = `<p class="artikel-state">${
        searchTerm || activeKategori !== 'Semua'
          ? 'Tidak ada artikel yang cocok.'
          : 'Belum ada artikel yang dipublikasikan.'
      }</p>`;
      return;
    }

    grid.innerHTML = currentItems
      .map((artikel, index) => {
        const url = `artikel-detail.html?id=${encodeURIComponent(artikel.id)}`;
        const delay = Math.min(index * 60, 480);
        return `
        <article class="artikel-card reveal" style="transition-delay:${delay}ms">
          <a href="${url}" class="artikel-card__cover">
            <img src="${artikel.cover_url || ''}" alt="${escapeHtml(artikel.judul)}" loading="lazy" decoding="async" />
          </a>
          <div class="artikel-card__body">
            <span class="artikel-card__meta">${escapeHtml(artikel.penulis || 'HMIF Unperba')} &middot; ${formatTanggal(artikel.created_at)}</span>
            <h3 class="artikel-card__judul"><a href="${url}">${escapeHtml(artikel.judul)}</a></h3>
            <p class="artikel-card__excerpt">${escapeHtml(buatExcerpt(artikel.konten))}</p>
            <a class="artikel-card__link" href="${url}">Baca selengkapnya &rarr;</a>
          </div>
        </article>`;
      })
      .join('');

    window.initScrollReveal?.();
  }

  function updateLoadMoreButton() {
    loadMoreBtn.disabled = false;
    loadMoreBtn.textContent = 'Muat Lebih Banyak';
    loadMoreWrap.hidden = currentItems.length >= totalCount;
  }

  tabsContainer.addEventListener('click', (event) => {
    const tab = event.target.closest('.filter-tab');
    if (!tab) return;

    tabsContainer.querySelectorAll('.filter-tab').forEach((t) => {
      t.classList.remove('is-active');
      t.setAttribute('aria-selected', 'false');
    });
    tab.classList.add('is-active');
    tab.setAttribute('aria-selected', 'true');

    activeKategori = tab.dataset.kategori;
    fetchPage(0, { append: false });
  });

  searchInput.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      searchTerm = searchInput.value.trim();
      fetchPage(0, { append: false });
    }, SEARCH_DEBOUNCE_MS);
  });

  loadMoreBtn.addEventListener('click', () => {
    fetchPage(currentPage + 1, { append: true });
  });

  loadKategoriTabs();
  fetchPage(0);
})();
