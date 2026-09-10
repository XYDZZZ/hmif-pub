// assets/js/anggota-foto-crud.js
// Kelola foto pengurus (tabel web_anggota_foto) untuk panel admin.
// Daftar nama diambil dari view struktur_organisasi_publik (periode aktif),
// jadi selalu sinkron dengan siapa yang tampil di halaman publik profil.html.

(async () => {
  const session = await requireAuth();
  if (!session) return;
  bindLogout();

  const form = document.getElementById('fotoForm');
  const select = document.getElementById('anggota_select');
  const fileInput = document.getElementById('foto_file');
  const uploadStatus = document.getElementById('uploadStatus');
  const preview = document.getElementById('fotoPreview');
  const formError = document.getElementById('formError');
  const submitBtn = document.getElementById('submitBtn');
  const removeBtn = document.getElementById('removeBtn');
  const tableBody = document.getElementById('fotoTableBody');

  let anggotaList = [];
  let selectedFile = null;

  function escapeHtml(text = '') {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  async function loadAnggota() {
    const { data, error } = await supabaseClient
      .from('struktur_organisasi_publik')
      .select('*')
      .order('nama_lengkap', { ascending: true });

    if (error) {
      select.innerHTML = `<option value="">Gagal memuat daftar pengurus</option>`;
      console.error('Gagal memuat daftar pengurus:', error);
      return;
    }

    anggotaList = data || [];

    if (anggotaList.length === 0) {
      select.innerHTML = `<option value="">Belum ada pengurus di periode aktif</option>`;
      tableBody.innerHTML = `<tr><td colspan="3">Belum ada pengurus di periode aktif.</td></tr>`;
      return;
    }

    const previousValue = select.value;
    select.innerHTML = anggotaList
      .map(
        (a) =>
          `<option value="${a.id_user}">${escapeHtml(a.nama_lengkap)}${
            a.nama_jabatan ? ` — ${escapeHtml(a.nama_jabatan)}` : ''
          }</option>`
      )
      .join('');

    if (previousValue && anggotaList.some((a) => a.id_user === previousValue)) {
      select.value = previousValue;
    }

    updatePreviewForSelected();
    renderTable();
  }

  function updatePreviewForSelected() {
    const anggota = anggotaList.find((a) => a.id_user === select.value);
    selectedFile = null;
    fileInput.value = '';
    uploadStatus.textContent = '';
    preview.innerHTML = anggota && anggota.foto_url
      ? `<img src="${anggota.foto_url}" alt="Foto ${escapeHtml(anggota.nama_lengkap)}" />`
      : '';
    removeBtn.hidden = !(anggota && anggota.foto_url);
  }

  select.addEventListener('change', updatePreviewForSelected);

  fileInput.addEventListener('change', () => {
    selectedFile = fileInput.files[0] || null;
    if (selectedFile) {
      preview.innerHTML = `<img src="${URL.createObjectURL(selectedFile)}" alt="Preview foto" />`;
      removeBtn.hidden = true;
    }
  });

  function renderTable() {
    const punyaFoto = anggotaList.filter((a) => a.foto_url);

    if (punyaFoto.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="3">Belum ada pengurus yang punya foto.</td></tr>`;
      return;
    }

    tableBody.innerHTML = punyaFoto
      .map(
        (a) => `
        <tr>
          <td>${escapeHtml(a.nama_lengkap)}</td>
          <td>${escapeHtml(a.nama_jabatan || a.nama_divisi || '-')}</td>
          <td class="admin-table__actions">
            <button class="btn-link" type="button" data-action="pilih" data-id="${a.id_user}">Ubah</button>
            <button class="btn-link btn-link--danger" type="button" data-action="hapus" data-id="${a.id_user}">Hapus Foto</button>
          </td>
        </tr>`
      )
      .join('');
  }

  tableBody.addEventListener('click', async (event) => {
    const btn = event.target.closest('button[data-action]');
    if (!btn) return;

    if (btn.dataset.action === 'pilih') {
      select.value = btn.dataset.id;
      updatePreviewForSelected();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (btn.dataset.action === 'hapus') {
      const anggota = anggotaList.find((a) => a.id_user === btn.dataset.id);
      const confirmed = confirm(`Hapus foto "${anggota ? anggota.nama_lengkap : ''}"?`);
      if (!confirmed) return;

      const { error } = await supabaseClient.from('web_anggota_foto').delete().eq('id_user', btn.dataset.id);
      if (error) {
        alert(`Gagal menghapus: ${error.message}`);
        return;
      }
      await loadAnggota();
    }
  });

  removeBtn.addEventListener('click', async () => {
    if (!select.value) return;
    const confirmed = confirm('Hapus foto pengurus ini?');
    if (!confirmed) return;

    const { error } = await supabaseClient.from('web_anggota_foto').delete().eq('id_user', select.value);
    if (error) {
      alert(`Gagal menghapus: ${error.message}`);
      return;
    }
    await loadAnggota();
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    formError.textContent = '';

    if (!select.value) {
      formError.textContent = 'Pilih pengurus terlebih dahulu.';
      return;
    }
    if (!selectedFile) {
      formError.textContent = 'Pilih file foto untuk diunggah.';
      return;
    }

    submitBtn.disabled = true;
    uploadStatus.textContent = 'Mengunggah foto…';

    try {
      const url = await uploadGambar(selectedFile);
      const { error } = await supabaseClient
        .from('web_anggota_foto')
        .upsert({ id_user: select.value, foto_url: url, updated_at: new Date().toISOString() });

      submitBtn.disabled = false;

      if (error) {
        formError.textContent = `Gagal menyimpan: ${error.message}`;
        return;
      }

      uploadStatus.textContent = 'Foto berhasil disimpan.';
      await loadAnggota();
    } catch (err) {
      submitBtn.disabled = false;
      formError.textContent = `Gagal mengunggah foto: ${err.message}`;
    }
  });

  loadAnggota();
})();
