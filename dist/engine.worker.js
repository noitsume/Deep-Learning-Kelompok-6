import * as ort from './vendor/ort.wasm.min.mjs';
import { resizeRGB } from './preprocess.js';
import { decode } from './postprocess.js';

let session, config, anchors;
const phase = (name, detail, extra = {}) => postMessage({ type:'phase', name, detail, ...extra });

async function download(url, label) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${label} tidak dapat dimuat (${response.status}). Coba lagi saat koneksi tersedia.`);
  const total = Number(response.headers.get('content-length'));
  const reader = response.body.getReader();
  const chunks = [];
  let loaded = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value); loaded += value.length;
    phase('model', `${label} · ${(loaded / 1048576).toFixed(1)} MB${total ? ` / ${(total / 1048576).toFixed(1)} MB` : ''}`, { loaded, total });
  }
  const bytes = new Uint8Array(loaded);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return bytes;
}

async function initialize() {
  const initStart = performance.now();
  phase('model', 'Menyiapkan mesin prediksi di browser…');
  const response = await fetch('./model/manifest.json');
  if (!response.ok) throw new Error('Konfigurasi model tidak dapat dimuat.');
  config = await response.json();
  const anchorResponse = await fetch('./model/anchors.bin');
  if (!anchorResponse.ok) throw new Error('Anchor model tidak dapat dimuat.');
  anchors = new Float32Array(await anchorResponse.arrayBuffer());
  const model = await download('./model/model.onnx', 'Mengunduh model');
  let shaVerified = false;
  if (crypto.subtle) {
    const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', model)), b => b.toString(16).padStart(2,'0')).join('');
    if (hash !== config.onnx_sha256) throw new Error('Berkas model tidak sesuai checksum. Muat ulang halaman.');
    shaVerified = true;
  }
  const wasm = await download('./vendor/ort-wasm-simd-threaded.wasm', 'Mengunduh runtime');
  ort.env.wasm.numThreads = 1;
  ort.env.wasm.wasmPaths = new URL('./vendor/', import.meta.url).href;
  ort.env.wasm.wasmBinary = wasm;
  phase('model', 'Memuat bobot model…');
  session = await ort.InferenceSession.create(model, { executionProviders:['wasm'], graphOptimizationLevel:'all' });
  postMessage({
    type:'ready',
    config,
    runtime:{
      provider:'wasm',
      modelBytes:model.byteLength,
      wasmBytes:wasm.byteLength,
      shaVerified,
      initMs:performance.now() - initStart,
    },
  });
}

async function predict(file, id, mergeBoxes, threshold) {
  const start = performance.now();
  phase('decode', `Membaca ${file.name}`, { id });
  let bitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation:'none', colorSpaceConversion:'none', premultiplyAlpha:'none' });
  } catch { throw new Error('Foto tidak dapat dibaca. Pastikan isinya benar-benar JPG, PNG, atau WebP.'); }
  const width = bitmap.width, height = bitmap.height;
  if (width * height > 40_000_000) { bitmap.close(); throw new Error('Ukuran foto melebihi 40 megapiksel. Gunakan foto yang lebih kecil.'); }
  phase('preprocess', 'RGB → resize bilinear 192 × 128 → float32', { id });
  const canvas = new OffscreenCanvas(width, height);
  const context = canvas.getContext('2d', { willReadFrequently:true, colorSpace:'srgb' });
  context.drawImage(bitmap, 0, 0); bitmap.close();
  const pixels = context.getImageData(0, 0, width, height).data;
  const input = resizeRGB(pixels, width, height, config.width, config.height);
  canvas.width = canvas.height = 1;
  const preprocessMs = performance.now() - start;
  phase('inference', 'Model sedang mencari indikasi api dan asap…', { id });
  const inferStart = performance.now();
  const tensor = new ort.Tensor('float32', input, [1, config.height, config.width, 3]);
  let outputs;
  try {
    outputs = await session.run({ [session.inputNames[0]]:tensor });
    const inferenceMs = performance.now() - inferStart;
    phase('boxes', mergeBoxes ? 'Menyaring prediksi dan menggabungkan kotak per kelas…' : 'Menyaring prediksi tanpa penggabungan kotak…', { id });
    const result = decode(outputs[session.outputNames[0]].data, anchors, config, mergeBoxes, threshold ?? config.threshold);
    postMessage({ type:'result', id, result:{ ...result, width, height, preprocessMs, inferenceMs, elapsedMs:performance.now()-start } });
  } finally {
    tensor.dispose();
    if (outputs) Object.values(outputs).forEach(output => output.dispose());
  }
}

self.onmessage = async ({ data }) => {
  try {
    if (data.type === 'init') await initialize();
    if (data.type === 'predict') await predict(data.file, data.id, data.mergeBoxes, data.threshold);
  } catch (error) {
    postMessage({ type:'error', id:data.id, fatal:data.type === 'init', message:error.message || 'Prediksi gagal diproses.' });
  }
};
