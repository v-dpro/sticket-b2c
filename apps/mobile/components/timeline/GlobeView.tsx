// GlobeView — the timeline map mode as a 3D globe: a WebView running a
// self-contained three.js page (three@0.160.0 from jsdelivr; r160 dropped the
// UMD build, so the page uses an import map + module imports — needs
// iOS 16.4+ / any modern Android WebView). The globe is a dark sphere with a
// dot-matrix landmass (procedural: coarse continent polygons point-in-polygon
// tested on a lat/lng dot grid — stylized, not cartographic) and white glowing
// dots for logged cities, sized by show count. Drag to spin, pinch to zoom
// (OrbitControls with damping), slow auto-rotate when idle. Tapping a city dot
// posts a message up to RN, which shows a mono bottom chip
// ("NEW YORK · 3 SHOWS"); tapping the chip hands the city's deck row key to
// onPressCity (flies the scroll deck to that row). The globe floats in space —
// deliberately single-theme dark even in light mode, same convention as
// MemoryCard's over-photo chips.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import type { TimelineMonth, TimelineUpcomingItem } from '../../lib/api/timeline';
import { cityCoordsFor, cityDisplayName } from '../../lib/geo/cityCoords';
import { haptics, tearIn } from '../../lib/motion';
import type { ThemeTokens } from '../../lib/theme';
import { useThemedStyles } from '../../lib/theme-context';
import { SpringPressable } from '../ui/SpringPressable';
import { entryRowKey, planRowKey } from './mapModel';

const SPACE = '#0B0B10';

export type GlobePoint = {
  city: string;
  lat: number;
  lng: number;
  count: number;
  rowKey: string;
};

/**
 * Group the deck's own data (upcoming plans + month-bucketed logs) by venue
 * city. Months arrive newest-first with newest-first entries, so the first
 * row seen per city is its most recent logged show — that row key is the
 * fly-to target. Upcoming plans only add to counts (or seed a city with no
 * logged shows yet, keyed to its soonest plan). Cities missing from the
 * coordinate table are skipped.
 */
export function buildGlobePoints(
  upcoming: TimelineUpcomingItem[],
  months: TimelineMonth[],
): GlobePoint[] {
  const byCity = new Map<string, GlobePoint>();
  const add = (rawCity: string, rowKey: string) => {
    const coords = cityCoordsFor(rawCity);
    if (!coords) return;
    const city = cityDisplayName(rawCity);
    const existing = byCity.get(city.toLowerCase());
    if (existing) {
      existing.count += 1;
      return;
    }
    byCity.set(city.toLowerCase(), { city, lat: coords.lat, lng: coords.lng, count: 1, rowKey });
  };
  for (const month of months) {
    for (const entry of month.entries) add(entry.venue.city, entryRowKey(entry));
  }
  for (const item of upcoming) add(item.event.venue.city, planRowKey(item));
  return [...byCity.values()];
}

type GlobeViewProps = {
  points: GlobePoint[];
  onPressCity?: (rowKey: string) => void;
  style?: StyleProp<ViewStyle>;
};

type Selected = { city: string; count: number; rowKey: string };

export function GlobeView({ points, onPressCity, style }: GlobeViewProps) {
  const styles = useThemedStyles(buildStyles);
  const [selected, setSelected] = useState<Selected | null>(null);

  const html = useMemo(() => buildHtml(points), [points]);

  // New data reloads the page — drop any chip pointing at a stale row key.
  useEffect(() => setSelected(null), [points]);

  const onMessage = useCallback((event: WebViewMessageEvent) => {
    let msg: { type?: string; city?: string; count?: number; rowKey?: string; message?: string };
    try {
      msg = JSON.parse(event.nativeEvent.data);
    } catch {
      return;
    }
    if (msg.type === 'city' && msg.rowKey && msg.city) {
      haptics.light();
      setSelected({ city: msg.city, count: msg.count ?? 1, rowKey: msg.rowKey });
    } else if (msg.type === 'clear') {
      setSelected(null);
    } else if (msg.type === 'error') {
      // eslint-disable-next-line no-console
      console.warn('[GlobeView]', msg.message);
    }
  }, []);

  const chipLabel = selected
    ? `${selected.city.toUpperCase()} · ${selected.count} ${selected.count === 1 ? 'SHOW' : 'SHOWS'}`
    : '';

  return (
    <View style={[styles.container, style]}>
      <WebView
        source={{ html }}
        originWhitelist={['*']}
        onMessage={onMessage}
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
        setSupportMultipleWindows={false}
        // Transparent webview over a space-colored container — no white flash
        // while the page boots.
        style={styles.web}
        containerStyle={styles.webContainer}
      />
      {selected ? (
        <Animated.View
          key={selected.rowKey}
          entering={tearIn(0)}
          style={styles.chipWrap}
          pointerEvents="box-none"
        >
          <SpringPressable
            onPress={() => onPressCity?.(selected.rowKey)}
            haptic="light"
            accessibilityRole="button"
            accessibilityLabel={chipLabel}
            style={styles.chip}
          >
            <Text style={styles.chipText}>{chipLabel}</Text>
          </SpringPressable>
        </Animated.View>
      ) : null}
    </View>
  );
}

const buildStyles = (tokens: ThemeTokens) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: SPACE,
      borderRadius: 4,
      overflow: 'hidden',
    },
    web: {
      flex: 1,
      backgroundColor: 'transparent',
    },
    webContainer: {
      backgroundColor: SPACE,
    },
    chipWrap: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 20,
      alignItems: 'center',
    },
    chip: {
      paddingVertical: 9,
      paddingHorizontal: 16,
      borderRadius: tokens.radius.full,
      // Over-globe surface — deliberately literal, theme-independent.
      backgroundColor: '#15151C',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.16)',
    },
    chipText: {
      fontFamily: tokens.fontFamilies.monoSemi,
      fontVariant: ['tabular-nums'],
      fontSize: 11,
      letterSpacing: 1,
      color: '#F2F2F5',
    },
  });

// ————————————————————————————————————————————————————————————————————————
// The embedded page. Kept dead simple and defensive: every failure path
// (script load, WebGL init, runtime) postMessages {type:'error'} up to RN
// instead of dying silently in the WebView.

function buildHtml(points: GlobePoint[]): string {
  // <-escape so a city name can never close the script tag.
  const pointsJson = JSON.stringify(
    points.map((p) => ({ city: p.city, lat: p.lat, lng: p.lng, count: p.count, rowKey: p.rowKey })),
  ).replace(/</g, '\\u003c');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<style>
  html, body { margin: 0; padding: 0; height: 100%; overflow: hidden; background: ${SPACE}; }
  canvas { display: block; touch-action: none; }
</style>
<script type="importmap">
{ "imports": {
  "three": "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.min.js",
  "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/"
} }
</script>
</head>
<body>
<script>
  function post(msg) {
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(msg));
  }
  window.onerror = function (message, source, line) {
    post({ type: 'error', message: String(message) + ' @' + line });
  };
  var POINTS = ${pointsJson};
</script>
<script type="module">
(async function () {
  try {
    var THREE = await import('three');
    var addons = await import('three/addons/controls/OrbitControls.js');
    init(THREE, addons.OrbitControls);
  } catch (e) {
    post({ type: 'error', message: 'globe load failed: ' + ((e && e.message) || e) });
  }

  function init(THREE, OrbitControls) {
    var R = 1;
    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 100);
    var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x0b0b10, 1);
    document.body.appendChild(renderer.domElement);

    // Open facing the user's densest city; fall back to the Americas.
    var camDir = new THREE.Vector3(0, 0.35, 1);
    if (POINTS.length) {
      var top = POINTS.reduce(function (a, b) { return b.count > a.count ? b : a; });
      camDir = toVec3(top.lat, top.lng, 1);
    } else {
      camDir = toVec3(30, -80, 1);
    }
    camera.position.copy(camDir.normalize().multiplyScalar(3.0));

    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    var keyLight = new THREE.DirectionalLight(0xffffff, 0.55);
    keyLight.position.set(-2, 2, 2.5);
    scene.add(keyLight);

    var globe = new THREE.Mesh(
      new THREE.SphereGeometry(R, 64, 64),
      new THREE.MeshPhongMaterial({ color: 0x15151c, shininess: 6, specular: 0x0d0d13 })
    );
    scene.add(globe);

    // Thin ink atmosphere: additive fresnel shell, backside.
    var atmo = new THREE.Mesh(
      new THREE.SphereGeometry(R * 1.05, 64, 64),
      new THREE.ShaderMaterial({
        vertexShader: [
          'varying float vI;',
          'void main() {',
          '  vec3 n = normalize(normalMatrix * normal);',
          '  vI = pow(0.72 - dot(n, vec3(0.0, 0.0, 1.0)), 4.0);',
          '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);',
          '}'
        ].join('\\n'),
        fragmentShader: [
          'varying float vI;',
          'void main() { gl_FragColor = vec4(0.90, 0.91, 0.95, 1.0) * vI * 0.5; }'
        ].join('\\n'),
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false
      })
    );
    scene.add(atmo);

    // lat/lng → sphere position (standard three.js equirect mapping).
    function toVec3(lat, lng, r) {
      var phi = (90 - lat) * Math.PI / 180;
      var theta = (lng + 180) * Math.PI / 180;
      return new THREE.Vector3(
        -r * Math.sin(phi) * Math.cos(theta),
        r * Math.cos(phi),
        r * Math.sin(phi) * Math.sin(theta)
      );
    }

    function dotTexture(hard) {
      var c = document.createElement('canvas');
      c.width = c.height = 64;
      var g = c.getContext('2d');
      var grd = g.createRadialGradient(32, 32, 0, 32, 32, 30);
      if (hard) {
        grd.addColorStop(0, 'rgba(255,255,255,1)');
        grd.addColorStop(0.55, 'rgba(255,255,255,1)');
        grd.addColorStop(0.8, 'rgba(255,255,255,0.25)');
        grd.addColorStop(1, 'rgba(255,255,255,0)');
      } else {
        grd.addColorStop(0, 'rgba(255,255,255,1)');
        grd.addColorStop(0.22, 'rgba(255,255,255,0.95)');
        grd.addColorStop(0.45, 'rgba(255,255,255,0.30)');
        grd.addColorStop(1, 'rgba(255,255,255,0)');
      }
      g.fillStyle = grd;
      g.fillRect(0, 0, 64, 64);
      return new THREE.CanvasTexture(c);
    }

    // — Dot-matrix landmass —
    // Coarse continent outlines as [lng, lat] rings; a dot grid sampled with
    // even spherical density is kept where a sample falls inside one (minus
    // the inland-sea holes). Stylized geography, not a map.
    var LAND = [
      [[-168,66],[-164,60],[-157,58],[-152,60],[-141,60],[-131,55],[-125,49],[-124,41],[-118,33],[-111,25],[-106,20],[-97,16],[-91,14],[-85,10],[-78,8],[-82,13],[-87,16],[-91,18],[-96,20],[-97,26],[-91,29],[-84,30],[-81,25],[-80,27],[-81,31],[-76,35],[-74,40],[-70,42],[-66,44],[-60,46],[-64,49],[-58,51],[-61,52],[-65,55],[-64,59],[-70,61],[-78,62],[-82,66],[-90,69],[-95,72],[-105,73],[-120,72],[-130,70],[-141,70],[-150,71],[-157,71],[-165,68]],
      [[-46,60],[-53,66],[-56,71],[-61,76],[-58,80],[-44,83],[-25,83],[-19,76],[-21,70],[-32,66],[-42,61]],
      [[-78,7],[-72,12],[-64,11],[-60,9],[-52,5],[-44,-2],[-35,-8],[-37,-14],[-41,-22],[-48,-27],[-53,-34],[-58,-39],[-64,-41],[-66,-47],[-69,-52],[-68,-55],[-71,-54],[-74,-50],[-73,-45],[-71,-38],[-72,-30],[-70,-20],[-76,-14],[-81,-6],[-80,0]],
      [[-17,15],[-17,21],[-10,29],[-6,34],[-2,36],[4,37],[11,37],[11,33],[20,32],[25,32],[32,31],[34,28],[36,22],[39,17],[43,11],[48,11],[51,11],[44,-1],[40,-11],[36,-19],[33,-26],[28,-33],[22,-35],[18,-33],[15,-27],[12,-18],[10,-8],[9,0],[6,5],[0,6],[-6,4],[-13,8]],
      [[44,-12],[48,-14],[50,-17],[47,-24],[44,-25],[43,-20]],
      [[34,29],[36,33],[43,33],[48,31],[51,28],[56,26],[59,23],[58,20],[53,17],[49,14],[44,12],[41,16],[38,22]],
      [[-9,37],[-9,43],[-2,44],[-2,47],[-5,48],[1,50],[4,52],[8,54],[8,57],[5,59],[5,62],[12,65],[15,68],[20,70],[26,71],[31,70],[40,66],[44,67],[54,69],[60,69],[68,70],[73,72],[80,73],[90,75],[100,77],[105,77],[113,74],[125,73],[135,72],[143,72],[150,70],[160,69],[170,67],[178,65],[179,62],[165,62],[162,56],[157,51],[155,57],[150,59],[143,54],[138,47],[135,44],[131,43],[129,35],[126,35],[126,38],[121,39],[118,38],[121,32],[120,28],[113,22],[108,18],[106,10],[104,2],[100,3],[100,8],[98,13],[94,17],[91,22],[87,22],[85,19],[80,14],[77,7],[73,17],[70,21],[66,24],[61,25],[57,26],[52,28],[50,30],[48,31],[43,33],[36,34],[30,36],[27,37],[23,36],[21,38],[19,42],[13,45],[12,44],[8,44],[6,43],[3,42],[0,39],[-2,37],[-6,36]],
      [[-5,50],[-6,52],[-5,54],[-6,56],[-4,59],[-1,58],[0,53],[1,51]],
      [[-10,52],[-10,54],[-8,55],[-6,54],[-6,52]],
      [[-24,64],[-22,66],[-16,66],[-14,65],[-18,63]],
      [[130,31],[131,34],[136,35],[140,35],[141,38],[140,41],[141,45],[145,44],[142,42],[141,39],[137,37],[133,34]],
      [[95,5],[98,3],[102,-1],[106,-5],[104,-6],[100,-2],[96,3]],
      [[105,-6],[110,-7],[114,-8],[113,-9],[108,-8]],
      [[109,1],[112,4],[117,7],[119,4],[118,0],[114,-3],[110,-1]],
      [[120,18],[122,16],[124,12],[125,8],[122,10],[120,14]],
      [[131,-1],[136,-2],[141,-3],[146,-5],[150,-9],[147,-9],[142,-8],[136,-5],[131,-2]],
      [[114,-22],[113,-26],[115,-34],[119,-34],[124,-33],[129,-32],[134,-32],[138,-35],[141,-38],[146,-39],[150,-37],[153,-30],[153,-25],[149,-20],[145,-15],[142,-11],[137,-12],[135,-15],[131,-12],[126,-14],[122,-17]],
      [[172,-34],[176,-38],[178,-38],[175,-41],[173,-42],[169,-44],[166,-46],[169,-47],[172,-44],[174,-41]],
      [[-85,22],[-78,21],[-74,20],[-77,21],[-84,23]]
    ];
    var WATER = [
      [[-95,55],[-85,55],[-78,58],[-82,64],[-88,64],[-94,60]],
      [[28,42],[34,41],[40,42],[40,45],[33,46],[28,45]],
      [[47,37],[54,37],[54,46],[49,46],[46,41]],
      [[16,54],[21,54],[27,59],[25,61],[20,63],[17,61],[18,57]]
    ];

    function inPoly(poly, x, y) {
      var inside = false;
      for (var i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        var xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
        if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
      }
      return inside;
    }
    function isLand(lng, lat) {
      if (lat <= -71) return true; // Antarctica
      var k;
      for (k = 0; k < WATER.length; k++) if (inPoly(WATER[k], lng, lat)) return false;
      for (k = 0; k < LAND.length; k++) if (inPoly(LAND[k], lng, lat)) return true;
      return false;
    }

    var landPositions = [];
    var STEP = 2.2;
    for (var lat = -86; lat <= 86; lat += STEP) {
      var n = Math.max(1, Math.round((360 / STEP) * Math.cos(lat * Math.PI / 180)));
      for (var i = 0; i < n; i++) {
        var lng = -180 + (i + 0.5) * (360 / n);
        if (isLand(lng, lat)) {
          var v = toVec3(lat, lng, R * 1.001);
          landPositions.push(v.x, v.y, v.z);
        }
      }
    }
    var landGeo = new THREE.BufferGeometry();
    landGeo.setAttribute('position', new THREE.Float32BufferAttribute(landPositions, 3));
    scene.add(new THREE.Points(landGeo, new THREE.PointsMaterial({
      map: dotTexture(true),
      color: 0x74747f,
      size: 0.017,
      transparent: true,
      alphaTest: 0.2,
      depthWrite: false,
      sizeAttenuation: true
    })));

    // — City dots — white glow sprites, sized by show count.
    var glowTex = dotTexture(false);
    var cityWorld = [];
    POINTS.forEach(function (p) {
      var pos = toVec3(p.lat, p.lng, R * 1.012);
      var sprite = new THREE.Sprite(new THREE.SpriteMaterial({
        map: glowTex,
        color: 0xffffff,
        transparent: true,
        depthWrite: false
      }));
      var s = Math.min(0.05 + 0.032 * Math.sqrt(p.count), 0.2);
      sprite.scale.set(s, s, 1);
      sprite.position.copy(pos);
      scene.add(sprite);
      cityWorld.push({ point: p, pos: pos });
    });

    var controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.rotateSpeed = 0.45;
    controls.minDistance = 1.6;
    controls.maxDistance = 4.5;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.5;

    var idleTimer = null;
    controls.addEventListener('start', function () {
      controls.autoRotate = false;
      if (idleTimer) clearTimeout(idleTimer);
    });
    controls.addEventListener('end', function () {
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(function () { controls.autoRotate = true; }, 2500);
    });

    // Tap picking: nearest visible city within 30px of a clean tap (screen
    // space beats raycasting here — the dots are tiny and this pads the
    // target). A clean tap on empty space clears the RN chip.
    var downX = 0, downY = 0, downT = 0;
    renderer.domElement.addEventListener('pointerdown', function (e) {
      downX = e.clientX; downY = e.clientY; downT = Date.now();
    });
    renderer.domElement.addEventListener('pointerup', function (e) {
      if (Date.now() - downT > 400) return;
      if (Math.abs(e.clientX - downX) > 8 || Math.abs(e.clientY - downY) > 8) return;
      var w = window.innerWidth, h = window.innerHeight;
      var camLen = camera.position.length();
      var camNorm = camera.position.clone().normalize();
      var horizon = R / camLen; // cos of the visible-cap half-angle
      var best = null, bestD = 30;
      var proj = new THREE.Vector3();
      cityWorld.forEach(function (c) {
        if (c.pos.clone().normalize().dot(camNorm) < horizon - 0.03) return; // far side
        proj.copy(c.pos).project(camera);
        var sx = (proj.x + 1) / 2 * w;
        var sy = (1 - proj.y) / 2 * h;
        var d = Math.hypot(sx - e.clientX, sy - e.clientY);
        if (d < bestD) { bestD = d; best = c.point; }
      });
      if (best) post({ type: 'city', city: best.city, count: best.count, rowKey: best.rowKey });
      else post({ type: 'clear' });
    });

    window.addEventListener('resize', function () {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

    var sentReady = false;
    function frame() {
      requestAnimationFrame(frame);
      controls.update();
      renderer.render(scene, camera);
      if (!sentReady) { sentReady = true; post({ type: 'ready' }); }
    }
    frame();
  }
})();
</script>
</body>
</html>`;
}
