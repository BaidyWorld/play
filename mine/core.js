/* Shared rules: browser global and Node tests; no DOM or storage dependencies. */
(function(root){
 'use strict';
 const W=25,H=29,HOME=12,types=['air','dirt','rock','water','crystal','bridge'];
 const passable=t=>t==='air'||t==='bridge';
 const inside=(x,y)=>Number.isInteger(x)&&Number.isInteger(y)&&x>=0&&x<W&&y>=2&&y<H;
 function reveal(s){for(let y=2;y<H;y++)for(let x=0;x<W;x++)if(Math.hypot(x-s.x,y-s.y)<=4.5)s.seen[y][x]=true;}
 function create(seed){
  seed=String(seed).trim().slice(0,24)||'4149';let h=2166136261;
  for(const c of seed)h=Math.imul(h^c.charCodeAt(0),16777619);
  const rand=()=>{h+=0x6D2B79F5;let t=Math.imul(h^h>>>15,1|h);t^=t+Math.imul(t^t>>>7,61|t);return((t^t>>>14)>>>0)/4294967296;};
  const tiles=Array.from({length:H},(_,y)=>Array.from({length:W},()=>y<=2?'air':rand()<(y>12?.68:.23)?'rock':'dirt'));
  // Small isolated water pockets are always surrounded by mineable material.
  for(let y=7;y<H-1;y+=5){let x=2+Math.floor(rand()*(W-4));tiles[y][x]='water';tiles[y][x+1]='water';}
  for(const y of [9,17,25]){let x=3+Math.floor(rand()*(W-6));tiles[y][x]='crystal';}
  const s={version:1,seed,tiles,x:HOME,y:2,stones:6,crystals:0,torches:[],damage:{},seen:Array.from({length:H},()=>Array(W).fill(false)),steps:0,won:false};
  reveal(s);return s;
 }
 const result=(ok,message)=>({ok,message});
 function move(s,dx,dy){
  if(s.won)return result(false,'灯塔已经点亮啦！');
  if(!Number.isInteger(dx)||!Number.isInteger(dy)||Math.abs(dx)+Math.abs(dy)!==1)return result(false,'每次移动一格');
  const x=s.x+dx,y=s.y+dy;
  if(!inside(x,y))return result(false,'已经到矿洞边缘了');
  if(!passable(s.tiles[y][x]))return result(false,s.tiles[y][x]==='water'?'前面有水，切换石块铺一座桥':'先用镐子挖开前面的方块');
  s.x=x;s.y=y;s.steps++;reveal(s);
  if(x===HOME&&y===2&&s.crystals===3){s.won=true;return result(true,'三颗水晶归位，灯塔亮起来了！');}
  return result(true,y===2?'营地在地面中央，带三颗水晶回来吧':'绳索已固定，可以沿通道上下攀爬');
 }
 function act(s,x,y,tool){
  if(s.won)return result(false,'灯塔已经点亮啦！');
  if(!inside(x,y)||Math.abs(s.x-x)+Math.abs(s.y-y)>1)return result(false,'只能操作自己或上下左右相邻的一格');
  const t=s.tiles[y][x],key=x+','+y;
  if(tool==='torch'){
   if(!passable(t)||y<3)return result(false,'把火把放在挖开的地下通道里');
   if(s.torches.some(p=>p.x===x&&p.y===y))return result(false,'这里已经有火把了');
   s.torches.push({x,y});return result(true,'火把留下了明亮的路标');
  }
  if(tool==='stone'){
   if(t!=='water')return result(false,'石块用来填平地下水，铺出可以行走的桥');
   if(s.stones<=0)return result(false,'石块用完了，挖掘岩石就能补充');
   s.stones--;s.tiles[y][x]='bridge';return result(true,'石桥铺好了，可以通过！');
  }
  if(tool!=='pick')return result(false,'请选择工具');
  if(t==='water')return result(false,'水不能挖，用石块搭桥吧');
  if(passable(t))return result(false,'这里已经挖通了，用方向键移动');
  const hardness=t==='crystal'?3:t==='rock'?2:1;
  s.damage[key]=(s.damage[key]||0)+1;
  if(s.damage[key]<hardness)return result(true,`再敲 ${hardness-s.damage[key]} 下就挖开了`);
  delete s.damage[key];s.tiles[y][x]='air';
  if(t==='rock')s.stones++;
  if(t==='crystal')s.crystals++;
  reveal(s);return result(true,t==='crystal'?(s.crystals===3?'水晶集齐！沿通道返回地面营地':'找到一颗能量水晶！'):t==='rock'?'岩石挖开了，石块 +1':'泥土挖开了，向前探索吧');
 }
 function restore(raw){
  try{
   const s=JSON.parse(raw);
   if(!s||s.version!==1||typeof s.seed!=='string'||!s.seed.length||s.seed.length>24||!inside(s.x,s.y)||typeof s.won!=='boolean')return null;
   const grid=(g,test)=>Array.isArray(g)&&g.length===H&&g.every(r=>Array.isArray(r)&&r.length===W&&r.every(test));
   if(!grid(s.tiles,t=>types.includes(t))||!grid(s.seen,t=>typeof t==='boolean')||!passable(s.tiles[s.y][s.x]))return null;
   if(s.tiles.slice(0,3).some(r=>r.some(t=>t!=='air')))return null;
   if(![s.stones,s.crystals,s.steps].every(n=>Number.isSafeInteger(n)&&n>=0)||s.crystals>3||s.stones>W*H+6)return null;
   if(s.tiles.flat().filter(t=>t==='crystal').length+s.crystals!==3)return null;
   if(s.won!==(s.crystals===3&&s.x===HOME&&s.y===2))return null;
   if(!Array.isArray(s.torches)||s.torches.length>W*H||s.torches.some(p=>!p||!inside(p.x,p.y)||p.y<3||!passable(s.tiles[p.y][p.x])))return null;
   if(new Set(s.torches.map(p=>p.x+','+p.y)).size!==s.torches.length)return null;
   if(!s.damage||typeof s.damage!=='object'||Array.isArray(s.damage))return null;
   for(const [key,n] of Object.entries(s.damage)){
    if(!/^\d+,\d+$/.test(key))return null;const [x,y]=key.split(',').map(Number);
    if(!inside(x,y)||!Number.isInteger(n)||n<1||n>=(s.tiles[y][x]==='crystal'?3:s.tiles[y][x]==='rock'?2:1))return null;
   }
   return s;
  }catch{return null;}
 }
 const api={W,H,HOME,create,move,act,restore,passable};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.Mine=api;
})(typeof globalThis!=='undefined'?globalThis:this);
