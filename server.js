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
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playExplosion(){
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type='sine';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(40, now+0.2);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now+0.2);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(now); osc.stop(now+0.2);
}

// ---------- Partículas ----------
let particles = [];
function createParticles(x,y){
  const colors = ['#921919','#923b19','#751010','#925a19','#c31515'];
  for(let i=0;i<18;i++){ 
    const angle = Math.random()*2*Math.PI; 
    const speed = Math.random()*3 + 1; 
    particles.push({ x, y, dx: Math.cos(angle)*speed, dy: Math.sin(angle)*speed, r: 4 + Math.random()*3, alpha: 1, color: colors[Math.floor(Math.random()*colors.length)] });
  }
}
function updateParticles(){ 
    particles.forEach(p=>{p.x+=p.dx; p.y+=p.dy; p.alpha-=0.05}); 
    particles = particles.filter(p=>p.alpha>0);
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

function initBalls(){
    balls=[]; particles=[];
    for(let i=0;i<TOTAL_BALLS;i++){
        const r=15+Math.random()*10;
        const x=arena.x+r+Math.random()*(arena.w-2*r);
        const y=arena.y+r+Math.random()*(arena.h-2*r);
        const speed=1+Math.random()*1.5;
        const ang=Math.random()*2*Math.PI;
        balls.push({x,y,r,dx:Math.cos(ang)*speed,dy:Math.sin(ang)*speed,alive:true});
    }
    score=0; timer=gameTime; gameRunning=true;
    hud.style.display='block'; gameOverDiv.style.display='none';
    clearInterval(timerInterval);
    timerInterval=setInterval(()=>{
        if(!gameRunning) return;
        timer--;
        if(timer<=0) endGame(false);
    },1000);
}

function updateBalls(){
    balls.forEach(b=>{
        if(!b.alive) return;
        b.x+=b.dx; b.y+=b.dy;
        if(b.x-b.r<arena.x){b.x=arena.x+b.r;b.dx*=-1;}
        if(b.x+b.r>arena.x+arena.w){b.x=arena.x+arena.w-b.r;b.dx*=-1;}
        if(b.y-b.r<arena.y){b.y=arena.y+b.r;b.dy*=-1;}
        if(b.y+b.r>arena.y+arena.h){b.y=arena.y+arena.h-b.r;b.dy*=-1;}
    });
}

function drawBalls(){
    balls.forEach(b=>{
        if(!b.alive) return;
        ctx.fillStyle='#f00';
        ctx.beginPath();
        ctx.arc(b.x,b.y,b.r,0,2*Math.PI);
        ctx.fill();
    });
}

// ---------- Smash ----------
function smashBalls(mx,my,clickActive){
    if(!clickActive||!gameRunning) return;
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
function updateHUD(time){ hud.innerHTML=`Tempo: ${time}s<br>Bolhas esmagadas: ${score}`; }

// ---------- Cursor ----------
let smoothX=screenWidth/2, smoothY=screenHeight/2, clickFrames=0, cursorVisible=false;
let mouseX=screenWidth/2, mouseY=screenHeight/2, clickActive=false;

const hands = new Hands({locateFile:(file)=>`https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`});
hands.setOptions({maxNumHands:1,modelComplexity:0,minDetectionConfidence:0.5,minTrackingConfidence:0.5});
hands.onResults(results=>{
    cursorVisible=false; clickActive=false;
    if(results.multiHandLandmarks?.length>0){
        cursorVisible=true;
        const lm = results.multiHandLandmarks[0];
        const margin=0.05;
        let camX=Math.min(Math.max(lm[8].x,0-margin),1+margin);
        let camY=Math.min(Math.max(lm[8].y,0-margin),1+margin);
        mouseX=(1-camX)*screenWidth;
        mouseY=camY*screenHeight;
        smoothX+= (mouseX-smoothX)*0.4; smoothY+=(mouseY-smoothY)*0.4;
        if(Math.hypot(lm[8].x-lm[4].x,lm[8].y-lm[4].y)<0.06){clickFrames++; if(clickFrames>=5) clickActive=true;} else clickFrames=0;
    }
});

// ---------- Camera ----------
const cameraMP = new Camera(video,{ onFrame: async ()=>{ await hands.send({image:video}); }, width:320, height:240 });
cameraMP.start();

// ---------- Loop principal ----------
function gameLoop(){
    requestAnimationFrame(gameLoop);

    // Atualiza tudo independente da mão
    updateBalls();
    updateParticles();

    // Limpa camada dinâmica
    ctx.clearRect(0,0,dynamicCanvas.width,dynamicCanvas.height);

    // Desenha bolinhas e partículas
    drawBalls();
    drawParticles();

    // Smash se cursor visível
    if(cursorVisible) smashBalls(smoothX,smoothY,clickActive);

    // Cursor
    if(cursorVisible){
        ctx.fillStyle='green';
        ctx.beginPath();
        ctx.arc(smoothX,smoothY,10,0,2*Math.PI);
        ctx.fill();
    }

    // HUD
    if(gameRunning) updateHUD(timer);
}
gameLoop();

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
