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

test('an explicitly chosen accent never silently uses the other accent', () => {
  const us={name:'Samantha',lang:'en-US',voiceURI:'us-1'};
  const gb={name:'Daniel',lang:'en-GB',voiceURI:'gb-1'};
  assert.equal(core.chooseVoice([gb,us],'en-US'),us);
  assert.equal(core.chooseVoice([gb],'en-US'),null);
  assert.equal(core.chooseVoice([us],'en-GB'),null);
  assert.deepEqual(core.voicesForAccent([gb,us,{name:'中文',lang:'zh-CN'}],'en-US'),[us]);
});

test('voice roles are selected by their stable ID within the requested accent', () => {
  const samantha={name:'Samantha',lang:'en-US',voiceURI:'us-1'};
  const alex={name:'Alex',lang:'en_US',voiceURI:'us-2'};
  const daniel={name:'Daniel',lang:'en-GB',voiceURI:'gb-1'};
  assert.equal(core.chooseVoice([samantha,alex,daniel],'en-US','us-2'),alex);
  assert.equal(core.chooseVoice([samantha,alex,daniel],'en-US','gb-1'),samantha);
  assert.equal(core.chooseVoice([samantha,alex],'en-US','removed-voice'),samantha);
});

test('saved voice preferences reject malformed data and unsupported accents', () => {
  assert.deepEqual(core.parseVoiceSettings('{bad'),{accent:'en-GB',voiceId:''});
  assert.deepEqual(core.parseVoiceSettings('null'),{accent:'en-GB',voiceId:''});
  assert.deepEqual(core.parseVoiceSettings('{"accent":"zh-CN","voiceId":"wrong"}'),{accent:'en-GB',voiceId:''});
  assert.deepEqual(core.parseVoiceSettings('{"accent":"en-US","voiceId":"us-2"}'),{accent:'en-US',voiceId:'us-2'});
  assert.deepEqual(core.parseVoiceSettings('{"accent":"en-US","voiceId":2}'),{accent:'en-US',voiceId:''});
});


test('familiar voices lead the accent list and automatic playback without replacing a saved role', () => {
  const voices = [
    {name:'Zarvox',lang:'en-US',voiceURI:'robot'},
    {name:'Samantha',lang:'en-US',voiceURI:'samantha'},
    {name:'Google US English',lang:'en-US',voiceURI:'google'},
    {name:'Eddy (英语（美国）)',lang:'en_US',voiceURI:'eddy'},
    {name:'Aaron (Enhanced)',lang:'en-US',voiceURI:'aaron'},
    {name:'Bells',lang:'en-US',voiceURI:'bells'},
    {name:'Daniel',lang:'en-GB',voiceURI:'daniel'},
    {name:'Microsoft Hazel Desktop - English (Great Britain)',lang:'en-GB',voiceURI:'hazel'},
    {name:'Grandpa',lang:'en-GB',voiceURI:'grandpa'},
  ];
  const original = [...voices];
  assert.deepEqual(core.voicesForAccent(voices,'en-US').map(v=>v.voiceURI),
    ['aaron','eddy','google','samantha','robot','bells']);
  assert.deepEqual(core.voicesForAccent([voices[8],voices[7],voices[6]],'en-GB').map(v=>v.voiceURI),
    ['daniel','hazel','grandpa']);
  assert.equal(core.chooseVoice(voices,'en-US').voiceURI,'aaron');
  assert.equal(core.chooseVoice(voices,'en-US','robot').voiceURI,'robot');
  assert.equal(core.chooseVoice(voices).voiceURI,'daniel');
  assert.deepEqual(voices, original);
});


test('question navigation keeps answers and grades attached to the right item', () => {
  let round = core.startRound(['a','b','c']);
  assert.equal(core.moveQuestion(round,-1),round);
  round = core.moveQuestion(core.revealAnswer(round),1);
  assert.equal(round.index,1);
  assert.equal(round.revealed,false);
  round = core.markAnswer(core.revealAnswer(round),true);
  assert.equal(round.index,2);
  assert.deepEqual(round.results,[{id:'b',correct:true}]);
  round = core.markAnswer(core.revealAnswer(round),false);
  assert.equal(round.index,0,'skipped questions must be graded before completing the group');
  round = core.moveQuestion(round,1);
  assert.equal(round.revealed,true,'a graded answer remains visible when revisiting');
  round = core.markAnswer(round,false);
  assert.deepEqual(round.results,[{id:'b',correct:false},{id:'c',correct:false}]);
  assert.equal(round.index,0);
  round = core.markAnswer(core.revealAnswer(round),true);
  assert.equal(round.index,3);
  assert.deepEqual(round.results,[{id:'a',correct:true},{id:'b',correct:false},{id:'c',correct:false}]);
  assert.equal(core.moveQuestion(round,-1).index,2);
  assert.equal(core.moveQuestion(round,1),round);
});
