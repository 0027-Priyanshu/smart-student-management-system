import { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface AiKnowledgeCore3DProps {
  isTyping?: boolean;
  isPasswordFocused?: boolean;
  isAuthenticating?: boolean;
  isSuccess?: boolean;
  isFailed?: boolean;
}

export default function AiKnowledgeCore3D({
  isTyping = false,
  isPasswordFocused = false,
  isAuthenticating = false,
  isSuccess = false,
  isFailed = false,
}: AiKnowledgeCore3DProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef({ isTyping, isPasswordFocused, isAuthenticating, isSuccess, isFailed });

  // Keep stateRef updated without re-mounting Three.js canvas
  useEffect(() => {
    stateRef.current = { isTyping, isPasswordFocused, isAuthenticating, isSuccess, isFailed };
  }, [isTyping, isPasswordFocused, isAuthenticating, isSuccess, isFailed]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    // 1. Scene & Camera Setup
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0b0f19, 0.035);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 0, 18);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    // 2. Lighting Setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const blueLight = new THREE.PointLight(0x2563eb, 3, 30);
    blueLight.position.set(5, 5, 5);
    scene.add(blueLight);

    const cyanLight = new THREE.PointLight(0x06b6d4, 3, 30);
    cyanLight.position.set(-5, -5, 5);
    scene.add(cyanLight);

    const purpleLight = new THREE.PointLight(0x7c3aed, 2, 30);
    purpleLight.position.set(0, 5, -5);
    scene.add(purpleLight);

    // 3. Central AI Holographic Core
    const coreGroup = new THREE.Group();
    scene.add(coreGroup);

    // Outer Geodesic Sphere
    const outerGeo = new THREE.IcosahedronGeometry(3.2, 2);
    const outerMat = new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      wireframe: true,
      transparent: true,
      opacity: 0.4,
      emissive: 0x2563eb,
      emissiveIntensity: 0.5,
    });
    const outerSphere = new THREE.Mesh(outerGeo, outerMat);
    coreGroup.add(outerSphere);

    // Inner Glowing Core Sphere
    const innerGeo = new THREE.SphereGeometry(2.2, 32, 32);
    const innerMat = new THREE.MeshPhysicalMaterial({
      color: 0x7c3aed,
      emissive: 0x06b6d4,
      emissiveIntensity: 0.8,
      roughness: 0.1,
      metalness: 0.2,
      transmission: 0.6,
      thickness: 1.2,
    });
    const innerSphere = new THREE.Mesh(innerGeo, innerMat);
    coreGroup.add(innerSphere);

    // Core Ring Nucleus
    const ringGeo = new THREE.TorusGeometry(3.8, 0.04, 16, 100);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4, transparent: true, opacity: 0.7 });
    const nucleusRing1 = new THREE.Mesh(ringGeo, ringMat);
    nucleusRing1.rotation.x = Math.PI / 3;
    coreGroup.add(nucleusRing1);

    const nucleusRing2 = new THREE.Mesh(ringGeo, ringMat.clone());
    nucleusRing2.rotation.y = Math.PI / 4;
    coreGroup.add(nucleusRing2);

    // 4. Dynamic Security Shield Ring (Activates when password field is focused)
    const shieldRingGeo = new THREE.TorusGeometry(4.5, 0.12, 16, 100);
    const shieldRingMat = new THREE.MeshBasicMaterial({
      color: 0x2563eb,
      transparent: true,
      opacity: 0,
      wireframe: true,
    });
    const shieldRing = new THREE.Mesh(shieldRingGeo, shieldRingMat);
    shieldRing.rotation.x = Math.PI / 2;
    scene.add(shieldRing);

    // 5. Orbiting Educational 3D Icon Nodes
    const iconsData = [
      { emoji: '🎓', label: 'Graduation Cap', radius: 6.5, speed: 0.008, yOffset: 1.2 },
      { emoji: '👤', label: 'Student Profile', radius: 7.2, speed: -0.006, yOffset: -1.5 },
      { emoji: '🗓️', label: 'Attendance', radius: 6.0, speed: 0.009, yOffset: 2.0 },
      { emoji: '⚡', label: 'AI Chip', radius: 7.8, speed: -0.007, yOffset: 0.5 },
      { emoji: '📚', label: 'Curriculum', radius: 6.8, speed: 0.01, yOffset: -2.2 },
      { emoji: '📜', label: 'Certificate', radius: 8.0, speed: -0.005, yOffset: 1.8 },
      { emoji: '📈', label: 'Analytics', radius: 6.2, speed: 0.007, yOffset: -0.8 },
      { emoji: '🔳', label: 'QR Code', radius: 7.5, speed: -0.009, yOffset: 2.4 },
      { emoji: '☁️', label: 'Cloud DB', radius: 8.2, speed: 0.006, yOffset: -1.9 },
      { emoji: '🛡️', label: 'Security', radius: 7.0, speed: -0.008, yOffset: 0.0 },
    ];

    const orbitingNodes: { mesh: THREE.Mesh; data: any; angle: number }[] = [];

    // Helper to generate text/emoji texture billboards
    function createEmojiTexture(emoji: string) {
      const canvas = document.createElement('canvas');
      canvas.width = 128;
      canvas.height = 128;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.beginPath();
        ctx.arc(64, 64, 56, 0, Math.PI * 2);
        ctx.fill();
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#06b6d4';
        ctx.stroke();

        ctx.font = '54px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(emoji, 64, 68);
      }
      return new THREE.CanvasTexture(canvas);
    }

    iconsData.forEach((item, index) => {
      const texture = createEmojiTexture(item.emoji);
      const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
      const sprite = new THREE.Sprite(spriteMat);
      sprite.scale.set(1.4, 1.4, 1);

      const angle = (index / iconsData.length) * Math.PI * 2;
      sprite.position.x = Math.cos(angle) * item.radius;
      sprite.position.z = Math.sin(angle) * item.radius;
      sprite.position.y = item.yOffset;

      scene.add(sprite);
      orbitingNodes.push({ mesh: sprite as any, data: item, angle });
    });

    // 6. Neural Network Particle Mesh
    const particleCount = 450;
    const particleGeo = new THREE.BufferGeometry();
    const particlePos = new Float32Array(particleCount * 3);
    const particleVel: { x: number; y: number; z: number }[] = [];

    for (let i = 0; i < particleCount; i++) {
      const r = 4.0 + Math.random() * 6.5;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      particlePos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      particlePos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      particlePos[i * 3 + 2] = r * Math.cos(phi);

      particleVel.push({
        x: (Math.random() - 0.5) * 0.015,
        y: (Math.random() - 0.5) * 0.015,
        z: (Math.random() - 0.5) * 0.015,
      });
    }

    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePos, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0x06b6d4,
      size: 0.12,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
    });
    const particleSystem = new THREE.Points(particleGeo, particleMat);
    scene.add(particleSystem);

    // Dynamic Line Mesh connecting nearby neural particles
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x2563eb,
      transparent: true,
      opacity: 0.2,
      blending: THREE.AdditiveBlending,
    });

    // 7. Mouse Parallax Target
    const mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };
    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouse.targetX = ((e.clientX - rect.left) / width) * 2 - 1;
      mouse.targetY = -(((e.clientY - rect.top) / height) * 2 - 1);
    };
    window.addEventListener('mousemove', handleMouseMove);

    // 8. Handle Tab Invisibility (60 FPS Performance Optimization)
    let isTabActive = true;
    const handleVisibilityChange = () => {
      isTabActive = !document.hidden;
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // 9. Resize Listener
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // 10. Animation Loop
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      if (!isTabActive) return;

      const delta = clock.getDelta();
      const elapsedTime = clock.getElapsedTime();

      const { isTyping, isPasswordFocused, isAuthenticating, isSuccess, isFailed } = stateRef.current;

      // Mouse Parallax Damping
      mouse.x += (mouse.targetX - mouse.x) * 0.05;
      mouse.y += (mouse.targetY - mouse.y) * 0.05;

      camera.position.x = mouse.x * 2.5;
      camera.position.y = mouse.y * 1.5;
      camera.lookAt(0, 0, 0);

      // Core Rotation Speed Modulation
      let baseSpeed = 0.4;
      if (isTyping) baseSpeed = 1.2;
      if (isAuthenticating) baseSpeed = 3.0;

      coreGroup.rotation.y += baseSpeed * delta;
      coreGroup.rotation.x = Math.sin(elapsedTime * 0.8) * 0.15;

      nucleusRing1.rotation.z += 0.8 * delta;
      nucleusRing2.rotation.z -= 0.8 * delta;

      // Pulse Core scale
      const pulse = 1 + Math.sin(elapsedTime * 3) * 0.04;
      innerSphere.scale.set(pulse, pulse, pulse);

      // Password Security Shield Ring Animation
      if (isPasswordFocused) {
        shieldRingMat.opacity = Math.min(0.85, shieldRingMat.opacity + delta * 2.5);
        shieldRing.rotation.z += 1.5 * delta;
      } else {
        shieldRingMat.opacity = Math.max(0, shieldRingMat.opacity - delta * 2.5);
      }

      // Authentication State
      if (isAuthenticating) {
        outerMat.emissiveIntensity = 2.0;
        innerMat.emissiveIntensity = 2.5;
      } else if (isSuccess) {
        outerMat.color.setHex(0x10b981);
        innerMat.emissive.setHex(0x10b981);
        camera.position.z = Math.max(6, camera.position.z - delta * 15);
      } else if (isFailed) {
        outerMat.color.setHex(0xef4444);
        innerMat.emissive.setHex(0xef4444);
        camera.position.x += (Math.random() - 0.5) * 0.3;
      } else {
        outerMat.color.setHex(0x06b6d4);
        innerMat.emissive.setHex(0x06b6d4);
      }

      // Orbiting Nodes Movement
      orbitingNodes.forEach(node => {
        let speed = node.data.speed;
        if (isAuthenticating) speed *= 2.5;
        node.angle += speed;

        node.mesh.position.x = Math.cos(node.angle) * node.data.radius;
        node.mesh.position.z = Math.sin(node.angle) * node.data.radius;
        node.mesh.position.y = node.data.yOffset + Math.sin(elapsedTime * 2 + node.angle) * 0.3;
      });

      // Update Neural Particle Positions
      const positions = particleGeo.attributes.position.array as Float32Array;
      for (let i = 0; i < particleCount; i++) {
        positions[i * 3] += particleVel[i].x;
        positions[i * 3 + 1] += particleVel[i].y;
        positions[i * 3 + 2] += particleVel[i].z;

        const pDistance = Math.sqrt(
          positions[i * 3] ** 2 + positions[i * 3 + 1] ** 2 + positions[i * 3 + 2] ** 2
        );
        if (pDistance > 11 || pDistance < 2.5) {
          particleVel[i].x *= -1;
          particleVel[i].y *= -1;
          particleVel[i].z *= -1;
        }
      }
      particleGeo.attributes.position.needsUpdate = true;

      renderer.render(scene, camera);
    };

    animate();

    // 11. Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);

      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }

      renderer.dispose();
      outerGeo.dispose();
      outerMat.dispose();
      innerGeo.dispose();
      innerMat.dispose();
      ringGeo.dispose();
      ringMat.dispose();
      shieldRingGeo.dispose();
      shieldRingMat.dispose();
      particleGeo.dispose();
      particleMat.dispose();
      lineMat.dispose();
    };
  }, []);

  return (
    <div className="w-full h-full relative overflow-hidden flex items-center justify-center">
      <div ref={mountRef} className="w-full h-full absolute inset-0 cursor-grab active:cursor-grabbing" />
      
      {/* Visual Overlay Status Badges */}
      <div className="absolute top-6 right-6 z-10 flex items-center gap-2 bg-slate-900/60 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-cyan-500/30 text-white text-[11px] font-mono shadow-glow pointer-events-none">
        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
        <span>AI KNOWLEDGE CORE // 60 FPS</span>
      </div>

      {isAuthenticating && (
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2 animate-fadeIn pointer-events-none">
          <div className="w-12 h-12 rounded-full border-4 border-cyan-500 border-t-transparent animate-spin" />
          <span className="text-xs font-mono font-extrabold text-cyan-300 uppercase tracking-widest bg-slate-900/80 px-4 py-1.5 rounded-full border border-cyan-500/40">
            Authenticating...
          </span>
        </div>
      )}

      {isFailed && (
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2 animate-bounce pointer-events-none">
          <span className="text-xs font-mono font-extrabold text-red-400 uppercase tracking-widest bg-red-950/90 px-4 py-1.5 rounded-full border border-red-500/40 shadow-glow">
            Authentication Failed
          </span>
        </div>
      )}
    </div>
  );
}
