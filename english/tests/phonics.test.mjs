import test from 'node:test';
import assert from 'node:assert/strict';
import { splitPhonics } from '../phonics.mjs';
import { entries } from '../vocabulary.mjs';

const parts = text => splitPhonics(text).map(part => [part.text, part.kind]);

test('common spellings remain readable groups, including consonant digraphs', () => {
  assert.deepEqual(parts('mouth'), [['m','plain'],['ou','group'],['th','group']]);
  assert.deepEqual(parts('see'), [['s','plain'],['ee','group']]);
  assert.deepEqual(parts('chair'), [['ch','group'],['air','group']]);
  assert.deepEqual(parts('rain'), [['r','plain'],['ai','group'],['n','plain']]);
});

test('single vowels and vowel y are distinguished from initial consonant y', () => {
  assert.deepEqual(parts('my'), [['m','plain'],['y','vowel']]);
  assert.deepEqual(parts('yes'), [['y','plain'],['e','vowel'],['s','plain']]);
  assert.deepEqual(parts('happy'), [['h','plain'],['a','vowel'],['pp','group'],['y','vowel']]);
});

test('final silent e does not hide pronounced e in short words or digraphs', () => {
  assert.deepEqual(parts('cake'), [['c','plain'],['a','vowel'],['k','plain'],['e','silent']]);
  assert.deepEqual(parts('have'), [['h','plain'],['a','vowel'],['v','plain'],['e','silent']]);
  assert.deepEqual(parts('she'), [['sh','group'],['e','vowel']]);
  assert.deepEqual(parts('the'), [['th','group'],['e','vowel']]);
  for (const word of ['he','me','we','see','tree']) {
    assert.ok(!splitPhonics(word).some(part => part.kind === 'silent'), word);
  }
});

test('irregular silent letters are curated for the course words', () => {
  assert.deepEqual(parts('who'), [['w','silent'],['h','plain'],['o','vowel']]);
  assert.deepEqual(parts('what'), [['w','plain'],['h','silent'],['a','vowel'],['t','plain']]);
  assert.deepEqual(parts('two'), [['t','plain'],['w','silent'],['o','vowel']]);
  assert.deepEqual(parts('Thailand'), [['T','plain'],['h','silent'],['ai','group'],['l','plain'],['a','vowel'],['n','plain'],['d','plain']]);
});

test('r spellings are not greedily taken across the wrong sound boundary', () => {
  assert.deepEqual(parts('carrot'), [['c','plain'],['a','vowel'],['rr','group'],['o','vowel'],['t','plain']]);
  assert.deepEqual(parts('very'), [['v','plain'],['e','vowel'],['r','plain'],['y','vowel']]);
  assert.deepEqual(parts('squirrel'), [['s','plain'],['qu','group'],['i','vowel'],['rr','group'],['e','vowel'],['l','plain']]);
  assert.deepEqual(parts('tired'), [['t','plain'],['ire','group'],['d','plain']]);
  assert.deepEqual(parts('different'), [['d','plain'],['i','vowel'],['ff','group'],['e','vowel'],['r','plain'],['e','vowel'],['n','plain'],['t','plain']]);
  assert.deepEqual(parts('girl'), [['g','plain'],['ir','group'],['l','plain']]);
});

test('compound boundaries retain their internal silent e', () => {
  assert.deepEqual(parts('skateboard'), [['s','plain'],['k','plain'],['a','vowel'],['t','plain'],['e','silent'],['b','plain'],['oar','group'],['d','plain']]);
  assert.deepEqual(parts('lovely'), [['l','plain'],['o','vowel'],['v','plain'],['e','silent'],['l','plain'],['y','vowel']]);
});

test('final le is a spelling group, including before plural s', () => {
  assert.deepEqual(parts('apple'), [['a','vowel'],['pp','group'],['le','group']]);
  assert.deepEqual(parts('candle'), [['c','plain'],['a','vowel'],['n','plain'],['d','plain'],['le','group']]);
  assert.deepEqual(parts('noodles'), [['n','plain'],['oo','group'],['d','plain'],['le','group'],['s','plain']]);
});

test('course-specific omitted vowels and alternative spellings are explicit', () => {
  assert.deepEqual(parts('vegetable'), [['v','plain'],['e','vowel'],['g','plain'],['e','silent'],['t','plain'],['a','vowel'],['b','plain'],['le','group']]);
  assert.deepEqual(parts('evening'), [['e','vowel'],['v','plain'],['e','silent'],['n','plain'],['i','vowel'],['ng','group']]);
  assert.deepEqual(parts('eye'), [['eye','group']]);
  assert.deepEqual(parts('share'), [['sh','group'],['are','group']]);
  assert.deepEqual(parts('picture'), [['p','plain'],['i','vowel'],['c','plain'],['ture','group']]);
});

test('letter names retain their capitals and individual letters', () => {
  assert.deepEqual(parts('OK'), [['O','vowel'],['K','plain']]);
  assert.deepEqual(parts('UK'), [['U','vowel'],['K','plain']]);
});

test('every course entry keeps its exact original spelling and punctuation', () => {
  const kinds = new Set(['plain','vowel','group','silent']);
  for (const { word } of entries) {
    const result = splitPhonics(word);
    assert.equal(result.map(part => part.text).join(''), word, word);
    assert.ok(result.every(part => part.text.length > 0 && kinds.has(part.kind)), word);
    assert.ok(result.filter(part => /[^a-z]/i.test(part.text)).every(part => part.kind === 'plain'), word);
  }
  const text = '  ChAiR, WHO?\tLet’s see—A / an!\n你好 👋';
  assert.equal(splitPhonics(text).map(part => part.text).join(''), text);
  assert.deepEqual(splitPhonics(''), []);
});
