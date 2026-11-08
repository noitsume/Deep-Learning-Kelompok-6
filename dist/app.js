const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const state = { items:[], nextIndex:1, selected:null, running:false, ready:false, worker:null,
  active:null, config:null, runOptions:{ mergeBoxes:true }, follow:true, showBoxes:true, bitmap:null, bitmapId:null, drawTicket:0 };
const names = ['Asap','Api'];
const colors = ['#29c8f3','#ff743e'];
const pad = number => String(number).padStart(2, '0');
const icon = name => `<svg class="icon" aria-hidden="true"><use href="#i-${name}"/></svg>`;
const doneItems = () => state.items.filter(item => item.status === 'done');
const pendingItems = () => state.items.filter(item => item.status === 'pending');
const selectedItem = () => state.items.find(item => item.id === state.selected);

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

let toastTimer;
function toast(text) {
  $('#toast').textContent = text; $('#toast').hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => $('#toast').hidden = true, 3500);
}
function notice(text = '') { $('#notice').textContent = text; $('#notice').hidden = !text; }

function setPage() {
  const page = ['prediksi','panduan','model'].includes(location.hash.slice(1)) ? location.hash.slice(1) : 'prediksi';
  $$('.page').forEach(node => node.hidden = node.id !== `page-${page}`);
  $$('.nav-item').forEach(node => { node.classList.toggle('active', node.dataset.page === page); if (node.dataset.page === page) node.setAttribute('aria-current','page'); else node.removeAttribute('aria-current'); });
  $('#pageName').textContent = { prediksi:'Prediksi foto', panduan:'Cara penggunaan', model:'Tentang model' }[page];
}
window.addEventListener('hashchange', setPage);
setPage();

function updateTheme() {
  const dark = document.documentElement.dataset.theme === 'dark';
  $('#themeLabel').textContent = dark ? 'Tema terang' : 'Tema gelap';
  $('#themeToggle use').setAttribute('href', dark ? '#i-sun' : '#i-moon');
  $('#themeToggle').setAttribute('aria-label', `Beralih ke tema ${dark ? 'terang' : 'gelap'}`);
  $('meta[name="theme-color"]').content = dark ? '#111412' : '#faf9f6';
}
$('#themeToggle').addEventListener('click', () => {
  const theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = theme;
  try { localStorage.setItem('dfire-theme', theme); } catch { /* Tema tetap berlaku pada sesi ini. */ }
  updateTheme();
});
updateTheme();

function visibleItems() {
  const filter = $('#filter').value;
  return state.items.filter(item => filter === 'all' ||
    (filter === 'positive' && item.result?.positive) ||
    (filter === 'negative' && item.result && !item.result.positive) ||
    (filter === 'pending' && ['pending','processing'].includes(item.status)) ||
    (filter === 'error' && item.status === 'error'));
}

function addFiles(files) {
  if (state.running) { notice('Tunggu prediksi selesai atau hentikan proses sebelum menambahkan foto.'); return; }
  notice();
  const errors = [];
  let added = 0;
  for (const file of files) {
    if (state.items.length >= 25) { errors.push('Antrean dibatasi 25 foto. Hapus sebagian foto untuk menambah yang lain.'); break; }
    if (!/\.(jpe?g|png|webp)$/i.test(file.name)) { errors.push(`${file.name}: format belum didukung. Gunakan JPG, PNG, atau WebP.`); continue; }
    if (file.size > 20 * 1024 * 1024 || !file.size) { errors.push(`${file.name}: berkas kosong atau melebihi 20 MB.`); continue; }
    // Nama yang sama tetap boleh: setiap berkas memiliki ID sendiri.
    const item = { id:crypto.randomUUID(), index:state.nextIndex++, file, url:URL.createObjectURL(file), status:'pending' };
    state.items.push(item); added++;
    if (!state.selected) state.selected = item.id;
  }
  $('#fileInput').value = '';
  if (errors.length) notice(errors.join('\n'));
  if (added) { $('#filter').value = 'all'; toast(`${added} foto ditambahkan ke antrean.`); }
  render();
  renderViewer();
}
$('#chooseFiles').addEventListener('click', () => $('#fileInput').click());
$('#fileInput').addEventListener('change', event => addFiles([...event.target.files]));
let loadingExamples = false;
$('#loadExamples').addEventListener('click', async () => {
  if (loadingExamples || state.running) return;
  if (state.items.length > 22) { notice('Sisakan tiga tempat di antrean untuk foto demo. Batas antrean adalah 25 foto.'); return; }
  loadingExamples = true; notice(); render();
  try {
    const examples = ['IMG-20260824-WA0016.jpg', 'hari-pohon-sedunia.webp', 'images3.jpeg'];
    const files = await Promise.all(examples.map(async name => {
      const response = await fetch(new URL(`./examples/${name}`, import.meta.url));
      if (!response.ok) throw new Error('Foto demo tidak tersedia.');
      const blob = await response.blob();
      return new File([blob], name, { type:blob.type });
    }));
    addFiles(files);
  } catch {
    notice('Foto demo belum berhasil dimuat. Periksa koneksi internet atau pilih foto dari perangkat.');
  } finally {
    loadingExamples = false; render();
  }
});
let dragDepth = 0;
$('#dropzone').addEventListener('dragenter', event => { event.preventDefault(); dragDepth++; $('#dropzone').classList.add('dragging'); });
$('#dropzone').addEventListener('dragover', event => event.preventDefault());
$('#dropzone').addEventListener('dragleave', () => { if (--dragDepth <= 0) $('#dropzone').classList.remove('dragging'); });
$('#dropzone').addEventListener('drop', event => { event.preventDefault(); dragDepth = 0; $('#dropzone').classList.remove('dragging'); addFiles([...event.dataTransfer.files]); });
window.addEventListener('dragover', event => event.preventDefault());
window.addEventListener('drop', event => event.preventDefault());

function choose(id) {
  const focusQueue = $('#queue').contains(document.activeElement);
  state.selected = id; state.follow = false; render(); renderViewer();
  if (focusQueue) $('#queue .queue-select[aria-pressed="true"]')?.focus({ preventScroll:true });
}
function remove(id) {
  if (state.running) return;
  const item = state.items.find(item => item.id === id);
  if (!item) return;
  URL.revokeObjectURL(item.url);
  state.items = state.items.filter(item => item.id !== id);
  if (state.selected === id) state.selected = visibleItems()[0]?.id ?? null;
  render(); renderViewer();
}
function renderQueue() {
  const container = $('#queue');
  const scroll = { top:container.scrollTop, left:container.scrollLeft };
  container.replaceChildren();
  const visible = visibleItems();
  if (!visible.length) {
    const empty = element('div','queue-empty');
    empty.innerHTML = `${icon('image')}<p>${state.items.length ? 'Tidak ada foto pada filter ini' : 'Belum ada foto'}</p><span>Foto yang kamu pilih akan<br>muncul berurutan di sini.</span>`;
    container.append(empty);
  }
  for (const item of visible) {
    const row = element('div',`queue-item${item.id === state.selected ? ' active' : ''}${item.status === 'processing' ? ' processing' : ''}`);
    const button = element('button','queue-select');
    button.setAttribute('aria-label', `Foto ${item.index}: ${item.file.name}`);
    button.setAttribute('aria-pressed', String(item.id === state.selected));
    button.addEventListener('click', () => choose(item.id));
    button.append(element('span','queue-index',pad(item.index)));
    const image = element('img','thumbnail'); image.src = item.url; image.alt = ''; image.loading = 'lazy'; image.addEventListener('error',()=>image.style.visibility='hidden',{once:true}); button.append(image);
    const copy = element('span','queue-copy');
    const name = element('span','queue-name',item.file.name); name.title = item.file.name; copy.append(name);
    const verdict = item.status === 'done' ? (item.result.positive ? 'positive' : 'negative') : item.status;
    const label = { positive:'Ada indikasi',negative:'Tidak ada indikasi',pending:'Menunggu',processing:'Sedang diproses',error:'Gagal diproses' }[verdict];
    const status = element('span',`queue-status ${verdict}`);
    status.append(element('span', item.status === 'processing' ? 'busy-spinner' : 'small-dot'), document.createTextNode(label)); copy.append(status); button.append(copy); row.append(button);
    const close = element('button','remove-file'); close.innerHTML = icon('close'); close.disabled = state.running; close.setAttribute('aria-label',`Hapus foto ${item.index}`); close.addEventListener('click',()=>remove(item.id)); row.append(close);
    container.append(row);
  }
  container.scrollTop = scroll.top; container.scrollLeft = scroll.left;
}

function render() {
  renderQueue();
  const done = doneItems();
  const errors = state.items.filter(item=>item.status === 'error').length;
  $('#totalBadge').textContent = `${state.items.length} foto`;
  $('#clearAll').disabled = !state.items.length || state.running;
  $('#loadExamples').disabled = loadingExamples || state.running;
  $('#loadExamples').textContent = loadingExamples ? 'Memuat foto demo…' : 'Muat 3 foto demo';
  $('#mergeBoxes').disabled = state.running;
  $('#chooseFiles').disabled = state.running;
  $('#fileInput').disabled = state.running;
  $('#exportAll').disabled = !done.length;
  $('#runButton').disabled = state.running || loadingExamples || !state.items.length;
  $('#runButton').innerHTML = state.running ? '<span class="busy-spinner"></span>Memproses…' : `${done.length || errors ? 'Prediksi ulang' : 'Mulai prediksi'}${icon('arrow')}`;
  const positive = done.filter(item=>item.result.positive).length;
  $('#queueSummary').textContent = state.items.length ? `${done.length} selesai · ${positive} indikasi · ${done.length-positive} tanpa indikasi${errors ? ` · ${errors} gagal` : ''}` : 'Menunggu foto pertama';
  $('#progressCount').textContent = `${done.length + errors} / ${state.items.length} foto`;
  $('#batchProgress').max = Math.max(1, state.items.length);
  $('#batchProgress').value = done.length + errors;
  $('#modelState').className = `model-state${state.running ? ' busy' : state.ready ? ' ready' : ''}`;
  $('#modelState').innerHTML = `<span class="status-dot"></span>${state.running ? 'Memproses di browser' : state.ready ? 'Model siap digunakan' : 'Model siap dimuat'}`;
}

function reportPhase(name, detail) {
  $('#progressText').textContent = detail;
  $$('#phaseList li').forEach(node=>node.classList.toggle('active',node.dataset.phase === name));
}

function makeWorker() {
  const worker = new Worker(new URL('./engine.worker.js', import.meta.url), { type:'module' });
  state.worker = worker;
  worker.onmessage = ({ data }) => {
    if (state.worker !== worker) return;
    if (data.type === 'phase') reportPhase(data.name, data.detail);
    if (data.type === 'ready') { state.config = data.config; state.ready = true; processNext(); }
    if (data.type === 'result') {
      const item = state.items.find(item=>item.id === data.id);
      if (item) { item.result = data.result; item.status = 'done'; item.error = null; }
      state.active = null;
      render(); if (state.selected === data.id) renderViewer();
      processNext();
    }
    if (data.type === 'error') {
      if (data.fatal) { stop(false); notice(`Model belum berhasil dimuat. ${data.message}`); return; }
      const item = state.items.find(item=>item.id === data.id);
      if (item) { item.status = 'error'; item.error = data.message; }
      state.active = null;
      render(); if (state.selected === data.id) renderViewer();
      processNext();
    }
  };
  worker.onerror = event => { event.preventDefault(); stop(false); notice('Mesin prediksi berhenti. Coba ulang atau gunakan Chrome/Edge/Firefox versi terbaru. Tutup tab lain jika memori perangkat terbatas.'); };
  return worker;
}

function processNext() {
  if (!state.running) return;
  const item = pendingItems()[0];
  if (!item) {
    state.running = false; $('#stopButton').hidden = true;
    const errors = state.items.filter(item=>item.status === 'error').length;
    reportPhase('boxes', errors ? `Proses selesai. ${errors} foto gagal dibaca; detail ada di daftar.` : `Selesai. ${doneItems().length} foto sudah diprediksi.`);
    render(); toast(errors ? 'Proses selesai dengan beberapa berkas gagal.' : 'Semua foto selesai diprediksi.'); return;
  }
  item.status = 'processing'; state.active = item.id;
  if (state.follow) state.selected = item.id;
  render(); renderViewer();
  state.worker.postMessage({ type:'predict', file:item.file, id:item.id, mergeBoxes:state.runOptions.mergeBoxes });
}

$('#runButton').addEventListener('click', () => {
  if (state.running || loadingExamples || !state.items.length) return;
  if (!('Worker' in window) || !('OffscreenCanvas' in window) || !('createImageBitmap' in window) || !('WebAssembly' in window)) {
    notice('Browser ini belum mendukung mesin prediksi. Gunakan Chrome, Edge, atau Firefox versi terbaru.'); return;
  }
  notice();
  state.runOptions = { mergeBoxes:$('#mergeBoxes').checked };
  state.items.forEach(item=>{ item.status = 'pending'; item.result = null; item.error = null; });
  state.running = true; state.follow = true; $('#filter').value = 'all';
  $('#progressPanel').hidden = false; $('#stopButton').hidden = false;
  render(); renderViewer();
  if (state.ready && state.worker) processNext();
  else {
    reportPhase('model','Menyiapkan model. Unduhan pertama memerlukan koneksi internet…');
    try { makeWorker().postMessage({ type:'init' }); }
    catch { stop(false); notice('Worker tidak dapat dimulai. Buka melalui alamat website atau localhost, bukan dengan klik langsung file HTML.'); }
  }
});

function stop(announce = true) {
  state.worker?.terminate(); state.worker = null; state.ready = false; state.running = false;
  const active = state.items.find(item=>item.id === state.active);
  if (active) active.status = 'pending';
  state.active = null; $('#stopButton').hidden = true;
  reportPhase('', 'Dihentikan. Hasil yang selesai tetap ada. Prediksi berikutnya memproses ulang seluruh antrean.');
  render(); renderViewer();
  if (announce) toast('Proses dihentikan. Semua foto dapat diprediksi ulang.');
}
$('#stopButton').addEventListener('click',()=>stop());
$('#clearAll').addEventListener('click',()=>{
  if (state.running) return;
  state.items.forEach(item=>URL.revokeObjectURL(item.url));
  state.items = []; state.selected = null; state.nextIndex = 1;
  $('#filter').value = 'all'; $('#progressPanel').hidden = true; notice();
  render(); renderViewer();
});
$('#filter').addEventListener('change',()=>{
  if (!visibleItems().some(item=>item.id === state.selected)) state.selected = visibleItems()[0]?.id ?? null;
  state.follow = false; render(); renderViewer();
});
function stepPhoto(direction) {
  const visible = visibleItems();
  const index = visible.findIndex(item=>item.id === state.selected);
  if (visible[index+direction]) choose(visible[index+direction].id);
}
$('#prevPhoto').addEventListener('click',()=>stepPhoto(-1));
$('#nextPhoto').addEventListener('click',()=>stepPhoto(1));
$('#queue').addEventListener('keydown',event=>{
  if (['ArrowLeft','ArrowUp','ArrowRight','ArrowDown'].includes(event.key)) {
    event.preventDefault(); stepPhoto(['ArrowLeft','ArrowUp'].includes(event.key) ? -1 : 1);
  }
});
$('#viewerContent').addEventListener('keydown',event=>{
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); stepPhoto(event.key === 'ArrowLeft' ? -1 : 1); }
});

async function renderViewer() {
  const item = selectedItem();
  const ticket = ++state.drawTicket;
  $('#viewerEmpty').hidden = !!item; $('#viewerContent').hidden = !item;
  if (!item) { state.bitmap?.close(); state.bitmap = null; state.bitmapId = null; return; }
  $('#selectedIndex').textContent = pad(item.index); $('#selectedName').textContent = item.file.name; $('#selectedName').title = item.file.name;
  const visible = visibleItems(), index = visible.findIndex(p=>p.id === item.id);
  $('#prevPhoto').disabled = index <= 0; $('#nextPhoto').disabled = index < 0 || index >= visible.length-1;
  $('#saveImage').disabled = !item.result;
  renderResult(item);
  if (state.bitmapId !== item.id) {
    $('#imageCanvas').hidden = true; $('#imageError').hidden = false; $('#imageError').textContent = 'Membaca pratinjau…'; $('#imageDimensions').textContent = '';
    let bitmap;
    try {
      bitmap = await createImageBitmap(item.file, { imageOrientation:'none', colorSpaceConversion:'none', premultiplyAlpha:'none' });
      if (bitmap.width * bitmap.height > 40_000_000) { bitmap.close(); throw new Error('Foto melebihi 40 megapiksel.'); }
    } catch {
      if (ticket === state.drawTicket) { $('#imageError').textContent = 'Pratinjau tidak tersedia. Berkas ini tidak dapat dibaca atau terlalu besar.'; $('#saveImage').disabled = true; }
      return;
    }
    if (ticket !== state.drawTicket) { bitmap.close(); return; }
    state.bitmap?.close(); state.bitmap = bitmap; state.bitmapId = item.id;
  }
  $('#imageError').hidden = true; $('#imageCanvas').hidden = false;
  $('#imageDimensions').textContent = `${state.bitmap.width} × ${state.bitmap.height} px`;
  drawImage();
}

function renderResult(item) {
  const panel = $('#resultPanel'); panel.replaceChildren();
  if (!item.result) {
    const row = element('div','result-pending');
    row.innerHTML = item.status === 'processing' ? '<span class="busy-spinner"></span>' : icon('info');
    row.append(document.createTextNode(item.status === 'error' ? item.error : item.status === 'processing' ? 'Model sedang memproses foto ini…' : 'Foto siap. Klik Mulai prediksi untuk melihat hasilnya.'));
    panel.append(row); return;
  }
  const result = item.result;
  const label = element('div','result-label');
  const verdict = element('span',`verdict ${result.positive ? 'positive' : 'negative'}`);
  verdict.innerHTML = icon(result.positive ? 'flame' : 'check'); verdict.append(document.createTextNode(result.positive ? 'Ada indikasi kebakaran' : 'Tidak ada indikasi kebakaran'));
  label.append(verdict, element('span','inference-time',`${(result.elapsedMs/1000).toFixed(2).replace('.',',')} detik`)); panel.append(label);
  const scores = element('div','result-scores');
  for (const c of [1,0]) {
    const score = element('div','score-cell'); score.append(element('i',`legend-dot ${c ? 'fire' : 'smoke'}`),element('span','',names[c]), element('strong','',result.maxScores[c].toFixed(3).replace('.',',')));
    scores.append(score);
  }
  panel.append(scores);
  panel.append(element('p','result-note',`Skor tertinggi per kelas, bukan persentase kepastian. Ambang: 0,20. ${result.detections.length} kotak lolos → ${result.boxes.length} kotak tampilan. ${result.mergeBoxes ? 'Union ON: kotak sekelas digabung.' : 'Union OFF: kotak setelah NMS ditampilkan terpisah.'}`));
}

function drawImage() {
  const item = selectedItem(), bitmap = state.bitmap;
  if (!item || !bitmap || state.bitmapId !== item.id) return;
  const canvas = $('#imageCanvas');
  const scale = Math.min(1, 1800 / Math.max(bitmap.width, bitmap.height));
  canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext('2d'); context.drawImage(bitmap,0,0,canvas.width,canvas.height);
  if (!state.showBoxes || !item.result) return;
  const size = Math.max(14, Math.round(canvas.width / 55));
  context.lineWidth = Math.max(2, canvas.width / 400); context.font = `600 ${size}px system-ui, sans-serif`; context.textBaseline = 'top';
  for (const prediction of item.result.boxes) {
    const [x1,y1,x2,y2] = prediction.box;
    const x = x1*canvas.width, y = y1*canvas.height, width=(x2-x1)*canvas.width, height=(y2-y1)*canvas.height;
    context.strokeStyle = colors[prediction.classId]; context.strokeRect(x,y,width,height);
    const text = `${names[prediction.classId]} ${prediction.score.toFixed(3)}`;
    const labelWidth = context.measureText(text).width+12, labelHeight=size+10;
    const labelX = Math.max(0,Math.min(x,canvas.width-labelWidth));
    const labelY = y >= labelHeight ? y-labelHeight : Math.max(0,y);
    context.fillStyle=colors[prediction.classId]; context.fillRect(labelX,labelY,labelWidth,labelHeight);
    context.fillStyle='#101b20'; context.fillText(text,labelX+6,labelY+4);
  }
}

function showBoxes(value) {
  state.showBoxes = value;
  $('#showResult').classList.toggle('selected',value); $('#showOriginal').classList.toggle('selected',!value);
  $('#showResult').setAttribute('aria-pressed',String(value)); $('#showOriginal').setAttribute('aria-pressed',String(!value)); drawImage();
}
$('#showResult').addEventListener('click',()=>showBoxes(true));
$('#showOriginal').addEventListener('click',()=>showBoxes(false));

function download(blob,name) {
  const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href=url; link.download=name; link.click(); setTimeout(()=>URL.revokeObjectURL(url),3000);
}
$('#saveImage').addEventListener('click',()=>{
  const item = selectedItem(); if (!item?.result) return;
  $('#imageCanvas').toBlob(blob=>{ if (blob) { download(blob,`${pad(item.index)}-${item.file.name.replace(/\.[^.]+$/,'')}-${state.showBoxes ? 'prediksi' : 'asli'}.png`); toast('Tampilan foto disimpan.'); } },'image/png');
});
$('#exportAll').addEventListener('click',()=>{
  const output = {
    exported_at:new Date().toISOString(), model:state.config,
    coordinate_format:'normalized xyxy (0–1); pixel coordinates = x*width and y*height',
    prediction_options:{ merge_boxes:state.runOptions.mergeBoxes },
    display_boxes:state.runOptions.mergeBoxes ? 'Enclosing union per class, applied after NMS and score filtering' : 'Separate detections after NMS and score filtering; no union',
    photos:state.items.map(item=>({ index:item.index, file:item.file.name, status:item.status,
      label:item.result ? (item.result.positive ? 'Ada indikasi kebakaran' : 'Tidak ada indikasi kebakaran') : null,
      result:item.result ?? null, error:item.error ?? null }))
  };
  download(new Blob([JSON.stringify(output,null,2)],{type:'application/json'}),`d-fire-hasil-${new Date().toISOString().slice(0,10)}.json`);
  toast('Hasil prediksi disimpan sebagai JSON.');
});
render();
