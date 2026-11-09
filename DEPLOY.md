# Menjalankan dan menerbitkan aplikasi

Alamat aplikasi: [Klasifikasi adanya indikasi kebakaran atau tidak pada citra](https://klasifikasi-adanya-indikasi-kebakar.vercel.app/).

Aplikasi disajikan sebagai website statis dari folder `dist/`. Folder ini memuat halaman, JavaScript, CSS, model ONNX, anchor, dan runtime WebAssembly. Browser mengambil berkas tersebut dari hosting, lalu menjalankan prediksi pada perangkat pengguna.

## Menjalankan secara lokal

Pasang Node.js, buka terminal di folder repository, lalu jalankan:

```sh
npm run dev
```

Buka [http://127.0.0.1:5173/](http://127.0.0.1:5173/). Perintah ini menjalankan `tools/serve.mjs`, yang menggunakan modul bawaan Node.js untuk menyajikan isi `dist/` melalui HTTP. Jalur HTTP ini diperlukan agar browser dapat memuat modul dan Web Worker.

Pilih foto atau klik **Ambil Foto Testing**, lalu tekan **Mulai prediksi**. Saat model selesai dimuat, aplikasi memproses foto dalam antrean dan menampilkan hasil setiap foto.

## Deployment ke Vercel

1. Siapkan repository ini pada akun GitHub yang terhubung ke Vercel.
2. Di Vercel, pilih **Add New → Project**, kemudian impor repository tersebut.
3. Gunakan root repository sebagai **Root Directory** dan **Other** sebagai preset framework.
4. Gunakan konfigurasi dari [vercel.json](vercel.json):

   | Pengaturan | Nilai |
   | --- | --- |
   | Output Directory | `dist` |
   | Build Command | String kosong (`""`) untuk melewati proses build |
   | Install Command | String kosong (`""`) untuk melewati instalasi dependensi |

5. Klik **Deploy**. Setelah status **Ready**, buka alamat produksi dan jalankan prediksi untuk memeriksa pemuatan model serta tampilan hasil.

Model dan runtime sudah tersedia di `dist/`, sehingga Vercel langsung menyajikan berkas aplikasi. Konfigurasi juga menetapkan tipe konten `application/javascript` untuk `.mjs` dan `application/wasm` untuk `.wasm`. Penjelasan pengaturannya tersedia pada [dokumentasi vercel.json](https://vercel.com/docs/project-configuration/vercel-json).

Proyek produksi `klasifikasi-adanya-indikasi-kebakaran` terhubung ke branch `main` repository ini. Pembaruan yang didorong ke branch tersebut mengikuti alur deployment Vercel.

## Memeriksa hasil deployment

- Buka alamat produksi melalui jendela privat untuk memastikan halaman dapat diakses publik.
- Klik **Ambil Foto Testing**. Pastikan tiga foto masuk ke antrean, lalu klik **Mulai prediksi** dan tunggu hasilnya.
- Periksa label, skor, dan kotak tiap foto. Ubah checkbox **Gabungkan kotak sekelas**, tekan **Prediksi ulang**, lalu periksa perubahan kotak tampilan.
- Coba **Unduh tampilan** dan **Ekspor hasil** untuk memeriksa keluaran PNG dan JSON.

Untuk memperbarui salinan runtime sesuai versi di `package-lock.json`, jalankan `npm ci` kemudian `npm run vendor`. Struktur kode dan proses ekspor model dijelaskan di [TECHNICAL.md](TECHNICAL.md).
