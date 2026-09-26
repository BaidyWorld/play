'use strict';
const $=id=>document.getElementById(id),canvas=$('world'),ctx=canvas.getContext('2d');
const STORAGE='baidi-mine-v1';
let state=Mine.create('4149'),hasSave=false,playing=false,tool='pick',facing=[0,1];
let tile=40,camX=0,camY=-3,viewW=0,viewH=0,hit=null,hover=null,storageOK=true;
try{const raw=localStorage.getItem(STORAGE);if(raw){const saved=Mine.restore(raw);if(saved){state=saved;hasSave=true;}else $('saveStatus').textContent='旧存档无法读取，可以重新探险';}}catch{storageOK=false;}
const icon=name=>`<svg aria-hidden="true"><use href="#i-${name}"/></svg>`;
function notify(message){$('message').textContent=message;}
function save(){
 hasSave=true;
 try{localStorage.setItem(STORAGE,JSON.stringify(state));storageOK=true;$('saveStatus').textContent='✓ 探险进度已保存在本机';}
 catch{storageOK=false;$('saveStatus').textContent='本次可玩 · 浏览器未允许保存';}
}
function hud(){
 $('gems').textContent=state.crystals+' / 3';$('stoneCount').textContent=state.stones;
 $('location').textContent=state.y===2?'地面营地':state.y<12?'浅层矿洞':state.y<21?'岩石深处':'水晶秘境';
 $('depth').textContent='深度 '+(state.y-2)+' m';$('seedLabel').textContent=state.seed;
 $('sceneLabel').textContent=state.won?'营地灯塔 · 已点亮':state.y===2?'营地灯塔 · 等你点亮':'随身绳索已固定 · 可以向上攀爬';
 $('goal1').classList.toggle('done',state.steps>0);$('goal2').classList.toggle('done',state.crystals===3);$('goal3').classList.toggle('done',state.won);
 [...$('gemSlots').children].forEach((e,i)=>e.classList.toggle('found',i<state.crystals));
}
function updateMenu(){
 $('resume').hidden=!hasSave;$('recent').hidden=!hasSave;
 $('resume').textContent=state.won?'看看点亮的灯塔':'继续上次探险';
 $('recent').textContent=`最近游玩：${state.seed} · 水晶 ${state.crystals}/3 · 深度 ${state.y-2} m`;
 $('start').innerHTML=hasSave?'开启新探险 <span>↗</span>':'开始探险 <span>↗</span>';
}
function pause(){playing=false;updateMenu();if(!$('menu').open)$('menu').showModal();}
function resume(){if(!hasSave)return;playing=!state.won;$('menu').close();canvas.focus({preventScroll:true});render();if(state.won)victory();}
function newGame(){
 state=Mine.create($('seed').value);tool='pick';facing=[0,1];hit=null;hover=null;playing=true;
 $('menu').close();if($('replace').open)$('replace').close();selectTool('pick');save();hud();render();
 notify('第一步：点击脚下方块挖开，再按 ↓ 进入矿洞。');canvas.focus({preventScroll:true});
}
function apply(result){
 notify(result.message);if(result.ok){save();hud();render();if(state.won){playing=false;victory();}}
}
function active(){return playing&&!$('menu').open&&!$('info').open&&!$('replace').open;}
function go(dx,dy){if(!active())return;facing=[dx,dy];apply(Mine.move(state,dx,dy));render();}
function useAt(x,y){
 if(!active())return;const result=Mine.act(state,x,y,tool);apply(result);
 if(result.ok&&tool==='pick'&&!matchMedia('(prefers-reduced-motion: reduce)').matches){hit={x,y,time:performance.now()};animateHit();}
}
function use(){useAt(state.x+(tool==='torch'?0:facing[0]),state.y+(tool==='torch'?0:facing[1]));}
function selectTool(name){
 tool=name;document.querySelectorAll('[data-tool]').forEach(b=>{const yes=b.dataset.tool===tool;b.classList.toggle('selected',yes);b.setAttribute('aria-pressed',String(yes));});
 const label={pick:'镐子',stone:'石块',torch:'火把'}[name];$('use').innerHTML=icon(name==='pick'?'pick':name)+`<span>使用${label}</span><small>空格</small>`;
 if(playing)notify({pick:'点击相邻方块挖掘，或面向方块按空格。',stone:'面向地下水使用石块，铺好桥再走过去。',torch:'在脚下放置火把，照亮并标记回家的路。'}[name]);
 render();
}
function info(title){$('infoTitle').textContent=title;$('infoBody').replaceChildren();$('info').showModal();}
function showMap(){
 if(!hasSave){notify('先开始一场探险，再打开地图。');return;}
 info('我的矿洞地图');const c=document.createElement('canvas');c.width=Mine.W*12;c.height=Mine.H*12;c.className='map-canvas';c.setAttribute('aria-label','已探索矿洞地图，白点是你的位置，黄色是地面营地');$('infoBody').append(c);
 const g=c.getContext('2d');g.fillStyle='#263e3c';g.fillRect(0,0,c.width,c.height);
 for(let y=2;y<Mine.H;y++)for(let x=0;x<Mine.W;x++){g.fillStyle=y===2?'#8cb07b':!state.seen[y][x]?'#263e3c':{air:'#728880',dirt:'#be9875',rock:'#8a9c9d',water:'#78b5d0',crystal:'#94ecd5',bridge:'#ceaa6c'}[state.tiles[y][x]];g.fillRect(x*12+1,y*12+1,10,10);}
 g.fillStyle='#f9d782';g.fillRect(Mine.HOME*12+2,26,8,8);g.fillStyle='white';g.beginPath();g.arc(state.x*12+6,state.y*12+6,4,0,Math.PI*2);g.fill();
 const key=document.createElement('p');key.className='map-key';key.textContent=`白点是你 · 黄色是营地 · 深色区域尚未探索。水晶藏在 7、15、23 米深处。你现在位于地下 ${state.y-2} 米。`; $('infoBody').append(key);
}
function showBag(){
 if(!hasSave){notify('先开始探险，就能查看背包。');return;}
 info('矿工的小背包');$('infoBody').innerHTML=`<div class="inventory-row">${icon('gem')}<span>能量水晶</span><b>${state.crystals} / 3</b></div><div class="inventory-row">${icon('stone')}<span>搭桥石块</span><b>${state.stones}</b></div><div class="inventory-row">${icon('torch')}<span>火把（已放 ${state.torches.length} 支）</span><b>∞</b></div><div class="inventory-row">${icon('pick')}<span>耐用镐子 + 随身攀爬绳</span><b>✓</b></div><p class="map-key">挖岩石补充石块，火把可以无限使用。收集三颗水晶后，回到地面中央的灯塔下。</p>`;
}
function victory(){
 info('灯塔亮了，你回来了！');$('infoBody').innerHTML=`<div class="victory-gems">${icon('gem').repeat(3)}</div><p class="win-copy">三颗水晶，照亮了整个营地。<br>你走过了 ${state.steps} 步，留下 ${state.torches.length} 支火把。<br>这次小小的冒险，圆满完成！</p><button class="primary" id="another">再探一座矿洞</button>`;
 $('another').onclick=()=>{$('info').close();$('seed').value=String(Math.floor(Math.random()*90000)+10000);pause();};
}
function screenTile(x,y){return{x:(x-camX)*tile,y:(y-camY)*tile};}
function rect(x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(Math.round(x),Math.round(y),Math.ceil(w),Math.ceil(h));}
function polygon(points,color){ctx.fillStyle=color;ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fill();}
function gem(x,y,size,lit=true){
 const s=size;ctx.save();ctx.translate(x,y);if(lit){ctx.shadowColor='#84f6d4';ctx.shadowBlur=13;}
 polygon([[s*.5,0],[s*.85,s*.28],[s*.77,s*.77],[s*.5,s],[s*.18,s*.74],[s*.12,s*.28]],'#71ceb9');ctx.shadowBlur=0;
 polygon([[s*.5,0],[s*.5,s],[s*.12,s*.28]],'#b8f4d7');polygon([[s*.5,0],[s*.85,s*.28],[s*.5,s*.38]],'#e6ffe0');ctx.restore();
}
function drawTile(x,y,t){
 const p=screenTile(x,y),a=p.x,b=p.y,u=tile,deep=y>15;
 if(t==='air'||t==='bridge'){
  rect(a,b,u,u,deep?'#34484b':'#4d5549');rect(a+2,b+2,u-4,2,'#ffffff08');
  // Every excavated square has climbing rope: the route remains reversible.
  rect(a+u*.48,b,2,u,'#a8956860');rect(a+u*.35,b+u*.25,u*.3,2,'#b5a37a55');rect(a+u*.35,b+u*.7,u*.3,2,'#b5a37a55');
  if(t==='bridge'){rect(a+2,b+u*.76,u-4,u*.17,'#c3a578');for(let k=0;k<4;k++)rect(a+k*u/4,b+u*.76,2,u*.17,'#766851');}
 }else{
  const rock=t==='rock',base=t==='water'?'#5794a4':rock?(deep?'#637c80':'#85908a'):t==='crystal'?'#647f79':deep?'#8a8171':'#ac8865';
  rect(a,b,u,u,base);rect(a,b,u,3,'#ffffff17');rect(a,b,3,u,'#ffffff0a');rect(a,b+u-3,u,3,'#182d352b');rect(a+u-3,b,3,u,'#182d3520');
  const n=(x*17+y*31)%13;
  if(t==='water'){rect(a+5,b+u*.35,u*.43,2,'#a8e0d1');rect(a+u*.45,b+u*.68,u*.36,2,'#8ac8c6');}
  else{rect(a+7+n/2,b+8,u*.2,3,'#ffffff17');rect(a+u*.6,b+u*.6+n/3,5,4,'#1c36361c');if(rock){rect(a+u*.2,b+u*.62,u*.24,2,'#344d502b');rect(a+u*.55,b+u*.28,2,u*.21,'#344d502b');}}
  if(t==='crystal')gem(a+u*.2,b+u*.13,u*.63);
  if(y===3){rect(a,b,u,5,'#709456');rect(a+2,b+5,u*.35,3,'#648b51');}
  const d=state.damage[x+','+y];if(d){ctx.strokeStyle='#293d3d';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(a+u*.4,b+5);ctx.lineTo(a+u*.6,b+u*.4);ctx.lineTo(a+u*.3,b+u*.6);ctx.lineTo(a+u*.65,b+u*.9);if(d>1){ctx.moveTo(a+u*.6,b+u*.4);ctx.lineTo(a+u*.9,b+u*.6);}ctx.stroke();}
 }
 const distance=Math.hypot(state.x-x,state.y-y),nearTorch=state.torches.some(p=>Math.hypot(p.x-x,p.y-y)<3.5);
 if(!state.seen[y][x])rect(a,b,u,u,'#233d41dd');else if(distance>4&&!nearTorch)rect(a,b,u,u,'#23363f77');
}
function surface(){
 // Pixel clouds, distant mountains and trees ground the mine in a little world.
 const ground=screenTile(0,3).y;
 rect(0,0,viewW,Math.max(0,ground),'#b8dcd5');
 const sunX=viewW*.77,sunY=ground-4.7*tile;rect(sunX,sunY,28,28,'#f3edb8');
 for(let i=-1;i<6;i++){const x=i*tile*5-camX*5;polygon([[x,ground],[x+tile*3,ground-tile*2.5],[x+tile*6,ground]],'#a4c9b1');polygon([[x+tile,ground],[x+tile*3.2,ground-tile*1.7],[x+tile*6,ground]],'#94bca1');}
 for(const [x,y] of [[3,-1],[10,-2],[18,0],[24,-2]]){const p=screenTile(x,y);rect(p.x,p.y,50,8,'#e6f0dd');rect(p.x+10,p.y-7,29,10,'#e6f0dd');}
 for(const x of [2,6,19,23]){const p=screenTile(x,2);rect(p.x+12,p.y-18,8,tile+18,'#8c7d51');rect(p.x-8,p.y-38,47,23,'#7e9f65');rect(p.x+1,p.y-51,30,20,'#89ad70');rect(p.x-3,p.y-35,23,8,'#91b575');}
 const home=screenTile(Mine.HOME,2),s=tile;
 // Lighthouse, positioned directly above its walkable return square.
 rect(home.x-4,home.y-s*1.6,s+8,s*2.6,'#9b9778');rect(home.x,home.y-s*1.65,s,s*2.65,'#e9dfb1');
 rect(home.x+s*.38,home.y+s*.4,s*.25,s*.6,'#657968');
 rect(home.x-6,home.y-s*2,s+12,9,'#63836f');rect(home.x+2,home.y-s*2.8,s-4,s*.8,state.won?'#fff4a7':'#98b5a2');
 rect(home.x+6,home.y-s*2.72,s-12,s*.59,state.won?'#ffe395':'#496b64');
 polygon([[home.x-10,home.y-s*2.8],[home.x+s/2,home.y-s*3.4],[home.x+s+10,home.y-s*2.8]],'#6c8d71');
 if(state.won){ctx.fillStyle='#ffed9b30';ctx.beginPath();ctx.moveTo(home.x+s/2,home.y-s*2.4);ctx.lineTo(0,home.y-s*4);ctx.lineTo(0,home.y);ctx.closePath();ctx.fill();}
 const hut=screenTile(Mine.HOME-4,2);rect(hut.x,hut.y-s*.2,s*2,s*1.2,'#c99b66');rect(hut.x+8,hut.y,s*.6,s,'#9d744e');rect(hut.x+s*1.15,hut.y+5,s*.5,s*.5,'#e9d897');polygon([[hut.x-9,hut.y],[hut.x+s,hut.y-s],[hut.x+s*2+9,hut.y]],'#71866b');
 rect(0,ground-5,viewW,5,'#a1b979');
}
function miner(){
 const p=screenTile(state.x,state.y),s=tile/40;ctx.save();ctx.translate(p.x+tile/2,p.y+tile*.92);ctx.scale(s,s);
 rect(-12,-2,27,4,'#1d343848');rect(-10,-13,8,12,'#364d49');rect(3,-13,8,12,'#364d49');rect(-13,-27,26,17,'#c98c48');rect(-17,-24,6,14,'#ab7541');rect(11,-25,6,15,'#f0c28d');rect(-8,-37,19,14,'#ecc393');rect(5,-32,3,3,'#354e47');rect(-11,-43,25,10,'#e4be65');rect(-15,-35,33,4,'#f4d27f');rect(7,-40,9,7,'#fff0b8');
 ctx.save();ctx.translate(facing[0]<0?-17:17,-20);ctx.rotate(facing[0]<0?-.5:.5);if(hit)ctx.rotate(.6);rect(-2,-4,4,23,'#b39160');rect(-9,-7,23,5,'#a7c2bb');rect(9,-4,5,7,'#a7c2bb');ctx.restore();ctx.restore();
}
function render(){
 if(!viewW)return;
 camX=Math.max(0,Math.min(Mine.W-viewW/tile,state.x-viewW/tile/2+.5));
 camY=Math.max(-3,Math.min(Mine.H-viewH/tile,state.y-4.5));
 ctx.clearRect(0,0,viewW,viewH);rect(0,0,viewW,viewH,'#2b4247');surface();
 for(let y=Math.max(3,Math.floor(camY));y<Math.min(Mine.H,Math.ceil(camY+viewH/tile));y++)for(let x=Math.max(0,Math.floor(camX));x<Math.min(Mine.W,Math.ceil(camX+viewW/tile));x++)drawTile(x,y,state.tiles[y][x]);
 for(const t of state.torches){const p=screenTile(t.x,t.y);ctx.save();ctx.shadowColor='#f7c573';ctx.shadowBlur=tile*.8;rect(p.x+tile*.7,p.y+tile*.25,5,8,'#ffdd85');ctx.restore();rect(p.x+tile*.73,p.y+tile*.44,3,12,'#bba176');}
 const target=hover||{x:state.x+facing[0],y:state.y+facing[1]};
 if(playing&&Math.abs(target.x-state.x)+Math.abs(target.y-state.y)<=1){const p=screenTile(target.x,target.y);ctx.strokeStyle='#f7dfa1';ctx.lineWidth=2;ctx.setLineDash([6,4]);ctx.strokeRect(p.x+3,p.y+3,tile-6,tile-6);ctx.setLineDash([]);}
 miner();
 if(hit){const p=screenTile(hit.x,hit.y),age=(performance.now()-hit.time)/260;for(let i=0;i<7;i++){const angle=i*2.4;rect(p.x+tile/2+Math.cos(angle)*age*tile*.7,p.y+tile/2+Math.sin(angle)*age*tile*.7,4*(1-age),4*(1-age),i%2?'#edcf98':'#b4c8ac');}}
}
function animateHit(){if(!hit)return;if(performance.now()-hit.time>260){hit=null;render();return;}render();requestAnimationFrame(animateHit);}
function resize(){const r=canvas.getBoundingClientRect();viewW=r.width;viewH=r.height;tile=viewW<500?34:42;const dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(viewW*dpr);canvas.height=Math.round(viewH*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);ctx.imageSmoothingEnabled=false;render();}
function pointerTile(e){const r=canvas.getBoundingClientRect();return{x:Math.floor((e.clientX-r.left)/tile+camX),y:Math.floor((e.clientY-r.top)/tile+camY)};}
canvas.addEventListener('pointerdown',e=>{if(!active())return;e.preventDefault();canvas.focus({preventScroll:true});const p=pointerTile(e);if(Math.abs(p.x-state.x)+Math.abs(p.y-state.y)===1)facing=[p.x-state.x,p.y-state.y];useAt(p.x,p.y);});
canvas.addEventListener('pointermove',e=>{hover=pointerTile(e);render();});canvas.addEventListener('pointerleave',()=>{hover=null;render();});
document.querySelectorAll('[data-tool]').forEach(b=>b.onclick=()=>selectTool(b.dataset.tool));
document.querySelectorAll('[data-move]').forEach(b=>{b.addEventListener('pointerdown',e=>{e.preventDefault();go(...b.dataset.move.split(',').map(Number));});b.addEventListener('click',e=>{if(e.detail===0)go(...b.dataset.move.split(',').map(Number));});});
$('use').onclick=use;$('mapButton').onclick=showMap;$('bagButton').onclick=showBag;
$('pause').onclick=pause;$('resume').onclick=resume;
$('start').onclick=()=>{if(hasSave)$('replace').showModal();else newGame();};
$('confirmReplace').onclick=newGame;$('cancelReplace').onclick=()=>$('replace').close();
$('closeInfo').onclick=()=>{$('info').close();canvas.focus({preventScroll:true});};
$('menu').addEventListener('cancel',e=>{e.preventDefault();if(hasSave)resume();});
window.addEventListener('keydown',e=>{
 if(e.target instanceof HTMLInputElement||e.target instanceof HTMLTextAreaElement)return;
 if(e.code==='Escape'){if(!$('menu').open&&!$('info').open&&!$('replace').open){e.preventDefault();pause();}return;}
 if(!active())return;
 const dirs={ArrowUp:[0,-1],KeyW:[0,-1],ArrowDown:[0,1],KeyS:[0,1],ArrowLeft:[-1,0],KeyA:[-1,0],ArrowRight:[1,0],KeyD:[1,0]};
 if(dirs[e.code]){e.preventDefault();go(...dirs[e.code]);}
 if(e.code==='Space'){e.preventDefault();use();}
 if(['Digit1','Digit2','Digit3'].includes(e.code))selectTool(['pick','stone','torch'][Number(e.code.slice(-1))-1]);
 if(e.code==='Digit4')showMap();if(e.code==='Digit5')showBag();
});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&active())pause();});
if(!storageOK)$('saveStatus').textContent='本次可玩 · 浏览器未允许保存';
$('seed').value=state.seed;hud();resize();new ResizeObserver(resize).observe(canvas);pause();
