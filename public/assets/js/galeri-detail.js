// assets/js/galeri-detail.js
// Halaman detail satu kegiatan (galeri-detail.html?kegiatan=...).
// Foto difilter per kategori (mis. Hari 1/Hari 2) DI DALAM kegiatan ini
// saja. Lightbox dilengkapi navigasi Prev/Next (tombol, keyboard panah,
// dan swipe di layar sentuh) supaya bisa "digeser" tanpa tutup-buka lagi.

(() => {
  const PAGE_SIZE = 12;

  const params = new URLSearchParams(window.location.search);
  const namaKegiatan = params.get('kegiatan') || '';

  const titleEl = document.getElementById('kegiatanTitle');
  const grid = document.getElementById('galeriGrid');
  const tabsContainer = document.getElementById('filterTabs');
  const loadMoreWrap = document.getElementById('loadMoreWrap');
  const loadMoreBtn = document.getElementById('loadMoreBtn');
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = lightbox.querySelector('.lightbox__panel img');
  const lightboxCaption = lightbox.querySelector('.lightbox__caption');
  const lightboxClose = lightbox.querySelector('.lightbox__close');
  const lightboxPrev = lightbox.querySelector('.lightbox__nav--prev');
  const lightboxNext = lightbox.querySelector('.lightbox__nav--next');

  let currentItems = [];
  let activeKategori = 'Semua';
  let currentPage = 0;
  let totalCount = 0;
  let isLoading = false;
  let lightboxIndex = -1;

  function escapeHtml(text = '') {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function renderSkeleton(count = PAGE_SIZE) {
    return Array.from({ length: count })
      .map(() => `<div class="skeleton-card"><div class="skeleton skeleton-card__thumb"></div></div>`)
      .join('');
  }

  async function loadKategoriTabs() {
    const { data, error } = await supabaseClient
      .from('web_galeri')
      .select('kategori_filter')
      .eq('nama_kegiatan', namaKegiatan);

    if (error) {
      console.error('Gagal memuat kategori:', error);
      return;
    }

    const kategoriUnik = [...new Set((data || []).map((f) => f.kategori_filter).filter(Boolean))];
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
    if (isLoading || !namaKegiatan) return;
    isLoading = true;

    if (!append) grid.innerHTML = renderSkeleton();
    loadMoreBtn.disabled = true;
    loadMoreBtn.textContent = 'Memuat…';

    let query = supabaseClient
      .from('web_galeri')
      .select('*', { count: 'exact' })
      .eq('nama_kegiatan', namaKegiatan)
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

    if (activeKategori !== 'Semua') {
      query = query.eq('kategori_filter', activeKategori);
    }

    const { data, error, count } = await query;
    isLoading = false;

    if (error) {
      console.error('Gagal memuat foto:', error);
      grid.innerHTML = `<p class="galeri-state">Gagal memuat foto. Coba muat ulang halaman.</p>`;
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
      grid.innerHTML = `<p class="galeri-state">Belum ada foto pada kategori ini.</p>`;
      return;
    }

    grid.innerHTML = currentItems
      .map(
        (foto, index) => `
        <button class="galeri-card reveal" style="transition-delay:${Math.min(index * 60, 480)}ms" data-index="${index}" type="button">
          <div class="galeri-card__thumb">
            <img src="${foto.image_url}" alt="${escapeHtml(foto.judul_foto)}" loading="lazy" decoding="async" />
          </div>
          <div class="galeri-card__caption">
            <span class="galeri-card__kategori">${escapeHtml(foto.kategori_filter || 'Umum')}</span>
            <h3 class="galeri-card__judul">${escapeHtml(foto.judul_foto)}</h3>
          </div>
        </button>`
      )
      .join('');

    window.initScrollReveal?.();
  }

  function updateLoadMoreButton() {
    loadMoreBtn.disabled = false;
    loadMoreBtn.textContent = 'Muat Lebih Banyak';
    loadMoreWrap.hidden = currentItems.length >= totalCount;
  }

  // --- Lightbox dengan navigasi Prev/Next ---
  function openLightbox(index) {
    lightboxIndex = index;
    showLightboxImage();
    lightbox.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }

  function showLightboxImage() {
    const foto = currentItems[lightboxIndex];
    if (!foto) return;
    lightboxImg.src = foto.image_url;
    lightboxImg.alt = foto.judul_foto;
    lightboxCaption.textContent = foto.judul_foto;
    lightboxPrev.hidden = lightboxIndex <= 0;
    lightboxNext.hidden = lightboxIndex >= currentItems.length - 1;
  }

  function closeLightbox() {
    lightbox.classList.remove('is-open');
    lightboxImg.src = '';
    document.body.style.overflow = '';
    lightboxIndex = -1;
  }

  function showPrev() {
    if (lightboxIndex > 0) {
      lightboxIndex -= 1;
      showLightboxImage();
    }
  }

  function showNext() {
    if (lightboxIndex < currentItems.length - 1) {
      lightboxIndex += 1;
      showLightboxImage();
    }
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

  grid.addEventListener('click', (event) => {
    const card = event.target.closest('.galeri-card');
    if (!card) return;
    openLightbox(Number(card.dataset.index));
  });

  loadMoreBtn.addEventListener('click', () => {
    fetchPage(currentPage + 1, { append: true });
  });

  lightboxClose.addEventListener('click', closeLightbox);
  lightboxPrev.addEventListener('click', showPrev);
  lightboxNext.addEventListener('click', showNext);

  lightbox.addEventListener('click', (event) => {
    if (event.target.classList.contains('lightbox__backdrop')) closeLightbox();
  });

  document.addEventListener('keydown', (event) => {
    if (!lightbox.classList.contains('is-open')) return;
    if (event.key === 'Escape') closeLightbox();
    if (event.key === 'ArrowLeft') showPrev();
    if (event.key === 'ArrowRight') showNext();
  });

  // --- Swipe geser di layar sentuh (native, tanpa library) ---
  let touchStartX = 0;
  lightbox.addEventListener(
    'touchstart',
    (event) => {
      touchStartX = event.changedTouches[0].clientX;
    },
    { passive: true }
  );

  lightbox.addEventListener(
    'touchend',
    (event) => {
      const deltaX = event.changedTouches[0].clientX - touchStartX;
      if (Math.abs(deltaX) < 40) return;
      if (deltaX > 0) showPrev();
      else showNext();
    },
    { passive: true }
  );

  if (!namaKegiatan) {
    titleEl.textContent = 'Kegiatan tidak ditemukan';
    grid.innerHTML = `<p class="galeri-state">Kegiatan tidak ditemukan.</p>`;
  } else {
    titleEl.textContent = namaKegiatan;
    document.title = `${namaKegiatan} — Galeri HMIF Unperba`;
    loadKategoriTabs();
    fetchPage(0);
  }
})();
