import {textbookClips} from './textbook-audio.mjs';
import {memoryGroups} from './memory.mjs';
import {splitPhonics} from './phonics.mjs';
import {entries, units} from './vocabulary.mjs';
import {startRound, revealAnswer, markAnswer, moveQuestion, parseProgress, applyResults, chooseVoice, voicesForAccent, parseVoiceSettings} from './core.mjs';

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
const phonicsLabels = {vowel:'元音字母',group:'字母组合，结合整词听发音',silent:'本词中不单独发音'};
function coloredWord(text) {
  return splitPhonics(text).map(part=>part.kind==='plain'?esc(part.text):`<span class="ph-${part.kind}" title="${phonicsLabels[part.kind]}">${esc(part.text)}</span>`).join('');
}
function phonicsLegend() {
  return '<div class="phonics-legend" aria-label="自然拼读着色说明"><strong>拼读着色</strong><span><i class="ph-key ph-key-vowel" aria-hidden="true"></i>元音</span><span><i class="ph-key ph-key-group" aria-hidden="true"></i>字母组合</span><span><i class="ph-key ph-key-silent" aria-hidden="true"></i>不单独发音</span><small>看组合，听整词，再动笔。</small></div>';
}
const byId = new Map(entries.map(e=>[e.id,e]));
const validIds = new Set(byId.keys());
const storageKey = 'english-notebook-progress-v1';
const voiceStorageKey = 'english-notebook-voice-v1';
const sourceStorageKey = 'english-notebook-audio-source-v1';
const root = document.querySelector('#app');
let progress = {again:[],counts:{},last:[]};
let unitId = 1, filter = 'all', concealed = false, mode = 'study';
let round = null, sourceIds = [], groupOffset = 0;
let memoryQuery = '', practiceContext = '', practiceReturnMode = 'study';
const entryByWord = new Map(entries.map(entry=>[entry.word,entry]));
let synth = 'speechSynthesis' in window ? window.speechSynthesis : null;
let currentSpeech = null, currentAudio = null, speechSerial = 0;
let audioSource = 'textbook';
try { if (localStorage.getItem(sourceStorageKey)==='system') audioSource='system'; }
catch { storageWarning(); }
let voices = [];
let voiceSettings = {accent:'en-GB',voiceId:''}, voicePreferenceChosen = false;
try { progress = parseProgress(localStorage.getItem(storageKey), validIds); }
catch { storageWarning(); }
try {
  const raw = localStorage.getItem(voiceStorageKey);
  voiceSettings = parseVoiceSettings(raw);
  voicePreferenceChosen = Boolean(raw);
} catch { storageWarning(); }

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
  if (audioSource==='textbook') return '教材原声 · 双读';
  if (!synth) return '此浏览器不支持朗读';
  const accent = voiceSettings.accent === 'en-US' ? '美式' : '英式';
  return chooseVoice(voices, voiceSettings.accent, voiceSettings.voiceId) ? `${accent}发音` : `${accent}语音待就绪`;
}
function updateVoiceStatus() {
  if (synth) {
    try { voices = synth.getVoices(); } catch { voices = []; }
  }
  if (!voicePreferenceChosen) {
    if (voicesForAccent(voices,'en-GB').length) voiceSettings.accent = 'en-GB';
    else if (voicesForAccent(voices,'en-US').length) voiceSettings.accent = 'en-US';
  }
  const available = voicesForAccent(voices,voiceSettings.accent);
  const accentSelect = document.querySelector('#accent-select');
  const voiceSelect = document.querySelector('#voice-select');
  document.querySelector('#source-select').value=audioSource;
  accentSelect.innerHTML=audioSource==='textbook'?'<option value="original">随教材录音</option>':'<option value="en-GB">英式英语</option><option value="en-US">美式英语</option>';
  accentSelect.value = audioSource==='textbook'?'original':voiceSettings.accent;
  accentSelect.disabled = audioSource==='textbook'||!synth;
  voiceSelect.innerHTML = available.length ? `<option value="">自动选择（${esc(available[0].name)}）</option>${available.map(voice=>`<option value="${esc(voice.voiceURI || voice.name)}">${esc(voice.name)}</option>`).join('')}` : '<option value="">暂无此口音的角色</option>';
  const preferred = available.some(voice=>(voice.voiceURI || voice.name) === voiceSettings.voiceId);
  if (audioSource==='textbook') voiceSelect.innerHTML='<option value="">教材录音原角色</option>';
  voiceSelect.value = audioSource==='textbook'?'':preferred?voiceSettings.voiceId:'';
  voiceSelect.disabled = audioSource==='textbook'||!available.length;
  const preview=document.querySelector('#voice-preview');
  preview.disabled=audioSource==='textbook'?!('Audio' in window):!synth;
  preview.textContent=audioSource==='textbook'?'试听原声':'试听角色';
  const help = document.querySelector('#voice-help');
  if (audioSource==='textbook') help.textContent='保留教材每条读两遍的原声，口音和角色随录音；专有名词原声暂缺，点读时会提示改用设备朗读。';
  else if (!synth) help.textContent = '当前浏览器不支持朗读，请换用 Safari、Chrome 或 Edge。词表与纸笔练习仍可使用。';
  else if (!available.length) help.textContent = `当前设备尚无${voiceSettings.accent==='en-US'?'美式':'英式'}英语角色，可稍后点试听重试，或在设备语音设置中添加对应英语语音。`;
  else if (voiceSettings.voiceId && !preferred) help.textContent = `上次的角色暂不可用，当前使用 ${available[0].name}。下方音标统一为英式标注。`;
  else help.textContent = '常用音色已排在前面，可点击试听；角色由当前设备提供，音标统一为英式标注。';
  document.querySelectorAll('[data-voice-status]').forEach(e=>e.textContent=voiceLabel());
}
function saveVoiceSettings() {
  voicePreferenceChosen = true;
  try { localStorage.setItem(voiceStorageKey,JSON.stringify(voiceSettings)); }
  catch { storageWarning(); }
}
function stopSpeech() {
  speechSerial += 1;
  if (synth) { try { synth.cancel(); } catch { /* Some embedded browsers expose an inactive speech service. */ } }
  currentSpeech = null;
  if (currentAudio) { currentAudio.pause(); currentAudio=null; }
  document.querySelectorAll('.is-speaking').forEach(e=>e.classList.remove('is-speaking'));
}
function playRecording(clip, button) {
  const token=speechSerial;
  const audio=new Audio(clip.src);
  currentAudio=audio;
  button.classList.add('is-speaking');
  audio.onended=()=>{
    if (token!==speechSerial) return;
    button.classList.remove('is-speaking');
    currentAudio=null;
  };
  const fail=()=>{
    if (token!==speechSerial) return;
    audio.pause();
    button.classList.remove('is-speaking');
    currentAudio=null;
    speechNotice('教材原声暂时无法播放，请检查网络后重试，或切换为设备朗读。');
  };
  audio.onerror=fail;
  try { const playing=audio.play(); if (playing?.catch) playing.catch(fail); }
  catch { fail(); }
}
function speak(text, button, entryId) {
  stopSpeech();
  speechNotice('');
  if (audioSource==='textbook' && textbookClips[entryId]) {
    if ('Audio' in window) playRecording(textbookClips[entryId],button);
    else speechNotice('当前浏览器无法播放教材原声，请换用浏览器或设备朗读。');
    return;
  }
  if (audioSource==='textbook') speechNotice('这条词汇暂未提供教材原声，本次使用设备朗读。');
  if (!synth || !('SpeechSynthesisUtterance' in window)) {
    speechNotice('当前浏览器不支持朗读。请用 Safari、Chrome 或 Edge 打开；仍可展开答案进行读写练习。');
    return;
  }
  updateVoiceStatus();
  const voice = chooseVoice(voices,voiceSettings.accent,voiceSettings.voiceId);
  if (!voice) {
    speechNotice(`尚未找到${voiceSettings.accent==='en-US'?'美式':'英式'}英语角色。请换一种口音，或在设备语音设置中添加对应英语语音后重试。`);
    return;
  }
  const token = speechSerial;
  const utterance = new SpeechSynthesisUtterance(text);
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
document.querySelector('#source-select').addEventListener('change',event=>{
  stopSpeech(); speechNotice('');
  audioSource=event.target.value==='system'?'system':'textbook';
  try { localStorage.setItem(sourceStorageKey,audioSource); }
  catch { storageWarning(); }
  updateVoiceStatus();
  announce(audioSource==='textbook'?'已切换为教材原声，每条读两遍。':'已切换为设备朗读。');
});
document.querySelector('#accent-select').addEventListener('change',event=>{
  stopSpeech(); speechNotice('');
  voiceSettings = {accent:event.target.value,voiceId:''};
  saveVoiceSettings(); updateVoiceStatus();
  announce(`已切换到${voiceSettings.accent==='en-US'?'美式':'英式'}英语。`);
});
document.querySelector('#voice-select').addEventListener('change',event=>{
  stopSpeech(); speechNotice('');
  voiceSettings.voiceId = event.target.value;
  saveVoiceSettings(); updateVoiceStatus();
  announce('朗读角色已更新。');
});
document.querySelector('#voice-preview').addEventListener('click',event=>{
  if (audioSource==='textbook') {
    const sample=entries.find(entry=>entry.unit===unitId&&textbookClips[entry.id])||entries.find(entry=>textbookClips[entry.id]);
    speak(sample.speak,event.currentTarget,sample.id);
  } else speak("Hello! Let's learn English.",event.currentTarget);
});
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
  const memorySelected=mode==='memory'||(mode==='practice'&&practiceReturnMode==='memory');
  document.querySelector('#units').innerHTML = units.map(unit=>`<button class="unit-button" data-unit="${unit.id}" aria-current="${!memorySelected&&unit.id===unitId}" aria-label="${unit.id?`Unit ${unit.id}，`:''}${unit.title}"><span class="unit-number">${unit.id || '词'}</span><span class="unit-name">${unit.title}<small>${unit.id?`Unit ${unit.id} · `:''}${unit.subtitle}</small></span><span class="unit-arrow">${icon('chevron',13)}</span></button>`).join('')+`<button class="unit-button memory-nav" data-action="memory" aria-current="${memorySelected}"><span class="unit-number">${icon('repeat',18)}</span><span class="unit-name">串词速记<small>全册词汇 · 联想记忆</small></span><span class="unit-arrow">${icon('chevron',13)}</span></button>`;
  document.querySelector('#breadcrumb').textContent = `我的课本 / ${memorySelected?'串词速记':unitId?`Unit ${unitId}`:'专有名词'}`;
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
  <div class="toolbar"><div class="filter-buttons"><button class="filter-button" data-action="all" aria-pressed="${filter==='all'}">全部词汇</button><button class="filter-button" data-action="again" aria-pressed="${filter==='again'}">${icon('star',14)}再练词<span class="filter-count">${reviewCount}</span></button></div><div class="toolbar-right"><button class="hide-button" data-action="conceal" aria-pressed="${concealed}">${icon(concealed?'eye':'hide',15)}${concealed?'显示英文':'遮住英文'}</button><span class="voice-status"><span class="voice-dot${audioSource==='system'&&!synth?' unavailable':''}"></span><span data-voice-status>${voiceLabel()}</span></span></div></div>
  ${phonicsLegend()}
  ${shown.length?`<div class="word-grid">${shown.map(entry=>wordCard(entry,all.indexOf(entry)+1)).join('')}</div>`:`<div class="empty-state">${icon('star',36)}<h3>这一单元还没有再练词</h3><p>遇到不熟的单词，点一下卡片右上角的星星，<br>下次就能在这里集中练习。</p><button class="secondary-button" data-action="all">回到全部词汇</button></div>`}
  <p class="study-tip">${icon('info',14)}<span>点击英文或小喇叭听发音；点星星收进再练词。短语、句子也可以跟读。</span></p>
  ${shown.length?`<div class="start-strip"><div class="strip-text"><strong>准备好了吗？试着默写一小组。</strong><p>每轮最多 5 条，听读 → 纸上写 → 展开核对。</p></div><button class="primary-button" data-action="practice">${icon('pencil',16)}开始纸笔听写${icon('arrow',16)}</button></div>`:''}</section>`;
}
function wordCard(entry, number) {
  const flagged = progress.again.includes(entry.id);
  return `<article class="word-card"><div class="card-top"><span class="entry-number">${String(number).padStart(2,'0')}${entry.type!=='word'?`<span class="type-tag">${entry.type==='phrase'?'短语':'句子'}</span>`:''}</span><button class="review-toggle" data-action="flag" data-id="${entry.id}" aria-pressed="${flagged}" aria-label="${flagged?'移出':'加入'}再练词，第 ${number} 条">${icon('star',17,flagged)}</button></div><button class="word-button" data-action="speak" data-id="${entry.id}" aria-label="${concealed?`朗读第 ${number} 条`:`朗读 ${esc(entry.word)}`}"><span class="word-text ${entry.word.length>12?'long':''}" lang="en">${concealed?'<span class="hidden-word" aria-hidden="true"></span>':coloredWord(entry.word)}</span><span class="play-icon">${icon('sound',16)}</span></button>${concealed?'<p class="ipa hidden-ipa">先在纸上写一写</p>':`<p class="ipa" lang="en">/${esc(entry.ipa)}/</p>`}<p class="meaning">${esc(entry.meaning)}</p>${entry.note&&!concealed?`<p class="entry-note">${esc(entry.note)}</p>`:''}</article>`;
}
const memoryKinds = {sound:'相似拼写与读音',relation:'对照与词形变化',scene:'场景联想'};
function memoryView() {
  return `<section class="memory-hero"><div><div class="hero-kicker">全册词汇 · 串起来记</div><h1 id="memory-title" tabindex="-1">一串词，一起记。</h1><p>读一串，在纸上写一串，再遮住英文试着回忆。<br>记不住的点星星，稍后再练。</p></div><span class="memory-total">${entries.length}<small>条课本词汇</small></span></section>
    <div class="section-top memory-toolbar"><div class="section-heading"><h2>串词速记</h2></div><button class="hide-button" data-action="conceal" aria-pressed="${concealed}">${icon(concealed?'eye':'hide',15)}${concealed?'显示英文':'遮住英文'}</button></div>
    <div class="memory-tools"><label for="memory-search">找一个词<input id="memory-search" type="search" placeholder="输入英文或中文" value="${esc(memoryQuery)}" autocomplete="off"></label><nav class="memory-jumps" aria-label="速记分组">${Object.entries(memoryKinds).map(([kind,label])=>`<a href="#memory-${kind}">${label}</a>`).join('')}</nav></div>
    <p class="memory-guide">每次先选一小组：点读 → 看提示串起来 → 遮词回忆 → 纸笔听写。同一个词也会出现在不同的联想中。</p>
    ${Object.entries(memoryKinds).map(([kind,label])=>`<section class="memory-section" id="memory-${kind}" aria-labelledby="memory-heading-${kind}"><div class="memory-section-heading"><h2 id="memory-heading-${kind}">${label}</h2><span>${memoryGroups.filter(group=>group.kind===kind).length} 组</span></div><div class="memory-grid">${memoryGroups.filter(group=>group.kind===kind).map(group=>`<article class="memory-group" data-group="${group.id}"><div class="memory-group-header"><h3>${esc(group.title)}</h3><span>${group.words.length} 条</span></div>${concealed?'':`<p class="memory-tip">${esc(group.tip)}</p>`}<div class="memory-entries">${group.words.map(word=>memoryEntry(entryByWord.get(word))).join('')}</div><p class="memory-recall">${esc(group.recall)}</p><button class="secondary-button" data-action="practice-group" data-group="${group.id}">${icon('pencil',15)}练这一组</button></article>`).join('')}</div></section>`).join('')}
    <div id="memory-empty" class="empty-state" hidden><h3>没有找到这个词</h3><p>换一个词，或清空搜索看看全部分组。</p></div>`;
}
function memoryEntry(entry) {
  const flagged=progress.again.includes(entry.id);
  return `<div class="memory-entry" data-id="${entry.id}"><div><button class="memory-word-button" data-action="speak" data-id="${entry.id}" aria-label="${concealed?'听这一条词汇':`朗读 ${esc(entry.word)}`}"><span class="memory-word-text" lang="en">${concealed?'<span class="hidden-word" aria-hidden="true"></span>':coloredWord(entry.word)}</span>${icon('sound',15)}</button>${concealed?'':`<p class="memory-ipa" lang="en">/${esc(entry.ipa)}/</p>`}<p class="memory-meaning">${esc(entry.meaning)}</p></div><button class="review-toggle" data-action="flag" data-id="${entry.id}" aria-pressed="${flagged}" aria-label="${flagged?'移出':'加入'}再练词，${esc(entry.meaning)}">${icon('star',16,flagged)}</button></div>`;
}
function filterMemory() {
  const query=memoryQuery.trim().toLowerCase();
  let visible=0;
  root.querySelectorAll('.memory-group').forEach(group=>{
    let count=0;
    group.querySelectorAll('.memory-entry').forEach(row=>{
      const entry=byId.get(row.dataset.id);
      row.hidden=Boolean(query && !`${entry.word} ${entry.meaning}`.toLowerCase().includes(query));
      if (!row.hidden) count++;
    });
    group.hidden=count===0;
    visible+=count;
  });
  root.querySelectorAll('.memory-section').forEach(section=>{
    section.hidden=![...section.querySelectorAll('.memory-group')].some(group=>!group.hidden);
  });
  const empty=root.querySelector('#memory-empty');
  if (empty) empty.hidden=visible>0;
}
root.addEventListener('input',event=>{
  if (event.target.id!=='memory-search') return;
  memoryQuery=event.target.value;
  filterMemory();
});
function practiceHeader() {
  const unit = units.find(u=>u.id===unitId);
  return `<div class="practice-heading"><div class="practice-title"><h1>纸笔听写</h1><p>${practiceContext?esc(practiceContext):`${unitId?`Unit ${unitId} · `:''}${unit.title}${filter==='again'?' · 再练词':''}`}，慢慢写，认真记。</p></div><button class="text-button" data-action="${practiceReturnMode}">${icon('back',15)}${practiceReturnMode==='memory'?'回到速记':'回到词表'}</button></div>`;
}
function practiceView() {
  if (!round || !round.ids.length) return `${practiceHeader()}<div class="empty-state">${icon('book',36)}<h3>先选几条词汇吧</h3><p>回到词表，选择一个单元或加入几条再练词。</p><button class="primary-button" data-action="study">回到词表</button></div>`;
  if (round.index>=round.ids.length) return summaryView();
  const entry = byId.get(round.ids[round.index]);
  const total = round.ids.length;
  const done = round.results.length;
  const result = round.results.find(item=>item.id===entry.id);
  return `${practiceHeader()}<div class="practice-stepper" aria-label="练习步骤"><span class="${!round.revealed?'current':''}"><b class="step-index">1</b>听一听</span><b class="step-arrow">/</b><span class="${!round.revealed?'current':''}"><b class="step-index">2</b>纸上写</span><b class="step-arrow">/</b><span class="${round.revealed?'current':''}"><b class="step-index">3</b>核对答案</span></div>
  <section class="practice-card practice-question" aria-label="当前听写题">
    <div class="practice-card-top"><span>第 ${round.index+1} / ${total} 条</span><span class="progress-dots" aria-hidden="true">${round.ids.map((id,i)=>`<i class="progress-dot ${round.results.some(item=>item.id===id)?'done':''} ${i===round.index?'current':''}"></i>`).join('')}</span></div>
    <div class="practice-body">
      <div class="practice-listening"><p class="prompt-label">听一听，把记住的写在纸上</p><h2 class="practice-meaning" id="practice-prompt">${esc(entry.meaning)}</h2><button id="listen" class="listen-button" data-action="speak" data-id="${entry.id}" aria-label="重听当前题目" aria-keyshortcuts="Space">${icon('sound',20)}重听一遍</button><p class="practice-hint">先跟读，再动笔。<br>空格可以重听，左右键切换题目。</p></div>
      <div class="practice-checking" aria-label="答案与核对">
        <div class="practice-answer-content">${round.revealed?`<div class="answer-panel"><p class="prompt-label">${result?`本题已记为：${result.correct?'写对了':'再练练'}，可以重新核对`:'对照纸上的拼写，认真核对'}</p><div class="answer-word ${entry.word.length>15?'long':''}" lang="en">${coloredWord(entry.word)}</div><p class="ipa" lang="en">/${esc(entry.ipa)}/</p>${entry.note?`<p class="entry-note">${esc(entry.note)}</p>`:''}${phonicsLegend()}</div>`:`<div class="answer-placeholder">${icon('pencil',30)}<h3>先写，再核对</h3><p>在纸上写好后，<br>按回车或点击下方展开答案。</p></div>`}</div>
        <div class="practice-actions"><button id="play-recording" class="secondary-button" data-action="speak" data-id="${entry.id}" aria-keyshortcuts="Space">播放录音</button>${round.revealed?`<button id="grade-wrong" class="secondary-button" data-action="grade-wrong">${icon('repeat',17)}再练练</button><button id="grade-right" class="primary-button" data-action="grade-right" aria-keyshortcuts="Enter">${icon('check',17)}写对了</button>`:`<button class="primary-button" data-action="reveal" aria-keyshortcuts="Enter">${icon('eye',17)}展开答案</button>`}</div>
      </div>
    </div>
    <nav class="question-navigation" aria-label="切换听写题目"><button class="secondary-button" data-action="previous-question" aria-keyshortcuts="ArrowLeft" ${round.index===0?'disabled':''}>${icon('back',15)}上一题</button><span>已核对 ${done} / ${total}</span><button class="secondary-button" data-action="next-question" aria-keyshortcuts="ArrowRight" ${round.index===total-1&&done<total?'disabled':''}>${done===total&&round.index===total-1?'本组结果':'下一题'}${icon('arrow',15)}</button></nav>
    <div class="practice-progress" aria-hidden="true"><div class="practice-progress-fill" style="width:${done/total*100}%"></div></div>
  </section>
  <p class="keyboard-help"><span><kbd>←</kbd><kbd>→</kbd> 切换题目</span><span><kbd>空格</kbd> 重听</span><span><kbd>回车</kbd> 展开 / 写对了</span></p><p class="practice-bottom">每题都核对后再完成本组，跳过的题目稍后会回到。<br><span data-voice-status>${voiceLabel()}</span> · 音标采用英式标注</p>`;
}
function summaryView() {
  const correct = round.results.filter(r=>r.correct).length;
  const wrong = round.results.length-correct;
  const hasNext = groupOffset+5<sourceIds.length;
  return `${practiceHeader()}<section class="practice-card"><div class="summary-body"><div class="summary-emblem">${icon('check',31)}</div><h2 id="summary-title" tabindex="-1">这一小组，认真写完了！</h2><p>记住几个，就进步一点。<br>${wrong?'再看看这些词，下一次会更熟悉。':'合上词表后，也可以再回忆一遍。'}</p><div class="summary-stats"><div class="summary-stat"><strong>${correct}</strong><span>手动核对写对</span></div><div class="summary-stat"><strong>${wrong}</strong><span>需要再练</span></div></div><div class="result-list">${round.results.map(result=>{const e=byId.get(result.id);return `<div class="result-row ${result.correct?'':'wrong'}">${icon(result.correct?'check':'repeat',17)}<span class="sr-only">${result.correct?'写对':'再练'}：</span><strong lang="en">${coloredWord(e.word)}</strong><span>${esc(e.meaning)}</span></div>`;}).join('')}</div><p class="summary-caption">结果已记录${wrong?'，需要再练的词已加入星标':''}。</p></div><div class="practice-actions"><button class="secondary-button" data-action="previous-question">${icon('back',16)}回看上一题</button>${wrong?`<button class="secondary-button" data-action="retry">${icon('repeat',16)}再练本组错词</button>`:''}${hasNext?`<button class="primary-button" data-action="next">继续下一组${icon('arrow',16)}</button>`:`<button class="primary-button" data-action="${practiceReturnMode}">${icon('book',16)}${practiceReturnMode==='memory'?'回到速记':'回到词表'}</button>`}</div></section>`;
}
function render(focusSelector) {
  const active = document.activeElement;
  let restore = null;
  if (root.contains(active) && active.dataset.action) {
    restore = `[data-action="${active.dataset.action}"]${active.dataset.id?`[data-id="${active.dataset.id}"]`:''}`;
    const group=active.closest('.memory-group')?.dataset.group;
    if (group) restore=`[data-group="${group}"] ${restore}`;
  }
  renderNav();
  root.innerHTML = mode==='study'?studyView():mode==='memory'?memoryView():practiceView();
  if (mode==='memory') filterMemory();
  updateVoiceStatus();
  const target = focusSelector || restore;
  if (target) root.querySelector(target)?.focus({preventScroll:true});
}
function beginPractice(ids = currentEntries().map(e=>e.id), context = '') {
  practiceContext = context;
  practiceReturnMode = mode==='memory'?'memory':'study';
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
  if (event.target.closest('[data-action="memory"]')) {
    stopSpeech(); speechNotice('');
    mode='memory'; round=null;
    render('#memory-title');
    document.querySelector('#main').scrollIntoView({block:'start'});
    announce('已进入全册串词速记。');
    return;
  }
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
  if (action==='speak') { const entry=byId.get(button.dataset.id); if (entry) speak(entry.speak,button,entry.id); return; }
  if (action==='flag') {
    const id = button.dataset.id;
    const flagged = progress.again.includes(id);
    progress.again = flagged?progress.again.filter(i=>i!==id):[...progress.again,id];
    persist(); render(); announce(flagged?'已移出再练词。':'已加入再练词。'); return;
  }
  stopSpeech(); speechNotice('');
  if (action==='study') { mode='study'; round=null; render('[data-action="practice"]'); }
  else if (action==='memory') { mode='memory'; round=null; render('#memory-title'); }
  else if (action==='practice') beginPractice();
  else if (action==='practice-group') {
    const group=memoryGroups.find(group=>group.id===button.dataset.group);
    if (group) beginPractice(group.words.map(word=>entryByWord.get(word).id),group.title);
  }
  else if (action==='all'||action==='again') { filter=action; render(); }
  else if (action==='conceal') { concealed=!concealed; render(); announce(concealed?'英文和音标已遮住。':'英文和音标已显示。'); }
  else if ((action==='previous-question'||action==='next-question') && round) {
    round=moveQuestion(round,action==='previous-question'?-1:1);
    render(round.index>=round.ids.length?'#summary-title':'#listen');
    announce(round.index>=round.ids.length?'本组核对结果。':`第 ${round.index+1} 条。`);
  }
  else if (action==='reveal' && round) { round=revealAnswer(round); render('#grade-right'); announce('答案已展开，请核对纸上的拼写。'); }
  else if ((action==='grade-right'||action==='grade-wrong') && round?.revealed) {
    const result={id:round.ids[round.index],correct:action==='grade-right'};
    const alreadyMarked=round.results.some(item=>item.id===result.id);
    const counts=progress.counts;
    round=markAnswer(round,result.correct);
    progress=applyResults(progress,[result]);
    if (alreadyMarked) progress.counts=counts;
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
document.addEventListener('keydown',event=>{
  if (mode!=='practice' || !round?.ids.length || event.isComposing || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
  const target=event.target instanceof Element?event.target:null;
  if (target?.closest('input,select,textarea,[contenteditable],a,.reading-settings,#units')) return;
  const action=target?.closest('button')?.dataset.action;
  if (action && !['speak','reveal','grade-right','previous-question','next-question'].includes(action)) return;
  const active=round.index<round.ids.length;
  const selector=event.key==='ArrowLeft'?'[data-action="previous-question"]':
    event.key==='ArrowRight'?(active?'[data-action="next-question"]':null):
    event.key===' '?(active?'#listen':null):
    event.key==='Enter'?(active?(round.revealed?'#grade-right':'[data-action="reveal"]'):null):null;
  if (!selector) return;
  event.preventDefault();
  if (!event.repeat) root.querySelector(selector)?.click();
});
render();
