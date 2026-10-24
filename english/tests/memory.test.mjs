import test from 'node:test';
import assert from 'node:assert/strict';
import { entries } from '../vocabulary.mjs';
import { memoryGroups } from '../memory.mjs';

test('memory groups have unique IDs, valid content and complete vocabulary coverage', () => {
  const vocabulary = new Set(entries.map(entry => entry.word));
  const ids = new Set();
  const covered = new Set();
  for (const group of memoryGroups) {
    assert.match(group.id, /^[a-z][a-z0-9-]*$/);
    assert.ok(!ids.has(group.id), `Duplicate group ID: ${group.id}`);
    ids.add(group.id);
    assert.ok(['sound', 'relation', 'scene'].includes(group.kind), group.id);
    for (const field of ['title', 'tip', 'recall']) assert.ok(group[field]?.trim(), `${group.id}: missing ${field}`);
    assert.ok(group.words.length >= 2 && group.words.length <= 8, `${group.id}: expected 2–8 words`);
    assert.equal(new Set(group.words).size, group.words.length, `${group.id}: repeated word`);
    for (const word of group.words) {
      assert.ok(vocabulary.has(word), `${group.id}: unknown word ${word}`);
      covered.add(word);
    }
  }
  assert.deepEqual([...vocabulary].filter(word => !covered.has(word)), [], 'Uncovered textbook entries');
  assert.equal(covered.size, 165);
});
