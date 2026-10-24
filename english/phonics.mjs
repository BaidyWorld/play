// Spelling cues, not syllables or a promise that every group has one pronunciation.
const groups = [
  'igh','air','ear','eer','oar','our','ure',
  'ee','ea','oo','ai','ay','oa','ow','ou','oi','oy','au','aw','ew','ie','ue','ui','ey',
  'ar','er','ir','or','ur','sh','ch','th','ph','wh','ck','ng','nk','qu',
  'bb','dd','ff','gg','ll','mm','nn','pp','rr','ss','tt','zz'
];

// These boundaries follow the course's UK IPA, including silent letters inside compounds.
const exceptions = {
  who: [['w','silent'],['h','plain'],['o','vowel']],
  what: [['w','plain'],['h','silent'],['a','vowel'],['t','plain']],
  two: [['t','plain'],['w','silent'],['o','vowel']],
  oh: [['o','vowel'],['h','silent']],
  thailand: [['t','plain'],['h','silent'],['ai','group'],['l','plain'],['a','vowel'],['n','plain'],['d','plain']],
  carrot: [['c','plain'],['a','vowel'],['rr','group'],['o','vowel'],['t','plain']],
  very: [['v','plain'],['e','vowel'],['r','plain'],['y','vowel']],
  squirrel: [['s','plain'],['qu','group'],['i','vowel'],['rr','group'],['e','vowel'],['l','plain']],
  different: [['d','plain'],['i','vowel'],['ff','group'],['e','vowel'],['r','plain'],['e','vowel'],['n','plain'],['t','plain']],
  tired: [['t','plain'],['ire','group'],['d','plain']],
  eye: [['eye','group']],
  are: [['are','group']],
  share: [['sh','group'],['are','group']],
  picture: [['p','plain'],['i','vowel'],['c','plain'],['ture','group']],
  skateboard: [['s','plain'],['k','plain'],['a','vowel'],['t','plain'],['e','silent'],['b','plain'],['oar','group'],['d','plain']],
  lovely: [['l','plain'],['o','vowel'],['v','plain'],['e','silent'],['l','plain'],['y','vowel']],
  vegetable: [['v','plain'],['e','vowel'],['g','plain'],['e','silent'],['t','plain'],['a','vowel'],['b','plain'],['le','group']],
  evening: [['e','vowel'],['v','plain'],['e','silent'],['n','plain'],['i','vowel'],['ng','group']]
};

export function splitPhonics(text) {
  const result = [];
  for (const token of text.match(/[a-z]+|[^a-z]+/gi) || []) {
    if (!/^[a-z]/i.test(token)) {
      result.push({ text: token, kind: 'plain' });
      continue;
    }
    const word = token.toLowerCase();
    let index = 0;
    const add = (length, kind) => {
      result.push({ text: token.slice(index, index + length), kind });
      index += length;
    };
    if (Object.hasOwn(exceptions, word)) {
      for (const [spelling, kind] of exceptions[word]) add(spelling.length, kind);
      continue;
    }
    // shortcut: rules cover this course, curate exceptions before adding new vocabulary.
    while (index < word.length) {
      const rest = word.slice(index);
      if (/^le(s)?$/.test(rest) && index > 0 && !/[aeiouy]/.test(word[index - 1])) {
        add(2, 'group');
        continue;
      }
      const group = groups.find(spelling => rest.startsWith(spelling));
      if (group) {
        add(group.length, 'group');
        continue;
      }
      const letter = word[index];
      const silentE = letter === 'e' && index === word.length - 1 &&
        word.length > 2 && !['she','the'].includes(word) && !/[aeiouy]/.test(word[index - 1]);
      add(1, silentE ? 'silent' : /[aeiou]/.test(letter) || letter === 'y' && index > 0 ? 'vowel' : 'plain');
    }
  }
  return result;
}
