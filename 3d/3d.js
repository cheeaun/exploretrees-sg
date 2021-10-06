import MapboxLayer from '@deck.gl/mapbox/dist/esm/mapbox-layer';
import MVTLayer from '@deck.gl/geo-layers/dist/esm/mvt-layer/mvt-layer';
import { AmbientLight } from '@deck.gl/core/dist/esm/effects/lighting/ambient-light';
import { DirectionalLight } from '@deck.gl/core/dist/esm/effects/lighting/directional-light';
import LightingEffect from '@deck.gl/core/dist/esm/effects/lighting/lighting-effect';
import SolidPolygonLayer from '@deck.gl/layers/dist/esm/solid-polygon-layer/solid-polygon-layer';
import SimpleMeshLayer from '@deck.gl/mesh-layers/dist/esm/simple-mesh-layer/simple-mesh-layer';

import { OBJLoader } from '@loaders.gl/obj';

import circle from '@turf/circle';

import familiesSpeciesData from '../data/families-species.json';
import crownOBJPath from '../assets/crown.obj';

const speciesFamily = {};
for (let family in familiesSpeciesData) {
  familiesSpeciesData[family].forEach((s) => (speciesFamily[s] = family));
}

const ACCESS_TOKEN =
  'pk.eyJ1IjoiY2hlZWF1biIsImEiOiJjanF3azBrMjMwM2w1NDNyN3Yzc21saDUzIn0.jNWlsBO-S3uDKdfT9IKT1A';
mapboxgl.accessToken = ACCESS_TOKEN;
const mapBounds = [
  [103.6016626883025, 1.233357600011331], // sw
  [104.0381760444838, 1.473818072475055], // ne
];
const map = (window._map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/cheeaun/ckpoxzt7o076k17rqq7jrowxg/draft',
  minZoom: 8,
  renderWorldCopies: false,
  boxZoom: false,
  attributionControl: false,
  // bounds: mapBounds,
  hash: true,
  center: [103.84708968044379, 1.2928590602954841],
  pitch: 65,
  zoom: 17.7,
}));
map.addControl(new mapboxgl.NavigationControl());

const treesTrunkCache = new Map();
const treesMVTLayer = new MapboxLayer({
  id: 'trees-mvt',
  type: MVTLayer,
  data: `https://api.mapbox.com/v4/cheeaun.bptkspgy/{z}/{x}/{y}.vector.pbf?access_token=${ACCESS_TOKEN}`,
  minZoom: 17,
  maxZoom: 22,
  renderSubLayers: (props) => {
    const data = props.data
      .filter((d) => d.geometry.coordinates.every((c) => c > 0))
      .sort((a, b) => b.geometry.coordinates[1] - a.geometry.coordinates[1])
      .slice(0, 300);
    // console.log(props.data.length, data.length, props);
    return [
      new SolidPolygonLayer({
        id: props.id + '-trunk',
        data,
        getFillColor: [219, 195, 154],
        extruded: true,
        getPolygon: (d) => {
          const id = d.properties.id;
          if (treesTrunkCache.has(id)) return treesTrunkCache.get(id);
          const position = d.properties.position.split(',').map(Number);
          const girth = parseFloat(
            (d.properties.girth || '0.5').match(/[\d.]+[^\d.]?$/)[0],
            10,
          );
          const steps = 6 + (girth - 0.5) * 2; // girth: from 0.5 to 1.5
          const trunkRadius = (girth / Math.PI) * 2;
          const trunkPolygon = circle(position, trunkRadius / 1000, { steps })
            .geometry.coordinates;
          treesTrunkCache.set(id, trunkPolygon);
          return trunkPolygon;
        },
        getElevation: (d) => d.properties.height_est * 0.75,
      }),
      new SimpleMeshLayer({
        id: props.id + '-crown',
        data,
        mesh: crownOBJPath,
        loaders: [OBJLoader],
        getColor: [175, 216, 142],
        getPosition: (d) => {
          const position = d.properties.position.split(',').map(Number);
          return position;
        },
        getTranslation: (d) => [0, 0, d.properties.height_est * 0.6],
        getScale: (d) => {
          const scale = d.properties.height_est * 0.66;
          return [scale * 0.1, scale * 0.1, scale * 0.135];
        },
        getOrientation: (d) => {
          const o = d.properties.id.slice(-1) / 9;
          return [0, o * 180, 0];
        },
      }),
    ];
  },
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

map.once('load', async () => {
  map.addLayer(treesMVTLayer, 'building-extrusion-2');
  map.setLayerZoomRange('trees-mvt', 17, 22.1);

  treesMVTLayer.deck.setProps({
    effects: [lightingEffect],
  });
});
