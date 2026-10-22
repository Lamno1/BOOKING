import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateAvailability} from '../src/shared/catalog-contract.js';
const catalog=JSON.parse(readFileSync(new URL('../src/shared/data/inventory.json',import.meta.url)));
const dates={arrival:'2026-11-14',departure:'2026-11-16'};
const valid=()=>({...structuredClone(catalog),catalogVersion:catalog.version,...dates,rooms:catalog.rooms.map(r=>({...r,available:true,availabilityReason:'AVAILABLE'}))});
test('two properties contain 8 and 7 physical rooms, all uniquely identified',()=>{
  assert.equal(catalog.properties.length,2);
  assert.deepEqual(catalog.properties.map(p=>catalog.rooms.filter(r=>r.propertyId===p.id).length),[8,7]);
  assert.equal(new Set(catalog.rooms.map(r=>r.id)).size,15);
  assert.equal(new Set(catalog.rooms.map(r=>r.number)).size,15);
});
test('accept complete consistent API records, never merge partial records',()=>{
  const payload=valid();assert.equal(validateAvailability(payload,catalog,dates),payload);
  for(const edit of [
    p=>delete p.catalogVersion,p=>p.catalogVersion='old',p=>p.arrival='2026-11-13',
    p=>p.rooms[0].name='Ocean View Apartment',p=>p.rooms[0].price=2490000,
    p=>delete p.rooms[0].area,p=>p.rooms[0].propertyId='inn',
    p=>p.rooms[0].features=['Wrong'],p=>p.rooms.pop(),p=>p.rooms[1]=p.rooms[0],
    p=>p.services[0].price=1,p=>delete p.properties[0].policy,p=>p.rooms[0].available='yes',
  ]){const payload=valid();edit(payload);assert.throws(()=>validateAvailability(payload,catalog,dates),/chưa đồng bộ/);}
});
