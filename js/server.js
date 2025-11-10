// ---------- Config e elementos ----------
const video = document.getElementById('video');
const arenaCanvas = document.getElementById('arenaLayer');
const dynamicCanvas = document.getElementById('dynamicLayer');
const arenaCtx = arenaCanvas.getContext('2d');
const ctx = dynamicCanvas.getContext('2d');

const hud = document.getElementById('hud');
const menu = document.getElementById('menu');
const startBtn = document.getElementById('startBtn');
const countdownDiv = document.getElementById('countdown');
const gameOverDiv = document.getElementById('gameOver');
const scoreText = document.getElementById('scoreText');
const restartBtn = document.getElementById('restartBtn');

let screenWidth = window.innerWidth;
let screenHeight = window.innerHeight;
arenaCanvas.width = dynamicCanvas.width = screenWidth;
arenaCanvas.height = dynamicCanvas.height = screenHeight;

// ---------- Arena ----------
const ARENA_W_RATIO = 0.86;
const ARENA_H_RATIO = 0.72;
let arena = {};
function computeArena(){
  screenWidth = window.innerWidth;
  screenHeight = window.innerHeight;
  arenaCanvas.width = dynamicCanvas.width = screenWidth;
  arenaCanvas.height = dynamicCanvas.height = screenHeight;
  const w = Math.round(screenWidth * ARENA_W_RATIO);
  const h = Math.round(screenHeight * ARENA_H_RATIO);
  const x = Math.round((screenWidth - w)/2);
  const y = Math.round((screenHeight - h)/2);
  arena = {x,y,w,h};
  drawArena();
}
function drawArena(){
  arenaCtx.clearRect(0,0,screenWidth,screenHeight);
  arenaCtx.fillStyle = '#00101599';
  arenaCtx.strokeStyle = '#00e0ff';
  arenaCtx.lineWidth = 3;
  arenaCtx.fillRect(arena.x,arena.y,arena.w,arena.h);
  arenaCtx.strokeRect(arena.x,arena.y,arena.w,arena.h);
}
computeArena();
window.addEventListener('resize', computeArena);

// ---------- Som explosão ----------
const balloonSound = new Audio('sounds/balloon-burst.mp3');
balloonSound.preload = 'auto';

function playExplosion(){
  // Clona o áudio para permitir múltiplos sons simultâneos
  const sound = balloonSound.cloneNode();
  sound.volume = 0.7;
  sound.play().catch(e => console.log('Erro ao tocar som:', e));
}

// ---------- Partículas ----------
let particles = [];
function createParticles(x,y){
  const colors = ['#ff4040','#ff8a00','#ff0000','#ff6600','#ff2a2a'];
  for(let i=0;i<20;i++){ 
    const angle = Math.random()*2*Math.PI; 
    const speed = Math.random()*3 + 1.5; 
    particles.push({ 
      x, y, dx: Math.cos(angle)*speed, dy: Math.sin(angle)*speed, 
      r: 4 + Math.random()*3, alpha: 1, color: colors[Math.floor(Math.random()*colors.length)] 
    });
  }
}
function updateParticles(){ 
  particles.forEach(p=>{p.x+=p.dx; p.y+=p.dy; p.alpha-=0.05}); 
  particles=particles.filter(p=>p.alpha>0);
}
function drawParticles(){ 
  particles.forEach(p=>{
    ctx.beginPath();
    ctx.arc(p.x,p.y,p.r,0,2*Math.PI);
    ctx.fillStyle=`rgba(${hexToRgb(p.color)},${p.alpha})`;
    ctx.fill();
  });
}
function hexToRgb(hex){
  hex=hex.replace('#','');
  const bigint=parseInt(hex,16);
  const r=(bigint>>16)&255, g=(bigint>>8)&255, b=bigint&255;
  return `${r},${g},${b}`;
}

// ---------- Bolinhas ----------
const TOTAL_BALLS = 10;
let balls=[], score=0, gameTime=30, gameRunning=false, timer=gameTime, timerInterval;

// Sistema de tempo independente de framerate
let lastTime = performance.now();
const FIXED_TIMESTEP = 1000 / 60; // 60 FPS target
let deltaAccumulator = 0;

function initBalls(){
  balls=[]; particles=[];
  for(let i=0;i<TOTAL_BALLS;i++){
    const r=15+Math.random()*10;
    const x=arena.x+r+Math.random()*(arena.w-2*r);
    const y=arena.y+r+Math.random()*(arena.h-2*r);
    const speed=1+Math.random()*1.5; // Velocidade reduzida (antes era 2+Math.random()*2)
    const ang=Math.random()*2*Math.PI;
    balls.push({x,y,r,dx:Math.cos(ang)*speed,dy:Math.sin(ang)*speed,alive:true});
  }
  score=0; timer=gameTime; gameRunning=true;
  hud.style.display='block'; gameOverDiv.style.display='none';
  lastTime = performance.now(); // Reset do timer
  deltaAccumulator = 0; // Limpa o acumulador
  clearInterval(timerInterval);
  timerInterval=setInterval(()=>{
    if(!gameRunning) return;
    timer--;
    if(timer<=0) endGame(false);
  },1000);
}

function updateBalls(){
  if(!gameRunning) return;
  
  balls.forEach(b=>{
    if(!b.alive) return;
    // Movimento com timestep fixo
    b.x+=b.dx;
    b.y+=b.dy;
    
    // Colisão com bordas
    if(b.x-b.r<arena.x){b.x=arena.x+b.r;b.dx*=-1;}
    if(b.x+b.r>arena.x+arena.w){b.x=arena.x+arena.w-b.r;b.dx*=-1;}
    if(b.y-b.r<arena.y){b.y=arena.y+b.r;b.dy*=-1;}
    if(b.y+b.r>arena.y+arena.h){b.y=arena.y+arena.h-b.r;b.dy*=-1;}
  });
}

function drawBalls(){
  balls.forEach(b=>{
    if(!b.alive) return;
    ctx.fillStyle='#ff2222';
    ctx.beginPath();
    ctx.arc(b.x,b.y,b.r,0,2*Math.PI);
    ctx.fill();
  });
}

// ---------- Smash ----------
function smashBalls(mx,my){
  if(!gameRunning) return;
  balls.forEach(b=>{
    if(!b.alive) return;
    if(Math.hypot(mx-b.x,my-b.y)<b.r){
      b.alive=false; score++;
      playExplosion();
      createParticles(b.x,b.y);
    }
  });
  if(balls.every(b=>!b.alive)) endGame(true);
}

// ---------- HUD / Fim de jogo ----------
function endGame(allPopped){
  gameRunning=false; clearInterval(timerInterval);
  gameOverDiv.style.display='flex';
  scoreText.innerHTML = allPopped ? `🎉 Parabéns! Você estourou todas as bolinhas!<br>Total: ${score}` : `⏱ Tempo esgotado!<br>Bolhas esmagadas: ${score}`;
}
function updateHUD(time){ hud.innerHTML=`Tempo: ${time}s<br>Bolhas: ${score}`; }

// ---------- Cursor / MediaPipe ----------
let handsCooldown = [false, false]; // uma flag por mão
let smoothHands = [{x:screenWidth/2,y:screenHeight/2},{x:screenWidth/2,y:screenHeight/2}];

// Estado anterior da pinça para detectar transição
let previousPinchState = [false, false]; // false = dedos separados, true = dedos juntos
const PINCH_THRESHOLD = 0.07; // Distância para considerar "pinça fechada"
const PINCH_RELEASE_THRESHOLD = 0.10; // Distância para considerar "pinça aberta" (histerese)

// Buffer para suavização avançada (armazena últimas 5 posições)
let positionBuffer = [
  [{x:screenWidth/2, y:screenHeight/2}, {x:screenWidth/2, y:screenHeight/2}, {x:screenWidth/2, y:screenHeight/2}, {x:screenWidth/2, y:screenHeight/2}, {x:screenWidth/2, y:screenHeight/2}],
  [{x:screenWidth/2, y:screenHeight/2}, {x:screenWidth/2, y:screenHeight/2}, {x:screenWidth/2, y:screenHeight/2}, {x:screenWidth/2, y:screenHeight/2}, {x:screenWidth/2, y:screenHeight/2}]
];

// Filtro de Kalman simplificado
let kalmanFilters = [
  {x: screenWidth/2, y: screenHeight/2, vx: 0, vy: 0},
  {x: screenWidth/2, y: screenHeight/2, vx: 0, vy: 0}
];

function applyKalmanFilter(filter, measuredX, measuredY) {
  const dt = 1; // delta time
  const processNoise = 0.01; // ruído do processo
  const measurementNoise = 5; // ruído da medição
  
  // Predição
  filter.x += filter.vx * dt;
  filter.y += filter.vy * dt;
  
  // Atualização (correção baseada na medição)
  const innovationX = measuredX - filter.x;
  const innovationY = measuredY - filter.y;
  
  const gain = measurementNoise / (measurementNoise + processNoise);
  
  filter.x += gain * innovationX;
  filter.y += gain * innovationY;
  filter.vx = innovationX * 0.1;
  filter.vy = innovationY * 0.1;
  
  return {x: filter.x, y: filter.y};
}

function smoothPosition(rawX, rawY, handIndex) {
  // 1. Adiciona nova posição ao buffer
  positionBuffer[handIndex].shift();
  positionBuffer[handIndex].push({x: rawX, y: rawY});
  
  // 2. Calcula média ponderada (posições mais recentes têm mais peso)
  const weights = [0.1, 0.15, 0.2, 0.25, 0.3]; // soma = 1.0
  let weightedX = 0, weightedY = 0;
  
  positionBuffer[handIndex].forEach((pos, i) => {
    weightedX += pos.x * weights[i];
    weightedY += pos.y * weights[i];
  });
  
  // 3. Aplica filtro de Kalman
  const kalmanResult = applyKalmanFilter(kalmanFilters[handIndex], weightedX, weightedY);
  
  // 4. Suavização exponencial final
  smoothHands[handIndex].x += (kalmanResult.x - smoothHands[handIndex].x) * 0.5;
  smoothHands[handIndex].y += (kalmanResult.y - smoothHands[handIndex].y) * 0.5;
  
  return {x: smoothHands[handIndex].x, y: smoothHands[handIndex].y};
}

const hands = new Hands({locateFile:(f)=>`https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}`});
hands.setOptions({
  maxNumHands:2,
  modelComplexity:1, // melhor precisão
  minDetectionConfidence:0.7, // reduz falsos positivos
  minTrackingConfidence:0.7 // rastreamento mais estável
});

hands.onResults(results=>{
  // Atualização de física independente do MediaPipe
  const currentTime = performance.now();
  const deltaTime = currentTime - lastTime;
  lastTime = currentTime;
  
  // Limita o deltaTime para evitar grandes saltos
  const clampedDelta = Math.min(deltaTime, 100);
  deltaAccumulator += clampedDelta;
  
  // Fixed timestep update (máximo 3 iterações por frame)
  let updates = 0;
  while(deltaAccumulator >= FIXED_TIMESTEP && updates < 3) {
    if(gameRunning) {
      updateBalls();
      updateParticles();
    }
    deltaAccumulator -= FIXED_TIMESTEP;
    updates++;
  }
  
  // Renderização
  ctx.clearRect(0,0,dynamicCanvas.width,dynamicCanvas.height);

  if (results.multiHandLandmarks?.length) {
    let handsDetected = results.multiHandLandmarks;
  
    // --- 🔍 Filtrar detecção duplicada ---
    if (handsDetected.length === 2) {
      // Calcula distância entre as palmas das mãos (landmark 0)
      const [h1, h2] = handsDetected;
      const dx = (1 - h1[0].x) * screenWidth - (1 - h2[0].x) * screenWidth;
      const dy = h1[0].y * screenHeight - h2[0].y * screenHeight;
      const dist = Math.hypot(dx, dy);
  
      // Se muito próximas, é provavelmente a mesma mão detectada duas vezes
      if (dist < 100) {
        handsDetected = [h1]; // mantém só uma
      }
    }
  
    // --- Desenho e detecção de gesto ---
    handsDetected.forEach((lm, i) => {
      const margin = 0.05;
      let camX = Math.min(Math.max(lm[8].x, 0 - margin), 1 + margin);
      let camY = Math.min(Math.max(lm[8].y, 0 - margin), 1 + margin);
      const rawX = (1 - camX) * screenWidth;
      const rawY = camY * screenHeight;
  
      // Aplica suavização avançada
      const smoothed = smoothPosition(rawX, rawY, i);
  
      // Calcula distância entre polegar e indicador
      const dist = Math.hypot(lm[8].x - lm[4].x, lm[8].y - lm[4].y);
      
      // Determina estado atual da pinça com histerese
      let currentPinchClosed;
      if (previousPinchState[i]) {
        // Se estava fechada, precisa abrir mais para mudar estado
        currentPinchClosed = dist < PINCH_RELEASE_THRESHOLD;
      } else {
        // Se estava aberta, precisa fechar mais para mudar estado
        currentPinchClosed = dist < PINCH_THRESHOLD;
      }
      
      // Detecta TRANSIÇÃO de aberto → fechado (momento do clique)
      const justPinched = !previousPinchState[i] && currentPinchClosed;
      
      if (justPinched) {
        smashBalls(smoothed.x, smoothed.y);
      }
      
      // Atualiza estado anterior
      previousPinchState[i] = currentPinchClosed;
      
      // Desenha cursor com feedback visual do estado da pinça
      if (currentPinchClosed) {
        // Cursor vermelho quando pinça está fechada
        ctx.fillStyle = 'rgba(255, 0, 0, 0.4)';
        ctx.beginPath();
        ctx.arc(smoothed.x, smoothed.y, 15, 0, 2 * Math.PI);
        ctx.fill();
        
        ctx.fillStyle = '#ff3333';
        ctx.beginPath();
        ctx.arc(smoothed.x, smoothed.y, 8, 0, 2 * Math.PI);
        ctx.fill();
      } else {
        // Cursor verde quando pinça está aberta
        ctx.fillStyle = 'rgba(0, 255, 0, 0.3)';
        ctx.beginPath();
        ctx.arc(smoothed.x, smoothed.y, 15, 0, 2 * Math.PI);
        ctx.fill();
        
        ctx.fillStyle = 'lime';
        ctx.beginPath();
        ctx.arc(smoothed.x, smoothed.y, 8, 0, 2 * Math.PI);
        ctx.fill();
      }
    });
  }
  
  // Desenha sempre (independente de detecção)
  drawBalls();
  drawParticles();
  if(gameRunning) updateHUD(timer);
});

// ---------- Camera ----------
const cameraMP = new Camera(video,{
  onFrame: async()=>{await hands.send({image:video});}, 
  width:640, 
  height:480
});
cameraMP.start();

// ---------- Menu / Start / Restart ----------
function startGame(){
  menu.style.display='none'; countdownDiv.style.display='block';
  let count=3; countdownDiv.textContent=count;
  const interval=setInterval(()=>{
    count--; 
    if(count>0) countdownDiv.textContent=count;
    else{
      countdownDiv.textContent='VAI!';
      setTimeout(()=>{countdownDiv.style.display='none'; initBalls();},500);
      clearInterval(interval);
    }
  },1000);
}
startBtn.addEventListener('click',startGame);
restartBtn.addEventListener('click',()=>{gameOverDiv.style.display='none'; startGame();});