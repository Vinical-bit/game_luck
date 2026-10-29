(() => {
'use strict';
const W = 180, H = 216, BASE = 190;
const cv = document.getElementById('cv');
const ctx = cv.getContext('2d');
ctx.imageSmoothingEnabled = false;
const stage = document.getElementById('stage');

/* ---------- palette ---------- */
const C = {
  line:'#33243a', fur:'#b9a296', furD:'#8c7068', tan:'#d09a62', white:'#f7f2ec', whiteS:'#ddd2c8',
  nose:'#2a1f26', tongue:'#ee6a86', tongueD:'#c94a68', navy:'#26337d', blue:'#4d82ff', eye:'#2a1a14'
};

/* ---------- drawing helpers ---------- */
function R(x,y,w,h,c){ ctx.fillStyle=c; ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h)); }
function E(cx,cy,rx,ry,c){
  ctx.fillStyle=c; cx=Math.round(cx); cy=Math.round(cy);
  const n=Math.floor(ry);
  for(let y=-n;y<=n;y++){
    const k=1-(y*y)/(ry*ry); if(k<0) continue;
    const hw=Math.round(rx*Math.sqrt(k));
    ctx.fillRect(cx-hw,cy+y,hw*2+1,1);
  }
}
function EO(cx,cy,rx,ry,c){ E(cx,cy,rx+1,ry+1,C.line); E(cx,cy,rx,ry,c); }
function LN(x0,y0,x1,y1,c){
  const n=Math.max(1,Math.max(Math.abs(x1-x0),Math.abs(y1-y0)));
  ctx.fillStyle=c;
  for(let i=0;i<=n;i++) ctx.fillRect(Math.round(x0+(x1-x0)*i/n),Math.round(y0+(y1-y0)*i/n),1,1);
}
function drawMap(map,pal,x,y){
  x=Math.round(x); y=Math.round(y);
  const h=map.length,w=map[0].length;
  const filled=(i,j)=> i>=0&&j>=0&&i<h&&j<w&&map[i][j]!=='.';
  ctx.fillStyle=C.line;
  for(let i=0;i<h;i++)for(let j=0;j<w;j++){
    if(!filled(i,j)) continue;
    if(!filled(i-1,j)) ctx.fillRect(x+j,y+i-1,1,1);
    if(!filled(i+1,j)) ctx.fillRect(x+j,y+i+1,1,1);
    if(!filled(i,j-1)) ctx.fillRect(x+j-1,y+i,1,1);
    if(!filled(i,j+1)) ctx.fillRect(x+j+1,y+i,1,1);
  }
  for(let i=0;i<h;i++)for(let j=0;j<w;j++){
    const ch=map[i][j]; if(ch==='.') continue;
    ctx.fillStyle=pal[ch]; ctx.fillRect(x+j,y+i,1,1);
  }
}

/* ---------- item sprites ---------- */
const SPR = {
  bone:{ pal:{X:'#f7f2ec',S:'#d7ccc2'}, map:[
    'XX.......XX','XXXXXXXXXXX','XXXXXXXXXXX','XSSSSSSSSSX','XX.......XX'] },
  ball:{ pal:{Y:'#c9e83a',G:'#8fb81a',W:'#ffffff'}, map:[
    '..YYY..','.YYYYY.','YWYYYYY','YYWWYYG','YYYYWWG','.YYYYG.','..GGG..'] },
  gem:{ pal:{L:'#e4c9ff',M:'#a56bff',D:'#6a35c4',W:'#ffffff'}, map:[
    '..LLLLL..','.LWLMMMD.','LLLMMMDDD','LLMMMDDDD','.LMMMDDD.','..MMDDD..','...MDD...','....D....'] },
  rose:{ pal:{W:'#ffffff',S:'#cfc4dd',G:'#3fae6a'}, map:[
    '..WWW..','.WWSWW.','WWSWWSW','WSWWSWW','.WWWWW.','..GWG..','...G...','..GG...','...G...','...G...'] }
};
const VAL = {
  ball:{pts:1,happy:3}, bone:{pts:2,happy:6}, rose:{pts:3,happy:10}, gem:{pts:5,happy:12}
};

/* ---------- texts ---------- */
const pick = a => a[Math.floor(Math.random()*a.length)];
const T = {
  hello:'Oi! Aqui é o Luck. Passei pra te fazer companhia um pouquinho. Me faz um cafuné?',
  pet:['Aaah, bem aí atrás da orelha.','Pode continuar. Eu não vou reclamar.','Cafuné: aprovado.','Esse é o meu ponto fraco, sabia?','Hmm... já tô até esquecendo o que eu ia fazer.'],
  treat:['Nham nham! Petisco resolve muita coisa.','Dia ruim perde pra petisco. Fato.','Isso aí! Mais um desses e eu viro seu fã.'],
  ball:['A bolinha! Eu sempre fui bom nisso.','Peguei! Tá vendo? Talento.'],
  gem:['Uma ametista! Dizem que é a favorita da minha humana.','Brilhou! Essa pedra é das boas.'],
  rose:['Uma rosa branca! Chique. Mas não é pra comer, né?','Rosa branca pega. Até eu sei que combina com você.'],
  bark:['AU AU! (Tradução: tô aqui contigo.)','AU! (Isso quer dizer: você é demais.)','Au! Au! (Pode ir no seu ritmo.)'],
  play:'Chuva de coisa boa! Arrasta o dedo pra me mover. Aqui ninguém perde, só pega.',
  stop:'Beleza, pausa. Eu aproveito e respiro um pouco.',
  idle:['Dia pesado? Pode ficar aqui um pouquinho.','Sem pressa. Eu espero.','Não precisa resolver tudo hoje.','Se quiser, eu só fico do seu lado. Sou bom nisso.','Respira fundo. Depois, petisco.','Você tá fazendo o seu melhor, e isso já conta.']
};

/* ---------- state ---------- */
const dog = {x:90,target:90,hop:0,wag:7,pet:0,chew:0,bark:0,jump:0,blink:0,nextBlink:2,moving:false};
const items=[], parts=[], petals=[];
let started=false, play=false, spawnT=1, score=0, happy=0, level=1, t=0, last=0;
let muted=false, sayLock=0, lastPet=0, lastPetSay=0, lastSay=0, petalT=0;

/* ---------- audio ---------- */
let ac=null;
function audioInit(){
  try{
    if(!ac) ac=new (window.AudioContext||window.webkitAudioContext)();
    if(ac.state==='suspended') ac.resume();
  }catch(e){}
}
function tone(f,d,o={}){
  if(muted||!ac) return;
  try{
    const type=o.type||'square', vol=o.vol==null?0.05:o.vol, at=ac.currentTime+(o.delay||0);
    const osc=ac.createOscillator(), g=ac.createGain();
    osc.type=type; osc.frequency.setValueAtTime(f,at);
    if(o.to) osc.frequency.exponentialRampToValueAtTime(o.to,at+d);
    g.gain.setValueAtTime(vol,at); g.gain.exponentialRampToValueAtTime(0.0001,at+d);
    osc.connect(g); g.connect(ac.destination); osc.start(at); osc.stop(at+d+0.03);
  }catch(e){}
}
const SFX = {
  bark(){ tone(640,.09,{to:300,vol:.07}); tone(560,.12,{to:230,delay:.14,vol:.07}); },
  pet(){ tone(660,.06,{vol:.035}); tone(880,.08,{delay:.07,vol:.035}); },
  chomp(){ tone(180,.07,{type:'triangle',vol:.1}); tone(150,.07,{type:'triangle',delay:.1,vol:.1}); tone(523,.08,{delay:.2,vol:.04}); },
  ball(){ tone(500,.07,{vol:.05}); tone(750,.09,{delay:.07,vol:.05}); },
  gem(){ [784,988,1175,1568].forEach((f,i)=>tone(f,.1,{delay:i*.07,vol:.05})); },
  rose(){ [659,880,1047].forEach((f,i)=>tone(f,.1,{delay:i*.08,vol:.045,type:'triangle'})); },
  level(){ [523,659,784,1047,784,1047,1319].forEach((f,i)=>tone(f,.13,{delay:i*.1,vol:.055})); },
  start(){ [392,523,659,784].forEach((f,i)=>tone(f,.1,{delay:i*.08,vol:.05})); }
};

/* ---------- HUD / dialogue ---------- */
const $ = id => document.getElementById(id);
const elBar=$('bar'), elScore=$('score'), elLvl=$('lvl'), elTxt=$('txt');
function hud(){
  elBar.style.width=Math.min(100,happy)+'%';
  elScore.textContent=String(score).padStart(4,'0');
  elLvl.textContent=level;
}
let typer=null;
function say(text,force){
  const now=performance.now();
  if(!force && now<sayLock) return;
  sayLock=now+2600; lastSay=now;
  if(typer) clearInterval(typer);
  elTxt.textContent=''; let i=0;
  typer=setInterval(()=>{
    elTxt.textContent=text.slice(0,++i);
    if(i>=text.length){ clearInterval(typer); typer=null; }
  },26);
}
function pop(txt,x,y,cls){
  const s=document.createElement('span');
  s.className='pop '+(cls||''); s.textContent=txt;
  s.style.left=(x/W*100)+'%'; s.style.top=(y/H*100)+'%';
  stage.appendChild(s); setTimeout(()=>s.remove(),1000);
}

/* ---------- particles ---------- */
const SPARK=['#ffffff','#ffffff','#ffffff','#e9ddff'];
function sparkles(x,y,n){
  for(let i=0;i<n;i++) parts.push({k:'s',x:x+(Math.random()-.5)*10,y:y+(Math.random()-.5)*6,
    vx:(Math.random()-.5)*26,vy:-14-Math.random()*22,life:.8+Math.random()*.5,max:1.2,c:pick(SPARK)});
}
function confetti(n){
  const cols=['#ffffff','#ffffff','#ffffff','#f1e9ff','#c9a6ff','#a56bff'];
  for(let i=0;i<n;i++) parts.push({k:'c',x:Math.random()*W,y:-6-Math.random()*40,
    vx:(Math.random()-.5)*20,vy:30+Math.random()*40,life:2.6,max:2.6,c:pick(cols)});
}
function poof(x,y){
  for(let i=0;i<4;i++) parts.push({k:'p',x:x+(Math.random()-.5)*6,y:y,vx:(Math.random()-.5)*20,vy:-8-Math.random()*8,life:.5,max:.5,c:'#cbb8ee'});
}

/* ---------- game actions ---------- */
function addHappy(v){
  happy+=v;
  if(happy>=100){
    happy=0; level=Math.min(99,level+1);
    confetti(46); SFX.level();
    pop('NÍVEL '+level, W/2, 62, 'big');
    say(level===2?'NÍVEL 2! Ânimo subindo. Eu avisei que petisco funciona.'
       :level===3?'NÍVEL 3! Já tô sem fôlego de tanta alegria.'
       :'NÍVEL '+level+'! Você é muito boa nisso.', true);
  }
  hud();
}
function pet(){
  const n=performance.now();
  dog.pet=1.1;
  if(n-lastPet>350){
    lastPet=n; addHappy(2); sparkles(dog.x+(Math.random()-.5)*24, BASE-112, 2); SFX.pet();
  }
  if(n-lastPetSay>5000){ lastPetSay=n; say(pick(T.pet)); }
}
function bark(){
  dog.bark=.35; SFX.bark();
  pop('AU!', dog.x+26, BASE-112);
  say(pick(T.bark),true); addHappy(2); sparkles(dog.x, BASE-100, 3);
}
function spawn(type,x,y){
  items.push({type,x,y,vy:(type==='bone'&&y>0)?58:34+Math.random()*26,seed:Math.random()*6});
}
function spawnRandom(){
  const r=Math.random();
  const type=r<.28?'ball':r<.48?'bone':r<.80?'rose':'gem';
  spawn(type,14+Math.random()*(W-28),-8);
}
function caught(it){
  const v=VAL[it.type];
  score+=v.pts; dog.jump=.35;
  pop('+'+v.pts,it.x,it.y-4);
  sparkles(dog.x,BASE-104,it.type==='gem'?6:3);
  if(it.type==='bone'){ dog.chew=1.1; SFX.chomp(); say(pick(T.treat)); }
  else if(it.type==='ball'){ SFX.ball(); if(Math.random()<.35) say(pick(T.ball)); }
  else if(it.type==='rose'){ SFX.rose(); say(pick(T.rose)); }
  else { SFX.gem(); say(pick(T.gem)); }
  addHappy(v.happy);
}

/* ---------- update ---------- */
function update(dt){
  t+=dt;
  const d=dog.target-dog.x, step=Math.max(-95*dt,Math.min(95*dt,d));
  dog.x+=step; dog.moving=Math.abs(d)>1.5;
  dog.pet=Math.max(0,dog.pet-dt); dog.chew=Math.max(0,dog.chew-dt);
  dog.bark=Math.max(0,dog.bark-dt); dog.jump=Math.max(0,dog.jump-dt);
  dog.nextBlink-=dt; if(dog.nextBlink<=0){ dog.blink=.13; dog.nextBlink=2+Math.random()*3; }
  dog.blink=Math.max(0,dog.blink-dt);
  dog.wag=dog.pet>0?22:(dog.moving?14:7);
  let hop=0;
  if(dog.jump>0) hop+=Math.sin((1-dog.jump/.35)*Math.PI)*9;
  if(dog.moving) hop+=Math.abs(Math.sin(t*16))*1.5;
  dog.hop=hop;

  if(started && play){
    spawnT-=dt;
    if(spawnT<=0 && items.length<7){ spawnRandom(); spawnT=.9+Math.random()*.9; }
  }
  for(let i=items.length-1;i>=0;i--){
    const it=items[i];
    it.y+=it.vy*dt; it.x+=Math.sin(t*2+it.seed)*6*dt;
    if(Math.abs(it.x-dog.x)<26 && it.y>BASE-118 && it.y<BASE-34){ caught(it); items.splice(i,1); continue; }
    if(it.y>BASE+6){ poof(it.x,BASE+2); items.splice(i,1); }
  }
  for(let i=parts.length-1;i>=0;i--){
    const p=parts[i]; p.life-=dt;
    if(p.life<=0||p.y>H+6){ parts.splice(i,1); continue; }
    p.x+=p.vx*dt; p.y+=p.vy*dt;
    if(p.k==='s') p.vy+=24*dt;
  }
  petalT-=dt;
  if(petalT<=0){ if(Math.random()<.5) petals.push({x:20+Math.random()*28,y:110+Math.random()*18,vy:9+Math.random()*6,s:Math.random()*6,c:'#f5c73a'});
    else petals.push({x:150+Math.random()*24,y:148+Math.random()*8,vy:-6-Math.random()*4,s:Math.random()*6,c:'#ffffff',w:1}); petalT=1.2+Math.random()*1.2; }
  for(let i=petals.length-1;i>=0;i--){
    const p=petals[i]; if(p.w&&p.vy<0&&p.y<125) p.vy=10; p.y+=p.vy*dt; p.x+=Math.sin(t*1.6+p.s)*10*dt+(p.w?-4:3)*dt;
    if(p.y>BASE+8||p.y<95) petals.splice(i,1);
  }
  if(started && performance.now()-lastSay>16000){ say(pick(T.idle)); }
}

/* ---------- scene ---------- */
const stars=[]; { let s=7; const rnd=()=>{s=(s*16807)%2147483647;return s/2147483647;};
  for(let i=0;i<34;i++) stars.push({x:Math.floor(rnd()*W),y:Math.floor(rnd()*118),p:rnd()*6,b:rnd()<.2}); }
const tufts=[]; { let s=11; const rnd=()=>{s=(s*16807)%2147483647;return s/2147483647;};
  for(let i=0;i<40;i++) tufts.push({x:Math.floor(rnd()*W),y:166+Math.floor(rnd()*(H-170))}); }

function drawSky(){
  const bands=[[0,'#1a0d3d'],[38,'#241255'],[74,'#321a73'],[106,'#452590'],[136,'#5a35a8']];
  for(let i=0;i<bands.length;i++){
    const y0=bands[i][0], y1=i+1<bands.length?bands[i+1][0]:162;
    R(0,y0,W,y1-y0,bands[i][1]);
    if(i+1<bands.length) for(let x=0;x<W;x+=2) R(x+((y1/2)%2?0:1),y1-2,1,1,bands[i+1][1]);
  }
  // moon
  E(28,26,9,9,'#fff3cf'); E(25,23,2,2,'#eadcae'); E(32,29,2,1,'#eadcae'); E(31,21,1,1,'#eadcae');
  // stars
  for(const s of stars){
    const on=Math.sin(t*2+s.p)>-.4;
    if(!on) continue;
    R(s.x,s.y,1,1,'#ffffff');
    if(s.b){ R(s.x-1,s.y,3,1,'#d9c6ff'); R(s.x,s.y-1,1,3,'#d9c6ff'); }
  }
}
function drawWheel(){
  const cx=136,cy=88,r=30;
  LN(cx,cy,119,161,'#6d4ab5'); LN(cx,cy,153,161,'#6d4ab5');
  LN(cx+1,cy,120,161,'#6d4ab5'); LN(cx+1,cy,154,161,'#6d4ab5');
  for(let a=0;a<6.283;a+=.035) R(cx+Math.cos(a)*r,cy+Math.sin(a)*r,1,1,'#8a66d6');
  for(let a=0;a<6.283;a+=.05) R(cx+Math.cos(a)*(r-6),cy+Math.sin(a)*(r-6),1,1,'#6d4ab5');
  for(let k=0;k<8;k++){
    const a=t*.14+k*Math.PI/4;
    LN(cx,cy,cx+Math.cos(a)*r,cy+Math.sin(a)*r,'#7a58c6');
    const gx=cx+Math.cos(a)*r, gy=cy+Math.sin(a)*r;
    R(gx-2,gy-1,4,4,k%2?'#ffd9a8':'#e9ddff'); R(gx-2,gy+3,4,1,'#2a1155');
  }
  R(cx-2,cy-2,4,4,'#e9ddff');
}
function drawTree(){
  R(22,118,5,46,'#5b3a2a'); R(22,118,2,46,'#7a503a'); R(16,160,17,3,'#5b3a2a');
  LN(24,128,12,114,'#5b3a2a'); LN(25,126,38,112,'#5b3a2a');
  E(24,104,19,15,'#b5800f'); E(12,113,12,9,'#b5800f'); E(37,111,13,9,'#b5800f');
  E(23,101,17,12,'#d9a21b'); E(12,110,10,7,'#d9a21b'); E(37,108,11,7,'#d9a21b');
  E(19,96,9,5,'#f5c73a'); E(33,102,6,4,'#f5c73a'); E(10,106,5,3,'#f5c73a');
  for(let i=0;i<14;i++){ const px=8+((i*37)%32), py=92+((i*53)%26); R(px,py,2,1,'#ffe27a'); }
}
function drawGround(){
  R(0,162,W,H-162,'#2f6e55'); R(0,162,W,2,'#245a45');
  for(let y=172;y<H;y+=10) R(0,y,W,1,'#37795e');
  for(const f of tufts){ R(f.x,f.y,1,2,'#245a45'); R(f.x+1,f.y+1,1,1,'#245a45'); }
}
function drawBush(){
  E(162,160,18,10,'#1f4f3a'); E(160,158,16,9,'#2c6b4d'); E(168,154,10,7,'#35805c');
  const rs=[[153,153],[162,149],[170,155],[158,160],[168,161],[148,159],[175,150]];
  for(const [x,y] of rs){
    R(x-2,y-1,5,3,'#ffffff'); R(x-1,y-2,3,5,'#ffffff'); R(x,y,1,1,'#d7cce8'); R(x-1,y+1,1,1,'#d7cce8');
  }
}
function drawPetals(){ for(const p of petals){ R(p.x,p.y,2,1,p.c); if(p.w) R(p.x,p.y+1,1,1,'#e9ddff'); } }

/* ---------- dog ---------- */
function drawDog(){
  const ox=Math.round(dog.x), oy=Math.round(BASE-dog.hop);
  const wag=Math.sin(t*dog.wag);
  // shadow
  E(ox,BASE+1,30-dog.hop*.8,5,'rgba(0,0,0,.30)');

  // tail (behind)
  const segs=[]; let px=ox+22, py=oy-12, a=-.25+wag*.55;
  for(let i=0;i<8;i++){ segs.push({x:px,y:py,i}); px+=Math.cos(a)*4.5; py+=Math.sin(a)*4.5; a-=.17; }
  for(const s of segs) E(s.x,s.y,6+1,5+1,C.line);
  for(const s of segs) E(s.x,s.y,6,5,s.i>=6?C.white:(s.i>=3?C.furD:C.fur));
  for(const s of segs) if(s.i>=1&&s.i<6) E(s.x-1,s.y-1,3,2,C.tan);

  // hind legs
  EO(ox-24,oy-14,11,13,C.fur); EO(ox+24,oy-14,11,13,C.furD);
  E(ox-26,oy-9,5,6,C.tan); E(ox+26,oy-9,5,6,C.tan);
  EO(ox-24,oy-2,9,4,C.white); EO(ox+24,oy-2,9,4,C.white);

  // body
  EO(ox,oy-38,28,34,C.fur);
  E(ox-15,oy-50,6,7,C.furD); E(ox+14,oy-30,7,6,C.furD); E(ox+11,oy-58,4,4,C.furD); E(ox-20,oy-26,4,4,C.furD);
  E(ox,oy-34,15,25,C.white);
  E(ox-11,oy-22,4,5,C.white); E(ox+11,oy-22,4,5,C.white);

  // harness
  R(ox-27,oy-47,54,4,C.navy); R(ox-27,oy-47,54,1,'#3a4ba8');
  R(ox-2,oy-60,4,14,C.navy);
  R(ox-16,oy-66,32,5,C.navy); R(ox-16,oy-66,32,1,'#3a4ba8');
  R(ox-3,oy-65,6,6,C.blue); R(ox-2,oy-64,2,1,'#bcd4ff'); R(ox-1,oy-62,2,2,'#2a56c8');

  // front legs
  for(const sx of [-1,1]){
    const lx=ox+sx*11;
    R(lx-7,oy-33,14,33,C.line); R(lx-6,oy-32,12,31,C.white);
    R(lx-6,oy-32,3,29,C.whiteS);
    R(lx+2,oy-24,3,8,C.tan);
    EO(lx,oy-3,8,4,C.white);
    R(lx-2,oy-1,1,3,C.whiteS); R(lx+2,oy-1,1,3,C.whiteS);
  }

  // head
  const petting=dog.pet>0, chewing=dog.chew>0, barking=dog.bark>0;
  let hx=ox, hy=oy-88;
  if(petting) hx+=Math.round(Math.sin(t*9));
  if(chewing) hy+=Math.round(Math.abs(Math.sin(t*18))*2);
  if(barking) hy-=2;
  let ew=0; if(petting) ew=Math.round(Math.sin(t*22)*1.5); else if(dog.moving) ew=Math.round(Math.sin(t*16));
  // ears
  for(const s of [-1,1]){
    EO(hx+s*19,hy-19+ew,8,11,C.furD);
    E(hx+s*19,hy-17+ew,4,7,C.tan);
    EO(hx+s*24,hy-27+ew,4,4,C.furD);
  }
  EO(hx,hy,25,22,C.fur);
  E(hx-15,hy-9,7,6,C.furD); E(hx+16,hy-12,6,5,C.furD); E(hx-4,hy-19,3,2,C.furD);
  E(hx-18,hy+5,6,8,C.tan); E(hx+18,hy+5,6,8,C.tan);
  E(hx,hy-5,6,16,C.white);
  E(hx,hy+10,12,9,C.white);
  E(hx,hy+18,9,4,C.white);
  R(hx-12,hy-11,4,2,C.tan); R(hx+8,hy-11,4,2,C.tan);
  // eyes
  const happy_=petting||chewing;
  for(const ex of [hx-11,hx+7]){
    if(happy_){ R(ex,hy-3,1,1,C.eye); R(ex+1,hy-4,2,1,C.eye); R(ex+3,hy-3,1,1,C.eye); }
    else if(dog.blink>0){ R(ex,hy-4,4,1,C.eye); }
    else { R(ex,hy-6,4,5,C.eye); R(ex+1,hy-6,1,1,'#ffffff'); }
  }
  // nose
  R(hx-3,hy+3,6,3,C.nose); R(hx-2,hy+6,4,1,C.nose); R(hx-2,hy+3,1,1,'#7a6a78');
  // mouth
  R(hx,hy+7,1,3,C.line);
  R(hx-6,hy+9,1,1,C.line); R(hx-5,hy+10,4,1,C.line);
  R(hx+1,hy+10,4,1,C.line); R(hx+5,hy+9,1,1,C.line);
  let open=barking?4:Math.round(1.5+1.5*Math.sin(t*4));
  if(chewing) open=Math.round(1+1.5*Math.abs(Math.sin(t*18)));
  E(hx,hy+13,5,2+Math.min(open,3),'#5a1f2e');
  E(hx,hy+15+(barking?0:1),4,3+open,C.tongue);
  R(hx,hy+12,1,3+open,C.tongueD);
  if(chewing && dog.chew>.25){ R(hx-6,hy+16,12,3,C.line); R(hx-5,hy+17,10,1,C.white); R(hx-7,hy+15,2,2,C.white); R(hx+5,hy+15,2,2,C.white); }
}

/* ---------- render ---------- */
function draw(){
  drawSky(); drawWheel(); drawTree(); drawGround(); drawBush(); drawPetals();
  drawDog();
  for(const it of items){
    const s=SPR[it.type];
    drawMap(s.map,s.pal,it.x-s.map[0].length/2,it.y-s.map.length/2);
  }
  for(const p of parts){
    if(p.k==='s'){ const a=p.life/p.max; if(a<.25&&Math.floor(p.life*20)%2) continue;
      R(p.x,p.y,1,1,p.c); R(p.x-1,p.y,3,1,p.c); R(p.x,p.y-1,1,3,p.c); }
    else if(p.k==='c'){ R(p.x,p.y,2,2,p.c); }
    else { R(p.x,p.y,2,2,p.c); }
  }
}
function frame(ts){
  if(!last) last=ts;
  const dt=Math.min(.05,(ts-last)/1000); last=ts;
  update(dt); draw();
  requestAnimationFrame(frame);
}

/* ---------- input ---------- */
function toCanvas(e){
  const r=cv.getBoundingClientRect();
  return {x:(e.clientX-r.left)/r.width*W, y:(e.clientY-r.top)/r.height*H};
}
const overDog = p => Math.abs(p.x-dog.x)<28 && p.y>BASE-122 && p.y<BASE+4;
const clampX = x => Math.max(34,Math.min(W-34,x));
let down=false, downOnDog=false;
cv.addEventListener('pointerdown',e=>{
  if(!started) return;
  const p=toCanvas(e); down=true; downOnDog=overDog(p);
  try{ cv.setPointerCapture(e.pointerId); }catch(_){}
  if(downOnDog) pet(); else dog.target=clampX(p.x);
});
cv.addEventListener('pointermove',e=>{
  if(!started||!down) return;
  const p=toCanvas(e);
  if(downOnDog){ if(overDog(p)) pet(); } else dog.target=clampX(p.x);
});
const up=()=>{down=false;downOnDog=false;};
cv.addEventListener('pointerup',up); cv.addEventListener('pointercancel',up);
window.addEventListener('keydown',e=>{
  if(!started) return;
  if(e.key==='ArrowLeft'||e.key==='a'||e.key==='A'){ dog.target=clampX(dog.target-30); e.preventDefault(); }
  else if(e.key==='ArrowRight'||e.key==='d'||e.key==='D'){ dog.target=clampX(dog.target+30); e.preventDefault(); }
});

$('start').addEventListener('click',()=>{
  audioInit(); started=true; $('start').style.display='none';
  SFX.start(); lastSay=performance.now();
  say(T.hello,true);
  setTimeout(()=>{ if(started) bark(); },700);
});
$('bPet').addEventListener('click',()=>{ audioInit(); for(let i=0;i<6;i++) setTimeout(pet,i*350); });
$('bTreat').addEventListener('click',()=>{ audioInit(); spawn('bone',dog.x,30); });
$('bPlay').addEventListener('click',e=>{
  audioInit(); play=!play;
  e.currentTarget.textContent=play?'PARAR':'JOGAR';
  e.currentTarget.classList.toggle('on',play);
  say(play?T.play:T.stop,true);
});
$('bBark').addEventListener('click',()=>{ audioInit(); bark(); });
$('mute').addEventListener('click',e=>{
  muted=!muted; e.currentTarget.textContent=muted?'SOM OFF':'SOM ON';
});

/* expose for testing */
window.__luck={dog,items,spawn,SFX,get state(){return {score,happy,level,play,started};}};

hud();
requestAnimationFrame(frame);
})();
