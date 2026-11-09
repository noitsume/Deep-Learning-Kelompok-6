# Klasifikasi adanya indikasi kebakaran atau tidak pada citra

Proyek UTS Pembelajaran Mendalam Kelompok 6. Aplikasi ini menganalisis foto untuk menghasilkan label **Ada indikasi kebakaran** atau **Tidak ada indikasi kebakaran**, disertai skor dan kotak pada area yang diprediksi sebagai api atau asap.

[Buka aplikasi](https://klasifikasi-adanya-indikasi-kebakar.vercel.app/) · [Unduh source code notebook](source%20code/Source%20Code.zip)

## Tujuan dan pendekatan

Api dan asap merupakan petunjuk visual adanya indikasi kebakaran. Keduanya memiliki bentuk, warna, dan tekstur yang bervariasi, sehingga model perlu mempelajari pola dari banyak contoh citra.

Proyek ini menggunakan Convolutional Neural Network (CNN) dengan MobileNetV2, transfer learning, dan fine-tuning pada dataset [D-Fire](https://github.com/gaia-solutions-on-demand/DFireDataset). Dataset menyediakan citra beserta kelas api/asap dan koordinat kotaknya. Model memprediksi lokasi serta skor kedua kelas, lalu aplikasi menentukan label biner berdasarkan deteksi yang lolos penyaringan.

Website menyediakan cara untuk mencoba hasil pelatihan pada beberapa foto sekaligus. Pengguna dapat memeriksa setiap hasil, membandingkannya dengan foto asli, mengatur penggabungan kotak, dan menyimpan hasil prediksi.

## Cara menggunakan aplikasi

1. Klik **Pilih foto** atau tarik foto ke area unggahan. Untuk mencoba tiga gambar yang tersedia, klik **Ambil Foto Testing**. Tombol ini menambahkan gambar kebakaran, pohon, dan kucing ke antrean.
2. Atur checkbox **Gabungkan kotak sekelas**. Jika aktif, kotak api digabung menjadi satu kotak api dan kotak asap menjadi satu kotak asap.
3. Klik **Mulai prediksi**. Foto yang dipilih sendiri maupun foto testing baru diproses setelah tombol ini ditekan. Saat pertama digunakan, browser memuat model dan mesin prediksi.
4. Pilih foto dalam daftar untuk melihat label, skor, dan kotaknya. Gunakan **Foto asli** dan **Hasil prediksi** untuk membandingkan tampilan. Kotak oranye menunjukkan api dan kotak biru menunjukkan asap.
5. Klik **Unduh tampilan** untuk menyimpan gambar sebagai PNG, atau **Ekspor hasil** untuk menyimpan hasil seluruh antrean sebagai JSON. Setelah mengganti konfigurasi, klik **Prediksi ulang** untuk memproses seluruh foto dengan pengaturan terbaru.

Aplikasi menerima JPG, PNG, dan WebP, dengan maksimal 25 foto dalam antrean. Batas setiap foto adalah 20 MiB dan 40 megapiksel. Foto serta hasil berada dalam memori browser selama halaman terbuka. Tema terang/gelap, filter hasil, dan tombol **Hentikan** tersedia pada antarmuka.

## Inferensi ONNX di browser

Inferensi adalah proses menggunakan model yang sudah dilatih untuk menghitung prediksi pada masukan baru. Dalam aplikasi ini, masukannya berupa foto dan hasilnya berupa skor serta lokasi api/asap.

Model hasil pelatihan TensorFlow/Keras diekspor ke format **ONNX (Open Neural Network Exchange)**. Berkas `model.onnx` menyimpan susunan operasi jaringan dan parameter numerik hasil pelatihan, seperti bobot dan bias. **ONNX Runtime Web** membaca berkas tersebut dan menjalankan perhitungannya melalui WebAssembly di browser. Runtime sudah disertakan dalam aplikasi.

Alurnya adalah foto → RGB ukuran 192 × 128 piksel → inferensi model → penyaringan kotak → label dan tampilan hasil. Kotak dipilih dengan Non-Maximum Suppression (NMS) dan ambang skor 0,20. Minimal satu kotak api atau asap yang lolos menghasilkan label **Ada indikasi kebakaran**.

Vercel menyajikan berkas aplikasi, model, dan runtime. Perhitungan prediksi berlangsung pada perangkat pengguna, sehingga foto yang dipilih tetap diproses di browser. Penjelasan tahap per tahap tersedia di [dokumentasi teknis](TECHNICAL.md#alur-prediksi).

## Hasil evaluasi

Model memperoleh akurasi klasifikasi biner **90,50% pada 4.306 citra test D-Fire**. Dari jumlah tersebut, 3.897 citra diklasifikasikan dengan benar, 129 citra tanpa indikasi diprediksi memiliki indikasi, dan 280 citra dengan indikasi terlewat.

Hasil ini mengukur keputusan pada tingkat citra. Prediksi pada foto baru masih dapat keliru; foto kucing yang tersedia pada tombol testing merupakan contoh salah deteksi asap. Skor api/asap menunjukkan keluaran model untuk kandidat objek, sehingga harus dibaca bersama foto dan kotak hasilnya.

Rincian evaluasi, perbandingan ambang, dan pemeriksaan hasil ekspor ONNX tersedia di [TECHNICAL.md](TECHNICAL.md#evaluasi-dan-pemeriksaan-konversi).

## Menjalankan notebook

Unduh [Source Code.zip](source%20code/Source%20Code.zip) melalui **Download raw file** di GitHub, lalu ekstrak seluruh isinya. Buka folder `Kelompok 6-Source Code` dan notebook `UTS-Notebook.ipynb` dengan kernel Python 3.11 atau 3.12 versi 64-bit. Ikuti README dalam paket, kemudian jalankan **Restart Kernel → Run All**.

Paket berisi notebook dengan output tersimpan, requirements, tiga foto contoh, hasil evaluasi, dan struktur folder output. Saat dijalankan, notebook menyiapkan dataset serta bobot awal yang diperlukan, membuat cache, melatih model, dan menyimpan hasilnya. Setiap proses menggunakan folder `output/step5_training` sampai `output/step8_prediksi` yang sama, sehingga hasil run berikutnya menimpa berkas pada lokasi tersebut.

## Isi repository

| Lokasi | Isi |
| --- | --- |
| `dist/` | Aplikasi web, model ONNX, anchor, runtime, dan foto testing |
| `source code/Source Code.zip` | Paket notebook dan hasil eksperimen |
| [Laporan/](Laporan/) | Laporan teknis UTS dalam format [Word](Laporan/UTS-Laporan.docx) dan [PDF](Laporan/UTS-Laporan.pdf) |
| `tools/` | Server lokal, ekspor model, dan hasil pemeriksaan konversi |
| `tests/` | Pengujian preprocessing dan pengolahan kotak |
| [TECHNICAL.md](TECHNICAL.md) | Arsitektur, inferensi, susunan kode, dan evaluasi |
| [DEPLOY.md](DEPLOY.md) | Menjalankan aplikasi secara lokal dan menerbitkannya ke Vercel |
