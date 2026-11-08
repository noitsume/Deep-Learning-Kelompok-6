// Dekode anchor dan NMS mengikuti prediksi_kotak di notebook final.
const f32 = Math.fround;
const clamp = x => Math.max(0, Math.min(1, x));
const sigmoid = x => f32(1 / (1 + Math.exp(-x)));

export function iou(a, b) {
  const width = Math.max(0, Math.min(a[2], b[2]) - Math.max(a[0], b[0]));
  const height = Math.max(0, Math.min(a[3], b[3]) - Math.max(a[1], b[1]));
  const intersection = width * height;
  const union = (a[2]-a[0])*(a[3]-a[1]) + (b[2]-b[0])*(b[3]-b[1]) - intersection;
  return union > 0 ? intersection / union : 0;
}

export function decode(raw, anchors, config, mergeBoxes = true) {
  const candidates = [[], []];
  const maxScores = [0, 0];
  for (let i = 0; i < anchors.length / 4; i++) {
    const a = i * 4, r = i * 6;
    const dx = f32(raw[r] * f32(config.box_std[0]));
    const dy = f32(raw[r+1] * f32(config.box_std[1]));
    const dw = f32(raw[r+2] * f32(config.box_std[2]));
    const dh = f32(raw[r+3] * f32(config.box_std[3]));
    const w = f32(f32(Math.exp(Math.max(-8, Math.min(8, dw)))) * anchors[a+2]);
    const h = f32(f32(Math.exp(Math.max(-8, Math.min(8, dh)))) * anchors[a+3]);
    const x = f32(f32(dx * anchors[a+2]) + anchors[a]);
    const y = f32(f32(dy * anchors[a+3]) + anchors[a+1]);
    const box = [clamp(f32(x-w/2)), clamp(f32(y-h/2)), clamp(f32(x+w/2)), clamp(f32(y+h/2))];
    for (let c = 0; c < 2; c++) {
      const score = sigmoid(raw[r+4+c]);
      maxScores[c] = Math.max(maxScores[c], score);
      if (score >= config.nms_candidate_threshold && box[2] > box[0] && box[3] > box[1]) {
        candidates[c].push({ classId:c, score, box, anchor:i });
      }
    }
  }
  const selected = [];
  for (const group of candidates) {
    group.sort((a,b) => b.score-a.score || a.anchor-b.anchor);
    const kept = [];
    for (const candidate of group) {
      if (kept.every(p => iou(p.box, candidate.box) <= config.nms_iou)) kept.push(candidate);
      if (kept.length === config.max_detections) break;
    }
    selected.push(...kept);
  }
  const detections = selected.sort((a,b) => b.score-a.score).slice(0, config.max_detections)
    .filter(p => p.score >= config.threshold);
  return { positive: detections.length > 0, maxScores, detections, mergeBoxes,
    boxes: mergeBoxes ? mergeForDisplay(detections) : detections };
}

// Penggabungan per kelas hanya untuk tampilan: maksimal satu kotak asap dan satu api.
export function mergeForDisplay(detections) {
  return [0,1].flatMap(classId => {
    const group = detections.filter(p => p.classId === classId);
    if (!group.length) return [];
    return [{ classId, count:group.length, score:Math.max(...group.map(p=>p.score)),
      box:[Math.min(...group.map(p=>p.box[0])), Math.min(...group.map(p=>p.box[1])),
           Math.max(...group.map(p=>p.box[2])), Math.max(...group.map(p=>p.box[3]))] }];
  });
}
