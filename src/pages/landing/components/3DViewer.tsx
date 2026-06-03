import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export const ThreeDViewer: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, 2, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });

    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setClearColor(0x0a0a0a, 1);
    containerRef.current.appendChild(renderer.domElement);

    // Wood piece (material placeholder)
    const geometry = new THREE.BoxGeometry(2, 1, 0.15);
    const material = new THREE.MeshStandardMaterial({
      color: 0xd2691e,
      metalness: 0.2,
      roughness: 0.5,
    });
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    // Lighting
    const directional = new THREE.DirectionalLight(0xffffff, 1);
    directional.position.set(5, 5, 5);
    scene.add(directional);

    const ambient = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambient);

    camera.position.z = 3;

    // Animation loop
    let rafId: number;
    const animate = () => {
      rafId = requestAnimationFrame(animate);
      mesh.rotation.x += 0.005;
      mesh.rotation.y += 0.008;
      renderer.render(scene, camera);
    };
    animate();

    // Resize handler
    const handleResize = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(rafId);
      renderer.dispose();
      geometry.dispose();
      material.dispose();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '400px',
        borderRadius: '16px',
        overflow: 'hidden',
        marginBottom: '32px',
      }}
    />
  );
};

export default ThreeDViewer;
