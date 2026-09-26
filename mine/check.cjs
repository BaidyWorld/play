// Real Chrome DOM/input checks, including file:// support, without dependencies.
const fs=require('fs'),os=require('os'),path=require('path'),{spawn}=require('child_process');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'mine-check-'));
const test=String.raw`<script>
try{
 const assert=(ok,msg)=>{if(!ok)throw Error(msg)};
 assert(document.getElementById('menu').open,'menu opens initially');
 document.getElementById('start').click();
 assert(!document.getElementById('menu').open&&playing,'start enters game');
 const before=state.y;state.tiles[3][state.x]='dirt';
 window.dispatchEvent(new KeyboardEvent('keydown',{code:'Space',bubbles:true}));
 assert(state.tiles[3][state.x]==='air','space mines facing tile');
 window.dispatchEvent(new KeyboardEvent('keydown',{code:'ArrowDown',bubbles:true}));
 assert(state.y===before+1,'keyboard movement');
 document.querySelector('[data-tool="torch"]').click();document.getElementById('use').click();
 assert(state.torches.length===1,'torch button places at player');
 document.getElementById('mapButton').click();assert(document.getElementById('info').open,'map opens');
 let y=state.y;window.dispatchEvent(new KeyboardEvent('keydown',{code:'ArrowUp',bubbles:true}));assert(state.y===y,'dialog blocks movement');
 document.getElementById('closeInfo').click();document.getElementById('bagButton').click();assert(document.getElementById('infoBody').textContent.includes('石块'),'bag content');document.getElementById('closeInfo').click();
 document.querySelector('[data-move="0,-1"]').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));assert(state.y===2,'touch movement');
 document.getElementById('pause').click();assert(document.getElementById('menu').open,'pause opens menu');
 document.getElementById('resume').click();assert(playing&&!document.getElementById('menu').open,'resume');
 state.y=3;state.tiles[3][state.x]='air';state.tiles[3][state.x+1]='dirt';selectTool('pick');render();
 const r=canvas.getBoundingClientRect(),p=screenTile(state.x+1,3);
 canvas.dispatchEvent(new PointerEvent('pointerdown',{clientX:r.left+p.x+tile/2,clientY:r.top+p.y+tile/2,bubbles:true}));
 assert(state.tiles[3][state.x+1]==='air','canvas hit testing at actual viewport size');
 document.getElementById('pause').click();document.getElementById('seed').value='new-test';document.getElementById('start').click();
 assert(document.getElementById('replace').open,'new game confirms save replacement');
 document.getElementById('cancelReplace').click();assert(state.seed==='4149','cancel keeps game');
 document.getElementById('start').click();document.getElementById('confirmReplace').click();assert(state.seed==='new-test'&&state.crystals===0,'new seed resets');
 const originalSetItem=Storage.prototype.setItem;Storage.prototype.setItem=()=>{throw Error('storage disabled')};save();assert(document.getElementById('saveStatus').textContent.includes('未允许保存'),'storage denial is visible and nonfatal');Storage.prototype.setItem=originalSetItem;
 state.tiles.forEach(row=>row.forEach((t,x)=>{if(t==='crystal')row[x]='air'}));state.crystals=3;state.x=Mine.HOME-1;state.y=2;go(1,0);
 assert(state.won&&document.getElementById('info').open&&document.getElementById('infoTitle').textContent.includes('灯塔亮了'),'victory dialog');
 document.getElementById('closeInfo').click();assert(!playing,'completed mine cannot be modified');
 assert(document.documentElement.scrollWidth<=innerWidth,'no horizontal overflow');
 assert(canvas.width>0&&canvas.height>0,'canvas rendered');
 for(const b of document.querySelectorAll('.tool,[data-move],#use')){const r=b.getBoundingClientRect();assert(r.width>=44&&r.height>=44,'touch targets at least 44px: '+b.textContent);assert(r.left>=0&&r.right<=innerWidth,'controls not clipped');}
 document.body.innerHTML='<p>CHECK_PASS: menu, keyboard mining/movement, torch, map, inventory, modal pause, touch, canvas coordinates, new-game confirmation, layout</p>';
}catch(e){document.body.innerHTML='<p>CHECK_FAIL: '+e.message+'</p>'}
parent.postMessage(document.body.textContent,'*');
</script>`;
(async()=>{try{
 let source=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');
 source=source.replace('<link rel="stylesheet" href="style.css">','<style>'+fs.readFileSync(path.join(__dirname,'style.css'),'utf8')+'</style>');
 for(const name of ['core.js','game.js'])source=source.replace('<script src="'+name+'"></script>','<script>'+fs.readFileSync(path.join(__dirname,name),'utf8')+'</script>');
 source=source.replace('</body>',test+'</body>');
 for(const width of [1280,390,375,320]){
  fs.writeFileSync(path.join(dir,'test.html'),'<body style="margin:0"><script>onmessage=e=>document.body.textContent=e.data</script><iframe style="border:0;width:'+width+'px;height:1000px" srcdoc="'+source.replace(/&/g,'&amp;').replace(/"/g,'&quot;')+'"></iframe>');
  const out=await new Promise((resolve,reject)=>{
   const child=spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',['--headless','--no-sandbox','--disable-gpu','--no-first-run','--user-data-dir='+path.join(dir,'profile-'+width),'--dump-dom','file://'+path.join(dir,'test.html')],{stdio:['ignore','pipe','ignore']});
   let output='';const timer=setTimeout(()=>child.kill('SIGKILL'),20000);
   child.stdout.on('data',data=>{output+=data;if(/CHECK_(PASS|FAIL):/.test(output))child.kill('SIGKILL')});
   child.on('error',error=>{clearTimeout(timer);reject(error)});child.on('close',()=>{clearTimeout(timer);resolve(output)});
  });
  if(!out.includes('CHECK_PASS:'))throw Error(out.match(/CHECK_FAIL:[^<]+/)?.[0]||'Browser check did not complete');
  console.log(width+'px: '+out.match(/CHECK_PASS:[^<]+/)[0]);
 }
}finally{fs.rmSync(dir,{recursive:true,force:true});}

})().catch(error=>{console.error(error);process.exitCode=1;});
