// Run from any directory: node /path/to/mini/check.cjs (macOS + Google Chrome).
const fs=require('fs'),path=require('path'),http=require('http'),os=require('os'),{spawn}=require('child_process');
const root=__dirname,chrome='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
function run(command,args,options={}){return new Promise((resolve,reject)=>{const child=spawn(command,args,{cwd:root,stdio:'inherit',...options});child.on('error',reject);child.on('close',code=>code===0?resolve():reject(Error(command+' exited '+code)));});}
const browserCheck=`<!doctype html><meta charset="utf-8"><body style="margin:0"><iframe id="page" style="border:0;height:1700px"></iframe><script>
(async()=>{
 const assert=(ok,msg)=>{if(!ok)throw Error(msg)},frame=document.getElementById('page'),prefix=location.origin+'/repo-name/';
 frame.style.width=new URLSearchParams(location.search).get('width')+'px';
 frame.style.height=(new URLSearchParams(location.search).get('height')||1700)+'px';
 const load=action=>new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('page load timeout')),10000);frame.onload=()=>{clearTimeout(timeout);resolve()};action()});
 const go=url=>load(()=>frame.src=url),doc=()=>frame.contentDocument;
 const checkLayout=()=>assert(doc().documentElement.scrollWidth<=frame.clientWidth,'horizontal overflow: '+frame.src);
 const checkPracticeViewport=()=>{
  if(frame.clientWidth>760)return;
  checkLayout();
  assert(doc().documentElement.scrollHeight<=frame.clientHeight+1,'mobile dictation stays within one viewport');
  for(const button of doc().querySelectorAll('.practice-actions button,.question-navigation button,#reading-settings-toggle')){
   const rect=button.getBoundingClientRect();
   assert(rect.top>=0&&rect.bottom<=frame.clientHeight+1,'mobile action stays visible: '+button.textContent);
   assert(button.contains(doc().elementFromPoint(rect.left+rect.width/2,rect.top+rect.height/2)),'mobile action is not covered: '+button.textContent);
  }
 };
 try{
  await go(prefix);assert(doc().querySelectorAll('.card').length===4,'three games and English practice on homepage');checkLayout();
  for(const link of doc().querySelectorAll('a'))assert(link.href.startsWith(prefix),'link escapes repository prefix');
  await load(()=>doc().querySelector('a[href="english/index.html"]').click());
  assert(frame.contentWindow.location.pathname==='/repo-name/english/index.html','English navigation keeps repository prefix');
  assert(doc().querySelectorAll('.word-card').length===21,'English modules load and Unit 1 has 21 entries');
  assert([...doc().styleSheets].some(sheet=>sheet.href?.endsWith('/english/styles.css')&&sheet.cssRules.length>0),'English stylesheet loads');checkLayout();
  const normalWordSize=frame.contentWindow.getComputedStyle(doc().querySelector('.word-text')).fontSize;
  const checkWordLabels=expectedSize=>{
   checkLayout();
   for(const text of doc().querySelectorAll('.word-text')){
    const style=frame.contentWindow.getComputedStyle(text);
    assert(style.fontSize===expectedSize,'long and short vocabulary keep the same font size: '+text.textContent);
    assert(text.getBoundingClientRect().height<=parseFloat(style.lineHeight)+1,'vocabulary label must stay on one line: '+text.textContent);
    assert(text.scrollWidth<=text.clientWidth+1,'complete vocabulary label must fit without clipping: '+text.textContent);
    assert(text.getBoundingClientRect().right<=text.closest('.word-button').querySelector('.play-icon').getBoundingClientRect().left+1,'vocabulary text does not overlap its playback button');
   }
  };
  for(const unit of [1,2,3,4,5,6,7,8,0]){doc().querySelector('[data-unit="'+unit+'"]').click();checkWordLabels(normalWordSize)}
  doc().querySelector('[data-unit="1"]').click();
  if(frame.clientWidth>760){
   const initialWidth=frame.style.width;
   frame.style.width='320px';frame.contentWindow.dispatchEvent(new frame.contentWindow.Event('resize'));
   checkWordLabels(frame.contentWindow.getComputedStyle(doc().querySelector('.word-text')).fontSize);
   frame.style.width=initialWidth;frame.contentWindow.dispatchEvent(new frame.contentWindow.Event('resize'));checkWordLabels(normalWordSize);
  }
  const wordGrid=doc().querySelector('.word-grid'),shortCard=doc().querySelector('.word-card');
  const cardGap=parseFloat(frame.contentWindow.getComputedStyle(wordGrid).columnGap);
  const expectedLongWidth=frame.clientWidth<=760?wordGrid.getBoundingClientRect().width:shortCard.getBoundingClientRect().width*2+cardGap;
  for(const text of doc().querySelectorAll('.word-text.long')){
   const card=text.closest('.word-card');
   assert(card.getBoundingClientRect().width>=expectedLongWidth-1,'long vocabulary cards span at least two desktop columns or one full mobile row');
   assert(text.scrollWidth<=text.clientWidth+1,'long vocabulary stays inside its card');
  }
  if(frame.clientWidth<=760){
   const nav=doc().getElementById('units');
   assert(nav.scrollWidth<=nav.clientWidth,'mobile course menu shows every item without horizontal scrolling');
   assert(nav.querySelectorAll('button').length===10,'all eight units and both special sections are in the course menu');
   for(const button of nav.querySelectorAll('button')){
    const rect=button.getBoundingClientRect();
    assert(rect.left>=0&&rect.right<=frame.clientWidth,'every mobile course entry is visible');
   }
  }
  const settingsEntry=doc().getElementById('reading-settings-toggle');
  assert(settingsEntry?.closest('.topbar'),'reading settings uses the top toolbar entry on both platforms');
  settingsEntry.click();assert(doc().querySelector('.reading-settings').getBoundingClientRect().height===0,'toolbar button hides the whole settings section');
  settingsEntry.click();assert(settingsEntry.getAttribute('aria-expanded')==='true'&&doc().querySelector('.reading-settings').getBoundingClientRect().height>0,'toolbar button expands settings again');checkLayout();
  const audioSource=()=>doc().getElementById('source-select');
  assert(audioSource()?.value==='textbook','textbook original is the first default audio source');
  assert(doc().getElementById('accent-select').disabled&&doc().getElementById('voice-select').disabled,'original recording retains its own accent and performers');
  const NativeAudio=frame.contentWindow.Audio,recordings=[];
  let failRecording=false;
  frame.contentWindow.Audio=class {
   constructor(src){this.src=src;recordings.push(this)}
   play(){return failRecording?Promise.reject(Error('test audio unavailable')):Promise.resolve()}
   pause(){this.paused=true}
  };
  const wordButtons=()=>doc().querySelectorAll('[data-action="speak"]');
  wordButtons()[0].click();assert(recordings.at(-1).src.endsWith('/words/u1-1.mp3'),'word click selects its own two-reading recording');
  const firstRecording=recordings.at(-1);wordButtons()[1].click();
  assert(firstRecording.paused&&recordings.at(-1).src.endsWith('/words/u1-2.mp3'),'new word stops the previous original recording');
  firstRecording.onended?.();assert(wordButtons()[1].classList.contains('is-speaking'),'old audio callbacks cannot reset a newer recording');
  failRecording=true;wordButtons()[0].click();await Promise.resolve();
  assert(!doc().getElementById('speech-note').hidden&&audioSource().value==='textbook','failed original playback reports an error and keeps the chosen source');
  failRecording=false;
  const autoRead=()=>doc().querySelector('[data-action="auto-read"]');
  assert(autoRead(),'word list offers sequential automatic reading');
  autoRead().click();const queueAudio=recordings.at(-1),firstQueueEnded=queueAudio.onended;
  assert(queueAudio.src.endsWith('/words/u1-1.mp3')&&autoRead().textContent==='暂停朗读','auto reading begins with the first current entry');
  firstQueueEnded();assert(queueAudio.src.endsWith('/words/u1-2.mp3'),'original playback advances in order using the same media element');
  assert(doc().querySelector('.reading-current .word-button')?.dataset.id==='u1-2','automatic reading highlights the current word');
  autoRead().click();const pausedSource=queueAudio.src;queueAudio.onended?.();
  assert(queueAudio.paused&&queueAudio.src===pausedSource&&autoRead().textContent==='继续朗读','pause stops playback and ignores stale completion');
  autoRead().click();assert(recordings.at(-1)===queueAudio&&queueAudio.src===pausedSource,'resume restarts the current word on the unlocked media element');
  for(let i=1;i<21;i++)queueAudio.onended();
  assert(autoRead().textContent==='自动朗读'&&doc().querySelector('[data-action="stop-reading"]').hidden,'automatic reading stops after the last entry');
  autoRead().click();const manualCancel=recordings.at(-1).onended;wordButtons()[2].click();const manualAudio=recordings.at(-1);manualCancel();
  assert(autoRead().textContent==='自动朗读'&&recordings.at(-1)===manualAudio&&manualAudio.src.endsWith('/words/u1-3.mp3'),'manual word playback cancels the queue without late advancement');
  failRecording=true;autoRead().click();await Promise.resolve();
  assert(autoRead().textContent==='自动朗读'&&!doc().getElementById('speech-note').hidden,'recording failure ends the queue with an explanation');
  failRecording=false;autoRead().click();frame.contentWindow.dispatchEvent(new frame.contentWindow.Event('pagehide'));
  assert(autoRead().textContent==='自动朗读'&&doc().querySelector('[data-action="stop-reading"]').hidden,'leaving the page cancels the queue instead of preserving a stopped active state');
  autoRead().click();doc().querySelector('[data-unit="4"]').click();
  assert(autoRead().textContent==='自动朗读'&&doc().querySelector('[data-id="u4-6"] .word-text')?.textContent==='child / Children','unit switch cancels reading and child displays both forms');
  checkLayout();doc().querySelector('[data-action="flag"][data-id="u4-6"]').click();doc().querySelector('[data-action="again"]').click();
  autoRead().click();const childAudio=recordings.at(-1);childAudio.onended();
  assert(childAudio.src.endsWith('/words/u4-6.mp3')&&doc().getElementById('auto-reading-status').textContent.includes('1 条'),'filtered automatic reading plays only the visible review entries');
  doc().querySelector('[data-action="practice"]').click();doc().getElementById('play-recording').click();doc().querySelector('[data-action="reveal"]').click();
  assert(doc().querySelector('.answer-word').textContent==='child / Children','dictation answer includes the singular and plural matching its original recording');checkPracticeViewport();
  doc().querySelector('[data-unit="1"]').click();
  frame.contentWindow.Audio=NativeAudio;
  const nativeClip=new Audio(prefix+'english/audio/textbook/words/u1-1.mp3');nativeClip.preload='metadata';nativeClip.muted=true;
  await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('textbook MP3 metadata timeout: state '+nativeClip.networkState+'/'+nativeClip.readyState+' '+nativeClip.currentSrc)),5000);nativeClip.onloadedmetadata=()=>{clearTimeout(timeout);resolve()};nativeClip.onerror=()=>{clearTimeout(timeout);reject(Error('textbook MP3 cannot decode'))};nativeClip.load()});
  assert(nativeClip.duration>1&&nativeClip.duration<5,'published MP3 is a decodable short word clip');nativeClip.pause();nativeClip.removeAttribute('src');nativeClip.load();
  audioSource().value='system';audioSource().dispatchEvent(new frame.contentWindow.Event('change',{bubbles:true}));
  const memoryMenu=doc().querySelector('#units [data-action="memory"]');
  assert(memoryMenu&&doc().querySelector('[data-unit="0"]').nextElementSibling===memoryMenu,'memory menu follows proper nouns');
  assert(!doc().querySelector('#app [data-action="memory"]'),'memory enters through its navigation menu');
  memoryMenu.click();
  assert(doc().querySelector('#units [data-action="memory"]').getAttribute('aria-current')==='true'&&!doc().querySelector('[data-unit][aria-current="true"]'),'memory navigation shows the active section');
  assert(doc().getElementById('breadcrumb').textContent.includes('串词速记'),'memory breadcrumb matches the selected menu');
  assert(new Set([...doc().querySelectorAll('.memory-entry')].map(row=>row.dataset.id)).size===165,'memory map covers every photographed vocabulary entry');checkLayout();
  assert(doc().querySelector('.memory-entry[data-id="u4-6"] .memory-word-text').textContent==='child / Children','memory map displays both forms too');
  const laterStar=doc().querySelector('[data-group="animal-friends"] [data-action="flag"][data-id="u6-3"]');laterStar.focus({preventScroll:true});laterStar.click();
  assert(doc().activeElement.closest('.memory-group')?.dataset.group==='animal-friends','repeated vocabulary keeps focus in the same memory group');
  doc().querySelector('[data-action="conceal"]').click();
  assert(!doc().querySelector('.memory-ipa,.memory-tip')&&[...doc().querySelectorAll('.memory-word-text')].every(word=>!word.textContent.trim()),'memory recall removes spelling, phonetics and spelling hints');
  doc().querySelector('[data-action="conceal"]').click();
  const memorySearch=doc().getElementById('memory-search');memorySearch.value='rain';memorySearch.dispatchEvent(new frame.contentWindow.Event('input',{bubbles:true}));
  assert([...doc().querySelectorAll('.memory-entry')].filter(row=>!row.hidden).every(row=>row.querySelector('.memory-word-text').textContent.includes('rain')),'memory search filters the real entries');
  memorySearch.value='nothing-matches-123';memorySearch.dispatchEvent(new frame.contentWindow.Event('input',{bubbles:true}));assert(!doc().getElementById('memory-empty').hidden,'memory search explains no results');
  memorySearch.value='';memorySearch.dispatchEvent(new frame.contentWindow.Event('input',{bubbles:true}));
  const memoryGroupTitle=doc().querySelector('.memory-group h3').textContent;
  const memoryFirstWord=doc().querySelector('.memory-group .memory-entry').dataset.id;
  doc().querySelector('[data-action="practice-group"]').click();
  assert(doc().querySelector('.practice-title p').textContent.includes(memoryGroupTitle),'group dictation names its cross-unit source');
  doc().getElementById('listen').click();doc().querySelector('[data-action="reveal"]').click();
  assert(doc().querySelector('[data-action="speak"]').dataset.id===memoryFirstWord,'group practice uses that group vocabulary');
  assert(doc().querySelector('#units [data-action="memory"]').getAttribute('aria-current')==='true','group practice stays under the memory menu');
  doc().querySelector('#app [data-action="memory"]').click();assert(doc().querySelector('.memory-group'),'group practice returns to memory map');
  doc().querySelector('[data-unit="1"]').click();
  doc().querySelector('[data-unit="2"]').click();doc().querySelector('[data-action="practice"]').click();
  assert(doc().querySelector('.practice-listening .prompt-label').getBoundingClientRect().top>=doc().querySelector('.practice-listening').getBoundingClientRect().top,'long mobile prompts do not overflow above the scrollable listening pane');
  doc().querySelector('[data-unit="1"]').click();
  assert(doc().querySelector('.ipa').textContent.includes('hæpi'),'English phonetics visible');
  assert(doc().querySelector('.word-card .ph-vowel')?.textContent==='a','phonics colors the vowel in happy');
  const vowelColor=frame.contentWindow.getComputedStyle(doc().querySelector('.word-card .ph-vowel')).color;
  const accent=()=>doc().getElementById('accent-select'),roles=()=>doc().getElementById('voice-select');
  const gbVoice={voiceURI:'test-gb-daniel',name:'Daniel',lang:'en-GB',localService:true,default:true};
  const usVoice={voiceURI:'test-us-samantha',name:'Samantha',lang:'en-US',localService:true,default:false};
  const usRole={voiceURI:'test-us-alex',name:'Alex',lang:'en-US',localService:true,default:false};
  let testVoices=[gbVoice,usVoice,usRole],spoken=[],cancellations=0;
  const installSpeech=()=>{
   const win=frame.contentWindow,speech=win.speechSynthesis;
   Object.defineProperty(speech,'getVoices',{configurable:true,value:()=>testVoices});
   Object.defineProperty(speech,'cancel',{configurable:true,value:()=>{cancellations++}});
   Object.defineProperty(speech,'speak',{configurable:true,value:utterance=>{spoken.push(utterance);utterance.onend?.()}});
   win.SpeechSynthesisUtterance=class {constructor(text){this.text=text}};
   speech.dispatchEvent(new win.Event('voiceschanged'));
  };
  const change=(element,value)=>{element.value=value;element.dispatchEvent(new frame.contentWindow.Event('change',{bubbles:true}))};
  installSpeech();change(audioSource(),'textbook');doc().querySelector('[data-unit="0"]').click();
  const beforeFallback=spoken.length;doc().querySelector('[data-action="speak"]').click();
  assert(spoken.length===beforeFallback+1&&spoken.at(-1).text==='China'&&!doc().getElementById('speech-note').hidden,'unrecorded proper noun explicitly uses device pronunciation');
  doc().querySelector('[data-action="practice"]').click();doc().getElementById('play-recording').click();
  assert(!doc().getElementById('speech-note').hidden,'proper-noun dictation keeps the original-source fallback explanation');checkPracticeViewport();
  if(frame.clientWidth<=760){doc().getElementById('reading-settings-toggle').click();checkPracticeViewport();doc().getElementById('reading-settings-toggle').click();}
  doc().querySelector('[data-unit="1"]').click();change(audioSource(),'system');
  testVoices=[usVoice];installSpeech();assert(audioSource().value==='system','audio source preference survives refresh');assert(accent().value==='en-US','automatic default uses available American voice');
  testVoices=[gbVoice,usVoice,usRole];installSpeech();assert(accent().value==='en-GB','late British voices regain automatic default');
  change(accent(),'en-US');
  assert(roles().options.length===3,'American role list excludes British voices');
  const familiar=[
   {voiceURI:'test-us-google',name:'Google US English',lang:'en-US'},
   {voiceURI:'test-us-eddy',name:'Eddy (English (United States))',lang:'en-US'},
   {voiceURI:'test-us-aaron',name:'Aaron',lang:'en-US'},
  ];
  testVoices=[{voiceURI:'test-robot',name:'Zarvox',lang:'en-US'},gbVoice,usRole,usVoice,...familiar];installSpeech();
  assert([...roles().options].slice(1,4).map(option=>option.value).join(',')==='test-us-aaron,test-us-eddy,test-us-google','familiar voices lead the actual dropdown');
  doc().getElementById('voice-preview').click();assert(spoken.at(-1).voice===familiar[2],'automatic playback matches the first recommended voice');
  testVoices=[gbVoice,usVoice,usRole];installSpeech();
  change(roles(),'test-us-alex');doc().getElementById('voice-preview').click();
  assert(spoken.at(-1).voice===usRole&&spoken.at(-1).lang==='en-US','preview uses selected American role');
  doc().querySelector('[data-action="speak"]').click();
  assert(spoken.at(-1).text==='happy'&&spoken.at(-1).voice===usRole,'word audio uses selected role');
  assert(cancellations>=2,'new speech cancels previous playback');
  const beforeDeviceQueue=spoken.length;autoRead().click();
  assert(spoken.length===beforeDeviceQueue+21&&spoken.slice(beforeDeviceQueue,beforeDeviceQueue+3).map(item=>item.text).join(',')==='happy,sad,angry','automatic device speech waits for each word and keeps textbook order');
  assert(spoken.slice(beforeDeviceQueue).every(item=>item.voice===usRole)&&autoRead().textContent==='自动朗读','automatic device speech retains the selected role and finishes');
  Object.defineProperty(frame.contentWindow.speechSynthesis,'speak',{configurable:true,value:utterance=>spoken.push(utterance)});
  autoRead().click();spoken.at(-1).onerror({error:'interrupted'});
  assert(autoRead().textContent==='自动朗读','an interrupted device voice does not leave automatic reading stuck');installSpeech();


  change(accent(),'en-GB');doc().getElementById('voice-preview').click();
  assert(spoken.at(-1).voice===gbVoice,'British selection uses British voice');
  testVoices=[gbVoice];installSpeech();change(accent(),'en-US');
  const countBeforeMissing=spoken.length;doc().querySelector('[data-action="speak"]').click();
  assert(roles().disabled&&spoken.length===countBeforeMissing,'missing American voice does not play British audio');
  assert(doc().getElementById('speech-note').textContent.includes('美式'),'missing accent has an explicit message');
  testVoices=[gbVoice,usVoice,usRole];installSpeech();change(roles(),'test-us-alex');

  doc().querySelector('[data-action="conceal"]').click();
  assert([...doc().querySelectorAll('.word-text')].every(e=>!e.textContent.trim()),'concealed list removes spelling');
  assert(!doc().querySelector('.word-card .ph-vowel,.word-card .ph-group'),'concealed list removes colored answer hints');
  doc().querySelector('[data-action="practice"]').click();
  assert(!doc().querySelector('.answer-word')&&!doc().querySelector('[data-action="grade-right"]'),'paper practice hides answers and grading');checkLayout();
  const actionButtons=()=>[...doc().querySelectorAll('.practice-checking .practice-actions button')];
  const settingsToggle=doc().getElementById('reading-settings-toggle');
  if(frame.clientWidth<=760){
   assert(settingsToggle?.getAttribute('aria-expanded')==='false','mobile dictation collapses reading settings on entry');
   assert(doc().getElementById('reading-settings-content').getBoundingClientRect().height===0,'collapsed settings hide the controls');
   checkPracticeViewport();settingsToggle.click();
   assert(settingsToggle.getAttribute('aria-expanded')==='true'&&doc().getElementById('source-select').getBoundingClientRect().height>0,'settings can expand without leaving the question');
   checkPracticeViewport();settingsToggle.click();checkPracticeViewport();
  }
  const beforeSettingsKey=spoken.length;
  for(const value of ['Enter',' ']){
   const event=new frame.contentWindow.KeyboardEvent('keydown',{key:value,bubbles:true,cancelable:true});
   settingsToggle.dispatchEvent(event);
   assert(!event.defaultPrevented&&spoken.length===beforeSettingsKey,'settings toggle keeps native keyboard activation: '+value);
  }
  assert(actionButtons().length===1&&actionButtons()[0].textContent==='播放录音','dictation starts with one long playback action');
  const mainButtonRect=actionButtons()[0].getBoundingClientRect();
  const spokenBeforeButton=spoken.length;actionButtons()[0].click();
  assert(spoken.length===spokenBeforeButton+1&&spoken.at(-1).text==='happy'&&!doc().querySelector('.answer-word'),'main playback repeats the question without revealing it');
  assert(actionButtons().length===1&&actionButtons()[0].dataset.action==='reveal','main playback changes into reveal');
  assert(actionButtons()[0].getBoundingClientRect().left===mainButtonRect.left&&actionButtons()[0].getBoundingClientRect().width===mainButtonRect.width,'play and reveal use the same long button position');
  const key=(value,options={})=>frame.contentWindow.document.dispatchEvent(new frame.contentWindow.KeyboardEvent('keydown',{key:value,bubbles:true,cancelable:true,...options}));
  const question=()=>doc().querySelector('.practice-card-top').textContent;
  const cardHeight=doc().querySelector('.practice-card').getBoundingClientRect().height;
  const navTop=doc().querySelector('.question-navigation')?.getBoundingClientRect().top;
  key('Enter');assert(doc().querySelector('.answer-word')?.textContent==='happy','Enter reveals after playback');
  assert(actionButtons().map(button=>button.dataset.action).join(',')==='grade-wrong,grade-right','revealed buttons offer the two grading choices');
  checkPracticeViewport();
  const spokenAfterReveal=spoken.length;doc().getElementById('listen').click();
  assert(spoken.length===spokenAfterReveal+1&&spoken.at(-1).text==='happy','repeat listening remains usable after revealing');
  assert(doc().querySelector('.practice-card').getBoundingClientRect().height===cardHeight,'revealing the answer does not resize the card');
  assert(doc().querySelector('.question-navigation').getBoundingClientRect().top===navTop,'answer reveal does not move navigation');
  const spokenBeforeReplay=spoken.length;key(' ');assert(spoken.length===spokenBeforeReplay+1&&spoken.at(-1).text==='happy','Space replays the current word');
  key('Enter',{repeat:true});assert(question().includes('1 / 5'),'held Enter does not grade repeatedly');
  key('ArrowRight');assert(question().includes('2 / 5')&&!doc().querySelector('.answer-word'),'Right moves to a hidden next question');
  const selectKey=new frame.contentWindow.KeyboardEvent('keydown',{key:'ArrowLeft',bubbles:true,cancelable:true});accent().dispatchEvent(selectKey);
  assert(question().includes('2 / 5')&&!selectKey.defaultPrevented,'voice dropdown keeps its native keyboard behavior');
  key('ArrowLeft');assert(question().includes('1 / 5'),'Left moves to the previous question');
  key('Enter');key('Enter');assert(question().includes('2 / 5'),'Enter grades a revealed answer and advances');
  assert(actionButtons()[0].textContent==='播放录音','new question resets the main action to playback');checkPracticeViewport();
  key('ArrowLeft');assert(doc().querySelector('.answer-word')?.textContent==='happy','revisiting a graded question shows its answer');
  doc().getElementById('grade-wrong').click();
  assert(JSON.parse(frame.contentWindow.localStorage.getItem('english-notebook-progress-v1')).counts['u1-1']===1,'changing a grade does not count the same attempt twice');
  doc().querySelector('[data-action="study"]').click();doc().querySelector('[data-action="practice"]').click();
  for(let step=0;step<5;step++)key('ArrowRight');
  assert(question().includes('5 / 5'),'Right stops at the last ungraded question');
  key('Enter');key('Enter');key('Enter');assert(question().includes('1 / 5')&&!doc().querySelector('.summary-body'),'skipped questions are not silently marked complete');
  doc().querySelector('[data-action="study"]').click();doc().querySelector('[data-action="practice"]').click();
  for(let i=0;i<5;i++){
   doc().getElementById('listen').click();doc().querySelector('[data-action="reveal"]').click();
   assert(doc().querySelector('.answer-word').textContent===['happy','sad','angry','tired','boy'][i],'paper practice follows textbook sequence');
   doc().querySelector(i===0?'[data-action="grade-wrong"]':'[data-action="grade-right"]').click();
  }
  assert(doc().querySelector('.summary-stats').textContent.includes('4'),'manual results summarized');
  const summaryVowel=doc().querySelector('.result-row strong .ph-vowel');
  assert(frame.contentWindow.getComputedStyle(summaryVowel).color===vowelColor,'summary retains phonics coloring');
  doc().querySelector('[data-action="retry"]').click();doc().getElementById('listen').click();doc().querySelector('[data-action="reveal"]').click();doc().querySelector('[data-action="grade-right"]').click();
  assert(doc().querySelector('[data-action="next"]'),'retry preserves next group');
  doc().querySelector('[data-action="next"]').click();doc().getElementById('listen').click();doc().querySelector('[data-action="reveal"]').click();
  assert(doc().querySelector('.answer-word').textContent==='girl','retry continues original unit at sixth entry');
  await load(()=>frame.contentWindow.location.reload());
  assert(doc().querySelector('[data-action="flag"]').getAttribute('aria-pressed')==='true','English review flags persist on refresh');
  installSpeech();assert(audioSource().value==='system','audio source preference survives refresh');assert(accent().value==='en-US'&&roles().value==='test-us-alex','accent and voice role survive refresh');
  await load(()=>doc().querySelector('a[href="../index.html"]').click());assert(doc().querySelectorAll('.card').length===4,'English returns to homepage');
  await load(()=>doc().querySelector('a[href="lab/index.html"]').click());
  assert(frame.contentWindow.location.pathname==='/repo-name/lab/index.html','lab navigation');assert(doc().querySelector('.next-target')?.dataset.place==='bench','lab JavaScript started');assert([...doc().styleSheets].some(sheet=>sheet.href?.endsWith('/lab/visual.css')&&sheet.cssRules.length>0),'lab stylesheet loaded');checkLayout();
  await load(()=>doc().querySelector('a[href="making.html"]').click());assert(doc().title,'making page loads');
  await load(()=>doc().querySelector('a[href="index.html"]').click());
  await load(()=>doc().querySelector('a[href="../index.html"]').click());assert(doc().querySelectorAll('.card').length===4,'lab returns to homepage');
  await load(()=>doc().querySelector('a[href="tank/index.html?map=city"]').click());assert(frame.contentWindow.eval('currentMap')==='city','city query survives prefix');assert(doc().querySelector('[data-map="city"]').getAttribute('aria-pressed')==='true','city selection visible');checkLayout();
  doc().getElementById('action').click();assert(frame.contentWindow.eval('mode')==='playing','tank script loaded and start works');assert(frame.contentWindow.eval('allies.length')===10,'ten allies loaded');
  doc().querySelector('[data-map="field"]').click();assert(frame.contentWindow.eval('currentMap')==='field','switch to original map');
  doc().querySelector('[data-map="city"]').click();assert(frame.contentWindow.eval('currentMap')==='city','switch back to city');
  await load(()=>doc().querySelector('a[href="../index.html"]').click());assert(doc().querySelectorAll('.card').length===4,'tank returns to homepage');
  await load(()=>doc().querySelector('a[href="mine/index.html"]').click());assert(doc().getElementById('menu').open,'mine menu loads');checkLayout();
  doc().getElementById('start').click();assert(frame.contentWindow.eval('playing'),'mine starts');
  frame.contentWindow.eval("state.tiles[3][state.x]='dirt'");
  frame.contentWindow.dispatchEvent(new frame.contentWindow.KeyboardEvent('keydown',{code:'Space'}));
  frame.contentWindow.dispatchEvent(new frame.contentWindow.KeyboardEvent('keydown',{code:'ArrowDown'}));
  assert(frame.contentWindow.eval('state.y')===3,'mine movement before reload');
  await load(()=>frame.contentWindow.location.reload());assert(doc().getElementById('resume').hidden===false,'saved mine offers resume');doc().getElementById('resume').click();assert(frame.contentWindow.eval('state.y')===3,'mine restores position');
  await load(()=>doc().querySelector('a[href="../index.html"]').click());assert(doc().querySelectorAll('.card').length===4,'mine returns to homepage');
  document.body.innerHTML='<p>CHECK_PASS: repository prefix, homepage navigation, lab resources, teaching page, tank JavaScript, city query, both map selections, mine resources and persistent save, return links, English paper dictation, responsive layout</p>';
 }catch(error){document.body.innerHTML='<p>CHECK_FAIL: '+error.message+'</p>'}
})();
</script>`;
async function checkDeployment(){
 const missing=[];
 const server=http.createServer((req,res)=>{
  const url=new URL(req.url,'http://localhost');
  if(url.pathname==='/repo-name/__verify.html'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end(browserCheck);return;}
  if(url.pathname==='/favicon.ico'){res.writeHead(204);res.end();return;}
  const relative=decodeURIComponent(url.pathname.slice('/repo-name/'.length)),file=path.resolve(root,!relative||relative.endsWith('/')?relative+'index.html':relative);
  if(!url.pathname.startsWith('/repo-name/')||!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){missing.push(url.pathname);res.writeHead(404);res.end();return;}
  res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.mjs':'text/javascript','.svg':'image/svg+xml','.mp3':'audio/mpeg'})[path.extname(file)]||'text/plain');fs.createReadStream(file).pipe(res);
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'arcade-deploy-check-'));
 try{
  for(const [width,height] of [[1280,900],[390,740],[375,667],[320,568]]){
   const output=await new Promise((resolve,reject)=>{
    const child=spawn(chrome,['--headless','--no-sandbox','--disable-gpu','--no-first-run','--user-data-dir='+path.join(dir,String(width)),'--window-size=1400,1800','--timeout=12000','--virtual-time-budget=15000','--dump-dom','http://127.0.0.1:'+server.address().port+'/repo-name/__verify.html?width='+width+'&height='+height],{stdio:['ignore','pipe','ignore']});let result='';
    const timeout=setTimeout(()=>child.kill('SIGKILL'),20000);
    child.stdout.on('data',data=>{result+=data;if(/<p>CHECK_(PASS|FAIL):/.test(result))child.kill('SIGKILL')});
    child.on('error',error=>{clearTimeout(timeout);reject(error)});child.on('close',()=>{clearTimeout(timeout);resolve(result)});
   });
   if(!output.includes('<p>CHECK_PASS:'))throw Error(output.match(/<p>CHECK_FAIL:[^<]+/)?.[0]||'Browser prefix check did not complete');
   console.log(width+'x'+height+': '+output.match(/<p>(CHECK_PASS:[^<]+)/)[1]);
  }
  if(missing.length)throw Error('Missing resources: '+missing.join(', '));
 }finally{await new Promise(resolve=>server.close(resolve));fs.rmSync(dir,{recursive:true,force:true});}
}
(async()=>{
 if(!process.argv.includes('--deployment-only')){
  await run(process.execPath,[path.join(root,'lab/check.cjs')]);
  await run(process.execPath,[path.join(root,'tank/check.cjs')]);
  await run(process.execPath,[path.join(root,'mine/core.test.cjs')]);
  await run(process.execPath,[path.join(root,'mine/check.cjs')]);
  await run(process.execPath,['--test',path.join(root,'english/tests/core.test.mjs'),path.join(root,'english/tests/vocabulary.test.mjs'),path.join(root,'english/tests/phonics.test.mjs'),path.join(root,'english/tests/memory.test.mjs'),path.join(root,'english/tests/textbook-audio.test.mjs')]);
 }
 await checkDeployment();
})().catch(error=>{console.error(error);process.exitCode=1;});
