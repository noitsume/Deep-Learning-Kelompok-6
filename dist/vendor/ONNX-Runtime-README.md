# ONNX Runtime Web

Folder ini memuat runtime dari paket `onnxruntime-web` versi 1.31.1, sesuai [package.json](../../package.json). Aplikasi menggunakan backend WebAssembly pada CPU dengan satu thread di Web Worker. Pengaturannya terdapat di [engine.worker.js](../engine.worker.js).

| Berkas | Fungsi |
| --- | --- |
| `ort.wasm.min.mjs` | API JavaScript untuk tensor dan sesi inferensi |
| `ort-wasm-simd-threaded.mjs` | Modul penghubung JavaScript dengan mesin WebAssembly |
| `ort-wasm-simd-threaded.wasm` | Mesin yang menjalankan operasi model ONNX |

Runtime berasal dari [Microsoft ONNX Runtime](https://github.com/microsoft/onnxruntime). Dokumentasi penggunaannya tersedia di [ONNX Runtime Web](https://onnxruntime.ai/docs/tutorials/web/), dan lisensi MIT disertakan dalam [ONNX-Runtime-LICENSE.txt](ONNX-Runtime-LICENSE.txt).
