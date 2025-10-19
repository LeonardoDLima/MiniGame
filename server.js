/* -------------------------
   Config e elementos DOM
   ------------------------- */
   const socket = io();
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
      Arena (quadro) - ajuste aqui
      ------------------------- */
   // Dimensões do quadro (percentual da tela)
   const ARENA_W_RATIO = 0.86; // 86% da largura
   const ARENA_H_RATIO = 0.72; // 72% da altura
   
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
   window.addEventListener('resize', ()=> arena = computeArena());
   
   /* -------------------------
      Som (explosão via WebAudio)
      ------------------------- */
   const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
   function playExplosion() {
     const now = audioCtx.currentTime;
   
     // 🔹 Ruído principal da explosão
     const noiseBufferSize = Math.floor(audioCtx.sampleRate * 0.25);
     const noiseBuffer = audioCtx.createBuffer(1, noiseBufferSize, audioCtx.sampleRate);
     const noiseData = noiseBuffer.getChannelData(0);
     for (let i = 0; i < noiseBufferSize; i++) {
       noiseData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / noiseBufferSize, 2);
     }
     const noise = audioCtx.createBufferSource();
     noise.buffer = noiseBuffer;
   
     // 🔹 Filtro passa-baixa — dá corpo ao som
     const filter = audioCtx.createBiquadFilter();
     filter.type = 'lowpass';
     filter.frequency.value = 500;
   
     // 🔹 Ganho para controlar o volume
     const gain = audioCtx.createGain();
     gain.gain.setValueAtTime(100, now);
     gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
   
     // 🔹 Subgrave curto (boom)
     const osc = audioCtx.createOscillator();
     osc.type = 'sine';
     osc.frequency.setValueAtTime(100, now);
     osc.frequency.exponentialRampToValueAtTime(40, now + 0.35);
     const oscGain = audioCtx.createGain();
     oscGain.gain.setValueAtTime(0.8, now);
     oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
   
     // 🔹 Conexões
     noise.connect(filter).connect(gain).connect(audioCtx.destination);
     osc.connect(oscGain).connect(audioCtx.destination);
   
     // 🔹 Toca ambos
     noise.start(now);
     osc.start(now);
     noise.stop(now + 0.35);
     osc.stop(now + 0.35);
   }
   
   
   /* -------------------------
      Partículas
      ------------------------- */
   let particles = [];
   function createParticles(x,y){
     const colors = ['#921919','#923b19','#751010','#925a19','#c31515'];
     for(let i=0;i<18;i++){
       const angle = Math.random()*2*Math.PI;
       const speed = Math.random()*3 + 1;
       particles.push({
         x: x,
         y: y,
         dx: Math.cos(angle)*speed,
         dy: Math.sin(angle)*speed,
         r: 4 + Math.random()*3,
         alpha: 1,
         color: colors[Math.floor(Math.random()*colors.length)]
       });
     }
   }
   function updateParticles(){
     particles.forEach(p=>{
       p.x += p.dx; p.y += p.dy;
       p.alpha -= 0.03;
     });
     particles = particles.filter(p => p.alpha > 0);
   }
   function drawParticles(){
     particles.forEach(p=>{
       ctx.beginPath();
       ctx.arc(p.x,p.y,p.r,0,2*Math.PI);
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
      Bolinhas (dentro da arena)
      ------------------------- */
   const TOTAL_BALLS = 15;
   let balls = [];
   let score = 0;
   let gameTime = 30;
   let gameRunning = false;
   let timer = gameTime;
   let timerInterval;
   
   function initBalls(){
     balls = [];
     particles = [];
     const a = arena;
     for(let i=0;i<TOTAL_BALLS;i++){
       const r = 18 + Math.random()*18;
       // posições dentro da arena (considerando raio)
       const x = a.x + r + Math.random()*(a.w - 2*r);
       const y = a.y + r + Math.random()*(a.h - 2*r);
       const speed = 1 + Math.random()*2.5;
       const ang = Math.random()*Math.PI*2;
       balls.push({ x, y, r, dx: Math.cos(ang)*speed, dy: Math.sin(ang)*speed, alive: true });
     }
     score = 0;
     timer = gameTime;
     gameRunning = true;
     hud.style.display = 'block';
     gameOverDiv.style.display = 'none';
     clearInterval(timerInterval);
     timerInterval = setInterval(()=>{
       if(!gameRunning) return;
       timer--;
       if(timer <= 0) endGame(false);
     },1000);
   }
   
   function updateBalls(){
     const a = arena;
     balls.forEach(b=>{
       if(!b.alive) return;
       b.x += b.dx;
       b.y += b.dy;
       // colisão com as bordas da arena (considera raio)
       if(b.x - b.r < a.x){
         b.x = a.x + b.r;
         b.dx *= -1;
       }
       if(b.x + b.r > a.x + a.w){
         b.x = a.x + a.w - b.r;
         b.dx *= -1;
       }
       if(b.y - b.r < a.y){
         b.y = a.y + b.r;
         b.dy *= -1;
       }
       if(b.y + b.r > a.y + a.h){
         b.y = a.y + a.h - b.r;
         b.dy *= -1;
       }
     });
   }
   
   function drawBalls(){
     // desenha a arena (borda)
     const a = arena;
     ctx.lineWidth = 4;
     ctx.strokeStyle = '#00e0ff';
     ctx.fillStyle = '#00101599';
     ctx.fillRect(a.x, a.y, a.w, a.h);
     ctx.strokeRect(a.x, a.y, a.w, a.h);
   
     // bolinhas
     balls.forEach(b=>{
       if(!b.alive) return;
       ctx.fillStyle = '#f00';
       ctx.beginPath();
       ctx.arc(b.x, b.y, b.r, 0, 2*Math.PI);
       ctx.fill();
     });
   }
   
   /* -------------------------
      Final de jogo / HUD
      ------------------------- */
   function endGame(allPopped){
     gameRunning = false;
     clearInterval(timerInterval);
     gameOverDiv.style.display = 'flex';
     if(allPopped){
       scoreText.innerHTML = `🎉 Parabéns! Você estourou todas as bolinhas!<br>Total: ${score}`;
     } else {
       scoreText.innerHTML = `⏱ Tempo esgotado!<br>Bolhas esmagadas: ${score}`;
     }
   }
   function updateHUD(time){
     hud.innerHTML = `Tempo: ${time}s<br>Bolhas esmagadas: ${score}`;
   }
   
   /* -------------------------
      Smash: verifica colisão do cursor (smoothX/smoothY)
      ------------------------- */
   function smashBalls(mouseX, mouseY, clickActive){
     if(!clickActive || !gameRunning) return;
     balls.forEach(b=>{
       if(!b.alive) return;
       const dist = Math.hypot(mouseX - b.x, mouseY - b.y);
       if(dist < b.r){
         b.alive = false;
         score++;
         playExplosion();
         createParticles(b.x, b.y);
       }
     });
     const allPopped = balls.every(b => !b.alive);
     if(allPopped) endGame(true);
   }
   
   /* -------------------------
      MediaPipe Hands (mantive seu mapeamento)
      ------------------------- */
   let smoothX = screenWidth/2;
   let smoothY = screenHeight/2;
   let clickFrames = 0;
   
   const hands = new Hands({ locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}` });
   hands.setOptions({ maxNumHands: 1, modelComplexity: 1, minDetectionConfidence: 0.6, minTrackingConfidence: 0.6 });
   
   hands.onResults((results)=>{
     // limpo canvas toda vez (redesenho arena + bolas + partículas)
     ctx.clearRect(0,0,canvas.width,canvas.height);
   
     let mouseX = smoothX, mouseY = smoothY;
     let clickActive = false;
   
     if(results.multiHandLandmarks && results.multiHandLandmarks.length > 0){
       const lm = results.multiHandLandmarks[0];
       const indexTip = lm[8];
       const thumbTip = lm[4];
   
       // margem para extrapolar um pouco além da câmera
       const margin = 0.05;
       let camX = indexTip.x;
       let camY = indexTip.y;
       camX = Math.min(Math.max(camX, 0 - margin), 1 + margin);
       camY = Math.min(Math.max(camY, 0 - margin), 1 + margin);
   
       // caso precise inverter X, troque por (1 - camX) * screenWidth
       mouseX = (1 - camX) * screenWidth;
       mouseY = camY * screenHeight;
   
       // suavização
       smoothX += (mouseX - smoothX) * 0.25;
       smoothY += (mouseY - smoothY) * 0.25;
   
       // pinch detect
       const distClick = Math.hypot(indexTip.x - thumbTip.x, indexTip.y - thumbTip.y);
       if(distClick < 0.06){
         clickFrames++;
         if(clickFrames >= 5) clickActive = true;
       } else {
         clickFrames = 0;
         clickActive = false;
       }
   
       // desenha cursor (no modo absoluto da tela)
       ctx.fillStyle = 'green';
       ctx.beginPath();
       ctx.arc(smoothX, smoothY, 10, 0, 2*Math.PI);
       ctx.fill();
     }
   
     // executar smash com posição suavizada
     smashBalls(smoothX, smoothY, clickActive);
   
     // atualizar e desenhar tudo
     updateBalls();
     drawBalls();
     updateParticles();
     drawParticles();
     if(gameRunning) updateHUD(timer);
   });
   
   /* -------------------------
      Camera MP
      ------------------------- */
   const cameraMP = new Camera(video, { onFrame: async () => await hands.send({ image: video }), width: 640, height: 480 });
   cameraMP.start();
   
   /* -------------------------
      Loop de animação
      ------------------------- */
   function gameLoop(){
     requestAnimationFrame(gameLoop);
     // desenhos já são feitos no hands.onResults para manter sincronia com camera frames
   }
   gameLoop();
   
   /* -------------------------
      Menu / start / restart
      ------------------------- */
     function startGame(){
     menu.style.display = 'none';
     countdownDiv.style.display = 'block';
     let count = 3;
     countdownDiv.textContent = count;
     const interval = setInterval(()=>{
       count--;
       if(count > 0){
         countdownDiv.textContent = count;
       } else {
         countdownDiv.textContent = 'VAI!';
         setTimeout(()=>{
           countdownDiv.style.display = 'none';
           initBalls();
         }, 800);
         clearInterval(interval);
       }
     },1000);
   }
   
   startBtn.addEventListener('click', startGame);
   restartBtn.addEventListener('click', ()=> {
     gameOverDiv.style.display = 'none';
     startGame();
   });
   
   /* -------------------------
      Resize handler (recalibra arena + mantém cursor)
      ------------------------- */
   window.addEventListener('resize', () => {
     screenWidth = window.innerWidth;
     screenHeight = window.innerHeight;
     canvas.width = screenWidth;
     canvas.height = screenHeight;
     arena = computeArena();
     // manter smoothX/smoothY dentro da tela
     smoothX = Math.min(Math.max(smoothX, 0), screenWidth);
     smoothY = Math.min(Math.max(smoothY, 0), screenHeight);
   });