import MapboxLayer from '@deck.gl/mapbox/dist/esm/mapbox-layer';
import MVTLayer from '@deck.gl/geo-layers/dist/esm/mvt-layer/mvt-layer';
import { AmbientLight } from '@deck.gl/core/dist/esm/effects/lighting/ambient-light';
import { DirectionalLight } from '@deck.gl/core/dist/esm/effects/lighting/directional-light';
import LightingEffect from '@deck.gl/core/dist/esm/effects/lighting/lighting-effect';
import SolidPolygonLayer from '@deck.gl/layers/dist/esm/solid-polygon-layer/solid-polygon-layer';
import SimpleMeshLayer from '@deck.gl/mesh-layers/dist/esm/simple-mesh-layer/simple-mesh-layer';
import { OBJLoader } from '@loaders.gl/obj';
import circle from '@turf/circle';

import crownOBJPath from '../assets/crown.obj';

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

const treesCache = new Map();
const cleaningData = (d) => {
  const { id, girth: _girth, height_est } = d.properties;
  if (treesCache.has(id)) return treesCache.get(id);
  const position = d.geometry.coordinates;
  const girth = parseFloat((_girth || '0.5').match(/[\d.]+[^\d.]?$/)[0], 10);
  const steps = 6 + (girth - 0.5) * 2; // girth: from 0.5 to 1.5
  const trunkRadius = (girth / Math.PI) * 2;
  const trunkPolygon = circle(position, trunkRadius / 1000, { steps }).geometry
    .coordinates;
  const scale = height_est * 0.66;
  const newD = {
    id,
    position,
    polygon: trunkPolygon,
    elevation: height_est * 0.75,
    translation: [0, 0, height_est * 0.6],
    scale: [scale * 0.1, scale * 0.1, scale * 0.135],
    orientation: [0, (id.slice(-1) / 9) * 180, 0],
  };
  treesCache.set(id, newD);
  return newD;
};

const treesMVTLayer = new MapboxLayer({
  id: 'trees-mvt',
  type: MVTLayer,
  data: `https://api.mapbox.com/v4/cheeaun.bptkspgy/{z}/{x}/{y}.vector.pbf?access_token=${ACCESS_TOKEN}`,
  minZoom: 17,
  maxZoom: 22,
  renderSubLayers: (props) => {
    // console.log(props.tile.dataInWGS84.length);
    const data = props.tile.dataInWGS84
      .filter((d) => !!d.properties.girth_size && !!d.properties.height_est)
      .sort((a, b) => b.geometry.coordinates[1] - a.geometry.coordinates[1])
      .slice(0, 300);
    // console.log(props.data.length, data.length, props);

    const cleanData = data.map(cleaningData);

    return [
      new SolidPolygonLayer({
        id: props.id + '-trunk',
        data: cleanData,
        getFillColor: [219, 195, 154],
        extruded: true,
        getElevation: (d) => d.elevation,
      }),
      new SimpleMeshLayer({
        id: props.id + '-crown',
        data: cleanData,
        mesh: crownOBJPath,
        loaders: [OBJLoader],
        getColor: [175, 216, 142],
        getTranslation: (d) => d.translation,
        getScale: (d) => d.scale,
        getOrientation: (d) => d.orientation,
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
