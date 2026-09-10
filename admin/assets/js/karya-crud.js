// assets/js/karya-crud.js
// CRUD Pojok Karya Mahasiswa (tabel web_karya) untuk panel admin.
// Membutuhkan supabaseClient dan requireAuth()/bindLogout() yang sudah
// dimuat lebih dulu (supabase-client.js dan admin-auth.js).

(async () => {
  const session = await requireAuth();
  if (!session) return; // requireAuth() sudah redirect ke login.html
  bindLogout();

  const form = document.getElementById('karyaForm');
  const idField = document.getElementById('karyaId');
  const formTitle = document.getElementById('formTitle');
  const formError = document.getElementById('formError');
  const submitBtn = document.getElementById('submitBtn');
  const cancelEditBtn = document.getElementById('cancelEditBtn');
  const tableBody = document.getElementById('karyaTableBody');

  const FIELDS = ['judul_karya', 'kreator', 'kategori', 'youtube_url', 'github_url', 'deskripsi_html'];
  let cachedKarya = [];

  function getFormValues() {
    const values = {};
    FIELDS.forEach((name) => {
      values[name] = document.getElementById(name).value.trim();
    });
    return values;
  }

  function fillForm(karya) {
    idField.value = karya.id;
    FIELDS.forEach((name) => {
      document.getElementById(name).value = karya[name] || '';
    });
    formTitle.textContent = 'Ubah Karya';
    submitBtn.textContent = 'Update Karya';
    cancelEditBtn.hidden = false;
  }

  function resetForm() {
    form.reset();
    idField.value = '';
    formTitle.textContent = 'Tambah Karya Baru';
    submitBtn.textContent = 'Simpan Karya';
    cancelEditBtn.hidden = true;
    formError.textContent = '';
  }

  function escapeHtml(text = '') {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  async function loadKarya() {
    tableBody.innerHTML = `<tr><td colspan="4">Memuat data…</td></tr>`;

    const { data, error } = await supabaseClient
      .from('web_karya')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      tableBody.innerHTML = `<tr><td colspan="4">Gagal memuat data: ${escapeHtml(error.message)}</td></tr>`;
      return;
    }

    cachedKarya = data || [];

    if (cachedKarya.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="4">Belum ada karya. Tambahkan lewat form di atas.</td></tr>`;
      return;
    }

    tableBody.innerHTML = cachedKarya
      .map(
        (karya) => `
        <tr>
          <td>${escapeHtml(karya.judul_karya)}</td>
          <td>${escapeHtml(karya.kreator)}</td>
          <td>${escapeHtml(karya.kategori || '-')}</td>
          <td class="admin-table__actions">
            <button class="btn-link" type="button" data-action="edit" data-id="${karya.id}">Ubah</button>
            <button class="btn-link btn-link--danger" type="button" data-action="delete" data-id="${karya.id}">Hapus</button>
          </td>
        </tr>`
      )
      .join('');
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    formError.textContent = '';

    const values = getFormValues();
    if (!values.judul_karya || !values.kreator) {
      formError.textContent = 'Judul karya dan nama kreator wajib diisi.';
      return;
    }

    submitBtn.disabled = true;
    const isEdit = Boolean(idField.value);

    const { error } = isEdit
      ? await supabaseClient.from('web_karya').update(values).eq('id', idField.value)
      : await supabaseClient.from('web_karya').insert(values);

    submitBtn.disabled = false;

    if (error) {
      formError.textContent = `Gagal menyimpan: ${error.message}`;
      return;
    }

    resetForm();
    loadKarya();
  });

  cancelEditBtn.addEventListener('click', resetForm);

  // Event delegation untuk tombol Ubah/Hapus di tiap baris tabel
  tableBody.addEventListener('click', async (event) => {
    const btn = event.target.closest('button[data-action]');
    if (!btn) return;

    const karya = cachedKarya.find((k) => k.id === btn.dataset.id);
    if (!karya) return;

    if (btn.dataset.action === 'edit') {
      fillForm(karya);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (btn.dataset.action === 'delete') {
      const confirmed = confirm(`Hapus karya "${karya.judul_karya}"? Tindakan ini tidak bisa dibatalkan.`);
      if (!confirmed) return;

      const { error } = await supabaseClient.from('web_karya').delete().eq('id', karya.id);
      if (error) {
        alert(`Gagal menghapus: ${error.message}`);
        return;
      }
      loadKarya();
    }
  });

  loadKarya();
})();
