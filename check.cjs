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
  await go(prefix);assert(doc().querySelectorAll('.card').length===2,'two games on homepage');checkLayout();
  for(const link of doc().querySelectorAll('a'))assert(link.href.startsWith(prefix),'link escapes repository prefix');
  await load(()=>doc().querySelector('a[href="lab/index.html"]').click());
  assert(frame.contentWindow.location.pathname==='/repo-name/lab/index.html','lab navigation');assert(doc().querySelector('.next-target')?.dataset.place==='bench','lab JavaScript started');assert([...doc().styleSheets].some(sheet=>sheet.href?.endsWith('/lab/visual.css')&&sheet.cssRules.length>0),'lab stylesheet loaded');checkLayout();
  await load(()=>doc().querySelector('a[href="making.html"]').click());assert(doc().title,'making page loads');
  await load(()=>doc().querySelector('a[href="index.html"]').click());
  await load(()=>doc().querySelector('a[href="../index.html"]').click());assert(doc().querySelectorAll('.card').length===2,'lab returns to homepage');
  await load(()=>doc().querySelector('a[href="tank/index.html?map=city"]').click());assert(frame.contentWindow.eval('currentMap')==='city','city query survives prefix');assert(doc().querySelector('[data-map="city"]').getAttribute('aria-pressed')==='true','city selection visible');checkLayout();
  doc().getElementById('action').click();assert(frame.contentWindow.eval('mode')==='playing','tank script loaded and start works');assert(frame.contentWindow.eval('allies.length')===10,'ten allies loaded');
  doc().querySelector('[data-map="field"]').click();assert(frame.contentWindow.eval('currentMap')==='field','switch to original map');
  doc().querySelector('[data-map="city"]').click();assert(frame.contentWindow.eval('currentMap')==='city','switch back to city');
  await load(()=>doc().querySelector('a[href="../index.html"]').click());assert(doc().querySelectorAll('.card').length===2,'tank returns to homepage');
  document.body.innerHTML='<p>CHECK_PASS: repository prefix, homepage navigation, lab resources, teaching page, tank JavaScript, city query, both map selections, return links, responsive layout</p>';
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
  res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript'})[path.extname(file)]||'text/plain');fs.createReadStream(file).pipe(res);
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
 }
 await checkDeployment();
})().catch(error=>{console.error(error);process.exitCode=1;});
