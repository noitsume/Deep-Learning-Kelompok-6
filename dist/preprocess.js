// Resize bilinear dua tahap mengikuti pembobotan antialias Pillow 11.2.1.
// Rujukan: Pillow/src/libImaging/Resample.c. Tidak ada blur atau CLAHE.
const PRECISION = 2 ** 22;

function coefficients(inputSize, outputSize) {
  const scale = inputSize / outputSize;
  const support = Math.max(scale, 1);
  return Array.from({ length: outputSize }, (_, out) => {
    const center = (out + .5) * scale;
    const first = Math.max(0, Math.trunc(center - support + .5));
    const last = Math.min(inputSize, Math.trunc(center + support + .5));
    const weights = [];
    let sum = 0;
    for (let i = first; i < last; i++) {
      const w = Math.max(0, 1 - Math.abs((i - center + .5) / support));
      weights.push(w); sum += w;
    }
    return { first, weights: weights.map(w => Math.trunc(.5 + w / sum * PRECISION)) };
  });
}

export function resizeRGB(data, width, height, outWidth = 192, outHeight = 128, channels = 4) {
  const xs = coefficients(width, outWidth);
  const ys = coefficients(height, outHeight);
  const intermediate = new Uint8Array(outWidth * height * 3);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < outWidth; x++) {
      const { first, weights } = xs[x];
      for (let c = 0; c < 3; c++) {
        let sum = PRECISION / 2;
        for (let k = 0; k < weights.length; k++) sum += data[(y * width + first + k) * channels + c] * weights[k];
        intermediate[(y * outWidth + x) * 3 + c] = Math.max(0, Math.min(255, Math.floor(sum / PRECISION)));
      }
    }
  }
  const result = new Float32Array(outWidth * outHeight * 3);
  for (let y = 0; y < outHeight; y++) {
    const { first, weights } = ys[y];
    for (let x = 0; x < outWidth; x++) {
      for (let c = 0; c < 3; c++) {
        let sum = PRECISION / 2;
        for (let k = 0; k < weights.length; k++) sum += intermediate[((first + k) * outWidth + x) * 3 + c] * weights[k];
        result[(y * outWidth + x) * 3 + c] = Math.max(0, Math.min(255, Math.floor(sum / PRECISION)));
      }
    }
  }
  return result;
}
