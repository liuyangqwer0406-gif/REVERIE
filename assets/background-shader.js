/* REVERIE — Atmospheric shader background (vanilla Three.js)
   Ported from R3F ShaderPlane + EnergyRing, recoloured for the
   REVERIE palette: near-black canvas, gold-warm organic shimmer.
   Loaded as <script type="module"> after the three.js importmap. */

import * as THREE from 'three';

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (!reduced) {

/* ─── Shaders (from user's original R3F component) ────────────────── */

const vertexShader = `
  uniform float time;
  uniform float intensity;
  varying vec2 vUv;
  varying vec3 vPosition;
  void main() {
    vUv = uv;
    vPosition = position;
    vec3 pos = position;
    pos.y += sin(pos.x * 10.0 + time) * 0.1 * intensity;
    pos.x += cos(pos.y * 8.0 + time * 1.5) * 0.05 * intensity;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const fragmentShader = `
  uniform float time;
  uniform float intensity;
  uniform vec3 color1;
  uniform vec3 color2;
  varying vec2 vUv;
  varying vec3 vPosition;
  void main() {
    vec2 uv = vUv;
    float noise = sin(uv.x * 20.0 + time) * cos(uv.y * 15.0 + time * 0.8);
    noise += sin(uv.x * 35.0 - time * 2.0) * cos(uv.y * 25.0 + time * 1.2) * 0.5;
    vec3 color = mix(color1, color2, noise * 0.5 + 0.5);
    color = mix(color, vec3(1.0), pow(abs(noise), 2.0) * intensity);
    float glow = 1.0 - length(uv - 0.5) * 2.0;
    glow = pow(glow, 2.0);
    gl_FragColor = vec4(color * glow, glow * 0.55);
  }
`;

/* ─── Scene setup ─────────────────────────────────────────────────── */

const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
camera.position.z = 1;

const uniforms = {
  time:      { value: 0 },
  intensity: { value: 1.0 },
  /* REVERIE palette adaptation — gold/warm instead of orange/white */
  color1:    { value: new THREE.Color('#c5a472') },
  color2:    { value: new THREE.Color('#2a1810') },
};

/* ─── Main shader plane ───────────────────────────────────────────── */

const geo = new THREE.PlaneGeometry(2, 2, 48, 48);
const mat = new THREE.ShaderMaterial({
  uniforms,
  vertexShader,
  fragmentShader,
  transparent: true,
  side: THREE.DoubleSide,
  depthWrite: false,
});
const mesh = new THREE.Mesh(geo, mat);
scene.add(mesh);

/* ─── Energy rings (subtle, atmospheric) ──────────────────────────── */

function makeRing(inner, outer, color, baseOpacity, spinDir) {
  const g = new THREE.RingGeometry(inner, outer, 64);
  const m = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: baseOpacity,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const r = new THREE.Mesh(g, m);
  r.position.z = -0.5;
  r.userData = { baseOpacity, spinDir };
  scene.add(r);
  return r;
}

const ring1 = makeRing(0.82, 0.90, '#c5a472', 0.04,  0.15);
const ring2 = makeRing(1.15, 1.22, '#8a6a3e', 0.025, -0.10);
const ring3 = makeRing(0.50, 0.56, '#d4b88c', 0.02,  0.22);

/* ─── Renderer (fixed, behind all content) ────────────────────────── */

const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
const canvas = renderer.domElement;
canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:-1;pointer-events:none;display:block;';
document.body.prepend(canvas);
document.body.classList.add('has-shader-bg');

/* ─── Animation loop ──────────────────────────────────────────────── */

function animate() {
  requestAnimationFrame(animate);
  uniforms.time.value += 0.008;
  uniforms.intensity.value = 1.0 + Math.sin(uniforms.time.value * 1.8) * 0.2;

  ring1.rotation.z = uniforms.time.value * ring1.userData.spinDir;
  ring1.material.opacity = ring1.userData.baseOpacity + Math.sin(uniforms.time.value * 2.5) * 0.025;

  ring2.rotation.z = uniforms.time.value * ring2.userData.spinDir;
  ring2.material.opacity = ring2.userData.baseOpacity + Math.sin(uniforms.time.value * 1.5 + 1) * 0.015;

  ring3.rotation.z = uniforms.time.value * ring3.userData.spinDir;
  ring3.material.opacity = ring3.userData.baseOpacity + Math.sin(uniforms.time.value * 3.2 + 2) * 0.012;

  renderer.render(scene, camera);
}
animate();

/* ─── Resize ──────────────────────────────────────────────────────── */

window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
});
}
