import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { applyOptions, decode, mergeForDisplay } from '../dist/postprocess.js';
import { resizeRGB } from '../dist/preprocess.js';

const base = new URL('../', import.meta.url);
const json = async path => JSON.parse(await readFile(new URL(path,base),'utf8'));
const floats = async path => { const b=await readFile(new URL(path,base)); return new Float32Array(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength)); };
const manifest = await json('dist/model/manifest.json');
const anchors = await floats('dist/model/anchors.bin');

test('Kotak tampilan membungkus semua kotak sekelas dan tidak menggabungkan api dengan asap',()=>{
  const boxes=mergeForDisplay([{classId:0,score:.8,box:[.1,.1,.3,.4]},{classId:0,score:.7,box:[.7,.6,.9,.8]},{classId:1,score:.9,box:[.2,.2,.4,.4]}]);
  assert.equal(boxes.length,2); assert.deepEqual(boxes[0].box,[.1,.1,.9,.8]); assert.equal(boxes[0].count,2); assert.equal(boxes[1].count,1);
  assert.deepEqual(mergeForDisplay([]),[]);
});

let fixturePresent=true;
test('Union OFF tetap memakai NMS dan tidak mengubah skor atau keputusan biner',()=>{
  const testAnchors=new Float32Array([.2,.2,.2,.2, .21,.2,.2,.2, .8,.8,.2,.2]);
  const raw=new Float32Array([0,0,0,0,2,-10, 0,0,0,0,1,-10, 0,0,0,0,0,-10]);
  const on=decode(raw,testAnchors,manifest);
  const off=decode(raw,testAnchors,manifest,false);
  assert.equal(on.detections.length,2,'NMS membuang kandidat yang bertumpuk, mempertahankan objek terpisah');
  assert.deepEqual(off.detections,on.detections);
  assert.deepEqual(off.maxScores,on.maxScores);
  assert.equal(off.positive,on.positive);
  assert.equal(on.boxes.length,1);
  assert.equal(off.boxes.length,2);
  assert.deepEqual(off.boxes,off.detections);
  assert.equal(on.mergeBoxes,true); assert.equal(off.mergeBoxes,false);
  for (const i of [4,10,16]) raw[i]=-10;
  for (const merge of [true,false]) {
    const negative=decode(raw,testAnchors,manifest,merge);
    assert.equal(negative.positive,false); assert.deepEqual(negative.boxes,[]);
  }
});

test('applyOptions menyaring ulang kandidat pasca-NMS secara langsung saat ambang atau union diubah',()=>{
  const testAnchors=new Float32Array([.2,.2,.2,.2, .7,.7,.2,.2]);
  // logit -1.29 -> sigmoid ~0.2158 (seperti kasus foto kucing), logit -0.11 -> sigmoid ~0.4725 (kebakaran)
  const raw=new Float32Array([0,0,0,0,-1.29,-10, 0,0,0,0,-0.11,-10]);
  const initial=decode(raw,testAnchors,manifest,true,0.20);
  assert.equal(initial.positive,true);
  assert.equal(initial.detections.length,2);
  assert.equal(initial.boxes.length,1);

  const stricter=applyOptions(initial.nmsCandidates,initial.maxScores,{threshold:0.35,mergeBoxes:false});
  assert.equal(stricter.positive,true);
  assert.equal(stricter.detections.length,1,'Kandidat 0,216 tersaring pada ambang 0,35 sedangkan 0,473 tetap lolos');
  assert.equal(stricter.boxes.length,1);

  const catOnly=applyOptions([initial.nmsCandidates[1]],[0.216,0.093],{threshold:0.35,mergeBoxes:true});
  assert.equal(catOnly.positive,false,'Kasus skor 0,216 menjadi negatif pada ambang 0,35 tanpa hitung ulang ONNX');
  assert.deepEqual(catOnly.boxes,[]);
});

try { await access(new URL('.qa/fixtures.json',base)); } catch { fixturePresent=false; }
test('Paritas preprocessing dan postprocessing terhadap fixture TensorFlow/Pillow', {skip:!fixturePresent}, async t=>{
  const fixtures = await json('.qa/fixtures.json');
  for (const fixture of fixtures) {
    await t.test(fixture.file,async()=>{
      const raw=await floats(`.qa/expected-${fixture.index}.bin`);
      const result=decode(raw,anchors,manifest);
      assert.equal(result.detections.length,fixture.expected_boxes.length);
      assert.equal(result.positive,fixture.expected_boxes.length>0);
      for(let i=0;i<result.detections.length;i++){
        const actual=result.detections[i],expected=fixture.expected_boxes[i];
        assert.equal(actual.classId,expected.kelas);
        assert.ok(Math.abs(actual.score-expected.skor)<1e-6);
        actual.box.forEach((value,c)=>assert.ok(Math.abs(value-expected.kotak[c])<1e-6));
      }
      if(fixture.index<3){
        const pixels=new Uint8Array(await readFile(new URL(`.qa/rgb-${fixture.index}.bin`,base)));
        const actual=resizeRGB(pixels,fixture.width,fixture.height,192,128,3);
        const expected=await floats(`.qa/input-${fixture.index}.bin`);
        assert.deepEqual(actual,expected,'Resize harus sama persis dengan Pillow pada RGB yang sama');
      }
    });
  }
});
