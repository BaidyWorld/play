 'use strict';
const $=id=>document.getElementById(id),canvas=$('game'),ctx=canvas.getContext('2d');
const TILE=40,SIZE=600,DIRS=[[0,-1],[1,0],[0,1],[-1,0]],keys=new Set();
const base={x:300,y:580},spawn={x:220,y:580};
const CITY_BLOCKS=[[3,1,3,3],[9,1,3,3],[0,1,1,3],[6,1,1,3],[8,1,1,3],[14,1,1,3],[0,6,3,2],[6,6,3,2],[12,6,3,2],[4,6,1,2],[10,6,1,2],[3,9,2,3],[10,9,2,3],[0,9,1,3],[6,9,1,3],[8,9,1,3],[14,9,1,3]];
let currentMap=new URLSearchParams(location.search).get('map')==='city'?'city':'field';
const WEAPONS=[{name:'速射机枪',cool:.14,speed:460,life:1.3,spread:[0],color:'#fff2a4',info:'连续快速射击，适合压制。'}, {name:'重炮',cool:.75,speed:380,life:1.8,spread:[0],color:'#ffdb8c',pierce:1,info:'一发可穿透两个目标或两块砖墙。'}, {name:'散弹',cool:.65,speed:350,life:.55,spread:[-.22,-.11,0,.11,.22],color:'#f3e6ad',info:'五发扇形弹幕，近距离覆盖更广。'}, {name:'火箭弹',cool:1.1,speed:240,life:2.6,spread:[0],color:'#ffc078',blast:65,info:'命中时产生范围爆破，可摧毁附近砖墙与敌军。'}];
const skillConfig={dash:{key:'Q',name:'冲刺',duration:1,cool:6},stealth:{key:'E',name:'隐身',duration:4,cool:10},shield:{key:'F',name:'护盾',duration:3,cool:12}};
let walls=[],enemies=[],allies=[],bullets=[],particles=[],player,skills={},mode='ready',lives=3,kills=0,spawned=0,spawnClock=0,elapsed=0,baseAlive=true,autoMode=false,secondaryCool=0,evacCool=0,selfCharge=0,lastDamage=0,selfLatched=false,locked=null,autoLock=true;
function makeMap(){
 const list=[],add=(c,r,type='brick',building=false)=>list.push({x:c*TILE,y:r*TILE,type,building});
 if(currentMap==='city'){
  for(const [c,r,w,h] of CITY_BLOCKS)for(let dy=0;dy<h;dy++)for(let dx=0;dx<w;dx++)add(c+dx,r+dy,'steel',true);
  for(const [c,r] of [[5,4],[9,4],[4,8],[10,8],[2,10],[12,10],[6,13],[7,13],[8,13],[6,14],[8,14]])add(c,r);
  return list;
 }
 for(const r of [2,3,6,7,10,11])for(const c of [3,4,5,9,10,11])add(c,r,(r===6||r===7)&&(c===4||c===10)?'steel':'brick');
 for(const r of [4,8])for(const c of [0,2,6,8,12,14])add(c,r,c===0||c===14?'steel':'brick');
 for(const c of [6,7,8])add(c,13);add(6,14);add(8,14);return list;
}
function tank(x,y,enemy=false){return{x,y,dir:enemy?2:0,enemy,ally:false,guard:false,hp:1,maxHp:1,weapon:0,cool:enemy?1.2:0,think:0,path:[],shield:enemy?.8:3};}
function reset(start=false){
 walls=makeMap();enemies=[];bullets=[];particles=[];player=tank(spawn.x,spawn.y);allies=[];
 const positions=[[4,14],[1,5],[7,5],[13,5],[1,9],[7,9],[13,9],[1,12],[7,12],[13,12]];
 positions.forEach(([c,r],i)=>{const a=tank(c*40+20,r*40+20);Object.assign(a,{ally:true,guard:i===0,weapon:i%4,hp:i===0?6:2,maxHp:i===0?6:2,home:{x:c*40+20,y:r*40+20},shield:0,cool:.5+i*.12});allies.push(a);});
 player.hp=100;player.maxHp=100;locked=null;autoLock=true;secondaryCool=0;evacCool=0;selfCharge=0;lastDamage=0;selfLatched=false;autoMode=false;skills=Object.fromEntries(Object.keys(skillConfig).map(k=>[k,{active:0,cool:0}]));lives=3;kills=0;spawned=0;spawnClock=.6;elapsed=0;baseAlive=true;keys.clear();mode=start?'playing':'ready';sync();
}
function changeMap(name){if(!['field','city'].includes(name))return;currentMap=name;reset();draw();}
function sync(){
 $('mapName').textContent=currentMap==='city'?'02 / 城市街区':'01 / 三路防线';
 $('mapDescription').textContent=currentMap==='city'?'城市巷战 · 穿行窄巷与街角，多路迂回。建筑不可破坏，砖墙路障可击碎。':'三路防线 · 通过相连的左、中、右路线守护基地。';
 document.querySelectorAll('[data-map]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.map===currentMap)));
 $('auto').textContent=autoMode?'自动驾驶 · M 切手动':'手动驾驶 · M 切自动';$('auto').setAttribute('aria-pressed',String(autoMode));
 $('score').textContent=String(kills*100).padStart(4,'0');$('kills').innerHTML=kills+' <span style="font-size:14px;color:#9baba5">/ 10</span>';$('lives').textContent='◆'.repeat(lives)+'◇'.repeat(3-lives);$('base').textContent=baseAlive?'完好':'失守';
 const guard=allies.find(a=>a.guard);$('squad').textContent='蓝色友军 '+allies.length+' / 10 · '+(guard?'★ 护卫装甲 '+guard.hp+'/6':'护卫已阵亡');
 $('pause').disabled=!['playing','paused'].includes(mode);$('pause').textContent=mode==='paused'?'继续':'暂停';$('overlay').hidden=mode==='playing';
 const copy={ready:['基地需要你','你和 10 名队友一起出击。绿色是你，蓝色是友军，★ 是三倍装甲护卫。击退 10 辆红色敌军！','开始战斗 →','等待指挥官就位'],paused:['战斗已暂停','喘口气，战场会等你。准备好后继续守护基地。','继续战斗 →','已暂停 · P 继续'],won:['防线守住了！','10 辆敌军全部击毁！团队获得 1000 分，基地安然无恙。','再战一局 →','任务完成 · 基地安全'],lost:['任务结束',baseAlive?'坦克生命已耗尽。调整路线，再来一次！':'基地遭到攻击，防线失守。优先拦截接近基地的敌军！','重新出击 →','任务失败']};
 if(copy[mode]){const c=copy[mode];$('title').textContent=c[0];$('message').textContent=c[1];$('action').textContent=c[2];$('status').textContent=c[3];}else $('status').textContent='战斗中 · 友军击毁计入团队成绩';
 document.querySelectorAll('[data-weapon]').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.weapon===player.weapon)));
 $('weaponInfo').textContent=WEAPONS[player.weapon].name+' · '+WEAPONS[player.weapon].info;syncSkills();
}
function syncSkills(){
 $('lock').textContent=autoLock?'自动锁定 · '+(locked?'目标已捕获':'搜索最近敌人'):'自动锁定已关闭';$('lock').setAttribute('aria-pressed',String(autoLock));
 $('durability').textContent='机体 '+Math.ceil(player.hp)+'% · '+(mode==='playing'&&player.hp<100&&elapsed-lastDamage>=5?'自动修理中':player.hp<100?'脱战 5 秒后自动修理':'机体完好');
 $('evac').disabled=mode!=='playing'||evacCool>0;$('evac').textContent='R · 撤回大本营'+(evacCool>0?' '+Math.ceil(evacCool)+'s':'');
 $('selfDestruct').textContent=selfCharge>0?'蓄力 '+Math.round(selfCharge*100)+'% · 松开取消':'长按 X / 此处 1 秒自爆 · 消耗 1 命';
 for(const [name,cfg] of Object.entries(skillConfig)){const v=skills[name],b=$(name);b.disabled=mode!=='playing'||v.cool>0;b.classList.toggle('active',v.active>0);b.textContent=cfg.key+' · '+cfg.name+(v.active>0?' '+v.active.toFixed(1)+'s':v.cool>0?' '+Math.ceil(v.cool)+'s':' 就绪');}}
function useSkill(name){if(mode!=='playing'||skills[name].cool>0)return;skills[name]={active:skillConfig[name].duration,cool:skillConfig[name].cool};if(name==='shield')player.shield=Math.max(player.shield,3);syncSkills();canvas.focus({preventScroll:true});}
function selectWeapon(index){player.weapon=index;sync();canvas.focus({preventScroll:true});}
function toggleAuto(){autoMode=!autoMode;keys.clear();player.path=[];player.think=0;sync();canvas.focus({preventScroll:true});}
function pause(){selfCharge=0;if(mode==='playing')mode='paused';else if(mode==='paused')mode='playing';keys.clear();sync();}
function finish(result){mode=result;keys.clear();sync();}
function overlaps(x,y,half,w){return x+half>w.x&&x-half<w.x+TILE&&y+half>w.y&&y-half<w.y+TILE;}
function canMove(t,x,y){return x>=15&&y>=15&&x<=SIZE-15&&y<=SIZE-15&&!walls.some(w=>overlaps(x,y,14,w))&&!(Math.abs(x-base.x)<31&&Math.abs(y-base.y)<31)&&!(t.enemy?[player,...allies]:enemies).some(other=>Math.abs(x-other.x)<30&&Math.abs(y-other.y)<30);}
function move(t,dt){const [dx,dy]=DIRS[t.dir],speed=t.enemy?64:t.ally?(t.guard?150:76):132*(skills.dash.active>0?2.4:1),x=t.x+dx*speed*dt,y=t.y+dy*speed*dt;if(canMove(t,x,y)){t.x=x;t.y=y;return true;}return false;}
function acquireTarget(){locked=autoLock?[...enemies].filter(t=>Math.hypot(t.x-player.x,t.y-player.y)<=360).sort((a,b)=>Math.hypot(a.x-player.x,a.y-player.y)-Math.hypot(b.x-player.x,b.y-player.y))[0]||null:null;}
function aim(t){if(t===player&&locked){const dx=locked.x-t.x,dy=locked.y-t.y,d=Math.hypot(dx,dy);if(d>0)return[dx/d,dy/d];}return DIRS[t.dir];}
function shoot(t){
 if(t.cool>0)return;if(t===player)skills.stealth.active=0;
 const w=t.enemy?{cool:1.7,speed:220,life:3,spread:[0],color:'#ff9469'}:WEAPONS[t.weapon],dir=aim(t);
 for(const angle of w.spread){const dx=dir[0]*Math.cos(angle)-dir[1]*Math.sin(angle),dy=dir[0]*Math.sin(angle)+dir[1]*Math.cos(angle);bullets.push({x:t.x+dir[0]*19,y:t.y+dir[1]*19,dx,dy,enemy:t.enemy,speed:w.speed,life:w.life,color:w.color,pierce:w.pierce||0,blast:w.blast||0,hit:new Set()});}t.cool=w.cool*(t.ally?1.8:1);
}
function burst(x,y,color){for(let i=0;i<15;i++){const a=Math.random()*Math.PI*2,speed=25+Math.random()*90;particles.push({x,y,dx:Math.cos(a)*speed,dy:Math.sin(a)*speed,life:.3+Math.random()*.35,color});}}
function loseLife(){
 burst(player.x,player.y,'#e9d080');lives--;selfCharge=0;keys.delete('KeyX');
 if(lives===0){player.hp=0;finish('lost');return;}
 const weapon=player.weapon;player=tank(spawn.x,spawn.y);player.hp=100;player.maxHp=100;player.weapon=weapon;lastDamage=elapsed;skills.dash.active=0;skills.stealth.active=0;sync();
}
function hitPlayer(){if(player.shield>0)return;player.hp=Math.max(0,player.hp-34);lastDamage=elapsed;burst(player.x,player.y,'#e9d080');if(player.hp===0)loseLife();else sync();}
function secondary(){if(mode!=='playing'||secondaryCool>0)return;skills.stealth.active=0;const [dx,dy]=aim(player);bullets.push({x:player.x+dx*19-dy*9,y:player.y+dy*19+dx*9,dx,dy,enemy:false,speed:480,life:1.2,color:'#bdeefe',pierce:0,blast:0,hit:new Set()});secondaryCool=.2;}
function selfDestruct(){if(mode!=='playing')return;selfLatched=true;explode({x:player.x,y:player.y,blast:130,hit:new Set()});loseLife();}
function evacuate(){
 if(mode!=='playing'||evacCool>0)return;selfCharge=0;keys.delete('KeyX');const guard=allies.find(a=>a.guard),units=[...enemies,...allies].filter(t=>t!==guard),spots=[];
 for(const y of [580,540,500])for(const x of [220,180,380,420,260,300,340])if(canMove(player,x,y)&&!units.some(t=>Math.abs(t.x-x)<32&&Math.abs(t.y-y)<32))spots.push({x,y});
 if(spots.length<(guard?2:1)){$('status').textContent='大本营落点被占用，请稍后撤离（未消耗冷却）';return;}
 Object.assign(player,spots[0],{path:[],think:0,shield:Math.max(player.shield,2)});if(guard)Object.assign(guard,spots[1],{path:[],think:0,shield:Math.max(guard.shield,2)});evacCool=20;keys.clear();sync();$('status').textContent='已撤回大本营 · 2 秒撤离护盾';
}
function damage(t){if(t.shield>0)return;if(t===player){hitPlayer();return;}t.hp--;if(t.hp<=0){burst(t.x,t.y,t.enemy?'#e39760':'#9ecad1');if(t.enemy){enemies=enemies.filter(e=>e!==t);kills++;}else allies=allies.filter(a=>a!==t);}sync();}
function explode(b){burst(b.x,b.y,'#ffbf72');for(const w of [...walls])if(w.type==='brick'&&Math.hypot(w.x+20-b.x,w.y+20-b.y)<b.blast)walls.splice(walls.indexOf(w),1);for(const e of [...enemies])if(!b.hit.has(e)&&Math.hypot(e.x-b.x,e.y-b.y)<b.blast)damage(e);}
function spawnEnemy(){if(spawned>=10||enemies.length>=3)return;const xs=[60,300,540];for(let i=0;i<3;i++){const x=xs[(spawned+i)%3];if(!enemies.some(t=>Math.abs(t.x-x)<36&&Math.abs(t.y-20)<36)){enemies.push(tank(x,20,true));spawned++;return;}}}
// Small 15×15 battlefield: breadth-first routes keep the escort around walls without a dependency.
function route(t,target){
 const start=Math.floor(t.y/40)*15+Math.floor(t.x/40),blocked=new Set(walls.map(w=>w.y/40*15+w.x/40));blocked.add(14*15+7);
 const queue=[start],prev=new Map([[start,-1]]);let best=start,bestD=Infinity;
 for(let i=0;i<queue.length;i++){const n=queue[i],c=n%15,r=Math.floor(n/15),d=Math.hypot(c*40+20-target.x,r*40+20-target.y);if(d<bestD){best=n;bestD=d;}if(d<20)break;
 for(const [dc,dr]of DIRS){const nc=c+dc,nr=r+dr,k=nr*15+nc;if(nc>=0&&nc<15&&nr>=0&&nr<15&&!blocked.has(k)&&!prev.has(k)){prev.set(k,n);queue.push(k);}}}
 const path=[];for(let n=best;n!==-1;n=prev.get(n))path.unshift({x:n%15*40+20,y:Math.floor(n/15)*40+20});return path;
}
function walkRoute(t,dt){
 let goal=t.path[0];if(!goal)return;
 if(Math.abs(goal.x-t.x)<2&&Math.abs(goal.y-t.y)<2){t.x=goal.x;t.y=goal.y;t.path.shift();goal=t.path[0];if(!goal)return;}
 const dx=goal.x-t.x,dy=goal.y-t.y;t.dir=Math.abs(dx)>1?(dx>0?1:3):(dy>0?2:0);
 // Friends yield to the player; friendly hulls never trap the player in a narrow corridor.
 if(t.ally&&Math.hypot(t.x-player.x,t.y-player.y)<38&&Math.hypot(goal.x-player.x,goal.y-player.y)<Math.hypot(t.x-player.x,t.y-player.y))return;
 const distance=Math.abs(DIRS[t.dir][0]?dx:dy),speed=t===player?132*(skills.dash.active>0?2.4:1):t.enemy?64:t.guard?150:76;move(t,Math.min(dt,distance/speed));
}
function hidden(t){return skills.stealth.active>0&&(t===player||t.guard);}
function aiTargets(t){return t.enemy?[...[player,...allies].filter(a=>!hidden(a)),base]:enemies;}
function ai(t,dt){
 if(t!==player){t.cool=Math.max(0,t.cool-dt);t.shield=Math.max(0,t.shield-dt);}t.think-=dt;
 const targets=aiTargets(t);
 const origin=t.guard?player:t;const target=[...targets].sort((a,b)=>Math.hypot(a.x-origin.x,a.y-origin.y)-Math.hypot(b.x-origin.x,b.y-origin.y))[0];
 if(t.think<=0){let goal;
 if(t.guard){const [dx,dy]=DIRS[player.dir];goal={x:player.x-dx*55,y:player.y-dy*55};if(Math.hypot(t.x-player.x,t.y-player.y)<62)t.path=[];else t.path=route(t,goal);}
 else{goal=t===player?(target||{x:300,y:500}):t.enemy?(target&&Math.hypot(target.x-t.x,target.y-t.y)<250?target:{x:300,y:500}):t.home;t.path=route(t,goal);}t.think=.45;}
 walkRoute(t,dt);
 if(target&&!hidden(t)){const dx=target.x-t.x,dy=target.y-t.y,d=Math.hypot(dx,dy);if(d<(t.enemy?500:t.guard?310:280)&&(t===player&&locked||Math.abs(dx)<22||Math.abs(dy)<22)){t.dir=Math.abs(dx)>Math.abs(dy)?(dx>0?1:3):(dy>0?2:0);shoot(t);if(t===player&&autoMode)secondary();}else if(t.enemy&&t.cool<=0){shoot(t);}}
}
function update(dt){
 if(mode!=='playing')return;acquireTarget();elapsed+=dt;secondaryCool=Math.max(0,secondaryCool-dt);evacCool=Math.max(0,evacCool-dt);if(player.hp<100&&elapsed-lastDamage>=5)player.hp=Math.min(100,player.hp+8*dt);
 if(keys.has('KeyX')){selfCharge+=dt;if(selfCharge>=1){selfDestruct();if(mode!=='playing')return;}}else selfCharge=0;
 player.cool=Math.max(0,player.cool-dt);player.shield=Math.max(0,player.shield-dt);
 for(const v of Object.values(skills)){v.active=Math.max(0,v.active-dt);v.cool=Math.max(0,v.cool-dt);}
 const mapping={ArrowUp:0,KeyW:0,ArrowRight:1,KeyD:1,ArrowDown:2,KeyS:2,ArrowLeft:3,KeyA:3};const held=[...keys].reverse().find(k=>mapping[k]!==undefined);if(autoMode)ai(player,dt);else if(held){player.dir=mapping[held];move(player,dt);}if(keys.has('Space'))shoot(player);if(keys.has('ShiftLeft')||keys.has('ShiftRight'))secondary();
 spawnClock-=dt;if(spawnClock<=0){spawnEnemy();spawnClock=2;}
 for(const t of [...enemies,...allies])ai(t,dt);
 for(let i=bullets.length-1;i>=0;i--){const b=bullets[i];b.x+=b.dx*b.speed*dt;b.y+=b.dy*b.speed*dt;b.life-=dt;let remove=b.x<0||b.x>SIZE||b.y<0||b.y>SIZE||b.life<=0;
 if(!remove){const w=walls.find(w=>!b.hit.has(w)&&overlaps(b.x,b.y,3,w));if(w){b.hit.add(w);burst(b.x,b.y,w.type==='brick'?'#bd8855':'#acbfab');if(w.type==='brick')walls.splice(walls.indexOf(w),1);if(w.type==='steel'||b.pierce--<=0)remove=true;}}
 if(!remove&&Math.abs(b.x-base.x)<20&&Math.abs(b.y-base.y)<20){remove=true;if(b.enemy){baseAlive=false;burst(base.x,base.y,'#edcc7a');finish('lost');}}
 if(!remove){const targets=b.enemy?[player,...allies]:enemies;const t=targets.find(t=>!b.hit.has(t)&&Math.abs(b.x-t.x)<16&&Math.abs(b.y-t.y)<16);if(t){b.hit.add(t);damage(t);if(b.pierce--<=0)remove=true;}}
 if(remove){if(b.blast)explode(b);bullets.splice(i,1);}if(mode!=='playing')break;}
 acquireTarget();if(mode==='playing'&&kills===10&&baseAlive)finish('won');particles=particles.filter(p=>(p.life-=dt)>0);for(const p of particles){p.x+=p.dx*dt;p.y+=p.dy*dt;}
}
function box(x,y,w,h,z,top,front,side){
 ctx.fillStyle='#07120c45';ctx.fillRect(x+6,y+5,w+3,h+3);
 ctx.fillStyle=front;ctx.fillRect(x,y+h-z,w,z);ctx.fillStyle=side;ctx.beginPath();ctx.moveTo(x+w,y-z);ctx.lineTo(x+w+4,y-z+4);ctx.lineTo(x+w+4,y+h);ctx.lineTo(x+w,y+h-z);ctx.fill();ctx.fillStyle=top;ctx.fillRect(x,y-z,w,h);ctx.strokeStyle='#ecf0c51b';ctx.strokeRect(x+.5,y-z+.5,w-1,h-1);
}
function drawTank(t){
 ctx.save();ctx.translate(t.x,t.y);if(hidden(t))ctx.globalAlpha=.35;
 const bodyAngle=t.dir*Math.PI/2,[ax,ay]=aim(t),turretAngle=Math.atan2(ax,-ay);
 const colors=t.enemy?['#cf896b','#784533','#a8654b']:t.ally?['#a0d4de','#3b6579','#6599ac']:['#d1df92','#516840','#91ab61'];
 const point=(x,y,z,angle)=>[x*Math.cos(angle)-y*Math.sin(angle),x*Math.sin(angle)+y*Math.cos(angle)-z];
 function polygon(points,color){ctx.fillStyle=color;ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fill();}
 function prism(x,y,w,h,z,palette,angle=bodyAngle){
  const floor=[[x-w/2,y-h/2],[x+w/2,y-h/2],[x+w/2,y+h/2],[x-w/2,y+h/2]].map(([px,py])=>point(px,py,0,angle));
  const roof=floor.map(([px,py])=>[px,py-z]);
  for(let i=0;i<4;i++){const j=(i+1)%4;if((floor[i][1]+floor[j][1])/2>=y*Math.cos(angle)+x*Math.sin(angle)-.01)polygon([roof[i],roof[j],floor[j],floor[i]],i%2?palette[2]:palette[1]);}
  polygon(roof,palette[0]);ctx.strokeStyle='#eef5d940';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(...roof[0]);ctx.lineTo(...roof[1]);ctx.lineTo(...roof[2]);ctx.stroke();
 }
 ctx.fillStyle='#07121966';ctx.beginPath();ctx.ellipse(6,8,23,18,bodyAngle,0,Math.PI*2);ctx.fill();
 for(const x of [-14,14]){prism(x,0,8,36,4,['#617068','#202e29','#374b42']);for(let y=-15;y<=15;y+=6){const a=point(x-3,y,4,bodyAngle),b=point(x+3,y,4,bodyAngle);ctx.strokeStyle='#afbaa480';ctx.beginPath();ctx.moveTo(...a);ctx.lineTo(...b);ctx.stroke();}}
 prism(0,0,23,29,7,colors);prism(0,8,13,5,8,['#3c5144','#28392d','#3c5144']);
 // The turret and barrel are raised in screen space, independently of hull movement.
 const turretFloor=point(0,-1,6,turretAngle);ctx.fillStyle='#0b1e2266';ctx.beginPath();ctx.ellipse(turretFloor[0]+3,turretFloor[1]+3,12,10,0,0,Math.PI*2);ctx.fill();
 prism(0,-1,18,18,13,colors,turretAngle);prism(0,-20,6,26,15,[colors[0],colors[1],colors[2]],turretAngle);
 const muzzleA=point(-2,-33,15,turretAngle),muzzleB=point(2,-33,15,turretAngle);ctx.strokeStyle='#182920';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(...muzzleA);ctx.lineTo(...muzzleB);ctx.stroke();
 if(t===player)prism(9,-14,3,17,11,['#c4e2e6','#49656d','#7b9fa5'],turretAngle);
 const hatch=point(0,2,14,turretAngle);ctx.fillStyle=colors[1];ctx.beginPath();ctx.ellipse(hatch[0],hatch[1],4,3,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#eef5d970';ctx.lineWidth=1;ctx.stroke();ctx.restore();
 if(t.ally){ctx.fillStyle='#1b2923';ctx.fillRect(t.x-14,t.y+23,28,3);ctx.fillStyle=t.guard?'#edcc7a':'#95d9db';ctx.fillRect(t.x-14,t.y+23,28*t.hp/t.maxHp,3);ctx.font='10px monospace';ctx.textAlign='center';ctx.fillText(t.guard?'★':String(t.weapon+1),t.x,t.y-32);}
 if(t.shield>0){ctx.strokeStyle='#d2f3a8';ctx.globalAlpha=.45+.25*Math.sin(elapsed*12);ctx.lineWidth=2;ctx.beginPath();ctx.arc(t.x,t.y,24,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;}
}
function drawCityGround(){
 ctx.fillStyle='#626c70';ctx.fillRect(0,0,600,600);
 ctx.strokeStyle='#81909333';ctx.lineWidth=1;for(let i=0;i<=600;i+=20){ctx.beginPath();ctx.moveTo(i,0);ctx.lineTo(i,600);ctx.moveTo(0,i);ctx.lineTo(600,i);ctx.stroke();}
 ctx.fillStyle='#333f48';for(const x of [40,280,520])ctx.fillRect(x,0,40,600);for(const y of [0,160,200,320,480])ctx.fillRect(0,y,600,40);
 for(const x of [120,160,360,400])ctx.fillRect(x,200,40,160);
 ctx.strokeStyle='#dab87599';ctx.setLineDash([12,12]);ctx.lineWidth=2;
 for(const x of [60,300,540]){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,520);ctx.stroke();}
 for(const y of [180,340,500]){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(600,y);ctx.stroke();}ctx.setLineDash([]);
 ctx.fillStyle='#e0e4d1a0';for(const x of [40,280,520])for(const y of [164,324,484])for(let i=0;i<4;i++)ctx.fillRect(x+i*9+2,y,5,30);
 ctx.fillStyle='#293940';ctx.fillRect(160,520,280,80);ctx.strokeStyle='#d6c28466';ctx.strokeRect(164,524,272,72);ctx.fillStyle='#dfd4a1';ctx.font='9px monospace';ctx.textAlign='left';ctx.fillText('HQ / 大本营',168,536);
}
function drawBuilding([c,r,w,h],index){
 const x=c*40+2,y=r*40+2,width=w*40-4,height=h*40-4,z=24;
 const colors=[['#8c9ba4','#465a68','#647885'],['#9c9a8c','#5d605b','#777b72'],['#829997','#3e5c61','#607b7d']][index%3];
 box(x,y,width,height,z,...colors);
 ctx.fillStyle='#bbc7c633';ctx.fillRect(x+7,y-z+7,width-14,height-14);ctx.strokeStyle='#d4dfd455';ctx.strokeRect(x+6,y-z+6,width-12,height-12);
 // Rooftop equipment stays inside the solid building footprint.
 box(x+14,y+8,24,20,8,'#647780','#364951','#52666e');ctx.strokeStyle='#b0c0b566';for(let i=0;i<4;i++){ctx.beginPath();ctx.moveTo(x+17,y+3+i*4);ctx.lineTo(x+35,y+3+i*4);ctx.stroke();}
 ctx.fillStyle='#cddaa8';for(let wx=x+10;wx<x+width-6;wx+=17)ctx.fillRect(wx,y+height-z+7,8,6);
 ctx.fillStyle='#d0dddba6';ctx.font='9px monospace';ctx.textAlign='right';ctx.fillText('B'+(index+1),x+width-9,y+height-z-9);
}
function draw(){
 ctx.clearRect(0,0,600,620);ctx.fillStyle='#15251d';ctx.fillRect(0,0,600,620);ctx.save();ctx.translate(0,12);
 if(currentMap==='city')drawCityGround();else{
 ctx.fillStyle='#304437';ctx.fillRect(0,0,600,600);
 for(let r=0;r<15;r++)for(let c=0;c<15;c++){ctx.fillStyle=(c+r)%2?'#ffffff03':'#00000005';ctx.fillRect(c*40,r*40,40,40);ctx.fillStyle='#b4b6810b';ctx.fillRect(c*40+8+(r*7%21),r*40+19,2,2);}
 ctx.fillStyle='#bcbd8610';for(const c of [1,7,13])ctx.fillRect(c*40+10,0,20,540);
 ctx.strokeStyle='#bac5a525';ctx.setLineDash([5,9]);for(const x of [60,300,540]){ctx.beginPath();ctx.moveTo(x,14);ctx.lineTo(x,110);ctx.stroke();}ctx.setLineDash([]);}
 ctx.fillStyle='#daa97a';ctx.font='9px monospace';ctx.textAlign='center';for(const x of [60,300,540])ctx.fillText('▼',x,13);
 box(base.x-18,base.y-17,36,34,7,baseAlive?'#cabb73':'#5d6050','#77713e','#91884a');ctx.fillStyle=baseAlive?'#fff0af':'#959381';ctx.font='25px serif';ctx.fillText(baseAlive?'⚑':'×',base.x,base.y+6);
 const objects=[...(currentMap==='city'?CITY_BLOCKS.map((block,index)=>({y:(block[1]+block[3])*40,draw:()=>drawBuilding(block,index)})):[]),...walls.filter(w=>!w.building).map(w=>({y:w.y+40,draw:()=>{
  const brick=w.type==='brick';box(w.x+2,w.y+2,36,36,10,brick?'#b2855d':'#7b9082',brick?'#745236':'#465f52',brick?'#936942':'#617a68');
  ctx.strokeStyle=brick?'#68482f':'#b3c0a160';ctx.lineWidth=1;
  if(brick){for(const y of [4,16]){ctx.beginPath();ctx.moveTo(w.x+3,w.y+y);ctx.lineTo(w.x+37,w.y+y);ctx.stroke();}for(const [x,y]of [[20,-8],[12,4],[27,16]]){ctx.beginPath();ctx.moveTo(w.x+x,w.y+y);ctx.lineTo(w.x+x,w.y+y+12);ctx.stroke();}}
  else{ctx.strokeRect(w.x+7,w.y-3,26,25);ctx.fillStyle='#d5dac282';for(const x of [9,31])for(const y of [0,18])ctx.fillRect(w.x+x,w.y+y,2,2);}
 }})),...[player,...allies,...enemies].map(t=>({y:t.y+15,draw:()=>drawTank(t)}))];
 objects.sort((a,b)=>a.y-b.y).forEach(o=>o.draw());
 if(locked){ctx.strokeStyle='#ffd189';ctx.lineWidth=2;ctx.setLineDash([7,5]);ctx.strokeRect(locked.x-24,locked.y-29,48,48);ctx.setLineDash([]);ctx.fillStyle='#ffe8ac';ctx.font='9px monospace';ctx.fillText('LOCK',locked.x,locked.y-35);}
 for(const b of bullets){ctx.fillStyle=b.color;ctx.shadowColor=ctx.fillStyle;ctx.shadowBlur=8;ctx.beginPath();ctx.arc(b.x,b.y-5,3,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;}
 for(const p of particles){ctx.globalAlpha=Math.min(1,p.life*3);ctx.fillStyle=p.color;ctx.fillRect(p.x,p.y-6,4,4);}ctx.globalAlpha=1;ctx.restore();
}

for(const b of document.querySelectorAll('[data-map]'))b.onclick=()=>changeMap(b.dataset.map);
$('action').onclick=()=>{if(mode==='paused'){mode='playing';sync();}else reset(true);canvas.focus({preventScroll:true});};
$('lock').onclick=()=>{autoLock=!autoLock;acquireTarget();syncSkills();canvas.focus({preventScroll:true});};
$('auto').onclick=toggleAuto;$('evac').onclick=evacuate;
$('restart').onclick=()=>{reset(true);canvas.focus({preventScroll:true});};$('pause').onclick=()=>{pause();canvas.focus({preventScroll:true});};
for(const name of Object.keys(skillConfig))$(name).onclick=()=>useSkill(name);
for(const button of document.querySelectorAll('[data-weapon]'))button.onclick=()=>selectWeapon(+button.dataset.weapon);
const controlKeys=['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyW','KeyA','KeyS','KeyD','Space','ShiftLeft','ShiftRight','KeyX'];
window.addEventListener('keydown',e=>{
 if(e.code==='KeyP'&&!e.repeat){pause();e.preventDefault();return;}
 if(e.code==='KeyM'&&!e.repeat){toggleAuto();e.preventDefault();return;}
 if(mode!=='playing')return;
 if(/^Digit[1-4]$/.test(e.code)&&!e.repeat){selectWeapon(+e.code.slice(-1)-1);e.preventDefault();return;}
 if(e.code==='KeyR'&&!e.repeat){evacuate();e.preventDefault();return;}
 const skill={KeyQ:'dash',KeyE:'stealth',KeyF:'shield'}[e.code];if(skill&&!e.repeat){useSkill(skill);e.preventDefault();return;}
 if(e.code==='KeyX'&&selfLatched){e.preventDefault();return;}
 if(controlKeys.includes(e.code)&&!(e.target instanceof HTMLButtonElement)){e.preventDefault();if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyW','KeyA','KeyS','KeyD'].includes(e.code)&&autoMode)toggleAuto();keys.add(e.code);}
});
window.addEventListener('keyup',e=>{keys.delete(e.code);if(e.code==='KeyX'){selfCharge=0;selfLatched=false;}});window.addEventListener('blur',()=>{keys.clear();if(mode==='playing')pause();});document.addEventListener('visibilitychange',()=>{if(document.hidden&&mode==='playing')pause();});
for(const button of document.querySelectorAll('[data-key]')){button.addEventListener('pointerdown',e=>{e.preventDefault();if(mode!=='playing')return;button.setPointerCapture(e.pointerId);if(button.dataset.key==='KeyX')selfLatched=false;if(button.dataset.key.startsWith('Arrow')&&autoMode)toggleAuto();keys.add(button.dataset.key);});for(const event of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(event,()=>{keys.delete(button.dataset.key);if(button.dataset.key==='KeyX'){selfCharge=0;selfLatched=false;}});}
let last=0,accumulator=0;function frame(now){const dt=last?Math.min((now-last)/1000,.05):0;last=now;accumulator+=dt;while(accumulator>=1/120){update(1/120);accumulator-=1/120;}draw();if(mode==='playing')syncSkills();requestAnimationFrame(frame);}
reset();draw();requestAnimationFrame(frame);
