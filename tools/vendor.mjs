// Salin runtime lokal, agar prediksi tidak bergantung pada CDN.
import { mkdir, copyFile } from 'node:fs/promises';
const root = new URL('../', import.meta.url);
const target = new URL('dist/vendor/', root);
await mkdir(target, { recursive: true });
for (const name of ['ort.wasm.min.mjs', 'ort-wasm-simd-threaded.mjs', 'ort-wasm-simd-threaded.wasm']) {
  await copyFile(new URL(`node_modules/onnxruntime-web/dist/${name}`, root), new URL(name, target));
}
await copyFile(new URL('node_modules/onnxruntime-web/README.md', root), new URL('ONNX-Runtime-README.md', target));
console.log('Runtime ONNX disalin ke dist/vendor.');
