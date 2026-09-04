import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from 
"three/examples/jsm/controls/OrbitControls.js";

function OceanScene() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(
      45,
      mountRef.current.clientWidth / mountRef.current.clientHeight,
      0.1,
      100
    );

    camera.position.z = 3;


    const renderer = new THREE.WebGLRenderer({
      antialias: true,
    });

    renderer.setSize(
      mountRef.current.clientWidth,
      mountRef.current.clientHeight
    );

    mountRef.current.appendChild(renderer.domElement);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    

    // Earth
    const geometry = new THREE.SphereGeometry(1, 64, 64);

   const textureLoader = new THREE.TextureLoader();

const earthTexture = textureLoader.load("/earth.jpg");

const material = new THREE.MeshStandardMaterial({
  map: earthTexture,
  roughness: 0.8,
    });

    const earth = new THREE.Mesh(geometry, material);

    scene.add(earth);

    // Lighting
    const light = new THREE.DirectionalLight(0xffffff, 2);

    light.position.set(5, 3, 5);

    scene.add(light);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);

    scene.add(ambientLight);

    // Animation
    const animate = () => {
      requestAnimationFrame(animate);

      earth.rotation.y += 0.003;
      controls.update();
      renderer.render(scene, camera);
    };

    animate();

    // Resize
    const handleResize = () => {
      if (!mountRef.current) return;

      camera.aspect =
        mountRef.current.clientWidth /
        mountRef.current.clientHeight;

      camera.updateProjectionMatrix();

      renderer.setSize(
        mountRef.current.clientWidth,
        mountRef.current.clientHeight
      );
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);

      if (mountRef.current?.contains(renderer.domElement)) {
        mountRef.current.removeChild(renderer.domElement);
      }

      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, []);

  return <div ref={mountRef} style={{ width: "100%", height: "100%" }} />;
}

export default OceanScene;