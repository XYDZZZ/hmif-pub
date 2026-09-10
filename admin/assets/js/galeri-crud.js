// assets/js/galeri-crud.js
// CRUD Galeri Kegiatan (tabel web_galeri) untuk panel admin.
// Foto dikelompokkan per "Nama Kegiatan" (album) dan opsional dikasih
// "Kategori" di dalam kegiatan itu (mis. Hari 1/Hari 2). Mode Tambah bisa
// upload BEBERAPA foto sekaligus (satu foto = satu baris, judul otomatis
// diberi nomor urut kalau lebih dari satu). Mode Ubah tetap satu baris.

(async () => {
  const session = await requireAuth();
  if (!session) return;
  bindLogout();

  const form = document.getElementById('galeriForm');
  const idField = document.getElementById('galeriId');
  const formTitle = document.getElementById('formTitle');
  const formError = document.getElementById('formError');
  const submitBtn = document.getElementById('submitBtn');
  const cancelEditBtn = document.getElementById('cancelEditBtn');
  const tableBody = document.getElementById('galeriTableBody');
  const kegiatanInput = document.getElementById('nama_kegiatan');
  const kegiatanList = document.getElementById('kegiatanList');
  const judulInput = document.getElementById('judul_foto');
  const kategoriInput = document.getElementById('kategori_filter');
  const fileInput = document.getElementById('image_files');
  const uploadStatus = document.getElementById('uploadStatus');
  const preview = document.getElementById('imagePreview');
  const imageFilesLabel = document.getElementById('imageFilesLabel');
  const filterKegiatanSelect = document.getElementById('filterKegiatan');

  let cachedGaleri = [];
  let selectedFiles = [];
  let existingImageUrl = ''; // dipakai di mode Ubah kalau gambar tidak diganti

  function escapeHtml(text = '') {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /** Judul default kalau admin membiarkan field Judul Foto kosong. */
  function buatJudulOtomatis(namaKegiatan, kategori) {
    return kategori ? `${namaKegiatan} – ${kategori}` : namaKegiatan;
  }

  function isEditMode() {
    return Boolean(idField.value);
  }

  function renderPreview() {
    if (selectedFiles.length === 0) {
      preview.classList.remove('admin-upload-preview--grid');
      preview.innerHTML = existingImageUrl
        ? `<img src="${existingImageUrl}" alt="Preview gambar" />`
        : '';
      return;
    }

    preview.classList.toggle('admin-upload-preview--grid', selectedFiles.length > 1);
    preview.innerHTML = selectedFiles
      .map((file) => `<img src="${URL.createObjectURL(file)}" alt="Preview ${escapeHtml(file.name)}" />`)
      .join('');
  }

  fileInput.addEventListener('change', () => {
    selectedFiles = Array.from(fileInput.files);
    uploadStatus.textContent = '';
    renderPreview();
  });

  function fillForm(foto) {
    idField.value = foto.id;
    kegiatanInput.value = foto.nama_kegiatan || '';
    judulInput.value = foto.judul_foto || '';
    kategoriInput.value = foto.kategori_filter || '';
    existingImageUrl = foto.image_url || '';
    selectedFiles = [];
    fileInput.value = '';
    fileInput.multiple = false; // mode Ubah: cuma boleh 1 file pengganti
    imageFilesLabel.textContent = 'Ganti Foto (opsional, cuma 1 file)';
    uploadStatus.textContent = '';
    renderPreview();
    formTitle.textContent = 'Ubah Foto';
    submitBtn.textContent = 'Update Foto';
    cancelEditBtn.hidden = false;
  }

  function resetForm() {
    form.reset();
    idField.value = '';
    selectedFiles = [];
    existingImageUrl = '';
    fileInput.value = '';
    fileInput.multiple = true; // mode Tambah: boleh pilih banyak
    imageFilesLabel.textContent = 'Gambar (boleh pilih beberapa sekaligus)';
    preview.innerHTML = '';
    preview.classList.remove('admin-upload-preview--grid');
    uploadStatus.textContent = '';
    formTitle.textContent = 'Tambah Foto Baru';
    submitBtn.textContent = 'Simpan Foto';
    cancelEditBtn.hidden = true;
    formError.textContent = '';
  }

  function updateKegiatanLists() {
    const kegiatanUnik = [...new Set(cachedGaleri.map((f) => f.nama_kegiatan).filter(Boolean))];

    kegiatanList.innerHTML = kegiatanUnik.map((nama) => `<option value="${escapeHtml(nama)}"></option>`).join('');

    const previousFilter = filterKegiatanSelect.value;
    filterKegiatanSelect.innerHTML =
      `<option value="">Semua Kegiatan</option>` +
      kegiatanUnik.map((nama) => `<option value="${escapeHtml(nama)}">${escapeHtml(nama)}</option>`).join('');
    if (previousFilter && kegiatanUnik.includes(previousFilter)) {
      filterKegiatanSelect.value = previousFilter;
    }
  }

  function renderTable() {
    const filterValue = filterKegiatanSelect.value;
    const rows = filterValue ? cachedGaleri.filter((f) => f.nama_kegiatan === filterValue) : cachedGaleri;

    if (rows.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="4">Tidak ada foto untuk kegiatan ini.</td></tr>`;
      return;
    }

    tableBody.innerHTML = rows
      .map(
        (foto) => `
        <tr>
          <td>${escapeHtml(foto.nama_kegiatan || '-')}</td>
          <td>${escapeHtml(foto.judul_foto)}</td>
          <td>${escapeHtml(foto.kategori_filter || '-')}</td>
          <td class="admin-table__actions">
            <button class="btn-link" type="button" data-action="edit" data-id="${foto.id}">Ubah</button>
            <button class="btn-link btn-link--danger" type="button" data-action="delete" data-id="${foto.id}">Hapus</button>
          </td>
        </tr>`
      )
      .join('');
  }

  filterKegiatanSelect.addEventListener('change', renderTable);

  async function loadGaleri() {
    tableBody.innerHTML = `<tr><td colspan="4">Memuat data…</td></tr>`;

    const { data, error } = await supabaseClient
      .from('web_galeri')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      tableBody.innerHTML = `<tr><td colspan="4">Gagal memuat data: ${escapeHtml(error.message)}</td></tr>`;
      return;
    }

    cachedGaleri = data || [];
    updateKegiatanLists();

    if (cachedGaleri.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="4">Belum ada foto. Tambahkan lewat form di atas.</td></tr>`;
      return;
    }

    renderTable();
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    formError.textContent = '';

    const namaKegiatan = kegiatanInput.value.trim();
    const kategori = kategoriInput.value.trim();
    const judulDasar = judulInput.value.trim() || buatJudulOtomatis(namaKegiatan, kategori);

    if (!namaKegiatan) {
      formError.textContent = 'Nama kegiatan wajib diisi.';
      return;
    }

    if (isEditMode()) {
      // --- Mode Ubah: satu baris, gambar opsional diganti ---
      if (selectedFiles.length === 0 && !existingImageUrl) {
        formError.textContent = 'Pilih gambar untuk foto ini.';
        return;
      }

      submitBtn.disabled = true;
      let imageUrl = existingImageUrl;

      if (selectedFiles.length > 0) {
        uploadStatus.textContent = 'Mengunggah gambar…';
        try {
          imageUrl = await uploadGambar(selectedFiles[0]);
        } catch (err) {
          submitBtn.disabled = false;
          formError.textContent = `Gagal mengunggah gambar: ${err.message}`;
          return;
        }
      }

      const { error } = await supabaseClient
        .from('web_galeri')
        .update({
          nama_kegiatan: namaKegiatan,
          judul_foto: judulDasar,
          kategori_filter: kategori,
          image_url: imageUrl,
        })
        .eq('id', idField.value);

      submitBtn.disabled = false;

      if (error) {
        formError.textContent = `Gagal menyimpan: ${error.message}`;
        return;
      }

      resetForm();
      loadGaleri();
      return;
    }

    // --- Mode Tambah: bisa upload banyak foto sekaligus ---
    if (selectedFiles.length === 0) {
      formError.textContent = 'Pilih minimal satu gambar.';
      return;
    }

    submitBtn.disabled = true;
    const beriNomor = selectedFiles.length > 1;
    const rows = [];

    for (let i = 0; i < selectedFiles.length; i += 1) {
      uploadStatus.textContent = `Mengunggah foto ${i + 1} dari ${selectedFiles.length}…`;
      try {
        // eslint-disable-next-line no-await-in-loop
        const url = await uploadGambar(selectedFiles[i]);
        rows.push({
          nama_kegiatan: namaKegiatan,
          judul_foto: beriNomor ? `${judulDasar} (${i + 1})` : judulDasar,
          kategori_filter: kategori,
          image_url: url,
        });
      } catch (err) {
        submitBtn.disabled = false;
        formError.textContent = `Gagal mengunggah foto ke-${i + 1}: ${err.message}.`;
        if (rows.length > 0) {
          // eslint-disable-next-line no-await-in-loop
          await supabaseClient.from('web_galeri').insert(rows);
          loadGaleri();
        }
        return;
      }
    }

    uploadStatus.textContent = 'Menyimpan data…';
    const { error } = await supabaseClient.from('web_galeri').insert(rows);
    submitBtn.disabled = false;

    if (error) {
      formError.textContent = `Gagal menyimpan: ${error.message}`;
      return;
    }

    resetForm();
    loadGaleri();
  });

  cancelEditBtn.addEventListener('click', resetForm);

  tableBody.addEventListener('click', async (event) => {
    const btn = event.target.closest('button[data-action]');
    if (!btn) return;

    const foto = cachedGaleri.find((f) => f.id === btn.dataset.id);
    if (!foto) return;

    if (btn.dataset.action === 'edit') {
      fillForm(foto);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (btn.dataset.action === 'delete') {
      const confirmed = confirm(`Hapus foto "${foto.judul_foto}"? Tindakan ini tidak bisa dibatalkan.`);
      if (!confirmed) return;

      const { error } = await supabaseClient.from('web_galeri').delete().eq('id', foto.id);
      if (error) {
        alert(`Gagal menghapus: ${error.message}`);
        return;
      }
      loadGaleri();
    }
  });

  loadGaleri();
})();
