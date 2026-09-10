// assets/js/karya.js
// Logika halaman publik "Pojok Karya Mahasiswa" (karya.html).
// Vanilla JS ES6+. Filter tab & pagination ("Muat Lebih Banyak") query
// langsung ke server lewat Supabase (bukan filter di sisi client),
// supaya tetap ringan walau datanya banyak.

(() => {
  const PAGE_SIZE = 9;

  const grid = document.getElementById('karyaGrid');
  const tabsContainer = document.getElementById('filterTabs');
  const modal = document.getElementById('karyaModal');
  const modalPanel = modal.querySelector('.karya-modal__panel');
  const loadMoreWrap = document.getElementById('loadMoreWrap');
  const loadMoreBtn = document.getElementById('loadMoreBtn');

  let currentItems = [];      // item yang sedang tampil di grid
  let activeKategori = 'Semua';
  let currentPage = 0;
  let totalCount = 0;
  let isLoading = false;

  function extractYoutubeId(url) {
    if (!url) return null;
    const patterns = [
      /youtube\.com\/watch\?v=([\w-]{11})/,
      /youtu\.be\/([\w-]{11})/,
      /youtube\.com\/embed\/([\w-]{11})/,
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  }

  function getYoutubeThumbnail(youtubeId) {
    return youtubeId
      ? `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`
      : 'assets/img/thumbnail-fallback.jpg';
  }

  function escapeHtml(text = '') {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
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

  // --- Ambil daftar kategori unik untuk tab (query ringan: cuma 1 kolom) ---
  async function loadKategoriTabs() {
    const { data, error } = await supabaseClient.from('web_karya').select('kategori');
    if (error) {
      console.error('Gagal memuat kategori:', error);
      return;
    }
    const kategoriUnik = [...new Set((data || []).map((k) => k.kategori).filter(Boolean))];
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

  // --- Ambil satu halaman data (page ke-n) dari server ---
  async function fetchPage(page, { append = false } = {}) {
    if (isLoading) return;
    isLoading = true;

    if (!append) grid.innerHTML = renderSkeleton();
    loadMoreBtn.disabled = true;
    loadMoreBtn.textContent = 'Memuat…';

    let query = supabaseClient
      .from('web_karya')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

    if (activeKategori !== 'Semua') {
      query = query.eq('kategori', activeKategori);
    }

    const { data, error, count } = await query;
    isLoading = false;

    if (error) {
      console.error('Gagal memuat data karya:', error);
      grid.innerHTML = `<p class="karya-state">Gagal memuat data. Coba muat ulang halaman.</p>`;
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
      grid.innerHTML = `<p class="karya-state">Belum ada karya pada kategori ini.</p>`;
      return;
    }

    grid.innerHTML = currentItems
      .map((karya, index) => {
        const youtubeId = extractYoutubeId(karya.youtube_url);
        const thumbUrl = getYoutubeThumbnail(youtubeId);
        const delay = Math.min(index * 60, 480);

        return `
        <button class="karya-card reveal" style="transition-delay:${delay}ms" data-id="${karya.id}" type="button">
          <div class="karya-card__thumb">
            <img src="${thumbUrl}" alt="Thumbnail ${escapeHtml(karya.judul_karya)}" loading="lazy" />
            <div class="karya-card__play"><span>&#9654;</span></div>
          </div>
          <div class="karya-card__body">
            <span class="karya-card__kategori">${escapeHtml(karya.kategori || 'Umum')}</span>
            <h3 class="karya-card__title">${escapeHtml(karya.judul_karya)}</h3>
            <span class="karya-card__kreator">${escapeHtml(karya.kreator)}</span>
          </div>
        </button>`;
      })
      .join('');

    window.initScrollReveal?.();
  }

  function updateLoadMoreButton() {
    loadMoreBtn.disabled = false;
    loadMoreBtn.textContent = 'Muat Lebih Banyak';
    loadMoreWrap.hidden = currentItems.length >= totalCount;
  }

  function openModal(karya) {
    const youtubeId = extractYoutubeId(karya.youtube_url);

    modalPanel.innerHTML = `
      <button class="karya-modal__close" type="button" aria-label="Tutup detail karya">&#10005;</button>
      <span class="karya-modal__kategori">${escapeHtml(karya.kategori || 'Umum')}</span>
      <h2>${escapeHtml(karya.judul_karya)}</h2>
      <p class="karya-modal__kreator">Oleh ${escapeHtml(karya.kreator)}</p>
      ${
        youtubeId
          ? `<div class="karya-modal__video">
               <iframe
                 src="https://www.youtube.com/embed/${youtubeId}"
                 title="${escapeHtml(karya.judul_karya)}"
                 allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                 allowfullscreen
               ></iframe>
             </div>`
          : ''
      }
      <div class="karya-modal__desc">${karya.deskripsi_html || ''}</div>
      <div class="karya-modal__actions">
        ${
          karya.github_url
            ? `<a class="btn btn-primary" href="${karya.github_url}" target="_blank" rel="noopener noreferrer">Lihat Repository GitHub</a>`
            : ''
        }
      </div>
    `;

    modal.classList.add('is-open');
    modal.querySelector('.karya-modal__close').addEventListener('click', closeModal);
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    modal.classList.remove('is-open');
    modalPanel.innerHTML = '';
    document.body.style.overflow = '';
  }

  // --- Klik tab filter: reset ke halaman 0 dengan kategori baru ---
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

  // --- Klik kartu karya untuk buka detail ---
  grid.addEventListener('click', (event) => {
    const card = event.target.closest('.karya-card');
    if (!card) return;
    const karya = currentItems.find((k) => k.id === card.dataset.id);
    if (karya) openModal(karya);
  });

  // --- Tombol Muat Lebih Banyak ---
  loadMoreBtn.addEventListener('click', () => {
    fetchPage(currentPage + 1, { append: true });
  });

  // --- Tutup modal: klik backdrop atau tombol Escape ---
  modal.addEventListener('click', (event) => {
    if (event.target.classList.contains('karya-modal__backdrop')) closeModal();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && modal.classList.contains('is-open')) closeModal();
  });

  loadKategoriTabs();
  fetchPage(0);
})();
