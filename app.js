
// app.js - Álgebra Memory (prototipo)
// Lee datos.json (inyectado como script) y crea el juego.
// Nota: datos.json ya se carga como variable "datos" por el navegador (ver index.html).
// app.js - Álgebra Memory (prototipo)
// Lee datos.json (inyectado como script) y crea el juego.
// Nota: datos.json ya se carga como variable "datos" por el navegador (ver index.html).

let D = (window.datos && window.datos) ? window.datos : null;
if(!D){
  // fallback si datos no cargan
  D = { levels: [] };
}

const board = document.getElementById('board');
const startBtn = document.getElementById('startBtn');
const resetBtn = document.getElementById('resetBtn');
const modeSelect = document.getElementById('modeSelect');
const timeLabel = document.getElementById('timeLabel');
const examTime = document.getElementById('examTime');
const scoreEl = document.getElementById('score');
const timerEl = document.getElementById('timer');
const timeLeftEl = document.getElementById('timeLeft');
const infoModal = document.getElementById('infoModal');
const modalText = document.getElementById('modalText');
const modalTitle = document.getElementById('modalTitle');
const continueBtn = document.getElementById('continueBtn');
const closeInfo = document.getElementById('closeInfo');

let deck = []; // cartas generadas
let flipped = [];
let score = 0;
let timer = null;
let timeLeft = 0;
let currentLevelIndex = 0;
let mode = 'free';

// UI behaviors
modeSelect.addEventListener('change', ()=>{
  mode = modeSelect.value;
  if(mode === 'exam') timeLabel.classList.remove('hidden');
  else timeLabel.classList.add('hidden');
});

startBtn.addEventListener('click', ()=>{
  mode = modeSelect.value;
  score = 0; updateScore();
  currentLevelIndex = 0;
  if(mode==='progressive') startProgressive();
  else startLevel(0);
  if(mode==='exam'){
    timeLeft = parseInt(examTime.value) || 60;
    startTimer();
  }
});

resetBtn.addEventListener('click', ()=>{
  resetGame();
});

closeInfo.addEventListener('click', ()=> infoModal.classList.add('hidden'));
continueBtn.addEventListener('click', ()=> infoModal.classList.add('hidden'));

// helpers
function shuffle(a){ return a.sort(()=>Math.random()-0.5); }
function updateScore(){ scoreEl.textContent = 'Puntaje: '+score; }

function resetGame(){
  clearInterval(timer); timer = null;
  board.innerHTML = ''; score = 0; updateScore();
  timerEl.classList.add('hidden');
  timeLeftEl.textContent = '0';
}

function startProgressive(){
  currentLevelIndex = 0;
  startLevel(currentLevelIndex);
}

function startLevel(index){
  clearInterval(timer);
  board.innerHTML = '';
  const level = D.levels[index];
  if(!level){ board.innerHTML = '<p>No hay más niveles</p>'; return; }
  buildDeckFromLevel(level);
  renderBoard();
  if(mode==='exam'){ timeLeft = parseInt(examTime.value)||60; startTimer(); }
}

function buildDeckFromLevel(level){
  deck = [];
  // cada pair genera dos cartas: 'equation' y 'graph' (o dos ecuaciones para sistemas)
  level.pairs.forEach(p => {
    if(p.equation){
      deck.push({id:p.id, kind:'equation', text:p.prompt, content:p.equation});
      deck.push({id:p.id, kind:'graph', text:'gráfica', content:p.equation});
    } else if(p.equations){
      // sistema: representamos como par de "sistema" y "solución gráfica" (simplificado)
      deck.push({id:p.id, kind:'system', text:p.prompt, content:JSON.stringify(p.equations)});
      deck.push({id:p.id, kind:'solution', text:'intersección', content:JSON.stringify(p.equations)});
    }
  });
  deck = shuffle(deck);
}

function renderBoard(){
  board.innerHTML = '';
  deck.forEach((card, idx)=>{
    const el = document.createElement('div');
    el.className = 'card';
    el.dataset.index = idx;
    el.dataset.id = card.id;
    el.dataset.kind = card.kind;
    // front (revealed)
    const front = document.createElement('div'); front.className='front';
    if(card.kind==='graph' || card.kind==='solution'){
      const canvas = document.createElement('canvas');
      canvas.width = 320; canvas.height = 200; canvas.className='small-canvas';
      canvas.dataset.expr = card.content;
      front.appendChild(canvas);
    } else {
      front.innerHTML = '<div style="padding:8px">'+card.text+'</div>';
    }
    // back (oculto)
    const back = document.createElement('div'); back.className='back'; back.innerHTML='?';
    el.appendChild(front); el.appendChild(back);
    el.addEventListener('click', ()=> onCardClick(el));
    board.appendChild(el);
  });
  // dibujar gráficas en canvases
  setTimeout(()=>{
    document.querySelectorAll('canvas.small-canvas').forEach(c=> drawGraphOnCanvas(c));
  }, 60);
}

function onCardClick(el){
  if(el.classList.contains('flipped')) return;
  el.classList.add('flipped');
  flipped.push(el);
  if(flipped.length===2){
    setTimeout(checkMatch, 500);
  }
}

function checkMatch(){
  const [a,b] = flipped;
  if(!a || !b){ flipped = []; return; }
  if(a.dataset.id === b.dataset.id && a !== b){
    // acierto
    score += 10;
    // mostrar explicación breve
    showInfo('¡Correcto!', buildExplanation(a,b));
    // animación de confeti (simple)
    burstConfetti(a);
    // dejar descubiertas (no revertir)
    a.removeEventListener('click', ()=> onCardClick(a));
    b.removeEventListener('click', ()=> onCardClick(b));
    // si todas las cartas descubiertas -> nivel completado
    setTimeout(()=>{
      if([...document.querySelectorAll('.card')].every(c=> c.classList.contains('flipped'))){
        score += 20; updateScore();
        showInfo('Nivel completado', '¡Excelente! Has completado el nivel.');
        // avanzar si modo progresivo
        if(mode==='progressive'){ currentLevelIndex++; setTimeout(()=> startLevel(currentLevelIndex), 1200); }
      }
    }, 600);
  } else {
    // fallo, dar vuelta
    a.classList.remove('flipped');
    b.classList.remove('flipped');
    score = Math.max(0, score-2);
    showInfo('Intenta de nuevo', 'Ese par no coincide.');
  }
  flipped = [];
  updateScore();
}

function buildExplanation(a,b){
  const id = a.dataset.id;
  // buscamos en D
  for(const lvl of D.levels){
    for(const p of lvl.pairs){
      if(p.id === id){
        if(p.equation) return 'La ecuación '+p.prompt+'. Su pendiente y ordenada al origen determinan la gráfica.';
        if(p.equations) return 'Sistema de ecuaciones. La solución es la intersección de ambas rectas.';
      }
    }
  }
  return 'Buen trabajo.';
}

function showInfo(title, text){
  modalTitle.textContent = title;
  modalText.textContent = text;
  infoModal.classList.remove('hidden');
}

function startTimer(){
  timerEl.classList.remove('hidden');
  timeLeftEl.textContent = timeLeft;
  if(timer) clearInterval(timer);
  timer = setInterval(()=>{
    timeLeft--;
    timeLeftEl.textContent = timeLeft;
    if(timeLeft<=0){
      clearInterval(timer);
      showInfo('Tiempo terminado', 'Se acabó el tiempo. Tu puntaje: '+score);
    }
  },1000);
}

// dibujo simple de función en canvas - acepta expresiones como "y=2*x+3" o "y=1*x*x-4"
function evalExprAt(expr, x){
  try{
    // limpiar
    expr = expr.replace(/^y\s*=\s*/i, '');
    expr = expr.replace(/\^/g, '**');
    // sustituir x por valor numérico (evitando inyecciones complejas)
    // permitir sólo números, x, *, +, -, /, ., parentheses
    let safe = expr.replace(/[^0-9xX\+\-\*\/\(\)\.\s\*\*]/g, '');
    safe = safe.replace(/x/gi, '('+x+')');
    // eslint-disable-next-line no-eval
    let val = eval(safe);
    if(typeof val === 'number' && isFinite(val)) return val;
  }catch(e){}
  return NaN;
}

function drawGraphOnCanvas(canvas){
  const expr = canvas.dataset.expr || '';
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  // fondo
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0,0,w,h);
  // grid
  ctx.strokeStyle = '#eef2ff'; ctx.lineWidth=1;
  for(let x=0;x<w;x+=20){ ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,h); ctx.stroke(); }
  for(let y=0;y<h;y+=20){ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(w,y); ctx.stroke(); }
  // eje
  ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth=2;
  ctx.beginPath(); ctx.moveTo(0,h/2); ctx.lineTo(w,h/2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(w/2,0); ctx.lineTo(w/2,h); ctx.stroke();
  // dibujar función
  ctx.strokeStyle = '#6b8cff'; ctx.lineWidth=2;
  ctx.beginPath();
  let first=true;
  for(let px=0; px<w; px+=2){
    // mapa px -> x en rango (-10,10)
    const x = (px - w/2) / (w/20); // escala: 20 px = 1 unidad
    const y = evalExprAt(expr, x);
    if(Number.isFinite(y)){
      const py = h/2 - y*(w/20);
      if(first){ ctx.moveTo(px,py); first=false; } else { ctx.lineTo(px,py); }
    }
  }
  ctx.stroke();
  // etiqueta pequeña
  ctx.fillStyle='#0f172a'; ctx.font='12px Arial'; ctx.fillText(expr.replace(/^\s*y\s*=\s*/i,''),8,14);
}

function burstConfetti(element){
  // simple efecto visual: añadir sombra y pulsar
  element.animate([{transform:'scale(1)'},{transform:'scale(1.03)'},{transform:'scale(1)'}], {duration:500, easing:'ease-out'});
}

// dibujar logo simple en canvas
window.addEventListener('load', ()=>{
  const c = document.getElementById('logoCanvas');
  if(c && c.getContext){
    const ctx = c.getContext('2d');
    ctx.fillStyle='#6b8cff'; ctx.beginPath(); ctx.arc(40,32,26,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#fff'; ctx.font='bold 20px Arial'; ctx.fillText('f(x)',22,40);
  }
});




const board = document.getElementById('board');
const startBtn = document.getElementById('startBtn');
const resetBtn = document.getElementById('resetBtn');
const modeSelect = document.getElementById('modeSelect');
const timeLabel = document.getElementById('timeLabel');
const examTime = document.getElementById('examTime');
const scoreEl = document.getElementById('score');
const timerEl = document.getElementById('timer');
const timeLeftEl = document.getElementById('timeLeft');
const infoModal = document.getElementById('infoModal');
const modalText = document.getElementById('modalText');
const modalTitle = document.getElementById('modalTitle');
const continueBtn = document.getElementById('continueBtn');
const closeInfo = document.getElementById('closeInfo');

let D = null;
let deck = [];
let flipped = [];
let score = 0;
let timer = null;
let timeLeft = 0;
let currentLevelIndex = 0;
let mode = 'free';

async function cargarDatos() {
  try {
    const resp = await fetch('datos.json');
    D = await resp.json();
    iniciarJuego();
  } catch (e) {
    console.error('Error cargando datos:', e);
  }
}

function iniciarJuego() {
  startBtn.disabled = false;
  modeSelect.disabled = false;
  resetBtn.disabled = false;

  modeSelect.addEventListener('change', () => {
    mode = modeSelect.value;
    if (mode === 'exam') timeLabel.classList.remove('hidden');
    else timeLabel.classList.add('hidden');
  });

  startBtn.addEventListener('click', () => {
    mode = modeSelect.value;
    score = 0;
    updateScore();
    currentLevelIndex = 0;
    if (mode === 'progressive') startProgressive();
    else startLevel(0);
    if (mode === 'exam') {
      timeLeft = parseInt(examTime.value) || 60;
      startTimer();
    }
  });

  resetBtn.addEventListener('click', () => {
    resetGame();
  });

  closeInfo.addEventListener('click', () => infoModal.classList.add('hidden'));
  continueBtn.addEventListener('click', () => infoModal.classList.add('hidden'));
}

function shuffle(a) { return a.sort(() => Math.random() - 0.5); }
function updateScore() { scoreEl.textContent = 'Puntaje: ' + score; }

function resetGame() {
  clearInterval(timer); timer = null;
  board.innerHTML = ''; score = 0; updateScore();
  timerEl.classList.add('hidden');
  timeLeftEl.textContent = '0';
}

function startProgressive() {
  currentLevelIndex = 0;
  startLevel(currentLevelIndex);
}

function startLevel(index) {
  clearInterval(timer);
  board.innerHTML = '';
  const level = D.levels[index];
  if (!level) { board.innerHTML = '<p>No hay más niveles</p>'; return; }
  buildDeckFromLevel(level);
  renderBoard();
  if (mode === 'exam') { timeLeft = parseInt(examTime.value) || 60; startTimer(); }
}

function buildDeckFromLevel(level) {
  deck = [];
  level.pairs.forEach(p => {
    if (p.equation) {
      deck.push({ id: p.id, kind: 'equation', text: p.prompt, content: p.equation });
      deck.push({ id: p.id, kind: 'graph', text: 'gráfica', content: p.equation });
    } else if (p.equations) {
      deck.push({ id: p.id, kind: 'system', text: p.prompt, content: JSON.stringify(p.equations) });
      deck.push({ id: p.id, kind: 'solution', text: 'intersección', content: JSON.stringify(p.equations) });
    }
  });
  deck = shuffle(deck);
}

function renderBoard() {
  board.innerHTML = '';
  deck.forEach((card, idx) => {
    const el = document.createElement('div');
    el.className = 'card';
    el.dataset.index = idx;
    el.dataset.id = card.id;
    el.dataset.kind = card.kind;

    const front = document.createElement('div'); front.className = 'front';
    if (card.kind === 'graph' || card.kind === 'solution') {
      const canvas = document.createElement('canvas');
      canvas.width = 320; canvas.height = 200; canvas.className = 'small-canvas';
      canvas.dataset.expr = card.content;
      front.appendChild(canvas);
    } else {
      front.innerHTML = '<div style="padding:8px">' + card.text + '</div>';
    }

    const back = document.createElement('div'); back.className = 'back'; back.innerHTML = '?';
    el.appendChild(front); el.appendChild(back);
    el.addEventListener('click', () => onCardClick(el));
    board.appendChild(el);
  });

  setTimeout(() => {
    document.querySelectorAll('canvas.small-canvas').forEach(c => drawGraphOnCanvas(c));
  }, 60);
}

function onCardClick(el) {
  if (el.classList.contains('flipped')) return;
  el.classList.add('flipped');
  flipped.push(el);
  if (flipped.length === 2) {
    setTimeout(checkMatch, 500);
  }
}

function checkMatch() {
  const [a, b] = flipped;
  if (!a || !b) { flipped = []; return; }
  if (a.dataset.id === b.dataset.id && a !== b) {
    score += 10;
    showInfo('¡Correcto!', buildExplanation(a, b));
    burstConfetti(a);
    a.removeEventListener('click', () => onCardClick(a));
    b.removeEventListener('click', () => onCardClick(b));
    setTimeout(() => {
      if ([...document.querySelectorAll('.card')].every(c => c.classList.contains('flipped'))) {
        score += 20; updateScore();
        showInfo('Nivel completado', '¡Excelente! Has completado el nivel.');
        if (mode === 'progressive') { currentLevelIndex++; setTimeout(() => startLevel(currentLevelIndex), 1200); }
      }
    }, 600);
  } else {
    a.classList.remove('flipped');
    b.classList.remove('flipped');
    score = Math.max(0, score - 2);
    showInfo('Intenta de nuevo', 'Ese par no coincide.');
  }
  flipped = [];
  updateScore();
}

function buildExplanation(a, b) {
  const id = a.dataset.id;
  for (const lvl of D.levels) {
    for (const p of lvl.pairs) {
      if (p.id === id) {
        if (p.equation) return 'La ecuación ' + p.prompt + '. Su pendiente y ordenada al origen determinan la gráfica.';
        if (p.equations) return 'Sistema de ecuaciones. La solución es la intersección de ambas rectas.';
      }
    }
  }
  return 'Buen trabajo.';
}

function showInfo(title, text) {
  modalTitle.textContent = title;
  modalText.textContent = text;
  infoModal.classList.remove('hidden');
}

function startTimer() {
  timerEl.classList.remove('hidden');
  timeLeftEl.textContent = timeLeft;
  if (timer) clearInterval(timer);
  timer = setInterval(() => {
    timeLeft--;
    timeLeftEl.textContent = timeLeft;
    if (timeLeft <= 0) {
      clearInterval(timer);
      showInfo('Tiempo terminado', 'Se acabó el tiempo. Tu puntaje: ' + score);
    }
  }, 1000);
}

function evalExprAt(expr, x) {
  try {
    expr = expr.replace(/^y\\s*=\\s*/i, '');
    expr = expr.replace(/\\^/g, '**');
    let safe = expr.replace(/[^0-9xX\\+\\-\\*\\/\\(\\)\\.\\s\\*\\*]/g, '');
    safe = safe.replace(/x/gi, '(' + x + ')');
    let val = eval(safe);
    if (typeof val === 'number' && isFinite(val)) return val;
  } catch (e) { }
  return NaN;
}

function drawGraphOnCanvas(canvas) {
  const expr = canvas.dataset.expr || '';
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#eef2ff'; ctx.lineWidth = 1;
  for (let x = 0; x < w; x += 20) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
  for (let y = 0; y < h; y += 20) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
  ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(w / 2, 0); ctx.lineTo(w / 2, h); ctx.stroke();
  ctx.strokeStyle = '#6b8cff'; ctx.lineWidth = 2;
  ctx.beginPath();
  let first = true;
  for (let px = 0; px < w; px += 2) {
    const x = (px - w / 2) / (w / 20);
    const y = evalExprAt(expr, x);
    if (Number.isFinite(y)) {
      const py = h / 2 - y * (w / 20);
      if (first) { ctx.moveTo(px, py); first = false; } else { ctx.lineTo(px, py); }
    }
  }
  ctx.stroke();
  ctx.fillStyle = '#0f172a'; ctx.font = '12px Arial'; ctx.fillText(expr.replace(/^\s*y\s*=\s*/i, ''), 8, 14);
}

function burstConfetti(element) {
  element.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.03)' }, { transform: 'scale(1)' }], { duration: 500, easing: 'ease-out' });
}

window
