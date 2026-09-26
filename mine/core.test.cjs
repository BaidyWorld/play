const assert = require('node:assert/strict');
const M = require('./core.js');
const fresh = () => M.create('4149');
assert.deepEqual(fresh(), fresh(), 'same seed yields same world');
assert.notDeepEqual(fresh().tiles, M.create('other').tiles, 'different seeds');
let s = fresh();
assert.equal(s.tiles.flat().filter(t=>t==='crystal').length,3);
assert.equal(M.move(s,0,-1).ok,false,'cannot leave walking surface');
assert.equal(M.act(s,0,20,'pick').ok,false,'no remote mining');
s.tiles[3][s.x]='rock';
assert.equal(M.move(s,0,1).ok,false,'solid collision');
M.act(s,s.x,3,'pick'); assert.equal(s.tiles[3][s.x],'rock');
M.act(s,s.x,3,'pick'); assert.equal(s.tiles[3][s.x],'air');
assert.equal(s.stones,7); assert.equal(M.move(s,0,1).ok,true);
s.tiles[4][s.x]='water'; const n=s.stones;
assert.equal(M.move(s,0,1).ok,false); M.act(s,s.x,4,'stone');
assert.equal(s.tiles[4][s.x],'bridge'); assert.equal(s.stones,n-1);
assert.equal(M.move(s,0,1).ok,true);
s.tiles[5][s.x]='water';s.stones=0;assert.equal(M.act(s,s.x,5,'stone').ok,false);
s.tiles[5][s.x]='crystal';for(let i=0;i<3;i++)M.act(s,s.x,5,'pick');
assert.equal(s.crystals,1);M.act(s,s.x,5,'pick');assert.equal(s.crystals,1);
M.act(s,s.x,s.y,'torch');assert.equal(s.torches.length,1);
M.act(s,s.x,s.y,'torch');assert.equal(s.torches.length,1);
assert.equal(M.move(s,2,0).ok,false,'no teleport');
assert.equal(M.act(s,-1,0,'pick').ok,false,'bounds');
assert.equal(M.restore('{bad'),null);assert.equal(M.restore('{}'),null);
s=fresh();assert.deepEqual(M.restore(JSON.stringify(s)),s);
for(const change of [t=>t.x=-1,t=>t.stones=-1,t=>t.tiles[2][t.x]='rock',t=>t.tiles[5][5]='bad',t=>t.torches=[{x:999,y:1}],t=>t.crystals=3,t=>t.seen=[]]){
 const bad=fresh();change(bad);assert.equal(M.restore(JSON.stringify(bad)),null,'reject invalid save');
}
// Traverse a real generated mine using only public actions, then return via the excavated route.
for(const seed of ['4149','a','b','c','矿洞']){
 s=M.create(seed);
 const targets=[];s.tiles.forEach((r,y)=>r.forEach((t,x)=>{if(t==='crystal')targets.push({x,y})}));
 const walk=(x,y)=>{let guard=0;while(s.x!==x||s.y!==y){assert.ok(guard++<500);const dx=Math.sign(x-s.x),dy=dx?0:Math.sign(y-s.y),nx=s.x+dx,ny=s.y+dy;
  for(let i=0;i<3;i++){const t=s.tiles[ny][nx];if(t==='water')M.act(s,nx,ny,'stone');else if(!M.passable(t))M.act(s,nx,ny,'pick');}
  assert.equal(M.move(s,dx,dy).ok,true,`traversable ${seed} ${nx},${ny}`);
 }};
 for(const t of targets)walk(t.x,t.y);
 assert.equal(s.crystals,3);assert.equal(s.won,false);walk(M.HOME,2);assert.equal(s.won,true);
 assert.equal(M.move(s,1,0).ok,false,'won state frozen');
 assert.deepEqual(M.restore(JSON.stringify(s)),s,'completed save valid');
}
console.log('PASS: deterministic generation, collisions, mining, water bridges, inventory, torches, invalid saves, five complete expeditions');
