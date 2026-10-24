import assert from 'node:assert/strict';
import {readFileSync, mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {textbookUnits, textbookClips} from '../textbook-audio.mjs';

const root = new URL('../', import.meta.url);
const pathFor = src => fileURLToPath(new URL(src, root));
function run(args) {
  const result = spawnSync('ffmpeg', ['-hide_banner', '-v', 'error', '-nostdin', ...args], {encoding:'utf8'});
  assert.equal(result.status, 0, result.stderr || result.error?.message);
  assert.equal(result.stderr.trim(), '', result.stderr);
}
for (const [unit, source] of Object.entries(textbookUnits)) {
  assert.equal(source.src, `./audio/textbook/units/unit-${unit.padStart(2,'0')}.mp3`);
  assert.equal(createHash('sha256').update(readFileSync(pathFor(source.src))).digest('hex'), source.sha256, `Original changed: Unit ${unit}`);
}
mkdirSync(new URL('../audio/textbook/words/', import.meta.url), {recursive:true});
for (const [id, clip] of Object.entries(textbookClips)) {
  assert.match(id, /^u[1-8]-[1-9][0-9]*$/);
  assert.equal(clip.src, `./audio/textbook/words/${id}.mp3`);
  assert.equal(Number(id.match(/^u([1-8])-/)[1]), clip.unit);
  assert.equal(clip.readings, 2);
  assert.ok(Number.isFinite(clip.start) && Number.isFinite(clip.end) && clip.start >= 0 && clip.end > clip.start && clip.end <= textbookUnits[clip.unit].duration, id);
  const input = pathFor(textbookUnits[clip.unit].src), output = pathFor(clip.src);
  const timing = ['-ss', String(clip.start), '-t', String(clip.end - clip.start)];
  // Two touching can/fun clips need sample-accurate cuts; other clips keep the original MP3 frames.
  run(clip.precise ? ['-y','-i',input,...timing,'-map','0:a:0','-c:a','libmp3lame','-q:a','2','-map_metadata','-1',output] : ['-y',...timing,'-i',input,'-map','0:a:0','-c:a','copy','-map_metadata','-1',output]);
  run(['-i',output,'-f','null','-']);
}
console.log(`Prepared and decoded ${Object.keys(textbookClips).length} double-reading clips; all 8 originals match their hashes.`);
