const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const playerImg = new Image();
playerImg.src = 'assets/player.png.png';

const guardImg = new Image();
guardImg.src = 'assets/guard.png.png';

const vaultImg = new Image();
vaultImg.src = 'assets/vault.png.png';

const trapImg = new Image();
trapImg.src = 'assets/trap.png.png';

const powerupImg = new Image();
powerupImg.src = 'assets/powerup.png.png';

// Audio setup
const bgm = new Audio('assets/bgm.mp3.mp3');
bgm.loop = true;
bgm.volume = 0.3;

const stealSound = new Audio('assets/steal.mp3.mp3');
const failSound = new Audio('assets/fail.mp3.mp3');
const powerupSound = new Audio('assets/powerup.mp3.mp3');

let currentEffectSound = null;  // Track currently playing effect

function playEffectSound(sound) {
  if (currentEffectSound && !currentEffectSound.paused) {
    currentEffectSound.pause();
    currentEffectSound.currentTime = 0;
  }
  currentEffectSound = sound;
  currentEffectSound.play();
}

let player = { x: 50, y: 50, width: 40, height: 40, speed: 4 };
let vaults = [];
let traps = [];
let guards = [];
let powerups = [];
let score = 0;
let gameOver = true; // Start game paused until Play pressed
let startTime;
let elapsedTime = 0;
let highestScore = localStorage.getItem("highScore") || 0;

// Difficulty settings
const difficulties = {
  easy: { guards: 1, traps: 1, vaults: 2, speed: 2 },
  medium: { guards: 2, traps: 2, vaults: 3, speed: 3 },
  hard: { guards: 3, traps: 3, vaults: 4, speed: 4 }
};

let currentDifficulty = 'medium';
const keys = {};

document.getElementById("difficulty").addEventListener("change", (e) => {
  currentDifficulty = e.target.value;
  // Don't auto reset here, let player reset manually
});

document.getElementById("resetBtn").addEventListener("click", () => {
  resetGame();
  document.getElementById("resetBtn").disabled = true;
});

document.getElementById("playBtn").addEventListener("click", () => {
  if (gameOver) {
    gameOver = false;
    startTime = Date.now();
    if (bgm.paused) bgm.play();
    gameLoop();
  }
});

window.addEventListener('keydown', e => {
  keys[e.key] = true;
  // To fix the "play() failed" error, start bgm on first interaction
  if (bgm.paused) bgm.play().catch(() => {});
});

window.addEventListener('keyup', e => {
  keys[e.key] = false;
});

function isColliding(a, b) {
  return a.x < b.x + b.width &&
         a.x + a.width > b.x &&
         a.y < b.y + b.height &&
         a.y + a.height > b.y;
}

function resetGame() {
  player.x = 50;
  player.y = 50;
  player.speed = difficulties[currentDifficulty].speed;
  score = 0;
  elapsedTime = 0;
  gameOver = false;

  vaults = [];
  traps = [];
  guards = [];
  powerups = [{ x: 200, y: 100, width: 30, height: 30, active: true }];

  const d = difficulties[currentDifficulty];

  // Setup vaults, mark each with .stolen = false
  for (let i = 0; i < d.vaults; i++) {
    vaults.push({
      x: 650 - i * 120,
      y: 450 - i * 120,
      width: 50,
      height: 50,
      stolen: false
    });
  }

  for (let i = 0; i < d.traps; i++) {
    traps.push({
      x: 300 + i * 150,
      y: 200 + i * 100,
      width: 40,
      height: 40
    });
  }

  for (let i = 0; i < d.guards; i++) {
    guards.push({
      x: 100 + i * 200,
      y: 100 + i * 150,
      dx: d.speed,
      dy: 0,
      width: 40,
      height: 40
    });
  }

  gameOver = true; // Pause game until Play clicked again
  bgm.pause();
  document.getElementById("resetBtn").disabled = true;
}

function handleCollisions() {
  // Traps
  for (const trap of traps) {
    if (isColliding(player, trap)) {
      playEffectSound(failSound);
      gameOver = true;
      bgm.pause();
      alert('You fell into a trap!');
      document.getElementById("resetBtn").disabled = false;
      return;
    }
  }

  // Guards
  for (const guard of guards) {
    if (isColliding(player, guard)) {
      playEffectSound(failSound);
      gameOver = true;
      bgm.pause();
      alert('Caught by a guard!');
      document.getElementById("resetBtn").disabled = false;
      return;
    }
  }

  // Vaults
  for (let vault of vaults) {
    if (!vault.stolen && isColliding(player, vault)) {
      vault.stolen = true;
      playEffectSound(stealSound);
      elapsedTime = Math.floor((Date.now() - startTime) / 1000);
      score += Math.max(100 - elapsedTime, 10);
      alert(`Vault stolen in ${elapsedTime} seconds! Score: ${score}`);

      const allStolen = vaults.every(v => v.stolen);
      if (allStolen) {
        alert("Congratulations! You stole all vaults! You can now reset the game.");
        gameOver = true;
        bgm.pause();
        document.getElementById("resetBtn").disabled = false;
      }
      return;
    }
  }

  // Powerups
  for (const powerup of powerups) {
    if (powerup.active && isColliding(player, powerup)) {
      playEffectSound(powerupSound);
      powerup.active = false;
      player.speed += 2;
      setTimeout(() => player.speed -= 2, 5000);
    }
  }
}

function gameLoop() {
  if (gameOver) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Move player with arrow keys, boundary check included
  if (keys['ArrowUp'] && player.y > 0) player.y -= player.speed;
  if (keys['ArrowDown'] && player.y + player.height < canvas.height) player.y += player.speed;
  if (keys['ArrowLeft'] && player.x > 0) player.x -= player.speed;
  if (keys['ArrowRight'] && player.x + player.width < canvas.width) player.x += player.speed;

  // Draw vaults
  vaults.forEach(vault => {
    if (!vault.stolen) ctx.drawImage(vaultImg, vault.x, vault.y, vault.width, vault.height);
  });

  // Draw player
  ctx.drawImage(playerImg, player.x, player.y, player.width, player.height);

  // Draw traps
  traps.forEach(trap => ctx.drawImage(trapImg, trap.x, trap.y, trap.width, trap.height));

  // Move and draw guards with bounce
  guards.forEach(guard => {
    guard.x += guard.dx;
    guard.y += guard.dy;

    if (guard.x <= 0 || guard.x + guard.width >= canvas.width) guard.dx *= -1;
    if (guard.y <= 0 || guard.y + guard.height >= canvas.height) guard.dy *= -1;

    ctx.drawImage(guardImg, guard.x, guard.y, guard.width, guard.height);
  });

  // Draw powerups if active
  powerups.forEach(p => {
    if (p.active) ctx.drawImage(powerupImg, p.x, p.y, p.width, p.height);
  });

  elapsedTime = Math.floor((Date.now() - startTime) / 1000);

  // Score & Timer
  ctx.fillStyle = "white";
  ctx.font = "18px Arial";
  ctx.fillText(`Score: ${score}`, 20, 30);
  ctx.fillText(`Time: ${elapsedTime}s`, 20, 50);
  ctx.fillText(`High Score: ${highestScore}`, 20, 70);

  handleCollisions();

  requestAnimationFrame(gameLoop);
}

// Start paused with resetBtn disabled
window.onload = () => {
  resetGame();
};
