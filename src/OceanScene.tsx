import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { OceanDataPoint } from "./data/oceandata";

export interface OceanSceneProps {
  parameter?: "Temperature" | "Salinity" | "Current Speed";
  depth?: number;
  points?: OceanDataPoint[];
  selectedPointId?: string | null;
  onSelectPoint?: (point: OceanDataPoint | null) => void;
}

// Convert geographic coordinates (lat, lon) to 3D sphere position
function latLonToVector3(lat: number, lon: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

export default function OceanScene({
  parameter = "Temperature",
  depth = 100,
  points = [],
  selectedPointId = null,
  onSelectPoint,
}: OceanSceneProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const depthMeshRef = useRef<THREE.Mesh | null>(null);
  const dataPointsGroupRef = useRef<THREE.Group | null>(null);
  const clickableMeshesRef = useRef<THREE.Mesh[]>([]);

  // Update subsurface wireframe depth slice & color based on selected parameter
  useEffect(() => {
    if (!depthMeshRef.current) return;
    const depthScale = Math.max(0.7, 1.01 - (depth / 5000) * 0.31);
    depthMeshRef.current.scale.set(depthScale, depthScale, depthScale);

    const colorMap: Record<string, number> = {
      Temperature: 0x00c2ff,
      Salinity: 0x55e6a5,
      "Current Speed": 0xffaa00,
    };

    const mat = depthMeshRef.current.material as THREE.MeshStandardMaterial;
    mat.color.setHex(colorMap[parameter] || 0x00c2ff);
  }, [depth, parameter]);

  // Dynamically re-render 3D pins and vertical depth lines
  useEffect(() => {
    if (!dataPointsGroupRef.current) return;
    const group = dataPointsGroupRef.current;
    clickableMeshesRef.current = [];

    // Clear previous elements
    while (group.children.length > 0) {
      const obj = group.children[0] as THREE.Mesh | THREE.Line;
      if (obj.geometry) obj.geometry.dispose();
      group.remove(obj);
    }

    // Render pins from current points array
    points.forEach((p) => {
      const surfacePos = latLonToVector3(p.latitude, p.longitude, 1.02);
      const isObs = p.source === "observation";
      const isSelected = p.id === selectedPointId;

      // Surface marker sphere
      const size = isSelected ? 0.04 : isObs ? 0.026 : 0.018;
      const markerGeo = new THREE.SphereGeometry(size, 16, 16);
      const markerMat = new THREE.MeshStandardMaterial({
        color: isSelected ? 0xff0077 : isObs ? 0xffd166 : 0x00f0ff,
        emissive: isSelected ? 0xff0055 : 0x000000,
        emissiveIntensity: isSelected ? 0.8 : 0,
        roughness: 0.3,
      });

      const marker = new THREE.Mesh(markerGeo, markerMat);
      marker.position.copy(surfacePos);
      marker.userData = { pointData: p };
      group.add(marker);
      clickableMeshesRef.current.push(marker);

      // Vertical subsurface cast line indicating profile depth
      const depthRadius = Math.max(0.7, 1.0 - (p.depth / 5000) * 0.3);
      const deepPos = latLonToVector3(p.latitude, p.longitude, depthRadius);
      const lineGeo = new THREE.BufferGeometry().setFromPoints([surfacePos, deepPos]);
      const lineMat = new THREE.LineBasicMaterial({
        color: isSelected ? 0xff0077 : isObs ? 0xffd166 : 0x00f0ff,
        transparent: true,
        opacity: isSelected ? 1.0 : 0.6,
      });
      const line = new THREE.Line(lineGeo, lineMat);
      group.add(line);
    });
  }, [points, selectedPointId]);

  // Main Three.js Scene Setup & Raycasting Click Handler
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 300;
    const height = container.clientHeight || 300;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 1.2, 2.8);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    const globeGroup = new THREE.Group();
    scene.add(globeGroup);

    // Earth Sphere
    const earthGeo = new THREE.SphereGeometry(1, 64, 64);
    const textureLoader = new THREE.TextureLoader();
    const earthTexture = textureLoader.load("/earth.jpg");
    const earthMat = new THREE.MeshStandardMaterial({
      map: earthTexture,
      roughness: 0.7,
      metalness: 0.1,
    });
    const earth = new THREE.Mesh(earthGeo, earthMat);
    globeGroup.add(earth);

    // Subsurface Depth Layer
    const depthGeo = new THREE.SphereGeometry(1.01, 48, 48);
    const depthMat = new THREE.MeshStandardMaterial({
      color: 0x00c2ff,
      wireframe: true,
      transparent: true,
      opacity: 0.5,
    });
    const depthMesh = new THREE.Mesh(depthGeo, depthMat);
    depthMeshRef.current = depthMesh;
    globeGroup.add(depthMesh);

    // Points group
    const dataPointsGroup = new THREE.Group();
    dataPointsGroupRef.current = dataPointsGroup;
    globeGroup.add(dataPointsGroup);

    // Lights
    const dirLight = new THREE.DirectionalLight(0xffffff, 2);
    dirLight.position.set(5, 3, 5);
    scene.add(dirLight);
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));

    // Raycaster for selecting pins
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let isClickDrag = false;
    let dragStart = { x: 0, y: 0 };

    const handlePointerDown = (e: MouseEvent) => {
      isClickDrag = false;
      dragStart = { x: e.clientX, y: e.clientY };
    };

    const handlePointerMove = (e: MouseEvent) => {
      if (Math.hypot(e.clientX - dragStart.x, e.clientY - dragStart.y) > 5) {
        isClickDrag = true;
      }
    };

    const handlePointerUp = (e: MouseEvent) => {
      if (isClickDrag || !onSelectPoint) return;

      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(clickableMeshesRef.current, false);

      if (intersects.length > 0) {
        const target = intersects[0].object as THREE.Mesh;
        const pt = target.userData.pointData as OceanDataPoint;
        onSelectPoint(pt);
      }
    };

    renderer.domElement.addEventListener("mousedown", handlePointerDown);
    renderer.domElement.addEventListener("mousemove", handlePointerMove);
    renderer.domElement.addEventListener("mouseup", handlePointerUp);

    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
      renderer.domElement.removeEventListener("mousedown", handlePointerDown);
      renderer.domElement.removeEventListener("mousemove", handlePointerMove);
      renderer.domElement.removeEventListener("mouseup", handlePointerUp);

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      controls.dispose();
      earthGeo.dispose();
      earthMat.dispose();
      depthGeo.dispose();
      depthMat.dispose();
      renderer.dispose();
    };
  }, [onSelectPoint]);

  return <div ref={mountRef} style={{ width: "100%", height: "100%" }} />;
}