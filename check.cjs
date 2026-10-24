// Run from any directory: node /path/to/mini/check.cjs (macOS + Google Chrome).
const fs=require('fs'),path=require('path'),http=require('http'),os=require('os'),{spawn}=require('child_process');
const root=__dirname,chrome='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
function run(command,args,options={}){return new Promise((resolve,reject)=>{const child=spawn(command,args,{cwd:root,stdio:'inherit',...options});child.on('error',reject);child.on('close',code=>code===0?resolve():reject(Error(command+' exited '+code)));});}
const browserCheck=`<!doctype html><meta charset="utf-8"><body style="margin:0"><iframe id="page" style="border:0;height:1700px"></iframe><script>
(async()=>{
 const assert=(ok,msg)=>{if(!ok)throw Error(msg)},frame=document.getElementById('page'),prefix=location.origin+'/repo-name/';
 frame.style.width=new URLSearchParams(location.search).get('width')+'px';
 const load=action=>new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('page load timeout')),10000);frame.onload=()=>{clearTimeout(timeout);resolve()};action()});
 const go=url=>load(()=>frame.src=url),doc=()=>frame.contentDocument;
 const checkLayout=()=>assert(doc().documentElement.scrollWidth<=frame.clientWidth,'horizontal overflow: '+frame.src);
 try{
  await go(prefix);assert(doc().querySelectorAll('.card').length===4,'three games and English practice on homepage');checkLayout();
  for(const link of doc().querySelectorAll('a'))assert(link.href.startsWith(prefix),'link escapes repository prefix');
  await load(()=>doc().querySelector('a[href="english/index.html"]').click());
  assert(frame.contentWindow.location.pathname==='/repo-name/english/index.html','English navigation keeps repository prefix');
  assert(doc().querySelectorAll('.word-card').length===21,'English modules load and Unit 1 has 21 entries');
  assert([...doc().styleSheets].some(sheet=>sheet.href?.endsWith('/english/styles.css')&&sheet.cssRules.length>0),'English stylesheet loads');checkLayout();
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
  testVoices=[usVoice];installSpeech();assert(accent().value==='en-US','automatic default uses available American voice');
  testVoices=[gbVoice,usVoice,usRole];installSpeech();assert(accent().value==='en-GB','late British voices regain automatic default');
  change(accent(),'en-US');
  assert(roles().options.length===3,'American role list excludes British voices');
  change(roles(),'test-us-alex');doc().getElementById('voice-preview').click();
  assert(spoken.at(-1).voice===usRole&&spoken.at(-1).lang==='en-US','preview uses selected American role');
  doc().querySelector('[data-action="speak"]').click();
  assert(spoken.at(-1).text==='happy'&&spoken.at(-1).voice===usRole,'word audio uses selected role');
  assert(cancellations>=2,'new speech cancels previous playback');
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
  for(let i=0;i<5;i++){
   doc().querySelector('[data-action="reveal"]').click();
   assert(doc().querySelector('.answer-word').textContent===['happy','sad','angry','tired','boy'][i],'paper practice follows textbook sequence');
   doc().querySelector(i===0?'[data-action="grade-wrong"]':'[data-action="grade-right"]').click();
  }
  assert(doc().querySelector('.summary-stats').textContent.includes('4'),'manual results summarized');
  const summaryVowel=doc().querySelector('.result-row strong .ph-vowel');
  assert(frame.contentWindow.getComputedStyle(summaryVowel).color===vowelColor,'summary retains phonics coloring');
  doc().querySelector('[data-action="retry"]').click();doc().querySelector('[data-action="reveal"]').click();doc().querySelector('[data-action="grade-right"]').click();
  assert(doc().querySelector('[data-action="next"]'),'retry preserves next group');
  doc().querySelector('[data-action="next"]').click();doc().querySelector('[data-action="reveal"]').click();
  assert(doc().querySelector('.answer-word').textContent==='girl','retry continues original unit at sixth entry');
  await load(()=>frame.contentWindow.location.reload());
  assert(doc().querySelector('[data-action="flag"]').getAttribute('aria-pressed')==='true','English review flags persist on refresh');
  installSpeech();assert(accent().value==='en-US'&&roles().value==='test-us-alex','accent and voice role survive refresh');
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
  res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.mjs':'text/javascript','.svg':'image/svg+xml'})[path.extname(file)]||'text/plain');fs.createReadStream(file).pipe(res);
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'arcade-deploy-check-'));
 try{
  for(const width of [1280,390]){
   const output=await new Promise((resolve,reject)=>{
    const child=spawn(chrome,['--headless','--no-sandbox','--disable-gpu','--no-first-run','--user-data-dir='+path.join(dir,String(width)),'--window-size=1400,1800','--timeout=12000','--virtual-time-budget=15000','--dump-dom','http://127.0.0.1:'+server.address().port+'/repo-name/__verify.html?width='+width],{stdio:['ignore','pipe','ignore']});let result='';
    const timeout=setTimeout(()=>child.kill('SIGKILL'),20000);
    child.stdout.on('data',data=>{result+=data;if(/<p>CHECK_(PASS|FAIL):/.test(result))child.kill('SIGKILL')});
    child.on('error',error=>{clearTimeout(timeout);reject(error)});child.on('close',()=>{clearTimeout(timeout);resolve(result)});
   });
   if(!output.includes('<p>CHECK_PASS:'))throw Error(output.match(/<p>CHECK_FAIL:[^<]+/)?.[0]||'Browser prefix check did not complete');
   console.log(width+'px: '+output.match(/<p>(CHECK_PASS:[^<]+)/)[1]);
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
  await run(process.execPath,['--test',path.join(root,'english/tests/core.test.mjs'),path.join(root,'english/tests/vocabulary.test.mjs'),path.join(root,'english/tests/phonics.test.mjs')]);
 }
 await checkDeployment();
})().catch(error=>{console.error(error);process.exitCode=1;});
