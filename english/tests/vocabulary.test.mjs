import test from 'node:test';
import assert from 'node:assert/strict';
import {entries,units} from '../vocabulary.mjs';

test('the three photographed pages keep their unit boundaries and all entries', () => {
  const counts = Object.fromEntries(units.map(unit => [unit.id, entries.filter(e=>e.unit===unit.id).length]));
  assert.deepEqual(counts,{0:3,1:21,2:20,3:23,4:19,5:22,6:20,7:19,8:18});
  assert.equal(entries.find(e=>e.word==='sit').unit,3);
  assert.equal(entries.find(e=>e.word==='tail').unit,6);
  assert.equal(entries.find(e=>e.word==='go to the park').unit,7);
});

test('every entry is usable for both on-screen phonetics and spoken paper practice', () => {
  assert.equal(new Set(entries.map(e=>e.id)).size,entries.length);
  const validUnits = new Set(units.map(u=>u.id));
  for (const e of entries) {
    assert.ok(validUnits.has(e.unit),e.id);
    for (const key of ['word','ipa','meaning','speak']) assert.ok(e[key].trim(),`${e.id}: ${key}`);
    assert.ok(['word','phrase','sentence'].includes(e.type),e.id);
    assert.ok(!/[（(]/.test(e.speak),`${e.word}: spoken text should omit textbook notes`);
  }
  assert.equal(entries.find(e=>e.word==='child').speak,'child');
  assert.equal(entries.find(e=>e.word==='a / an').speak,'a, an');
});
