import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync,readdirSync} from 'node:fs';
import {resolve} from 'node:path';
const root=resolve(import.meta.dirname,'..');
test('booking build contains no architecture entry, meshes, HDR or Three.js',()=>{
  assert.ok(existsSync(resolve(root,'dist/index.html')),'Run npm run build before boundary test');
  const walk=dir=>readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(resolve(dir,e.name)):[resolve(dir,e.name)]);
  const files=walk(resolve(root,'dist'));
  assert.ok(!files.some(f=>/tidal|architecture|\.(glb|gltf|exr|hdr)$/i.test(f)));
  assert.ok(!readFileSync(resolve(root,'package.json'),'utf8').includes('"three"'));
  assert.ok(!readFileSync(resolve(root,'src/app/booking.jsx'),'utf8').includes("api('admin/"));
  assert.ok(!readFileSync(resolve(root,'src/app/booking.jsx'),'utf8').includes('IntroJourney'));
});
test('room photos are bundled (import.meta.glob paths survive file moves)',()=>{
  const assets=readdirSync(resolve(root,'dist/assets'));
  assert.ok(assets.filter(f=>/^(studio|quad)-\d-(large|small)-.*\.webp$/.test(f)).length>=16,'room concept photos missing from the build');
});
