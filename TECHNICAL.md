# Dokumentasi teknis aplikasi

Aplikasi menggunakan model CNN hasil pelatihan pada `UTS-Notebook.ipynb` untuk memprediksi api dan asap. Hasil deteksi kemudian dirangkum menjadi klasifikasi biner adanya indikasi kebakaran pada citra.

## Model yang digunakan

MobileNetV2 dengan bobot awal ImageNet digunakan sebagai ekstraktor fitur. Model menggabungkan fitur MobileNetV2 dengan cabang kontras lokal, kemudian mengolahnya melalui kepala deteksi, yaitu bagian akhir jaringan yang menghasilkan perubahan koordinat kotak dan skor kelas.

Cabang kontras lokal menghitung luminans (intensitas terang) dari RGB, lalu membandingkan nilai tiap piksel dengan rata-rata lingkungan berukuran 5 × 5 dan 15 × 15. Selisih terang dan gelap dipisahkan, diperkuat dengan faktor 4, lalu diperkecil dengan merata-ratakan tiap area 8 × 8 melalui average pooling. Empat peta yang dihasilkan menjadi masukan tambahan bagi kepala deteksi. Operasi ini sudah berada di dalam model ONNX.

| Komponen | Konfigurasi |
| --- | --- |
| Masukan | RGB, `float32`, rentang 0–255, bentuk `[1, 128, 192, 3]` |
| Jumlah parameter model Keras | 2.312.253 |
| Keluaran | `[1, 3456, 6]`: empat perubahan koordinat dan dua logit per anchor |
| Urutan kelas | 0 = asap, 1 = api |
| Format model web | ONNX, `float32`, opset 17 |
| Mesin prediksi | ONNX Runtime Web 1.31.1, WebAssembly, satu thread |

Bentuk masukan `[1, 128, 192, 3]` berarti satu foto dengan tinggi 128 piksel, lebar 192 piksel, dan tiga kanal RGB. Anchor adalah kotak acuan yang digunakan untuk menghitung posisi prediksi. Logit adalah nilai kelas sebelum fungsi sigmoid mengubahnya menjadi skor antara 0 dan 1. Opset 17 menetapkan versi operasi yang digunakan dalam berkas ONNX.

## Konsep inferensi ONNX

Inferensi menggunakan parameter hasil pelatihan untuk menghitung keluaran dari foto baru. Parameter tersebut tetap selama foto diproses. Pada tahap ini, model melakukan operasi jaringan, termasuk konvolusi, aktivasi, dan perhitungan keluaran deteksi.

[ONNX](https://onnx.ai/onnx/intro/concepts.html) adalah format penyimpanan model. Isinya mencakup susunan operasi yang saling terhubung, parameter numerik seperti bobot dan bias, serta informasi bentuk masukan dan keluaran. Pada proyek ini, `tools/export_model.py` memuat model Keras dan menggunakan `tf2onnx` untuk menghasilkan `dist/model/model.onnx`.

[ONNX Runtime Web](https://onnxruntime.ai/docs/tutorials/web/) menjalankan operasi dalam model tersebut. Mesin perhitungannya tersedia dalam bentuk WebAssembly, yaitu format program yang dapat dijalankan browser, dan menggunakan CPU perangkat pengguna. Proses diletakkan di Web Worker, yaitu konteks kerja terpisah dari halaman utama, agar pengguna tetap dapat berinteraksi dengan antarmuka selama prediksi berlangsung.

Saat tombol prediksi pertama kali ditekan, Worker memuat `manifest.json`, `anchors.bin`, `model.onnx`, dan runtime dari `dist/vendor/`. Jika Web Crypto tersedia, Worker memeriksa SHA-256 model terhadap nilai dalam manifest. Sesi model dipakai kembali untuk foto berikutnya selama Worker aktif.

## Alur prediksi

1. **Membaca foto dan konfigurasi.** `app.js` menyimpan foto dalam antrean. Tombol **Ambil Foto Testing** mengambil tiga berkas dari `dist/examples/` dan memasukkannya melalui alur yang sama. Ketika pengguna menekan **Mulai prediksi** atau **Prediksi ulang**, aplikasi membaca checkbox penggabungan kotak dan memproses seluruh antrean secara berurutan.
2. **Menyiapkan masukan.** Worker membaca gambar menjadi piksel RGB. `preprocess.js` mengubah ukurannya menjadi 192 × 128 piksel dengan interpolasi bilinear dan pembobotan antialias yang mengikuti Pillow. Nilai piksel disimpan sebagai `float32` pada rentang 0–255. Normalisasi MobileNetV2 menjadi rentang −1 sampai 1 dilakukan di dalam model.
3. **Menjalankan model.** Worker membentuk tensor `[1, 128, 192, 3]` dan memanggil `session.run()`. Keluaran berisi 3.456 kandidat anchor, masing-masing dengan empat perubahan koordinat dan dua logit kelas.
4. **Menghitung kotak dan skor.** `postprocess.js` menerapkan sigmoid pada logit dengan rumus `skor = 1 / (1 + exp(-logit))`. Perubahan koordinat dihitung terhadap anchor menggunakan faktor `[0.1, 0.1, 0.2, 0.2]`, lalu batas kotak dibatasi pada rentang 0–1.
5. **Menyaring deteksi.** Kandidat dengan skor minimal 0,01 dan kotak yang valid masuk ke Non-Maximum Suppression (NMS) per kelas. NMS memilih kotak dengan skor lebih tinggi dan membuang kotak sekelas yang tumpang tindih dengannya pada IoU di atas 0,50. IoU adalah luas irisan dibagi luas gabungan dua kotak. Proses menyimpan maksimal 100 kotak per kelas, mengambil 100 terbaik secara keseluruhan, lalu menerapkan ambang akhir 0,20.
6. **Menentukan label.** Jika ada minimal satu deteksi api atau asap yang lolos, hasilnya **Ada indikasi kebakaran**. Jika seluruh deteksi tersaring, hasilnya **Tidak ada indikasi kebakaran**.
7. **Menampilkan hasil.** Aplikasi menampilkan foto, label, skor, dan kotak. Jika **Gabungkan kotak sekelas** aktif, batas terluar seluruh kotak dalam kelas yang sama membentuk satu kotak tampilan. Skornya memakai nilai tertinggi dari kelompok kotak yang digabung.

Panel skor Api dan Asap menampilkan nilai tertinggi dari seluruh kandidat sebelum penyaringan kotak. Keputusan biner menggunakan deteksi yang lolos langkah penyaringan. Karena sumber perhitungannya berbeda, skor pada panel dan skor kotak tampilan perlu dibaca sesuai tahapnya.

Penggabungan kotak menggunakan *enclosing union* per kelas. Pilihan ini mengatur tampilan hasil deteksi; NMS dan perhitungan label biner tetap berlaku pada kedua posisi checkbox. Kotak gabungan dapat mencakup ruang di antara objek yang berjauhan. Mengubah checkbox diterapkan pada proses prediksi berikutnya.

## Susunan berkas

| Berkas | Tanggung jawab |
| --- | --- |
| [dist/index.html](dist/index.html) | Struktur halaman prediksi, cara penggunaan, dan keterangan model |
| [dist/styles.css](dist/styles.css) | Tata letak responsif dan tema terang/gelap |
| [dist/app.js](dist/app.js) | Antrean foto, tombol, konfigurasi, tampilan hasil, ekspor PNG/JSON |
| [dist/engine.worker.js](dist/engine.worker.js) | Memuat model, menyiapkan tensor, dan menjalankan inferensi |
| [dist/preprocess.js](dist/preprocess.js) | Resize bilinear citra RGB |
| [dist/postprocess.js](dist/postprocess.js) | Sigmoid, dekode anchor, NMS, ambang skor, dan penggabungan kotak |
| [dist/model/](dist/model/) | Model ONNX, anchor, dan manifest konfigurasi |
| [dist/vendor/](dist/vendor/) | Runtime WebAssembly dan lisensi dependensi |
| [tools/export_model.py](tools/export_model.py) | Ekspor Keras ke ONNX dan pembandingan keluaran |
| [tools/serve.mjs](tools/serve.mjs) | Server HTTP untuk menjalankan aplikasi secara lokal |
| [tests/pipeline.test.mjs](tests/pipeline.test.mjs) | Pemeriksaan pengolahan kotak dan kesesuaian preprocessing |

Koordinat dalam ekspor JSON menggunakan bentuk `[x_min, y_min, x_max, y_max]` pada rentang 0–1. Koordinat piksel diperoleh dengan mengalikan nilai x dengan lebar foto dan nilai y dengan tinggi foto. JSON juga menyimpan konfigurasi penggabungan, deteksi yang lolos, kotak tampilan, status foto, dan identitas model. PNG menyimpan tampilan foto yang sedang dipilih dengan sisi terpanjang maksimal 1.800 piksel.

Foto serta hasil disimpan dalam memori halaman. Pengaturan tema disimpan di `localStorage`. Batas masukan adalah 25 foto per antrean, 20 MiB dan 40 megapiksel per foto. Worker memproses foto berurutan; berkas yang gagal dibaca diberi status gagal dan antrean berlanjut ke foto berikutnya.

## Evaluasi dan pemeriksaan konversi

Evaluasi biner pada 4.306 citra test menghasilkan matriks berikut. Angkanya tersimpan dalam [manifest model](dist/model/manifest.json).

| Kondisi sebenarnya | Prediksi tidak ada indikasi | Prediksi ada indikasi |
| --- | ---: | ---: |
| Tidak ada indikasi | 1.876 | 129 |
| Ada indikasi | 280 | 2.021 |

Akurasi dihitung sebagai `(1.876 + 2.021) / 4.306 = 90,50%`. Kesalahan terdiri atas 129 alarm salah (*false positive*) dan 280 citra berindikasi yang terlewat (*false negative*). Pengukuran ini menilai label biner pada tingkat citra.

Pada bobot model lanjutan yang sama, hasil [perbandingan ambang](tools/perbandingan_biner_test.csv) adalah:

| Ambang skor | Akurasi biner | Alarm salah | Indikasi terlewat |
| --- | ---: | ---: | ---: |
| 0,35 | 81,21% | 18 | 791 |
| 0,20 | 90,50% | 129 | 280 |

Aplikasi menggunakan ambang 0,20. Pada pengujian tersebut, ambang ini menemukan lebih banyak citra berindikasi, dengan konsekuensi bertambahnya alarm salah.

Keluaran hasil ekspor juga dibandingkan dengan model Keras pada masukan yang sama:

| Pemeriksaan | Jumlah citra | Selisih skor maksimum | Rekaman hasil |
| --- | ---: | ---: | --- |
| Keras dan ONNX CPU | 12 | 0,00000295 | [parity-python.json](tools/parity-python.json) |
| Keras dan ONNX WebAssembly di Chrome | 12 | 0,00000332 | [parity-browser.json](tools/parity-browser.json) |

Urutan kelas dan jumlah kotak hasil deteksi cocok pada 12 citra pembanding. Pemeriksaan ini mengukur kesesuaian konversi. Evaluasi akurasi biner tetap mengacu pada 4.306 citra test di notebook.

Tiga gambar testing mencakup hasil benar dan salah: foto kebakaran terdeteksi memiliki indikasi, foto pohon diprediksi tanpa indikasi, sedangkan foto kucing menghasilkan salah deteksi asap dengan skor sekitar 0,216. Pada pemeriksaan di Chrome, hasil pembacaan dan resize ketiga foto ini sama dengan masukan acuan Pillow. Perbedaan decoder, profil warna, atau orientasi foto pada browser lain dapat memengaruhi piksel masukan.

Pengujian fungsi dapat dijalankan dengan `npm test`. Tes penggabungan dan NMS menggunakan data contoh di dalam berkas tes. Pemeriksaan terhadap keluaran TensorFlow/Pillow memerlukan berkas acuan di `.qa/`, yang dibuat oleh skrip ekspor; tes tersebut dilewati jika acuannya belum tersedia. Rekaman pemeriksaan antarmuka terdahulu tersedia di [check-ui.json](tools/check-ui.json).

## Menyiapkan ekspor model

Ekspor menggunakan hasil pelatihan notebook. Ekstrak paket notebook dan susun folder sesuai lokasi yang dibaca `tools/export_model.py`:

```text
folder-kerja/
  D-Fire-CNN/
    Deep-Learning-Kelompok-6/       repository aplikasi
  UTS FINAL/
    Kelompok 6-Source Code/
      UTS-Notebook.ipynb
      foto_prediksi/
      data/extracted/data/test/images/
      output/step7_model/
        model.keras
        anchors.npy
        konfigurasi.json
```

Jalankan notebook untuk menyiapkan dataset dan menghasilkan `model.keras` beserta berkas pendukungnya. Setelah itu, dari folder repository aplikasi, gunakan Python 3.11 atau 3.12 dan jalankan:

```powershell
python -m venv .venv-export
.\.venv-export\Scripts\python.exe -m pip install -r tools/export-requirements.txt
.\.venv-export\Scripts\python.exe tools/export_model.py
npm test
```

Skrip memuat model Keras, mengekspor model dan anchor ke `dist/model/`, serta membandingkan hasil menggunakan tiga foto contoh dan sembilan sampel test bila dataset tersedia. Skrip juga membuat berkas acuan pengujian di `.qa/`, memperbarui manifest, dan menyimpan hasil pembandingan Python. Pemeriksaan browser dicatat terpisah dalam `tools/parity-browser.json`.

## Rujukan implementasi

- [D-Fire](https://github.com/gaia-solutions-on-demand/DFireDataset): dataset citra, kelas, dan anotasi kotak.
- [ONNX Concepts](https://onnx.ai/onnx/intro/concepts.html): struktur berkas model dan operasi jaringan.
- [ONNX Runtime Web](https://onnxruntime.ai/docs/tutorials/web/): eksekusi model pada browser.
- [tf2onnx](https://github.com/onnx/tensorflow-onnx): ekspor model TensorFlow ke ONNX.
- [Pillow 11.2.1, Resample.c](https://github.com/python-pillow/Pillow/blob/11.2.1/src/libImaging/Resample.c): pembobotan antialias pada resize bilinear. Lisensi tersedia di `dist/vendor/`.
- [Tasko](https://github.com/noitsume/tasko-task-management-app): referensi visual sidebar dan tema antarmuka.

Petunjuk menjalankan aplikasi dan pengaturan hosting tersedia di [DEPLOY.md](DEPLOY.md).
