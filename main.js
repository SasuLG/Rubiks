import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
// import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
// import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
// import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

//#region DOM
const input = document.querySelector('#input');
const scrambleBtn = document.querySelector('#scramble');
const resetBtn = document.querySelector('#reset');
const scrambleMovesSpan = document.querySelector('#scramble_moves');
const tpsSlider = document.querySelector('#tps_slider');
const timeSlider = document.querySelector('#time_slider');
const pauseSlider = document.querySelector('#pause_slider');

const tpsValue = document.querySelector('#tps_value');
const timeTPSValue = document.querySelector('#time_tps_value');
const TPSTimeValue = document.querySelector('#tps_time_value');
const timeValue = document.querySelector('#time_value');
const pauseValue = document.querySelector('#pause_value');

const modeTPS = document.querySelector('#mode_tps');
const modeTime = document.querySelector('#mode_time');
const tpsGroup = document.querySelector('#tps_group');
const timeGroup = document.querySelector('#time_group');

const executeBtn = document.querySelector('#execute');

const playerOverlay = document.querySelector('#player_overlay');
const togglePauseBtn = document.querySelector('#toggle_pause');
const nextBtn = document.querySelector('#next');
const previousBtn = document.querySelector('#previous');
const manualInput = document.querySelector('#manual_input');
const TestBtn = document.querySelector('#tester');
let isPaused = false;
let next = false;
let indexMove = 0;
let saveCubies = [];
let moveHistory = [];

function showPlayer(){
  playerOverlay.classList.remove("hidden");
}

function hidePlayer(){
  playerOverlay.classList.add("hidden");
}
togglePauseBtn.addEventListener("click", () => {
  if(!isPaused){
    isPaused = true;
    saveCubies = saveCubeState();
  }else{
    restoreCubeState(saveCubies);
    isPaused = false;
  }
  togglePauseBtn.textContent = isPaused ? "▶" : "⏸";
});

function saveCubeState(){
  return cubies.map(cube => ({
    position: cube.position.clone(),
    quaternion: cube.quaternion.clone()
  }));
}

function restoreCubeState(state){
  cubies.forEach((cube, i) => {
    cube.position.copy(state[i].position);
    cube.quaternion.copy(state[i].quaternion);
  });
  snapCubes();
}

nextBtn.addEventListener("click", () => {
  if(!isPaused) return;
  next = true;
});

previousBtn.addEventListener("click", () => {
  if(!isPaused) return;
  if(indexMove <= 0) return;

  indexMove--;
  const move = moveHistory[indexMove];
  executeMove(move.move, -move.amount);
});

TestBtn.addEventListener("click", () => {
  if(!isPaused) return;
  const moves = parseAlgorithm(manualInput.value);
  if(!moves) return;
  executeAlgorithm(true);
});

const ui = document.querySelector('.ui');
const toggleUI = document.querySelector('#toggle_ui');
let currentMode = "tps";
let duration = 180;
let durationTurn = 180;

input.addEventListener("input", updateEstimatedTPS);
input.addEventListener("input", updateEstimatedTime);

function updateEstimatedTPS(){
  const moves = parseAlgorithm(input.value);

  if(!moves.length){
    timeTPSValue.textContent = "0.0";
    return;
  }

  const pause = Number(pauseSlider.value) * 1000;
  const totalTime = Number(timeSlider.value) * 1000;
  const totalPauseTime = pause * (moves.length - 1);
  const duration = (totalTime - totalPauseTime) / moves.length;
  const tps = 1000 / duration;
  timeTPSValue.textContent = tps.toFixed(1);
}

function updateEstimatedTime(){
  const moves = parseAlgorithm(input.value);
  if(!moves.length){
    TPSTimeValue.textContent = "0.0s";
    return;
  }
  const pause = Number(pauseSlider.value) * 1000;
  const duration = 1000 / Number(tpsSlider.value);
  const totalTime = moves.length * duration + (moves.length - 1) * pause;
  TPSTimeValue.textContent = (totalTime / 1000).toFixed(1) + "s";
}

function updateModeUI(){

  if(currentMode === "tps"){
    modeTPS.classList.add("active");
    modeTime.classList.remove("active");

    tpsGroup.classList.remove("hidden");
    timeGroup.classList.add("hidden");

  }else{
    modeTime.classList.add("active");
    modeTPS.classList.remove("active");

    timeGroup.classList.remove("hidden");
    tpsGroup.classList.add("hidden");
  }
}

modeTPS.addEventListener("click", () => {
  currentMode = "tps";
  updateModeUI();
});

modeTime.addEventListener("click", () => {
  currentMode = "time";
  updateModeUI();
});

updateModeUI();
toggleUI.addEventListener("click", () => {
  ui.classList.toggle("closed");
  toggleUI.textContent = ui.classList.contains("closed") ? "❮" : "❯";
});

function updateSliderValues(){
  tpsValue.textContent = Number(tpsSlider.value).toFixed(1);
  duration = 1000 / Number(tpsSlider.value);
  durationTurn = duration * 1.5;
  timeValue.textContent = Number(timeSlider.value).toFixed(1) + "s";
  pauseValue.textContent = Number(pauseSlider.value).toFixed(1) + "s";
  updateEstimatedTPS();
  updateEstimatedTime();
}
updateSliderValues();

tpsSlider.addEventListener("input", updateSliderValues);
timeSlider.addEventListener("input", updateSliderValues);
pauseSlider.addEventListener("input", updateSliderValues);

function sleep(ms){
  return new Promise(resolve => setTimeout(resolve, ms));
}

resetBtn.addEventListener("click", async () => {
  cubies.forEach(cube => {
    cube.removeFromParent();
  });
  build();
});

scrambleBtn.addEventListener("click", async () => {
  if(isAnimating) return;
  const moveNames = Object.keys(MOVEMENTS);
  const moves = [];
  for(let i = 0; i < Math.random() * (25 - 20) + 20; i++){
    const moveName = moveNames[Math.floor(Math.random() * moveNames.length)];
    const amount = Math.random() < 0.5 ? (Math.random() < 1 / 3 ? 2 : 1) : (Math.random() < 1 / 3 ? -2 : -1);
    moves.push({move: moveName, amount});
  }

  scrambleMovesSpan.textContent = moves.map(m => m.move + (m.amount === -1 ? "'" : m.amount === 2 || m.amount === -2 ? "2" : "")).join(" ");
  for(const {move, amount} of moves){
    await executeMove(move, amount);
  }
});

async function executeAlgorithm(paused = false){
  if(!paused) showPlayer();
  if(isAnimating) return;
  const moves = parseAlgorithm(paused?manualInput.value:input.value);
  moveHistory.push(...moves);
  if(!moves.length) return;
  
  const pause = Number(pauseSlider.value) * 1000;

  if(currentMode === "tps"){
    const tps = Number(tpsSlider.value);
    duration = 1000 / tps;
  }else{
    const totalTime = Number(timeSlider.value) * 1000;
    const totalPauseTime = pause * (moves.length - 1);
    duration = (totalTime - totalPauseTime) / moves.length;

    if(duration < 40) duration = 40;
  }
  durationTurn = duration * 1.5;
  // for(const {move, amount} of moves){
  //   await executeMove(move, amount);
  //   if(pause > 0) await sleep(pause);
  // }
  for(indexMove; indexMove < moves.length; indexMove++){//pour plusieurs mouvements en meme temps
    if(isPaused && !paused){
      saveCubies = saveCubeState();
    }
    while(isPaused && !paused){
      await sleep(100);
      if(next) {;isPaused = false;}
    };
    const currentMove = moves[indexMove];
    const nextMove = moves[indexMove + 1];
    if(nextMove){

      if(currentMove.move != "x" && currentMove.move != "y" && currentMove.move != "z" && nextMove.move != "x" && nextMove.move != "y" && nextMove.move != "z"){
        const moveData = MOVEMENTS[currentMove.move];
        const nextMoveData = MOVEMENTS[nextMove.move];

        if(moveData && nextMoveData && moveData.axis.equals(nextMoveData.axis) && moveData.layer != nextMoveData.layer){
          let axis;
          if(moveData.axis.equals(AXIS.X)) axis = "x";
          else if(moveData.axis.equals(AXIS.Y)) axis = "y";
          else if(moveData.axis.equals(AXIS.Z)) axis = "z";

          const moves = [currentMove, nextMove].map(m => {
            const moveData = MOVEMENTS[m.move];
            let amount = m.amount;
            if(m.move === "R" || m.move === "D" || m.move === "B" || m.move === "E") amount *= -1;
            return {axis, layer: moveData.layer, direction: amount};
          });

          await move(moves);
          indexMove++;
        }else{
          await executeMove(currentMove.move, currentMove.amount);
        }
      }else{
        await executeMove(currentMove.move, currentMove.amount);
      }
    }else{
      await executeMove(currentMove.move, currentMove.amount);
    }
    if(pause > 0) await sleep(pause);//TODO && i%5 === 0
    if(next) {isPaused = true; next = false;}
  }
  if(!paused){
    hidePlayer();
    isPaused = false;
    togglePauseBtn.textContent = "⏸";
  }
}

input.addEventListener("keydown", async (e) => {
  if(e.key === "Enter") executeAlgorithm();
});

executeBtn.addEventListener("click", () => executeAlgorithm());

function parseAlgorithm(str){
  return str.trim().split(/\s+/).map(token => {
      const move = token[0];
      let amount = 1;

      if(token.includes("'")) amount = -1;
      if(token.includes("2")) amount *= 2;
      
      return {move,amount};
    });
}

//#endregion

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

// renderer.toneMapping = THREE.ACESFilmicToneMapping;
// renderer.toneMappingExposure = 1;
// renderer.outputColorSpace = THREE.SRGBColorSpace;
// const composer = new EffectComposer(renderer);
// composer.addPass(new RenderPass(scene, camera));
// const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), .2, 0.5, 0);//intensité, diffusion, seuil
// composer.addPass(bloomPass);

scene.background = new THREE.Color(0x000000);
camera.position.set(5,5,5);
scene.add(new THREE.AmbientLight(0xffffff, 0.7));

const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(5,5,5);
scene.add(light);
const controls = new OrbitControls(camera, renderer.domElement);
renderer.domElement.style.touchAction = "none";

controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.target.set(0, 0, 0);
controls.minPolarAngle = 0;
controls.maxPolarAngle = Math.PI;
controls.update();

const raycaster = new THREE.Raycaster();
scene.add(raycaster);

const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
const intersection = new THREE.Vector3();
document.addEventListener("pointerdown", onpointerdown);
document.addEventListener("pointermove", onpointermove);
document.addEventListener("pointerup", () => {
  cubeClicked = null;
  coordsClick = null;
  controls.enabled = true;
});

let coordsClick;
let cubeClicked;
let selectedCubie = null;
let selectedNormal = null;

const AXIS = {
  X: new THREE.Vector3(1,0,0),
  Y: new THREE.Vector3(0,1,0),
  Z: new THREE.Vector3(0,0,1)
};
const cubeOrientation = new THREE.Quaternion();
const MOVEMENTS = {
  R: { axis: new THREE.Vector3(1,0,0), layer: 1 },
  L: { axis: new THREE.Vector3(1,0,0), layer: -1 },
  M: { axis: new THREE.Vector3(1,0,0), layer: 0 },

  U: { axis: new THREE.Vector3(0,1,0), layer: 1 },
  D: { axis: new THREE.Vector3(0,1,0), layer: -1 },
  E: { axis: new THREE.Vector3(0,1,0), layer: 0 },

  F: { axis: new THREE.Vector3(0,0,1), layer: 1 },
  B: { axis: new THREE.Vector3(0,0,1), layer: -1 },
  S: { axis: new THREE.Vector3(0,0,1), layer: 0 },
};
const WIDEMOVES = {
  r: [
    { move: "R", dir: -1 },
    { move: "M", dir: -1 }
  ],
  l: [
    { move: "L", dir: 1 },
    { move: "M", dir: 1 }
  ],
  u: [
    { move: "U", dir: 1 },
    { move: "E", dir: 1 }
  ],
  d: [
    { move: "D", dir: -1 },
    { move: "E", dir: -1 }
  ],
  f: [
    { move: "F", dir: 1 },
    { move: "S", dir: 1 }
  ],
  b: [
    { move: "B", dir: -1 },
    { move: "S", dir: -1 }
  ]
};

function onpointerdown(event) {
  const coords = new THREE.Vector2((event.clientX / window.innerWidth) * 2 - 1, -(event.clientY / window.innerHeight) * 2 + 1 );
  
  raycaster.setFromCamera(coords, camera);
  const intersects = raycaster.intersectObjects(scene.children);
  if (intersects.length > 0 ) {
    controls.enabled = false;
    coordsClick = coords;
    cubeClicked = intersects[0].object;


    selectedCubie = intersects[0].object;
    selectedNormal = intersects[0].face.normal.clone();
    selectedNormal.transformDirection(selectedCubie.matrixWorld);
    selectedNormal.round();
  }
}

function onpointermove(event){
  if(!cubeClicked) return;
  if(isAnimating) return;

  const coords = new THREE.Vector2((event.clientX / window.innerWidth) * 2 - 1, -(event.clientY / window.innerHeight) * 2 + 1);

  const drag = new THREE.Vector2().subVectors(coords, coordsClick);

  if(drag.length() < 0.05) return;
  cubeClicked = null;

  const dragWorld = new THREE.Vector3(drag.x, -drag.y, 0);
  dragWorld.applyQuaternion(camera.quaternion);
  const rotationAxis = new THREE.Vector3().crossVectors(dragWorld, selectedNormal).normalize();

  const absX = Math.abs(rotationAxis.x);
  const absY = Math.abs(rotationAxis.y);
  const absZ = Math.abs(rotationAxis.z);

  let axis;

  if(absX > absY && absX > absZ) axis = "x";
  else if(absY > absX && absY > absZ)axis = "y";
  else axis = "z";

  let layer;

  if(axis === "x") layer = Math.round(selectedCubie.position.x / (size + gap));
  else if(axis === "y") layer = Math.round(selectedCubie.position.y / (size + gap));
  else layer = Math.round(selectedCubie.position.z / (size + gap));

  let direction = 1;
  const dominant = axis === "x" ? rotationAxis.x : axis === "y" ? rotationAxis.y : rotationAxis.z;
  if(dominant < 0) direction = -1;

  move({axis: axis, layer: layer, direction: direction});
}

async function move(movements){
  if(isAnimating) return;
  isAnimating = true;
  
  if(!Array.isArray(movements)) movements = [movements];
  const preparedMoves = movements.map(m =>{
    let correctedDirection = m.direction;
    if(m.axis === "x") correctedDirection *= -1;
    if(selectedNormal && Math.abs(selectedNormal.x) === 1) {
      if(m.axis === "z") {
        correctedDirection *= -1;
      }
    }

    const totalAngle = (-Math.PI / 2) * correctedDirection;
    const cubes = cubies.filter(cube => {
      if(m.axis === "x") return Math.round(cube.position.x / (size + gap)) === m.layer;
      if(m.axis === "y") return Math.round(cube.position.y / (size + gap)) === m.layer;
      if(m.axis === "z") return Math.round(cube.position.z / (size + gap)) === m.layer;
    });

    const axisVector = m.axis === "x" ? AXIS.X : m.axis === "y" ? AXIS.Y :AXIS.Z;

    return {cubes, axisVector, totalAngle};
  })

  const start = performance.now();
  let previousAngle = 0;

  return new Promise(resolve =>{
    function animateMove(now){
      const elapsed = now - start;
      const t = Math.min(elapsed / duration, 1);

      const eased = 1 - Math.pow(1 - t, 3);
      const currentAngle = eased;
      const deltaAngle = currentAngle - previousAngle;
      previousAngle = currentAngle;

      preparedMoves.forEach(m => {
        const q = new THREE.Quaternion();
        q.setFromAxisAngle(m.axisVector, m.totalAngle * deltaAngle);

        m.cubes.forEach(cube => {
          cube.position.applyQuaternion(q);
          cube.quaternion.premultiply(q);
        });
      });

      if(t < 1){
        requestAnimationFrame(animateMove);
      }else{
        snapCubes();
        isAnimating = false;
        resolve();
      }
    }
    requestAnimationFrame(animateMove);
  })
}

async function executeMove(moveName, amount){
  if(moveName == "x" || moveName == "y" || moveName == "z") return await rotateWholeCube(moveName, amount);

  if(MOVEMENTS[moveName]){
    if(moveName === "R" || moveName === "D" || moveName === "B" || moveName === "E") amount *= -1;

    let axis;
    if(MOVEMENTS[moveName].axis.equals(AXIS.X)) axis = "x";
    else if(MOVEMENTS[moveName].axis.equals(AXIS.Y)) axis = "y";
    else if(MOVEMENTS[moveName].axis.equals(AXIS.Z)) axis = "z";

    return await move({axis: axis, layer: MOVEMENTS[moveName].layer, direction: amount});
  }

  else if(WIDEMOVES[moveName]){
    const movements = WIDEMOVES[moveName].map(w => {
      const data = MOVEMENTS[w.move];
      let axis;

      if(data.axis.equals(AXIS.X)) axis = "x";
      else if(data.axis.equals(AXIS.Y)) axis = "y";
      else axis = "z";

      return { axis, layer: data.layer, direction: amount * w.dir};
    });
    return await move(movements);
  }
}

async function rotateWholeCube(axisName, amount){
  const axis = axisName === "x" ? AXIS.X : axisName === "y" ? AXIS.Y :AXIS.Z;
  const totalAngle = (-Math.PI / 2) * amount;
  const start = performance.now();
  let previousAngle = 0;

  return new Promise(resolve => {
    function animateRotate(now){
      const elapsed = now - start;
      const t = Math.min(elapsed / durationTurn, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      const currentAngle = totalAngle * eased;
      const deltaAngle = currentAngle - previousAngle;
      previousAngle = currentAngle;

      const q = new THREE.Quaternion();
      q.setFromAxisAngle(axis, deltaAngle);

      cubies.forEach(cube => {
        cube.position.applyQuaternion(q);
        cube.quaternion.premultiply(q);
      });

      if(t < 1) requestAnimationFrame(animateRotate);
      else{
        const finalQ = new THREE.Quaternion();
        finalQ.setFromAxisAngle(axis, totalAngle);
        cubeOrientation.premultiply(finalQ);

        snapCubes();
        resolve();
      }
    }
    requestAnimationFrame(animateRotate);
  });
}

function snapCubes(){

  cubies.forEach(cube => {
    cube.position.x = Math.round(cube.position.x / (size + gap)) * (size + gap);
    cube.position.y = Math.round(cube.position.y / (size + gap)) * (size + gap);
    cube.position.z = Math.round(cube.position.z / (size + gap)) * (size + gap);

    cube.quaternion.x = Math.round(cube.quaternion.x * 1000000) / 1000000;
    cube.quaternion.y = Math.round(cube.quaternion.y * 1000000) / 1000000;
    cube.quaternion.z = Math.round(cube.quaternion.z * 1000000) / 1000000;
    cube.quaternion.w = Math.round(cube.quaternion.w * 1000000) / 1000000;
  });

}

const colors = {
  right: 0xff0000,   // rouge
  left: 0xff8000,    // orange
  top: 0xffffff,     // blanc
  bottom: 0xffff00,  // jaune
  front: 0x00ff00,   // vert
  back: 0x0000ff,    // bleu
  inside: 0x111111
};

let cubies = [];
let isAnimating = false;
const size = 1;
const gap = 0.025;

const textureLoader = new THREE.TextureLoader();
const ganTexture = textureLoader.load('./gan2.png');
ganTexture.transparent = true;

function build(){
  for (let x = -1; x <= 1; x++) {
    for (let y = -1; y <= 1; y++) {
      for (let z = -1; z <= 1; z++) {

        if (x === 0 && y === 0 && z === 0) continue;

        const isCenters = (x == -1 && y == 0 && z == 0)||(x == 0 && (y == -1 || y == 1) && z == 0) || (x == 0 && y == 0 && (z == -1 || z == 1 )) ||(x == 1 && y == 0 && z == 0)
        if (isCenters) var geometry = new RoundedBoxGeometry(size+.03, size+.03, size+.03, 6, .2);
        else var geometry = new RoundedBoxGeometry(size, size, size, 6, .1);

        const materials = [
          new THREE.MeshStandardMaterial({color: x === 1 ? colors.right : colors.inside}),//, roughness:0.1
          new THREE.MeshStandardMaterial({color: x === -1 ? colors.left : colors.inside}),//, roughness:0.1
          new THREE.MeshStandardMaterial({color: y === 1 ? colors.top : colors.inside, map: (isCenters && y === 1) ? ganTexture : null}),//, roughness:0.1
          new THREE.MeshStandardMaterial({color: y === -1 ? colors.bottom : colors.inside}),//, roughness:0.1
          new THREE.MeshStandardMaterial({color: z === 1 ? colors.front : colors.inside}),//, roughness:0.1
          new THREE.MeshStandardMaterial({color: z === -1 ? colors.back : colors.inside}),//, roughness:0.1
        ];

        const cube = new THREE.Mesh(geometry, materials);
        cube.position.set(x * (size + gap), y * (size + gap), z * (size + gap));

        scene.add(cube);
        cubies.push(cube);
      }
    }
  }
}
build();


function animate() {
  requestAnimationFrame(animate);

  controls.update();
  renderer.render(scene, camera);
  // composer.render();
}

animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});


// les updateEstimatedTPS sont bizarres (temps marche pas je crois) + pause 

//scramble : U2 R F L2 F D2 B L2 F2 L2 B U2 F' D2 U B' R2 U2 R F L2
// x2 y F U L2 D2 U' L U' L' U R' U' R U' F' U F y' U L' U' L U L' U' L U' R U' R' L U' L' U2 R U R' y U' L' U2 L U2 L' U L l' U' L U' L' U L U' L' U2 l U' R' U' F' R U R' U' R' F R2 U' R' U' R U R' U R U2

//scramble : L2 D2 U2 R2 B' R2 B R2 F2 R2 F' D2 R B D B' L D2 F D B2
// z2 y' R F L R2 B2 U2 R U R' U2 R U' R' U2 L U2 L' U' L U L' U L' U' L U2 L' U' L U2 R' U2 R U2 R' U R U2 f R f' U' r' U' R U M' U R U R' U' R' F R2 U' R' U' R U R' F' U

//scramble : L' F L2 R2 D' F2 D2 R2 D B2 L2 F2 U2 B2 F' R F' U2 L' D L2
// z2 y D' L D' L2 F2 y U R U' R' U' R U' R' U R U' R' L' U L U' L U2 L' y' L U2 L' y' R' U' R U' R' U R R U R' y U2 L' U L U2 f R f' U' r' U' R U M' U' R2 U' S R2 S' R2 U R2
                                                                                                                                                  // M2 U' M U2 M' U' M2 U'