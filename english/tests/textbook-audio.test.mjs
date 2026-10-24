import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {entries} from '../vocabulary.mjs';
import {textbookClips, textbookUnits} from '../textbook-audio.mjs';

test('original clips cover the recorded course in order with both readings and valid local assets', () => {
  assert.equal(Object.keys(textbookUnits).length,8);
  assert.deepEqual(Object.keys(textbookClips),entries.filter(entry=>entry.unit>0).map(entry=>entry.id));
  for (const unit of Object.values(textbookUnits)) {
    const bytes=readFileSync(new URL(unit.src,new URL('../',import.meta.url)));
    assert.equal(createHash('sha256').update(bytes).digest('hex'),unit.sha256);
  }
  for (const unit of Object.keys(textbookUnits)) {
    let previousEnd=0;
    for (const entry of entries.filter(entry=>entry.unit===Number(unit))) {
      const clip=textbookClips[entry.id];
      assert.equal(clip.unit,entry.unit);
      assert.equal(clip.readings,2);
      assert.ok(clip.start>=previousEnd&&clip.end>clip.start&&clip.end<=textbookUnits[unit].duration,entry.id);
      assert.equal(clip.src,`./audio/textbook/words/${entry.id}.mp3`);
      assert.ok(readFileSync(new URL(clip.src,new URL('../',import.meta.url))).length>1000,entry.id);
      previousEnd=clip.end;
    }
  }
  for (const entry of entries.filter(entry=>entry.unit===0)) assert.equal(textbookClips[entry.id],undefined);
  assert.equal(textbookClips['u4-11'].precise,true);
  assert.equal(textbookClips['u4-12'].precise,true);
});
