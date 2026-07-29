"use client";

import { useEffect, useMemo, useRef } from "react";
import { Html, OrbitControls } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import Globe from "r3f-globe";
import * as THREE from "three";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import { LineSegments2 } from "three/examples/jsm/lines/LineSegments2.js";
import { LineSegmentsGeometry } from "three/examples/jsm/lines/LineSegmentsGeometry.js";
import { feature } from "topojson-client";
import usAtlas from "us-atlas/states-10m.json";
import franceRegions from "@/components/maps/data/france-regions.json";
import germanyStates from "@/components/maps/data/germany-states.json";
import ukRegions from "@/components/maps/data/uk-regions.json";
import ukraineOblasts from "@/components/maps/data/ukraine-oblasts.json";
import worldCountries from "@/components/maps/data/world-countries-110m.json";
import { getMarketSignalColor } from "@/components/maps/marketSignals";
import type {
  CountryMarketMap,
  RegionMarket
} from "@/components/maps/spotlightStates";
import { COUNTRY_MARKET_MAPS } from "@/components/maps/spotlightStates";

type Position = [number, number];

type PolygonGeometry = {
  type: "Polygon" | "MultiPolygon";
  coordinates: Position[][] | Position[][][];
};

type MapFeature = {
  id?: string | number;
  properties?: Record<string, unknown>;
  geometry: PolygonGeometry;
};

type GlobePolygon = {
  feature: MapFeature;
  geometry: PolygonGeometry;
  countryCode?: string;
  gradientCenter: Position;
  gradientRadius: number;
  region?: RegionMarket;
  signalScore?: number;
  selected?: boolean;
  layer: "land" | "region";
};

type VolumePillar = {
  lat: number;
  lng: number;
  altitude: number;
  color: string;
  radius: number;
};

type GlobeTradeLabel = {
  lat: number;
  lng: number;
  text: string;
  positive: boolean;
  selected: boolean;
};

export type GlobeRegionDatum = {
  region: RegionMarket;
  signalScore: number;
  volume24h: number | null;
};

export type GlobeTradeDatum = {
  region: RegionMarket;
  text: string;
  positive: boolean;
};

type R3fMarketGlobeProps = {
  activeCountry: CountryMarketMap;
  regions: GlobeRegionDatum[];
  selectedCode?: string | null;
  trades: GlobeTradeDatum[];
  onSelectRegion: (region: RegionMarket) => void;
};

type FeatureCollection = {
  features: MapFeature[];
};

const worldFeatureCollection = feature(
  worldCountries as never,
  (worldCountries as any).objects.countries
) as unknown as FeatureCollection;

const WORLD_FEATURES = worldFeatureCollection.features;
const GLOBE_RADIUS = 100;
const GLOBE_SCALE = 1.48;
const MAP_LIGHT_TARGET = new THREE.Vector3(4, 48, 0);
const ANALYTIC_PILLAR_SHADOWS_ENABLED = true;
const COUNTRY_BOUNDARY_CACHE = new Map<string, MapFeature[]>();

function createOceanTextures() {
  const size = 1024;
  const normalData = new Uint8Array(size * size * 4);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const u = (x / size) * Math.PI * 2;
      const v = (y / size) * Math.PI * 2;
      const dx =
        Math.cos(u * 7 + v * 3) * 0.34 +
        Math.cos(u * 13 - v * 5) * 0.14;
      const dy =
        Math.cos(v * 11 - u * 4) * 0.3 +
        Math.cos(v * 17 + u * 6) * 0.12;
      const normal = new THREE.Vector3(-dx, -dy, 1).normalize();
      const index = (y * size + x) * 4;
      normalData[index] = Math.round((normal.x * 0.5 + 0.5) * 255);
      normalData[index + 1] = Math.round((normal.y * 0.5 + 0.5) * 255);
      normalData[index + 2] = Math.round((normal.z * 0.5 + 0.5) * 255);
      normalData[index + 3] = 255;
    }
  }

  const createTexture = (data: Uint8Array) => {
    const texture = new THREE.DataTexture(
      data,
      size,
      size,
      THREE.RGBAFormat,
      THREE.UnsignedByteType
    );
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, 1);
    texture.generateMipmaps = true;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.needsUpdate = true;
    return texture;
  };

  return {
    normalMap: createTexture(normalData)
  };
}

function createOceanEnvironmentTexture() {
  const width = 1024;
  const height = 512;
  const data = new Uint8Array(width * height * 4);

  for (let y = 0; y < height; y += 1) {
    const v = y / (height - 1);
    const upperGlow = Math.exp(-(((v - 0.74) / 0.16) ** 2));
    const upperHemisphere = Math.max(0, v - 0.48);

    for (let x = 0; x < width; x += 1) {
      const u = x / (width - 1);
      const softVariation =
        Math.sin(u * Math.PI * 4 + v * Math.PI * 2) * 0.04 +
        Math.sin(u * Math.PI * 8 - v * Math.PI * 4) * 0.018;
      const brightness = THREE.MathUtils.clamp(
        0.2 + upperGlow * 0.46 + upperHemisphere * 0.2 + softVariation,
        0,
        1
      );
      const index = (y * width + x) * 4;
      data[index] = Math.round(112 + brightness * 116);
      data[index + 1] = Math.round(151 + brightness * 92);
      data[index + 2] = Math.round(166 + brightness * 82);
      data[index + 3] = 255;
    }
  }

  const texture = new THREE.DataTexture(
    data,
    width,
    height,
    THREE.RGBAFormat,
    THREE.UnsignedByteType
  );
  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

function toFeatureCollection(source: unknown, objectKey?: string): FeatureCollection {
  const candidate = source as {
    type?: string;
    features?: MapFeature[];
    objects?: Record<string, unknown>;
  };

  if (candidate.type === "FeatureCollection" && candidate.features) {
    return { features: candidate.features };
  }

  const topologyObject = objectKey
    ? candidate.objects?.[objectKey]
    : Object.values(candidate.objects ?? {})[0];

  if (!topologyObject) {
    return { features: [] };
  }

  return feature(
    source as never,
    topologyObject as never
  ) as unknown as FeatureCollection;
}

function getCountryBoundaryFeatures(country: CountryMarketMap) {
  const cachedFeatures = COUNTRY_BOUNDARY_CACHE.get(country.code);
  if (cachedFeatures) return cachedFeatures;

  let boundaryFeatures: MapFeature[];
  if (country.code === "US") {
    boundaryFeatures = toFeatureCollection(usAtlas, "states").features;
  } else if (country.code === "GB") {
    boundaryFeatures = toFeatureCollection(ukRegions, "UKregionmerc").features;
  } else if (country.code === "FR") {
    boundaryFeatures = toFeatureCollection(franceRegions).features;
  } else if (country.code === "DE") {
    boundaryFeatures = toFeatureCollection(germanyStates).features;
  } else if (country.code === "UA") {
    boundaryFeatures = toFeatureCollection(ukraineOblasts).features;
  } else {
    boundaryFeatures = WORLD_FEATURES.filter((countryFeature) =>
      country.worldFeatureIds.includes(String(countryFeature.id))
    );
  }

  COUNTRY_BOUNDARY_CACHE.set(country.code, boundaryFeatures);
  return boundaryFeatures;
}

function getFeatureId(featureItem: MapFeature, country: CountryMarketMap) {
  if (country.code === "US") {
    return String(featureItem.id).padStart(2, "0");
  }

  if (country.featureIdProperty) {
    return String(featureItem.properties?.[country.featureIdProperty] ?? "");
  }

  return String(featureItem.id);
}

function getRegionKey(region: RegionMarket) {
  return `${region.countryCode}:${region.code}`;
}

function getRegionBoundaryFeature(region: RegionMarket) {
  const country = COUNTRY_MARKET_MAPS.find(
    (candidate) => candidate.code === region.countryCode
  );
  if (!country) return null;

  if (region.coverage === "country") {
    return (
      WORLD_FEATURES.find((worldFeature) =>
        country.worldFeatureIds.includes(String(worldFeature.id))
      ) ?? null
    );
  }

  return (
    getCountryBoundaryFeatures(country).find(
      (boundaryFeature) =>
        getFeatureId(boundaryFeature, country) === region.featureId
    ) ?? null
  );
}

function seededRandom(seed: number) {
  let state = seed || 1;
  return () => {
    state = Math.imul(1664525, state) + 1013904223;
    return (state >>> 0) / 4294967296;
  };
}

function hashString(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function sampleStandardNormal(random: () => number) {
  const first = Math.max(Number.EPSILON, random());
  const second = random();
  return (
    Math.sqrt(-2 * Math.log(first)) *
    Math.cos(Math.PI * 2 * second)
  );
}

function pointInRing(point: Position, ring: Position[]) {
  let inside = false;

  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index++) {
    const [x, y] = ring[index];
    const [previousX, previousY] = ring[previous];
    const intersects =
      y > point[1] !== previousY > point[1] &&
      point[0] <
        ((previousX - x) * (point[1] - y)) / (previousY - y || 1e-9) + x;
    if (intersects) inside = !inside;
  }

  return inside;
}

function pointInPolygon(point: Position, polygon: Position[][]) {
  return (
    pointInRing(point, polygon[0]) &&
    !polygon.slice(1).some((hole) => pointInRing(point, hole))
  );
}

function polygonParts(geometry: PolygonGeometry): Position[][][] {
  return geometry.type === "Polygon"
    ? [geometry.coordinates as Position[][]]
    : (geometry.coordinates as Position[][][]);
}

function getGeometryCenter(geometry: PolygonGeometry): Position {
  const largestPart = polygonParts(geometry).reduce((largest, part) => {
    const bounds = getBounds(part);
    const largestBounds = getBounds(largest);
    const area =
      (bounds.maxLng - bounds.minLng) * (bounds.maxLat - bounds.minLat);
    const largestArea =
      (largestBounds.maxLng - largestBounds.minLng) *
      (largestBounds.maxLat - largestBounds.minLat);
    return area > largestArea ? part : largest;
  });
  const bounds = getBounds(largestPart);
  return [
    (bounds.minLng + bounds.maxLng) / 2,
    (bounds.minLat + bounds.maxLat) / 2
  ];
}

function getGradientRadius(
  geometry: PolygonGeometry,
  center: Position
) {
  const polygon = chooseRegionGeometry(geometry, center);
  const latitudeScale = Math.cos(THREE.MathUtils.degToRad(center[1]));
  const maximumDistance = polygon[0].reduce((maximum, [lng, lat]) => {
    const longitudeDistance = Math.abs(
      ((lng - center[0] + 540) % 360) - 180
    );
    const distance = Math.hypot(
      longitudeDistance * latitudeScale,
      lat - center[1]
    );
    return Math.max(maximum, distance);
  }, 0);

  return THREE.MathUtils.degToRad(Math.max(1.2, maximumDistance * 0.9));
}

function globePosition(
  [lng, lat]: Position,
  altitude: number,
  target = new THREE.Vector3()
) {
  const latitude = THREE.MathUtils.degToRad(lat);
  const longitude = THREE.MathUtils.degToRad(lng);
  const radius = GLOBE_RADIUS * (1 + altitude);
  return target.set(
    radius * Math.cos(latitude) * Math.sin(longitude),
    radius * Math.sin(latitude),
    radius * Math.cos(latitude) * Math.cos(longitude)
  );
}

type BoundaryWallSegment = {
  start: Position;
  end: Position;
  bottomAltitude: number;
  topAltitude: number;
  halfWidth: number;
  color: THREE.Color;
  priority: number;
};

function boundarySegmentKey(start: Position, end: Position) {
  const pointKey = ([lng, lat]: Position) =>
    `${lng.toFixed(4)},${lat.toFixed(4)}`;
  const startKey = pointKey(start);
  const endKey = pointKey(end);
  return startKey < endKey
    ? `${startKey}|${endKey}`
    : `${endKey}|${startKey}`;
}

function createBoundaryWallGeometry(polygons: GlobePolygon[]) {
  const segments = new Map<string, BoundaryWallSegment>();

  polygons.forEach((polygon) => {
    const capAltitude =
      polygon.layer === "land" ? 0.0045 : polygon.selected ? 0.018 : 0.011;
    const wallHeight =
      polygon.layer === "region" ? (polygon.selected ? 0.0042 : 0.0028) : 0.0016;
    const priority =
      polygon.layer === "region" ? (polygon.selected ? 3 : 2) : 1;
    const halfWidth =
      polygon.layer === "region" ? (polygon.selected ? 0.11 : 0.075) : 0.055;
    const color = new THREE.Color(
      polygon.layer === "region" ? "#f4f2eb" : "#dfe7e4"
    );

    polygonParts(polygon.geometry).forEach((part) => {
      const ring = part[0];
      for (let index = 0; index < ring.length; index += 1) {
        const start = ring[index];
        const end = ring[(index + 1) % ring.length];
        if (
          Math.abs(start[0] - end[0]) < 1e-7 &&
          Math.abs(start[1] - end[1]) < 1e-7
        ) {
          continue;
        }
        const key = boundarySegmentKey(start, end);
        if ((segments.get(key)?.priority ?? 0) > priority) continue;
        segments.set(key, {
          start,
          end,
          bottomAltitude: capAltitude + 0.0001,
          topAltitude: capAltitude + wallHeight,
          halfWidth,
          color,
          priority
        });
      }
    });
  });

  const positions: number[] = [];
  const colors: number[] = [];
  const bottomStart = new THREE.Vector3();
  const bottomEnd = new THREE.Vector3();
  const topStart = new THREE.Vector3();
  const topEnd = new THREE.Vector3();
  const radialStart = new THREE.Vector3();
  const radialEnd = new THREE.Vector3();
  const segmentDirection = new THREE.Vector3();
  const sideStart = new THREE.Vector3();
  const sideEnd = new THREE.Vector3();
  const bottomStartLeft = new THREE.Vector3();
  const bottomStartRight = new THREE.Vector3();
  const bottomEndLeft = new THREE.Vector3();
  const bottomEndRight = new THREE.Vector3();
  const topStartLeft = new THREE.Vector3();
  const topStartRight = new THREE.Vector3();
  const topEndLeft = new THREE.Vector3();
  const topEndRight = new THREE.Vector3();
  const pushFace = (points: THREE.Vector3[], color: THREE.Color) => {
    points.forEach((point) => {
      positions.push(point.x, point.y, point.z);
      colors.push(color.r, color.g, color.b);
    });
  };

  segments.forEach((segment) => {
    globePosition(segment.start, segment.bottomAltitude, bottomStart);
    globePosition(segment.end, segment.bottomAltitude, bottomEnd);
    globePosition(segment.start, segment.topAltitude, topStart);
    globePosition(segment.end, segment.topAltitude, topEnd);
    radialStart.copy(bottomStart).normalize();
    radialEnd.copy(bottomEnd).normalize();
    segmentDirection.copy(bottomEnd).sub(bottomStart).normalize();
    sideStart
      .crossVectors(radialStart, segmentDirection)
      .normalize()
      .multiplyScalar(segment.halfWidth);
    sideEnd
      .crossVectors(radialEnd, segmentDirection)
      .normalize()
      .multiplyScalar(segment.halfWidth);
    bottomStartLeft.copy(bottomStart).add(sideStart);
    bottomStartRight.copy(bottomStart).sub(sideStart);
    bottomEndLeft.copy(bottomEnd).add(sideEnd);
    bottomEndRight.copy(bottomEnd).sub(sideEnd);
    topStartLeft.copy(topStart).add(sideStart);
    topStartRight.copy(topStart).sub(sideStart);
    topEndLeft.copy(topEnd).add(sideEnd);
    topEndRight.copy(topEnd).sub(sideEnd);

    const topColor = segment.color;
    const sideColor = segment.color.clone().multiplyScalar(0.7);
    pushFace(
      [
        topStartLeft,
        topEndLeft,
        topEndRight,
        topStartLeft,
        topEndRight,
        topStartRight
      ],
      topColor
    );
    pushFace(
      [
        bottomStartLeft,
        bottomEndLeft,
        topEndLeft,
        bottomStartLeft,
        topEndLeft,
        topStartLeft
      ],
      sideColor
    );
    pushFace(
      [
        bottomEndRight,
        bottomStartRight,
        topStartRight,
        bottomEndRight,
        topStartRight,
        topEndRight
      ],
      sideColor
    );
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3)
  );
  geometry.setAttribute(
    "color",
    new THREE.Float32BufferAttribute(colors, 3)
  );
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

function chooseRegionGeometry(geometry: PolygonGeometry, center: Position) {
  const parts = polygonParts(geometry);
  const containingPart = parts.find((polygon) => pointInPolygon(center, polygon));
  return containingPart ?? parts[0];
}

function getBounds(polygon: Position[][]) {
  return polygon[0].reduce(
    (bounds, [lng, lat]) => ({
      minLng: Math.min(bounds.minLng, lng),
      maxLng: Math.max(bounds.maxLng, lng),
      minLat: Math.min(bounds.minLat, lat),
      maxLat: Math.max(bounds.maxLat, lat)
    }),
    {
      minLng: Number.POSITIVE_INFINITY,
      maxLng: Number.NEGATIVE_INFINITY,
      minLat: Number.POSITIVE_INFINITY,
      maxLat: Number.NEGATIVE_INFINITY
    }
  );
}

function volumeProgress(volume24h: number | null, score: number) {
  if (volume24h !== null && Number.isFinite(volume24h)) {
    return Math.log1p(Math.min(500_000, Math.max(0, volume24h))) /
      Math.log1p(500_000);
  }
  return Math.max(0.16, Math.min(0.58, score / 155));
}

function interpolateColor(start: string, end: string, progress: number) {
  const color = new THREE.Color(start);
  color.lerp(new THREE.Color(end), Math.max(0, Math.min(1, progress)));
  return `#${color.getHexString()}`;
}

function adjustColor(
  source: string,
  lightnessDelta: number,
  saturationDelta = 0
) {
  const color = new THREE.Color(source);
  const hsl = { h: 0, s: 0, l: 0 };
  color.getHSL(hsl);
  color.setHSL(
    hsl.h,
    Math.max(0, Math.min(1, hsl.s + saturationDelta)),
    Math.max(0, Math.min(1, hsl.l + lightnessDelta))
  );
  return `#${color.getHexString()}`;
}

function getPolygonScoreColor(polygon: GlobePolygon) {
  if (polygon.layer === "land") {
    return polygon.signalScore === undefined
      ? "#d6d6d1"
      : getMarketSignalColor(polygon.signalScore);
  }
  if (!polygon.region) return "#c8c9c5";
  return polygon.selected
    ? getMarketSignalColor(Math.max(82, polygon.signalScore ?? 0))
    : getMarketSignalColor(polygon.signalScore ?? 0);
}

function getGlobeSignalColor(score: number) {
  const baseColor = getMarketSignalColor(score);
  return score < 50
    ? adjustColor(baseColor, -0.025, 0.24)
    : adjustColor(baseColor, -0.01, 0.08);
}

function createGradientCapMaterial(polygon: GlobePolygon) {
  const baseColor = getPolygonScoreColor(polygon);
  const centerColor =
    polygon.signalScore === undefined
      ? baseColor
      : polygon.selected
        ? adjustColor(baseColor, -0.025, 0.1)
        : getGlobeSignalColor(polygon.signalScore);
  const edgeColor =
    polygon.signalScore === undefined
      ? adjustColor(centerColor, 0.035, -0.08)
      : adjustColor(centerColor, 0.105, -0.5);
  const [lng, lat] = polygon.gradientCenter;
  const latitude = THREE.MathUtils.degToRad(lat);
  const longitude = THREE.MathUtils.degToRad(lng);
  const centerDirection = new THREE.Vector3(
    Math.cos(latitude) * Math.sin(longitude),
    Math.sin(latitude),
    Math.cos(latitude) * Math.cos(longitude)
  ).normalize();
  const material = new THREE.MeshStandardMaterial({
    color: centerColor,
    roughness: 0.78,
    metalness: 0,
    envMapIntensity: 0.22,
    transparent: false,
    opacity: 1,
    depthWrite: true
  });

  material.onBeforeCompile = (shader) => {
    shader.uniforms.marketGradientCenter = { value: centerDirection };
    shader.uniforms.marketGradientRadius = {
      value: polygon.gradientRadius
    };
    shader.uniforms.marketCenterColor = {
      value: new THREE.Color(centerColor)
    };
    shader.uniforms.marketEdgeColor = {
      value: new THREE.Color(edgeColor)
    };
    shader.vertexShader = shader.vertexShader
      .replace(
        "void main() {",
        "varying vec3 vMarketGlobeDirection;\nvoid main() {"
      )
      .replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\nvMarketGlobeDirection = normalize(position);"
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "void main() {",
        [
          "uniform vec3 marketGradientCenter;",
          "uniform float marketGradientRadius;",
          "uniform vec3 marketCenterColor;",
          "uniform vec3 marketEdgeColor;",
          "varying vec3 vMarketGlobeDirection;",
          "void main() {"
        ].join("\n")
      )
      .replace(
        "vec4 diffuseColor = vec4( diffuse, opacity );",
        [
          "float marketAngularDistance = acos(clamp(dot(normalize(vMarketGlobeDirection), marketGradientCenter), -1.0, 1.0));",
          "float marketEdgeMix = smoothstep(marketGradientRadius * 0.04, marketGradientRadius * 0.82, marketAngularDistance);",
          "vec3 marketGradientColor = mix(marketCenterColor, marketEdgeColor, marketEdgeMix);",
          "vec4 diffuseColor = vec4(marketGradientColor, opacity);"
        ].join("\n")
      );
  };
  material.customProgramCacheKey = () => "market-gradient-cap-v2";
  return material;
}

function createRegionPillars(
  datum: GlobeRegionDatum,
  mapFeature: MapFeature,
  selected: boolean,
  focusedCountry: boolean
) {
  const polygon = chooseRegionGeometry(mapFeature.geometry, datum.region.center);
  const bounds = getBounds(polygon);
  const progress = volumeProgress(datum.volume24h, datum.signalScore);
  const count = Math.round(
    (12 + progress * 104) *
      (selected ? 1.38 : 1) *
      (focusedCountry ? 1 : 0.52)
  );
  const random = seededRandom(
    hashString(`${datum.region.countryCode}:${datum.region.code}:r3f-volume`)
  );
  const spanLng = Math.max(0.5, bounds.maxLng - bounds.minLng);
  const spanLat = Math.max(0.5, bounds.maxLat - bounds.minLat);
  const proposedCenter = datum.region.center;
  const mountainCenter: Position = pointInPolygon(proposedCenter, polygon)
    ? proposedCenter
    : [
        (bounds.minLng + bounds.maxLng) / 2,
        (bounds.minLat + bounds.maxLat) / 2
      ];
  const scoreColor = getGlobeSignalColor(datum.signalScore);
  const colorRange = [
    adjustColor(scoreColor, selected ? -0.26 : -0.2, 0.04),
    adjustColor(scoreColor, selected ? 0.08 : 0.04, 0.02)
  ];
  const countryScale =
    datum.region.countryCode === "US"
      ? 1.32
      : datum.region.countryCode === "RU"
        ? 1.35
        : 1;
  const points: VolumePillar[] = [];
  let attempts = 0;

  while (points.length < count && attempts < count * 90) {
    attempts += 1;
    const clusteredSample = random() < 0.88;
    const lng = clusteredSample
      ? mountainCenter[0] + sampleStandardNormal(random) * spanLng * 0.135
      : bounds.minLng + random() * spanLng;
    const lat = clusteredSample
      ? mountainCenter[1] + sampleStandardNormal(random) * spanLat * 0.135
      : bounds.minLat + random() * spanLat;
    if (!pointInPolygon([lng, lat], polygon)) continue;

    const normalizedX = (lng - mountainCenter[0]) / (spanLng * 0.18);
    const normalizedY = (lat - mountainCenter[1]) / (spanLat * 0.18);
    const radialDistanceSquared =
      normalizedX * normalizedX + normalizedY * normalizedY;
    const gaussianWeight = Math.max(
      0.01,
      Math.exp(-0.5 * radialDistanceSquared) ** 1.55
    );
    const colorWeight = Math.min(
      1,
      gaussianWeight * 1.55 + random() * 0.1
    );
    const focusScale = focusedCountry ? 1 : 0.42;
    const edgeFloor = (0.006 + progress * 0.008) * focusScale;
    const peak =
      (0.038 + progress * 0.1) *
      (selected ? 1.12 : 1) *
      countryScale *
      focusScale *
      (focusedCountry ? 1.04 : 1);
    const heightSample = random();
    const centralSpike =
      gaussianWeight > 0.48 && heightSample > 0.93;
    const heightVariation = centralSpike
      ? 1.22 + random() * 0.42
      : 0.24 + Math.pow(heightSample, 2.5) * 0.76;
    const mountainWeight = gaussianWeight ** 2.05;
    const altitude =
      edgeFloor + peak * mountainWeight * heightVariation;

    points.push({
      lat,
      lng,
      altitude: Math.min(
        altitude,
        focusedCountry ? (selected ? 0.13 : 0.115) : 0.048
      ),
      color: interpolateColor(colorRange[0], colorRange[1], colorWeight),
      radius:
        (0.017 +
          progress * 0.016 +
          gaussianWeight * 0.026 +
          random() * 0.007) *
        (focusedCountry ? 1 : 0.72)
    });
  }

  return points;
}

function GlobeCamera({ distance }: { distance: number }) {
  const { camera, size } = useThree();
  const compact = size.width < 520;

  useEffect(() => {
    camera.position.set(0, 35, compact ? distance * 1.1 : distance);
    camera.lookAt(0, 45, 0);
  }, [camera, compact, distance]);

  return null;
}

function GlobeControls({ distance }: { distance: number }) {
  const { size } = useThree();
  const compact = size.width < 520;

  return (
    <OrbitControls
      enablePan={false}
      target={[0, 43, 0]}
      minDistance={(compact ? distance * 1.1 : distance) - 30}
      maxDistance={(compact ? distance * 1.1 : distance) + 80}
      minPolarAngle={Math.PI * 0.25}
      maxPolarAngle={Math.PI * 0.68}
    />
  );
}

function AtmosphericFog({ distance }: { distance: number }) {
  const { size } = useThree();
  const compact = size.width < 520;
  const effectiveDistance = compact ? distance * 1.1 : distance;
  const worldRadius = GLOBE_RADIUS * GLOBE_SCALE;
  const surfaceDistance = Math.max(1, effectiveDistance - worldRadius);
  const horizonDistance = Math.sqrt(
    Math.max(1, effectiveDistance ** 2 - worldRadius ** 2)
  );
  const fogNear =
    surfaceDistance + (horizonDistance - surfaceDistance) * 0.58;
  const fogFar = horizonDistance + 24;

  return <fog attach="fog" args={["#d8e8ec", fogNear, fogFar]} />;
}

function GlobeShadowPass({ revision }: { revision: string }) {
  const { gl, scene } = useThree();
  const framesRemaining = useRef(0);

  useEffect(() => {
    framesRemaining.current = 45;
  }, [revision]);

  useFrame(() => {
    if (framesRemaining.current <= 0) return;
    framesRemaining.current -= 1;

    scene.traverse((object) => {
      const mesh = object as THREE.Mesh & { __globeObjType?: string };
      if (!mesh.isMesh) return;
      const globeObjectType = mesh.__globeObjType;
      const materials = Array.isArray(mesh.material)
        ? mesh.material
        : [mesh.material];
      const isAtmosphere = globeObjectType === "atmosphere";
      const isOcean = materials.some(
        (material) => material.name === "reflective-ocean"
      );
      const isPillar =
        globeObjectType === "point" || globeObjectType === "points";

      mesh.castShadow = !isPillar && !isAtmosphere && !isOcean;
      mesh.receiveShadow = !isAtmosphere && !isPillar;
    });
    gl.shadowMap.needsUpdate = true;
  });

  return null;
}

function RendererLightingSetup() {
  const { gl } = useThree();

  useEffect(() => {
    const previousToneMapping = gl.toneMapping;
    const previousExposure = gl.toneMappingExposure;
    const previousShadowEnabled = gl.shadowMap.enabled;
    const previousShadowType = gl.shadowMap.type;
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = 1.04;
    gl.shadowMap.enabled = true;
    gl.shadowMap.type = THREE.PCFShadowMap;
    gl.shadowMap.needsUpdate = true;

    return () => {
      gl.toneMapping = previousToneMapping;
      gl.toneMappingExposure = previousExposure;
      gl.shadowMap.enabled = previousShadowEnabled;
      gl.shadowMap.type = previousShadowType;
    };
  }, [gl]);

  return null;
}

function CameraTopShadowLight() {
  const light = useRef<THREE.DirectionalLight>(null);
  const target = useRef<THREE.Object3D>(null);
  const { camera } = useThree();
  const cameraUp = useRef(new THREE.Vector3());
  const cameraForward = useRef(new THREE.Vector3());

  useFrame(() => {
    if (!light.current || !target.current) return;

    cameraUp.current
      .set(0, 1, 0)
      .applyQuaternion(camera.quaternion)
      .normalize();
    camera.getWorldDirection(cameraForward.current);
    target.current.position.copy(MAP_LIGHT_TARGET);
    target.current.updateMatrixWorld();
    light.current.target = target.current;
    light.current.position
      .copy(MAP_LIGHT_TARGET)
      .addScaledVector(cameraUp.current, 285)
      .addScaledVector(cameraForward.current, -55);
  });

  return (
    <>
      <object3D ref={target} position={MAP_LIGHT_TARGET} />
      <directionalLight
        ref={light}
        castShadow
        position={[4, 333, 55]}
        intensity={2.35}
        color="#fffaf0"
        shadow-bias={-0.00006}
        shadow-normalBias={0.015}
        shadow-radius={1.8}
        shadow-mapSize-width={4096}
        shadow-mapSize-height={4096}
        shadow-camera-near={70}
        shadow-camera-far={520}
        shadow-camera-left={-152}
        shadow-camera-right={152}
        shadow-camera-top={152}
        shadow-camera-bottom={-152}
      />
    </>
  );
}

function PillarProjectedShadows({
  pillars
}: {
  pillars: VolumePillar[];
}) {
  const { camera, size } = useThree();
  const geometry = useMemo(() => {
    const value = new LineSegmentsGeometry();
    value.setPositions([0, 0, 0, 0, 0, 0]);
    return value;
  }, []);
  const material = useMemo(
    () =>
      new LineMaterial({
        color: "#20282a",
        linewidth: 1.05,
        transparent: true,
        opacity: 0.22,
        depthTest: true,
        depthWrite: false,
        worldUnits: false
      }),
    []
  );
  const shadowLines = useMemo(() => {
    const value = new LineSegments2(geometry, material);
    value.frustumCulled = false;
    value.renderOrder = 8;
    return value;
  }, [geometry, material]);
  const cameraUp = useRef(new THREE.Vector3());
  const cameraForward = useRef(new THREE.Vector3());
  const rayWorld = useRef(new THREE.Vector3());
  const rayLocal = useRef(new THREE.Vector3());
  const parentQuaternion = useRef(new THREE.Quaternion());
  const normal = useRef(new THREE.Vector3());
  const pillarTop = useRef(new THREE.Vector3());
  const hitPoint = useRef(new THREE.Vector3());
  const previousPoint = useRef(new THREE.Vector3());
  const nextPoint = useRef(new THREE.Vector3());

  useEffect(() => {
    material.resolution.set(size.width, size.height);
  }, [material, size.height, size.width]);
  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material]
  );

  useFrame(() => {
    const parent = shadowLines.parent;
    if (!parent) return;

    cameraUp.current
      .set(0, 1, 0)
      .applyQuaternion(camera.quaternion)
      .normalize();
    camera.getWorldDirection(cameraForward.current);
    rayWorld.current
      .copy(cameraUp.current)
      .multiplyScalar(-285)
      .addScaledVector(cameraForward.current, 55)
      .normalize();
    parent.getWorldQuaternion(parentQuaternion.current);
    rayLocal.current
      .copy(rayWorld.current)
      .applyQuaternion(parentQuaternion.current.invert())
      .normalize();

    const receiverRadius = GLOBE_RADIUS * 1.018;
    const displayRadius = receiverRadius + 0.08;
    const positions: number[] = [];

    pillars.forEach((pillar, pillarIndex) => {
      if (pillar.altitude <= 0.012 || pillarIndex % 2 !== 0) return;
      const latitude = THREE.MathUtils.degToRad(pillar.lat);
      const longitude = THREE.MathUtils.degToRad(pillar.lng);
      normal.current
        .set(
          Math.cos(latitude) * Math.sin(longitude),
          Math.sin(latitude),
          Math.cos(latitude) * Math.cos(longitude)
        )
        .normalize();
      pillarTop.current
        .copy(normal.current)
        .multiplyScalar(GLOBE_RADIUS * (1 + pillar.altitude));

      const projection =
        pillarTop.current.dot(rayLocal.current);
      const discriminant =
        projection * projection -
        (pillarTop.current.lengthSq() - receiverRadius * receiverRadius);
      if (discriminant <= 0) return;

      const distance = -projection - Math.sqrt(discriminant);
      if (distance <= 0) return;
      hitPoint.current
        .copy(pillarTop.current)
        .addScaledVector(rayLocal.current, distance)
        .normalize();
      const angularDistance = normal.current.angleTo(hitPoint.current);
      if (angularDistance > 0.065) {
        hitPoint.current
          .copy(normal.current)
          .lerp(hitPoint.current, 0.065 / angularDistance)
          .normalize();
      }
      hitPoint.current.multiplyScalar(displayRadius);
      previousPoint.current
        .copy(normal.current)
        .multiplyScalar(displayRadius);

      for (let segment = 1; segment <= 4; segment += 1) {
        nextPoint.current
          .copy(previousPoint.current)
          .lerp(hitPoint.current, 1 / (5 - segment))
          .normalize()
          .multiplyScalar(displayRadius);
        positions.push(
          previousPoint.current.x,
          previousPoint.current.y,
          previousPoint.current.z,
          nextPoint.current.x,
          nextPoint.current.y,
          nextPoint.current.z
        );
        previousPoint.current.copy(nextPoint.current);
      }
    });

    geometry.setPositions(
      positions.length ? positions : [0, 0, 0, 0, 0, 0]
    );
  });

  return <primitive object={shadowLines} />;
}

function BoundaryWalls({ polygons }: { polygons: GlobePolygon[] }) {
  const geometry = useMemo(
    () => createBoundaryWallGeometry(polygons),
    [polygons]
  );
  const material = useMemo(() => {
    const value = new THREE.MeshStandardMaterial({
      vertexColors: true,
      flatShading: false,
      roughness: 0.72,
      metalness: 0,
      envMapIntensity: 0.16,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1
    });
    value.shadowSide = THREE.DoubleSide;
    return value;
  }, []);

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material]
  );

  return (
    <mesh
      geometry={geometry}
      material={material}
      castShadow
      receiveShadow
      renderOrder={6}
    />
  );
}

function OceanReflectionEnvironment() {
  const { gl, scene } = useThree();

  useEffect(() => {
    const previousEnvironment = scene.environment;
    const pmremGenerator = new THREE.PMREMGenerator(gl);
    const environmentTexture = createOceanEnvironmentTexture();
    const environmentTarget =
      pmremGenerator.fromEquirectangular(environmentTexture);
    scene.environment = environmentTarget.texture;

    return () => {
      scene.environment = previousEnvironment;
      environmentTarget.dispose();
      environmentTexture.dispose();
      pmremGenerator.dispose();
    };
  }, [gl, scene]);

  return null;
}

export function R3fMarketGlobe({
  activeCountry,
  regions,
  selectedCode,
  trades,
  onSelectRegion
}: R3fMarketGlobeProps) {
  const boundaryFeatures = useMemo(
    () => getCountryBoundaryFeatures(activeCountry),
    [activeCountry]
  );
  const activeRegions = useMemo(
    () =>
      regions.filter(
        ({ region }) => region.countryCode === activeCountry.code
      ),
    [activeCountry.code, regions]
  );
  const nationalRegion = regions.find(
    ({ region }) =>
      region.countryCode === activeCountry.code &&
      region.coverage === "country"
  );
  const regionByFeatureId = useMemo(
    () =>
      new Map(
        activeRegions
          .filter(({ region }) => region.coverage !== "country")
          .map((datum) => [datum.region.featureId, datum])
      ),
    [activeRegions]
  );
  const regionalPolygons = useMemo<GlobePolygon[]>(
    () =>
      boundaryFeatures.map((boundaryFeature) => {
        const datum =
          regionByFeatureId.get(
            getFeatureId(boundaryFeature, activeCountry)
          ) ?? nationalRegion;

        return {
          feature: boundaryFeature,
          geometry: boundaryFeature.geometry,
          gradientCenter:
            datum?.region.center ?? getGeometryCenter(boundaryFeature.geometry),
          gradientRadius: getGradientRadius(
            boundaryFeature.geometry,
            datum?.region.center ?? getGeometryCenter(boundaryFeature.geometry)
          ),
          region: datum?.region,
          signalScore: datum?.signalScore,
          selected: datum?.region.code === selectedCode,
          layer: "region"
        };
      }),
    [
      activeCountry,
      boundaryFeatures,
      nationalRegion,
      regionByFeatureId,
      selectedCode
    ]
  );
  const polygons = useMemo<GlobePolygon[]>(
    () => {
      const countryScoreByCode = new Map<string, number>();
      const countryDatumByCode = new Map<string, GlobeRegionDatum>();
      regions.forEach((datum) => {
        const { region, signalScore } = datum;
        const existingScore = countryScoreByCode.get(region.countryCode);
        if (existingScore === undefined || signalScore > existingScore) {
          countryScoreByCode.set(region.countryCode, signalScore);
          countryDatumByCode.set(region.countryCode, datum);
        }
      });

      return [
        ...WORLD_FEATURES.map((worldFeature) => {
          const country = COUNTRY_MARKET_MAPS.find((candidate) =>
            candidate.worldFeatureIds.includes(String(worldFeature.id))
          );
          const countryDatum = country
            ? countryDatumByCode.get(country.code)
            : undefined;
          const gradientCenter =
            countryDatum?.region.center ??
            getGeometryCenter(worldFeature.geometry);
          return {
            feature: worldFeature,
            geometry: worldFeature.geometry,
            countryCode: country?.code,
            gradientCenter,
            gradientRadius: getGradientRadius(
              worldFeature.geometry,
              gradientCenter
            ),
            signalScore: country
              ? countryScoreByCode.get(country.code)
              : undefined,
            layer: "land" as const
          };
        }),
        ...regionalPolygons
      ];
    },
    [regionalPolygons, regions]
  );
  const polygonCapMaterials = useMemo(
    () =>
      new Map(
        polygons.map((polygon) => [
          polygon,
          createGradientCapMaterial(polygon)
        ])
      ),
    [polygons]
  );
  useEffect(
    () => () => {
      polygonCapMaterials.forEach((material) => material.dispose());
    },
    [polygonCapMaterials]
  );
  const visibleRegions = useMemo(() => {
    const [focusLng, focusLat] = activeCountry.defaultCenter;

    return regions.filter(({ region }) => {
      if (region.countryCode === activeCountry.code) return true;
      const longitudeDistance = Math.abs(
        ((region.center[0] - focusLng + 540) % 360) - 180
      );
      const latitudeDistance = Math.abs(region.center[1] - focusLat);
      return longitudeDistance <= 42 && latitudeDistance <= 28;
    });
  }, [activeCountry, regions]);
  const featureByRegionKey = useMemo(() => {
    const result = new Map<string, MapFeature>();
    if (nationalRegion) {
      const countryFeature = WORLD_FEATURES.find((worldFeature) =>
        activeCountry.worldFeatureIds.includes(String(worldFeature.id))
      );
      if (countryFeature) {
        result.set(getRegionKey(nationalRegion.region), countryFeature);
      }
    }
    regionalPolygons.forEach((polygon) => {
      if (polygon.region && !result.has(getRegionKey(polygon.region))) {
        result.set(getRegionKey(polygon.region), polygon.feature);
      }
    });
    visibleRegions.forEach(({ region }) => {
      const key = getRegionKey(region);
      if (result.has(key)) return;
      const boundaryFeature = getRegionBoundaryFeature(region);
      if (boundaryFeature) result.set(key, boundaryFeature);
    });
    return result;
  }, [
    activeCountry.worldFeatureIds,
    nationalRegion,
    regionalPolygons,
    visibleRegions
  ]);
  const pillars = useMemo(
    () =>
      visibleRegions.flatMap((datum) => {
        if (datum.region.marketStatus === "closed") return [];
        if (datum.volume24h === null && datum.signalScore < 50) return [];
        const mapFeature = featureByRegionKey.get(getRegionKey(datum.region));
        if (!mapFeature) return [];
        return createRegionPillars(
          datum,
          mapFeature,
          datum.region.countryCode === activeCountry.code &&
            datum.region.code === selectedCode,
          datum.region.countryCode === activeCountry.code
        );
      }),
    [
      activeCountry.code,
      featureByRegionKey,
      selectedCode,
      visibleRegions
    ]
  );
  const visibleTrades = useMemo(() => {
    const [focusLng, focusLat] = activeCountry.defaultCenter;

    return trades
      .filter(({ region }) => {
        const longitudeDistance = Math.abs(
          ((region.center[0] - focusLng + 540) % 360) - 180
        );
        const latitudeDistance = Math.abs(region.center[1] - focusLat);
        return longitudeDistance <= 42 && latitudeDistance <= 28;
      })
      .sort(
        (left, right) => {
          const selectedDifference =
            Number(
              right.region.countryCode === activeCountry.code &&
                right.region.code === selectedCode
            ) -
            Number(
              left.region.countryCode === activeCountry.code &&
                left.region.code === selectedCode
            );
          if (selectedDifference) return selectedDifference;
          return (
            Number(right.region.countryCode === activeCountry.code) -
            Number(left.region.countryCode === activeCountry.code)
          );
        }
      )
      .slice(0, 6);
  }, [activeCountry, selectedCode, trades]);
  const tradeLabels = useMemo<GlobeTradeLabel[]>(
    () =>
      visibleTrades.map(({ region, text, positive }, index) => ({
        lat:
          region.center[1] +
          (region.countryCode === activeCountry.code ? 2 : 1.35) +
          index * 0.12,
        lng:
          region.center[0] +
          (index % 2 === 0 ? 1 : -1) *
            (region.countryCode === activeCountry.code ? 7 : 5),
        text,
        positive,
        selected:
          region.countryCode === activeCountry.code &&
          region.code === selectedCode
      })),
    [activeCountry.code, selectedCode, visibleTrades]
  );
  const globeMaterial = useMemo(
    () => {
      const { normalMap } = createOceanTextures();
      const material = new THREE.MeshPhysicalMaterial({
        color: "#78a7b5",
        emissive: "#466f7b",
        emissiveIntensity: 0.055,
        roughness: 0.43,
        metalness: 0.08,
        ior: 1.333,
        clearcoat: 0.64,
        clearcoatRoughness: 0.27,
        normalMap,
        normalScale: new THREE.Vector2(0.36, 0.36),
        envMapIntensity: 0.5
      });
      material.name = "reflective-ocean";
      return material;
    },
    []
  );
  useEffect(
    () => () => {
      globeMaterial.normalMap?.dispose();
      globeMaterial.dispose();
    },
    [globeMaterial]
  );
  const focusLatitude = activeCountry.defaultCenter[1];
  const focusLongitude = activeCountry.defaultCenter[0];
  const cameraDistance =
    activeCountry.code === "RU"
      ? 315
      : activeCountry.code === "US"
        ? 282
        : activeCountry.code === "UA"
          ? 232
          : activeCountry.code === "GB"
            ? 218
            : 208;
  const focusOffset =
    -49 -
    (Math.sin(THREE.MathUtils.degToRad(focusLatitude)) -
      Math.sin(THREE.MathUtils.degToRad(46))) *
      GLOBE_RADIUS *
      GLOBE_SCALE;

  return (
    <div
      className="h-full w-full"
      aria-label={`${activeCountry.label} 3D market volume map`}
      data-pillar-count={pillars.length}
      data-trade-label-count={tradeLabels.length}
    >
      <Canvas
        camera={{ fov: 35, near: 1, far: 1000 }}
        dpr={[1, 2]}
        gl={{ alpha: true, antialias: true }}
        shadows
      >
        <GlobeCamera distance={cameraDistance} />
        <AtmosphericFog distance={cameraDistance} />
        <RendererLightingSetup />
        <GlobeShadowPass
          revision={`${activeCountry.code}:${selectedCode}:${pillars.length}`}
        />
        <OceanReflectionEnvironment />
        <ambientLight intensity={0.035} />
        <hemisphereLight args={["#f8fbff", "#425861", 0.09]} />
        <CameraTopShadowLight />
        <directionalLight
          position={[0, 210, 180]}
          intensity={0.06}
          color="#b8e1ed"
        />
        <group
          position={[4, focusOffset, 0]}
          scale={GLOBE_SCALE}
          rotation={[
            activeCountry.code === "US" || activeCountry.code === "RU"
              ? 0.16
              : 0.1,
            THREE.MathUtils.degToRad(-focusLongitude),
            -0.035
          ]}
          onClick={(event) => {
            const objectData = (
              event.object as THREE.Object3D & {
                __data?: GlobePolygon | { data?: GlobePolygon };
              }
            ).__data;
            const polygon: GlobePolygon | undefined =
              objectData && "data" in objectData
                ? objectData.data
                : (objectData as GlobePolygon | undefined);
            if (polygon?.region) {
              event.stopPropagation();
              onSelectRegion(polygon.region);
            }
          }}
        >
          <Globe
            globeImageUrl={null}
            globeMaterial={globeMaterial}
            showAtmosphere
            atmosphereColor="#d8eef6"
            atmosphereAltitude={0.13}
            polygonsData={polygons}
            polygonsTransitionDuration={0}
            polygonGeoJsonGeometry="geometry"
            polygonCapMaterial={(polygon) =>
              polygonCapMaterials.get(polygon as GlobePolygon)!
            }
            polygonSideColor={(polygon) =>
              (polygon as GlobePolygon).layer === "region"
                ? "rgba(92, 65, 55, 0.84)"
                : "rgba(82, 102, 105, 0.84)"
            }
            polygonStrokeColor={false}
            polygonAltitude={(polygon) => {
              const item = polygon as GlobePolygon;
              if (item.layer === "land") return 0.0045;
              return item.selected ? 0.018 : 0.011;
            }}
            pointsData={pillars}
            pointLat="lat"
            pointLng="lng"
            pointAltitude="altitude"
            pointRadius="radius"
            pointColor="color"
            pointsMerge={false}
            pointsTransitionDuration={0}
          />
          <BoundaryWalls polygons={polygons} />
          {ANALYTIC_PILLAR_SHADOWS_ENABLED ? (
            <PillarProjectedShadows pillars={pillars} />
          ) : null}
          {tradeLabels.map((label) => {
            const latitude = THREE.MathUtils.degToRad(label.lat);
            const longitude = THREE.MathUtils.degToRad(label.lng);
            const radius = GLOBE_RADIUS * 1.015;
            const position: [number, number, number] = [
              radius * Math.cos(latitude) * Math.sin(longitude),
              radius * Math.sin(latitude),
              radius * Math.cos(latitude) * Math.cos(longitude)
            ];

            return (
              <Html
                key={`${label.lat}:${label.lng}:${label.text}`}
                position={position}
                center
                zIndexRange={[20, 0]}
                style={{ pointerEvents: "none" }}
              >
                <span
                  className={`market-map-trade-label ${
                    label.selected
                      ? "market-map-trade-label--selected"
                      : "market-map-trade-label--context"
                  } whitespace-nowrap font-sans text-[11px] font-extrabold ${
                    label.positive ? "text-emerald-700" : "text-rose-700"
                  }`}
                >
                  {label.text}
                </span>
              </Html>
            );
          })}
        </group>
        <GlobeControls distance={cameraDistance} />
      </Canvas>
    </div>
  );
}
