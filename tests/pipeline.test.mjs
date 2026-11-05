import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { decode, mergeForDisplay } from '../dist/postprocess.js';
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
