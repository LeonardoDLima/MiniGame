/* -------------------------
   Config e elementos DOM
   ------------------------- */
   const video = document.getElementById('video');
   const canvas = document.getElementById('canvas');
   const ctx = canvas.getContext('2d');
   const hud = document.getElementById('hud');
   const menu = document.getElementById('menu');
   const startBtn = document.getElementById('startBtn');
   const countdownDiv = document.getElementById('countdown');
   const gameOverDiv = document.getElementById('gameOver');
   const scoreText = document.getElementById('scoreText');
   const restartBtn = document.getElementById('restartBtn');
   
   let screenWidth = window.innerWidth;
   let screenHeight = window.innerHeight;
   canvas.width = screenWidth;
   canvas.height = screenHeight;
   
   /* -------------------------
      Arena
   ------------------------- */
   const ARENA_W_RATIO = 0.86;
   const ARENA_H_RATIO = 0.72;
   function computeArena() {
     screenWidth = window.innerWidth;
     screenHeight = window.innerHeight;
     canvas.width = screenWidth;
     canvas.height = screenHeight;
     const aw = Math.round(screenWidth * ARENA_W_RATIO);
     const ah = Math.round(screenHeight * ARENA_H_RATIO);
     const ax = Math.round((screenWidth - aw) / 2);
     const ay = Math.round((screenHeight - ah) / 2);
     return { x: ax, y: ay, w: aw, h: ah };
   }
   let arena = computeArena();
   window.addEventListener('resize', () => arena = computeArena());
   
   /* -------------------------
      Som explosão
   ------------------------- */
   const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
   function playExplosion() {
     const now = audioCtx.currentTime;
     const osc = audioCtx.createOscillator();
     const gain = audioCtx.createGain();
     osc.type = 'sine';
     osc.frequency.setValueAtTime(100, now);
     osc.frequency.exponentialRampToValueAtTime(40, now + 0.35);
     gain.gain.setValueAtTime(0.5, now);
     gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
     osc.connect(gain).connect(audioCtx.destination);
     osc.start(now);
     osc.stop(now + 0.35);
   }
   
   /* -------------------------
      Partículas (menos para celular)
   ------------------------- */
   let particles = [];
   function createParticles(x, y) {
     const colors = ['#921919','#923b19','#751010','#925a19','#c31515'];
     for (let i = 0; i < 8; i++) {
       const angle = Math.random()*2*Math.PI;
       const speed = Math.random()*2 + 1;
       particles.push({ x, y, dx: Math.cos(angle)*speed, dy: Math.sin(angle)*speed, r: 3 + Math.random()*2, alpha: 1, color: colors[Math.floor(Math.random()*colors.length)] });
     }
   }
   function updateParticles(){
     particles.forEach(p => { p.x+=p.dx; p.y+=p.dy; p.alpha-=0.04; });
     particles = particles.filter(p => p.alpha>0);
   }
   function drawParticles(){
     particles.forEach(p => {
       ctx.beginPath();
       ctx.arc(p.x, p.y, p.r, 0, 2*Math.PI);
       ctx.fillStyle = `rgba(${hexToRgb(p.color)},${p.alpha})`;
       ctx.fill();
     });
   }
   function hexToRgb(hex){
     hex = hex.replace('#','');
     const bigint = parseInt(hex,16);
     const r = (bigint >> 16) & 255;
     const g = (bigint >> 8) & 255;
     const b = bigint & 255;
     return `${r},${g},${b}`;
   }
   
   /* -------------------------
      Bolinhas
   ------------------------- */
   const TOTAL_BALLS = 12;
   let balls = [], score = 0, gameTime = 30, gameRunning=false, timer=gameTime, timerInterval;
   
   function initBalls(){
     balls=[]; particles=[];
     const a=arena;
     for(let i=0;i<TOTAL_BALLS;i++){
       const r = 15 + Math.random()*15;
       const x = a.x + r + Math.random()*(a.w - 2*r);
       const y = a.y + r + Math.random()*(a.h - 2*r);
       const speed = 1 + Math.random()*2;
       const ang = Math.random()*2*Math.PI;
       balls.push({x,y,r,dx:Math.cos(ang)*speed,dy:Math.sin(ang)*speed,alive:true});
     }
     score=0; timer=gameTime; gameRunning=true;
     hud.style.display='block';
     gameOverDiv.style.display='none';
     clearInterval(timerInterval);
     timerInterval = setInterval(()=>{
       if(!gameRunning) return;
       timer--;
       if(timer<=0) endGame(false);
     },1000);
   }
   
   function updateBalls(){
     const a=arena;
     balls.forEach(b=>{
       if(!b.alive) return;
       b.x+=b.dx; b.y+=b.dy;
       if(b.x-b.r < a.x){b.x=a.x+b.r; b.dx*=-1;}
       if(b.x+b.r > a.x+a.w){b.x=a.x+a.w-b.r; b.dx*=-1;}
       if(b.y-b.r < a.y){b.y=a.y+b.r; b.dy*=-1;}
       if(b.y+b.r > a.y+a.h){b.y=a.y+a.h-b.r; b.dy*=-1;}
     });
   }
   
   function drawBalls(){
     const a=arena;
     ctx.lineWidth=3; ctx.strokeStyle='#00e0ff'; ctx.fillStyle='#00101599';
     ctx.fillRect(a.x,a.y,a.w,a.h); ctx.strokeRect(a.x,a.y,a.w,a.h);
     balls.forEach(b=>{
       if(!b.alive) return;
       ctx.fillStyle='#f00';
       ctx.beginPath(); ctx.arc(b.x,b.y,b.r,0,2*Math.PI); ctx.fill();
     });
   }
   
   /* -------------------------
      Fim de jogo/HUD
   ------------------------- */
   function endGame(allPopped){
     gameRunning=false;
     clearInterval(timerInterval);
     gameOverDiv.style.display='flex';
     scoreText.innerHTML = allPopped ? `🎉 Parabéns! Você estourou todas as bolinhas!<br>Total: ${score}` : `⏱ Tempo esgotado!<br>Bolhas esmagadas: ${score}`;
   }
   function updateHUD(){ hud.innerHTML = `Tempo: ${timer}s<br>Bolhas esmagadas: ${score}`; }
   
   /* -------------------------
      Smash
   ------------------------- */
   function smashBalls(mouseX, mouseY, clickActive){
     if(!clickActive || !gameRunning) return;
     balls.forEach(b=>{
       if(!b.alive) return;
       const dist = Math.hypot(mouseX-b.x, mouseY-b.y);
       if(dist<b.r){b.alive=false; score++; playExplosion(); createParticles(b.x,b.y);}
     });
     if(balls.every(b=>!b.alive)) endGame(true);
   }
   
   /* -------------------------
      MediaPipe Hands
   ------------------------- */
   let smoothX=screenWidth/2, smoothY=screenHeight/2, clickFrames=0;
   
   const hands = new Hands({ locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}` });
   hands.setOptions({ maxNumHands:1, modelComplexity:1, minDetectionConfidence:0.6, minTrackingConfidence:0.6 });
   
   hands.onResults((results)=>{
     ctx.clearRect(0,0,canvas.width,canvas.height);
     let mouseX=smoothX, mouseY=smoothY, clickActive=false;
   
     if(results.multiHandLandmarks && results.multiHandLandmarks.length>0){
       const lm=results.multiHandLandmarks[0], indexTip=lm[8], thumbTip=lm[4];
       let camX=indexTip.x, camY=indexTip.y;
       camX=Math.min(Math.max(camX,-0.05),1.05); camY=Math.min(Math.max(camY,-0.05),1.05);
       mouseX=(1-camX)*screenWidth; mouseY=camY*screenHeight;
       smoothX += (mouseX - smoothX)*0.4;
       smoothY += (mouseY - smoothY)*0.4;
   
       if(Math.hypot(indexTip.x-thumbTip.x,indexTip.y-thumbTip.y)<0.06){ clickFrames++; if(clickFrames>=4) clickActive=true; } 
       else clickFrames=0;
   
       ctx.fillStyle='green'; ctx.beginPath(); ctx.arc(smoothX,smoothY,10,0,2*Math.PI); ctx.fill();
     }
   
     smashBalls(smoothX,smoothY,clickActive);
     updateBalls(); drawBalls();
     updateParticles(); drawParticles();
     if(gameRunning) updateHUD();
   });
   
   /* -------------------------
      Camera MP otimizada
   ------------------------- */
   const cameraMP = new Camera(video, { onFrame: async ()=>await hands.send({ image: video }), width:320, height:240 });
   cameraMP.start();
   
   /* -------------------------
      Loop de animação
   ------------------------- */
   function gameLoop(){ requestAnimationFrame(gameLoop); }
   gameLoop();
   
   /* -------------------------
      Menu / Start / Restart
   ------------------------- */
   function startGame(){
     menu.style.display='none';
     countdownDiv.style.display='block';
     let count=3;
     countdownDiv.textContent=count;
     const interval = setInterval(()=>{
       count--;
       if(count>0) countdownDiv.textContent=count;
       else{
         countdownDiv.textContent='VAI!';
         setTimeout(()=>{ countdownDiv.style.display='none'; initBalls(); },600);
         clearInterval(interval);
       }
     },1000);
   }
   
   startBtn.addEventListener('click',startGame);
   restartBtn.addEventListener('click',()=>{ gameOverDiv.style.display='none'; startGame(); });
   
   /* -------------------------
      Resize
   ------------------------- */
   window.addEventListener('resize',()=>{
     screenWidth=window.innerWidth; screenHeight=window.innerHeight;
     canvas.width=screenWidth; canvas.height=screenHeight;
     arena=computeArena();
     smoothX=Math.min(Math.max(smoothX,0),screenWidth);
     smoothY=Math.min(Math.max(smoothY,0),screenHeight);
   });
   