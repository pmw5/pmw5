import * as THREE from "https://unpkg.com/three@0.161.0/build/three.module.js";

const LEVELS = [
  { hedges: 3, hedgeDistance: 75, points: 100, optOut: false, optOutPoints: 0 },
  { hedges: 3, hedgeDistance: 100, points: 140, optOut: true, optOutPoints: 60 },
  { hedges: 5, hedgeDistance: 125, points: 180, optOut: true, optOutPoints: 80 },
];

const EYE_HEIGHT = 1.7;
const START_POS = { x: 0, z: 50 };
const HEDGE_SIZE_X = 11;
const HEDGE_SIZE_Z = 17;
const HEDGE_HEIGHT = 3.2;
const HEDGE_WALK_GAP = 2.6;
const MOVE_SPEED = 12.0;
const TURN_SPEED = 2.8;
const ARRIVE_DIST = 0.9;
const MAX_TAP_DISTANCE = 52;
const START_VIEW_PITCH = -0.11;
const ROUND_TIMEOUT_SECONDS = 15;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const SKY_COLOR = 0x9fd4f1;

const scene = new THREE.Scene();
scene.background = new THREE.Color(SKY_COLOR);
scene.fog = new THREE.Fog(SKY_COLOR, 130, 360);

const camera = new THREE.PerspectiveCamera(66, window.innerWidth / window.innerHeight, 0.05, 600);

scene.add(new THREE.HemisphereLight(0xffffff, 0x30583b, 0.95));
const sun = new THREE.DirectionalLight(0xfff8de, 1.05);
sun.position.set(-35, 60, 25);
scene.add(sun);

const hudLevel = document.getElementById("levelValue");
const hudScore = document.getElementById("scoreValue");
const hudLives = document.getElementById("livesValue");
const hudTimer = document.getElementById("timerValue");
const banner = document.getElementById("banner");
const feedbackFlash = document.getElementById("feedbackFlash");
const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlayTitle");
const overlayText = document.getElementById("overlayText");
const overlayButton = document.getElementById("overlayButton");
const overlayScoreLabel = document.getElementById("overlayScoreLabel");
const overlayScore = document.getElementById("overlayScore");

const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();
const clock = new THREE.Clock();

let groundMesh;
let grassTexture;
let hedgeTexture;
let lives = 3;
let score = 0;
let levelIndex = 0;
let roundActive = false;
let roundObjects = [];
let hedgeZones = [];
let grapeZoneIndex = -1;
let previousGrapeZoneIndex = -1;
let cornZones = [];
let lastRoundSuccess = false;
let bannerTimer = null;
let feedbackFlashTimer = null;
let roundDeadline = 0;
let gameOver = false;

const player = {
  pos: new THREE.Vector3(START_POS.x, 0, START_POS.z),
  yaw: 0,
  pitch: START_VIEW_PITCH,
  targetPos: null,
  targetYaw: 0,
  speed: MOVE_SPEED,
  turnSpeed: TURN_SPEED,
  arriveDist: ARRIVE_DIST,
};

function makeGrassTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext("2d");

  // Flat base keeps the tile edges consistent (no directional seam).
  ctx.fillStyle = "#356a37";
  ctx.fillRect(0, 0, 1024, 1024);

  for (let i = 0; i < 18000; i++) {
    const x = Math.random() * 1024;
    const y = Math.random() * 1024;
    const len = 3 + Math.random() * 8;
    const hue = 92 + Math.random() * 32;
    const sat = 34 + Math.random() * 36;
    const light = 14 + Math.random() * 20;
    ctx.strokeStyle = `hsla(${hue}, ${sat}%, ${light}%, 0.52)`;
    ctx.lineWidth = 0.7 + Math.random() * 1.2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (Math.random() - 0.5) * 4, y - len);
    ctx.stroke();
  }

  for (let i = 0; i < 2600; i++) {
    const x = Math.random() * 1024;
    const y = Math.random() * 1024;
    const r = 6 + Math.random() * 18;
    ctx.fillStyle = `hsla(${85 + Math.random() * 24}, ${28 + Math.random() * 30}%, ${10 + Math.random() * 14}%, 0.18)`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(16, 16);
  tex.anisotropy = 8;
  return tex;
}

function makeHedgeTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#1f4f2a";
  ctx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 9000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const radius = 0.6 + Math.random() * 2.2;
    const hue = 105 + Math.random() * 18;
    const sat = 30 + Math.random() * 30;
    const light = 12 + Math.random() * 18;
    ctx.fillStyle = `hsla(${hue}, ${sat}%, ${light}%, 0.5)`;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2.6, 1.6);
  tex.anisotropy = 8;
  return tex;
}

function updateHud() {
  hudLevel.textContent = String(levelIndex + 1);
  hudScore.textContent = String(score);
  const hearts = hudLives.querySelectorAll(".life");
  hearts.forEach((heart, index) => {
    heart.classList.toggle("lost", index >= lives);
  });
  hudLives.setAttribute("aria-label", `${lives} lives remaining`);
}

function updateTimerHud() {
  if (!roundActive) {
    hudTimer.textContent = String(ROUND_TIMEOUT_SECONDS);
    return;
  }

  const secondsRemaining = Math.max(0, Math.ceil((roundDeadline - performance.now()) / 1000));
  hudTimer.textContent = String(secondsRemaining);
}

function showBanner(text, ms = 1800) {
  if (bannerTimer) {
    clearTimeout(bannerTimer);
    bannerTimer = null;
  }
  banner.textContent = text;
  banner.classList.add("is-visible");
  bannerTimer = setTimeout(() => {
    banner.classList.remove("is-visible");
  }, ms);
}

function showOverlay(title, text, buttonLabel) {
  overlayTitle.textContent = title;
  overlayText.textContent = text;
  overlayButton.textContent = buttonLabel;
  overlay.classList.add("is-open");
}

function resetOverlayState() {
  gameOver = false;
  overlayScoreLabel.textContent = "";
  overlayScore.textContent = "";
  overlayScoreLabel.classList.add("hidden");
  overlayScore.classList.add("hidden");
}

function flashFeedback(type, ms = 180) {
  if (!feedbackFlash) {
    return;
  }

  if (feedbackFlashTimer) {
    clearTimeout(feedbackFlashTimer);
    feedbackFlashTimer = null;
  }

  feedbackFlash.classList.remove("correct", "wrong", "is-visible");
  void feedbackFlash.offsetWidth;
  feedbackFlash.classList.add(type, "is-visible");

  feedbackFlashTimer = setTimeout(() => {
    feedbackFlash.classList.remove("is-visible", "correct", "wrong");
  }, ms);
}

function hideOverlay() {
  overlay.classList.remove("is-open");
}

function groundHeight(x, z) {
  const hillT = THREE.MathUtils.clamp((z - 5) / (START_POS.z - 5), 0, 1);
  const slope = hillT * 30.0;
  const undulation = Math.sin(x * 0.045) * 0.7 + Math.cos(z * 0.04) * 0.6;
  return slope + undulation * 0.35;
}

function createGround() {
  grassTexture = makeGrassTexture();

  const geo = new THREE.PlaneGeometry(520, 520, 180, 180);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    pos.setY(i, groundHeight(x, z));
  }

  pos.needsUpdate = true;
  geo.computeVertexNormals();

  const mat = new THREE.MeshStandardMaterial({
    map: grassTexture,
    color: 0xffffff,
    roughness: 0.98,
    metalness: 0.0,
  });

  groundMesh = new THREE.Mesh(geo, mat);
  scene.add(groundMesh);
}

function addTree(x, z, scale = 1) {
  const group = new THREE.Group();

  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.75 * scale, 0.95 * scale, 9.5 * scale, 10),
    new THREE.MeshStandardMaterial({ color: 0x6b4a2f, roughness: 0.95, metalness: 0.0 })
  );
  trunk.position.y = 4.75 * scale;
  group.add(trunk);

  const leafMat = new THREE.MeshStandardMaterial({ color: 0x2f6b35, roughness: 0.9, metalness: 0.0 });
  const c1 = new THREE.Mesh(new THREE.SphereGeometry(4.8 * scale, 10, 10), leafMat);
  const c2 = new THREE.Mesh(new THREE.SphereGeometry(4.0 * scale, 10, 10), leafMat);
  const c3 = new THREE.Mesh(new THREE.SphereGeometry(3.5 * scale, 10, 10), leafMat);
  c1.position.set(0, 10.6 * scale, 0);
  c2.position.set(2.3 * scale, 9.6 * scale, -1.4 * scale);
  c3.position.set(-2.4 * scale, 9.3 * scale, 1.1 * scale);
  group.add(c1, c2, c3);

  group.position.set(x, groundHeight(x, z), z);
  scene.add(group);
}

function addBackgroundTrees() {
  const treeLayout = [
    [-170, -120, 1.55],
    [-130, -150, 1.15],
    [-85, -110, 0.95],
    [160, -145, 1.4],
    [118, -172, 1.0],
    [95, -120, 0.9],
    [-210, -190, 1.2],
    [205, -200, 1.25],
    [12, -220, 1.45],
  ];
  treeLayout.forEach((t) => addTree(t[0], t[1], t[2]));
}

function buildHedgeSquare(x, z, sizeX, sizeZ, height, rotationY) {
  if (!hedgeTexture) {
    hedgeTexture = makeHedgeTexture();
  }

  const wallT = 1.0;
  const mat = new THREE.MeshStandardMaterial({
    map: hedgeTexture,
    color: 0xffffff,
    roughness: 0.86,
    metalness: 0.0,
  });
  const group = new THREE.Group();

  const createWall = (lx, lz, w, d) => {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(w, height, d), mat);
    wall.position.set(lx, 0, lz);
    group.add(wall);
  };

  createWall(0, -sizeZ / 2, sizeX + wallT, wallT);
  createWall(0, sizeZ / 2, sizeX + wallT, wallT);
  createWall(-sizeX / 2, 0, wallT, sizeZ + wallT);
  createWall(sizeX / 2, 0, wallT, sizeZ + wallT);

  const y = groundHeight(x, z) + height / 2;
  group.position.set(x, y, z);
  group.rotation.y = rotationY;

  scene.add(group);
  roundObjects.push(group);

  return {
    x,
    z,
    halfX: sizeX * 0.46,
    halfZ: sizeZ * 0.46,
    rotationY,
    material: mat,
  };
}

function makeGrapeCluster(x, z) {
  const group = new THREE.Group();
  const grapeMat = new THREE.MeshStandardMaterial({ color: 0x6e2ea7, roughness: 0.55, metalness: 0.05 });
  const berry = new THREE.SphereGeometry(0.45, 16, 16);
  const offsets = [
    [0, 0, 0],
    [0.42, 0.15, 0.08],
    [-0.42, 0.15, -0.08],
    [0.16, -0.3, 0.25],
    [-0.14, -0.35, -0.24],
    [0.0, -0.55, 0.04],
  ];

  offsets.forEach((o) => {
    const b = new THREE.Mesh(berry, grapeMat);
    b.position.set(o[0], o[1], o[2]);
    group.add(b);
  });

  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.08, 0.55, 10),
    new THREE.MeshStandardMaterial({ color: 0x4f8e30, roughness: 0.9, metalness: 0.0 })
  );
  stem.position.set(0, 0.75, 0);
  group.add(stem);

  group.position.set(x, groundHeight(x, z) + 1.0, z);
  scene.add(group);
  roundObjects.push(group);
}

function makeGrapeMarkers(zone) {
  const maxX = zone.halfX - 1.6;
  const maxZ = zone.halfZ - 1.7;
  const minSpacing = 1.25;
  const targetCount = 40;
  const points = [];
  let attempts = 0;

  while (points.length < targetCount && attempts < 900) {
    attempts += 1;
    const lx = (Math.random() * 2 - 1) * maxX;
    const lz = (Math.random() * 2 - 1) * maxZ;

    let tooClose = false;
    for (let i = 0; i < points.length; i++) {
      const dx = lx - points[i].x;
      const dz = lz - points[i].z;
      if (dx * dx + dz * dz < minSpacing * minSpacing) {
        tooClose = true;
        break;
      }
    }
    if (tooClose) {
      continue;
    }

    points.push({ x: lx, z: lz });
  }

  const cos = Math.cos(zone.rotationY);
  const sin = Math.sin(zone.rotationY);
  points.forEach((p) => {
    const worldX = zone.x + p.x * cos + p.z * sin;
    const worldZ = zone.z - p.x * sin + p.z * cos;
    makeGrapeCluster(worldX, worldZ);
  });
}

function makeCornReward(x, z, rotationY) {
  const group = new THREE.Group();

  const cornMat = new THREE.MeshStandardMaterial({ color: 0xffd84a, roughness: 0.58, metalness: 0.0 });

  const createCob = (ox, oz, scale = 1) => {
    const cob = new THREE.Mesh(new THREE.CylinderGeometry(0.8 * scale, 0.92 * scale, 2.5 * scale, 16), cornMat);
    cob.rotation.y = 0.22;
    cob.position.set(ox, 2.2 * scale, oz);
    group.add(cob);

    const rings = 7;
    const kernelCount = 15;
    for (let r = -Math.floor(rings / 2); r <= Math.floor(rings / 2); r++) {
      const yPos = 2.2 * scale + r * 0.44 * scale;
      for (let i = 0; i < kernelCount; i++) {
        const a = (i / kernelCount) * Math.PI * 2 + (r % 2) * 0.16;
        const kx = ox + Math.cos(a) * 0.9 * scale;
        const kz = oz + Math.sin(a) * 0.9 * scale;
        const kernel = new THREE.Mesh(new THREE.SphereGeometry(0.25 * scale, 8, 8), cornMat);
        kernel.position.set(kx, yPos, kz);
        group.add(kernel);
      }
    }
  };

  createCob(-2.15, 0.45, 1.0);
  createCob(0, 0, 1.0);
  createCob(2.15, -0.45, 1.0);

  group.position.set(x, groundHeight(x, z), z);
  group.rotation.y = rotationY;
  scene.add(group);
  roundObjects.push(group);

  return {
    x,
    z,
    radius: 6.2,
  };
}

function clearRoundObjects() {
  roundObjects.forEach((obj) => scene.remove(obj));
  roundObjects = [];
  hedgeZones = [];
  cornZones = [];
  grapeZoneIndex = -1;
}

function setPlayerAtStart(lookAtX, lookAtZ) {
  player.pos.x = START_POS.x;
  player.pos.z = START_POS.z;
  player.pos.y = groundHeight(START_POS.x, START_POS.z) + EYE_HEIGHT;
  player.targetPos = null;
  player.pitch = START_VIEW_PITCH;

  const dx = lookAtX - player.pos.x;
  const dz = lookAtZ - player.pos.z;
  player.yaw = Math.atan2(-dx, -dz);
  player.targetYaw = player.yaw;
}

function pointOnArc(distance, angle) {
  return {
    x: START_POS.x + Math.sin(angle) * distance,
    z: START_POS.z - Math.cos(angle) * distance,
  };
}

function startRound() {
  clearRoundObjects();

  const level = LEVELS[levelIndex];
  const centerSpacing = HEDGE_SIZE_X + HEDGE_WALK_GAP;
  const step = level.hedges > 1 ? centerSpacing / level.hedgeDistance : 0;
  const totalArc = step * Math.max(0, level.hedges - 1);
  const angleStart = -totalArc / 2;
  const midPoint = pointOnArc(level.hedgeDistance, 0);

  for (let i = 0; i < level.hedges; i++) {
    const angle = angleStart + i * step;
    const pos = pointOnArc(level.hedgeDistance, angle);
    const faceStartYaw = Math.atan2(START_POS.x - pos.x, START_POS.z - pos.z);
    const zone = buildHedgeSquare(pos.x, pos.z, HEDGE_SIZE_X, HEDGE_SIZE_Z, HEDGE_HEIGHT, faceStartYaw);
    hedgeZones.push(zone);
  }

  grapeZoneIndex = Math.floor(Math.random() * hedgeZones.length);
  if (hedgeZones.length > 1 && grapeZoneIndex === previousGrapeZoneIndex) {
    grapeZoneIndex = (grapeZoneIndex + 1 + Math.floor(Math.random() * (hedgeZones.length - 1))) % hedgeZones.length;
  }
  previousGrapeZoneIndex = grapeZoneIndex;
  const grapeZone = hedgeZones[grapeZoneIndex];
  makeGrapeMarkers(grapeZone);

  if (level.optOut) {
    const leftOuter = hedgeZones[0];
    const rightOuter = hedgeZones[hedgeZones.length - 1];
    const frontOffset = HEDGE_SIZE_Z * 0.5 + 2.6;
    const sideOffset = HEDGE_SIZE_X * 1 + 2.8;

    const leftForwardX = Math.sin(leftOuter.rotationY);
    const leftForwardZ = Math.cos(leftOuter.rotationY);
    const leftRightX = Math.cos(leftOuter.rotationY);
    const leftRightZ = -Math.sin(leftOuter.rotationY);
    const leftCornX = leftOuter.x + leftForwardX * frontOffset - leftRightX * sideOffset;
    const leftCornZ = leftOuter.z + leftForwardZ * frontOffset - leftRightZ * sideOffset;

    const rightForwardX = Math.sin(rightOuter.rotationY);
    const rightForwardZ = Math.cos(rightOuter.rotationY);
    const rightRightX = Math.cos(rightOuter.rotationY);
    const rightRightZ = -Math.sin(rightOuter.rotationY);
    const rightCornX = rightOuter.x + rightForwardX * frontOffset + rightRightX * sideOffset;
    const rightCornZ = rightOuter.z + rightForwardZ * frontOffset + rightRightZ * sideOffset;

    cornZones.push(makeCornReward(leftCornX, leftCornZ, leftOuter.rotationY));
    cornZones.push(makeCornReward(rightCornX, rightCornZ, rightOuter.rotationY));
  }

  setPlayerAtStart(midPoint.x, midPoint.z);
  roundActive = true;
  roundDeadline = performance.now() + ROUND_TIMEOUT_SECONDS * 1000;
  updateHud();
  updateTimerHud();
}

function setHedgeFeedback(index, correct) {
  const zone = hedgeZones[index];
  if (!zone) {
    return;
  }
  zone.material.color.set(correct ? 0x4ba74e : 0x9a3434);
}

function onRoundResolved(success) {
  roundActive = false;
  roundDeadline = 0;
  lastRoundSuccess = success;
  updateTimerHud();

  setTimeout(() => {
    if (lives <= 0) {
      showGameOverOverlay();
      return;
    }

    if (lastRoundSuccess && levelIndex < LEVELS.length - 1) {
      levelIndex += 1;
    }

    startRound();
  }, 1200);
}

function showGameOverOverlay() {
  gameOver = true;
  overlayButton.classList.remove("largeStart");
  showOverlay(
    "Game Over",
    "",
    "Go Back"
  );
  overlayScoreLabel.textContent = "Final Score";
  overlayScore.textContent = String(score);
  overlayScoreLabel.classList.remove("hidden");
  overlayScore.classList.remove("hidden");
}

function triggerInstantGameOver() {
  lives = 0;
  roundActive = false;
  roundDeadline = 0;
  updateHud();
  updateTimerHud();
  showGameOverOverlay();
}

function resolveTimeout() {
  if (!roundActive) {
    return;
  }

  lives = Math.max(0, lives - 1);
  setHedgeFeedback(grapeZoneIndex, true);
  flashFeedback("wrong");
  updateHud();
  onRoundResolved(false);
}

function resolveHedgeChoice(index) {
  if (!roundActive) {
    return;
  }

  if (index === grapeZoneIndex) {
    const points = LEVELS[levelIndex].points;
    score += points;
    setHedgeFeedback(index, true);
    flashFeedback("correct");
    updateHud();
    onRoundResolved(true);
    return;
  }

  lives = Math.max(0, lives - 1);
  setHedgeFeedback(index, false);
  setHedgeFeedback(grapeZoneIndex, true);
  flashFeedback("wrong");
  updateHud();
  onRoundResolved(false);
}

function resolveCornChoice() {
  if (!roundActive || cornZones.length === 0) {
    return;
  }

  const points = LEVELS[levelIndex].optOutPoints;
  score += points;
  showBanner(`Safe corn taken. +${points} points.`, 1700);
  updateHud();
  onRoundResolved(true);
}

function angleDelta(a, b) {
  let d = (b - a + Math.PI) % (2 * Math.PI) - Math.PI;
  if (d < -Math.PI) {
    d += 2 * Math.PI;
  }
  return d;
}

function clampToField(p) {
  const lim = 245;
  p.x = Math.max(-lim, Math.min(lim, p.x));
  p.z = Math.max(-lim, Math.min(lim, p.z));
  return p;
}

function pickGround(clientX, clientY) {
  const rect = renderer.domElement.getBoundingClientRect();
  ndc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
  ndc.y = -(((clientY - rect.top) / rect.height) * 2 - 1);

  raycaster.setFromCamera(ndc, camera);
  const hits = raycaster.intersectObject(groundMesh, false);

  if (!hits.length) {
    return null;
  }

  return hits[0].point.clone();
}

function setMoveTarget(pointOnGround) {
  const dest = clampToField(pointOnGround.clone());
  const move = dest.clone().sub(player.pos);
  move.y = 0;

  if (move.length() > MAX_TAP_DISTANCE) {
    move.setLength(MAX_TAP_DISTANCE);
    dest.x = player.pos.x + move.x;
    dest.z = player.pos.z + move.z;
  }

  player.targetPos = dest;

  const dx = dest.x - player.pos.x;
  const dz = dest.z - player.pos.z;
  player.targetYaw = Math.atan2(-dx, -dz);
}

function onPointerDown(e) {
  if (overlay.classList.contains("is-open") || !roundActive) {
    return;
  }

  e.preventDefault();
  const p = pickGround(e.clientX, e.clientY);
  if (!p) {
    return;
  }

  setMoveTarget(p);
}

function checkSelections() {
  if (!roundActive) {
    return;
  }

  for (let i = 0; i < hedgeZones.length; i++) {
    const zone = hedgeZones[i];
    const dx = player.pos.x - zone.x;
    const dz = player.pos.z - zone.z;
    const cos = Math.cos(zone.rotationY);
    const sin = Math.sin(zone.rotationY);
    const localX = dx * cos + dz * sin;
    const localZ = -dx * sin + dz * cos;
    if (Math.abs(localX) <= zone.halfX && Math.abs(localZ) <= zone.halfZ) {
      resolveHedgeChoice(i);
      return;
    }
  }

  if (cornZones.length > 0) {
    for (let i = 0; i < cornZones.length; i++) {
      const zone = cornZones[i];
      const dx = player.pos.x - zone.x;
      const dz = player.pos.z - zone.z;
      if (Math.sqrt(dx * dx + dz * dz) <= zone.radius) {
        resolveCornChoice();
        return;
      }
    }
  }
}

function updatePlayer(dt) {
  camera.position.copy(player.pos);
  camera.rotation.set(player.pitch, player.yaw, 0, "YXZ");

  if (player.targetPos) {
    const dYaw = angleDelta(player.yaw, player.targetYaw);
    const maxTurn = player.turnSpeed * dt;

    if (Math.abs(dYaw) > 0.03) {
      player.yaw += Math.max(-maxTurn, Math.min(maxTurn, dYaw));
    } else {
      const to = new THREE.Vector3(
        player.targetPos.x - player.pos.x,
        0,
        player.targetPos.z - player.pos.z
      );

      const dist = to.length();
      if (dist <= player.arriveDist) {
        player.targetPos = null;
      } else {
        to.normalize();
        const step = Math.min(dist, player.speed * dt);
        player.pos.x += to.x * step;
        player.pos.z += to.z * step;
      }
    }
  }

  clampToField(player.pos);

  const targetY = groundHeight(player.pos.x, player.pos.z) + EYE_HEIGHT;
  const yLerp = Math.min(1, dt * 7);
  player.pos.y += (targetY - player.pos.y) * yLerp;
}

function render() {
  const dt = Math.min(clock.getDelta(), 0.05);
  updatePlayer(dt);
  updateTimerHud();

  if (roundActive && roundDeadline > 0 && performance.now() >= roundDeadline) {
    resolveTimeout();
  }

  checkSelections();
  renderer.render(scene, camera);
  requestAnimationFrame(render);
}

function resetGame() {
  lives = 3;
  score = 0;
  levelIndex = 0;
  roundActive = false;
  roundDeadline = 0;
  previousGrapeZoneIndex = -1;
  resetOverlayState();
  clearRoundObjects();
  updateHud();
  updateTimerHud();
  hideOverlay();
  overlayTitle.textContent = "";
  overlayText.textContent = "";
  overlayButton.textContent = "Start Game";
  overlayButton.classList.add("largeStart");
  startRound();
}

overlayButton.addEventListener("click", () => {
  if (gameOver) {
    window.parent.postMessage({ type: "CLOSE_IFRAME_MODAL" }, "*");
    return;
  }
  resetGame();
});

renderer.domElement.addEventListener("pointerdown", onPointerDown, { passive: false });
window.addEventListener("contextmenu", (e) => e.preventDefault());

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

window.addEventListener("keydown", (event) => {
  if (event.shiftKey && event.key.toLowerCase() === "g") {
    event.preventDefault();
    triggerInstantGameOver();
  }
});

createGround();
addBackgroundTrees();
resetOverlayState();
updateHud();
updateTimerHud();
setPlayerAtStart(0, 0);
overlayTitle.textContent = "";
overlayText.textContent = "";
overlayButton.textContent = "Start Game";
overlayButton.classList.add("largeStart");
render();

