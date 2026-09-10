// assets/js/artikel-crud.js
// CRUD Artikel (tabel web_artikel) untuk panel admin, sekarang dengan
// field Kategori (dipakai untuk filter tab di halaman publik artikel.html).

(async () => {
  const session = await requireAuth();
  if (!session) return;
  bindLogout();

  const form = document.getElementById('artikelForm');
  const idField = document.getElementById('artikelId');
  const formTitle = document.getElementById('formTitle');
  const formError = document.getElementById('formError');
  const submitBtn = document.getElementById('submitBtn');
  const cancelEditBtn = document.getElementById('cancelEditBtn');
  const tableBody = document.getElementById('artikelTableBody');
  const kategoriInput = document.getElementById('kategori');
  const kategoriList = document.getElementById('kategoriList');

  const FIELDS = ['judul', 'kategori', 'penulis', 'cover_url', 'konten'];
  let cachedArtikel = [];

  function getFormValues() {
    const values = {};
    FIELDS.forEach((name) => {
      values[name] = document.getElementById(name).value.trim();
    });
    return values;
  }

  function fillForm(artikel) {
    idField.value = artikel.id;
    FIELDS.forEach((name) => {
      document.getElementById(name).value = artikel[name] || '';
    });
    showExistingPreview('coverPreview', artikel.cover_url);
    document.getElementById('uploadStatus').textContent = '';
    formTitle.textContent = 'Ubah Artikel';
    submitBtn.textContent = 'Update Artikel';
    cancelEditBtn.hidden = false;
  }

  function resetForm() {
    form.reset();
    idField.value = '';
    document.getElementById('coverPreview').innerHTML = '';
    document.getElementById('uploadStatus').textContent = '';
    formTitle.textContent = 'Tulis Artikel Baru';
    submitBtn.textContent = 'Publikasikan';
    cancelEditBtn.hidden = true;
    formError.textContent = '';
  }

  function escapeHtml(text = '') {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function updateKategoriSuggestions() {
    const kategoriUnik = [...new Set(cachedArtikel.map((a) => a.kategori).filter(Boolean))];
    kategoriList.innerHTML = kategoriUnik.map((k) => `<option value="${escapeHtml(k)}"></option>`).join('');
  }

  bindImageUpload({
    fileInputId: 'cover_file',
    hiddenInputId: 'cover_url',
    previewId: 'coverPreview',
    statusId: 'uploadStatus',
  });

  async function loadArtikel() {
    tableBody.innerHTML = `<tr><td colspan="4">Memuat data…</td></tr>`;

    const { data, error } = await supabaseClient
      .from('web_artikel')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      tableBody.innerHTML = `<tr><td colspan="4">Gagal memuat data: ${escapeHtml(error.message)}</td></tr>`;
      return;
    }

    cachedArtikel = data || [];
    updateKategoriSuggestions();

    if (cachedArtikel.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="4">Belum ada artikel. Tulis lewat form di atas.</td></tr>`;
      return;
    }

    tableBody.innerHTML = cachedArtikel
      .map(
        (artikel) => `
        <tr>
          <td>${escapeHtml(artikel.judul)}</td>
          <td>${escapeHtml(artikel.kategori || '-')}</td>
          <td>${escapeHtml(artikel.penulis || '-')}</td>
          <td class="admin-table__actions">
            <button class="btn-link" type="button" data-action="edit" data-id="${artikel.id}">Ubah</button>
            <button class="btn-link btn-link--danger" type="button" data-action="delete" data-id="${artikel.id}">Hapus</button>
          </td>
        </tr>`
      )
      .join('');
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    formError.textContent = '';

    const values = getFormValues();
    if (!values.judul || !values.konten) {
      formError.textContent = 'Judul dan konten wajib diisi.';
      return;
    }

    submitBtn.disabled = true;
    const isEdit = Boolean(idField.value);

    const { error } = isEdit
      ? await supabaseClient.from('web_artikel').update(values).eq('id', idField.value)
      : await supabaseClient.from('web_artikel').insert(values);

    submitBtn.disabled = false;

    if (error) {
      formError.textContent = `Gagal menyimpan: ${error.message}`;
      return;
    }

    resetForm();
    loadArtikel();
  });

  cancelEditBtn.addEventListener('click', resetForm);

  tableBody.addEventListener('click', async (event) => {
    const btn = event.target.closest('button[data-action]');
    if (!btn) return;

    const artikel = cachedArtikel.find((a) => a.id === btn.dataset.id);
    if (!artikel) return;

    if (btn.dataset.action === 'edit') {
      fillForm(artikel);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (btn.dataset.action === 'delete') {
      const confirmed = confirm(`Hapus artikel "${artikel.judul}"? Tindakan ini tidak bisa dibatalkan.`);
      if (!confirmed) return;

      const { error } = await supabaseClient.from('web_artikel').delete().eq('id', artikel.id);
      if (error) {
        alert(`Gagal menghapus: ${error.message}`);
        return;
      }
      loadArtikel();
    }
  });

  loadArtikel();
})();
