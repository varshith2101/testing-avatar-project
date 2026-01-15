import { FaceLandmarker, HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// ============================================================================
// PARTICLE SYSTEMS
// ============================================================================

/**
 * Confetti Particle System - Triggered by wave gesture
 * Creates colorful particles that explode outward with gravity
 */
class ConfettiParticles {
  constructor(scene) {
    this.scene = scene;
    this.particles = [];
    this.colors = [0xff6b6b, 0x4ecdc4, 0xffe66d, 0x95e1d3, 0xff8c42, 0xa8e6cf, 0xff8b94];
    this.pool = []; // Object pool for performance
  }

  trigger(position) {
    const count = 60 + Math.random() * 30; // 60-90 particles

    for (let i = 0; i < count; i++) {
      const geometry = new THREE.SphereGeometry(0.03 + Math.random() * 0.03, 6, 6);
      const material = new THREE.MeshBasicMaterial({
        color: this.colors[Math.floor(Math.random() * this.colors.length)],
        transparent: true,
        opacity: 1
      });
      const mesh = new THREE.Mesh(geometry, material);

      // Random position around trigger point
      mesh.position.copy(position);
      mesh.position.x += (Math.random() - 0.5) * 0.5;
      mesh.position.y += (Math.random() - 0.5) * 0.5;
      mesh.position.z += (Math.random() - 0.5) * 0.5;

      // Random velocity (outward explosion)
      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 0.15,
        Math.random() * 0.15 + 0.05,
        (Math.random() - 0.5) * 0.15
      );

      const particle = {
        mesh,
        velocity,
        age: 0,
        lifetime: 2 + Math.random() * 1, // 2-3 seconds
        rotation: new THREE.Vector3(
          Math.random() * 0.2,
          Math.random() * 0.2,
          Math.random() * 0.2
        )
      };

      this.scene.add(mesh);
      this.particles.push(particle);
    }
  }

  update(deltaTime) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.age += deltaTime;

      if (p.age >= p.lifetime) {
        // Remove dead particle
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        p.mesh.material.dispose();
        this.particles.splice(i, 1);
        continue;
      }

      // Apply gravity
      p.velocity.y -= 0.4 * deltaTime;

      // Update position
      p.mesh.position.x += p.velocity.x;
      p.mesh.position.y += p.velocity.y;
      p.mesh.position.z += p.velocity.z;

      // Rotate
      p.mesh.rotation.x += p.rotation.x;
      p.mesh.rotation.y += p.rotation.y;
      p.mesh.rotation.z += p.rotation.z;

      // Fade out
      const lifeRatio = p.age / p.lifetime;
      p.mesh.material.opacity = 1 - lifeRatio;
    }
  }

  clear() {
    this.particles.forEach(p => {
      this.scene.remove(p.mesh);
      p.mesh.geometry.dispose();
      p.mesh.material.dispose();
    });
    this.particles = [];
  }
}

/**
 * Sparkle Particle System - Triggered by thumbs up gesture
 * Creates gold/yellow sparkles that spiral outward
 */
class SparkleParticles {
  constructor(scene) {
    this.scene = scene;
    this.particles = [];
  }

  trigger(position) {
    const count = 40 + Math.random() * 20; // 40-60 particles

    for (let i = 0; i < count; i++) {
      const geometry = new THREE.SphereGeometry(0.02 + Math.random() * 0.02, 6, 6);
      const color = Math.random() > 0.5 ? 0xffd700 : 0xffed4e; // Gold colors
      const material = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 1
      });
      const mesh = new THREE.Mesh(geometry, material);

      mesh.position.copy(position);

      const angle = (i / count) * Math.PI * 2;
      const particle = {
        mesh,
        angle,
        radius: 0,
        speed: 0.02 + Math.random() * 0.02,
        age: 0,
        lifetime: 1.5, // 1.5 seconds
        baseScale: 0.5 + Math.random() * 0.5,
        centerPos: position.clone()
      };

      this.scene.add(mesh);
      this.particles.push(particle);
    }
  }

  update(deltaTime) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.age += deltaTime;

      if (p.age >= p.lifetime) {
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        p.mesh.material.dispose();
        this.particles.splice(i, 1);
        continue;
      }

      // Spiral outward motion
      p.angle += p.speed;
      p.radius += 0.02;

      p.mesh.position.x = p.centerPos.x + Math.cos(p.angle) * p.radius;
      p.mesh.position.y = p.centerPos.y + Math.sin(p.angle) * p.radius * 0.5 + p.age * 0.3;
      p.mesh.position.z = p.centerPos.z + Math.sin(p.angle) * p.radius;

      // Pulsing scale
      const pulse = Math.sin(p.age * 10) * 0.3 + 0.7;
      const scale = p.baseScale * pulse;
      p.mesh.scale.set(scale, scale, scale);

      // Fade out
      const lifeRatio = p.age / p.lifetime;
      p.mesh.material.opacity = 1 - lifeRatio;
    }
  }

  clear() {
    this.particles.forEach(p => {
      this.scene.remove(p.mesh);
      p.mesh.geometry.dispose();
      p.mesh.material.dispose();
    });
    this.particles = [];
  }
}

/**
 * Ambient Particles - Background floating effect for depth
 */
class AmbientParticles {
  constructor(scene) {
    this.scene = scene;
    this.particles = [];
    this.enabled = true;

    this.init();
  }

  init() {
    const count = 120;
    const geometry = new THREE.SphereGeometry(0.02, 4, 4);

    for (let i = 0; i < count; i++) {
      const material = new THREE.MeshBasicMaterial({
        color: 0x88ccff,
        transparent: true,
        opacity: 0.3 + Math.random() * 0.2
      });
      const mesh = new THREE.Mesh(geometry, material);

      // Position in background space
      mesh.position.x = (Math.random() - 0.5) * 10;
      mesh.position.y = (Math.random() - 0.5) * 6;
      mesh.position.z = -5 - Math.random() * 3; // Behind avatar

      const particle = {
        mesh,
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.01,
          0.01 + Math.random() * 0.01,
          0
        ),
        initialY: mesh.position.y,
        baseOpacity: material.opacity
      };

      this.scene.add(mesh);
      this.particles.push(particle);
    }
  }

  update(deltaTime) {
    if (!this.enabled) return;

    this.particles.forEach(p => {
      // Float upward and drift
      p.mesh.position.x += p.velocity.x;
      p.mesh.position.y += p.velocity.y;
      p.mesh.position.z += p.velocity.z;

      // Wrap around when too high
      if (p.mesh.position.y > 4) {
        p.mesh.position.y = -4;
      }

      // Subtle opacity pulsing
      const time = Date.now() * 0.001;
      p.mesh.material.opacity = p.baseOpacity + Math.sin(time + p.mesh.position.x) * 0.1;
    });
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    this.particles.forEach(p => {
      p.mesh.visible = enabled;
    });
  }

  clear() {
    this.particles.forEach(p => {
      this.scene.remove(p.mesh);
      p.mesh.geometry.dispose();
      p.mesh.material.dispose();
    });
    this.particles = [];
  }
}

// ============================================================================
// TRACKING SYSTEMS
// ============================================================================

/**
 * Face Tracking System
 * Handles face detection and landmark extraction using MediaPipe
 */
class FaceTracker {
  constructor() {
    this.landmarker = null;
    this.lastResults = null;
  }

  async initialize(filesetResolver) {
    this.landmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
      baseOptions: {
        modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
        delegate: 'GPU'
      },
      runningMode: 'VIDEO',
      numFaces: 1,
      outputFaceBlendshapes: true,
      outputFacialTransformationMatrixes: true
    });
  }

  /**
   * Detect face in video frame
   * @param {HTMLVideoElement} video - Video element
   * @param {number} timestamp - Timestamp in milliseconds
   * @returns {Object|null} Detection results
   */
  detectFace(video, timestamp) {
    if (!this.landmarker) return null;

    const results = this.landmarker.detectForVideo(video, timestamp);
    this.lastResults = results;
    return results;
  }

  getLandmarks() {
    if (!this.lastResults || !this.lastResults.faceLandmarks) return null;
    return this.lastResults.faceLandmarks[0];
  }

  hasFace() {
    return this.lastResults &&
           this.lastResults.faceLandmarks &&
           this.lastResults.faceLandmarks.length > 0;
  }
}

/**
 * Hand Tracking System
 * Handles hand detection and gesture recognition using MediaPipe
 */
class HandTracker {
  constructor() {
    this.landmarker = null;
    this.lastResults = null;
    this.wristHistory = []; // For wave detection
    this.maxHistoryLength = 15;
    this.lastWaveTime = 0;
    this.lastThumbsUpTime = 0;
    this.gestureThrottle = 2000; // 2 seconds between same gestures
    this.enabled = false; // Throttle hand detection
    this.frameCount = 0;
  }

  async initialize(filesetResolver) {
    this.landmarker = await HandLandmarker.createFromOptions(filesetResolver, {
      baseOptions: {
        modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
        delegate: 'GPU'
      },
      runningMode: 'VIDEO',
      numHands: 2,
      minHandDetectionConfidence: 0.5,
      minHandPresenceConfidence: 0.5,
      minTrackingConfidence: 0.5
    });
    this.enabled = true;
  }

  /**
   * Detect hands in video frame (throttled to every 2 frames for performance)
   */
  detectHands(video, timestamp) {
    if (!this.landmarker || !this.enabled) return null;

    // Throttle: only detect every 2 frames
    this.frameCount++;
    if (this.frameCount % 2 !== 0) return this.lastResults;

    try {
      const results = this.landmarker.detectForVideo(video, timestamp);
      this.lastResults = results;
      return results;
    } catch (error) {
      return null;
    }
  }

  getHandCount() {
    if (!this.lastResults || !this.lastResults.landmarks) return 0;
    return this.lastResults.landmarks.length;
  }

  /**
   * Detect wave gesture by tracking wrist movement
   * Wave = repeated left-right wrist movement with minimal vertical change
   * @returns {boolean} True if wave detected
   */
  detectWave() {
    if (!this.lastResults || !this.lastResults.landmarks || this.lastResults.landmarks.length === 0) {
      return false;
    }

    const now = Date.now();
    if (now - this.lastWaveTime < this.gestureThrottle) return false;

    const hand = this.lastResults.landmarks[0];
    const wrist = hand[0]; // Wrist is landmark 0

    // Add to history
    this.wristHistory.push({ x: wrist.x, y: wrist.y, time: now });
    if (this.wristHistory.length > this.maxHistoryLength) {
      this.wristHistory.shift();
    }

    // Need enough history (reduced from 15 to 12 for faster detection)
    if (this.wristHistory.length < 12) return false;

    // Check for oscillating X movement (left-right-left pattern)
    let directionChanges = 0;
    let lastDirection = 0;
    let maxVerticalChange = 0;

    for (let i = 1; i < this.wristHistory.length; i++) {
      const dx = this.wristHistory[i].x - this.wristHistory[i - 1].x;
      const dy = Math.abs(this.wristHistory[i].y - this.wristHistory[i - 1].y);

      maxVerticalChange = Math.max(maxVerticalChange, dy);

      const direction = dx > 0 ? 1 : dx < 0 ? -1 : 0;
      if (direction !== 0 && direction !== lastDirection && lastDirection !== 0) {
        directionChanges++;
      }
      lastDirection = direction;
    }

    // Calculate horizontal range
    const xValues = this.wristHistory.map(h => h.x);
    const xRange = Math.max(...xValues) - Math.min(...xValues);

    // Wave detected: More lenient thresholds
    // 2+ direction changes (reduced from 3), lower horizontal threshold (0.12 from 0.15), higher vertical tolerance (0.12 from 0.08)
    if (directionChanges >= 2 && xRange > 0.12 && maxVerticalChange < 0.12) {
      this.lastWaveTime = now;
      this.wristHistory = []; // Clear history
      console.log('[Wave] Detected! Changes:', directionChanges, 'Range:', xRange.toFixed(3), 'Vertical:', maxVerticalChange.toFixed(3));
      return true;
    }

    return false;
  }

  /**
   * Detect thumbs up gesture
   * Thumbs up = thumb extended upward, other fingers curled
   * @returns {boolean} True if thumbs up detected
   */
  detectThumbsUp() {
    if (!this.lastResults || !this.lastResults.landmarks || this.lastResults.landmarks.length === 0) {
      return false;
    }

    const now = Date.now();
    if (now - this.lastThumbsUpTime < this.gestureThrottle) return false;

    for (const hand of this.lastResults.landmarks) {
      // Key landmarks
      const wrist = hand[0];
      const thumbTip = hand[4];
      const thumbIp = hand[3];
      const indexTip = hand[8];
      const middleTip = hand[12];
      const ringTip = hand[16];
      const pinkyTip = hand[20];

      // Check thumb is extended upward
      const thumbExtended = thumbTip.y < wrist.y && thumbTip.y < thumbIp.y;

      // Check other fingers are curled (fingertips below wrist)
      const fingersCurled =
        indexTip.y > wrist.y - 0.1 &&
        middleTip.y > wrist.y - 0.1 &&
        ringTip.y > wrist.y - 0.1 &&
        pinkyTip.y > wrist.y - 0.1;

      if (thumbExtended && fingersCurled) {
        this.lastThumbsUpTime = now;
        return true;
      }
    }

    return false;
  }
}

/**
 * Avatar Controller
 * Manages avatar animations and facial expression mapping
 */
class AvatarController {
  constructor(avatar, headBone, morphMeshes) {
    this.avatar = avatar;
    this.headBone = headBone;
    this.morphMeshes = morphMeshes;

    // Smoothed values
    this.smoothedBlink = { left: 1, right: 1 };
    this.smoothedMouth = 0;
    this.smoothedSmile = 0;
    this.smoothedBrowRaise = 0;

    // Breathing animation
    this.breathingTime = 0;
  }

  /**
   * Linear interpolation helper
   */
  lerp(a, b, t) {
    return a + (b - a) * t;
  }

  /**
   * Calculate Eye Aspect Ratio (EAR) for better blink detection
   */
  calculateEAR(eyeLandmarks) {
    // EAR = (vertical1 + vertical2) / (2 * horizontal)
    const vertical1 = Math.abs(eyeLandmarks.top.y - eyeLandmarks.bottom.y);
    const vertical2 = Math.abs(eyeLandmarks.top2.y - eyeLandmarks.bottom2.y);
    const horizontal = Math.abs(eyeLandmarks.left.x - eyeLandmarks.right.x);

    return (vertical1 + vertical2) / (2 * horizontal);
  }

  /**
   * Update avatar from face tracking data
   */
  updateFromFaceData(landmarks) {
    if (!this.headBone || !landmarks) return;

    // ===== HEAD ROTATION =====
    const noseTip = landmarks[1];
    const leftEye = landmarks[33];
    const rightEye = landmarks[263];
    const chin = landmarks[152];

    // Calculate yaw (left/right)
    const eyeCenterX = (leftEye.x + rightEye.x) / 2;
    const yaw = (noseTip.x - eyeCenterX) * 4;

    // Calculate pitch (up/down)
    const pitch = (noseTip.y - 0.5) * 2 - 0.3;

    // Calculate roll (tilt)
    const eyeDeltaY = rightEye.y - leftEye.y;
    const eyeDeltaX = rightEye.x - leftEye.x;
    const roll = Math.atan2(eyeDeltaY, eyeDeltaX);

    // Apply rotation with smoothing
    this.headBone.rotation.x = this.lerp(this.headBone.rotation.x, pitch, 0.2);
    this.headBone.rotation.y = this.lerp(this.headBone.rotation.y, yaw, 0.2);
    this.headBone.rotation.z = this.lerp(this.headBone.rotation.z, roll, 0.2);

    // ===== EYE TRACKING (Enhanced with EAR) =====
    const leftEyeLandmarks = {
      top: landmarks[159],
      bottom: landmarks[145],
      left: landmarks[33],
      right: landmarks[133],
      top2: landmarks[158],
      bottom2: landmarks[153]
    };

    const rightEyeLandmarks = {
      top: landmarks[386],
      bottom: landmarks[374],
      left: landmarks[362],
      right: landmarks[263],
      top2: landmarks[385],
      bottom2: landmarks[380]
    };

    const leftEAR = this.calculateEAR(leftEyeLandmarks);
    const rightEAR = this.calculateEAR(rightEyeLandmarks);

    // EAR thresholds - adjusted for better detection
    // Use more sensitive thresholds and linear interpolation
    const leftEyeOpen = leftEAR > 0.2 ? 1.0 : leftEAR < 0.15 ? 0.0 : (leftEAR - 0.15) / 0.05;
    const rightEyeOpen = rightEAR > 0.2 ? 1.0 : rightEAR < 0.15 ? 0.0 : (rightEAR - 0.15) / 0.05;

    // ===== MOUTH DETECTION =====
    const mouthTop = landmarks[13];
    const mouthBottom = landmarks[14];
    const mouthHeight = Math.abs(mouthTop.y - mouthBottom.y);
    const mouthOpen = Math.min(mouthHeight * 15, 1.0);

    // ===== SMILE DETECTION =====
    const mouthLeft = landmarks[61];
    const mouthRight = landmarks[291];
    const mouthWidth = Math.abs(mouthRight.x - mouthLeft.x);
    const smileRatio = mouthWidth / (mouthHeight + 0.001); // Avoid division by zero
    const smiling = smileRatio > 1.8 ? Math.min((smileRatio - 1.8) * 2, 1) : 0;

    // ===== EYEBROW TRACKING =====
    const leftBrow = landmarks[70];
    const rightBrow = landmarks[300];
    const leftBrowHeight = leftEye.y - leftBrow.y;
    const rightBrowHeight = rightEye.y - rightBrow.y;
    const browRaise = ((leftBrowHeight + rightBrowHeight) / 2 - 0.04) * 10;
    const browRaiseNormalized = Math.max(0, Math.min(1, browRaise));

    // ===== SMOOTH ALL VALUES =====
    this.smoothedBlink.left = this.lerp(this.smoothedBlink.left, leftEyeOpen, 0.3);
    this.smoothedBlink.right = this.lerp(this.smoothedBlink.right, rightEyeOpen, 0.3);
    this.smoothedMouth = this.lerp(this.smoothedMouth, mouthOpen, 0.25);
    this.smoothedSmile = this.lerp(this.smoothedSmile, smiling, 0.2);
    this.smoothedBrowRaise = this.lerp(this.smoothedBrowRaise, browRaiseNormalized, 0.2);

    // ===== APPLY MORPH TARGETS =====
    this.morphMeshes.forEach((mesh) => {
      if (!mesh.morphTargetInfluences || !mesh.morphTargetDictionary) return;

      // Eye blinks - try multiple possible names
      const leftBlinkIdx = this.findMorphIndex(mesh, [
        'eyeBlinkLeft',
        'eyeBlink_L',
        'EyeBlinkLeft',
        'Eye_Blink_Left',
        'mouthClose' // Sometimes blinking uses this
      ]);
      const rightBlinkIdx = this.findMorphIndex(mesh, [
        'eyeBlinkRight',
        'eyeBlink_R',
        'EyeBlinkRight',
        'Eye_Blink_Right',
        'mouthClose' // Sometimes blinking uses this
      ]);

      if (leftBlinkIdx >= 0) {
        mesh.morphTargetInfluences[leftBlinkIdx] = 1.0 - this.smoothedBlink.left;
      }
      if (rightBlinkIdx >= 0) {
        mesh.morphTargetInfluences[rightBlinkIdx] = 1.0 - this.smoothedBlink.right;
      }

      // Mouth open - try multiple names
      const mouthOpenIdx = this.findMorphIndex(mesh, [
        'mouthOpen',
        'jawOpen',
        'MouthOpen',
        'Jaw_Open',
        'viseme_aa'
      ]);
      if (mouthOpenIdx >= 0) {
        mesh.morphTargetInfluences[mouthOpenIdx] = this.smoothedMouth;
      }

      // Smile - try multiple names
      const smileIdx = this.findMorphIndex(mesh, [
        'mouthSmile',
        'viseme_aa',
        'mouthSmileLeft',
        'MouthSmile',
        'Smile'
      ]);
      if (smileIdx >= 0) {
        mesh.morphTargetInfluences[smileIdx] = this.smoothedSmile * 0.5;
      }

      // Eyebrow raise - try multiple names
      const browIdx = this.findMorphIndex(mesh, [
        'browInnerUp',
        'browUp',
        'BrowInnerUp',
        'Brow_Up'
      ]);
      if (browIdx >= 0) {
        mesh.morphTargetInfluences[browIdx] = this.smoothedBrowRaise * 0.6;
      }
    });
  }

  findMorphIndex(mesh, names) {
    for (const name of names) {
      const index = mesh.morphTargetDictionary[name];
      if (index !== undefined) {
        // Log first time we find a morph target
        if (!this._loggedMorphs) this._loggedMorphs = {};
        if (!this._loggedMorphs[name]) {
          console.log('[Morph] Found', name, 'at index', index);
          this._loggedMorphs[name] = true;
        }
        return index;
      }
    }
    return -1;
  }

  /**
   * Update breathing animation
   */
  updateBreathing(deltaTime) {
    if (!this.avatar) return;

    this.breathingTime += deltaTime * 2;
    const breathScale = 1 + Math.sin(this.breathingTime) * 0.008;
    this.avatar.scale.y = breathScale;
  }
}

/**
 * Performance Monitor
 * Tracks FPS, latency, and other metrics
 */
class PerformanceMonitor {
  constructor() {
    this.frameTimes = [];
    this.maxSamples = 60;
    this.lastUpdateTime = Date.now();
    this.faceDetectStart = 0;
    this.latency = 0;

    // UI elements
    this.fpsElement = document.getElementById('fps-value');
    this.latencyElement = document.getElementById('latency-value');
    this.faceStatusElement = document.getElementById('face-status');
    this.handsCountElement = document.getElementById('hands-count');
  }

  startFrame() {
    this.frameStart = performance.now();
  }

  endFrame() {
    const frameTime = performance.now() - this.frameStart;
    this.frameTimes.push(frameTime);
    if (this.frameTimes.length > this.maxSamples) {
      this.frameTimes.shift();
    }
  }

  startFaceDetect() {
    this.faceDetectStart = performance.now();
  }

  endFaceDetect() {
    this.latency = performance.now() - this.faceDetectStart;
  }

  getFPS() {
    if (this.frameTimes.length === 0) return 0;
    const avgFrameTime = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
    return Math.round(1000 / avgFrameTime);
  }

  updateUI(faceDetected, handCount) {
    const now = Date.now();
    if (now - this.lastUpdateTime < 500) return; // Update every 500ms
    this.lastUpdateTime = now;

    // Update FPS
    const fps = this.getFPS();
    this.fpsElement.textContent = fps;
    this.fpsElement.className = 'stats-value ' +
      (fps > 55 ? 'good' : fps > 45 ? 'medium' : 'bad');

    // Update Latency
    const latencyMs = Math.round(this.latency);
    this.latencyElement.textContent = `${latencyMs}ms`;
    this.latencyElement.className = 'stats-value ' +
      (latencyMs < 50 ? 'good' : latencyMs < 100 ? 'medium' : 'bad');

    // Update Face Status
    this.faceStatusElement.textContent = faceDetected ? '✓' : '✗';
    this.faceStatusElement.className = 'stats-value ' + (faceDetected ? 'good' : 'bad');

    // Update Hands Count
    this.handsCountElement.textContent = handCount;
    this.handsCountElement.className = 'stats-value ' + (handCount > 0 ? 'good' : '');
  }
}

// ============================================================================
// MAIN APPLICATION
// ============================================================================

class AvatarApp {
  constructor() {
    // Trackers
    this.faceTracker = new FaceTracker();
    this.handTracker = new HandTracker();
    this.avatarController = null;
    this.performanceMonitor = new PerformanceMonitor();

    // Particle systems
    this.confettiParticles = null;
    this.sparkleParticles = null;
    this.ambientParticles = null;

    // Three.js
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.avatar = null;
    this.backgroundPlane = null;
    this.backgroundMaterial = null;

    // State
    this.video = null;
    this.lastVideoTime = -1;
    this.debugMode = false;
    this.debugCanvas = null;
    this.debugCtx = null;
    this.particlesEnabled = true;
    this.backgroundFXEnabled = true;

    // UI Elements
    this.statusEl = document.getElementById('status');
    this.loadingEl = document.getElementById('loading');
    this.loadingProgressEl = document.getElementById('loading-progress');
    this.loadingStatusEl = document.getElementById('loading-status');
    this.videoFeedEl = document.getElementById('video-feed');
    this.gestureNotificationEl = document.getElementById('gesture-notification');
  }

  /**
   * Main initialization function
   */
  async initialize() {
    try {
      // Step 1: Initialize webcam (0-20%)
      this.updateLoadingProgress(0, 'Requesting camera access...');
      await this.initWebcam();
      this.updateLoadingProgress(20, 'Camera ready!');

      // Step 2: Initialize MediaPipe (20-60%)
      this.updateLoadingProgress(20, 'Loading AI models...');
      await this.initMediaPipe();
      this.updateLoadingProgress(60, 'AI models loaded!');

      // Step 3: Initialize Three.js (60-80%)
      this.updateLoadingProgress(60, 'Preparing 3D avatar...');
      this.initThreeJS();
      await this.loadAvatar();
      this.updateLoadingProgress(80, '3D avatar ready!');

      // Step 4: Setup UI and debug (80-100%)
      this.updateLoadingProgress(80, 'Setting up interface...');
      this.setupDebugCanvas();
      this.setupControls();
      this.updateLoadingProgress(100, 'Almost ready...');

      // Step 5: Start tracking
      setTimeout(() => {
        this.updateStatus('Ready', true);
        this.loadingEl.classList.add('hidden');
        this.startTracking();
      }, 500);

    } catch (error) {
      this.handleError('Initialization failed', error);
    }
  }

  async initWebcam() {
    this.video = document.getElementById('webcam');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        }
      });
      this.video.srcObject = stream;
      await this.video.play();
      this.videoFeedEl.style.display = 'block';
    } catch (error) {
      throw new Error('Camera access denied. Please allow camera access and refresh.');
    }
  }

  async initMediaPipe() {
    try {
      const filesetResolver = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
      );

      // Initialize face tracker
      await this.faceTracker.initialize(filesetResolver);

      // Initialize hand tracker
      await this.handTracker.initialize(filesetResolver);
    } catch (error) {
      throw new Error('Failed to load AI models. Please check your internet connection.');
    }
  }

  initThreeJS() {
    const canvas = document.getElementById('canvas');

    // Scene
    this.scene = new THREE.Scene();

    // Camera
    this.camera = new THREE.PerspectiveCamera(
      50,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 1, 4);
    this.camera.lookAt(0, 0.5, 0);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Limit for performance
    this.renderer.shadowMap.enabled = true;

    // Enhanced Lighting - 3-point setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    this.scene.add(ambientLight);

    // Key light (main)
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
    keyLight.position.set(5, 8, 5);
    keyLight.castShadow = true;
    this.scene.add(keyLight);

    // Fill light (soften shadows)
    const fillLight = new THREE.DirectionalLight(0x9eceff, 0.4);
    fillLight.position.set(-5, 3, -3);
    this.scene.add(fillLight);

    // Rim light (edge highlighting)
    const rimLight = new THREE.DirectionalLight(0xffe0bd, 0.8);
    rimLight.position.set(0, 3, -8);
    this.scene.add(rimLight);

    // Animated gradient background
    this.createAnimatedBackground();

    // Initialize particle systems
    this.confettiParticles = new ConfettiParticles(this.scene);
    this.sparkleParticles = new SparkleParticles(this.scene);
    this.ambientParticles = new AmbientParticles(this.scene);

    // OrbitControls - ZOOM ONLY
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.target.set(0, 0.5, 0);
    this.controls.enablePan = false;
    this.controls.enableRotate = false; // Disable rotation
    this.controls.enableZoom = true;
    this.controls.minDistance = 1.5; // Allow closer zoom
    this.controls.maxDistance = 8;
    this.controls.update();

    // Handle resize
    window.addEventListener('resize', () => this.handleResize());

    // Start render loop
    this.animate();
  }

  /**
   * Create animated gradient background using shaders
   */
  createAnimatedBackground() {
    const geometry = new THREE.PlaneGeometry(20, 20);

    // Custom shader for animated gradient
    this.backgroundMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        color1: { value: new THREE.Color(0x1a1a2e) },
        color2: { value: new THREE.Color(0x16213e) },
        color3: { value: new THREE.Color(0x0f3460) }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform vec3 color1;
        uniform vec3 color2;
        uniform vec3 color3;
        varying vec2 vUv;

        void main() {
          float gradient = vUv.y;
          float wave = sin(vUv.y * 3.0 + time * 0.5) * 0.1 + sin(vUv.x * 2.0 + time * 0.3) * 0.1;
          gradient += wave;

          vec3 color;
          if (gradient < 0.5) {
            color = mix(color3, color2, gradient * 2.0);
          } else {
            color = mix(color2, color1, (gradient - 0.5) * 2.0);
          }

          gl_FragColor = vec4(color, 1.0);
        }
      `,
      side: THREE.DoubleSide
    });

    this.backgroundPlane = new THREE.Mesh(geometry, this.backgroundMaterial);
    this.backgroundPlane.position.z = -10;
    this.scene.add(this.backgroundPlane);
  }

  async loadAvatar() {
    const loader = new GLTFLoader();
    // Try multiple male avatar URLs in order of preference
    const avatarUrls = [
      'https://models.readyplayer.me/65d3f5509de3ccd6f5e98c31.glb', // Male avatar 1
      'https://models.readyplayer.me/6502d65c5e6d24f234e6d1c5.glb', // Male avatar 2
      'https://models.readyplayer.me/64bfa15f0e72c63d7c3934a6.glb', // Original (female but reliable)
    ];

    // Try loading models in sequence until one works
    for (let i = 0; i < avatarUrls.length; i++) {
      try {
        console.log(`[Avatar] Trying to load model ${i + 1}/${avatarUrls.length}...`);
        const result = await this.tryLoadAvatar(loader, avatarUrls[i]);
        console.log(`[Avatar] Successfully loaded model ${i + 1}`);
        return result;
      } catch (error) {
        console.warn(`[Avatar] Model ${i + 1} failed:`, error.message);
        if (i === avatarUrls.length - 1) {
          throw new Error('Failed to load any avatar model');
        }
      }
    }
  }

  tryLoadAvatar(loader, avatarUrl) {
    return new Promise((resolve, reject) => {
      // Set a timeout for loading
      const timeout = setTimeout(() => {
        reject(new Error('Model loading timeout'));
      }, 10000); // 10 second timeout

      loader.load(
        avatarUrl,
        (gltf) => {
          clearTimeout(timeout);
          this.avatar = gltf.scene;
          this.avatar.position.set(0, -1.5, 0);
          this.avatar.scale.set(1, 1, 1);
          this.scene.add(this.avatar);

          let headBone = null;
          const morphMeshes = [];

          this.avatar.traverse((child) => {
            // Find head bone
            if (child.isBone && child.name.toLowerCase().includes('head')) {
              if (!child.name.toLowerCase().includes('end')) {
                headBone = child;
              }
            }

            // Find morph meshes
            if (child.isMesh && child.morphTargetInfluences && child.morphTargetDictionary) {
              morphMeshes.push(child);
              // Log available morph targets for debugging
              console.log('[Avatar] Morph targets for', child.name, ':', Object.keys(child.morphTargetDictionary));
            }
          });

          // Initialize avatar controller
          this.avatarController = new AvatarController(this.avatar, headBone, morphMeshes);

          resolve();
        },
        (progress) => {
          // Log loading progress
          if (progress.lengthComputable) {
            const percent = (progress.loaded / progress.total) * 100;
            console.log(`[Avatar] Loading: ${percent.toFixed(0)}%`);
          }
        },
        (error) => {
          clearTimeout(timeout);
          reject(error);
        }
      );
    });
  }

  setupDebugCanvas() {
    this.debugCanvas = document.createElement('canvas');
    this.debugCanvas.id = 'debug-canvas';
    this.debugCanvas.width = 240;
    this.debugCanvas.height = 180;
    this.debugCanvas.style.cssText = 'position:absolute;top:0;left:0;pointer-events:none;display:none;';
    this.debugCtx = this.debugCanvas.getContext('2d');
    this.videoFeedEl.appendChild(this.debugCanvas);
  }

  setupControls() {
    // Stats toggle
    document.getElementById('stats-toggle').addEventListener('click', (e) => {
      e.currentTarget.classList.toggle('active');
      document.getElementById('stats-panel').classList.toggle('hidden');
    });

    // Debug toggle
    document.getElementById('debug-toggle').addEventListener('click', (e) => {
      e.currentTarget.classList.toggle('active');
      this.debugMode = e.currentTarget.classList.contains('active');
      this.debugCanvas.style.display = this.debugMode ? 'block' : 'none';
    });

    // Particles toggle
    document.getElementById('particles-toggle').addEventListener('click', (e) => {
      e.currentTarget.classList.toggle('active');
      this.particlesEnabled = e.currentTarget.classList.contains('active');
    });

    // Background FX toggle
    document.getElementById('background-toggle').addEventListener('click', (e) => {
      e.currentTarget.classList.toggle('active');
      this.backgroundFXEnabled = e.currentTarget.classList.contains('active');
      if (this.ambientParticles) {
        this.ambientParticles.setEnabled(this.backgroundFXEnabled);
      }
    });
  }

  startTracking() {
    const trackLoop = () => {
      this.performanceMonitor.startFrame();

      if (!this.video) {
        requestAnimationFrame(trackLoop);
        return;
      }

      const nowInMs = Date.now();

      // Only process new frames
      if (this.video.currentTime !== this.lastVideoTime) {
        this.lastVideoTime = this.video.currentTime;

        // Face detection
        this.performanceMonitor.startFaceDetect();
        const faceResults = this.faceTracker.detectFace(this.video, nowInMs);
        this.performanceMonitor.endFaceDetect();

        // Update avatar from face
        if (this.faceTracker.hasFace() && this.avatarController) {
          const landmarks = this.faceTracker.getLandmarks();
          this.avatarController.updateFromFaceData(landmarks);
          this.updateStatus('Face Detected', true);

          // Debug mode
          if (this.debugMode) {
            this.drawLandmarks(landmarks);
          }
        } else {
          this.updateStatus('No face detected');
          if (this.debugMode) {
            this.clearDebugCanvas();
          }
        }

        // Hand detection (throttled internally)
        const handResults = this.handTracker.detectHands(this.video, nowInMs);

        // Gesture detection
        if (this.particlesEnabled) {
          // Wave detection
          if (this.handTracker.detectWave() && this.avatarController) {
            const position = new THREE.Vector3(0, 1, 0);
            this.confettiParticles.trigger(position);
            this.showGestureNotification('👋 Wave detected! Enjoy the confetti!');
          }

          // Thumbs up detection
          if (this.handTracker.detectThumbsUp() && this.avatarController) {
            const position = new THREE.Vector3(0, 1.5, 0);
            this.sparkleParticles.trigger(position);
            this.showGestureNotification('👍 Awesome! Keep it up!');
          }
        }

        // Update performance UI
        const handCount = this.handTracker.getHandCount();
        this.performanceMonitor.updateUI(this.faceTracker.hasFace(), handCount);
      }

      this.performanceMonitor.endFrame();
      requestAnimationFrame(trackLoop);
    };

    trackLoop();
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    const deltaTime = 0.016; // Approximate for 60fps

    // Update avatar breathing
    if (this.avatarController) {
      this.avatarController.updateBreathing(deltaTime);
    }

    // Update particle systems
    if (this.confettiParticles) {
      this.confettiParticles.update(deltaTime);
    }
    if (this.sparkleParticles) {
      this.sparkleParticles.update(deltaTime);
    }
    if (this.ambientParticles && this.backgroundFXEnabled) {
      this.ambientParticles.update(deltaTime);
    }

    // Update animated background
    if (this.backgroundMaterial && this.backgroundFXEnabled) {
      this.backgroundMaterial.uniforms.time.value = Date.now() * 0.001;
    }

    // Update controls
    if (this.controls) {
      this.controls.update();
    }

    this.renderer.render(this.scene, this.camera);
  }

  drawLandmarks(landmarks) {
    if (!this.debugCtx || !landmarks) return;

    const width = this.debugCanvas.width;
    const height = this.debugCanvas.height;

    this.debugCtx.clearRect(0, 0, width, height);

    // Draw all landmarks
    this.debugCtx.fillStyle = '#00FF00';
    landmarks.forEach((landmark) => {
      const x = landmark.x * width;
      const y = landmark.y * height;
      this.debugCtx.beginPath();
      this.debugCtx.arc(x, y, 1.5, 0, 2 * Math.PI);
      this.debugCtx.fill();
    });

    // Draw key landmarks larger
    const keyPoints = [1, 33, 263, 61, 291, 13, 14, 152];
    this.debugCtx.fillStyle = '#FF0000';
    keyPoints.forEach((idx) => {
      const landmark = landmarks[idx];
      if (landmark) {
        const x = landmark.x * width;
        const y = landmark.y * height;
        this.debugCtx.beginPath();
        this.debugCtx.arc(x, y, 3, 0, 2 * Math.PI);
        this.debugCtx.fill();
      }
    });
  }

  clearDebugCanvas() {
    if (this.debugCtx) {
      this.debugCtx.clearRect(0, 0, this.debugCanvas.width, this.debugCanvas.height);
    }
  }

  showGestureNotification(message) {
    this.gestureNotificationEl.textContent = message;
    this.gestureNotificationEl.classList.add('show');

    setTimeout(() => {
      this.gestureNotificationEl.classList.remove('show');
    }, 2000);
  }

  updateStatus(message, active = false) {
    this.statusEl.textContent = message;
    this.statusEl.className = active ? 'active' : '';
  }

  updateLoadingProgress(percent, status) {
    this.loadingProgressEl.style.width = `${percent}%`;
    this.loadingStatusEl.textContent = status;
  }

  handleResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  handleError(message, error) {
    const errorMsg = `${message}: ${error.message}`;
    this.updateStatus(errorMsg);
    this.updateLoadingProgress(0, errorMsg);
    throw error;
  }
}

// ============================================================================
// START APPLICATION
// ============================================================================

const app = new AvatarApp();
app.initialize();
