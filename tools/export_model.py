"""Ekspor bobot notebook ke ONNX dan cek hasilnya. Tidak melakukan training."""
import hashlib
import json
import os
from pathlib import Path

os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "2")
import numpy as np
import tensorflow as tf
import tf2onnx
import onnxruntime as ort
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT.parent / "kandidat_2_fokus" / "hasil_20261104_163407"
NOTEBOOK = SOURCE.parent / "Kandidat_2_Fokus.ipynb"
OUT = ROOT / "dist" / "model"
QA = ROOT / ".qa"
OUT.mkdir(parents=True, exist_ok=True)
QA.mkdir(exist_ok=True)
tf.config.threading.set_intra_op_parallelism_threads(4)
tf.config.threading.set_inter_op_parallelism_threads(2)

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

before = {str(p): sha(p) for p in [NOTEBOOK, SOURCE / "model.keras"]}
model = tf.keras.models.load_model(SOURCE / "model.keras", compile=False)
anchors = np.load(SOURCE / "anchors.npy")
config = json.loads((SOURCE / "konfigurasi.json").read_text())

@tf.function(input_signature=[tf.TensorSpec([1, 128, 192, 3], tf.float32, name="rgb")])
def inference(rgb):
    return tf.identity(model(rgb, training=False), name="detections")

print("Exporting original weights to float32 ONNX...", flush=True)
tf2onnx.convert.from_function(inference, input_signature=inference.input_signature,
                             opset=17, output_path=str(OUT / "model.onnx"))
anchors.astype("<f4").tofile(OUT / "anchors.bin")
session = ort.InferenceSession(str(OUT / "model.onnx"), providers=["CPUExecutionProvider"])

# Ambil fungsi postprocessing langsung dari notebook, tanpa mengeksekusi sel training.
import ast
notebook = json.loads(NOTEBOOK.read_text(encoding="utf-8"))
namespace = dict(np=np, tf=tf, anchors=anchors,
                 STD_BOX=np.array([.1,.1,.2,.2], np.float32),
                 IOU_NMS=.5, MAX_DETEKSI=100, AMBANG=.2)
for cell in notebook["cells"]:
    if cell["cell_type"] == "code":
        for node in ast.parse("".join(cell["source"])).body:
            if isinstance(node, ast.FunctionDef) and node.name == "prediksi_kotak":
                exec(compile(ast.Module(body=[node], type_ignores=[]), "notebook", "exec"), namespace)
postprocess = namespace["prediksi_kotak"]

downloads = Path.home() / "Downloads"
photos = [downloads / name for name in ["IMG-20260824-WA0016.jpg", "hari-pohon-sedunia.webp", "images3.jpeg"]]
test_dir = ROOT.parent / "data" / "extracted" / "data" / "test" / "images"
test_photos = sorted(test_dir.glob("*"))
if test_photos:
    photos += [test_photos[i] for i in np.linspace(0, len(test_photos)-1, 9, dtype=int)]
records = []
for i, path in enumerate(photos):
    if not path.is_file():
        raise FileNotFoundError(path)
    with Image.open(path) as im:
        rgb = im.convert("RGB")
        pixels = np.asarray(rgb, dtype=np.uint8)
        x = np.asarray(rgb.resize((192, 128), Image.Resampling.BILINEAR), dtype=np.float32)[None]
    expected = model(x, training=False).numpy()[0]
    actual = session.run(None, {session.get_inputs()[0].name: x})[0][0]
    expected_boxes, actual_boxes = postprocess(expected), postprocess(actual)
    classes_match = [p["kelas"] for p in expected_boxes] == [p["kelas"] for p in actual_boxes]
    score_error = float(np.max(np.abs(tf.sigmoid(expected[:,4:]).numpy() - tf.sigmoid(actual[:,4:]).numpy())))
    raw_error = float(np.max(np.abs(expected-actual)))
    box_error = max((float(np.max(np.abs(np.array(a["kotak"])-b["kotak"])))
                     for a,b in zip(expected_boxes, actual_boxes)), default=0.)
    assert classes_match and score_error < 1e-4 and box_error < 1e-4, (path.name, raw_error, score_error, box_error)
    record = dict(index=i, file=path.name, width=rgb.width, height=rgb.height,
                  raw_max_abs_error=raw_error, score_max_abs_error=score_error,
                  box_max_abs_error=box_error, same_detections=classes_match,
                  expected_scores=tf.sigmoid(expected[:,4:]).numpy().max(axis=0).tolist(),
                  expected_boxes=expected_boxes)
    records.append(record)
    x.astype("<f4").tofile(QA / f"input-{i}.bin")
    expected.astype("<f4").tofile(QA / f"expected-{i}.bin")
    if i < 3:
        pixels.tofile(QA / f"rgb-{i}.bin")
        import shutil
        shutil.copy2(path, QA / f"photo-{i}{path.suffix}")
        record["photo_fixture"] = f"photo-{i}{path.suffix}"
    print(f"{path.name}: score error {score_error:.8f}, boxes {len(expected_boxes)}, match {classes_match}", flush=True)

assert before == {path: sha(Path(path)) for path in before}, "Source files changed"
manifest = dict(name="D-Fire · Kelompok 6", notebook="Kandidat_2_Fokus.ipynb",
                run="hasil_20261104_163407", height=128, width=192, classes=["asap", "api"],
                threshold=.2, nms_iou=.5, nms_candidate_threshold=.01, max_detections=100,
                box_std=[.1,.1,.2,.2], preprocessing="RGB → bilinear 192×128 → float32 (0–255)",
                accuracy_test=config["akurasi_test"], confusion_matrix=config["confusion_matrix"],
                test_images=4306, parameters=model.count_params(),
                source_sha256=sha(SOURCE / "model.keras"), notebook_sha256=sha(NOTEBOOK),
                onnx_sha256=sha(OUT / "model.onnx"), model_bytes=(OUT / "model.onnx").stat().st_size,
                export=dict(tensorflow=tf.__version__, tf2onnx=tf2onnx.__version__,
                            onnxruntime=ort.__version__, opset=17, precision="float32", retrained=False))
(OUT / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
(QA / "fixtures.json").write_text(json.dumps(records, indent=2), encoding="utf-8")
(ROOT / "tools" / "parity-python.json").write_text(json.dumps(dict(
    source_sha256=manifest["source_sha256"], onnx_sha256=manifest["onnx_sha256"],
    tested=len(records), max_score_error=max(r["score_max_abs_error"] for r in records),
    max_box_error=max(r["box_max_abs_error"] for r in records),
    cases=[{k:v for k,v in r.items() if k not in ["expected_boxes", "photo_fixture"]} for r in records]
), indent=2), encoding="utf-8")
print("DONE", json.dumps(manifest), flush=True)
