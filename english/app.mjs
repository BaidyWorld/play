import {entries, units} from './vocabulary.mjs';
import {startRound, revealAnswer, markAnswer, parseProgress, applyResults, chooseVoice} from './core.mjs';

const icons = {
  sound:'<path d="m11 5-6 4H2v6h3l6 4V5Z"/><path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
  book:'<path d="M4 3h15v18H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"/><path d="M7 3v18m4-12h4m-4 4h4"/>',
  pencil:'<path d="m16 3 5 5-12 12-6 1 1-6L16 3Z"/><path d="m13 6 5 5M4 15l5 5"/>',
  star:'<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z"/>',
  eye:'<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  hide:'<path d="m3 3 18 18M10.6 5.1 12 5c6 0 10 7 10 7a21 21 0 0 1-3.6 4.1M6 6.1A23 23 0 0 0 2 12s4 7 10 7a12 12 0 0 0 5-1.2M10 10a3 3 0 0 0 4 4"/>',
  arrow:'<path d="M4 12h16m-6-6 6 6-6 6"/>',
  back:'<path d="M20 12H4m6-6-6 6 6 6"/>',
  check:'<path d="m5 12 4 4L19 6"/>',
  repeat:'<path d="M20 7v5h-5M4 17v-5h5"/><path d="M6.1 6a8 8 0 0 1 13 2M4.9 16a8 8 0 0 0 13 2"/>',
  info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v.1"/>',
  chevron:'<path d="m9 5 7 7-7 7"/>',
};
const icon = (name, size=18, filled=false) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${filled?'currentColor':'none'}" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]}</svg>`;
const esc = value => String(value).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const byId = new Map(entries.map(e=>[e.id,e]));
const validIds = new Set(byId.keys());
const storageKey = 'english-notebook-progress-v1';
const root = document.querySelector('#app');
let progress = {again:[],counts:{},last:[]};
let unitId = 1, filter = 'all', concealed = false, mode = 'study';
let round = null, sourceIds = [], groupOffset = 0;
let synth = 'speechSynthesis' in window ? window.speechSynthesis : null;
let currentSpeech = null, speechSerial = 0;
let voices = [];
try { progress = parseProgress(localStorage.getItem(storageKey), validIds); }
catch { storageWarning(); }

function storageWarning() {
  const element = document.querySelector('#storage-note');
  element.textContent = '当前浏览器无法保存进度，本次仍可正常练习。请勿关闭页面，或换用普通浏览窗口。';
  element.hidden = false;
}
function persist() {
  try { localStorage.setItem(storageKey, JSON.stringify(progress)); }
  catch { storageWarning(); }
}
function announce(text) { document.querySelector('#announcement').textContent = text; }
function speechNotice(text) {
  const element = document.querySelector('#speech-note');
  element.textContent = text;
  element.hidden = !text;
}
function voiceLabel() {
  if (!synth) return '此浏览器不支持朗读';
  const voice = chooseVoice(voices);
  if (!voice) return '点击试听';
  if (/^en[-_]GB$/i.test(voice.lang)) return '英式发音';
  if (/^en[-_]US$/i.test(voice.lang)) return '美式发音';
  return `英语（${voice.lang}）`;
}
function updateVoiceStatus() {
  if (synth) {
    try { voices = synth.getVoices(); } catch { voices = []; }
  }
  document.querySelectorAll('[data-voice-status]').forEach(e=>e.textContent=voiceLabel());
}
function stopSpeech() {
  speechSerial += 1;
  if (synth) { try { synth.cancel(); } catch { /* Some embedded browsers expose an inactive speech service. */ } }
  currentSpeech = null;
  document.querySelectorAll('.is-speaking').forEach(e=>e.classList.remove('is-speaking'));
}
function speak(id, button) {
  stopSpeech();
  speechNotice('');
  if (!synth || !('SpeechSynthesisUtterance' in window)) {
    speechNotice('当前浏览器不支持朗读。请用 Safari、Chrome 或 Edge 打开；仍可展开答案进行读写练习。');
    return;
  }
  updateVoiceStatus();
  const voice = chooseVoice(voices);
  if (!voice) {
    speechNotice('尚未找到英语语音，请稍后重试。若仍无法播放，请在设备的语音设置中添加英语语音，或换用 Safari、Chrome、Edge。');
    return;
  }
  const entry = byId.get(id);
  if (!entry) return;
  const token = speechSerial;
  const utterance = new SpeechSynthesisUtterance(entry.speak);
  utterance.voice = voice;
  utterance.lang = voice.lang;
  utterance.rate = .82;
  currentSpeech = utterance;
  button.classList.add('is-speaking');
  utterance.onend = () => {
    if (token !== speechSerial) return;
    button.classList.remove('is-speaking');
    currentSpeech = null;
  };
  utterance.onerror = event => {
    if (token !== speechSerial || ['canceled','interrupted'].includes(event.error)) return;
    button.classList.remove('is-speaking');
    currentSpeech = null;
    speechNotice('这次没有播放成功。请检查设备音量后再点一次；也可以换用浏览器打开。');
  };
  try { synth.speak(utterance); }
  catch {
    button.classList.remove('is-speaking');
    currentSpeech = null;
    speechNotice('这次没有播放成功，请检查设备音量，或换用浏览器再试。');
  }
}
if (synth) synth.addEventListener('voiceschanged',updateVoiceStatus);
window.addEventListener('pagehide',stopSpeech);

const notebookArt = `<svg class="hero-art" viewBox="0 0 250 185" fill="none" aria-hidden="true">
  <ellipse cx="136" cy="164" rx="92" ry="10" fill="#ccd9bd" opacity=".55"/>
  <circle cx="141" cy="85" r="76" fill="#e0e9d4"/>
  <g transform="rotate(9 133 90)"><rect x="70" y="19" width="127" height="143" rx="9" fill="#73906b"/>
  <rect x="66" y="14" width="127" height="143" rx="9" fill="#fffdf5" stroke="#c5d2b7"/>
  <path d="M88 14v143" stroke="#efc4b0"/>
  <path d="M99 72h76M99 91h76M99 110h76M99 129h76" stroke="#dce6d0"/>
  <path d="M77 27v8m0 5v8m0 5v8m0 5v8m0 5v8m0 5v8m0 5v8m0 5v8m0 5v8" stroke="#93a37f" stroke-width="3" stroke-linecap="round"/>
  <text x="106" y="56" fill="#49663b" font-family="Georgia,serif" font-size="24" font-style="italic">Hello!</text>
  <path d="m142 121 6 6 11-14" stroke="#789455" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></g>
  <g transform="rotate(27 192 103)"><path d="M185 39h14v113l-7 15-7-15V39Z" fill="#edb15e" stroke="#c78a42"/>
  <path d="M185 39a7 7 0 0 1 14 0v12h-14V39Z" fill="#d39a87" stroke="#b88170"/>
  <path d="M185 51h14v8h-14z" fill="#e5d5b3"/>
  <path d="M192 59v91" stroke="#f6d394" stroke-width="4"/>
  <path d="m185 152 7 15 7-15" fill="#f4dfba"/>
  <path d="m189 160 3 7 3-7" fill="#506044"/></g>
  <path d="m47 48 3 6 6 1-4 4 1 6-6-3-5 3 1-6-4-4 6-1 2-6Z" fill="#b5c994"/>
  <path d="m215 20 2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5Z" fill="#a6bd84"/>
</svg>`;

function renderNav() {
  document.querySelector('#units').innerHTML = units.map(unit=>`<button class="unit-button" data-unit="${unit.id}" aria-current="${unit.id===unitId}" aria-label="${unit.id?`Unit ${unit.id}，`:''}${unit.title}"><span class="unit-number">${unit.id || '词'}</span><span class="unit-name">${unit.title}<small>${unit.id?`Unit ${unit.id} · `:''}${unit.subtitle}</small></span><span class="unit-arrow">${icon('chevron',13)}</span></button>`).join('');
  document.querySelector('#breadcrumb').textContent = `我的课本 / ${unitId?`Unit ${unitId}`:'专有名词'}`;
}
function currentEntries() { return entries.filter(e=>e.unit===unitId && (filter!=='again'||progress.again.includes(e.id))); }
function modeSwitch() {
  return `<div class="mode-switch" aria-label="练习方式"><button data-action="study" aria-pressed="${mode==='study'}">${icon('book',15)}词表对照</button><button data-action="practice" aria-pressed="${mode==='practice'}">${icon('pencil',15)}纸笔听写</button></div>`;
}
function studyView() {
  const unit = units.find(u=>u.id===unitId);
  const all = entries.filter(e=>e.unit===unitId);
  const shown = currentEntries();
  const reviewCount = all.filter(e=>progress.again.includes(e.id)).length;
  return `<section class="hero" aria-labelledby="welcome-title"><div class="hero-copy"><div class="hero-kicker">三年级上册 · 纸笔记忆小练习</div><h1 id="welcome-title">听一听，<br class="mobile-break">写一写。</h1><p>点击单词，跟着读一遍。<br>再拿起笔，把记住的写下来。</p></div>${notebookArt}</section>
  <section aria-labelledby="unit-title"><div class="section-top"><div class="section-heading"><h2 id="unit-title">${unit.id?`Unit ${unit.id}`:'专有名词'}</h2><span class="count-tag">${all.length} 条词汇</span></div>${modeSwitch()}</div>
  <div class="toolbar"><div class="filter-buttons"><button class="filter-button" data-action="all" aria-pressed="${filter==='all'}">全部词汇</button><button class="filter-button" data-action="again" aria-pressed="${filter==='again'}">${icon('star',14)}再练词<span class="filter-count">${reviewCount}</span></button></div><div class="toolbar-right"><button class="hide-button" data-action="conceal" aria-pressed="${concealed}">${icon(concealed?'eye':'hide',15)}${concealed?'显示英文':'遮住英文'}</button><span class="voice-status"><span class="voice-dot${!synth?' unavailable':''}"></span><span data-voice-status>${voiceLabel()}</span></span></div></div>
  ${shown.length?`<div class="word-grid">${shown.map(entry=>wordCard(entry,all.indexOf(entry)+1)).join('')}</div>`:`<div class="empty-state">${icon('star',36)}<h3>这一单元还没有再练词</h3><p>遇到不熟的单词，点一下卡片右上角的星星，<br>下次就能在这里集中练习。</p><button class="secondary-button" data-action="all">回到全部词汇</button></div>`}
  <p class="study-tip">${icon('info',14)}<span>点击英文或小喇叭听发音；点星星收进再练词。短语、句子也可以跟读。</span></p>
  ${shown.length?`<div class="start-strip"><div class="strip-text"><strong>准备好了吗？试着默写一小组。</strong><p>每轮最多 5 条，听读 → 纸上写 → 展开核对。</p></div><button class="primary-button" data-action="practice">${icon('pencil',16)}开始纸笔听写${icon('arrow',16)}</button></div>`:''}</section>`;
}
function wordCard(entry, number) {
  const flagged = progress.again.includes(entry.id);
  return `<article class="word-card"><div class="card-top"><span class="entry-number">${String(number).padStart(2,'0')}${entry.type!=='word'?`<span class="type-tag">${entry.type==='phrase'?'短语':'句子'}</span>`:''}</span><button class="review-toggle" data-action="flag" data-id="${entry.id}" aria-pressed="${flagged}" aria-label="${flagged?'移出':'加入'}再练词，第 ${number} 条">${icon('star',17,flagged)}</button></div><button class="word-button" data-action="speak" data-id="${entry.id}" aria-label="${concealed?`朗读第 ${number} 条`:`朗读 ${esc(entry.word)}`}"><span class="word-text ${entry.word.length>12?'long':''}" lang="en">${concealed?'<span class="hidden-word" aria-hidden="true"></span>':esc(entry.word)}</span><span class="play-icon">${icon('sound',16)}</span></button>${concealed?'<p class="ipa hidden-ipa">先在纸上写一写</p>':`<p class="ipa" lang="en">/${esc(entry.ipa)}/</p>`}<p class="meaning">${esc(entry.meaning)}</p>${entry.note&&!concealed?`<p class="entry-note">${esc(entry.note)}</p>`:''}</article>`;
}
function practiceHeader() {
  const unit = units.find(u=>u.id===unitId);
  return `<div class="practice-heading"><div class="practice-title"><h1>纸笔听写</h1><p>${unitId?`Unit ${unitId} · `:''}${unit.title}${filter==='again'?' · 再练词':''}，慢慢写，认真记。</p></div><button class="text-button" data-action="study">${icon('back',15)}回到词表</button></div>`;
}
function practiceView() {
  if (!round || !round.ids.length) return `${practiceHeader()}<div class="empty-state">${icon('book',36)}<h3>先选几条词汇吧</h3><p>回到词表，选择一个单元或加入几条再练词。</p><button class="primary-button" data-action="study">回到词表</button></div>`;
  if (round.index>=round.ids.length) return summaryView();
  const entry = byId.get(round.ids[round.index]);
  const total = round.ids.length;
  return `${practiceHeader()}<div class="practice-stepper" aria-label="练习步骤"><span class="${!round.revealed?'current':''}"><b class="step-index">1</b>听一听</span><b class="step-arrow">/</b><span class="${!round.revealed?'current':''}"><b class="step-index">2</b>纸上写</span><b class="step-arrow">/</b><span class="${round.revealed?'current':''}"><b class="step-index">3</b>核对答案</span></div>
  <section class="practice-card" aria-label="当前听写题"><div class="practice-card-top"><span>第 ${round.index+1} / ${total} 条</span><span class="progress-dots" aria-hidden="true">${round.ids.map((_,i)=>`<i class="progress-dot ${i<round.index?'done':i===round.index?'current':''}"></i>`).join('')}</span></div><div class="practice-body"><p class="prompt-label">${round.revealed?'对照看看，你写对了吗？':'听一听，把这个词写在纸上'}</p><h2 class="practice-meaning" id="practice-prompt">${esc(entry.meaning)}</h2><button id="listen" class="listen-button" data-action="speak" data-id="${entry.id}" aria-label="听一遍当前题目">${icon('sound',20)}${round.revealed?'再听一遍':'听一遍'}</button>${round.revealed?`<div class="answer-panel"><div class="answer-word ${entry.word.length>15?'long':''}" lang="en">${esc(entry.word)}</div><p class="ipa" lang="en">/${esc(entry.ipa)}/</p>${entry.note?`<p class="entry-note">${esc(entry.note)}</p>`:''}</div>`:'<p class="practice-hint">先跟读，再动笔。<br>写好了，再展开答案核对。</p>'}</div><div class="practice-actions">${round.revealed?`<button id="grade-wrong" class="secondary-button" data-action="grade-wrong">${icon('repeat',17)}再练练</button><button id="grade-right" class="primary-button" data-action="grade-right">${icon('check',17)}写对了</button>`:`<button class="primary-button" data-action="reveal">${icon('eye',17)}写好了，展开答案</button>`}</div><div class="practice-progress" aria-hidden="true"><div class="practice-progress-fill" style="width:${round.index/total*100}%"></div></div></section><p class="practice-bottom">${round.revealed?'由孩子或家长对照纸上的拼写记录结果。':'不着急，想不起来可以多听几遍。'}<br><span data-voice-status>${voiceLabel()}</span> · 音标采用英式标注</p>`;
}
function summaryView() {
  const correct = round.results.filter(r=>r.correct).length;
  const wrong = round.results.length-correct;
  const hasNext = groupOffset+5<sourceIds.length;
  return `${practiceHeader()}<section class="practice-card"><div class="summary-body"><div class="summary-emblem">${icon('check',31)}</div><h2 id="summary-title" tabindex="-1">这一小组，认真写完了！</h2><p>记住几个，就进步一点。<br>${wrong?'再看看这些词，下一次会更熟悉。':'合上词表后，也可以再回忆一遍。'}</p><div class="summary-stats"><div class="summary-stat"><strong>${correct}</strong><span>手动核对写对</span></div><div class="summary-stat"><strong>${wrong}</strong><span>需要再练</span></div></div><div class="result-list">${round.results.map(result=>{const e=byId.get(result.id);return `<div class="result-row ${result.correct?'':'wrong'}">${icon(result.correct?'check':'repeat',17)}<span class="sr-only">${result.correct?'写对':'再练'}：</span><strong lang="en">${esc(e.word)}</strong><span>${esc(e.meaning)}</span></div>`;}).join('')}</div><p class="summary-caption">结果已记录${wrong?'，需要再练的词已加入星标':''}。</p></div><div class="practice-actions">${wrong?`<button class="secondary-button" data-action="retry">${icon('repeat',16)}再练本组错词</button>`:''}${hasNext?`<button class="primary-button" data-action="next">继续下一组${icon('arrow',16)}</button>`:`<button class="primary-button" data-action="study">${icon('book',16)}回到词表</button>`}</div></section>`;
}
function render(focusSelector) {
  const active = document.activeElement;
  let restore = null;
  if (root.contains(active) && active.dataset.action) {
    restore = `[data-action="${active.dataset.action}"]${active.dataset.id?`[data-id="${active.dataset.id}"]`:''}`;
  }
  renderNav();
  root.innerHTML = mode==='study'?studyView():practiceView();
  updateVoiceStatus();
  const target = focusSelector || restore;
  if (target) root.querySelector(target)?.focus({preventScroll:true});
}
function beginPractice(ids = currentEntries().map(e=>e.id)) {
  stopSpeech();
  speechNotice('');
  sourceIds = ids;
  groupOffset = 0;
  round = startRound(sourceIds);
  mode = 'practice';
  render('#listen');
  document.querySelector('#main').scrollIntoView({block:'start'});
}
document.querySelector('#units').addEventListener('click',event=>{
  const button = event.target.closest('[data-unit]');
  if (!button) return;
  stopSpeech();
  speechNotice('');
  unitId = Number(button.dataset.unit);
  mode = 'study';
  filter = 'all';
  concealed = false;
  round = null;
  render();
  document.querySelector(`[data-unit="${unitId}"]`)?.focus({preventScroll:true});
  announce(`已切换到${unitId?`第 ${unitId} 单元`:'专有名词'}。`);
});
root.addEventListener('click',event=>{
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const action = button.dataset.action;
  if (action==='speak') { speak(button.dataset.id,button); return; }
  if (action==='flag') {
    const id = button.dataset.id;
    const flagged = progress.again.includes(id);
    progress.again = flagged?progress.again.filter(i=>i!==id):[...progress.again,id];
    persist(); render(); announce(flagged?'已移出再练词。':'已加入再练词。'); return;
  }
  stopSpeech(); speechNotice('');
  if (action==='study') { mode='study'; round=null; render('[data-action="practice"]'); }
  else if (action==='practice') beginPractice();
  else if (action==='all'||action==='again') { filter=action; render(); }
  else if (action==='conceal') { concealed=!concealed; render(); announce(concealed?'英文和音标已遮住。':'英文和音标已显示。'); }
  else if (action==='reveal' && round) { round=revealAnswer(round); render('#grade-right'); announce('答案已展开，请核对纸上的拼写。'); }
  else if ((action==='grade-right'||action==='grade-wrong') && round?.revealed) {
    round=markAnswer(round,action==='grade-right');
    const result=round.results[round.results.length-1];
    progress=applyResults(progress,[result]);
    progress.last=round.results;
    persist();
    render(round.index>=round.ids.length?'#summary-title':'#listen');
    announce(round.index>=round.ids.length?'本轮核对完成。':`第 ${round.index+1} 条，请先听读，再写在纸上。`);
  }
  else if (action==='next') { groupOffset+=5; round=startRound(sourceIds,groupOffset); render('#listen'); }
  else if (action==='retry' && round) {
    round=startRound(round.results.filter(r=>!r.correct).map(r=>r.id));
    render('#listen');
  }
});
render();
