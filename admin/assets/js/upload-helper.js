// assets/js/upload-helper.js
// Helper upload gambar ke Supabase Storage (bucket "web-media").
// Dipakai bersama oleh galeri-crud.js dan artikel-crud.js.
// Membutuhkan supabaseClient dari ../public/assets/js/supabase-client.js.

const STORAGE_BUCKET = 'web-media';

/**
 * Kompres & resize gambar di browser SEBELUM diupload, pakai Canvas API
 * bawaan browser (tanpa library tambahan) — supaya file yang tersimpan
 * di Storage lebih ringan dan halaman publik lebih cepat dimuat.
 * Lebar gambar dibatasi maksimum 1600px, dikonversi ke JPEG kualitas ~82%.
 */
function kompresGambar(file, { maxWidth = 1600, quality = 0.82 } = {}) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      const scale = Math.min(1, maxWidth / img.width);
      const targetWidth = Math.round(img.width * scale);
      const targetHeight = Math.round(img.height * scale);

      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;

      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Gagal mengompres gambar.'));
            return;
          }
          const namaBaru = file.name.replace(/\.\w+$/, '.jpg');
          resolve(new File([blob], namaBaru, { type: 'image/jpeg' }));
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Gagal membaca file gambar.'));
    };

    img.src = objectUrl;
  });
}

/**
 * Upload satu file ke bucket Supabase Storage, kembalikan public URL-nya.
 * File dikompres dulu lewat kompresGambar() — kalau kompresi gagal
 * (misalnya format aneh), tetap lanjut upload file aslinya sebagai fallback.
 * Nama file dibuat unik (timestamp + string acak) supaya tidak bentrok
 * dengan file lain yang namanya sama.
 */
async function uploadGambar(file) {
  let fileToUpload = file;
  try {
    fileToUpload = await kompresGambar(file);
  } catch (err) {
    console.warn('Kompresi gambar gagal, upload file asli sebagai fallback:', err);
  }

  const ext = fileToUpload.name.split('.').pop();
  const namaFile = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error: uploadError } = await supabaseClient
    .storage
    .from(STORAGE_BUCKET)
    .upload(namaFile, fileToUpload, { cacheControl: '3600', upsert: false });

  if (uploadError) throw uploadError;

  const { data } = supabaseClient.storage.from(STORAGE_BUCKET).getPublicUrl(namaFile);
  return data.publicUrl;
}

/**
 * Pasang handler upload otomatis ke sebuah <input type="file">.
 * Saat file dipilih: upload ke Storage, isi hiddenInput dengan URL hasil
 * upload, dan tampilkan preview-nya.
 */
function bindImageUpload({ fileInputId, hiddenInputId, previewId, statusId }) {
  const fileInput = document.getElementById(fileInputId);
  const hiddenInput = document.getElementById(hiddenInputId);
  const preview = document.getElementById(previewId);
  const status = statusId ? document.getElementById(statusId) : null;

  if (!fileInput) return;

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files[0];
    if (!file) return;

    if (status) status.textContent = 'Mengunggah gambar…';
    preview.innerHTML = '';

    try {
      const url = await uploadGambar(file);
      hiddenInput.value = url;
      preview.innerHTML = `<img src="${url}" alt="Preview gambar" />`;
      if (status) status.textContent = 'Gambar berhasil diunggah.';
    } catch (err) {
      console.error('Gagal upload gambar:', err);
      if (status) status.textContent = `Gagal mengunggah gambar: ${err.message}`;
    }
  });
}

/** Tampilkan preview gambar dari URL yang sudah tersimpan (dipakai saat mode Ubah). */
function showExistingPreview(previewId, url) {
  const preview = document.getElementById(previewId);
  if (!preview) return;
  preview.innerHTML = url ? `<img src="${url}" alt="Preview gambar" />` : '';
}
