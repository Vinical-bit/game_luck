/* Aventura: fase de plataforma com a Mari e o Luck.
   Depende de script.js (window.LuckAPI) so para som e para pausar a praca. */
(() => {
'use strict';
const API = window.LuckAPI || { tone(){}, audioInit(){}, isMuted:()=>true, setPaused(){} };

/* ================= constantes ================= */
const TS = 8, W = 216, H = 128, ROWS = 16, GROUND = 12;      // GROUND = linha do topo do chao
const COLS = 156, LEVEL_W = COLS * TS, GOAL_X = 148 * TS;
const HW = 5, PH = 20;                                       // hitbox da Mari (meia largura, altura)
const MAXS = 74, GRAV = 950, JUMP = 305, MAXFALL = 340;

const cv = document.getElementById('cv2');
const ctx = cv.getContext('2d');
ctx.imageSmoothingEnabled = false;
const $ = id => document.getElementById(id);

/* ================= paleta ================= */
const C = {
  line:'#2b1f33', skin:'#f0c4a0', skinS:'#d8a07c', hair:'#3a2418', hairL:'#5a3a28',
  top:'#ffffff', topS:'#d9cfe8', pants:'#2d2a45', shoe:'#ffffff',
  fur:'#b9a296', furD:'#8c7068', tan:'#d09a62', white:'#f7f2ec', navy:'#26337d', blue:'#4d82ff',
  nose:'#2a1f26', tongue:'#ee6a86', eyeG:'#2fbf6b'
};

/* ================= helpers de desenho ================= */
let OV = null;                                               // cor de contorno (silhueta)
function R(x,y,w,h,c){ ctx.fillStyle = OV || c; ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h)); }
function E(cx,cy,rx,ry,c){
  ctx.fillStyle = OV || c; cx = Math.round(cx); cy = Math.round(cy);
  const n = Math.floor(ry);
  for(let y=-n;y<=n;y++){
    const k = 1 - (y*y)/(ry*ry); if(k < 0) continue;
    const hw = Math.round(rx*Math.sqrt(k));
    ctx.fillRect(cx-hw, cy+y, hw*2+1, 1);
  }
}
function outlined(fn){
  OV = C.line;
  for(const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1]]){ ctx.save(); ctx.translate(dx,dy); fn(); ctx.restore(); }
  OV = null; fn();
}
function drawMap(map,pal,x,y){
  x = Math.round(x); y = Math.round(y);
  const h = map.length, w = map[0].length;
  const f = (i,j) => i>=0 && j>=0 && i<h && j<w && map[i][j] !== '.';
  ctx.fillStyle = C.line;
  for(let i=0;i<h;i++) for(let j=0;j<w;j++){
    if(!f(i,j)) continue;
    if(!f(i-1,j)) ctx.fillRect(x+j,y+i-1,1,1);
    if(!f(i+1,j)) ctx.fillRect(x+j,y+i+1,1,1);
    if(!f(i,j-1)) ctx.fillRect(x+j-1,y+i,1,1);
    if(!f(i,j+1)) ctx.fillRect(x+j+1,y+i,1,1);
  }
  for(let i=0;i<h;i++) for(let j=0;j<w;j++){
    if(map[i][j] === '.') continue;
    ctx.fillStyle = pal[map[i][j]]; ctx.fillRect(x+j,y+i,1,1);
  }
}
const SPR = {
  rose:{ pal:{W:'#ffffff',S:'#cfc4dd',G:'#3fae6a'}, map:[
    '..WWW..','.WWSWW.','WWSWWSW','WSWWSWW','.WWWWW.','..GWG..','...G...','..GG...','...G...','...G...'] },
  gem:{ pal:{L:'#e4c9ff',M:'#a56bff',D:'#6a35c4'}, map:[
    '..LLLLL..','.LLLMMMD.','LLLMMMDDD','LLMMMDDDD','.LMMMDDD.','..MMDDD..','...MDD...','....D....'] }
};

/* ================= fase ================= */
const map = Array.from({length:ROWS}, () => Array(COLS).fill('.'));
const setT = (c,r,t) => { if(c>=0 && c<COLS && r>=0 && r<ROWS) map[r][c] = t; };
function ground(c0,c1){ for(let c=c0;c<=c1;c++){ setT(c,GROUND,'G'); for(let r=GROUND+1;r<ROWS;r++) setT(c,r,'D'); } }
function blocks(c0,r,len){ for(let c=c0;c<c0+len;c++) setT(c,r,'B'); }
function stack(c,h){ for(let i=1;i<=h;i++) setT(c,GROUND-i,'B'); }
function cone(c){ setT(c,GROUND-1,'C'); }

ground(0,30); ground(34,52); ground(57,78); ground(96,124); ground(128,155);
// A: abertura
blocks(15,GROUND-1,2); stack(19,1); stack(20,2); stack(21,1); cone(24); blocks(8,8,4);
// B
blocks(42,8,4);
// C: escada ate a plataforma alta
stack(62,1); stack(63,2); stack(64,3); stack(65,4); blocks(66,8,5);
// pocos com plataformas flutuantes
blocks(82,10,3); blocks(88,9,3); blocks(94,10,2);
// D
cone(100); cone(106); cone(114); blocks(108,8,5);
blocks(115,8,2); blocks(118,6,2); blocks(121,4,3);
// E
blocks(131,8,3); cone(137);

const ITEMS = [];                                            // {t:'rose'|'gem', x,y, got}
const rose = (c,r) => ITEMS.push({t:'rose', x:c*TS+4, y:r*TS+4, got:false, ph:Math.random()*6});
const gem  = (c,r) => ITEMS.push({t:'gem',  x:c*TS+4, y:r*TS+4, got:false, ph:Math.random()*6});
[4,5,6,7,8].forEach(c => rose(c,11)); [8,9,10,11].forEach(c => rose(c,7));
rose(31,10); rose(32,9); rose(33,10);
rose(38,11); rose(39,11); [42,43,44,45].forEach(c => rose(c,7));
rose(53,10); rose(54,9); rose(55,9); rose(56,10);
rose(60,11); rose(61,11);
rose(66,7); rose(67,7); rose(69,7); rose(70,7); gem(68,6);
[82,83,84].forEach(c => rose(c,9)); [88,89,90].forEach(c => rose(c,8)); gem(92,7); rose(94,9); rose(95,9);
[108,109,110,111,112].forEach(c => rose(c,7));
rose(115,7); rose(116,7); rose(118,5); rose(119,5); rose(121,3); rose(122,3); gem(123,3);
rose(125,10); rose(126,9); rose(127,10);
[131,132,133].forEach(c => rose(c,7)); rose(139,11); rose(140,11);
const ROSES_TOTAL = ITEMS.filter(i => i.t === 'rose').length;
const GEMS_TOTAL  = ITEMS.filter(i => i.t === 'gem').length;

const FLAGS = [58,76,98].map(c => ({x:c*TS+4, y:GROUND*TS, on:false}));
const SNAIL_STARTS = [38,49,74,102,110,134,141];
const DECOR = {
  trees:[5,38,67,104,129],
  bushes:[11,24,46,72,100,131,143]
};

/* ================= estado ================= */
const keys = {left:false, right:false, jump:false};
const touch = {left:false, right:false, jump:false};
let jumpEdge = false;
let p, enemies, parts, trail, cam, st, t = 0, acc = 0, lastTs = 0, raf = 0, active = false, fade = 0;
let gotRoses = 0, gotGems = 0, maxX = 0, checkpoint = null, winShown = false;

function resetGame(){
  p = {x:24, y:GROUND*TS, vx:0, vy:0, face:1, ground:true, coyote:0, jumpBuf:0, anim:0, inv:0, dead:0, deadKind:'', splashed:false};
  enemies = SNAIL_STARTS.map(c => ({x:c*TS+4, y:GROUND*TS, dir:-1, anim:Math.random()*6, squish:0}));
  parts = []; trail = []; cam = {x:0};
  ITEMS.forEach(i => i.got = false); FLAGS.forEach(f => f.on = false);
  gotRoses = 0; gotGems = 0; maxX = 0; checkpoint = {x:24, y:GROUND*TS};
  st = 'ready'; winShown = false; fade = 0;
  for(let i=0;i<40;i++) trail.push({x:p.x-8, y:p.y, face:1, vx:0, ground:true});
  hud();
}

/* ================= som ================= */
const snd = {
  jump(){ API.tone(330,.12,{to:700,vol:.05}); },
  rose(){ API.tone(880,.06,{vol:.045}); API.tone(1175,.08,{delay:.06,vol:.045}); },
  gem(){ [784,988,1175,1568].forEach((f,i) => API.tone(f,.1,{delay:i*.07,vol:.05})); },
  stomp(){ API.tone(240,.1,{to:90,type:'triangle',vol:.1}); },
  hurt(){ API.tone(320,.3,{to:70,vol:.06}); },
  flag(){ [523,659,784].forEach((f,i) => API.tone(f,.1,{delay:i*.08,vol:.05})); },
  bark(){ API.tone(640,.09,{to:300,vol:.06}); API.tone(560,.12,{to:230,delay:.14,vol:.06}); },
  win(){ [523,659,784,1047,784,1047,1319,1568].forEach((f,i) => API.tone(f,.13,{delay:i*.1,vol:.055})); }
};

/* ================= colisao ================= */
function solidAt(c,r){
  if(c < 0 || c >= COLS) return true;
  if(r < 0 || r >= ROWS) return false;
  const k = map[r][c];
  return k === 'G' || k === 'D' || k === 'B' || k === 'C';
}
function hits(x,y,hw,h){
  const l = Math.floor((x-hw)/TS), r = Math.floor((x+hw-0.01)/TS);
  const tp = Math.floor((y-h)/TS), b = Math.floor((y-0.01)/TS);
  for(let rr=tp; rr<=b; rr++) for(let cc=l; cc<=r; cc++) if(solidAt(cc,rr)) return true;
  return false;
}

/* ================= particulas ================= */
function sparkle(x,y,n,cols){
  cols = cols || ['#ffffff','#ffffff','#e9ddff'];
  for(let i=0;i<n;i++) parts.push({x:x+(Math.random()-.5)*8, y:y+(Math.random()-.5)*8, vx:(Math.random()-.5)*40, vy:-20-Math.random()*30,
    life:.6+Math.random()*.4, c:cols[Math.floor(Math.random()*cols.length)], g:60});
}
function confetti(n){
  const cols = ['#ffffff','#ffffff','#f1e9ff','#c9a6ff','#a56bff','#ffd84d'];
  for(let i=0;i<n;i++) parts.push({x:cam.x+Math.random()*W, y:-6-Math.random()*30, vx:(Math.random()-.5)*20, vy:30+Math.random()*40,
    life:2.4, c:cols[Math.floor(Math.random()*cols.length)], g:0});
}

/* ================= logica ================= */
function hud(){
  $('aRoses').textContent = String(gotRoses).padStart(2,'0') + '/' + String(ROSES_TOTAL).padStart(2,'0');
  $('aGems').textContent = gotGems + '/' + GEMS_TOTAL;
  $('aBar').style.width = Math.min(100, maxX / GOAL_X * 100) + '%';
}

function die(kind){
  if(p.dead > 0 || st !== 'play') return;
  p.dead = kind === 'water' ? .55 : .8; p.deadKind = kind;
  if(kind === 'hit'){ p.vy = -210; p.vx = 0; }
  snd.hurt();
}
function respawn(){
  p.x = checkpoint.x; p.y = checkpoint.y; p.vx = p.vy = 0; p.dead = 0; p.inv = 1.3; p.ground = true; p.splashed = false;
  trail.forEach(q => { q.x = p.x - 8; q.y = p.y; q.vx = 0; q.ground = true; });
  cam.x = Math.max(0, Math.min(LEVEL_W - W, p.x - 86));
  fade = .4;
}

function step(dt){
  t += dt;
  // ---- entrada
  const left = keys.left || touch.left, right = keys.right || touch.right, held = keys.jump || touch.jump;
  if(jumpEdge){ p.jumpBuf = .13; jumpEdge = false; }
  p.jumpBuf = Math.max(0, p.jumpBuf - dt);
  p.inv = Math.max(0, p.inv - dt);
  fade = Math.max(0, fade - dt);

  if(st === 'play' && p.dead <= 0){
    let ax = 0; if(left) ax -= 1; if(right) ax += 1;
    if(ax){
      const a = p.ground ? 600 : 400;
      p.vx += ax * a * dt * (Math.sign(p.vx) === -ax ? 1.8 : 1);
      p.face = ax;
    } else {
      const fr = (p.ground ? 720 : 180) * dt;
      p.vx = Math.abs(p.vx) <= fr ? 0 : p.vx - Math.sign(p.vx) * fr;
    }
    p.vx = Math.max(-MAXS, Math.min(MAXS, p.vx));
    p.coyote = p.ground ? .1 : Math.max(0, p.coyote - dt);
    if(p.jumpBuf > 0 && p.coyote > 0){ p.vy = -JUMP; p.ground = false; p.coyote = 0; p.jumpBuf = 0; snd.jump(); }
    p.vy += GRAV * dt * ((p.vy < 0 && !held) ? 2.4 : 1);
    p.vy = Math.min(MAXFALL, p.vy);

    // ---- movimento (eixo a eixo)
    let nx = p.x + p.vx * dt;
    if(!hits(nx, p.y, HW, PH)) p.x = nx;
    else { const s = Math.sign(p.vx); while(!hits(p.x + s*0.5, p.y, HW, PH)) p.x += s*0.5; p.vx = 0; }
    p.x = Math.max(HW, Math.min(LEVEL_W - HW, p.x));
    let ny = p.y + p.vy * dt;
    if(!hits(p.x, ny, HW, PH)) p.y = ny;
    else { const s = Math.sign(p.vy) || 1; while(!hits(p.x, p.y + s*0.5, HW, PH)) p.y += s*0.5; p.vy = 0; }
    p.ground = p.vy >= 0 && hits(p.x, p.y + 1, HW, PH);
    if(p.ground) p.y = Math.round(p.y);
    if(Math.abs(p.vx) > 8 && p.ground) p.anim += dt;

    // ---- agua
    if(p.y > GROUND*TS + 12 && !p.splashed){ p.splashed = true; sparkle(p.x, GROUND*TS + 10, 10, ['#bfe3ff','#ffffff']); }
    if(p.y > H + 8) die('water');
    maxX = Math.max(maxX, p.x);

    // ---- itens
    for(const it of ITEMS){
      if(it.got) continue;
      if(Math.abs(it.x - p.x) < 9 && Math.abs(it.y - (p.y - PH/2)) < 13){
        it.got = true;
        if(it.t === 'rose'){ gotRoses++; snd.rose(); sparkle(it.x,it.y,4); if(gotRoses % 5 === 0) snd.bark(); }
        else { gotGems++; snd.gem(); sparkle(it.x,it.y,10,['#e4c9ff','#a56bff','#ffffff']); }
        hud();
      }
    }
    // ---- checkpoints
    for(const f of FLAGS){
      if(!f.on && p.x > f.x - 6){ f.on = true; checkpoint = {x:f.x, y:f.y}; snd.flag(); sparkle(f.x, f.y-16, 8); }
    }
    // ---- inimigos
    for(const e of enemies){
      if(e.squish > 0) continue;
      if(Math.abs(e.x - p.x) < HW + 6 && p.y > e.y - 8 && p.y - PH < e.y){
        if(p.vy > 40 && p.y < e.y - 3){ e.squish = .4; p.vy = -230; p.ground = false; snd.stomp(); sparkle(e.x, e.y-4, 6); }
        else if(p.inv <= 0) die('hit');
      }
    }
    // ---- chegada
    if(p.x >= GOAL_X && !winShown) win();
  } else if(st === 'play' && p.dead > 0){
    p.dead -= dt;
    if(p.deadKind === 'hit'){ p.vy += GRAV * dt; p.y += p.vy * dt; }
    if(p.dead <= 0) respawn();
  } else if(st === 'won'){
    p.vx = 0; p.vy += GRAV*dt; p.y = Math.min(p.y + p.vy*dt, GROUND*TS); if(p.y >= GROUND*TS) p.vy = 0;
    if(Math.random() < .08) confetti(2);
  }

  // ---- inimigos (movimento)
  for(const e of enemies){
    e.anim += dt;
    if(e.squish > 0){ e.squish -= dt; continue; }
    const nx = e.x + e.dir * 14 * dt, ah = nx + e.dir * 6;
    const wall = solidAt(Math.floor(ah/TS), Math.floor((e.y-3)/TS));
    const edge = !solidAt(Math.floor(ah/TS), Math.floor((e.y+1)/TS));
    if(wall || edge) e.dir *= -1; else e.x = nx;
  }
  enemies = enemies.filter(e => e.squish > 0 || e.squish === 0);

  // ---- trilha do Luck
  trail.push({x:p.x, y:p.y, face:p.face, vx:p.vx, ground:p.ground});
  if(trail.length > 40) trail.shift();

  // ---- particulas
  for(let i=parts.length-1;i>=0;i--){
    const q = parts[i]; q.life -= dt;
    if(q.life <= 0 || q.y > H + 8){ parts.splice(i,1); continue; }
    q.x += q.vx*dt; q.y += q.vy*dt; q.vy += q.g*dt;
  }
  // ---- camera
  const target = Math.max(0, Math.min(LEVEL_W - W, p.x - 86 + p.face*10));
  cam.x += (target - cam.x) * Math.min(1, dt*6);
  if(Math.abs(target - cam.x) < .05) cam.x = target;
}

function win(){
  winShown = true; st = 'won'; snd.win(); confetti(60);
  $('advWinTxt').innerHTML = 'ROSAS ' + gotRoses + '/' + ROSES_TOTAL + '<br>PEDRAS ' + gotGems + '/' + GEMS_TOTAL;
  setTimeout(() => { if(st === 'won') $('advWin').style.display = 'flex'; }, 1600);
}

/* ================= sprites ================= */
function drawMari(){
  const run = Math.abs(p.vx) > 8 && p.ground;
  const f = run ? Math.floor(p.anim * 9) % 4 : 0;
  const air = !p.ground;
  const hurt = p.dead > 0 && p.deadKind === 'hit';
  const sw = [-2,0,2,0][f];
  const sway = air ? (p.vy < 0 ? 2 : -1) : (run ? (f % 2 ? 1 : 0) : 0);
  ctx.save();
  ctx.translate(Math.round(p.x), Math.round(p.y));
  ctx.scale(p.face, 1);
  outlined(() => {
    // cabelo comprido atras
    R(-7-sway,-22,4,14,C.hair); R(-6-sway,-9,3,3,C.hair);
    // pernas
    if(air){ R(-4,-6,3,4,C.pants); R(1,-7,3,4,C.pants); R(-4,-2,4,2,C.shoe); R(1,-3,4,2,C.shoe); }
    else { R(-4+sw,-6,3,6,C.pants); R(1-sw,-6,3,6,C.pants); R(-5+sw,-2,4,2,C.shoe); R(1-sw,-2,4,2,C.shoe); }
    // braco de tras
    R(-5 - (run?sw:0)/2, -13, 2, 6, C.skinS);
    // tronco
    R(-4,-14,8,8,C.top); R(-4,-8,8,1,C.topS);
    // braco da frente
    if(hurt || air) R(3,-17,2,5,C.skin); else R(3 + (run?sw:0)/2, -13, 2, 6, C.skin);
    // cabeca
    E(0,-18,4,4,C.skin); E(0,-20,5,3,C.hair); R(-1,-20,6,2,C.hair);
  });
  // detalhes (sem contorno)
  R(2,-19,2,1,C.line); R(2,-18,2,2,C.eyeG); R(3,-18,1,1,'#1d6b3c'); R(2,-18,1,1,'#7df0a6');
  R(-3,-12,1,1,C.topS);
  ctx.restore();
}
function drawLuck(q, i){
  const run = Math.abs(q.vx) > 8 && q.ground;
  const fr = run ? Math.floor(t * 12) % 4 : 0, sw = [2,0,-2,0][fr];
  const wag = Math.sin(t * 12) * 1.4;
  const air = !q.ground;
  ctx.save();
  ctx.translate(Math.round(q.x - q.face * 10), Math.round(q.y));
  ctx.scale(q.face, 1);
  outlined(() => {
    const ty = -10 + Math.round(wag) - (air ? 1 : 0);
    R(-11,ty-1,4,2,C.fur); R(-13,ty-2,3,2,C.white);
    R(-6+sw,-4,2,4,C.furD); R(3-sw,-4,2,4,C.furD);
    E(-1,-7,7,4,C.fur);
    E(4,-6,3,3,C.white);
    R(-5-sw,-4,2,4,C.fur); R(4+sw,-4,2,4,C.fur);
    R(-5-sw,-1,3,1,C.white); R(4+sw,-1,3,1,C.white);
    R(2,-10,2,6,C.navy);
    E(8,-11,4,4,C.fur); E(11,-9,3,2,C.white);
    E(5,-14,2,3,C.furD);
  });
  R(-6,-10,4,2,C.furD); R(9,-14,2,3,C.white);
  R(2,-9,1,1,C.blue); R(9,-12,1,1,C.line); R(14,-10,1,2,C.nose);
  if(run || air) R(12,-7,1,2,C.tongue);
  ctx.restore();
}
function drawSnail(e){
  ctx.save(); ctx.translate(Math.round(e.x), Math.round(e.y)); ctx.scale(e.dir, 1);
  if(e.squish > 0){
    OV = null;
    R(-6,-2,12,2,'#e9dcc8'); R(-4,-3,8,1,'#c0845a');
  } else {
    const bob = Math.round(Math.sin(e.anim*5));
    outlined(() => {
      R(-6,-3,12,3,'#e9dcc8'); R(3,-5+bob,3,3,'#e9dcc8');
      E(-1,-6,4,4,'#c0845a');
    });
    R(-2,-7,2,1,'#f1d7bf'); R(0,-5,1,1,'#f1d7bf'); R(4,-6+bob,1,1,C.line);
    R(5,-8+bob,1,2,'#e9dcc8');
  }
  ctx.restore();
}
function drawCone(x,y){
  OV = null;
  R(x+1,y+7,6,1,C.line);
  R(x+1,y+6,6,2,'#c75a1a'); R(x+2,y+3,4,3,'#ff7a2b'); R(x+3,y+1,2,2,'#ff7a2b');
  R(x+2,y+4,4,1,'#ffffff'); R(x+3,y+2,2,1,'#ffffff');
  R(x,y+7,8,1,C.line);
}
function drawTile(k,x,y){
  if(k === 'G'){
    R(x,y,TS,TS,'#6b4a3a'); R(x,y,TS,3,'#3f9a6a'); R(x,y,TS,1,'#58b883');
    R(x+2,y+5,1,1,'#7b5848'); R(x+5,y+6,1,1,'#7b5848');
    R(x+1,y+3,1,1,'#3f9a6a'); R(x+4,y+3,1,1,'#3f9a6a'); R(x+6,y+3,1,1,'#3f9a6a');
  } else if(k === 'D'){
    R(x,y,TS,TS,'#5a3d31'); R(x+1,y+2,1,1,'#6b4a3a'); R(x+5,y+5,1,1,'#6b4a3a'); R(x+3,y+7,1,1,'#4a3228');
  } else if(k === 'B'){
    R(x,y,TS,TS,'#e9e1f5'); R(x,y+TS-1,TS,1,'#b8a8d8'); R(x+TS-1,y,1,TS,'#b8a8d8');
    R(x,y,TS,1,'#ffffff'); R(x,y,1,TS,'#ffffff'); R(x+2,y+2,TS-4,TS-4,'#f6f1fc');
    R(x+2,y+2,TS-4,1,'#d9cfe8');
  }
}
function drawDecor(){
  const tx = x => Math.round(x - cam.x);
  for(const c of DECOR.trees){
    const x = c*TS + 4, sx = tx(x); if(sx < -30 || sx > W + 30) continue;
    const gy = GROUND*TS;
    OV = null;
    R(sx-1, gy-26, 3, 26, '#5b3a2a'); R(sx-1, gy-26, 1, 26, '#7a503a');
    E(sx, gy-32, 14, 10, '#b5800f'); E(sx-8, gy-26, 8, 6, '#b5800f'); E(sx+9, gy-27, 8, 6, '#b5800f');
    E(sx, gy-34, 12, 8, '#d9a21b'); E(sx-8, gy-28, 6, 4, '#d9a21b'); E(sx+9, gy-29, 6, 4, '#d9a21b');
    E(sx-3, gy-38, 6, 3, '#f5c73a'); E(sx+7, gy-33, 4, 2, '#f5c73a');
  }
  for(const c of DECOR.bushes){
    const x = c*TS + 4, sx = tx(x); if(sx < -20 || sx > W + 20) continue;
    const gy = GROUND*TS;
    E(sx, gy-3, 10, 5, '#1f4f3a'); E(sx-1, gy-4, 9, 4, '#2c6b4d'); E(sx+4, gy-6, 5, 3, '#35805c');
    for(const [dx,dy] of [[-5,-5],[0,-8],[5,-4],[-1,-3],[7,-7]]){ R(sx+dx-1, gy+dy-1, 3, 2, '#ffffff'); R(sx+dx, gy+dy-2, 1, 4, '#ffffff'); R(sx+dx, gy+dy, 1, 1, '#d7cce8'); }
  }
}
function drawGoal(){
  const sx = Math.round(GOAL_X - cam.x); if(sx < -30 || sx > W + 30) return;
  const gy = GROUND*TS;
  OV = null;
  for(const dx of [-14, 10]){
    R(sx+dx, gy-44, 5, 44, '#e9e1f5'); R(sx+dx, gy-44, 1, 44, '#ffffff'); R(sx+dx+4, gy-44, 1, 44, '#b8a8d8');
  }
  R(sx-14, gy-50, 29, 6, '#e9e1f5'); R(sx-14, gy-50, 29, 1, '#ffffff'); R(sx-14, gy-45, 29, 1, '#b8a8d8');
  const glow = .35 + .15*Math.sin(t*3);
  ctx.fillStyle = 'rgba(255,255,255,' + glow + ')'; ctx.fillRect(sx-9, gy-44, 19, 44);
  for(let i=0;i<7;i++){ const x = sx-12 + i*4; R(x, gy-52 - (i%2), 3, 3, '#ffffff'); R(x+1, gy-51 - (i%2), 1, 1, '#d7cce8'); }
}
function drawFlag(f){
  const sx = Math.round(f.x - cam.x); if(sx < -12 || sx > W + 12) return;
  OV = null;
  R(sx, f.y-22, 1, 22, '#e9ddff'); R(sx-1, f.y-23, 3, 2, '#ffffff');
  if(f.on){ R(sx+1, f.y-21, 9, 6, '#ffffff'); R(sx+1, f.y-16, 9, 1, '#d9cfe8'); R(sx+4, f.y-19, 3, 2, '#d7cce8'); }
  else { R(sx+1, f.y-21, 8, 5, '#6d4ab5'); }
}

/* ================= cenario ================= */
const stars = []; { let s = 5; const rnd = () => { s = (s*16807) % 2147483647; return s/2147483647; };
  for(let i=0;i<30;i++) stars.push({x:Math.floor(rnd()*W), y:Math.floor(rnd()*70), p:rnd()*6}); }
function drawBackground(){
  const bands = [[0,'#1a0d3d'],[26,'#241255'],[48,'#321a73'],[68,'#452590'],[84,'#5a35a8']];
  for(let i=0;i<bands.length;i++){
    const y0 = bands[i][0], y1 = i+1<bands.length ? bands[i+1][0] : H;
    R(0,y0,W,y1-y0,bands[i][1]);
    if(i+1<bands.length) for(let x=0;x<W;x+=2) R(x+((y1/2)%2?0:1), y1-2, 1, 1, bands[i+1][1]);
  }
  E(24,20,8,8,'#fff3cf'); E(21,17,2,2,'#eadcae'); E(27,23,2,1,'#eadcae');
  for(const s of stars){ if(Math.sin(t*2+s.p) > -.4) R(s.x, s.y, 1, 1, '#ffffff'); }
  // roda-gigante distante (parallax lento; aparece perto do fim da fase)
  const wx = 170 - (cam.x - (LEVEL_W - W)) * .25, wy = 62, r = 24;
  for(let a=0;a<6.283;a+=.045) R(wx+Math.cos(a)*r, wy+Math.sin(a)*r, 1, 1, '#8a66d6');
  for(let a=0;a<6.283;a+=.07) R(wx+Math.cos(a)*(r-5), wy+Math.sin(a)*(r-5), 1, 1, '#6d4ab5');
  ctx.fillStyle = '#6d4ab5';
  for(let k=0;k<8;k++){
    const a = t*.14 + k*Math.PI/4, gx = wx + Math.cos(a)*r, gy = wy + Math.sin(a)*r;
    for(let i=0;i<=r;i+=2) R(wx+Math.cos(a)*i, wy+Math.sin(a)*i, 1, 1, '#7a58c6');
    R(gx-2, gy-1, 4, 3, k%2 ? '#ffd9a8' : '#e9ddff');
  }
  for(let i=0;i<=36;i+=2){ R(wx - i*.45, wy + i, 1, 1, '#6d4ab5'); R(wx + i*.45, wy + i, 1, 1, '#6d4ab5'); }
  // colinas (parallax)
  for(const [fac,col,base,amp] of [[.45,'#2a1760',24,8],[.7,'#33207a',13,6]]){
    ctx.fillStyle = col;
    for(let x=0;x<W;x++){
      const wxp = x + cam.x*fac;
      const h = base + amp*Math.sin(wxp/26) + amp*.5*Math.sin(wxp/9 + 2);
      const top = Math.round(GROUND*TS - h);
      ctx.fillRect(x, top, 1, H - top);
    }
  }
}
function drawWater(){
  for(let c = Math.floor(cam.x/TS); c <= Math.floor((cam.x+W)/TS); c++){
    if(c < 0 || c >= COLS || map[GROUND][c] !== '.') continue;
    const x = Math.round(c*TS - cam.x), y = GROUND*TS + 10;
    R(x, y, TS, H - y, '#2d5fb0'); R(x, y+6, TS, H, '#1f4a94');
    for(let i=0;i<TS;i+=2){ const w = Math.round(Math.sin(t*3 + (c*TS+i)*.5)); R(x+i, y+w, 2, 1, '#bfe3ff'); }
  }
}

/* ================= desenho ================= */
function draw(){
  ctx.setTransform(1,0,0,1,0,0);
  drawBackground();
  drawDecor();
  drawWater();
  // tiles visiveis
  const c0 = Math.max(0, Math.floor(cam.x/TS)), c1 = Math.min(COLS-1, Math.floor((cam.x+W)/TS));
  OV = null;
  for(let r=0;r<ROWS;r++) for(let c=c0;c<=c1;c++){
    const k = map[r][c]; if(k === '.') continue;
    const x = Math.round(c*TS - cam.x), y = r*TS;
    if(k === 'C') drawCone(x,y); else drawTile(k,x,y);
  }
  // goal e flags
  drawGoal(); FLAGS.forEach(drawFlag);
  // itens
  for(const it of ITEMS){
    if(it.got) continue;
    const sx = Math.round(it.x - cam.x); if(sx < -12 || sx > W + 12) continue;
    const bob = Math.round(Math.sin(t*3 + it.ph) * 1.5);
    const s = SPR[it.t];
    drawMap(s.map, s.pal, sx - s.map[0].length/2, Math.round(it.y) - s.map.length/2 + bob);
    if(Math.sin(t*4 + it.ph) > .92) R(sx + 3, it.y - 6 + bob, 1, 1, '#ffffff');
  }
  // inimigos
  ctx.save(); ctx.translate(-Math.round(cam.x), 0);
  for(const e of enemies) drawSnail(e);
  ctx.restore();
  // Luck e Mari (deslocados pela camera)
  ctx.save(); ctx.translate(-Math.round(cam.x), 0);
  const lk = trail[Math.max(0, trail.length - 24)];
  if(lk){
    const q = Object.assign({}, lk);
    if(st === 'won'){ q.vx = 0; q.ground = true; q.y = GROUND*TS; q.x = p.x - 22; q.face = 1; }
    drawLuck(q);
  }
  if(!(p.inv > 0 && Math.floor(t*14) % 2 && p.dead <= 0)) drawMari();
  ctx.restore();
  // particulas
  for(const q of parts){ const x = Math.round(q.x - cam.x); R(x, q.y, 2, 2, q.c); if(q.g) { R(x-1, q.y, 1, 1, q.c); } }
  if(fade > 0){ ctx.fillStyle = 'rgba(21,12,43,' + Math.min(1, fade/.4) + ')'; ctx.fillRect(0,0,W,H); }
}

/* ================= loop ================= */
function frame(ts){
  if(!active) return;
  if(!lastTs) lastTs = ts;
  acc += Math.min(.1, (ts - lastTs) / 1000); lastTs = ts;
  while(acc >= 1/60){ if(st === 'play' || st === 'won') step(1/60); else t += 1/60; acc -= 1/60; }
  draw();
  raf = requestAnimationFrame(frame);
}
function startLoop(){ if(raf) cancelAnimationFrame(raf); active = true; lastTs = 0; acc = 0; raf = requestAnimationFrame(frame); }
function stopLoop(){ active = false; if(raf) cancelAnimationFrame(raf); raf = 0; }

/* ================= abas ================= */
function showTab(which){
  const adv = which === 'adv';
  $('viewPlaza').hidden = adv; $('viewAdv').hidden = !adv;
  $('tabPlaza').classList.toggle('on', !adv); $('tabAdv').classList.toggle('on', adv);
  API.setPaused(adv);
  if(adv){ startLoop(); } else { stopLoop(); keys.left = keys.right = keys.jump = false; touch.left = touch.right = touch.jump = false; }
}
$('tabPlaza').addEventListener('click', () => showTab('plaza'));
$('tabAdv').addEventListener('click', () => { API.audioInit(); showTab('adv'); });
$('advStart').addEventListener('click', () => { API.audioInit(); $('advStart').style.display = 'none'; st = 'play'; snd.flag(); });
$('advAgain').addEventListener('click', () => { $('advWin').style.display = 'none'; resetGame(); st = 'play'; });
$('advBack').addEventListener('click', () => { $('advWin').style.display = 'none'; resetGame(); $('advStart').style.display = 'flex'; showTab('plaza'); });

/* ================= entrada ================= */
const KMAP = {ArrowLeft:'left', a:'left', A:'left', ArrowRight:'right', d:'right', D:'right',
              ArrowUp:'jump', w:'jump', W:'jump', ' ':'jump', z:'jump', Z:'jump'};
window.addEventListener('keydown', e => {
  if(!active) return;
  const k = KMAP[e.key]; if(!k) return;
  e.preventDefault();
  if(k === 'jump' && !keys.jump) jumpEdge = true;
  keys[k] = true;
});
window.addEventListener('keyup', e => { const k = KMAP[e.key]; if(k && active){ keys[k] = false; e.preventDefault(); } });
window.addEventListener('blur', () => { keys.left = keys.right = keys.jump = false; touch.left = touch.right = touch.jump = false; });
function bindBtn(id, k){
  const b = $(id);
  const down = e => { e.preventDefault(); try{ b.setPointerCapture(e.pointerId); }catch(_){}
    if(k === 'jump' && !touch.jump) jumpEdge = true; touch[k] = true; b.classList.add('hold'); };
  const up = e => { e.preventDefault(); touch[k] = false; b.classList.remove('hold'); };
  b.addEventListener('pointerdown', down);
  b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('lostpointercapture', up);
  b.addEventListener('contextmenu', e => e.preventDefault());
}
bindBtn('cLeft','left'); bindBtn('cRight','right'); bindBtn('cJump','jump');

/* gancho para testes automatizados */
window.__adv = { get p(){ return p; }, get enemies(){ return enemies; }, keys, touch, ITEMS, FLAGS, map, GOAL_X, COLS, GROUND,
  get state(){ return {st, gotRoses, gotGems, ROSES_TOTAL, GEMS_TOTAL}; },
  press(){ jumpEdge = true; },
  step(n){ for(let i=0;i<(n||1);i++){ if(st === 'play' || st === 'won') step(1/60); else t += 1/60; } },
  begin(){ st = 'play'; $('advStart').style.display = 'none'; }, draw, resetGame };

resetGame();
draw();
})();
