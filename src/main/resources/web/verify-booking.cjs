// Read-only API smoke check. Browser interaction is verified in the in-app browser.
const assert = require('node:assert/strict');
const origin = process.env.STAYOS_API_URL || 'http://127.0.0.1:8080/api';
const day = offset => { const date = new Date(); date.setDate(date.getDate() + offset); return date.toISOString().slice(0,10); };
(async () => {
  const health = await fetch(`${origin}/health`);
  assert.equal(health.status, 200);
  assert.equal((await health.json()).booking, true);
  const availability = await fetch(`${origin}/availability?arrival=${day(2)}&departure=${day(4)}`);
  assert.equal(availability.status, 200);
  const catalog = await availability.json();
  const fs=require('node:fs');
  const local=JSON.parse(fs.readFileSync(require('node:path').join(__dirname,'src/shared/data/inventory.json'),'utf8'));
  const {validateAvailability}=await import('./src/shared/catalog-contract.js');
  validateAvailability(catalog,local,{arrival:day(2),departure:day(4)});
  assert.equal(catalog.properties.length,2);
  assert.equal(catalog.rooms.length, 15);
  assert.equal(new Set(catalog.rooms.map(r => r.id)).size, 15);
  assert.ok(catalog.rooms.every(r => typeof r.available === 'boolean' && r.price > 0));
  assert.equal((await fetch(`${origin}/state`)).status, 401);
  assert.equal((await fetch(`${origin}/admin/state`)).status, 401);
  console.log('PASS: backend health; all catalog fields match for 15 rooms, 2 properties and 4 services; availability and anonymous access checks.');
  console.log('Run mvn test from 02_IMPLEMENTATION for isolated booking/auth mutation tests.');
})().catch(error => { console.error(error); process.exitCode = 1; });
