# D-Fire — Kelompok 6

Notebook untuk **Klasifikasi Biner Adanya Indikasi Kebakaran atau Tidak Pada Citra**.

Paket notebook ada di [Source Code.zip](Source%20Code.zip), di folder yang sama dengan README ini. Di GitHub, buka berkas ZIP lalu pilih **Download raw file**. Ekstrak seluruh isinya, kemudian buka folder `Kelompok 6-Source Code`. Semua path pada petunjuk di bawah mengacu ke folder hasil ekstrak tersebut.

## Melihat hasil tanpa training

Buka `UTS-Notebook.ipynb` di VS Code atau Jupyter. Output training ulang sudah tersimpan di dalam notebook, termasuk kurva, confusion matrix, serta contoh prediksi benar dan salah. Melihat output tidak membutuhkan dataset, TensorFlow, atau model hasil training. Aplikasi hanya perlu mendukung pembacaan notebook; kalau Jupyter menyembunyikan output HTML, pilih **Trust Notebook** setelah memeriksa isinya.

Output tersimpan berasal dari eksekusi 4 November 2026: akurasi biner test **90,5016%** pada 4.306 gambar, dengan TN 1.876, FP 129, FN 280, dan TP 2.021. Ini menilai keputusan ada/tidaknya indikasi, bukan akurasi koordinat kotak. Path komputer asal masih tampil pada output lama.

## Menjalankan sendiri

1. Ekstrak seluruh ZIP ke folder yang bisa ditulis. Jangan membuka notebook langsung dari dalam ZIP. Folder boleh dipindah ke drive atau direktori lain.
2. Gunakan Python **3.11 atau 3.12, 64-bit**. Lingkungan yang sudah diuji memakai Python **3.12.4**. Buka folder `Kelompok 6-Source Code` di VS Code dengan ekstensi Python/Jupyter, atau jalankan Jupyter dari folder tersebut. Pilih kernel Python yang sesuai. Python dan aplikasi pembuka notebook perlu tersedia terlebih dahulu.
3. Gunakan environment khusus proyek jika memungkinkan. Pilih **Restart Kernel → Run All**. Blok pertama memakai paket kernel yang sudah lengkap sesuai `requirements.txt`, atau memasang paket yang belum sesuai melalui `pip` dari kernel tersebut. Pada Python biasa, pemasangan memakai folder pengguna; pada virtual environment, pemasangan tetap di environment itu. Pesan pip ditampilkan jika instalasi gagal. Kalau library versi lama sudah dimuat, restart kernel lalu Run All kembali.
4. Biarkan `LATIH_ULANG=True`. Blok konfigurasi mengunduh dataset dan bobot awal, lalu notebook menyiapkan data, membuat target kotak, melatih model, mengevaluasi, menyimpan model, dan memprediksi tiga foto contoh.
5. Sesudah selesai, **simpan notebook (Ctrl+S)** supaya output baru ikut tersimpan. File model, CSV, kurva, dan hasil prediksi ada di subfolder per tahap dalam `output/`. Menjalankan tahap yang sama akan menimpa file keluaran sebelumnya.

Kalau ingin memasang library dari terminal sebelum membuka notebook, jalankan dari folder proyek dengan Python environment yang akan dipakai:

```text
python -m pip install -r requirements.txt ipykernel
```

Untuk membuka melalui Jupyter di browser jika belum terpasang:

```text
python -m pip install notebook
python -m notebook UTS-Notebook.ipynb
```

Koneksi internet dibutuhkan pada pemakaian pertama. Arsip dataset berukuran sekitar **3,05 GB**, hasil ekstraknya **3,12 GB**, bobot awal **9,4 MB**, dan cache train/validation sekitar **3,73 GB**. Sediakan sekitar **15 GB ruang kosong** untuk library dan satu kali training. Setiap Run All dengan `LATIH_ULANG=True` memakai folder output yang sama dan menulis ulang cache serta hasil. Durasi training mengikuti kemampuan komputer; hasil tidak dijanjikan persis sama antarperangkat.

## Isi dan folder keluaran

```text
Kelompok 6-Source Code/
  UTS-Notebook.ipynb       notebook lengkap dengan output tersimpan
  requirements.txt           versi library untuk eksekusi
  README.md                  petunjuk ini
  foto_prediksi/             tiga foto asli untuk contoh prediksi
  bobot_awal/                kosong; diisi unduhan ImageNet saat dijalankan
  data/
    original/                kosong; tempat ZIP dataset diunduh
    extracted/data/
      train/images, labels   kosong; diisi saat ekstraksi
      val/images, labels     kosong; diisi saat ekstraksi
      test/images, labels    kosong; diisi saat ekstraksi
  output/
    step5_training/          CSV training, riwayat, dan bobot sebelum fine-tuning
      cache/                 fitur dan target train/validation
    step6_evaluasi/          kurva, confusion matrix, prediksi test, contoh benar/salah
    step7_model/             model.keras, konfigurasi.json, anchors.npy
    step8_prediksi/          prediksi_foto.png dan prediksi_foto.json
```

Nomor folder mengikuti bagian notebook yang menyimpan keluaran. Folder dan nama file tetap, tanpa tambahan waktu eksekusi. Path pada output yang sudah tersimpan di notebook masih berasal dari eksekusi sebelumnya; saat dijalankan kembali, hasil mengikuti struktur `output/` di atas.

Dataset, model D-Fire, cache, dan environment Python tidak disertakan. Foto contoh hanya tiga file, total sekitar 293 KB, dan disalin tanpa perubahan piksel. Untuk foto sendiri, taruh JPG/PNG/WebP di `foto_prediksi` lalu ubah daftar `FOTO` pada konfigurasi; daftar perlu berisi setidaknya satu gambar.

## Sumber unduhan

- Dataset asli: [repositori D-Fire](https://github.com/gaia-solutions-on-demand/DFireDataset). Repositori tersebut menautkan [mirror Kaggle](https://www.kaggle.com/datasets/sayedgamal99/smoke-fire-detection-yolo) yang dipakai di notebook ini. Unduhan dikunci ke **versi 1**, sama dengan data eksperimen sebelumnya: train 14.122, validation 3.099, test 4.306 gambar. Unduhan publik ini telah diperiksa tanpa login saat paket disiapkan.
- Arsip dataset diperiksa dengan SHA-256 `65d81b602991261b47ddc71281e99108362a30336a448e1f8d21352c825c6d83`. Ini hash lokal arsip eksperimen, bukan checksum resmi penerbit. Jika tautan berubah dan checksum gagal, hentikan proses dan periksa sumber; jangan mengganti hash hanya agar pemeriksaan lolos.
- Bobot awal: [MobileNetV2 ImageNet 1.0, 128, tanpa kepala klasifikasi](https://storage.googleapis.com/tensorflow/keras-applications/mobilenet_v2/mobilenet_v2_weights_tf_dim_ordering_tf_kernels_1.0_128_no_top.h5). SHA-256 `31150c34687a0e3f78a2bd0a8009ac321b966d10f3b184be4ff34c752f9dbe7f`. Ini bobot awal untuk transfer learning, bukan model D-Fire kelompok kami.
- Fungsi unduhan: [`keras.utils.get_file`](https://keras.io/api/utils/python_utils/#get_file-function), yang menyimpan file dan memeriksa hash.

Kalau unduhan atau ekstraksi terputus, periksa koneksi serta ruang disk lalu jalankan lagi. Dataset yang sudah lengkap tidak diunduh ulang. Arsip yang selesai diunduh dapat dipakai untuk melanjutkan ekstraksi. Tautan publik tetap bergantung pada layanan penyedia.
