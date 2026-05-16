import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
scene.background = new THREE.Color(0x000000);
camera.position.z = 5;
scene.add(new THREE.AxesHelper(5));
scene.add(new THREE.AmbientLight(0xffffff, 0.7));

const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(5,5,5);
scene.add(light);
const controls = new OrbitControls(camera, renderer.domElement);

const colors = {
  right: 0xff0000,   // rouge
  left: 0xff8000,    // orange
  top: 0xffffff,     // blanc
  bottom: 0xffff00,  // jaune
  front: 0x00ff00,   // vert
  back: 0x0000ff,    // bleu
  inside: 0x111111
};

const cubies = [];
const size = 1;
const gap = 0.05;
function createGalaxyMaterial(color){

return new THREE.ShaderMaterial({

uniforms:{
time:{value:0},
baseColor:{value:new THREE.Color(color)}
},

vertexShader:`
varying vec2 vUv;

void main(){
vUv = uv;
gl_Position = projectionMatrix *
modelViewMatrix *
vec4(position,1.0);
}
`,

fragmentShader:`

uniform float time;
uniform vec3 baseColor;

varying vec2 vUv;

float random(vec2 st){
return fract(sin(dot(st.xy,
vec2(12.9898,78.233)))*
43758.5453123);
}

void main(){

vec2 uv = vUv;

uv += time*0.02;

float stars = step(0.995, random(floor(uv*60.0)));

vec3 nebula = baseColor *
(0.6 + 0.4*sin(time + uv.x*6.0 + uv.y*4.0));

vec3 color = nebula + stars;

gl_FragColor = vec4(color,1.0);

}
`

});
}const galaxyColors = {
right:0xff2da3,
left:0xff7a00,
top:0xffffff,
bottom:0xffd500,
front:0x00ffd5,
back:0x4a6cff
};
for (let x = -1; x <= 1; x++) {
  for (let y = -1; y <= 1; y++) {
    for (let z = -1; z <= 1; z++) {

      if (x === 0 && y === 0 && z === 0) continue;

      const geometry = new THREE.BoxGeometry(size, size, size);
      // const geometry = new RoundedBoxGeometry(size, size, size, 6, 0.15);
const dark = new THREE.MeshStandardMaterial({
  color:0x050505,
  roughness:0.6
});
const materials = [
x===1 ? createGalaxyMaterial(galaxyColors.right) : dark,
x===-1 ? createGalaxyMaterial(galaxyColors.left) : dark,
y===1 ? createGalaxyMaterial(galaxyColors.top) : dark,
y===-1 ? createGalaxyMaterial(galaxyColors.bottom) : dark,
z===1 ? createGalaxyMaterial(galaxyColors.front) : dark,
z===-1 ? createGalaxyMaterial(galaxyColors.back) : dark
];

      const cube = new THREE.Mesh(geometry, materials);

      cube.position.set(x * (size + gap), y * (size + gap), z * (size + gap));

      scene.add(cube);
      cubies.push(cube);
    }
  }
}

function animate() {
  requestAnimationFrame(animate);
  cubies.forEach(cube => {
    cube.material.forEach(mat => {
      if (mat.uniforms) {
        mat.uniforms.time.value += 0.01;
      }
    });
  });
  controls.update();
  renderer.render(scene, camera);
}

animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});