// Run: node tank/check.cjs. Uses installed Google Chrome, no dependencies.
const fs=require('fs'),os=require('os'),path=require('path'),{execFileSync}=require('child_process');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'tank-check-'));
const test=String.raw`
<script>
try {
const assert=(ok,msg)=>{if(!ok)throw Error(msg)};
const step=(seconds)=>{for(let i=0;i<seconds*120;i++)update(1/120)};
const isolate=()=>{reset(true);walls=[];allies=[];enemies=[];spawned=10;player.shield=0;};
const bullet=(x,y,enemy=true,extra={})=>({x,y,dx:0,dy:0,enemy,speed:0,life:1,color:'#fff',pierce:0,blast:0,hit:new Set(),...extra});
assert(mode==='ready','initial start screen');$('action').click();assert(mode==='playing','start button');
assert(allies.length===10&&allies.filter(a=>a.guard).length===1,'ten friends, one guard');
assert(allies[0].hp===3*allies[1].hp,'guard triple armor');
assert(allies.every(a=>canMove(a,a.x,a.y)),'allies spawn clear of walls');
assert(canMove(player,player.x,player.y),'player spawn clear');
for(const x of [60,300,540]){const p=route(tank(x,20,true),{x:300,y:500});assert(p.length>5&&p.at(-1).y===500,'three connected routes');}
let before=player.y;window.dispatchEvent(new KeyboardEvent('keydown',{code:'ArrowUp'}));step(.1);window.dispatchEvent(new KeyboardEvent('keyup',{code:'ArrowUp'}));assert(player.y<before,'keyboard movement');
pause();before=elapsed;step(1);assert(elapsed===before&&mode==='paused','pause freezes time');pause();
useSkill('stealth');let guard=allies.find(a=>a.guard),enemy=tank(220,180,true);assert(hidden(player)&&hidden(guard),'linked stealth');assert(!aiTargets(enemy).includes(player)&&!aiTargets(enemy).includes(guard),'AI excludes hidden pair');
bullets=[];enemies=[tank(guard.x,guard.y-100,true)];guard.cool=0;ai(guard,0);assert(bullets.length===0,'hidden guard does not shoot');
player.x=60;player.y=500;guard.think=0;const distance=Math.hypot(guard.x-player.x,guard.y-player.y);for(let i=0;i<120;i++)ai(guard,1/120);assert(Math.hypot(guard.x-player.x,guard.y-player.y)<distance,'hidden guard keeps following');
player.cool=0;shoot(player);assert(!hidden(player)&&!hidden(guard),'shot reveals both');
reset(true);useSkill('stealth');enemies=[];spawned=10;step(4.1);assert(!hidden(player)&&!hidden(allies[0]),'linked stealth expires');
isolate();useSkill('dash');assert(skills.dash.active===1,'dash active');walls=[{x:200,y:520,type:'steel'}];player.dir=0;step(.5);keys.add('ArrowUp');step(.5);keys.clear();assert(player.y>=574,'dash cannot cross walls');assert(skills.dash.cool>0,'dash cooldown');
isolate();useSkill('shield');bullets=[bullet(player.x,player.y)];update(1/120);assert(lives===3,'shield blocks damage');player.shield=0;player.hp=34;bullets=[bullet(player.x,player.y)];update(1/120);assert(lives===2&&player.shield>0&&player.x===spawn.x,'hit respawns with shield');
isolate();useSkill('stealth');bullets=[bullet(player.x,player.y)];update(1/120);assert(lives===3&&player.hp===66,'stray bullets hit invisible player');
isolate();walls=[{x:40,y:40,type:'brick'},{x:80,y:40,type:'steel'}];bullets=[bullet(60,60,false),bullet(100,60,false)];update(1/120);assert(walls.length===1&&walls[0].type==='steel','brick destroyed, steel survives');
isolate();bullets=[bullet(base.x,base.y,false)];update(1/120);assert(baseAlive&&mode==='playing','friendly base immunity');bullets=[bullet(base.x,base.y,true)];update(1/120);assert(!baseAlive&&mode==='lost','base loss');
isolate();lives=1;player.hp=34;bullets=[bullet(player.x,player.y)];update(1/120);assert(lives===0&&mode==='lost','life depletion loss');
reset(true);walls=[];enemies=[];spawned=10;guard=allies[0];bullets=[bullet(guard.x,guard.y,false),bullet(player.x,player.y,false)];player.shield=0;update(1/120);assert(guard.hp===6&&lives===3,'friendly fire immunity');
guard.shield=0;bullets=[bullet(guard.x,guard.y,true)];update(1/120);assert(guard.hp===5,'guard armor absorbs hit');
const survivors=allies.length;player.shield=0;bullets=[bullet(player.x,player.y,true)];update(1/120);assert(allies.includes(guard)&&allies.length===survivors,'guard persists through respawn');
isolate();for(let i=0;i<4;i++){player.weapon=i;player.cool=0;bullets=[];shoot(player);assert(bullets.length===(i===2?5:1),'weapon spread '+i);if(i===1)assert(bullets[0].pierce===1,'heavy piercing');if(i===3)assert(bullets[0].blast===65,'rocket explosion');}
isolate();enemies=[tank(100,100,true),tank(140,100,true)];enemies.forEach(e=>e.shield=0);explode(bullet(100,100,false,{blast:65}));assert(kills===2&&enemies.length===0,'rocket damages area');
isolate();kills=9;enemies=[tank(100,100,true)];enemies[0].shield=0;bullets=[bullet(100,100,false)];update(1/120);assert(kills===10&&mode==='won','ten kills win');
reset(true);useSkill('dash');player.weapon=2;const saved={lives,kills,cool:skills.dash.cool,guard:allies[0]};toggleAuto();assert(autoMode&&lives===saved.lives&&player.weapon===2&&skills.dash.cool===saved.cool&&allies[0]===saved.guard,'auto preserves state');
before=player.y;step(.3);assert(player.y!==before||player.x!==spawn.x,'auto moves');toggleAuto();assert(!autoMode&&lives===saved.lives&&player.weapon===2&&allies[0]===saved.guard,'manual preserves state');
toggleAuto();window.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyW'}));assert(!autoMode&&keys.has('KeyW'),'movement takes over');window.dispatchEvent(new KeyboardEvent('keyup',{code:'KeyW'}));
useSkill('stealth');toggleAuto();bullets=[];enemies=[tank(player.x,player.y-100,true)];player.cool=0;ai(player,0);assert(hidden(player)&&!bullets.length,'automatic fire respects stealth');
reset(true);for(let i=0;i<20;i++)spawnEnemy();assert(enemies.length===3,'max three enemies');
reset(true);toggleAuto();for(let i=0;i<120*180&&mode==='playing';i++)update(1/120);assert(['won','lost'].includes(mode),'autoplay reaches an outcome');assert(kills<=10&&spawned<=10,'enemy limits');

isolate();enemies=[tank(300,400,true),tank(500,100,true)];acquireTarget();assert(locked===enemies[0],'nearest target lock');const facing=player.dir;const vector=aim(player);assert(vector[0]>0&&vector[1]<0&&player.dir===facing,'turret aim independent of hull');shoot(player);assert(bullets[0].dx>0&&bullets[0].dy<0,'main follows lock');secondary();assert(bullets[1].dx>0&&bullets[1].dy<0,'secondary follows lock');enemies.shift();acquireTarget();assert(locked===null,'out of range unlock');enemies=[tank(220,400,true)];useSkill('stealth');acquireTarget();assert(hidden(player),'locking does not reveal');bullets=[];update(1/120);assert(!bullets.length,'manual aim does not auto fire');
 isolate();player.weapon=1;shoot(player);secondary();assert(bullets.length===2&&player.cool>0&&secondaryCool>0,'main and secondary together');
useSkill('stealth');secondaryCool=0;secondary();assert(!hidden(player),'secondary reveals player');
reset(true);useSkill('stealth');secondary();assert(!hidden(player)&&!hidden(allies[0]),'secondary reveals escort');
isolate();hitPlayer();assert(player.hp===66&&lives===3,'durability before life');step(4);assert(player.hp===66,'repair delay');step(2);assert(player.hp>66&&lives===3,'repair restores durability only');hitPlayer();const hp=player.hp;step(1);assert(player.hp===hp,'hit interrupts repair');
isolate();walls=[{x:180,y:540,type:'brick'},{x:260,y:540,type:'steel'}];enemies=[tank(220,500,true)];enemies[0].shield=0;allies=[Object.assign(tank(180,580),{ally:true,hp:6,maxHp:6,guard:true})];const friend=allies[0];player.shield=10;selfDestruct();assert(lives===2&&player.hp===100&&kills===1,'self destruct costs life despite shield');assert(friend.hp===6&&baseAlive&&walls.length===1&&walls[0].type==='steel','self destruct damage filtering');
isolate();lives=1;selfDestruct();assert(mode==='lost'&&lives===0,'last life self destruct loses');
isolate();keys.add('KeyX');step(.4);keys.delete('KeyX');step(.1);assert(lives===3&&selfCharge===0,'release cancels charge');keys.add('KeyX');step(.4);pause();assert(selfCharge===0,'pause cancels charge');
reset(true);player.x=60;player.y=200;player.hp=40;useSkill('dash');keys.add('KeyX');selfCharge=.5;const cd=skills.dash.cool;evacuate();const g=allies.find(a=>a.guard);assert(player.y>=500&&g.y>=500&&Math.hypot(player.x-g.x,player.y-g.y)>=32,'evac to distinct HQ spaces');assert(canMove(player,player.x,player.y)&&canMove(g,g.x,g.y),'evac no walls');assert(player.hp===40&&lives===3&&skills.dash.cool===cd&&evacCool===20,'evac preserves health and cooldowns');assert(selfCharge===0&&!keys.has('KeyX')&&player.shield>=2&&g.shield>=2,'evac cancels charge and protects');
reset(true);walls=[];for(let r=12;r<15;r++)for(let c=0;c<15;c++)walls.push({x:c*40,y:r*40,type:'steel'});player.x=60;player.y=60;evacuate();assert(player.x===60&&player.y===60&&evacCool===0,'no valid evac does not spend cooldown');
changeMap('city');assert(currentMap==='city'&&mode==='ready'&&$('mapName').textContent.includes('城市'),'city map selection');
const cityWalls=JSON.stringify(walls);assert(walls.some(w=>w.building),'city has solid buildings');
reset(true);assert(allies.length===10&&allies.every(a=>canMove(a,a.x,a.y))&&canMove(player,player.x,player.y),'city spawns clear');
for(const x of [60,300,540]){const path=route(tank(x,20,true),{x:220,y:580});assert(path.at(-1).x===220&&path.at(-1).y===580,'city enemy route to HQ');assert(path.every(p=>canMove(player,p.x,p.y)),'city route fits tank hull');}
for(const a of allies){const path=route(a,spawn);assert(path.at(-1).x===spawn.x&&path.at(-1).y===spawn.y,'city allies not trapped');}
const cityGuard=allies[0];player.x=300;player.y=220;player.dir=0;cityGuard.think=0;for(let i=0;i<120*12;i++)ai(cityGuard,1/120);assert(Math.hypot(cityGuard.x-player.x,cityGuard.y-player.y)<100,'guard navigates city corners');
evacuate();assert(player.y>=500&&cityGuard.y>=500&&canMove(player,player.x,player.y)&&canMove(cityGuard,cityGuard.x,cityGuard.y),'city HQ evacuation');
const building=walls.find(w=>w.building);assert(!canMove(player,building.x+20,building.y+20),'building collision');bullets=[bullet(building.x+20,building.y+20,false)];enemies=[];spawned=10;update(1/120);assert(walls.includes(building)&&bullets.length===0,'building blocks projectiles');explode({x:building.x+20,y:building.y+20,blast:130,hit:new Set()});assert(walls.includes(building),'buildings withstand blast');
reset(true);toggleAuto();for(let i=0;i<120*180&&mode==='playing';i++)update(1/120);assert(['won','lost'].includes(mode),'city autoplay reaches outcome');draw();
reset();assert(currentMap==='city','restart keeps city');changeMap('field');assert(JSON.stringify(walls)!==cityWalls&&mode==='ready','original map preserved');
reset();draw();assert(!autoMode&&allies.length===10&&kills===0&&lives===3&&spawned===0,'reset restores entire game');assert(document.documentElement.scrollWidth<=innerWidth,'no horizontal overflow');
document.body.innerHTML='<p>CHECK_PASS: gameplay, paths, 10 allies, guard armor/following, stealth linkage, 4 weapons, 3 skills, mode switching, damage, win/loss, autoplay, secondary, self-destruct, HQ evacuation, auto-repair, auto-lock, city alleys/buildings/routes/escort/evac/autoplay, reset, layout</p>';
}catch(e){document.body.innerHTML='<p>CHECK_FAIL: '+e.message+'</p>';}
parent.postMessage(document.body.textContent,'*');
</script>`;
const source=fs.readFileSync(path.join(__dirname,'index.html'),'utf8').replace('<script src="tank.js"></script>','<script>requestAnimationFrame=()=>0;'+fs.readFileSync(path.join(__dirname,'tank.js'),'utf8')+'</script>').replace('</body>',test+'</body>');
try{for(const size of ['1280,1100','390,844']){
fs.writeFileSync(path.join(dir,'test.html'),'<body style="margin:0"><script>onmessage=e=>document.body.textContent=e.data<'+"/script>"+'<iframe style="border:0;width:'+size.split(',')[0]+'px;height:1600px" srcdoc="'+source.replace(/&/g,'&amp;').replace(/"/g,'&quot;')+'"></iframe>');
let out;try{out=execFileSync('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',['--headless','--no-sandbox','--disable-gpu','--no-first-run','--user-data-dir='+path.join(dir,'profile-'+size),'--window-size='+size,'--dump-dom','file://'+path.join(dir,'test.html')],{encoding:'utf8',stdio:['ignore','pipe','ignore'],timeout:20000});}catch(e){if(e.code!=='ETIMEDOUT')throw e;out=String(e.stdout||'');}
if(!out.includes('CHECK_PASS:'))throw Error(out.match(/CHECK_FAIL:[^<]+/)?.[0]||out);console.log(size+': '+out.match(/CHECK_PASS:[^<]+/)[0]);
}}finally{fs.rmSync(dir,{recursive:true,force:true});}
