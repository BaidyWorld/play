import test from 'node:test';
import assert from 'node:assert/strict';
import * as core from '../core.mjs';

// Guards the five-item boundary and stops the last group spilling into another group.
test('rounds contain only the current group, including a short final group', () => {
  assert.deepEqual(core.startRound(['a','b','c','d','e','f'], 5).ids, ['f']);
  assert.deepEqual(core.startRound([], 0).ids, []);
  assert.deepEqual(core.startRound(['a'], 10).ids, []);
});

test('unrevealed answers cannot be graded or recorded twice', () => {
  const round = core.startRound(['a','b']);
  assert.throws(() => core.markAnswer(round, true));
  const next = core.markAnswer(core.revealAnswer(round), false);
  assert.deepEqual(next.results, [{id:'a', correct:false}]);
  assert.equal(next.index, 1);
  assert.equal(next.revealed, false);
  assert.throws(() => core.markAnswer(next, true));
  const done = core.markAnswer(core.revealAnswer(next), true);
  assert.equal(done.index, 2);
  assert.throws(() => core.markAnswer(core.revealAnswer(done), true));
});

test('stored progress recovers from invalid JSON and ignores unknown IDs', () => {
  const ids = new Set(['a','b']);
  assert.deepEqual(core.parseProgress('{broken', ids).again, []);
  assert.deepEqual(core.parseProgress('null', ids).again, []);
  const raw = JSON.stringify({again:['a','a','missing',2], counts:{a:2,b:-1,missing:4},last:[{id:'a',correct:false},{id:'missing',correct:true},{id:'b',correct:'yes'}]});
  const result = core.parseProgress(raw, ids);
  assert.deepEqual(result.again, ['a']);
  assert.deepEqual(result.counts, {a:2});
  assert.deepEqual(result.last, [{id:'a',correct:false}]);
  assert.deepEqual(core.parseProgress('{"again":{},"counts":[],"last":2}',ids).again, []);
});

test('manual review flags survive a correct answer; wrong answers join review', () => {
  const before = {again:['a'],counts:{a:1},last:[]};
  const after = core.applyResults(before,[{id:'a',correct:true},{id:'b',correct:false}]);
  assert.deepEqual(after.again,['a','b']);
  assert.deepEqual(after.counts,{a:2,b:1});
  assert.deepEqual(before,{again:['a'],counts:{a:1},last:[]});
});

test('voice selection prefers British English, then other English, never Chinese', () => {
  const us = {name:'Samantha',lang:'en-US'}, gb={name:'Daniel',lang:'en-GB'}, zh={name:'Tingting',lang:'zh-CN'};
  assert.equal(core.chooseVoice([zh,us,gb]),gb);
  assert.equal(core.chooseVoice([zh,us]),us);
  assert.equal(core.chooseVoice([zh]),null);
  assert.equal(core.chooseVoice([]),null);
  assert.equal(core.chooseVoice([{name:'British',lang:'en_GB'}]).name,'British');
});
