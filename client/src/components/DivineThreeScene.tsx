import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import cheharMaaImg from '../assets/images/chehar_maa.png';

interface DivineThreeSceneProps {
  className?: string;
}

export function DivineThreeScene({ className }: DivineThreeSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    // ─── SCENE SETUP ───
    const scene = new THREE.Scene();
    scene.background = null;
    scene.fog = new THREE.FogExp2(0x0b0a0c, 0.07);

    // ─── CAMERA ───
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    camera.position.set(0, 0.1, 4.6);
    camera.lookAt(0, 0.15, 0);

    // ─── RENDERER ───
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.4;
    container.appendChild(renderer.domElement);

    // ─── LIGHTS ───
    const ambient = new THREE.AmbientLight(0xfff5e6, 1.8);
    scene.add(ambient);

    // Dynamic divine spotlight
    const divineLight = new THREE.DirectionalLight(0xffecd1, 5.0);
    divineLight.position.set(3, 6, 4.5);
    divineLight.castShadow = true;
    divineLight.shadow.mapSize.width = 1024;
    divineLight.shadow.mapSize.height = 1024;
    scene.add(divineLight);

    // Warm diya flame light
    const flameLight = new THREE.PointLight(0xffaa00, 4.0, 9);
    flameLight.position.set(0, -1.3, 1.6);
    scene.add(flameLight);

    // Soft pink rim light from behind for rose petals
    const rimLight = new THREE.DirectionalLight(0xffe6e6, 2.0);
    rimLight.position.set(0, 0, -5);
    scene.add(rimLight);

    // ─── MATERIALS ───
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xf5c338,     // Brilliant temple gold
      metalness: 0.55,
      roughness: 0.22,
      emissive: 0x4f3a05,  // Warm golden self-glow
    });

    const darkGoldMat = new THREE.MeshStandardMaterial({
      color: 0x442a08,     // Antique gold for stripes/details
      metalness: 0.6,
      roughness: 0.35,
    });

    const rubyMat = new THREE.MeshStandardMaterial({
      color: 0xd61c1c,     // Sacred red ruby jewel
      emissive: 0x660000,
      roughness: 0.1,
      metalness: 0.9,
    });

    // ─── TEXTURE LOADING ───
    const textureLoader = new THREE.TextureLoader();
    const maaTexture = textureLoader.load(cheharMaaImg, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.needsUpdate = true;
    });

    // ─── ASSEMBLY GROUP ───
    const rootAssembly = new THREE.Group();
    scene.add(rootAssembly);

    // ─── 1. MAA CHEHAR PORTRAIT MEDALLION ───
    const medallionGroup = new THREE.Group();
    medallionGroup.position.set(0, 0.45, 0);
    rootAssembly.add(medallionGroup);

    // Portrait image plate
    const portraitGeo = new THREE.CircleGeometry(1.15, 64);
    const portraitMat = new THREE.MeshBasicMaterial({
      map: maaTexture,
      transparent: true,
      side: THREE.DoubleSide,
    });
    const portrait = new THREE.Mesh(portraitGeo, portraitMat);
    portrait.position.z = 0.04;
    medallionGroup.add(portrait);

    // Golden backing
    const backingGeo = new THREE.CircleGeometry(1.22, 64);
    const backing = new THREE.Mesh(backingGeo, goldMat);
    backing.position.z = 0.015;
    medallionGroup.add(backing);

    // Torus Frame
    const frame = new THREE.Mesh(new THREE.TorusGeometry(1.23, 0.06, 16, 100), goldMat);
    frame.position.z = 0.03;
    medallionGroup.add(frame);

    // Ornate flower frame rim
    const smallBeadsCount = 60;
    const beadGeo = new THREE.SphereGeometry(0.025, 8, 8);
    for (let i = 0; i < smallBeadsCount; i++) {
      const angle = (i / smallBeadsCount) * Math.PI * 2;
      const bead = new THREE.Mesh(beadGeo, goldMat);
      bead.position.set(Math.cos(angle) * 1.23, Math.sin(angle) * 1.23, 0.04);
      medallionGroup.add(bead);
    }

    // ─── 2. ROTATING SACRED GEOMETRY (MANDALA) ───
    const mandalaGroup = new THREE.Group();
    mandalaGroup.position.set(0, 0, -0.05);
    medallionGroup.add(mandalaGroup);

    // Concentric overlapping stars for visual depth
    const starCount = 3;
    for (let s = 0; s < starCount; s++) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(1.35 + s * 0.08, 0.01, 8, 48),
        goldMat
      );
      ring.position.z = -0.01 * s;
      mandalaGroup.add(ring);
    }

    // Mandala spokes
    const spokeCount = 16;
    const spokeGeo = new THREE.BoxGeometry(0.015, 3.2, 0.015);
    for (let i = 0; i < spokeCount; i++) {
      const angle = (i / spokeCount) * Math.PI;
      const spoke = new THREE.Mesh(spokeGeo, goldMat);
      spoke.rotation.z = angle;
      spoke.position.z = -0.02;
      mandalaGroup.add(spoke);
    }

    // ─── 3. SUN CROWN (Mukut) ───
    const crownGroup = new THREE.Group();
    crownGroup.position.set(0, 1.25, 0.02);
    medallionGroup.add(crownGroup);

    const crownCore = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.38, 4), goldMat);
    crownCore.rotation.z = Math.PI;
    crownGroup.add(crownCore);

    // Ruby on Crown
    const crownRuby = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 16), rubyMat);
    crownRuby.position.set(0, -0.05, 0.08);
    crownRuby.scale.set(1, 1.3, 0.6);
    crownGroup.add(crownRuby);

    for (let i = 0; i < 5; i++) {
      const angle = ((i - 2) * 0.26);
      const sideSpike = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.28, 4), goldMat);
      sideSpike.position.set(Math.sin(angle) * 0.35, -Math.cos(angle) * 0.35 + 0.35, 0);
      sideSpike.rotation.z = Math.PI + angle;
      crownGroup.add(sideSpike);
    }

    // ─── 4. MAJESTIC ROYAL TIGER (Vahana) ───
    const tigerGroup = new THREE.Group();
    tigerGroup.position.set(0, -0.95, 0.3);
    tigerGroup.scale.set(0.64, 0.64, 0.64);
    rootAssembly.add(tigerGroup);

    // Tiger head core
    const tigerHead = new THREE.Mesh(new THREE.SphereGeometry(0.85, 32, 32), goldMat);
    tigerHead.castShadow = true;
    tigerGroup.add(tigerHead);

    // Strong slanted brow ridges for a powerful, fierce expression
    const browL = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.1, 0.15), goldMat);
    browL.position.set(-0.3, 0.38, 0.65);
    browL.rotation.set(0.2, 0.15, -0.2);
    tigerGroup.add(browL);

    const browR = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.1, 0.15), goldMat);
    browR.position.set(0.3, 0.38, 0.65);
    browR.rotation.set(0.2, -0.15, 0.2);
    tigerGroup.add(browR);

    // Cheeks
    const cheekL = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 16), goldMat);
    cheekL.position.set(-0.55, -0.15, 0.4);
    cheekL.scale.set(0.95, 0.65, 0.55);
    tigerGroup.add(cheekL);

    const cheekR = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 16), goldMat);
    cheekR.position.set(0.55, -0.15, 0.4);
    cheekR.scale.set(0.95, 0.65, 0.55);
    tigerGroup.add(cheekR);

    // Snout and muzzle
    const snout = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 16), goldMat);
    snout.position.set(0, -0.1, 0.68);
    snout.scale.set(0.85, 0.7, 0.7);
    tigerGroup.add(snout);

    const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.45, 0.22), goldMat);
    bridge.position.set(0, 0.2, 0.68);
    bridge.rotation.x = -0.22;
    tigerGroup.add(bridge);

    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 16), darkGoldMat);
    nose.position.set(0, 0.02, 0.88);
    nose.scale.set(1.15, 0.75, 0.6);
    tigerGroup.add(nose);

    // Ears
    const earL = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.45, 4), goldMat);
    earL.position.set(-0.66, 0.68, 0.1);
    earL.rotation.z = -0.42;
    earL.rotation.y = -0.18;
    tigerGroup.add(earL);

    const earR = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.45, 4), goldMat);
    earR.position.set(0.66, 0.68, 0.1);
    earR.rotation.z = 0.42;
    earR.rotation.y = 0.18;
    tigerGroup.add(earR);

    // Glowing eyes
    const eyeGlowMat = new THREE.MeshBasicMaterial({ color: 0xffa500 });
    
    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 16), eyeGlowMat);
    eyeL.position.set(-0.31, 0.24, 0.68);
    eyeL.scale.set(1.1, 0.6, 0.65);
    tigerGroup.add(eyeL);

    const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 16), eyeGlowMat);
    eyeR.position.set(0.31, 0.24, 0.68);
    eyeR.scale.set(1.1, 0.6, 0.65);
    tigerGroup.add(eyeR);

    // ─── TIGER STRIPES (forehead & cheeks) ───
    const stripeGeo = new THREE.BoxGeometry(0.22, 0.035, 0.05);
    
    // Forehead V-stripes (Trishul motif)
    const foreheadCenterStripe = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.28, 0.05), darkGoldMat);
    foreheadCenterStripe.position.set(0, 0.52, 0.68);
    foreheadCenterStripe.rotation.x = -0.15;
    tigerGroup.add(foreheadCenterStripe);

    const foreheadLStripe = new THREE.Mesh(stripeGeo, darkGoldMat);
    foreheadLStripe.position.set(-0.16, 0.55, 0.67);
    foreheadLStripe.rotation.set(-0.15, 0, 0.4);
    tigerGroup.add(foreheadLStripe);

    const foreheadRStripe = new THREE.Mesh(stripeGeo, darkGoldMat);
    foreheadRStripe.position.set(0.16, 0.55, 0.67);
    foreheadRStripe.rotation.set(-0.15, 0, -0.4);
    tigerGroup.add(foreheadRStripe);

    // Cheek stripes
    const cheekLStripe1 = new THREE.Mesh(stripeGeo, darkGoldMat);
    cheekLStripe1.position.set(-0.68, 0.02, 0.52);
    cheekLStripe1.rotation.set(0, 0.4, 0.25);
    tigerGroup.add(cheekLStripe1);

    const cheekRStripe1 = new THREE.Mesh(stripeGeo, darkGoldMat);
    cheekRStripe1.position.set(0.68, 0.02, 0.52);
    cheekRStripe1.rotation.set(0, -0.4, -0.25);
    tigerGroup.add(cheekRStripe1);

    // ─── DIVINE FOREHEAD BINDU / RUBY ───
    const bindu = new THREE.Mesh(new THREE.SphereGeometry(0.075, 16, 16), rubyMat);
    bindu.position.set(0, 0.38, 0.74);
    tigerGroup.add(bindu);

    // ─── ROYAL NECK BEAD COLLAR (Mala) ───
    const necklaceGroup = new THREE.Group();
    necklaceGroup.position.set(0, -0.72, 0.2);
    tigerGroup.add(necklaceGroup);

    const beadCount = 9;
    const necklaceBeadGeo = new THREE.SphereGeometry(0.1, 16, 16);
    for (let i = 0; i < beadCount; i++) {
      const pct = i / (beadCount - 1);
      const angle = Math.PI * (0.15 + pct * 0.7); // semi-circle under the head
      const isRuby = i % 2 === 1;

      const bead = new THREE.Mesh(necklaceBeadGeo, isRuby ? rubyMat : goldMat);
      bead.position.set(-Math.cos(angle) * 0.82, -Math.sin(angle) * 0.42, Math.sin(angle) * 0.35);
      necklaceGroup.add(bead);
    }

    // Whiskers
    const whiskerMat = new THREE.LineBasicMaterial({ color: 0xffe066, linewidth: 2 });
    const whiskers = [
      [-0.4, -0.1, 0.7, -0.9, -0.25, 0.75],
      [-0.4, -0.05, 0.7, -0.95, -0.15, 0.7],
      [-0.4, 0.0, 0.7, -0.9, -0.02, 0.65],
      [0.4, -0.1, 0.7, 0.9, -0.25, 0.75],
      [0.4, -0.05, 0.7, 0.95, -0.15, 0.7],
      [0.4, 0.0, 0.7, 0.9, -0.02, 0.65]
    ];
    whiskers.forEach(([x1, y1, z1, x2, y2, z2]) => {
      const g = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(x1, y1, z1),
        new THREE.Vector3(x2, y2, z2),
      ]);
      tigerGroup.add(new THREE.Line(g, whiskerMat));
    });

    // ─── 5. DOUBLE SPINNING HALO RING (Prabhavali) ───
    const haloGroup = new THREE.Group();
    haloGroup.position.set(0, 0.45, -0.18);
    rootAssembly.add(haloGroup);

    const haloMat1 = new THREE.MeshBasicMaterial({
      color: 0xff8c00,
      transparent: true,
      opacity: 0.28,
      blending: THREE.AdditiveBlending,
    });

    const haloMat2 = new THREE.MeshBasicMaterial({
      color: 0xffd700,
      transparent: true,
      opacity: 0.22,
      blending: THREE.AdditiveBlending,
    });

    const halo1 = new THREE.Mesh(new THREE.TorusGeometry(1.42, 0.05, 8, 100), haloMat1);
    haloGroup.add(halo1);

    const halo2 = new THREE.Mesh(new THREE.TorusGeometry(1.58, 0.02, 8, 100), haloMat2);
    halo2.rotation.z = Math.PI / 4;
    haloGroup.add(halo2);

    // Sun Rays
    const raysCount = 36;
    const rayGeo = new THREE.ConeGeometry(0.045, 0.4, 4);
    for (let i = 0; i < raysCount; i++) {
      const angle = (i / raysCount) * Math.PI * 2;
      const ray = new THREE.Mesh(rayGeo, goldMat);
      ray.position.x = Math.cos(angle) * 1.5;
      ray.position.y = Math.sin(angle) * 1.5;
      ray.rotation.z = angle - Math.PI / 2;
      haloGroup.add(ray);
    }

    // ─── 6. GOLDEN/RED EMBERS PARTICLE SYSTEM ───
    const particleCount = 280;
    const posArray = new Float32Array(particleCount * 3);
    const colArray = new Float32Array(particleCount * 3);
    const emberSpeeds = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      posArray[i * 3] = (Math.random() - 0.5) * 6;
      posArray[i * 3 + 1] = -2.5 + Math.random() * 5;
      posArray[i * 3 + 2] = -1.5 + Math.random() * 3;
      
      emberSpeeds[i] = 0.4 + Math.random() * 0.7;

      const r = Math.random();
      if (r < 0.5) {
        colArray[i * 3] = 1.0;
        colArray[i * 3 + 1] = 0.55;
        colArray[i * 3 + 2] = 0.0;
      } else if (r < 0.85) {
        colArray[i * 3] = 1.0;
        colArray[i * 3 + 1] = 0.82;
        colArray[i * 3 + 2] = 0.12;
      } else {
        colArray[i * 3] = 0.95;
        colArray[i * 3 + 1] = 0.12;
        colArray[i * 3 + 2] = 0.05;
      }
    }

    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    particleGeo.setAttribute('color', new THREE.BufferAttribute(colArray, 3));

    const createEmberTexture = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 16;
      canvas.height = 16;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const grad = ctx.createRadialGradient(8, 8, 0, 8, 8, 8);
        grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
        grad.addColorStop(0.2, 'rgba(255, 195, 60, 0.9)');
        grad.addColorStop(0.6, 'rgba(255, 80, 0, 0.45)');
        grad.addColorStop(1, 'rgba(255, 45, 0, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 16, 16);
      }
      return new THREE.CanvasTexture(canvas);
    };

    const particleMat = new THREE.PointsMaterial({
      size: 0.14,
      map: createEmberTexture(),
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // ─── 7. SACRED FALLING PINK ROSE PETALS ───
    const petalSystemCount = 45;
    const petalPosArray = new Float32Array(petalSystemCount * 3);
    const petalRotations = new Float32Array(petalSystemCount * 3);
    const petalSpeeds = new Float32Array(petalSystemCount);

    for (let i = 0; i < petalSystemCount; i++) {
      petalPosArray[i * 3] = (Math.random() - 0.5) * 6;
      petalPosArray[i * 3 + 1] = 2.0 + Math.random() * 3; // Start from above
      petalPosArray[i * 3 + 2] = -1.0 + Math.random() * 2.5;

      petalRotations[i * 3] = Math.random() * Math.PI;
      petalRotations[i * 3 + 1] = Math.random() * Math.PI;
      petalRotations[i * 3 + 2] = Math.random() * Math.PI;

      petalSpeeds[i] = 0.35 + Math.random() * 0.45;
    }

    const petalMeshGroup = new THREE.Group();
    scene.add(petalMeshGroup);

    // Create individual meshes for beautiful, realistic physical petals
    const singlePetalGeo = new THREE.ConeGeometry(0.08, 0.14, 3);
    const petalMaterial = new THREE.MeshStandardMaterial({
      color: 0xff66a3,      // Divine Pink Rose
      roughness: 0.6,
      metalness: 0.1,
      side: THREE.DoubleSide,
      emissive: 0x330011,   // Soft petal glow
    });

    const petalMeshes: THREE.Mesh[] = [];
    for (let i = 0; i < petalSystemCount; i++) {
      const pm = new THREE.Mesh(singlePetalGeo, petalMaterial);
      pm.position.set(petalPosArray[i * 3], petalPosArray[i * 3 + 1], petalPosArray[i * 3 + 2]);
      pm.rotation.set(petalRotations[i * 3], petalRotations[i * 3 + 1], petalRotations[i * 3 + 2]);
      petalMeshGroup.add(pm);
      petalMeshes.push(pm);
    }

    // ─── MOUSE PARALLAX ───
    let targetMouseX = 0;
    let targetMouseY = 0;
    let mouseX = 0;
    let mouseY = 0;

    const onMouseMove = (e: MouseEvent) => {
      targetMouseX = (e.clientX / window.innerWidth) * 2 - 1;
      targetMouseY = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener('mousemove', onMouseMove);

    // ─── RESIZE ───
    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    // ─── ANIMATION LOOP ───
    const clock = new THREE.Clock();
    let frameId: number;

    const animate = () => {
      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      // Smooth mouse interpolation
      mouseX += (targetMouseX - mouseX) * 0.055;
      mouseY += (targetMouseY - mouseY) * 0.055;

      // Parallax Sway
      camera.position.x = mouseX * 0.85 + Math.sin(elapsed * 0.22) * 0.04;
      camera.position.y = 0.2 + mouseY * 0.55 + Math.cos(elapsed * 0.26) * 0.04;
      camera.lookAt(0, 0.15, 0);

      // Whole assembly floats
      rootAssembly.position.y = Math.sin(elapsed * 1.05) * 0.06;
      
      // Ring rotation
      halo1.rotation.z = elapsed * 0.18;
      halo2.rotation.z = -elapsed * 0.12;
      haloGroup.scale.setScalar(1 + Math.sin(elapsed * 1.5) * 0.02);

      // Sacred Mandala counter-rotation
      mandalaGroup.rotation.z = -elapsed * 0.085;

      // Bobbing & Turning
      medallionGroup.rotation.y = Math.sin(elapsed * 0.38) * 0.12;
      tigerGroup.rotation.y = Math.sin(elapsed * 0.38) * 0.16;

      // Glowing/Pulsing Tiger Eyes
      const eyePulsate = 0.88 + Math.sin(elapsed * 7.5) * 0.12;
      eyeGlowMat.color.setRGB(1.0, 0.65 * eyePulsate, 0.05);

      // Flickering Diya Flame Light
      flameLight.intensity = 3.5 + Math.sin(elapsed * 10.0) * 0.6;
      flameLight.position.x = Math.sin(elapsed * 4.0) * 0.1;
      flameLight.position.z = 1.6 + Math.cos(elapsed * 3.0) * 0.1;

      // ─── ANIMATE EMBERS (Rising) ───
      const pos = particles.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < particleCount; i++) {
        const idx = i * 3;
        pos[idx + 1] += emberSpeeds[i] * delta * 1.5;
        pos[idx] += Math.sin(elapsed * emberSpeeds[i] + idx) * delta * 0.2;
        
        if (pos[idx + 1] > 2.5) {
          pos[idx + 1] = -2.5;
          pos[idx] = (Math.random() - 0.5) * 6;
        }
      }
      particles.geometry.attributes.position.needsUpdate = true;

      // ─── ANIMATE ROSE PETALS (Falling) ───
      for (let i = 0; i < petalSystemCount; i++) {
        const pm = petalMeshes[i];
        
        pm.position.y -= petalSpeeds[i] * delta * 1.1; // fall
        pm.position.x += Math.sin(elapsed * 0.5 + i) * delta * 0.16; // sway
        
        // spin while falling
        pm.rotation.x += delta * 1.2 * petalSpeeds[i];
        pm.rotation.y += delta * 0.8 * petalSpeeds[i];
        pm.rotation.z += delta * 0.5;

        // Recycle to the top
        if (pm.position.y < -2.2) {
          pm.position.y = 2.2 + Math.random() * 1.5;
          pm.position.x = (Math.random() - 0.5) * 6;
          pm.position.z = -1.0 + Math.random() * 2.5;
        }
      }

      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    };

    animate();

    // ─── CLEANUP ───
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(frameId);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div className={className} style={{ position: 'relative', overflow: 'hidden' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, zIndex: 1 }} />
      {/* Ornate Gold Border frame */}
      <div style={{
        position: 'absolute',
        inset: '8px',
        border: '2px solid rgba(255, 184, 40, 0.38)',
        borderRadius: '20px',
        pointerEvents: 'none',
        zIndex: 2,
        boxShadow: 'inset 0 0 35px rgba(0,0,0,0.85)'
      }} />
    </div>
  );
}
