import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

type Location = {
  latitude: number;
  longitude: number;
};

type OceanData = {
  temperature: number | null;
  salinity: number | null;
  currentSpeed: number | null;
  currentDirection: number | null;
  actualLatitude: number | null;
  actualLongitude: number | null;
  time: string | null;
};

type OceanSceneProps = {
  depth: number;
  oceanData: OceanData;
  onLocationSelect?: (location: Location) => void;
};

type ViewMode = "earth" | "zooming" | "underwater";

function OceanScene({
  depth,
  oceanData,
  onLocationSelect,
}: OceanSceneProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const cameraRef =
    useRef<THREE.PerspectiveCamera | null>(null);

  const controlsRef =
    useRef<OrbitControls | null>(null);

  const earthGroupRef =
    useRef<THREE.Group | null>(null);

  const earthRef =
    useRef<THREE.Mesh | null>(null);

  const markerRef =
    useRef<THREE.Mesh | null>(null);

  const markerGlowRef =
    useRef<THREE.Mesh | null>(null);

  const starsRef =
    useRef<THREE.Points | null>(null);

  const underwaterGroupRef =
    useRef<THREE.Group | null>(null);

  const viewModeRef =
    useRef<ViewMode>("earth");

  const callbackRef =
    useRef(onLocationSelect);

  const selectedPointRef =
    useRef(new THREE.Vector3());

  const zoomStartCameraRef =
    useRef(new THREE.Vector3());

  const zoomStartTargetRef =
    useRef(new THREE.Vector3());

  const zoomEndCameraRef =
    useRef(new THREE.Vector3());

  const zoomEndTargetRef =
    useRef(new THREE.Vector3());

  const zoomProgressRef =
    useRef(0);

  const [viewMode, setViewMode] =
    useState<ViewMode>("earth");

  const [selectedLocation, setSelectedLocation] =
    useState<Location | null>(null);

  const [visibleParameter, setVisibleParameter] =
    useState(0);

  /*
   * Keep callback updated.
   */

  useEffect(() => {
    callbackRef.current =
      onLocationSelect;
  }, [onLocationSelect]);

  /*
   * =========================================================
   * THREE.JS
   * =========================================================
   */

  useEffect(() => {
    const mount =
      mountRef.current;

    if (!mount) {
      return;
    }

    /*
     * -------------------------------------------------------
     * SCENE
     * -------------------------------------------------------
     */

    const scene =
      new THREE.Scene();

    scene.background =
      new THREE.Color(0x010611);

    /*
     * -------------------------------------------------------
     * CAMERA
     * -------------------------------------------------------
     */

    const camera =
      new THREE.PerspectiveCamera(
        42,
        mount.clientWidth /
          mount.clientHeight,
        0.01,
        200
      );

    camera.position.set(
      0,
      0,
      3.2
    );

    cameraRef.current =
      camera;

    /*
     * -------------------------------------------------------
     * RENDERER
     * -------------------------------------------------------
     */

    const renderer =
      new THREE.WebGLRenderer({
        antialias: true,
      });

    renderer.setPixelRatio(
      Math.min(
        window.devicePixelRatio,
        2
      )
    );

    renderer.setSize(
      mount.clientWidth,
      mount.clientHeight
    );

    renderer.domElement.style.width =
      "100%";

    renderer.domElement.style.height =
      "100%";

    renderer.domElement.style.display =
      "block";

    renderer.domElement.style.touchAction =
      "none";

    mount.appendChild(
      renderer.domElement
    );

    /*
     * -------------------------------------------------------
     * CONTROLS
     * -------------------------------------------------------
     */

    const controls =
      new OrbitControls(
        camera,
        renderer.domElement
      );

    controls.enableDamping =
      true;

    controls.dampingFactor =
      0.06;

    controls.enableRotate =
      true;

    controls.enableZoom =
      true;

    controls.enablePan =
      true;

    controls.rotateSpeed =
      0.7;

    controls.zoomSpeed =
      0.9;

    controls.minDistance =
      1.15;

    controls.maxDistance =
      8;

    /*
     * No camera auto rotation.
     */

    controls.autoRotate =
      false;

    controlsRef.current =
      controls;

    /*
     * =========================================================
     * STARS
     * =========================================================
     */

    const starCount =
      5000;

    const positions =
      new Float32Array(
        starCount * 3
      );

    for (
      let i = 0;
      i < starCount;
      i++
    ) {
      const radius =
        18 +
        Math.random() * 70;

      const theta =
        Math.random() *
        Math.PI *
        2;

      const phi =
        Math.acos(
          2 * Math.random() - 1
        );

      positions[i * 3] =
        radius *
        Math.sin(phi) *
        Math.cos(theta);

      positions[i * 3 + 1] =
        radius *
        Math.cos(phi);

      positions[i * 3 + 2] =
        radius *
        Math.sin(phi) *
        Math.sin(theta);
    }

    const starGeometry =
      new THREE.BufferGeometry();

    starGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(
        positions,
        3
      )
    );

    const starMaterial =
      new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.045,
        transparent: true,
        opacity: 0.9,
        sizeAttenuation: true,
      });

    const stars =
      new THREE.Points(
        starGeometry,
        starMaterial
      );

    scene.add(
      stars
    );

    starsRef.current =
      stars;

    /*
     * =========================================================
     * EARTH
     * =========================================================
     */

    const earthGroup =
      new THREE.Group();

    scene.add(
      earthGroup
    );

    earthGroupRef.current =
      earthGroup;

    /*
     * Earth geometry.
     */

    const earthGeometry =
      new THREE.SphereGeometry(
        1,
        128,
        128
      );

    /*
     * Earth texture.
     *
     * Keep your existing image in:
     *
     * public/bluemarble-2048_earth.png
     */

    const textureLoader =
      new THREE.TextureLoader();

    const earthTexture =
      textureLoader.load(
        "/bluemarble-2048_earth.png"
      );

    earthTexture.colorSpace =
      THREE.SRGBColorSpace;

    const earthMaterial =
      new THREE.MeshStandardMaterial({
        map: earthTexture,
        roughness: 0.85,
        metalness: 0.02,
      });

    const earth =
      new THREE.Mesh(
        earthGeometry,
        earthMaterial
      );

    earthGroup.add(
      earth
    );

    earthRef.current =
      earth;

    /*
     * =========================================================
     * ATMOSPHERE
     * =========================================================
     */

    const atmosphereGeometry =
      new THREE.SphereGeometry(
        1.045,
        96,
        96
      );

    const atmosphereMaterial =
      new THREE.MeshBasicMaterial({
        color: 0x159fff,
        transparent: true,
        opacity: 0.14,
        side: THREE.BackSide,
      });

    const atmosphere =
      new THREE.Mesh(
        atmosphereGeometry,
        atmosphereMaterial
      );

    earthGroup.add(
      atmosphere
    );

    /*
     * =========================================================
     * LIGHT
     * =========================================================
     */

    const directionalLight =
      new THREE.DirectionalLight(
        0xffffff,
        3
      );

    directionalLight.position.set(
      5,
      3,
      5
    );

    scene.add(
      directionalLight
    );

    const ambientLight =
      new THREE.AmbientLight(
        0x8bbcff,
        0.7
      );

    scene.add(
      ambientLight
    );

    /*
     * =========================================================
     * CYAN LOCATION DOT
     * =========================================================
     */

    const marker =
      new THREE.Mesh(
        new THREE.SphereGeometry(
          0.035,
          32,
          32
        ),
        new THREE.MeshBasicMaterial({
          color: 0x00eaff,
        })
      );

    marker.visible =
      false;

    scene.add(
      marker
    );

    markerRef.current =
      marker;

    /*
     * Marker glow.
     */

    const markerGlow =
      new THREE.Mesh(
        new THREE.SphereGeometry(
          0.09,
          32,
          32
        ),
        new THREE.MeshBasicMaterial({
          color: 0x00eaff,
          transparent: true,
          opacity: 0.25,
        })
      );

    markerGlow.visible =
      false;

    scene.add(
      markerGlow
    );

    markerGlowRef.current =
      markerGlow;

    /*
     * =========================================================
     * UNDERWATER WORLD
     * =========================================================
     */

    const underwaterGroup =
      new THREE.Group();

    underwaterGroup.visible =
      false;

    scene.add(
      underwaterGroup
    );

    underwaterGroupRef.current =
      underwaterGroup;

    /*
     * Water environment.
     */

    const waterGeometry =
      new THREE.SphereGeometry(
        8,
        64,
        64
      );

    const waterMaterial =
      new THREE.MeshBasicMaterial({
        color: 0x003c63,
        transparent: true,
        opacity: 0.65,
        side: THREE.BackSide,
        depthWrite: false,
      });

    const water =
      new THREE.Mesh(
        waterGeometry,
        waterMaterial
      );

    underwaterGroup.add(
      water
    );

    /*
     * =========================================================
     * SEA SURFACE
     * =========================================================
     */

    const surfaceGeometry =
      new THREE.PlaneGeometry(
        16,
        16,
        40,
        40
      );

    const surfaceMaterial =
      new THREE.MeshBasicMaterial({
        color: 0x0b8baa,
        transparent: true,
        opacity: 0.28,
        side: THREE.DoubleSide,
      });

    const surface =
      new THREE.Mesh(
        surfaceGeometry,
        surfaceMaterial
      );

    surface.rotation.x =
      -Math.PI / 2;

    surface.position.y =
      3;

    underwaterGroup.add(
      surface
    );

    /*
     * =========================================================
     * UNDERWATER PARTICLES
     * =========================================================
     */

    const particleCount =
      2200;

    const particlePositions =
      new Float32Array(
        particleCount * 3
      );

    for (
      let i = 0;
      i < particleCount;
      i++
    ) {
      particlePositions[i * 3] =
        (Math.random() - 0.5) *
        14;

      particlePositions[i * 3 + 1] =
        (Math.random() - 0.5) *
        10;

      particlePositions[i * 3 + 2] =
        (Math.random() - 0.5) *
        14;
    }

    const particleGeometry =
      new THREE.BufferGeometry();

    particleGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(
        particlePositions,
        3
      )
    );

    const particleMaterial =
      new THREE.PointsMaterial({
        color: 0x9cefff,
        size: 0.025,
        transparent: true,
        opacity: 0.55,
      });

    const particles =
      new THREE.Points(
        particleGeometry,
        particleMaterial
      );

    underwaterGroup.add(
      particles
    );

    /*
     * =========================================================
     * UNDERWATER LIGHT RAYS
     * =========================================================
     */

    const lightRayGroup =
      new THREE.Group();

    const lightRayMaterial =
      new THREE.LineBasicMaterial({
        color: 0x7deaff,
        transparent: true,
        opacity: 0.16,
      });

    for (
      let i = 0;
      i < 18;
      i++
    ) {
      const x =
        -7 +
        i * 0.8;

      const points = [
        new THREE.Vector3(
          x,
          4,
          -2
        ),
        new THREE.Vector3(
          x + 1.2,
          -5,
          -2
        ),
      ];

      const geometry =
        new THREE.BufferGeometry().setFromPoints(
          points
        );

      const line =
        new THREE.Line(
          geometry,
          lightRayMaterial
        );

      lightRayGroup.add(
        line
      );
    }

    underwaterGroup.add(
      lightRayGroup
    );

    /*
     * =========================================================
     * CURRENT FLOW
     * =========================================================
     */

    const currentGroup =
      new THREE.Group();

    const currentMaterial =
      new THREE.LineBasicMaterial({
        color: 0x00eaff,
        transparent: true,
        opacity: 0.45,
      });

    for (
      let i = 0;
      i < 12;
      i++
    ) {
      const curve =
        new THREE.CatmullRomCurve3([
          new THREE.Vector3(
            -7,
            -3 +
              i * 0.5,
            -1
          ),

          new THREE.Vector3(
            -3,
            -2.4 +
              i * 0.5,
            0
          ),

          new THREE.Vector3(
            1,
            -3.2 +
              i * 0.5,
            0.5
          ),

          new THREE.Vector3(
            7,
            -2.4 +
              i * 0.5,
            0
          ),
        ]);

      const points =
        curve.getPoints(
          50
        );

      const geometry =
        new THREE.BufferGeometry().setFromPoints(
          points
        );

      const line =
        new THREE.Line(
          geometry,
          currentMaterial
        );

      currentGroup.add(
        line
      );
    }

    underwaterGroup.add(
      currentGroup
    );

    /*
     * =========================================================
     * RAYCASTING
     * =========================================================
     */

    const raycaster =
      new THREE.Raycaster();

    const mouse =
      new THREE.Vector2();

    let pointerDownX = 0;
    let pointerDownY = 0;

    const handlePointerDown =
      (event: PointerEvent) => {
        pointerDownX =
          event.clientX;

        pointerDownY =
          event.clientY;
      };

    const handlePointerUp =
      (event: PointerEvent) => {
        if (
          event.button !== 0
        ) {
          return;
        }

        const movement =
          Math.abs(
            event.clientX -
              pointerDownX
          ) +
          Math.abs(
            event.clientY -
              pointerDownY
          );

        /*
         * Dragging is not a click.
         */

        if (
          movement > 8
        ) {
          return;
        }

        /*
         * Only Earth mode can
         * select a new location.
         */

        if (
          viewModeRef.current !==
          "earth"
        ) {
          return;
        }

        const rect =
          renderer.domElement.getBoundingClientRect();

        mouse.x =
          ((event.clientX -
            rect.left) /
            rect.width) *
            2 -
          1;

        mouse.y =
          -(
            ((event.clientY -
              rect.top) /
              rect.height) *
              2 -
            1
          );

        raycaster.setFromCamera(
          mouse,
          camera
        );

        const intersection =
          raycaster.intersectObject(
            earth
          )[0];

        if (!intersection) {
          return;
        }

        /*
         * -----------------------------------------------------
         * SELECTED SURFACE POINT
         * -----------------------------------------------------
         */

        const point =
          intersection.point.clone();

        const radius =
          point.length();

        /*
         * Latitude.
         */

        const latitude =
          Math.asin(
            point.y /
              radius
          ) *
          (180 / Math.PI);

        /*
         * Longitude.
         */

        const longitude =
          -Math.atan2(
            point.z,
            point.x
          ) *
          (180 / Math.PI);

        const surfacePoint =
          point
            .normalize()
            .multiplyScalar(
              1.04
            );

        /*
         * Show cyan marker.
         */

        marker.position.copy(
          surfacePoint
        );

        markerGlow.position.copy(
          surfacePoint
        );

        marker.visible =
          true;

        markerGlow.visible =
          true;

        selectedPointRef.current =
          surfacePoint.clone();

        /*
         * Send location to App.
         */

        const location = {
          latitude,
          longitude,
        };

        setSelectedLocation(
          location
        );

        callbackRef.current?.(
          location
        );

        /*
         * -----------------------------------------------------
         * START ZOOM
         * -----------------------------------------------------
         */

        viewModeRef.current =
          "zooming";

        setViewMode(
          "zooming"
        );

        zoomStartCameraRef.current =
          camera.position.clone();

        zoomStartTargetRef.current =
          controls.target.clone();

        const direction =
          surfacePoint
            .clone()
            .normalize();

        zoomEndCameraRef.current =
          direction
            .clone()
            .multiplyScalar(
              1.48
            );

        zoomEndTargetRef.current =
          surfacePoint
            .clone()
            .multiplyScalar(
              0.92
            );

        zoomProgressRef.current =
          0;

        /*
         * Disable controls while
         * camera performs automatic zoom.
         */

        controls.enabled =
          false;
      };

    renderer.domElement.addEventListener(
      "pointerdown",
      handlePointerDown
    );

    renderer.domElement.addEventListener(
      "pointerup",
      handlePointerUp
    );

    /*
     * =========================================================
     * RESIZE
     * =========================================================
     */

    const handleResize =
      () => {
        const width =
          mount.clientWidth;

        const height =
          mount.clientHeight;

        if (
          width <= 0 ||
          height <= 0
        ) {
          return;
        }

        camera.aspect =
          width / height;

        camera.updateProjectionMatrix();

        renderer.setSize(
          width,
          height
        );
      };

    window.addEventListener(
      "resize",
      handleResize
    );

    /*
     * =========================================================
     * ANIMATION
     * =========================================================
     */

    let animationId =
      0;

    const animate =
      () => {
        animationId =
          requestAnimationFrame(
            animate
          );

        const mode =
          viewModeRef.current;

        /*
         * -----------------------------------------------------
         * EARTH ROTATION
         * -----------------------------------------------------
         */

        if (
          mode === "earth"
        ) {
          earthGroup.rotation.y +=
            0.0015;
        }

        /*
         * -----------------------------------------------------
         * ZOOM
         * -----------------------------------------------------
         */

        if (
          mode ===
          "zooming"
        ) {
          zoomProgressRef.current +=
            0.012;

          const progress =
            Math.min(
              zoomProgressRef.current,
              1
            );

          /*
           * Smooth cubic ease-out.
           */

          const eased =
            1 -
            Math.pow(
              1 - progress,
              3
            );

          camera.position.lerpVectors(
            zoomStartCameraRef.current,
            zoomEndCameraRef.current,
            eased
          );

          controls.target.lerpVectors(
            zoomStartTargetRef.current,
            zoomEndTargetRef.current,
            eased
          );

          if (
            progress >= 1
          ) {
            /*
             * -------------------------------------------------
             * ENTER UNDERWATER
             * -------------------------------------------------
             */

            viewModeRef.current =
              "underwater";

            setViewMode(
              "underwater"
            );

            /*
             * Hide Earth.
             */

            earthGroup.visible =
              false;

            /*
             * Hide stars.
             */

            stars.visible =
              false;

            /*
             * Show underwater scene.
             */

            underwaterGroup.visible =
              true;

            /*
             * Put camera inside ocean.
             */

            camera.position.set(
              0,
              0.7,
              6
            );

            controls.target.set(
              0,
              0,
              0
            );

            controls.enabled =
              true;

            controls.minDistance =
              2;

            controls.maxDistance =
              15;

            controls.update();

            /*
             * Start parameter animation.
             */

            setVisibleParameter(
              1
            );
          }
        }

        /*
         * -----------------------------------------------------
         * UNDERWATER ANIMATION
         * -----------------------------------------------------
         */

        if (
          mode ===
          "underwater"
        ) {
          particles.rotation.y +=
            0.0007;

          particles.position.y =
            Math.sin(
              performance.now() *
                0.0003
            ) *
            0.12;

          currentGroup.position.x =
            Math.sin(
              performance.now() *
                0.00025
            ) *
            0.35;

          lightRayGroup.rotation.z =
            Math.sin(
              performance.now() *
                0.00015
            ) *
            0.025;
        }

        /*
         * -----------------------------------------------------
         * CYAN DOT PULSE
         * -----------------------------------------------------
         */

        if (
          markerGlow.visible
        ) {
          const scale =
            1 +
            Math.sin(
              performance.now() *
                0.005
            ) *
              0.22;

          markerGlow.scale.set(
            scale,
            scale,
            scale
          );
        }

        /*
         * Update controls.
         */

        controls.update();

        renderer.render(
          scene,
          camera
        );
      };

    animate();

    /*
     * =========================================================
     * CLEANUP
     * =========================================================
     */

    return () => {
      cancelAnimationFrame(
        animationId
      );

      window.removeEventListener(
        "resize",
        handleResize
      );

      renderer.domElement.removeEventListener(
        "pointerdown",
        handlePointerDown
      );

      renderer.domElement.removeEventListener(
        "pointerup",
        handlePointerUp
      );

      controls.dispose();

      starGeometry.dispose();
      starMaterial.dispose();

      earthGeometry.dispose();
      earthMaterial.dispose();
      earthTexture.dispose();

      atmosphereGeometry.dispose();
      atmosphereMaterial.dispose();

      marker.geometry.dispose();
      (
        marker.material as THREE.Material
      ).dispose();

      markerGlow.geometry.dispose();
      (
        markerGlow.material as THREE.Material
      ).dispose();

      waterGeometry.dispose();
      waterMaterial.dispose();

      surfaceGeometry.dispose();
      surfaceMaterial.dispose();

      particleGeometry.dispose();
      particleMaterial.dispose();

      lightRayMaterial.dispose();
      currentMaterial.dispose();

      renderer.dispose();

      if (
        mount.contains(
          renderer.domElement
        )
      ) {
        mount.removeChild(
          renderer.domElement
        );
      }
    };
  }, []);

  /*
   * =========================================================
   * PARAMETER SEQUENCE
   * =========================================================
   */

  useEffect(() => {
    if (
      viewMode !==
      "underwater"
    ) {
      setVisibleParameter(
        0
      );

      return;
    }

    const timers: number[] =
      [];

    /*
     * Temperature.
     */

    timers.push(
      window.setTimeout(
        () => {
          setVisibleParameter(
            1
          );
        },
        300
      )
    );

    /*
     * Salinity.
     */

    timers.push(
      window.setTimeout(
        () => {
          setVisibleParameter(
            2
          );
        },
        1100
      )
    );

    /*
     * Current speed.
     */

    timers.push(
      window.setTimeout(
        () => {
          setVisibleParameter(
            3
          );
        },
        1900
      )
    );

    /*
     * Current direction.
     */

    timers.push(
      window.setTimeout(
        () => {
          setVisibleParameter(
            4
          );
        },
        2700
      )
    );

    /*
     * Depth.
     */

    timers.push(
      window.setTimeout(
        () => {
          setVisibleParameter(
            5
          );
        },
        3500
      )
    );

    return () => {
      timers.forEach(
        (timer) =>
          window.clearTimeout(
            timer
          )
      );
    };
  }, [viewMode]);

  /*
   * =========================================================
   * ZOOM CONTROLS
   * =========================================================
   */

  const zoomIn =
    () => {
      const camera =
        cameraRef.current;

      if (!camera) {
        return;
      }

      camera.position.multiplyScalar(
        0.8
      );
    };

  const zoomOut =
    () => {
      const camera =
        cameraRef.current;

      if (!camera) {
        return;
      }

      camera.position.multiplyScalar(
        1.2
      );
    };

  /*
   * =========================================================
   * RESET / UNDO
   * =========================================================
   */

  const resetView =
    () => {
      const camera =
        cameraRef.current;

      const controls =
        controlsRef.current;

      const earthGroup =
        earthGroupRef.current;

      const marker =
        markerRef.current;

      const markerGlow =
        markerGlowRef.current;

      const stars =
        starsRef.current;

      const underwaterGroup =
        underwaterGroupRef.current;

      if (
        !camera ||
        !controls ||
        !earthGroup ||
        !marker ||
        !markerGlow ||
        !stars ||
        !underwaterGroup
      ) {
        return;
      }

      /*
       * Return to Earth mode.
       */

      viewModeRef.current =
        "earth";

      setViewMode(
        "earth"
      );

      /*
       * Show Earth.
       */

      earthGroup.visible =
        true;

      /*
       * Show stars.
       */

      stars.visible =
        true;

      /*
       * Hide underwater environment.
       */

      underwaterGroup.visible =
        false;

      /*
       * Hide marker.
       */

      marker.visible =
        false;

      markerGlow.visible =
        false;

      /*
       * Reset marker scale.
       */

      markerGlow.scale.set(
        1,
        1,
        1
      );

      /*
       * Restore camera.
       */

      camera.position.set(
        0,
        0,
        3.2
      );

      controls.target.set(
        0,
        0,
        0
      );

      controls.minDistance =
        1.15;

      controls.maxDistance =
        8;

      controls.enabled =
        true;

      controls.update();

      /*
       * Clear location.
       */

      setSelectedLocation(
        null
      );

      setVisibleParameter(
        0
      );
    };

  /*
   * =========================================================
   * FULLSCREEN
   * =========================================================
   */

  const toggleFullscreen =
    () => {
      const wrapper =
        wrapperRef.current;

      if (!wrapper) {
        return;
      }

      if (
        !document.fullscreenElement
      ) {
        wrapper.requestFullscreen?.();
      } else {
        document.exitFullscreen?.();
      }
    };

  /*
   * =========================================================
   * FORMAT VALUES
   * =========================================================
   */

  const temperature =
    oceanData.temperature !==
    null
      ? `${oceanData.temperature.toFixed(
          2
        )} °C`
      : "--";

  const salinity =
    oceanData.salinity !==
    null
      ? `${oceanData.salinity.toFixed(
          2
        )} PSU`
      : "--";

  const currentSpeed =
    oceanData.currentSpeed !==
    null
      ? `${oceanData.currentSpeed.toFixed(
          2
        )} km/h`
      : "--";

  const currentDirection =
    oceanData.currentDirection !==
    null
      ? `${oceanData.currentDirection.toFixed(
          0
        )}°`
      : "--";

  const depthValue =
    `${depth} m`;

  /*
   * =========================================================
   * RENDER
   * =========================================================
   */

  return (
    <div
      ref={wrapperRef}
      style={{
        position:
          "relative",
        width:
          "100%",
        height:
          "100%",
        minHeight:
          "520px",
        background:
          "#010611",
        overflow:
          "hidden",
      }}
    >
      <div
        ref={mountRef}
        style={{
          width:
            "100%",
          height:
            "100%",
        }}
      />

      {selectedLocation && (
        <div
          style={{
            position:
              "absolute",
            top:
              18,
            left:
              18,
            zIndex:
              20,
            padding:
              "10px 14px",
            border:
              "1px solid rgba(0,234,255,0.35)",
            borderRadius:
              10,
            background:
              "rgba(2,15,30,0.78)",
            backdropFilter:
              "blur(10px)",
            color:
              "#bcefff",
            fontSize:
              12,
            letterSpacing:
              "0.08em",
            pointerEvents:
              "none",
          }}
        >
          SELECTED LOCATION
          <br />

          <strong
            style={{
              color:
                "#00eaff",
            }}
          >
            {selectedLocation.latitude.toFixed(
              4
            )}
            °,&nbsp;

            {selectedLocation.longitude.toFixed(
              4
            )}
            °
          </strong>
        </div>
      )}

      {viewMode ===
        "zooming" && (
        <div
          style={{
            position:
              "absolute",
            top:
              "50%",
            left:
              "50%",
            transform:
              "translate(-50%, -50%)",
            zIndex:
              20,
            color:
              "#00eaff",
            fontSize:
              13,
            letterSpacing:
              "0.18em",
            textTransform:
              "uppercase",
            pointerEvents:
              "none",
            textShadow:
              "0 0 18px rgba(0,234,255,0.8)",
          }}
        >
          Entering ocean field...
        </div>
      )}

      {viewMode ===
        "underwater" && (
        <div
          style={{
            position:
              "absolute",
            left:
              18,
            bottom:
              18,
            zIndex:
              20,
            width:
              "min(350px, calc(100% - 36px))",
            padding:
              16,
            border:
              "1px solid rgba(0,234,255,0.3)",
            borderRadius:
              14,
            background:
              "rgba(2,18,35,0.82)",
            backdropFilter:
              "blur(12px)",
            color:
              "#dffaff",
            pointerEvents:
              "none",
          }}
        >
          <div
            style={{
              fontSize:
                10,
              letterSpacing:
                "0.18em",
              color:
                "#00eaff",
              marginBottom:
                10,
            }}
          >
            LIVE OCEAN TELEMETRY
          </div>

          {visibleParameter >=
            1 && (
            <div
              style={{
                display:
                  "flex",
                justifyContent:
                  "space-between",
                padding:
                  "8px 0",
                borderBottom:
                  "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <span>
                TEMPERATURE
              </span>

              <strong>
                {temperature}
              </strong>
            </div>
          )}

          {visibleParameter >=
            2 && (
            <div
              style={{
                display:
                  "flex",
                justifyContent:
                  "space-between",
                padding:
                  "8px 0",
                borderBottom:
                  "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <span>
                SALINITY
              </span>

              <strong>
                {salinity}
              </strong>
            </div>
          )}

          {visibleParameter >=
            3 && (
            <div
              style={{
                display:
                  "flex",
                justifyContent:
                  "space-between",
                padding:
                  "8px 0",
                borderBottom:
                  "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <span>
                CURRENT SPEED
              </span>

              <strong>
                {currentSpeed}
              </strong>
            </div>
          )}

          {visibleParameter >=
            4 && (
            <div
              style={{
                display:
                  "flex",
                justifyContent:
                  "space-between",
                padding:
                  "8px 0",
                borderBottom:
                  "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <span>
                CURRENT DIRECTION
              </span>

              <strong>
                {currentDirection}
              </strong>
            </div>
          )}

          {visibleParameter >=
            5 && (
            <div
              style={{
                display:
                  "flex",
                justifyContent:
                  "space-between",
                padding:
                  "8px 0",
              }}
            >
              <span>
                DEPTH
              </span>

              <strong>
                {depthValue}
              </strong>
            </div>
          )}

          <div
            style={{
              marginTop:
                10,
              fontSize:
                9,
              color:
                "rgba(220,245,255,0.45)",
            }}
          >
            {oceanData.time
              ? `DATA TIME: ${oceanData.time}`
              : "LIVE MARINE DATA"}
          </div>
        </div>
      )}

      <div
        style={{
          position:
            "absolute",
          right:
            18,
          bottom:
            18,
          display:
            "flex",
          gap:
            7,
          zIndex:
            30,
        }}
      >
        <button
          type="button"
          onClick={
            zoomIn
          }
          title="Zoom in"
          style={{
            width:
              38,
            height:
              38,
            border:
              "1px solid rgba(0,234,255,0.35)",
            borderRadius:
              8,
            background:
              "rgba(2,18,35,0.8)",
            color:
              "#00eaff",
            fontSize:
              22,
            cursor:
              "pointer",
          }}
        >
          +
        </button>

        <button
          type="button"
          onClick={
            zoomOut
          }
          title="Zoom out"
          style={{
            width:
              38,
            height:
              38,
            border:
              "1px solid rgba(0,234,255,0.35)",
            borderRadius:
              8,
            background:
              "rgba(2,18,35,0.8)",
            color:
              "#00eaff",
            fontSize:
              22,
            cursor:
              "pointer",
          }}
        >
          −
        </button>

        <button
          type="button"
          onClick={
            resetView
          }
          title="Undo / Reset"
          style={{
            width:
              38,
            height:
              38,
            border:
              "1px solid rgba(0,234,255,0.35)",
            borderRadius:
              8,
            background:
              "rgba(2,18,35,0.8)",
            color:
              "#00eaff",
            fontSize:
              19,
            cursor:
              "pointer",
          }}
        >
          ↻
        </button>

        <button
          type="button"
          onClick={
            toggleFullscreen
          }
          title="Fullscreen"
          style={{
            width:
              38,
            height:
              38,
            border:
              "1px solid rgba(0,234,255,0.35)",
            borderRadius:
              8,
            background:
              "rgba(2,18,35,0.8)",
            color:
              "#00eaff",
            fontSize:
              19,
            cursor:
              "pointer",
          }}
        >
          ⛶
        </button>
      </div>
    </div>
  );
}

export default OceanScene;