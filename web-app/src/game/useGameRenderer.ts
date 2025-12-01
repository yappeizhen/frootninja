import { MutableRefObject, useEffect } from 'react';
import * as THREE from 'three';

import { useGameStore } from '@/state/gameStore';

export function useGameRenderer(
  canvasRef: MutableRefObject<HTMLCanvasElement | null>
) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return undefined;
    }

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true
    });
    renderer.setPixelRatio(window.devicePixelRatio);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#020407');

    const camera = new THREE.PerspectiveCamera(70, 1, 0.1, 50);
    camera.position.set(0, 0, 8);

    const hemiLight = new THREE.HemisphereLight('#8ec5ff', '#041221', 1.2);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight('#ffe29f', 0.8);
    dirLight.position.set(5, 8, 4);
    scene.add(dirLight);

    const fruitMeshes = new Map<string, THREE.Mesh>();
    const trailGroup = new THREE.Group();
    scene.add(trailGroup);

    const fruitMaterial = new THREE.MeshStandardMaterial({
      roughness: 0.4,
      metalness: 0.05,
      color: '#ff9f43'
    });
    const slicedMaterial = new THREE.MeshStandardMaterial({
      roughness: 0.5,
      metalness: 0.1,
      color: '#c8ff85'
    });

    const resize = () => {
      const { clientWidth, clientHeight } = canvas;
      renderer.setSize(clientWidth, clientHeight, false);
      camera.aspect = clientWidth / clientHeight;
      camera.updateProjectionMatrix();
    };

    const syncFruits = (fruits = useGameStore.getState().fruits) => {
      fruits.forEach((fruit) => {
        if (fruitMeshes.has(fruit.id)) {
          const mesh = fruitMeshes.get(fruit.id)!;
          mesh.position.fromArray(fruit.position);
          mesh.material = fruit.sliced ? slicedMaterial : fruitMaterial;
          return;
        }

        const geometry = new THREE.SphereGeometry(fruit.radius, 32, 32);
        const mesh = new THREE.Mesh(
          geometry,
          fruit.sliced ? slicedMaterial : fruitMaterial
        );
        mesh.position.fromArray(fruit.position);
        scene.add(mesh);
        fruitMeshes.set(fruit.id, mesh);
      });

      Array.from(fruitMeshes.entries()).forEach(([id, mesh]) => {
        if (!fruits.some((fruit) => fruit.id === id)) {
          scene.remove(mesh);
          mesh.geometry.dispose();
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((mat) => mat.dispose());
          } else {
            mesh.material.dispose();
          }
          fruitMeshes.delete(id);
        }
      });
    };

    const syncTrails = () => {
      while (trailGroup.children.length) {
        const child = trailGroup.children.pop();
        if (child && child.type === 'Line') {
          const line = child as THREE.Line;
          line.geometry.dispose();
          if (Array.isArray(line.material)) {
            line.material.forEach((mat) => mat.dispose());
          } else {
            line.material.dispose();
          }
        }
      }
      const trails = useGameStore.getState().gestureTrails;
      trails.forEach((trail) => {
        const points = trail.points.map(([x, y, z]) => new THREE.Vector3(x, y, z));
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({
          color: trail.velocity > 2 ? '#7efff5' : '#44cdee',
          linewidth: 3
        });
        const line = new THREE.Line(geometry, material);
        trailGroup.add(line);
      });
    };

    resize();
    window.addEventListener('resize', resize);

    const unsubFruits = useGameStore.subscribe((state) => state.fruits, syncFruits);
    const unsubTrails = useGameStore.subscribe(
      (state) => state.gestureTrails,
      syncTrails
    );

    let animationFrame = 0;
    let lastTime = performance.now();
    const loop = (now: number) => {
      const delta = (now - lastTime) / 1000;
      lastTime = now;
      useGameStore.getState().updateFrame(delta);
      renderer.render(scene, camera);
      animationFrame = requestAnimationFrame(loop);
    };
    animationFrame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animationFrame);
      unsubFruits();
      unsubTrails();
      syncTrails();
      fruitMeshes.forEach((mesh) => {
        mesh.geometry.dispose();
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((mat) => mat.dispose());
        } else {
          mesh.material.dispose();
        }
      });
      renderer.dispose();
      window.removeEventListener('resize', resize);
    };
  }, [canvasRef]);
}

