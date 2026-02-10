const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const jumpBtn = document.getElementById('jump-btn');

const BASE_W = 800;
const BASE_H = 450;

let scale = 1;
let offsetX = 0;
let offsetY = 0;
let dpr = 1;

function resizeCanvas(){
  const container = document.getElementById('game-container');
  const cw = container.clientWidth;
  const ch = container.clientHeight;

  scale = Math.min(cw / BASE_W, ch / BASE_H);
  const drawW = BASE_W * scale;
  const drawH = BASE_H * scale;
  offsetX = (cw - drawW) / 2;
  offsetY = (ch - drawH) / 2;

  dpr = Math.max(1, window.devicePixelRatio || 1);
  canvas.width = Math.floor(cw * dpr);
  canvas.height = Math.floor(ch * dpr);
  canvas.style.width = cw + 'px';
  canvas.style.height = ch + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', resizeCanvas);
window.addEventListener('orientationchange', resizeCanvas);
resizeCanvas();

let gameRunning = false;
let frames = 0;
let score = 0;
let distance = 0;
let speed = 6;
let bgGradient;

let player;
let obstacles = [];
let bentos = [];

const landmarks = [
  { dist: 0, name: "📍 竹崎車站", desc: "Tiffany藍木造車站，全台唯一仍在營運！", colorTop: "#81D8D0", colorBot: "#b2bec3" },
  { dist: 1000, name: "⛰️ 獨立山步道", desc: "全台唯一與鐵道相依的登山步道，開始爬坡！", colorTop: "#55efc4", colorBot: "#00b894" },
  { dist: 2000, name: "🌊 觀音瀑布", desc: "曾因地震封閉，小心落石！欣賞磅礡氣勢！", colorTop: "#74b9ff", colorBot: "#0984e3" },
  { dist: 3000, name: "☁️ 石棹步道群", desc: "進入霧之道與茶之道，雲霧繚繞...", colorTop: "#dfe6e9", colorBot: "#636e72" },
  { dist: 4000, name: "🏁 奮起湖老街", desc: "海拔1400公尺！盡情享用奮起湖便當！", colorTop: "#fab1a0", colorBot: "#e17055" }
];
let currentLandmarkIndex = 0;

class Player{
  constructor(){
    this.width = 40; this.height = 40;
    this.x = 100; this.y = 300;
    this.dy = 0;
    this.jumpForce = -15;
    this.gravity = 0.8;
    this.grounded = false;
  }
  jump(){
    if(this.grounded){
      this.dy = this.jumpForce;
      this.grounded = false;
    }
  }
  update(){
    this.dy += this.gravity;
    this.y += this.dy;
    if(this.y + this.height > 350){
      this.y = 350 - this.height;
      this.dy = 0;
      this.grounded = true;
    }else{
      this.grounded = false;
    }
  }
  draw(){
    ctx.fillStyle = "#d63031";
    ctx.fillRect(this.x, this.y, this.width, this.height);
    ctx.fillStyle = "#ff7675";
    ctx.fillRect(this.x - 5, this.y + 5, 50, 10);
    ctx.fillStyle = "#0984e3";
    ctx.fillRect(this.x, this.y + 25, this.width, 15);
  }
}

class Obstacle{
  constructor(){
    this.width = 40; this.height = 40;
    this.x = BASE_W; this.y = 310;
    this.type = Math.random() > 0.5 ? 'ROCK' : 'TRIANGLE';
  }
  update(){ this.x -= speed; }
  draw(){
    if(this.type === 'ROCK'){
      ctx.fillStyle = "#636e72";
      ctx.beginPath();
      ctx.arc(this.x + 20, this.y + 20, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "white";
      ctx.font = "12px Arial";
      ctx.fillText("落石", this.x + 8, this.y + 25);
    }else{
      ctx.fillStyle = "#fdcb6e";
      ctx.beginPath();
      ctx.moveTo(this.x, this.y + 40);
      ctx.lineTo(this.x + 20, this.y);
      ctx.lineTo(this.x + 40, this.y + 40);
      ctx.fill();
      ctx.fillStyle = "black";
      ctx.font = "12px Arial";
      ctx.fillText("軌道", this.x + 8, this.y + 35);
    }
  }
}

class Bento{
  constructor(){
    this.x = BASE_W;
    this.y = 200 + Math.random() * 100;
  }
  update(){ this.x -= speed; }
  draw(){
    ctx.font = "30px Arial";
    ctx.fillText("🍱", this.x, this.y);
  }
}

function updateUI(){
  document.getElementById('score').innerText = score;
  document.getElementById('distance').innerText = Math.floor(distance);
}

function init(){
  player = new Player();
  obstacles = [];
  bentos = [];
  score = 0;
  distance = 0;
  frames = 0;
  speed = 6;
  currentLandmarkIndex = 0;
  updateUI();
}

function updateEnvironment(){
  let currentInfo = landmarks[0];
  for(let i=0;i<landmarks.length;i++){
    if(distance >= landmarks[i].dist){
      currentInfo = landmarks[i];
      currentLandmarkIndex = i;
    }
  }
  bgGradient = ctx.createLinearGradient(0, 0, 0, BASE_H);
  bgGradient.addColorStop(0, currentInfo.colorTop);
  bgGradient.addColorStop(1, currentInfo.colorBot);

  const msgBox = document.getElementById('message-box');
  const text = `${currentInfo.name} - ${currentInfo.desc}`;
  if(msgBox.innerText !== text) msgBox.innerText = text;
}

function checkCollision(r1, r2){
  return (
    r1.x < r2.x + r2.width &&
    r1.x + r1.width > r2.x &&
    r1.y < r2.y + r2.height &&
    r1.y + r1.height > r2.y
  );
}

function gameOver(){
  gameRunning = false;
  document.getElementById('game-over-screen').classList.remove('hidden');
  document.getElementById('final-score').innerText = score;
  document.getElementById('final-location').innerText = landmarks[currentLandmarkIndex].name;
}

function beginWorldDraw(){
  const cw = document.getElementById('game-container').clientWidth;
  const ch = document.getElementById('game-container').clientHeight;

  ctx.clearRect(0, 0, cw, ch);
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, cw, ch);

  ctx.save();
  ctx.translate(offsetX, offsetY);
  ctx.scale(scale, scale);
}
function endWorldDraw(){ ctx.restore(); }

function gameLoop(){
  if(!gameRunning) return;

  beginWorldDraw();

  updateEnvironment();
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, BASE_W, BASE_H);

  ctx.fillStyle = "#2d3436";
  ctx.fillRect(0, 350, BASE_W, 100);

  ctx.fillStyle = "#636e72";
  const sleeperOffset = (frames * speed) % 60;
  for(let i=0;i<BASE_W+60;i+=60){
    ctx.fillRect(i - sleeperOffset, 360, 20, 80);
  }

  ctx.fillStyle = "#b2bec3";
  ctx.fillRect(0, 370, BASE_W, 10);
  ctx.fillRect(0, 420, BASE_W, 10);

  if(frames % 120 === 0 && Math.random() > 0.3) obstacles.push(new Obstacle());
  if(frames % 80 === 0) bentos.push(new Bento());

  player.update();
  player.draw();

  for(let i=obstacles.length-1;i>=0;i--){
    obstacles[i].update();
    obstacles[i].draw();

    const hitbox = {
      x: obstacles[i].x + 10,
      y: obstacles[i].y + 10,
      width: obstacles[i].width - 20,
      height: obstacles[i].height - 20
    };

    if(checkCollision(player, hitbox)){
      endWorldDraw();
      gameOver();
      return;
    }
    if(obstacles[i].x < -60) obstacles.splice(i, 1);
  }

  for(let i=bentos.length-1;i>=0;i--){
    bentos[i].update();
    bentos[i].draw();
    const b = { x: bentos[i].x, y: bentos[i].y - 30, width: 30, height: 30 };

    if(checkCollision(player, b)){
      score++;
      bentos.splice(i, 1);
    }else if(bentos[i].x < -60){
      bentos.splice(i, 1);
    }
  }

  frames++;
  distance += speed / 10;
  if(frames % 600 === 0) speed += 0.5;

  endWorldDraw();
  updateUI();
  requestAnimationFrame(gameLoop);
}

function startGame(){
  document.getElementById('start-screen').classList.add('hidden');
  document.getElementById('game-over-screen').classList.add('hidden');
  init();
  gameRunning = true;
  gameLoop();
}
function resetGame(){ startGame(); }

document.getElementById('startBtn').addEventListener('click', startGame);
document.getElementById('retryBtn').addEventListener('click', resetGame);

function jumpAction(e){
  if(e) e.preventDefault();
  if(gameRunning) player.jump();
}

window.addEventListener('keydown', (e)=>{
  if(e.code === 'Space'){ e.preventDefault(); jumpAction(); }
});
canvas.addEventListener('mousedown', jumpAction);
canvas.addEventListener('touchstart', jumpAction, { passive:false });
jumpBtn.addEventListener('mousedown', jumpAction);
jumpBtn.addEventListener('touchstart', jumpAction, { passive:false });

// iOS 防雙擊放大
let lastTouchEnd = 0;
document.addEventListener('touchend', (e)=>{
  const now = Date.now();
  if(now - lastTouchEnd <= 300) e.preventDefault();
  lastTouchEnd = now;
}, { passive:false });