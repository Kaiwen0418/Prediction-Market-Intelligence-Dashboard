"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useTheme } from "@/components/theme/ThemeProvider";

type AnimatedArc = {
  length: number;
  line: THREE.Line<THREE.BufferGeometry, THREE.LineBasicMaterial>;
  progress: number;
};

const HUBS = {
  Dubai: { lat: 25.2048, lon: 55.2708 },
  London: { lat: 51.5074, lon: -0.1278 },
  NewYork: { lat: 40.7128, lon: -74.006 },
  Singapore: { lat: 1.3521, lon: 103.8198 }
} as const;

const CONNECTIONS: Array<[keyof typeof HUBS, keyof typeof HUBS]> = [
  ["NewYork", "London"],
  ["London", "Dubai"],
  ["Dubai", "Singapore"],
  ["Singapore", "London"],
  ["NewYork", "Singapore"]
];

const GLOBE_RADIUS = 100;

function getPositionFromLatLon(lat: number, lon: number, radius: number) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);

  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);

  return new THREE.Vector3(x, y, z);
}

export function ThreeGlobeVisual() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { theme } = useTheme();

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    camera.position.z = 300;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    const computedStyles = getComputedStyle(document.documentElement);
    const ink = computedStyles.getPropertyValue("--demo-card-text").trim() || "#0c0c0c";
    const globeInk = theme === "dark" ? "#f4efe5" : ink;
    const arcInk = theme === "dark" ? "#f6f1e7" : ink;
    const inkColor = new THREE.Color(globeInk);
    const arcColor = new THREE.Color(arcInk);
    const wireOpacity = theme === "dark" ? 0.58 : 0.16;
    const arcOpacity = theme === "dark" ? 0.96 : 0.9;

    const globeGroup = new THREE.Group();
    scene.add(globeGroup);

    const geometry = new THREE.IcosahedronGeometry(GLOBE_RADIUS, 3);
    const edgesGeometry = new THREE.EdgesGeometry(geometry);
    const wireframeMaterial = new THREE.LineBasicMaterial({
      color: inkColor,
      opacity: wireOpacity,
      transparent: true
    });
    const wireframeSphere = new THREE.LineSegments(edgesGeometry, wireframeMaterial);
    globeGroup.add(wireframeSphere);

    const hubVectors = {} as Record<keyof typeof HUBS, THREE.Vector3>;
    const markerGeometry = new THREE.CircleGeometry(2, 16);
    const markerMaterial = new THREE.MeshBasicMaterial({
      color: inkColor,
      side: THREE.DoubleSide
    });

    (Object.entries(HUBS) as Array<[keyof typeof HUBS, (typeof HUBS)[keyof typeof HUBS]]>).forEach(([name, coords]) => {
      const position = getPositionFromLatLon(coords.lat, coords.lon, GLOBE_RADIUS);
      hubVectors[name] = position;

      const marker = new THREE.Mesh(markerGeometry, markerMaterial);
      marker.position.copy(position);
      marker.lookAt(new THREE.Vector3(0, 0, 0));
      globeGroup.add(marker);
    });

    const arcs: AnimatedArc[] = [];

    function createArc(startVec: THREE.Vector3, endVec: THREE.Vector3) {
      const mid = startVec.clone().lerp(endVec, 0.5);
      const distance = startVec.distanceTo(endVec);
      mid.normalize();
      mid.multiplyScalar(GLOBE_RADIUS + distance * 0.3);

      const curve = new THREE.QuadraticBezierCurve3(startVec, mid, endVec);
      const points = curve.getPoints(50);
      const pathGeometry = new THREE.BufferGeometry().setFromPoints(points);
      const pathMaterial = new THREE.LineBasicMaterial({
        color: arcColor,
        opacity: arcOpacity,
        transparent: true
      });

      const arcLine = new THREE.Line(pathGeometry, pathMaterial);
      arcLine.geometry.setDrawRange(0, 0);
      globeGroup.add(arcLine);

      arcs.push({
        length: points.length,
        line: arcLine,
        progress: Math.random() * 2
      });
    }

    CONNECTIONS.forEach(([start, end]) => {
      createArc(hubVectors[start], hubVectors[end]);
    });

    globeGroup.rotation.x = 0.2;
    globeGroup.rotation.y = -0.5;

    let frameId = 0;
    const clock = new THREE.Clock();

    const resize = () => {
      const width = container.clientWidth || 500;
      const height = container.clientHeight || 500;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    resize();

    const animate = () => {
      frameId = window.requestAnimationFrame(animate);
      const delta = clock.getDelta();

      globeGroup.rotation.y += 0.002;

      arcs.forEach((arc) => {
        arc.progress += delta * 0.8;
        if (arc.progress > 2) {
          arc.progress = 0;
        }

        const segmentLength = 15;
        const totalPoints = arc.length;
        let startPoint = Math.floor(arc.progress * totalPoints) - segmentLength;
        let endPoint = Math.floor(arc.progress * totalPoints);

        startPoint = Math.max(0, startPoint);
        endPoint = Math.min(totalPoints, endPoint);

        if (startPoint > totalPoints) {
          arc.line.geometry.setDrawRange(0, 0);
        } else {
          arc.line.geometry.setDrawRange(startPoint, Math.max(0, endPoint - startPoint));
        }
      });

      renderer.render(scene, camera);
    };

    animate();

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);

    return () => {
      window.cancelAnimationFrame(frameId);
      resizeObserver.disconnect();

      markerGeometry.dispose();
      markerMaterial.dispose();
      edgesGeometry.dispose();
      wireframeMaterial.dispose();
      geometry.dispose();
      arcs.forEach((arc) => {
        arc.line.geometry.dispose();
        arc.line.material.dispose();
      });
      renderer.dispose();
      container.innerHTML = "";
    };
  }, [theme]);

  return <div ref={containerRef} className="product-demo-globe" aria-hidden="true" />;
}
