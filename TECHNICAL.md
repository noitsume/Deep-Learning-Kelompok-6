# Catatan teknis website D-Fire

Website untuk mencoba **model final dari `Kandidat_2_Fokus.ipynb`** menggunakan foto sendiri. Tidak ada login, training, atau pengiriman foto ke server. Prediksi dijalankan di browser pengunjung.

## Menjalankan di komputer sendiri

Pasang Node.js jika belum ada, lalu buka terminal pada folder ini:

```powershell
npm run dev
```

Buka **http://127.0.0.1:5173/**. Folder `dist/` sudah berisi model dan runtime, jadi tidak perlu TensorFlow, Python, dataset, atau `npm install` untuk menjalankan website. Jangan membuka `index.html` melalui `file://` karena browser membatasi Web Worker pada cara itu.

## Penggunaan

1. Pilih beberapa JPG, PNG, atau WebP, atau tarik ke area unggahan.
2. Klik **Mulai prediksi**. Saat pertama digunakan, browser mengambil model sekitar 8,7 MiB dan runtime sekitar 14,2 MiB. Progress menampilkan unduhan dan tahap tiap foto.
3. Pilih nomor foto untuk melihat hasil, gunakan filter, atau bandingkan foto asli dengan kotak prediksi.
4. **Unduh tampilan** menghasilkan PNG. **Ekspor hasil** menghasilkan JSON berisi skor, kotak sebelum/sesudah penggabungan, status tiap foto, dan checksum model.

Maksimal 25 foto dalam antrean; setiap berkas maksimal 20 MiB dan 40 megapiksel. Nama berkas boleh sama karena setiap item punya ID dan indeks sendiri. Foto diproses berurutan di Worker. Berkas rusak tidak menghentikan foto berikutnya. **Hentikan** membatalkan Worker, menyimpan hasil yang selesai, dan mengembalikan foto aktif ke antrean.

Tema mengikuti perangkat saat pertama dibuka, lalu menyimpan pilihan terang/gelap di localStorage. Foto dan hasil hanya ada dalam memori halaman, sehingga hilang saat refresh. Browser modern dengan WebAssembly, Web Worker, `createImageBitmap`, dan OffscreenCanvas diperlukan. Uji aktual dilakukan di Chrome pada Windows; tampilan ponsel diuji melalui emulasi 390 × 844, bukan pada perangkat fisik.

## Model dan kesesuaian dengan notebook

Sumber bobot: `../kandidat_2_fokus/hasil_20261104_163407/model.keras`, hasil retraining 4 November 2026. Bukan checkpoint lama `model_terbaik.keras`.

| Komponen | Nilai |
| --- | --- |
| Input | float32, NHWC `[1,128,192,3]`, RGB 0–255 |
| Preprocessing | RGB → resize bilinear dengan antialias Pillow → float32 |
| Tambahan blur / CLAHE | Tidak ada |
| Cabang kontras lokal | Sudah termasuk di dalam model |
| Output | 3.456 anchor × 6: empat delta koordinat, dua logit |
| Urutan kelas | 0 = asap, 1 = api |
| STD box | `[0.1, 0.1, 0.2, 0.2]` |
| Penyaringan | Kandidat skor ≥ 0,01 → NMS IoU 0,50 per kelas (100) → 100 terbaik global → skor ≥ 0,20 |
| Label biner | Ada indikasi jika minimal satu kotak lolos |
| Kotak tampilan | Enclosing union semua kotak sekelas, maksimal dua kotak |
| Model web | ONNX opset 17, float32; tanpa kuantisasi/training ulang |
| Runtime | ONNX Runtime Web 1.31.1, WASM satu thread di Dedicated Worker |

Penggabungan kotak hanya menyederhanakan tampilan, tidak mengganti skor atau keputusan model. Ini **union per kelas**, bukan NMM berbasis ambang overlap. Kotak yang berjauhan dapat menghasilkan satu kotak tampilan besar. Skor bukan probabilitas kebakaran yang telah dikalibrasi. Angka **90,50%** pada halaman Tentang Model berasal dari akurasi **biner** 4.306 citra test dalam notebook, bukan akurasi lokalisasi.

Checksum sumber, ekspor, konfigurasi, dan versi pustaka tersimpan di `dist/model/manifest.json`. Worker memeriksa SHA-256 model sebelum dipakai saat Web Crypto tersedia. Notebook dan model sumber tidak diubah.

Resize JavaScript diuji identik dengan Pillow pada buffer RGB yang sama. Tiga foto pembanding juga menghasilkan input yang identik setelah decoding di Chrome. Ini tidak menjamin semua decoder browser menghasilkan piksel identik untuk semua file: profil warna, transparansi, animasi, dan dukungan orientasi EXIF dapat berbeda. Gunakan foto RGB biasa untuk perbandingan paling mudah. Browser menjalankan foto yang dibaca langsung, tanpa koreksi manual pada hasilnya.

## Susunan kode

```text
dist/
  index.html              halaman utama, panduan, dan keterangan model
  styles.css              tema terang/gelap serta tata letak responsif
  app.js                  antrean, interaksi, visualisasi, unduhan hasil
  engine.worker.js        unduh/verifikasi model dan jalankan inferensi
  preprocess.js           resize RGB bilinear seperti Pillow
  postprocess.js          dekode anchor, NMS, penggabungan kotak tampilan
  model/                  model.onnx, anchors.bin, manifest.json
  vendor/                 runtime WASM dan lisensi
tools/
  serve.mjs               server statis lokal; tidak punya API unggah
  export_model.py         ekspor bobot dan pembandingan dengan TensorFlow
  vendor.mjs              salin runtime dari node_modules
  parity-python.json      hasil cek Keras vs ONNX CPU
  parity-browser.json     hasil cek Keras vs ONNX Web WASM
  check-ui.json           hasil pemeriksaan alur antarmuka
tests/pipeline.test.mjs    perbandingan preprocessing/postprocessing
```

## Bukti pengujian

- Keras vs ONNX CPU: **12 gambar**, keputusan kelas dan jumlah kotak sama; selisih skor maksimum **0,00000295**.
- Keras vs ONNX Web WASM dengan input yang sama: **12 gambar**, urutan kelas/jumlah kotak sama; selisih skor maksimum **0,00000332**.
- Tiga foto lengkap melalui decoder Chrome: hasil RGB-resize identik dengan Pillow. Foto kebakaran menghasilkan 11 kotak → 2 kotak tampilan; foto pohon negatif; foto kucing tetap **false positive asap**, satu kotak, skor sekitar 0,216. Kesalahan ini tidak ditutup-tutupi atau dituning.
- `npm test`: **14 pengujian lolos** pada lingkungan dengan fixture QA lokal. Fixture dibuat dari foto asli oleh skrip ekspor dan tidak dipublikasikan. Tanpa fixture lokal, tes paritas dilewati secara eksplisit; tes union tetap dijalankan.
- UI: batch dengan gambar rusak di tengah tetap melanjutkan; nama file duplikat; format tak didukung; berkas kosong; filter; tampil/sembunyikan kotak; PNG/JSON; hentikan dan lanjutkan; tema terang/gelap; tidak ada overflow halaman pada viewport ponsel.

Pengujian paritas memastikan penerjemahan model, bukan evaluasi ulang akurasi terhadap seluruh dataset atau bukti model selalu benar pada foto baru.

## Mengulang ekspor (opsional)

Website siap pakai tanpa langkah ini. Ekspor diperlukan hanya jika ingin membuktikan ulang asal model, dengan struktur folder proyek semula dan foto pembanding lokal tersedia.

```powershell
python -m venv --system-site-packages .venv-export
.\.venv-export\Scripts\python.exe -m pip install -r tools/export-requirements.txt
.\.venv-export\Scripts\python.exe tools/export_model.py
npm test
```

Skrip memakai TensorFlow 2.19.0/Keras 3.9.2 seperti lingkungan retraining. Ia hanya memuat bobot untuk inference; fungsi `prediksi_kotak` diambil melalui AST dari notebook tanpa menjalankan sel training. Skrip memeriksa hash sumber sebelum/sesudah dan membuat fixture di `.qa/` yang diabaikan Git. Lokasi foto pembanding ada di daftar `photos` dalam skrip; sesuaikan jika mengulang di komputer lain. Urutan 9 sampel D-Fire diambil secara deterministik dari folder test, tidak dipilih berdasarkan apakah prediksinya benar.

Untuk memperbarui salinan runtime dengan versi terkunci di package-lock:

```powershell
npm ci
npm run vendor
```

## Deployment

Semua yang diperlukan hosting ada di **`dist/`**. Bisa diunggah ke hosting statis yang menyajikan `.mjs` sebagai JavaScript dan `.wasm` sebagai `application/wasm`, melalui HTTPS. Tidak ada API key, server Python, database, atau training saat website dijalankan. Tetap sertakan berkas model dan runtime, bukan hanya HTML.

Untuk Vercel: gunakan preset **Other**, tanpa Build Command, Output Directory `dist`; konfigurasi `vercel.json` sudah tersedia. Langkah lengkap ada di [DEPLOY.md](DEPLOY.md). Tidak perlu COOP/COEP karena runtime sengaja memakai satu thread.

Jangan unggah `.qa/`, `.venv-export/`, foto pengguna, atau dataset training ke hosting. Mode `node tools/serve.mjs --qa` hanya untuk pemeriksaan lokal dan tidak menjadi bagian server publik.

## Referensi

- Dataset: [D-Fire](https://github.com/gaia-solutions-on-demand/DFireDataset).
- Referensi tampilan: [Tasko](https://tasko-task-management-app-one.vercel.app/) dan [repositori Tasko](https://github.com/noitsume/tasko-task-management-app). Sidebar dan tema dijadikan referensi visual; kode aplikasi ini ditulis untuk kebutuhan prediksi D-Fire.
- Runtime: [ONNX Runtime Web](https://onnxruntime.ai/docs/tutorials/web/), MIT; lisensi disertakan di `dist/vendor/`.
- Ekspor: [tf2onnx](https://github.com/onnx/tensorflow-onnx).
- Pembobotan resize: [Pillow 11.2.1 Resample.c](https://github.com/python-pillow/Pillow/blob/11.2.1/src/libImaging/Resample.c), lisensi disertakan di `dist/vendor/`.
- Huruf: DM Sans dan Manrope melalui Google Fonts; fallback menggunakan font sistem jika tidak tersedia.
