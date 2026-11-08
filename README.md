# Deep Learning — Kelompok 6

**Klasifikasi Biner Adanya Indikasi Kebakaran atau Tidak Pada Citra**

## Latar belakang

Api dan asap adalah petunjuk visual yang dapat digunakan untuk mengenali indikasi kebakaran pada sebuah gambar. Namun, warna saja belum cukup untuk membedakannya. Objek berwarna terang dapat terlihat seperti api, sedangkan awan atau kabut dapat menyerupai asap.

Melalui proyek ini, kelompok kami menggunakan Convolutional Neural Network (CNN) untuk mempelajari pola pada citra dan menghasilkan dua kemungkinan: **ada indikasi kebakaran** atau **tidak ada indikasi kebakaran**. Dataset yang digunakan adalah [D-Fire](https://github.com/gaia-solutions-on-demand/DFireDataset), yang menyediakan gambar beserta label api, asap, dan koordinat bounding box. Model menggunakan MobileNetV2 dengan transfer learning dan fine-tuning, sesuai implementasi pada notebook final `Kandidat_2_Fokus.ipynb`.

Website ini dibuat agar pengguna dapat mencoba model dengan foto mereka sendiri. Selain label biner, website menampilkan kotak pada area yang diprediksi sebagai api atau asap. Kotak dari kelas yang sama digabung untuk tampilan, sehingga maksimal ada dua kotak pada satu foto.

Model final memperoleh akurasi klasifikasi biner **90,50% pada 4.306 gambar test D-Fire**. Angka tersebut adalah hasil pada data test, sehingga prediksi pada foto baru tetap bisa salah. Website memakai bobot model yang sudah dilatih, tanpa melakukan training saat digunakan.

## Source code notebook

Unduh [Source Code.zip](source%20code/Source%20Code.zip) dari folder `source code` untuk menjalankan ulang proyek UTS. Pada halaman berkas GitHub, gunakan **Download raw file**, lalu ekstrak seluruh ZIP. Buka folder `Kelompok 6-Source Code`, pilih kernel Python 3.11 atau 3.12 versi 64-bit, kemudian jalankan **Restart Kernel → Run All** pada `Kandidat_2_Fokus.ipynb`. Petunjuk lengkap ada di README dalam ZIP.

Paket berisi notebook dengan output tersimpan, requirements, tiga foto contoh, hasil evaluasi, serta struktur `output/step5_training` sampai `output/step8_prediksi`. Dataset, bobot awal, model hasil training, isi cache, dan backup tidak disertakan. Saat Run All, notebook mengunduh dataset dan bobot awal yang belum tersedia, lalu membuat cache dan melatih model. Hasil setiap tahap menimpa berkas pada folder output yang sama.

Website untuk deployment Vercel tetap berada di `dist/`. ZIP ini digunakan untuk menjalankan notebook di komputer sendiri.

## Cara penggunaan website

1. **Masukkan foto.** Klik **Pilih foto** atau tarik berkas ke area unggahan. Kamu bisa memasukkan beberapa foto sekaligus. Format yang didukung adalah JPG, PNG, dan WebP, dengan batas 25 foto dalam antrean, 20 MB dan 40 megapiksel per foto.
2. **Mulai prediksi.** Klik **Mulai prediksi**. Pada penggunaan pertama, browser akan mengunduh model dan runtime sekitar 24 MB. Indikator menampilkan tahap pemuatan model, pembacaan foto, preprocessing, prediksi, dan pengolahan hasil.
3. **Pilih hasil yang ingin dilihat.** Setiap foto diberi nomor pada daftar. Klik salah satunya untuk melihat label, skor api/asap, dan bounding box. Kotak oranye menandai api, sedangkan kotak biru menandai asap. Skor yang ditampilkan adalah keluaran model, bukan persentase kepastian kebakaran.
4. **Bandingkan dengan foto asli.** Tombol **Foto asli** menyembunyikan kotak, sedangkan **Hasil prediksi** menampilkannya kembali. Filter pada daftar foto membantu menampilkan hasil dengan indikasi, tanpa indikasi, foto yang belum selesai, atau berkas yang gagal dibaca.
5. **Hentikan atau lanjutkan bila perlu.** Tombol **Hentikan** membatalkan proses yang sedang berjalan. Hasil yang sudah selesai tetap tersedia, dan foto yang belum selesai dapat diproses kembali lewat tombol prediksi. Jika satu berkas rusak, foto berikutnya tetap diproses.
6. **Simpan hasil.** Klik **Unduh tampilan** untuk menyimpan foto yang sedang ditampilkan sebagai PNG. Sisi terpanjang gambar unduhan maksimal 1.800 piksel. Tombol **Ekspor hasil** menyimpan JSON berisi nama foto, status, label, skor, serta koordinat prediksi.

Website dapat digunakan tanpa akun. Foto diproses langsung di browser dan tidak dikirim ke server. Foto serta hasil hanya tersimpan selama halaman masih terbuka; kalau halaman dimuat ulang atau ditutup, masukkan kembali fotonya. Tema terang dan gelap dapat diganti melalui tombol pada sidebar.

Untuk menjalankan website di komputer sendiri atau menyiapkan hosting, lihat [panduan deployment](DEPLOY.md). Penjelasan kode, konfigurasi model, dan hasil pemeriksaan tersedia di [catatan teknis](TECHNICAL.md). Urutan rekaman, bagian yang perlu disorot, dan batas selesai setiap poin tersedia di [panduan video](PANDUAN_VIDEO.md).
