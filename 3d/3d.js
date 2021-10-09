import MapboxLayer from '@deck.gl/mapbox/dist/esm/mapbox-layer';
import { AmbientLight } from '@deck.gl/core/dist/esm/effects/lighting/ambient-light';
import { DirectionalLight } from '@deck.gl/core/dist/esm/effects/lighting/directional-light';
import LightingEffect from '@deck.gl/core/dist/esm/effects/lighting/lighting-effect';
// import SolidPolygonLayer from '@deck.gl/layers/dist/esm/solid-polygon-layer/solid-polygon-layer';
import SimpleMeshLayer from '@deck.gl/mesh-layers/dist/esm/simple-mesh-layer/simple-mesh-layer';
import CylinderGeometry from '@luma.gl/engine/dist/esm/geometries/cylinder-geometry';
import circle from '@turf/circle';

import { DracoLoader } from '@loaders.gl/draco';
import crownDRCPath from '../assets/crown.drc';

const ACCESS_TOKEN =
  'pk.eyJ1IjoiY2hlZWF1biIsImEiOiJjanF3azBrMjMwM2w1NDNyN3Yzc21saDUzIn0.jNWlsBO-S3uDKdfT9IKT1A';
mapboxgl.accessToken = ACCESS_TOKEN;
const map = (window._map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/cheeaun/ckpoxzt7o076k17rqq7jrowxg',
  minZoom: 8,
  renderWorldCopies: false,
  hash: true,
  center: [103.84708968044379, 1.2928590602954841],
  pitch: 65,
  zoom: 17.7,
}));
map.addControl(new mapboxgl.NavigationControl());

const coord2Trunk = (position, girth) => {
  const steps = 6 + (girth - 0.5) * 2; // girth: from 0.5 to 1.5
  const trunkRadius = (girth / Math.PI) * 2;
  const trunkPolygon = circle(position, trunkRadius / 1000, { steps }).geometry
    .coordinates;
  return trunkPolygon;
};

const treesCache = new Map();
const cleaningData = (d) => {
  const { id, girth: _girth, height_est } = d.properties;
  const girth = parseFloat((_girth || '0.5').match(/[\d.]+[^\d.]?$/)[0], 10);
  if (treesCache.has(id)) return treesCache.get(id);
  const position = d.geometry.coordinates;
  const girthScale = girth / 1.5;
  const scale = height_est * 0.66;
  const newD = {
    id,
    position,
    // polygon: coord2Trunk(position, girth),
    // elevation: height_est * 0.75,
    trunk: {
      translation: [0, 0, (height_est * 0.75) / 2],
      scale: [girthScale, height_est * 0.75, girthScale],
    },
    crown: {
      translation: [0, 0, height_est * 0.6],
      scale: [scale * 0.1, scale * 0.1, scale * 0.135],
      orientation: [0, (id.slice(-1) / 9) * 180, 0],
    },
  };
  treesCache.set(id, newD);
  return newD;
};

/*
  Notes: I'll probably need this again to check if treesTrunkLayer2 matches the girth/height measurements
*/
// const treesTrunkLayer = new MapboxLayer({
//   id: 'trees-trunk',
//   type: SolidPolygonLayer,
//   // data: cleanData,
//   getFillColor: [219, 195, 154],
//   extruded: true,
//   getElevation: (d) => d.elevation,
// });

const treesTrunkLayer2 = new MapboxLayer({
  id: 'trees-trunk-2',
  type: SimpleMeshLayer,
  // data: cleanData,
  mesh: new CylinderGeometry(),
  getColor: [219, 195, 154],
  getOrientation: [0, 0, 90],
  getTranslation: (d) => d.trunk.translation,
  getScale: (d) => d.trunk.scale,
});

const treesCrownLayer = new MapboxLayer({
  id: 'trees-crown',
  type: SimpleMeshLayer,
  // data: cleanData,
  mesh: crownDRCPath,
  loaders: [DracoLoader],
  getColor: [175, 216, 142],
  getTranslation: (d) => d.crown.translation,
  getScale: (d) => d.crown.scale,
  getOrientation: (d) => d.crown.orientation,
});

const ambientLight = new AmbientLight({
  intensity: 2.25,
});
const directionalLight = new DirectionalLight({
  color: [255, 255, 255],
  intensity: 0.35,
  direction: [0, 0, -1],
});
const lightingEffect = new LightingEffect({
  ambientLight,
  directionalLight,
});

map.once('styledata', () => {
  // map.addLayer(treesTrunkLayer, 'building-extrusion-2');
  // map.setLayerZoomRange('trees-trunk', 15, 22.1);
  map.addLayer(treesTrunkLayer2, 'building-extrusion-2');
  map.setLayerZoomRange('trees-trunk-2', 15, 22.1);
  map.addLayer(treesCrownLayer, 'building-extrusion-2');
  map.setLayerZoomRange('trees-crown', 15, 22.1);

  map.addSource('trees-source', {
    type: 'vector',
    url: 'mapbox://cheeaun.bptkspgy',
  });

  map.addLayer({
    id: 'trees',
    type: 'circle',
    source: 'trees-source',
    'source-layer': 'trees',
    filter: ['all', ['has', 'girth_size'], ['has', 'height_est']],
    minzoom: 15,
    paint: {
      'circle-radius': 0,
    },
  });

  const minZoom = 15;
  const maxZoom = 19;
  const minHeight = 24;
  const maxHeight = 0;
  const renderTrees = () => {
    const zoom = map.getZoom();
    if (zoom < 15) return;

    // Zoom 19: show all (height > 0)
    // Zoom 15: show trees with height > 24
    const height =
      ((zoom - minZoom) / (maxZoom - minZoom)) * (maxHeight - minHeight) +
      minHeight;

    // Pitch 0 - 60: show all trees
    // Pitch 85: cut off query region from top 50%
    const { innerHeight, innerWidth } = window;
    const padding =
      zoom > 16 ? (Math.max(innerHeight, innerWidth) / 2) * (zoom - 16 + 1) : 0;
    console.log(padding);
    const pitch = map.getPitch();
    const top = pitch > 60 ? ((pitch - 60) / 25) * (innerHeight / 2) : 0;
    const geometry = [
      [0 - padding, innerHeight + padding], // bottom left
      [innerWidth + padding, top], // top right
    ];

    const trees = map.queryRenderedFeatures(geometry, {
      filter: ['>', 'height_est', height],
      layers: ['trees'],
      validate: false,
    });

    // DEBUGGING
    console.log('🌳', trees.length);
    // const treesHeight = {};
    // trees.forEach((d) => {
    //   const { height_est } = d.properties;
    //   if (!treesHeight[height_est]) {
    //     treesHeight[height_est] = 1;
    //   }
    //   treesHeight[height_est]++;
    // });
    // console.log(treesHeight);

    requestAnimationFrame(() => {
      const cleanData = trees.map(cleaningData);

      // treesTrunkLayer.setProps({ data: cleanData });
      treesTrunkLayer2.setProps({ data: cleanData });
      treesCrownLayer.setProps({ data: cleanData });
    });
  };

  map.on('moveend', renderTrees);
  map.once('idle', renderTrees);

  map.on('resize', renderTrees);

  treesCrownLayer.deck.setProps({
    effects: [lightingEffect],
  });
});