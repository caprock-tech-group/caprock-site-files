import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import * as CANNON from 'https://cdn.jsdelivr.net/npm/cannon-es@0.20.0/dist/cannon-es.js';
import { CONFIG } from './config.js';

const canvas = document.getElementById('c');
const overlay = document.getElementById('overlay');
const scoreEl = document.getElementById('score');
const timeEl = document.getElementById('time');
const boostFill = document.getElementById('boostFill');
const boostText = document.getElementById('boostText');

let paused = true;
let lastT = performance.now() / 1000;

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const v3 = (x=0,y=0,z=0)=> new THREE.Vector3(x,y,z);
const now = ()=> performance.now()/1000;

function formatTime(sec){
  sec = Math.max(0, Math.floor(sec));
  const m = Math.floor(sec/60);
  const s = sec%60;
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

/* -------------------- THREE (render) -------------------- */
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
renderer.setSize(window.innerWidth, window.innerHeight);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x0b0f1a, 80, 220);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth/window.innerHeight, 0.1, 600);
camera.position.set(0, 42, 72);


const hemi = new THREE.HemisphereLight(0xaab7ff, 0x101629, 0.9);
scene.add(hemi);

const dir = new THREE.DirectionalLight(0xffffff, 0.9);
dir.position.set(40, 80, 30);
dir.castShadow = false;
scene.add(dir);

// Floor material
const floorMat = new THREE.MeshStandardMaterial({ color: 0x0f1733, roughness: 0.95, metalness: 0.05 });
const lineMat = new THREE.MeshBasicMaterial({ color: 0x2d3b7a, transparent: true, opacity: 0.75 });

/* -------------------- CANNON (physics) -------------------- */
const world = new CANNON.World({
  gravity: new CANNON.Vec3(0, CONFIG.physics.gravity, 0),
});
world.broadphase = new CANNON.SAPBroadphase(world);
world.allowSleep = true;

const defaultMat = new CANNON.Material('default');
const floorPhysMat = new CANNON.Material('floor');
const contactFloor = new CANNON.ContactMaterial(defaultMat, floorPhysMat, {
  friction: CONFIG.arena.floorFriction,
  restitution: 0.0,
});
world.addContactMaterial(contactFloor);

function addStaticBox({ size, pos, quat, mat=defaultMat, restitution=0.2 }){
  const shape = new CANNON.Box(new CANNON.Vec3(size.x/2, size.y/2, size.z/2));
  const body = new CANNON.Body({ mass: 0, shape, material: mat });
  body.position.set(pos.x, pos.y, pos.z);
  if (quat) body.quaternion.set(quat.x, quat.y, quat.z, quat.w);
  body.linearDamping = 0.0;
  body.angularDamping = 0.0;
  body.collisionResponse = true;
  body._restitution = restitution;
  world.addBody(body);
  return body;
}

/* -------------------- Arena -------------------- */
const A = CONFIG.arena;
const halfL = A.length/2;
const halfW = A.width/2;

// Render floor
const floorGeo = new THREE.PlaneGeometry(A.width, A.length);
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.rotation.x = -Math.PI/2;
scene.add(floor);

// Field lines (simple)
{
  const g = new THREE.PlaneGeometry(A.width, 0.25);
  const mid = new THREE.Mesh(g, lineMat);
  mid.rotation.x = -Math.PI/2;
  mid.position.y = 0.01;
  scene.add(mid);

  const circle = new THREE.RingGeometry(7.5, 7.7, 64);
  const ring = new THREE.Mesh(circle, lineMat);
  ring.rotation.x = -Math.PI/2;
  ring.position.y = 0.02;
  scene.add(ring);
}

// Physics floor
{
  const shape = new CANNON.Plane();
  const body = new CANNON.Body({ mass: 0, material: floorPhysMat });
  body.addShape(shape);
  body.quaternion.setFromEuler(-Math.PI/2, 0, 0);
  world.addBody(body);
}

// Walls (physics + render)
const wallThickness = 2;
const wallY = A.wallHeight/2;

function makeWall(size, pos){
  addStaticBox({ size, pos: new THREE.Vector3(pos.x, pos.y, pos.z), mat: defaultMat, restitution: A.wallRestitution });
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(size.x, size.y, size.z),
    new THREE.MeshStandardMaterial({ color: 0x121b3d, roughness: 0.9, metalness: 0.05, transparent: true, opacity: 0.75 })
  );
  mesh.position.copy(pos);
  scene.add(mesh);
}

// Side walls
makeWall(new THREE.Vector3(wallThickness, A.wallHeight, A.length), new THREE.Vector3(halfW + wallThickness/2, wallY, 0));
makeWall(new THREE.Vector3(wallThickness, A.wallHeight, A.length), new THREE.Vector3(-halfW - wallThickness/2, wallY, 0));
// End walls (leave goal mouth open by building 3 segments each side of goal)
const mouth = A.goalWidth/2;
const endZ = halfL + wallThickness/2;
const segW = (A.width - A.goalWidth) / 2;

makeWall(new THREE.Vector3(segW, A.wallHeight, wallThickness), new THREE.Vector3( (mouth + segW/2), wallY,  endZ));
makeWall(new THREE.Vector3(segW, A.wallHeight, wallThickness), new THREE.Vector3(-(mouth + segW/2), wallY,  endZ));
makeWall(new THREE.Vector3(segW, A.wallHeight, wallThickness), new THREE.Vector3( (mouth + segW/2), wallY, -endZ));
makeWall(new THREE.Vector3(segW, A.wallHeight, wallThickness), new THREE.Vector3(-(mouth + segW/2), wallY, -endZ));

// Goal back walls
function makeGoal(zSign){
  const z = zSign * (halfL + A.goalDepth);
  // Back wall
  makeWall(new THREE.Vector3(A.goalWidth, A.goalHeight, wallThickness), new THREE.Vector3(0, A.goalHeight/2, z));
  // Side posts (goal depth sides)
  const sideX = A.goalWidth/2 + wallThickness/2;
  const depthZ = zSign * (halfL + A.goalDepth/2);
  makeWall(new THREE.Vector3(wallThickness, A.goalHeight, A.goalDepth), new THREE.Vector3( sideX, A.goalHeight/2, depthZ));
  makeWall(new THREE.Vector3(wallThickness, A.goalHeight, A.goalDepth), new THREE.Vector3(-sideX, A.goalHeight/2, depthZ));
  // Crossbar top (thin)
  makeWall(new THREE.Vector3(A.goalWidth, wallThickness, A.goalDepth), new THREE.Vector3(0, A.goalHeight + wallThickness/2, depthZ));
}
makeGoal(+1);
makeGoal(-1);

/* -------------------- Ball -------------------- */
const ballGeo = new THREE.SphereGeometry(CONFIG.ball.radius, 32, 22);
const ballMat = new THREE.MeshStandardMaterial({ color: 0xf2f3ff, roughness: 0.35, metalness: 0.05 });
const ballMesh = new THREE.Mesh(ballGeo, ballMat);
scene.add(ballMesh);

const ballBody = new CANNON.Body({
  mass: CONFIG.ball.mass,
  material: defaultMat,
  shape: new CANNON.Sphere(CONFIG.ball.radius),
});
ballBody.position.set(0, CONFIG.ball.radius + 0.2, 0);
ballBody.linearDamping = CONFIG.ball.linearDamping;
ballBody.angularDamping = CONFIG.ball.angularDamping;
world.addBody(ballBody);

// Ball-wall restitution via contact tweak
world.addEventListener('beginContact', (e) => {
  // cannon-es doesn't support per-contact restitution easily;
  // we emulate bounce by applying an impulse on collisions with static bodies.
  // (Keep it conservative to prevent jitter.)
});

/* -------------------- Car (player + bot) -------------------- */
function makeCar({ color=0x3bd6ff, startPos = new CANNON.Vec3(0, 2, -halfL/3), name='player' }){
  // Simple car proxy: sphere + slight top box for visuals
  const carMesh = new THREE.Group();

  const bodyMesh = new THREE.Mesh(
    new THREE.BoxGeometry(3.0, 1.0, 4.2),
    new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.12 })
  );
  bodyMesh.position.y = 0.9;
  carMesh.add(bodyMesh);

  const topper = new THREE.Mesh(
    new THREE.BoxGeometry(2.0, 0.7, 1.8),
    new THREE.MeshStandardMaterial({ color: 0x0b0f1a, roughness: 0.8, metalness: 0.05 })
  );
  topper.position.set(0, 1.35, -0.35);
  carMesh.add(topper);

  const glow = new THREE.Mesh(
    new THREE.RingGeometry(1.1, 1.25, 22),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.35, side: THREE.DoubleSide })
  );
  glow.rotation.x = -Math.PI/2;
  glow.position.y = 0.05;
  carMesh.add(glow);

  scene.add(carMesh);

  // Physics: sphere proxy (arcade)
  const body = new CANNON.Body({
    mass: CONFIG.car.mass,
    material: defaultMat,
    shape: new CANNON.Sphere(CONFIG.car.radius),
    angularDamping: 0.88,
    linearDamping: 0.15,
  });
  body.position.copy(startPos);
  world.addBody(body);

  return {
    name,
    mesh: carMesh,
    body,
    boost: CONFIG.car.maxBoost,
    canJump: false,
    jumpedAt: -999,
    lastGroundedAt: -999,
    aimingYaw: 0,
  };
}

const player = makeCar({ color: 0x3bd6ff, startPos: new CANNON.Vec3(0, 2, -halfL/3), name:'player' });
const bot = makeCar({ color: 0xff4d6d, startPos: new CANNON.Vec3(0, 2, +halfL/3), name:'bot' });

/* -------------------- Input -------------------- */
const keys = new Set();
window.addEventListener('keydown', (e) => {
  if (e.code === 'Enter') togglePause();
  keys.add(e.code);
});
window.addEventListener('keyup', (e) => keys.delete(e.code));

function pressed(code){ return keys.has(code); }

/* -------------------- Game State -------------------- */
let score = { blue: 0, red: 0 };
let matchTime = CONFIG.match.durationSec;
let kickoffLockUntil = now() + CONFIG.match.kickoffCountdownSec;

function resetPositions(kickoff=true){
  player.body.velocity.setZero();
  player.body.angularVelocity.setZero();
  player.body.position.set(0, 2, -halfL/3);
  player.body.quaternion.set(0,0,0,1);

  bot.body.velocity.setZero();
  bot.body.angularVelocity.setZero();
  bot.body.position.set(0, 2, +halfL/3);
  bot.body.quaternion.set(0,0,0,1);

  ballBody.velocity.setZero();
  ballBody.angularVelocity.setZero();
  ballBody.position.set(0, CONFIG.ball.radius+0.3, 0);

  player.boost = CONFIG.car.maxBoost;
  bot.boost = CONFIG.car.maxBoost * 0.75;

  if (kickoff) kickoffLockUntil = now() + CONFIG.match.kickoffCountdownSec;
}

function goalScored(team){ // team: 'blue' or 'red'
  if (team === 'blue') score.blue++;
  else score.red++;
  updateHUD();
  resetPositions(true);
}

function updateHUD(){
  scoreEl.textContent = `${score.blue} : ${score.red}`;
  timeEl.textContent = formatTime(matchTime);
  const b = clamp(player.boost, 0, CONFIG.car.maxBoost);
  boostText.textContent = String(Math.round(b));
  boostFill.style.width = `${(b/CONFIG.car.maxBoost)*100}%`;
}

updateHUD();

/* -------------------- Pause -------------------- */
function togglePause(){
  paused = !paused;
  overlay.classList.toggle('hidden', !paused);
  lastT = now();
}

/* -------------------- Camera follow -------------------- */
const camTarget = new THREE.Object3D();
scene.add(camTarget);

function updateCamera(dt){
  // Follow behind player based on its velocity direction (or forward fallback)
  const p = player.body.position;
  const v = player.body.velocity;

  const speed = v.length();
  let dir = new THREE.Vector3(v.x, 0, v.z);
  if (dir.lengthSq() < 0.01){
    dir = new THREE.Vector3(0, 0, 1);
  }
  dir.normalize();

  const behind = dir.clone().multiplyScalar(-18);
  const camPos = new THREE.Vector3(p.x, p.y, p.z).add(behind).add(new THREE.Vector3(0, 12, 0));

  camera.position.lerp(camPos, 1 - Math.pow(0.0005, dt*60));
  const lookAt = new THREE.Vector3(p.x, p.y + 2.5, p.z);
  camera.lookAt(lookAt);
}

/* -------------------- Helpers: ground check & wall clamp -------------------- */
function isGrounded(body){
  // Cheap ground check: y close to radius and moving downward slowly
  return body.position.y <= (CONFIG.car.radius + 0.15);
}

function keepInBounds(body){
  const p = body.position;
  const r = (body.shapes[0]?.radius) ?? 1.0;

  // X clamp vs side walls
  const maxX = halfW - r;
  if (p.x > maxX){ p.x = maxX; body.velocity.x *= -A.wallRestitution; }
  if (p.x < -maxX){ p.x = -maxX; body.velocity.x *= -A.wallRestitution; }

  // Z clamp vs end walls except goal mouth
  const maxZ = halfL - r;
  const inMouth = Math.abs(p.x) < (A.goalWidth/2 - r*0.4) && p.y < (A.goalHeight - 0.2);
  if (!inMouth){
    if (p.z > maxZ){ p.z = maxZ; body.velocity.z *= -A.wallRestitution; }
    if (p.z < -maxZ){ p.z = -maxZ; body.velocity.z *= -A.wallRestitution; }
  } else {
    // inside goal tunnel clamp to back wall
    const goalBackZ = halfL + A.goalDepth - r;
    if (p.z > goalBackZ){ p.z = goalBackZ; body.velocity.z *= -0.55; }
    if (p.z < -goalBackZ){ p.z = -goalBackZ; body.velocity.z *= -0.55; }
    // clamp sides in goal
    const goalSideX = A.goalWidth/2 - r;
    if (p.x > goalSideX){ p.x = goalSideX; body.velocity.x *= -0.55; }
    if (p.x < -goalSideX){ p.x = -goalSideX; body.velocity.x *= -0.55; }
  }

  // Ceiling soft limit
  if (p.y > A.ceiling){ p.y = A.ceiling; body.velocity.y *= -0.35; }
}

function limitSpeed(body, max){
  const v = body.velocity;
  const sp = v.length();
  if (sp > max){
    const scale = max / sp;
    body.velocity.set(v.x*scale, v.y*scale, v.z*scale);
  }
}

/* -------------------- Car control (arcade) -------------------- */
function driveCar(car, input, dt){
  const b = car.body;
  const grounded = isGrounded(b);
  if (grounded){
    car.lastGroundedAt = now();
    car.canJump = true;
    // stabilize on ground
    if (b.position.y < CONFIG.car.radius + CONFIG.car.groundSnap){
      b.position.y = CONFIG.car.radius;
      if (b.velocity.y < 0) b.velocity.y = 0;
    }
  }

  // Steering / throttle
  const forward = input.throttle; // -1..1
  const steer = input.steer;      // -1..1

  // Compute yaw facing from current velocity direction to keep it arcade and responsive
  const vel = b.velocity;
  const vel2 = new THREE.Vector3(vel.x, 0, vel.z);
  const speed = vel2.length();
  let yaw = car.aimingYaw;

  // Update aiming yaw
  if (grounded || speed > 1.0){
    // steer changes yaw over time
    const yawRate = (grounded ? CONFIG.car.turnRate : CONFIG.car.airTurnRate);
    yaw += steer * yawRate * dt;
    car.aimingYaw = yaw;
  }

  const fwdDir = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw)); // z-forward
  const rightDir = new THREE.Vector3(fwdDir.z, 0, -fwdDir.x);

  // Engine force
  let force = 0;
  if (forward > 0) force = CONFIG.car.engineForce * forward;
  if (forward < 0) force = CONFIG.car.reverseForce * forward;

  // Disable movement during kickoff lock
  const locked = now() < kickoffLockUntil;

  if (!locked){
    b.velocity.x += fwdDir.x * force * dt;
    b.velocity.z += fwdDir.z * force * dt;

    // Lateral grip (reduce sideways sliding)
    const lateral = vel2.dot(rightDir);
    b.velocity.x += -rightDir.x * lateral * CONFIG.car.grip * dt * 0.08;
    b.velocity.z += -rightDir.z * lateral * CONFIG.car.grip * dt * 0.08;
  }

  // Jump
  if (input.jump && car.canJump && (now() - car.jumpedAt) > 0.18 && !locked){
    b.velocity.y = Math.max(b.velocity.y, 0) + CONFIG.car.jumpImpulse;
    car.jumpedAt = now();
    car.canJump = false;
  }

  // Boost
  if (input.boost && car.boost > 0.1 && !locked){
    b.velocity.x += fwdDir.x * CONFIG.car.boostForce * dt;
    b.velocity.z += fwdDir.z * CONFIG.car.boostForce * dt;
    car.boost -= CONFIG.car.boostDrainPerSec * dt;
  } else if (grounded && forward >= 0 && !locked){
    car.boost += CONFIG.car.boostRegenPerSec * dt;
  }
  car.boost = clamp(car.boost, 0, CONFIG.car.maxBoost);

  // Keep car from tipping: lock roll/pitch visually, physics proxy stays stable anyway.
  // Speed cap
  limitSpeed(b, CONFIG.car.maxSpeed);

  keepInBounds(b);
}

/* -------------------- Bot AI (simple chase/defend) -------------------- */
let botNextThink = now();
let botPlan = { throttle: 0, steer: 0, jump: false, boost: false };

function botThink(){
  // Target ball with a slight offset toward opponent goal for shots
  const ball = ballBody.position;
  const goalZ = -halfL; // bot shoots to blue goal (negative z)
  const aim = new CANNON.Vec3(ball.x, ball.y, ball.z - 4.5);
  if (ball.z < 0) {
    // If ball already on opponent half, be a bit more direct
    aim.z = ball.z - 2.0;
  }

  const p = bot.body.position;
  const to = new THREE.Vector3(aim.x - p.x, 0, aim.z - p.z);
  const dist = to.length();
  to.normalize();

  // Desired yaw
  const desiredYaw = Math.atan2(to.x, to.z);

  // Current yaw estimate from botPlan's internal yaw
  const yaw = bot.aimingYaw;
  let delta = desiredYaw - yaw;
  while (delta > Math.PI) delta -= Math.PI*2;
  while (delta < -Math.PI) delta += Math.PI*2;

  const steer = clamp(delta * 0.9, -1, 1);

  // Throttle logic
  let throttle = 1;
  if (dist < 6) throttle = 0.6;
  if (dist < 3.5) throttle = 0.2;

  // Jump into ball when close and ball is up a bit
  const jump = dist < 4.2 && ball.y > 2.4 && isGrounded(bot.body);

  // Boost sometimes for pressure
  const boost = dist > 16 && Math.random() < CONFIG.bot.boostChance;

  botPlan = { throttle, steer, jump, boost };
}

function updateBot(dt){
  if (!CONFIG.bot.enabled) return;
  if (now() >= botNextThink){
    botThink();
    botNextThink = now() + CONFIG.bot.reaction * (1.2 - CONFIG.bot.skill);
  }
  driveCar(bot, botPlan, dt);
}

/* -------------------- Ball bounds & goals -------------------- */
function updateBall(dt){
  keepInBounds(ballBody);
  limitSpeed(ballBody, CONFIG.ball.maxSpeed);

  // If ball goes "behind" goal line into goal area and under height -> score
  const b = ballBody.position;
  const inGoalX = Math.abs(b.x) < (A.goalWidth/2 - 0.2);
  const lowEnough = b.y < (A.goalHeight - 0.25);
  if (inGoalX && lowEnough){
    if (b.z > halfL + 1.0){
      // Blue scores on +Z goal
      goalScored('blue');
    } else if (b.z < -halfL - 1.0){
      // Red scores on -Z goal
      goalScored('red');
    }
  }

  // If ball gets stuck, nudge
  if (b.y < -10){
    resetPositions(false);
  }
}

/* -------------------- Sync render meshes to physics -------------------- */
function syncMeshes(){
  // Ball
  ballMesh.position.set(ballBody.position.x, ballBody.position.y, ballBody.position.z);

  // Cars: visually align to aiming yaw (arcade)
  function syncCar(car){
    const p = car.body.position;
    car.mesh.position.set(p.x, p.y - CONFIG.car.radius + 0.2, p.z);
    car.mesh.rotation.set(0, car.aimingYaw, 0);
  }
  syncCar(player);
  syncCar(bot);
}

/* -------------------- Resets / match -------------------- */
function fullReset(){
  score = { blue: 0, red: 0 };
  matchTime = CONFIG.match.durationSec;
  resetPositions(true);
  updateHUD();
}

window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyR'){
    resetPositions(false);
  }
});

/* -------------------- Resize -------------------- */
window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});

/* -------------------- Main loop -------------------- */
function tick(){
  requestAnimationFrame(tick);

  const t = now();
  let dt = t - lastT;
  lastT = t;
  dt = clamp(dt, 0, 1/20);

  if (!paused){
    // Match timer
    matchTime -= dt;
    if (matchTime <= 0){
      matchTime = 0;
      paused = true;
      overlay.classList.remove('hidden');
    }

    // Input map
    const throttle = (pressed('KeyW') ? 1 : 0) + (pressed('KeyS') ? -1 : 0);
    const steer = (pressed('KeyD') ? 1 : 0) + (pressed('KeyA') ? -1 : 0);
    const jump = pressed('Space');
    const boost = pressed('ShiftLeft') || pressed('ShiftRight');

    driveCar(player, { throttle, steer, jump, boost }, dt);
    updateBot(dt);

    // Physics step
    world.step(CONFIG.physics.fixedTimeStep, dt, CONFIG.physics.maxSubSteps);

    // Ball update after stepping
    updateBall(dt);

    // Soft ball bounce tuning against walls:
    // If ball hits bounds, add a mild bounce (already in keepInBounds by velocity reflect).
    // This is handled via keepInBounds().

    // HUD
    updateHUD();
  }

  syncMeshes();
  updateCamera(dt);
  renderer.render(scene, camera);
}
tick();

// Start in paused overlay
overlay.classList.remove('hidden');

// Allow restart with click
overlay.addEventListener('click', () => togglePause());

// Global hotkeys
window.addEventListener('keydown', (e) => {
  if (e.code === 'Escape') paused = true, overlay.classList.remove('hidden');
  if (e.code === 'KeyN') fullReset();
});

// First reset for clean state
fullReset();
