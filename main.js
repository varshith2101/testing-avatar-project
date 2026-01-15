import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// Global state
let faceLandmarker;
let video;
let scene, camera, renderer, avatar, headBone, controls;
let morphMeshes = [];
let lastVideoTime = -1;
let debugMode = false;
let debugCanvas, debugCtx;

// Smoothed values
let smoothedBlink = { left: 1, right: 1 };
let smoothedMouth = 0;

// Breathing animation
let breathingTime = 0;

// Status elements
const statusEl = document.getElementById('status');
const loadingEl = document.getElementById('loading');
const videoFeedEl = document.getElementById('video-feed');

async function initialize() {
  try {
    // Step 1: Initialize webcam
    updateStatus('Requesting camera access...');
    video = document.getElementById('webcam');
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 640, height: 480, facingMode: 'user' }
    });
    video.srcObject = stream;
    await video.play();
    videoFeedEl.style.display = 'block';
    console.log('[Init] Webcam ready');

    // Step 2: Initialize MediaPipe
    updateStatus('Loading face detection...');
    const filesetResolver = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
    );
    
    faceLandmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
      baseOptions: {
        modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
        delegate: 'GPU'
      },
      runningMode: 'VIDEO',
      numFaces: 1,
      outputFaceBlendshapes: true,
      outputFacialTransformationMatrixes: true
    });
    console.log('[Init] Face landmarker ready');

    // Step 3: Initialize Three.js scene
    updateStatus('Loading 3D avatar...');
    initThreeJS();
    await loadAvatar();
    
    // Step 4: Setup debug canvas
    setupDebugCanvas();

    // Step 5: Setup UI controls
    setupControls();

    // Step 6: Start tracking loop
    updateStatus('Ready');
    loadingEl.style.display = 'none';
    trackFace();

  } catch (error) {
    console.error('[Init] Error:', error);
    updateStatus(`Error: ${error.message}`);
  }
}

function setupDebugCanvas() {
  debugCanvas = document.createElement('canvas');
  debugCanvas.id = 'debug-canvas';
  debugCanvas.width = 240;
  debugCanvas.height = 180;
  debugCanvas.style.cssText = 'position:absolute;top:0;left:0;pointer-events:none;display:none;';
  debugCtx = debugCanvas.getContext('2d');
  videoFeedEl.appendChild(debugCanvas);
}

function setupControls() {
  // Create control panel
  const controlPanel = document.createElement('div');
  controlPanel.style.cssText = 'position:fixed;top:60px;left:20px;background:rgba(0,0,0,0.8);color:white;padding:12px;border-radius:8px;font-size:14px;z-index:100;';
  controlPanel.innerHTML = `
    <label style="display:block;margin-bottom:8px;cursor:pointer;">
      <input type="checkbox" id="debug-toggle" style="margin-right:8px;">
      Debug Mode (show landmarks)
    </label>
  `;
  document.body.appendChild(controlPanel);

  // Debug mode toggle
  document.getElementById('debug-toggle').addEventListener('change', (e) => {
    debugMode = e.target.checked;
    debugCanvas.style.display = debugMode ? 'block' : 'none';
  });
}

function initThreeJS() {
  const canvas = document.getElementById('canvas');
  
  // Scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1a2e);
  
  // Camera
  camera = new THREE.PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(0, 1, 4);
  camera.lookAt(0, 0.5, 0);
  
  // Renderer
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  
  // Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);
  
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(5, 5, 5);
  scene.add(directionalLight);
  
  const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
  fillLight.position.set(-3, 0, -5);
  scene.add(fillLight);

  // OrbitControls - full rotation allowed
  controls = new OrbitControls(camera, canvas);
  controls.target.set(0, 0.5, 0);
  controls.enablePan = false; // No panning
  controls.enableRotate = true; // Full rotation allowed
  controls.enableZoom = true; // Zoom allowed
  controls.minDistance = 2; // Closest zoom
  controls.maxDistance = 8; // Farthest zoom
  controls.minPolarAngle = 0; // Allow full vertical rotation
  controls.maxPolarAngle = Math.PI; // Allow full vertical rotation
  controls.update();

  // Handle resize
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // Start render loop
  animate();

  console.log('[Three.js] Scene initialized');
}

async function loadAvatar() {
  const loader = new GLTFLoader();

  const avatarUrl = 'https://models.readyplayer.me/64bfa15f0e72c63d7c3934a6.glb';

  return new Promise((resolve, reject) => {
    loader.load(
      avatarUrl,
      (gltf) => {
        avatar = gltf.scene;
        avatar.position.set(0, -1.5, 0);
        avatar.scale.set(1, 1, 1);
        scene.add(avatar);

        // Find head bone and morph meshes
        avatar.traverse((child) => {
          if (child.isBone && child.name.toLowerCase().includes('head')) {
            if (!child.name.toLowerCase().includes('end')) {
              headBone = child;
            }
          }

          // Find meshes with morph targets for facial expressions
          if (child.isMesh && child.morphTargetInfluences && child.morphTargetDictionary) {
            morphMeshes.push(child);
          }
        });

        console.log('[Avatar] Loaded. Head bone:', headBone?.name);
        console.log('[Avatar] Morph meshes found:', morphMeshes.length);
        resolve();
      },
      undefined,
      reject
    );
  });
}

function trackFace() {
  function detectFace() {
    if (!faceLandmarker || !video) return;

    const nowInMs = Date.now();

    // Only process if new frame
    if (video.currentTime !== lastVideoTime) {
      lastVideoTime = video.currentTime;

      const results = faceLandmarker.detectForVideo(video, nowInMs);

      if (results.faceLandmarks && results.faceLandmarks.length > 0) {
        updateStatus('Face Detected', true);
        updateAvatar(results);

        // Draw debug landmarks
        if (debugMode) {
          drawLandmarks(results.faceLandmarks[0]);
        }
      } else {
        updateStatus('No face detected');
        if (debugMode) {
          clearDebugCanvas();
        }
      }
    }

    requestAnimationFrame(detectFace);
  }

  detectFace();
}

function drawLandmarks(landmarks) {
  if (!debugCtx) return;

  const width = debugCanvas.width;
  const height = debugCanvas.height;

  // Clear canvas
  debugCtx.clearRect(0, 0, width, height);

  // Draw all landmarks as dots
  debugCtx.fillStyle = '#00FF00';
  landmarks.forEach((landmark) => {
    const x = landmark.x * width;
    const y = landmark.y * height;
    debugCtx.beginPath();
    debugCtx.arc(x, y, 1.5, 0, 2 * Math.PI);
    debugCtx.fill();
  });

  // Draw key landmarks larger
  const keyPoints = [1, 33, 263, 61, 291, 13, 14, 152]; // nose, eyes, mouth corners, etc
  debugCtx.fillStyle = '#FF0000';
  keyPoints.forEach((idx) => {
    const landmark = landmarks[idx];
    if (landmark) {
      const x = landmark.x * width;
      const y = landmark.y * height;
      debugCtx.beginPath();
      debugCtx.arc(x, y, 3, 0, 2 * Math.PI);
      debugCtx.fill();
    }
  });
}

function clearDebugCanvas() {
  if (debugCtx) {
    debugCtx.clearRect(0, 0, debugCanvas.width, debugCanvas.height);
  }
}

function updateAvatar(results) {
  if (!headBone || !results.faceLandmarks || results.faceLandmarks.length === 0) return;

  const landmarks = results.faceLandmarks[0];
  const lerp = (a, b, t) => a + (b - a) * t;

  // ===== HEAD ROTATION =====
  const noseTip = landmarks[1];
  const leftEye = landmarks[33];
  const rightEye = landmarks[263];
  const chin = landmarks[152];

  // Calculate yaw (left/right)
  const eyeCenterX = (leftEye.x + rightEye.x) / 2;
  const yaw = (noseTip.x - eyeCenterX) * 4;

  // Calculate pitch (up/down) with upward offset
  const pitch = (noseTip.y - 0.5) * 2 - 0.3; // -0.3 makes head look more upward

  // Calculate roll (tilt)
  const eyeDeltaY = rightEye.y - leftEye.y;
  const eyeDeltaX = rightEye.x - leftEye.x;
  const roll = Math.atan2(eyeDeltaY, eyeDeltaX);

  // Apply rotation with smoothing
  headBone.rotation.x = lerp(headBone.rotation.x, pitch, 0.2);
  headBone.rotation.y = lerp(headBone.rotation.y, yaw, 0.2);
  headBone.rotation.z = lerp(headBone.rotation.z, roll, 0.2);

  // ===== FACIAL EXPRESSIONS =====
  // Calculate eye openness
  const leftEyeTop = landmarks[159];
  const leftEyeBottom = landmarks[145];
  const leftEyeDist = Math.abs(leftEyeTop.y - leftEyeBottom.y);

  const rightEyeTop = landmarks[386];
  const rightEyeBottom = landmarks[374];
  const rightEyeDist = Math.abs(rightEyeTop.y - rightEyeBottom.y);

  const leftEyeOpen = leftEyeDist > 0.01 ? 1.0 : 0.0;
  const rightEyeOpen = rightEyeDist > 0.01 ? 1.0 : 0.0;

  // Calculate mouth openness
  const mouthTop = landmarks[13];
  const mouthBottom = landmarks[14];
  const mouthHeight = Math.abs(mouthTop.y - mouthBottom.y);
  const mouthOpen = Math.min(mouthHeight * 15, 1.0);

  // Smooth the values
  smoothedBlink.left = lerp(smoothedBlink.left, leftEyeOpen, 0.3);
  smoothedBlink.right = lerp(smoothedBlink.right, rightEyeOpen, 0.3);
  smoothedMouth = lerp(smoothedMouth, mouthOpen, 0.25);

  // Apply morph targets
  morphMeshes.forEach((mesh) => {
    if (!mesh.morphTargetInfluences || !mesh.morphTargetDictionary) return;

    // Eye blinks
    const leftBlinkIdx = findMorphIndex(mesh, ['eyeBlinkLeft', 'eyeBlink_L']);
    const rightBlinkIdx = findMorphIndex(mesh, ['eyeBlinkRight', 'eyeBlink_R']);

    if (leftBlinkIdx >= 0) {
      mesh.morphTargetInfluences[leftBlinkIdx] = 1.0 - smoothedBlink.left;
    }
    if (rightBlinkIdx >= 0) {
      mesh.morphTargetInfluences[rightBlinkIdx] = 1.0 - smoothedBlink.right;
    }

    // Mouth open
    const mouthOpenIdx = findMorphIndex(mesh, ['mouthOpen', 'jawOpen']);
    if (mouthOpenIdx >= 0) {
      mesh.morphTargetInfluences[mouthOpenIdx] = smoothedMouth;
    }
  });
}

function findMorphIndex(mesh, names) {
  for (const name of names) {
    const index = mesh.morphTargetDictionary[name];
    if (index !== undefined) return index;
  }
  return -1;
}

function animate() {
  requestAnimationFrame(animate);

  // Breathing animation
  if (avatar) {
    breathingTime += 0.01;
    const breathScale = 1 + Math.sin(breathingTime) * 0.01; // Subtle chest movement
    avatar.scale.y = breathScale;
  }

  // Update controls
  if (controls) {
    controls.update();
  }

  renderer.render(scene, camera);
}

function updateStatus(message, active = false) {
  statusEl.textContent = message;
  statusEl.className = active ? 'active' : '';
}

// Start the app
initialize();
