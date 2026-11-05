# Menjalankan dan deploy website

Folder **`dist/` sudah siap disajikan sebagai website statis**. Model ONNX, anchor, dan runtime WASM sudah ikut di repository. Tidak perlu dataset training, TensorFlow, Python, API key, atau server untuk menerima unggahan foto.

## Menjalankan di komputer sendiri

Pasang Node.js, lalu buka terminal di folder repository dan jalankan:

```sh
npm run dev
```

Buka **http://127.0.0.1:5173/**. Tidak perlu `npm install` untuk perintah ini karena server lokal hanya memakai modul bawaan Node.js. Jangan membuka `index.html` langsung melalui `file://`; Web Worker perlu disajikan lewat HTTP/HTTPS.

## Vercel

1. Import repository **`noitsume/Deep-Learning-Kelompok-6`** ke Vercel.
2. Gunakan root repository sebagai **Root Directory** dan preset **Other**.
3. Konfigurasi `vercel.json` sudah menetapkan **Output Directory: `dist`**, tanpa build dan instalasi dependensi. Kalau dashboard menampilkan override pengaturan, samakan dengan konfigurasi tersebut.
4. Jalankan deployment dari akun Vercel sendiri. Tidak ada environment variable yang wajib diisi.
5. Setelah berhasil, buka alamat hasil deployment tanpa login dan coba satu foto. Pastikan proses pemuatan model selesai dan label prediksi muncul.

Untuk hosting statis lainnya, sajikan isi `dist/` melalui HTTPS. Berkas `.mjs` harus disajikan sebagai JavaScript dan `.wasm` sebagai `application/wasm`. Model dan runtime adalah bagian wajib website, jadi jangan mengunggah HTML saja.

Dokumentasi pengaturan: [Vercel — vercel.json](https://vercel.com/docs/project-configuration/vercel-json).

## Jika ingin mengubah kode

Kode halaman ada di `dist/index.html`, `dist/styles.css`, dan `dist/app.js`. Prediksi dijalankan oleh `dist/engine.worker.js`; preprocessing dan pengolahan kotak ada di berkas tersendiri.

Versi runtime dikunci melalui `package-lock.json`. Jika perlu menyalin ulang runtime dari paket npm:

```sh
npm ci
npm run vendor
```

Perubahan tampilan tidak membutuhkan training atau ekspor ulang model. Petunjuk ekspor dan bukti kecocokan hasil ada di [TECHNICAL.md](TECHNICAL.md).
