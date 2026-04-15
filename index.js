import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a2a3a);
scene.fog = new THREE.FogExp2(0x1a2a3a, 0.015);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 500);
camera.position.set(0, 15, 40);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
const root = document.getElementById('root') ?? document.body;
root.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.target.set(0, 5, 0);

// Lighting
const ambientLight = new THREE.AmbientLight(0x4488aa, 0.5);
ambientLight.name = 'ambientLight1';
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffeedd, 2.0);
dirLight.name = 'dirLight1';
dirLight.position.set(20, 40, 20);
dirLight.castShadow = true;
dirLight.shadow.mapSize.set(2048, 2048);
dirLight.shadow.camera.near = 1;
dirLight.shadow.camera.far = 100;
dirLight.shadow.camera.left = -40;
dirLight.shadow.camera.right = 40;
dirLight.shadow.camera.top = 40;
dirLight.shadow.camera.bottom = -40;
dirLight.shadow.bias = -0.001;
dirLight.shadow.normalBias = 0.02;
scene.add(dirLight);

const moonLight = new THREE.PointLight(0x88ccff, 3, 100);
moonLight.name = 'moonLight1';
moonLight.position.set(-15, 35, -10);
scene.add(moonLight);

const warmLight = new THREE.PointLight(0xffaa44, 2, 60);
warmLight.name = 'warmLight1';
warmLight.position.set(10, 5, 15);
scene.add(warmLight);

// =================== TERRAIN ===================
function createCliffGeometry() {
  const geo = new THREE.PlaneGeometry(80, 80, 128, 128);
  const pos = geo.attributes.position;

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);

    let z = 0;
    // Main cliff - left side high plateau
    const cliffEdge = -2 + Math.sin(y * 0.15) * 3;
    if (x < cliffEdge) {
      z = 18 + Math.sin(x * 0.3) * 2 + Math.cos(y * 0.2) * 1.5;
      const dist = cliffEdge - x;
      z += dist * 0.3;
    } else if (x < cliffEdge + 4) {
      const t = (x - cliffEdge) / 4;
      const highZ = 18 + Math.sin(x * 0.3) * 2;
      const lowZ = -1 + Math.sin(y * 0.3) * 0.5;
      z = THREE.MathUtils.lerp(highZ, lowZ, t * t);
    } else {
      z = -1 + Math.sin(y * 0.3) * 0.5 + Math.cos(x * 0.2) * 0.3;
    }

    // Right cliff
    const rightEdge = 15 + Math.sin(y * 0.12) * 2;
    if (x > rightEdge) {
      const dist = x - rightEdge;
      z = Math.max(z, 10 + dist * 0.5 + Math.sin(y * 0.25) * 2);
    } else if (x > rightEdge - 3) {
      const t = (rightEdge - x) / 3;
      z = Math.max(z, THREE.MathUtils.lerp(10, z, t));
    }

    // Waterfall channel groove
    const channelCenter = 6 + Math.sin(y * 0.1) * 1.5;
    const channelDist = Math.abs(x - channelCenter);
    if (channelDist < 3 && x > cliffEdge + 4) {
      z -= (3 - channelDist) * 0.4;
    }

    // Noise
    z += Math.sin(x * 1.2 + y * 0.8) * 0.3 + Math.cos(x * 0.7 - y * 1.1) * 0.2;

    pos.setZ(i, z);
  }

  geo.computeVertexNormals();
  return geo;
}

const cliffGeo = createCliffGeometry();
const cliffMat = new THREE.MeshStandardMaterial({
  color: 0x4a6a4a,
  roughness: 0.9,
  metalness: 0.1,
  flatShading: false,
});
const cliff = new THREE.Mesh(cliffGeo, cliffMat);
cliff.name = 'mainCliff';
cliff.rotation.x = -Math.PI / 2;
cliff.receiveShadow = true;
scene.add(cliff);

// Rock formations
function addRocks() {
  const rockGeo = new THREE.DodecahedronGeometry(1, 1);
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x5a5a5a, roughness: 0.95, metalness: 0.05 });

  const positions = [
    [-8, 17, -10], [-12, 19, 5], [-6, 18, -5], [18, 11, -8], [20, 12, 3],
    [3, 0, 15], [8, 0, 18], [-3, 0, 20], [5, 0, -18], [-5, 0, -15],
    [-10, 19, 12], [22, 13, -12], [-7, 17, 15], [16, 10, 10],
  ];

  positions.forEach((p, i) => {
    const s = 0.8 + Math.random() * 2.5;
    const rock = new THREE.Mesh(rockGeo, rockMat);
    rock.name = `rock${i}`;
    rock.position.set(p[0], p[1], p[2]);
    rock.scale.set(s, s * 0.6, s);
    rock.rotation.set(Math.random(), Math.random(), Math.random());
    rock.castShadow = true;
    rock.receiveShadow = true;
    scene.add(rock);
  });
}
addRocks();

// =================== WATERFALL PARTICLES ===================
const waterfallCount = 8000;
const waterfallGeo = new THREE.BufferGeometry();
const wfPositions = new Float32Array(waterfallCount * 3);
const wfVelocities = new Float32Array(waterfallCount * 3);
const wfAlphas = new Float32Array(waterfallCount);
const wfSizes = new Float32Array(waterfallCount);

function initWaterfallParticle(i) {
  // Spawn along cliff edge
  const y = (Math.random() - 0.5) * 30;
  wfPositions[i * 3] = -1 + Math.sin(y * 0.15) * 3 + (Math.random() - 0.5) * 2;
  wfPositions[i * 3 + 1] = 16 + Math.random() * 4;
  wfPositions[i * 3 + 2] = y;

  wfVelocities[i * 3] = 0.02 + Math.random() * 0.03;
  wfVelocities[i * 3 + 1] = -0.05 - Math.random() * 0.1;
  wfVelocities[i * 3 + 2] = (Math.random() - 0.5) * 0.02;

  wfAlphas[i] = 0.6 + Math.random() * 0.4;
  wfSizes[i] = 0.2 + Math.random() * 0.4;
}

for (let i = 0; i < waterfallCount; i++) {
  initWaterfallParticle(i);
  wfPositions[i * 3 + 1] = Math.random() * 20;
}

waterfallGeo.setAttribute('position', new THREE.BufferAttribute(wfPositions, 3));
waterfallGeo.setAttribute('alpha', new THREE.BufferAttribute(wfAlphas, 1));
waterfallGeo.setAttribute('size', new THREE.BufferAttribute(wfSizes, 1));

const waterfallMat = new THREE.ShaderMaterial({
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  uniforms: { time: { value: 0 } },
  vertexShader: `
    attribute float alpha;
    attribute float size;
    varying float vAlpha;
    void main() {
      vAlpha = alpha;
      vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
      gl_PointSize = size * (200.0 / -mvPos.z);
      gl_Position = projectionMatrix * mvPos;
    }
  `,
  fragmentShader: `
    varying float vAlpha;
    void main() {
      float d = length(gl_PointCoord - 0.5);
      if (d > 0.5) discard;
      float a = smoothstep(0.5, 0.1, d) * vAlpha;
      gl_FragColor = vec4(0.7, 0.85, 1.0, a * 0.6);
    }
  `,
});

const waterfallParticles = new THREE.Points(waterfallGeo, waterfallMat);
waterfallParticles.name = 'waterfallParticles';
scene.add(waterfallParticles);

// =================== SECOND WATERFALL (right side) ===================
const wf2Count = 5000;
const wf2Geo = new THREE.BufferGeometry();
const wf2Pos = new Float32Array(wf2Count * 3);
const wf2Vel = new Float32Array(wf2Count * 3);
const wf2Alpha = new Float32Array(wf2Count);
const wf2Size = new Float32Array(wf2Count);

function initWF2Particle(i) {
  const y = (Math.random() - 0.5) * 20;
  wf2Pos[i * 3] = 15 + Math.sin(y * 0.12) * 2 + (Math.random() - 0.5);
  wf2Pos[i * 3 + 1] = 8 + Math.random() * 4;
  wf2Pos[i * 3 + 2] = y;

  wf2Vel[i * 3] = -0.02 - Math.random() * 0.02;
  wf2Vel[i * 3 + 1] = -0.04 - Math.random() * 0.08;
  wf2Vel[i * 3 + 2] = (Math.random() - 0.5) * 0.015;

  wf2Alpha[i] = 0.5 + Math.random() * 0.5;
  wf2Size[i] = 0.15 + Math.random() * 0.35;
}

for (let i = 0; i < wf2Count; i++) {
  initWF2Particle(i);
  wf2Pos[i * 3 + 1] = Math.random() * 12;
}

wf2Geo.setAttribute('position', new THREE.BufferAttribute(wf2Pos, 3));
wf2Geo.setAttribute('alpha', new THREE.BufferAttribute(wf2Alpha, 1));
wf2Geo.setAttribute('size', new THREE.BufferAttribute(wf2Size, 1));

const wf2Particles = new THREE.Points(wf2Geo, waterfallMat);
wf2Particles.name = 'waterfallParticles2';
scene.add(wf2Particles);

// =================== RIVER / POOL WATER ===================
const waterGeo = new THREE.PlaneGeometry(30, 60, 64, 64);
const waterMat = new THREE.ShaderMaterial({
  transparent: true,
  uniforms: { time: { value: 0 } },
  vertexShader: `
    uniform float time;
    varying vec2 vUv;
    varying vec3 vWorldPos;
    void main() {
      vUv = uv;
      vec3 pos = position;
      pos.z += sin(pos.x * 2.0 + time * 2.0) * 0.15;
      pos.z += cos(pos.y * 1.5 + time * 1.5) * 0.1;
      pos.z += sin(pos.x * 4.0 + pos.y * 3.0 + time * 3.0) * 0.05;
      vec4 worldPos = modelMatrix * vec4(pos, 1.0);
      vWorldPos = worldPos.xyz;
      gl_Position = projectionMatrix * viewMatrix * worldPos;
    }
  `,
  fragmentShader: `
    uniform float time;
    varying vec2 vUv;
    varying vec3 vWorldPos;
    void main() {
      vec2 uv = vUv;
      float wave1 = sin(uv.x * 20.0 + time * 2.0) * 0.5 + 0.5;
      float wave2 = sin(uv.y * 15.0 - time * 1.8) * 0.5 + 0.5;
      float wave3 = sin((uv.x + uv.y) * 12.0 + time * 2.5) * 0.5 + 0.5;
      float pattern = (wave1 + wave2 + wave3) / 3.0;

      vec3 deepColor = vec3(0.05, 0.15, 0.35);
      vec3 shallowColor = vec3(0.15, 0.45, 0.65);
      vec3 foamColor = vec3(0.7, 0.85, 0.95);

      vec3 color = mix(deepColor, shallowColor, pattern);
      float foam = smoothstep(0.75, 0.85, pattern);
      color = mix(color, foamColor, foam * 0.5);

      // Shimmer
      float shimmer = sin(uv.x * 40.0 + time * 4.0) * sin(uv.y * 30.0 - time * 3.0);
      shimmer = smoothstep(0.8, 1.0, shimmer) * 0.3;
      color += shimmer;

      float alpha = 0.75 + pattern * 0.15;
      gl_FragColor = vec4(color, alpha);
    }
  `,
});

const water = new THREE.Mesh(waterGeo, waterMat);
water.name = 'riverWater';
water.rotation.x = -Math.PI / 2;
water.position.set(6, -0.5, 0);
scene.add(water);

// =================== MIST PARTICLES ===================
const mistCount = 3000;
const mistGeo = new THREE.BufferGeometry();
const mistPos = new Float32Array(mistCount * 3);
const mistAlpha = new Float32Array(mistCount);
const mistSize = new Float32Array(mistCount);
const mistPhase = new Float32Array(mistCount);

for (let i = 0; i < mistCount; i++) {
  mistPos[i * 3] = (Math.random() - 0.5) * 40;
  mistPos[i * 3 + 1] = Math.random() * 5;
  mistPos[i * 3 + 2] = (Math.random() - 0.5) * 40;
  mistAlpha[i] = 0.1 + Math.random() * 0.3;
  mistSize[i] = 1.0 + Math.random() * 3.0;
  mistPhase[i] = Math.random() * Math.PI * 2;
}

mistGeo.setAttribute('position', new THREE.BufferAttribute(mistPos, 3));
mistGeo.setAttribute('alpha', new THREE.BufferAttribute(mistAlpha, 1));
mistGeo.setAttribute('size', new THREE.BufferAttribute(mistSize, 1));

const mistMat = new THREE.ShaderMaterial({
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  uniforms: { time: { value: 0 } },
  vertexShader: `
    attribute float alpha;
    attribute float size;
    uniform float time;
    varying float vAlpha;
    void main() {
      vAlpha = alpha;
      vec3 pos = position;
      pos.y += sin(time * 0.5 + position.x * 0.1) * 0.5;
      pos.x += sin(time * 0.3 + position.z * 0.05) * 0.3;
      vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
      gl_PointSize = size * (300.0 / -mvPos.z);
      gl_Position = projectionMatrix * mvPos;
    }
  `,
  fragmentShader: `
    varying float vAlpha;
    void main() {
      float d = length(gl_PointCoord - 0.5);
      if (d > 0.5) discard;
      float a = smoothstep(0.5, 0.0, d) * vAlpha * 0.4;
      gl_FragColor = vec4(0.6, 0.8, 1.0, a);
    }
  `,
});

const mist = new THREE.Points(mistGeo, mistMat);
mist.name = 'mistParticles';
scene.add(mist);

// =================== SPLASH PARTICLES AT BASE ===================
const splashCount = 2000;
const splashGeo = new THREE.BufferGeometry();
const splashPos = new Float32Array(splashCount * 3);
const splashVel = new Float32Array(splashCount * 3);
const splashAlpha = new Float32Array(splashCount);
const splashSize = new Float32Array(splashCount);
const splashLife = new Float32Array(splashCount);

function initSplashParticle(i) {
  const side = Math.random() > 0.5 ? 0 : 1;
  if (side === 0) {
    splashPos[i * 3] = -1 + (Math.random() - 0.5) * 4;
    splashPos[i * 3 + 2] = (Math.random() - 0.5) * 25;
  } else {
    splashPos[i * 3] = 15 + (Math.random() - 0.5) * 3;
    splashPos[i * 3 + 2] = (Math.random() - 0.5) * 18;
  }
  splashPos[i * 3 + 1] = Math.random() * 3;

  splashVel[i * 3] = (Math.random() - 0.5) * 0.1;
  splashVel[i * 3 + 1] = 0.05 + Math.random() * 0.15;
  splashVel[i * 3 + 2] = (Math.random() - 0.5) * 0.1;

  splashAlpha[i] = 0.5 + Math.random() * 0.5;
  splashSize[i] = 0.1 + Math.random() * 0.3;
  splashLife[i] = Math.random();
}

for (let i = 0; i < splashCount; i++) {
  initSplashParticle(i);
}

splashGeo.setAttribute('position', new THREE.BufferAttribute(splashPos, 3));
splashGeo.setAttribute('alpha', new THREE.BufferAttribute(splashAlpha, 1));
splashGeo.setAttribute('size', new THREE.BufferAttribute(splashSize, 1));

const splashParticles = new THREE.Points(splashGeo, waterfallMat);
splashParticles.name = 'splashParticles';
scene.add(splashParticles);

// =================== VEGETATION ===================
function addTrees() {
  const trunkGeo = new THREE.CylinderGeometry(0.15, 0.25, 3, 6);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4a3520, roughness: 0.9 });
  const leafGeo = new THREE.SphereGeometry(1.2, 8, 6);
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x2d5a27, roughness: 0.8 });

  const treePositions = [
    [-12, 20, -12], [-15, 21, 0], [-10, 19, 8], [-14, 20, -5],
    [-8, 18, 12], [-13, 20, 15], [-16, 22, 10], [-11, 19, -15],
    [22, 14, -5], [20, 12, 8], [24, 15, 0], [19, 11, -10],
  ];

  treePositions.forEach((p, i) => {
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.name = `trunk${i}`;
    trunk.position.set(p[0], p[1] + 1.5, p[2]);
    trunk.castShadow = true;
    scene.add(trunk);

    const leaves = new THREE.Mesh(leafGeo, leafMat);
    leaves.name = `leaves${i}`;
    const s = 0.8 + Math.random() * 0.6;
    leaves.scale.set(s, s * 1.2, s);
    leaves.position.set(p[0], p[1] + 3.5, p[2]);
    leaves.castShadow = true;
    scene.add(leaves);
  });
}
addTrees();

// =================== FIREFLIES ===================
const fireflyCount = 100;
const fireflyGeo = new THREE.BufferGeometry();
const ffPos = new Float32Array(fireflyCount * 3);
const ffPhase = new Float32Array(fireflyCount);

for (let i = 0; i < fireflyCount; i++) {
  ffPos[i * 3] = (Math.random() - 0.5) * 50;
  ffPos[i * 3 + 1] = 2 + Math.random() * 20;
  ffPos[i * 3 + 2] = (Math.random() - 0.5) * 50;
  ffPhase[i] = Math.random() * Math.PI * 2;
}

fireflyGeo.setAttribute('position', new THREE.BufferAttribute(ffPos, 3));

const fireflyMat = new THREE.ShaderMaterial({
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  uniforms: { time: { value: 0 } },
  vertexShader: `
    uniform float time;
    varying float vBrightness;
    void main() {
      vec3 pos = position;
      float phase = pos.x * 0.5 + pos.z * 0.3;
      pos.x += sin(time * 0.7 + phase) * 0.5;
      pos.y += cos(time * 0.5 + phase * 1.3) * 0.3;
      pos.z += sin(time * 0.6 + phase * 0.7) * 0.4;
      vBrightness = (sin(time * 3.0 + phase * 2.0) * 0.5 + 0.5);
      vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
      gl_PointSize = (3.0 + vBrightness * 4.0) * (150.0 / -mvPos.z);
      gl_Position = projectionMatrix * mvPos;
    }
  `,
  fragmentShader: `
    varying float vBrightness;
    void main() {
      float d = length(gl_PointCoord - 0.5);
      if (d > 0.5) discard;
      float glow = smoothstep(0.5, 0.0, d);
      vec3 color = mix(vec3(0.2, 0.8, 0.3), vec3(1.0, 1.0, 0.5), glow);
      gl_FragColor = vec4(color, glow * vBrightness * 0.8);
    }
  `,
});

const fireflies = new THREE.Points(fireflyGeo, fireflyMat);
fireflies.name = 'fireflies';
scene.add(fireflies);

// =================== ANIMATION LOOP ===================
const clock = new THREE.Clock();
const gravity = -0.008;

function animate() {
  const elapsed = clock.getElapsedTime();
  const dt = clock.getDelta();

  // Update uniforms
  waterfallMat.uniforms.time.value = elapsed;
  waterMat.uniforms.time.value = elapsed;
  mistMat.uniforms.time.value = elapsed;
  fireflyMat.uniforms.time.value = elapsed;

  // Update waterfall 1
  const wfPos = waterfallGeo.attributes.position;
  for (let i = 0; i < waterfallCount; i++) {
    let x = wfPos.getX(i) + wfVelocities[i * 3];
    let y = wfPos.getY(i) + wfVelocities[i * 3 + 1];
    let z = wfPos.getZ(i) + wfVelocities[i * 3 + 2];

    wfVelocities[i * 3 + 1] += gravity;

    if (y < -1) {
      initWaterfallParticle(i);
    }

    wfPos.setXYZ(i, x, y, z);
  }
  wfPos.needsUpdate = true;

  // Update waterfall 2
  const w2Pos = wf2Geo.attributes.position;
  for (let i = 0; i < wf2Count; i++) {
    let x = w2Pos.getX(i) + wf2Vel[i * 3];
    let y = w2Pos.getY(i) + wf2Vel[i * 3 + 1];
    let z = w2Pos.getZ(i) + wf2Vel[i * 3 + 2];

    wf2Vel[i * 3 + 1] += gravity;

    if (y < -1) {
      initWF2Particle(i);
    }

    w2Pos.setXYZ(i, x, y, z);
  }
  w2Pos.needsUpdate = true;

  // Update splash
  const spPos = splashGeo.attributes.position;
  for (let i = 0; i < splashCount; i++) {
    splashLife[i] += 0.015;
    if (splashLife[i] > 1) {
      initSplashParticle(i);
      splashLife[i] = 0;
    }

    let x = spPos.getX(i) + splashVel[i * 3];
    let y = spPos.getY(i) + splashVel[i * 3 + 1];
    let z = spPos.getZ(i) + splashVel[i * 3 + 2];

    splashVel[i * 3 + 1] -= 0.003;

    if (y < 0) {
      y = 0;
      splashVel[i * 3 + 1] *= -0.3;
    }

    spPos.setXYZ(i, x, y, z);
  }
  spPos.needsUpdate = true;

  controls.update();
  renderer.render(scene, camera);
}

renderer.setAnimationLoop(animate);

// Handle resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});