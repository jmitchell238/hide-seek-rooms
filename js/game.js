'use strict';

/** @type {'menu'|'play'|'win'} */
let state = 'menu';

/** @type {{ toy: object, x: number, y: number, r: number, found: boolean, cover: number, bob: number, pop: number }[]} */
let hides = [];
let roomIndex = 0;
let modeId = 'cozy';
let roomNum = 0;       // rooms completed this run
let roomsTarget = 0;
let sessionFinds = 0;
let foundThisRoom = 0;
let needThisRoom = 0;
let winFlash = 0;
let hintTimer = 0;
let roomPhase = 0;
let missFlash = 0;
let celebrating = false;

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function currentMode() {
  return MODES[modeId] || MODES.cozy;
}

function currentRoom() {
  return ROOMS[roomIndex % ROOMS.length];
}

function playArea() {
  return { x0: 24, y0: 100, x1: W - 24, y1: H - 90 };
}

function layoutRoom() {
  const m = currentMode();
  const room = currentRoom();
  const n = Math.min(m.toys | 0, room.spots.length, TOYS.length);
  needThisRoom = n;
  foundThisRoom = 0;
  celebrating = false;

  const toys = shuffle(TOYS).slice(0, n);
  const spots = shuffle(room.spots).slice(0, n);
  const area = playArea();
  const aw = area.x1 - area.x0;
  const ah = area.y1 - area.y0;

  hides = toys.map((toy, i) => {
    const s = spots[i];
    return {
      toy,
      x: area.x0 + s.x * aw,
      y: area.y0 + s.y * ah,
      r: 28,
      found: false,
      cover: s.cover,
      bob: Math.random() * Math.PI * 2,
      pop: 0,
      spark: 0,
    };
  });

  hintTimer = 0;
  missFlash = 0;
}

function enterPlay(forceMode) {
  state = 'play';
  modeId = forceMode || save.mode || 'cozy';
  const m = currentMode();
  roomsTarget = m.rooms | 0;
  roomNum = 0;
  sessionFinds = 0;
  winFlash = 0;
  // Start from a random unlocked-ish room, cycle through
  roomIndex = Math.floor(Math.random() * ROOMS.length);
  clearParticles();
  layoutRoom();
}

function enterMenu() {
  state = 'menu';
  clearParticles();
}

function enterWin() {
  state = 'win';
  winFlash = 1.5;
  sfxWin();
  spawnBurst(W / 2, H * 0.4, '#FFD56A', 28);
  spawnBurst(W / 2, H * 0.4, '#7DFFA0', 18);
  spawnPraise(W / 2, H * 0.28, 'All clear!');
  recordRoom();
}

function allFound() {
  return hides.length > 0 && hides.every(h => h.found);
}

function nextRoomOrWin() {
  recordRoom();
  roomNum++;
  const m = currentMode();
  if (!m.rooms) {
    // Free play: forever
    sfxFind();
    spawnPraise(W / 2, 120, 'Next room!');
    roomIndex = (roomIndex + 1) % ROOMS.length;
    layoutRoom();
    return;
  }
  if (roomNum >= roomsTarget) {
    enterWin();
  } else {
    sfxFind();
    spawnPraise(W / 2, 100, 'Room ' + (roomNum + 1) + '!');
    roomIndex = (roomIndex + 1) % ROOMS.length;
    layoutRoom();
  }
}

function hitHide(x, y) {
  // Prefer unfound, largest hit first (top of list = later draws)
  let best = null;
  let bestD = Infinity;
  for (const h of hides) {
    if (h.found) continue;
    const dx = x - h.x;
    const dy = y - h.y;
    // Generous hit: cover reduces visible but hit is still generous
    const hitR = h.r * 1.35;
    const d = dx * dx + dy * dy;
    if (d <= hitR * hitR && d < bestD) {
      best = h;
      bestD = d;
    }
  }
  return best;
}

function onTap(x, y) {
  if (state !== 'play' || celebrating) return;

  const h = hitHide(x, y);
  if (h) {
    h.found = true;
    h.pop = 0.45;
    foundThisRoom++;
    sessionFinds++;
    recordFind();
    sfxFind();
    spawnBurst(h.x, h.y, h.toy.color, 18);
    spawnPraise(h.x, h.y - 40, h.toy.label + '!');
    hintTimer = 0;

    if (allFound()) {
      celebrating = true;
      setTimeout(() => {
        if (state === 'play' && allFound()) nextRoomOrWin();
      }, save.reducedMotion ? 450 : 750);
    }
  } else {
    // Soft miss — never fail, just a tiny tap feedback
    missFlash = 0.25;
    sfxMiss();
    // if near a hide, nudge hint
    let near = null;
    let nearD = Infinity;
    for (const hh of hides) {
      if (hh.found) continue;
      const d = Math.hypot(x - hh.x, y - hh.y);
      if (d < nearD) { nearD = d; near = hh; }
    }
    if (near && nearD < 90) {
      near.spark = 0.6;
      spawnPraise(near.x, near.y - 36, 'Warm!');
    }
  }
}

function updatePlay(dt) {
  roomPhase += dt;
  hintTimer += dt;
  if (missFlash > 0) missFlash = Math.max(0, missFlash - dt);

  for (const h of hides) {
    h.bob += dt * 2.2;
    if (h.pop > 0) h.pop = Math.max(0, h.pop - dt);
    if (h.spark > 0) h.spark = Math.max(0, h.spark - dt);
  }

  // Soft helper sparkles on first unfound after idle
  if (hintTimer > HINT_AFTER && !celebrating) {
    const unfound = hides.find(h => !h.found);
    if (unfound && Math.floor(hintTimer * 3) !== Math.floor((hintTimer - dt) * 3)) {
      spawnSparkle(unfound.x, unfound.y - 8);
      if (Math.floor(hintTimer) !== Math.floor(hintTimer - dt) && Math.floor(hintTimer) % 3 === 0) {
        sfxHint();
      }
    }
  }

  updateParticles(dt);
}

function updateWin(dt) {
  winFlash = Math.max(0, winFlash - dt);
  updateParticles(dt);
}

// ---- Drawing helpers ----

function roundRect(ctx, x, y, w, h, r) {
  if (ctx.roundRect) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    return;
  }
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function drawToySprite(ctx, toy, x, y, r, scale) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  const id = toy.id;

  if (id === 'star') {
    ctx.fillStyle = toy.color;
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + i * Math.PI * 2 / 5;
      const a2 = a + Math.PI / 5;
      const r1 = r, r2 = r * 0.42;
      if (i === 0) ctx.moveTo(Math.cos(a) * r1, Math.sin(a) * r1);
      else ctx.lineTo(Math.cos(a) * r1, Math.sin(a) * r1);
      ctx.lineTo(Math.cos(a2) * r2, Math.sin(a2) * r2);
    }
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = toy.color2;
    ctx.lineWidth = 2;
    ctx.stroke();
  } else if (id === 'ball') {
    const g = ctx.createRadialGradient(-r * 0.3, -r * 0.3, 2, 0, 0, r);
    g.addColorStop(0, toy.color2);
    g.addColorStop(0.5, toy.color);
    g.addColorStop(1, toy.color2);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.9, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.15)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.9, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-r * 0.9, 0);
    ctx.lineTo(r * 0.9, 0);
    ctx.moveTo(0, -r * 0.9);
    ctx.lineTo(0, r * 0.9);
    ctx.stroke();
  } else if (id === 'teddy') {
    ctx.fillStyle = toy.color;
    ctx.beginPath();
    ctx.arc(-r * 0.55, -r * 0.55, r * 0.35, 0, Math.PI * 2);
    ctx.arc(r * 0.55, -r * 0.55, r * 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.75, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = toy.color2;
    ctx.beginPath();
    ctx.arc(0, r * 0.15, r * 0.28, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3E2723';
    ctx.beginPath();
    ctx.arc(-r * 0.28, -r * 0.12, r * 0.1, 0, Math.PI * 2);
    ctx.arc(r * 0.28, -r * 0.12, r * 0.1, 0, Math.PI * 2);
    ctx.fill();
  } else if (id === 'duck') {
    ctx.fillStyle = toy.color;
    ctx.beginPath();
    ctx.ellipse(0, r * 0.15, r * 0.85, r * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(-r * 0.35, -r * 0.45, r * 0.45, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = toy.color2;
    ctx.beginPath();
    ctx.ellipse(-r * 0.85, -r * 0.4, r * 0.35, r * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(-r * 0.45, -r * 0.55, r * 0.1, 0, Math.PI * 2);
    ctx.fill();
  } else if (id === 'cookie') {
    ctx.fillStyle = toy.color;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.85, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = toy.color2;
    for (const [px, py] of [[-0.3, -0.2], [0.25, -0.25], [0.1, 0.3], [-0.25, 0.25], [0.35, 0.15]]) {
      ctx.beginPath();
      ctx.arc(px * r, py * r, r * 0.12, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (id === 'car') {
    ctx.fillStyle = toy.color;
    roundRect(ctx, -r * 0.9, -r * 0.15, r * 1.8, r * 0.7, 6);
    ctx.fill();
    ctx.fillStyle = toy.color2;
    roundRect(ctx, -r * 0.45, -r * 0.55, r * 0.9, r * 0.5, 5);
    ctx.fill();
    ctx.fillStyle = '#90CAF9';
    roundRect(ctx, -r * 0.35, -r * 0.48, r * 0.7, r * 0.32, 3);
    ctx.fill();
    ctx.fillStyle = '#333';
    ctx.beginPath();
    ctx.arc(-r * 0.5, r * 0.55, r * 0.28, 0, Math.PI * 2);
    ctx.arc(r * 0.5, r * 0.55, r * 0.28, 0, Math.PI * 2);
    ctx.fill();
  } else if (id === 'balloon') {
    ctx.fillStyle = toy.color;
    ctx.beginPath();
    ctx.ellipse(0, -r * 0.15, r * 0.7, r * 0.85, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = toy.color2;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, r * 0.7);
    ctx.quadraticCurveTo(r * 0.15, r * 1.1, 0, r * 1.3);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.beginPath();
    ctx.ellipse(-r * 0.25, -r * 0.4, r * 0.2, r * 0.3, -0.3, 0, Math.PI * 2);
    ctx.fill();
  } else if (id === 'book') {
    ctx.fillStyle = toy.color;
    roundRect(ctx, -r * 0.7, -r * 0.85, r * 1.4, r * 1.7, 4);
    ctx.fill();
    ctx.fillStyle = toy.color2;
    ctx.fillRect(-r * 0.7, -r * 0.85, r * 0.18, r * 1.7);
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 2;
    ctx.strokeRect(-r * 0.4, -r * 0.4, r * 0.85, r * 0.9);
  } else if (id === 'apple') {
    ctx.fillStyle = toy.color;
    ctx.beginPath();
    ctx.arc(-r * 0.2, r * 0.1, r * 0.55, 0, Math.PI * 2);
    ctx.arc(r * 0.2, r * 0.1, r * 0.55, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = toy.color2;
    ctx.beginPath();
    ctx.ellipse(r * 0.25, -r * 0.55, r * 0.35, r * 0.18, 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#5D4037';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.2);
    ctx.lineTo(0, -r * 0.7);
    ctx.stroke();
  } else if (id === 'bone') {
    ctx.fillStyle = toy.color;
    ctx.strokeStyle = toy.color2;
    ctx.lineWidth = 2;
    roundRect(ctx, -r * 0.7, -r * 0.22, r * 1.4, r * 0.44, 8);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(-r * 0.7, -r * 0.28, r * 0.28, 0, Math.PI * 2);
    ctx.arc(-r * 0.7, r * 0.28, r * 0.28, 0, Math.PI * 2);
    ctx.arc(r * 0.7, -r * 0.28, r * 0.28, 0, Math.PI * 2);
    ctx.arc(r * 0.7, r * 0.28, r * 0.28, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (id === 'fish') {
    ctx.fillStyle = toy.color;
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.85, r * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(r * 0.7, 0);
    ctx.lineTo(r * 1.2, -r * 0.45);
    ctx.lineTo(r * 1.2, r * 0.45);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = toy.color2;
    ctx.beginPath();
    ctx.moveTo(-r * 0.1, -r * 0.5);
    ctx.lineTo(r * 0.2, -r * 0.85);
    ctx.lineTo(r * 0.35, -r * 0.4);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(-r * 0.4, -r * 0.1, r * 0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(-r * 0.38, -r * 0.1, r * 0.08, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // sock
    ctx.fillStyle = toy.color;
    roundRect(ctx, -r * 0.35, -r * 0.85, r * 0.7, r * 1.1, 10);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(r * 0.15, r * 0.4, r * 0.7, r * 0.4, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = toy.color2;
    ctx.fillRect(-r * 0.35, -r * 0.85, r * 0.7, r * 0.25);
  }

  ctx.restore();
}

// ---- Room furniture ----

function drawRoomBg(ctx, room) {
  // Wall
  const wall = ctx.createLinearGradient(0, 0, 0, H * 0.55);
  wall.addColorStop(0, room.wall);
  wall.addColorStop(1, shade(room.wall, -12));
  ctx.fillStyle = wall;
  ctx.fillRect(0, 0, W, H);

  // Floor
  ctx.fillStyle = room.floor;
  ctx.beginPath();
  ctx.moveTo(0, H * 0.52);
  ctx.lineTo(W, H * 0.52);
  ctx.lineTo(W, H);
  ctx.lineTo(0, H);
  ctx.closePath();
  ctx.fill();

  // Floor planks
  ctx.strokeStyle = 'rgba(0,0,0,0.06)';
  ctx.lineWidth = 1;
  for (let y = H * 0.52; y < H; y += 22) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }

  // Soft window light
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.beginPath();
  ctx.ellipse(W * 0.75, H * 0.18, 70, 50, 0, 0, Math.PI * 2);
  ctx.fill();

  // Room-specific furniture (behind toys)
  const id = room.id;
  if (id === 'bedroom') drawBedroom(ctx, room);
  else if (id === 'kitchen') drawKitchen(ctx, room);
  else if (id === 'living') drawLiving(ctx, room);
  else if (id === 'playground') drawPlayground(ctx, room);
  else if (id === 'bathroom') drawBathroom(ctx, room);
  else drawGarden(ctx, room);
}

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) + amt, g = ((n >> 8) & 255) + amt, b = (n & 255) + amt;
  r = Math.max(0, Math.min(255, r));
  g = Math.max(0, Math.min(255, g));
  b = Math.max(0, Math.min(255, b));
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

function drawBedroom(ctx, room) {
  // Bed
  ctx.fillStyle = '#8D6E63';
  roundRect(ctx, 30, 280, 200, 90, 10);
  ctx.fill();
  ctx.fillStyle = room.accent;
  roundRect(ctx, 40, 250, 180, 50, 10);
  ctx.fill();
  ctx.fillStyle = '#F8BBD0';
  roundRect(ctx, 50, 255, 50, 35, 8);
  ctx.fill();
  // Nightstand
  ctx.fillStyle = '#A1887F';
  roundRect(ctx, 250, 300, 60, 70, 6);
  ctx.fill();
  ctx.fillStyle = '#FFF59D';
  ctx.beginPath();
  ctx.arc(280, 290, 12, 0, Math.PI * 2);
  ctx.fill();
  // Wardrobe
  ctx.fillStyle = '#6D4C41';
  roundRect(ctx, 300, 180, 70, 200, 6);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.strokeRect(305, 190, 28, 180);
  ctx.strokeRect(337, 190, 28, 180);
  // Rug
  ctx.fillStyle = 'rgba(126, 87, 194, 0.35)';
  ctx.beginPath();
  ctx.ellipse(160, 430, 90, 35, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawKitchen(ctx, room) {
  // Counter
  ctx.fillStyle = '#ECEFF1';
  roundRect(ctx, 20, 260, 350, 40, 4);
  ctx.fill();
  ctx.fillStyle = '#90A4AE';
  roundRect(ctx, 20, 300, 350, 100, 4);
  ctx.fill();
  // Cabinets lines
  ctx.strokeStyle = 'rgba(0,0,0,0.1)';
  for (let x = 40; x < 360; x += 70) {
    ctx.strokeRect(x, 310, 60, 80);
  }
  // Fridge
  ctx.fillStyle = '#CFD8DC';
  roundRect(ctx, 40, 140, 80, 120, 8);
  ctx.fill();
  ctx.fillStyle = '#90A4AE';
  ctx.fillRect(48, 200, 64, 4);
  // Table
  ctx.fillStyle = '#A1887F';
  roundRect(ctx, 180, 380, 140, 18, 4);
  ctx.fill();
  ctx.fillRect(195, 398, 12, 50);
  ctx.fillRect(292, 398, 12, 50);
  // Sink circle
  ctx.fillStyle = '#B0BEC5';
  ctx.beginPath();
  ctx.ellipse(280, 280, 28, 14, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawLiving(ctx, room) {
  // Couch
  ctx.fillStyle = room.accent;
  roundRect(ctx, 40, 320, 220, 80, 16);
  ctx.fill();
  ctx.fillStyle = shade(room.accent, 20);
  roundRect(ctx, 50, 300, 50, 40, 10);
  ctx.fill();
  roundRect(ctx, 200, 300, 50, 40, 10);
  ctx.fill();
  // TV stand
  ctx.fillStyle = '#5D4037';
  roundRect(ctx, 280, 300, 90, 50, 4);
  ctx.fill();
  ctx.fillStyle = '#263238';
  roundRect(ctx, 290, 230, 70, 70, 4);
  ctx.fill();
  // Plant
  ctx.fillStyle = '#8D6E63';
  roundRect(ctx, 30, 400, 40, 40, 4);
  ctx.fill();
  ctx.fillStyle = '#66BB6A';
  ctx.beginPath();
  ctx.arc(50, 380, 28, 0, Math.PI * 2);
  ctx.fill();
  // Bookshelf
  ctx.fillStyle = '#6D4C41';
  roundRect(ctx, 300, 400, 70, 100, 4);
  ctx.fill();
  ctx.fillStyle = '#EF5350';
  ctx.fillRect(310, 415, 18, 30);
  ctx.fillStyle = '#42A5F5';
  ctx.fillRect(332, 420, 18, 25);
  ctx.fillStyle = '#FFEE58';
  ctx.fillRect(348, 418, 14, 28);
}

function drawPlayground(ctx, room) {
  // Sky-ish already from wall; grass floor
  // Tree
  ctx.fillStyle = '#6D4C41';
  ctx.fillRect(60, 280, 24, 120);
  ctx.fillStyle = '#43A047';
  ctx.beginPath();
  ctx.arc(72, 260, 50, 0, Math.PI * 2);
  ctx.fill();
  // Slide
  ctx.fillStyle = '#FF7043';
  ctx.beginPath();
  ctx.moveTo(180, 250);
  ctx.lineTo(220, 250);
  ctx.lineTo(280, 400);
  ctx.lineTo(240, 410);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#FFA726';
  roundRect(ctx, 170, 230, 60, 30, 6);
  ctx.fill();
  // Sandbox
  ctx.fillStyle = '#FFE082';
  roundRect(ctx, 40, 430, 140, 70, 12);
  ctx.fill();
  ctx.strokeStyle = '#FFB300';
  ctx.lineWidth = 4;
  ctx.stroke();
  // Bench
  ctx.fillStyle = '#8D6E63';
  roundRect(ctx, 260, 420, 100, 16, 4);
  ctx.fill();
  ctx.fillRect(270, 436, 10, 30);
  ctx.fillRect(340, 436, 10, 30);
}

function drawBathroom(ctx, room) {
  // Tub
  ctx.fillStyle = '#ECEFF1';
  roundRect(ctx, 40, 340, 180, 90, 30);
  ctx.fill();
  ctx.fillStyle = '#B3E5FC';
  roundRect(ctx, 55, 355, 150, 55, 20);
  ctx.fill();
  // Sink
  ctx.fillStyle = '#CFD8DC';
  roundRect(ctx, 250, 280, 100, 50, 12);
  ctx.fill();
  ctx.fillStyle = '#90CAF9';
  ctx.beginPath();
  ctx.ellipse(300, 300, 28, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  // Mirror
  ctx.strokeStyle = '#90A4AE';
  ctx.lineWidth = 4;
  roundRect(ctx, 265, 180, 70, 90, 8);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  roundRect(ctx, 265, 180, 70, 90, 8);
  ctx.fill();
  // Towel
  ctx.fillStyle = room.accent;
  roundRect(ctx, 40, 200, 30, 90, 4);
  ctx.fill();
}

function drawGarden(ctx, room) {
  // Fence
  ctx.strokeStyle = '#8D6E63';
  ctx.lineWidth = 4;
  for (let x = 20; x < W; x += 28) {
    ctx.beginPath();
    ctx.moveTo(x, 220);
    ctx.lineTo(x, 300);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(10, 240);
  ctx.lineTo(W - 10, 240);
  ctx.moveTo(10, 280);
  ctx.lineTo(W - 10, 280);
  ctx.stroke();
  // Tree
  ctx.fillStyle = '#5D4037';
  ctx.fillRect(280, 300, 28, 100);
  ctx.fillStyle = '#2E7D32';
  ctx.beginPath();
  ctx.arc(294, 280, 55, 0, Math.PI * 2);
  ctx.fill();
  // Flower pots
  for (const [px, col] of [[60, '#EF5350'], [120, '#AB47BC'], [180, '#FFEE58']]) {
    ctx.fillStyle = '#A1887F';
    roundRect(ctx, px, 400, 40, 36, 4);
    ctx.fill();
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(px + 20, 390, 16, 0, Math.PI * 2);
    ctx.fill();
  }
  // Path
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  roundRect(ctx, 150, 450, 90, 80, 20);
  ctx.fill();
}

function drawHides(ctx) {
  // Draw unfound first (partly covered), found with pop
  const ordered = hides.slice().sort((a, b) => (a.found ? 1 : 0) - (b.found ? 1 : 0));
  for (const h of ordered) {
    const bobY = h.found ? 0 : Math.sin(h.bob) * 2;
    const popScale = h.pop > 0 ? 1 + Math.sin((1 - h.pop / 0.45) * Math.PI) * 0.35 : 1;
    const scale = (h.found ? 1.05 : 0.95) * popScale;

    // Soft shadow
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.beginPath();
    ctx.ellipse(h.x, h.y + h.r * 0.55 + bobY, h.r * 0.7, h.r * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();

    // When hidden, slightly dim + optional "peek" under furniture feel via clip
    if (!h.found) {
      ctx.save();
      ctx.globalAlpha = 0.55 + (1 - h.cover) * 0.35;
      // Partial occlusion: draw a soft "under furniture" mask strip
      drawToySprite(ctx, h.toy, h.x, h.y + bobY, h.r, scale);
      // Cover overlay (furniture shadow)
      if (h.cover > 0.2) {
        ctx.globalAlpha = h.cover * 0.45;
        ctx.fillStyle = shade(currentRoom().floor, -20);
        ctx.beginPath();
        ctx.ellipse(h.x + 4, h.y + h.r * 0.4 + bobY, h.r * 0.95, h.r * 0.55, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // Warm / hint spark
      if (h.spark > 0 || (hintTimer > HINT_AFTER && hides.find(x => !x.found) === h)) {
        const pulse = 0.35 + 0.35 * Math.sin(hintTimer * 5);
        ctx.save();
        ctx.globalAlpha = h.spark > 0 ? h.spark : pulse;
        ctx.strokeStyle = '#FFF59D';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(h.x, h.y + bobY, h.r + 10 + Math.sin(hintTimer * 4) * 3, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    } else {
      drawToySprite(ctx, h.toy, h.x, h.y + bobY - 6, h.r, scale);
      // Check mark
      ctx.strokeStyle = '#66BB6A';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(h.x - 8, h.y - h.r - 8);
      ctx.lineTo(h.x - 2, h.y - h.r);
      ctx.lineTo(h.x + 12, h.y - h.r - 14);
      ctx.stroke();
    }
  }
}

function drawHud(ctx) {
  const room = currentRoom();
  const m = currentMode();

  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  roundRect(ctx, 14, 12, W - 28, 58, 14);
  ctx.fill();

  ctx.font = 'bold 17px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(room.name, W / 2, 30);

  ctx.font = '13px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  const progress = foundThisRoom + ' / ' + needThisRoom + ' found';
  if (m.rooms) {
    ctx.fillText('Room ' + (roomNum + 1) + ' / ' + roomsTarget + ' · ' + progress, W / 2, 50);
  } else {
    ctx.fillText(progress + ' · Free Play', W / 2, 50);
  }

  // Found tray chips
  const trayY = H - 52;
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  roundRect(ctx, 14, trayY - 8, W - 28, 48, 12);
  ctx.fill();
  const chipW = (W - 48) / Math.max(1, hides.length);
  hides.forEach((h, i) => {
    const cx = 28 + chipW * i + chipW / 2;
    const cy = trayY + 14;
    if (h.found) {
      drawToySprite(ctx, h.toy, cx, cy, 14, 0.9);
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.beginPath();
      ctx.arc(cx, cy, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.font = 'bold 14px "Segoe UI", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('?', cx, cy + 1);
    }
  });
}

function drawPlay(ctx) {
  drawRoomBg(ctx, currentRoom());
  drawHides(ctx);
  drawParticles(ctx);
  drawHud(ctx);

  if (missFlash > 0) {
    ctx.fillStyle = 'rgba(255,255,255,' + (0.08 * (missFlash / 0.25)) + ')';
    ctx.fillRect(0, 0, W, H);
  }

  ctx.font = '14px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = 'rgba(40,30,50,0.55)';
  ctx.textAlign = 'center';
  // tip sits above tray
  ctx.fillText('Tap the hidden toys!', W / 2, H - 70);
}

function drawWinScene(ctx) {
  drawRoomBg(ctx, currentRoom());
  drawHides(ctx);
  drawParticles(ctx);
  if (winFlash > 0) {
    ctx.fillStyle = 'rgba(255,255,255,' + (0.14 * Math.min(1, winFlash)) + ')';
    ctx.fillRect(0, 0, W, H);
  }
}

function drawMenuBackdrop(ctx) {
  const room = ROOMS[Math.floor(roomPhase * 0.15) % ROOMS.length];
  drawRoomBg(ctx, room);
  // Decorative toys
  const demo = TOYS.slice(0, 4);
  demo.forEach((t, i) => {
    drawToySprite(ctx, t, 70 + i * 80, 320 + Math.sin(roomPhase + i) * 6, 26, 1);
  });
  ctx.fillStyle = 'rgba(30, 20, 45, 0.45)';
  ctx.fillRect(0, 0, W, H);
}
