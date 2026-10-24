export function startRound(items, offset = 0) {
  return {ids: items.slice(offset, offset + 5), index: 0, revealed: false, results: []};
}

export function revealAnswer(round) {
  return {...round, revealed: round.index < round.ids.length};
}

export function markAnswer(round, correct) {
  if (!round.revealed || round.index >= round.ids.length || typeof correct !== 'boolean') {
    throw new Error('请先展开答案，再核对纸上的拼写。');
  }
  return {...round, index: round.index + 1, revealed: false,
    results: [...round.results, {id: round.ids[round.index], correct}]};
}

export function parseProgress(raw, validIds) {
  const empty = {again: [], counts: {}, last: []};
  let data;
  try { data = JSON.parse(raw); } catch { return empty; }
  if (!data || typeof data !== 'object' || Array.isArray(data)) return empty;
  const again = Array.isArray(data.again) ? [...new Set(data.again.filter(id => validIds.has(id)))] : [];
  const counts = {};
  if (data.counts && typeof data.counts === 'object' && !Array.isArray(data.counts)) {
    for (const [id, count] of Object.entries(data.counts)) {
      if (validIds.has(id) && Number.isSafeInteger(count) && count >= 0) counts[id] = count;
    }
  }
  const last = Array.isArray(data.last) ? data.last.filter(item => item && validIds.has(item.id) && typeof item.correct === 'boolean').slice(-5).map(({id,correct}) => ({id,correct})) : [];
  return {again, counts, last};
}

export function applyResults(progress, results) {
  const again = new Set(progress.again);
  const counts = {...progress.counts};
  for (const {id, correct} of results) {
    if (!correct) again.add(id);
    counts[id] = Math.min((counts[id] || 0) + 1, Number.MAX_SAFE_INTEGER);
  }
  return {again: [...again], counts, last: results.slice(-5)};
}

export function voicesForAccent(voices, accent) {
  const language = accent.toLowerCase().replaceAll('_', '-');
  return voices.filter(voice => {
    const candidate = voice.lang.toLowerCase().replaceAll('_', '-');
    return candidate === language || candidate.startsWith(language + '-');
  });
}

export function chooseVoice(voices, accent, voiceId = '') {
  const candidates = accent ? voicesForAccent(voices, accent) : voices.filter(v => /^en(?:[-_]|$)/i.test(v.lang));
  if (voiceId) {
    const selected = candidates.find(v => (v.voiceURI || v.name) === voiceId);
    if (selected) return selected;
  }
  return (!accent && candidates.find(v => /^en[-_]GB$/i.test(v.lang))) || candidates[0] || null;
}

export function parseVoiceSettings(raw) {
  const fallback = {accent:'en-GB', voiceId:''};
  let data;
  try { data = JSON.parse(raw); } catch { return fallback; }
  if (!data || !['en-GB','en-US'].includes(data.accent)) return fallback;
  return {accent:data.accent, voiceId:typeof data.voiceId === 'string' && data.voiceId.length <= 512 ? data.voiceId : ''};
}
