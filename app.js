import MapboxLayer from '@deck.gl/mapbox/dist/esm/mapbox-layer';
import { AmbientLight } from '@luma.gl/core/dist/esm/lighting/light-source';
import PointLight from '@deck.gl/core/dist/esm/effects/lighting/point-light';
import DirectionalLight from '@deck.gl/core/dist/esm/effects/lighting/directional-light';
import LightingEffect from '@deck.gl/core/dist/esm/effects/lighting/lighting-effect';
import ScatterplotLayer from '@deck.gl/layers/dist/esm/scatterplot-layer/scatterplot-layer';
import SolidPolygonLayer from '@deck.gl/layers/dist/esm/solid-polygon-layer/solid-polygon-layer';
import SimpleMeshLayer from '@deck.gl/mesh-layers/dist/esm/simple-mesh-layer/simple-mesh-layer';
import SphereGeometry from '@luma.gl/core/dist/esm/geometries/sphere-geometry';
import msgpack from '@ygoe/msgpack';
import polyline from '@mapbox/polyline';
import KDBush from 'kdbush';
import geokdbush from 'geokdbush';
import circle from '@turf/circle';
import throttle from 'just-throttle';
import { html, render } from 'lit-html';

import treesDataPath from './data/trees.min.mp.ico';
import speciesData from './data/species.json';
import familiesSpeciesData from './data/families-species.json';
import poisData from './data/pois.json';

import busIconPath from './assets/bus-icon.png';
import trainIconPath from './assets/train-icon.png';

const speciesFamily = {};
for (let family in familiesSpeciesData) {
  familiesSpeciesData[family].forEach(s => speciesFamily[s] = family);
}

const isTouch = 'ontouchstart' in window || navigator.msMaxTouchPoints;
const smallScreen = screen.width <= 600 || screen.height <= 600;
const hqHash = /#hq/.test(location.hash);
const renderingMode = !hqHash && (isTouch && smallScreen) ? 'low' : 'high';

if (renderingMode === 'low') document.getElementById('rendering-mode').hidden = false;

const distancePoints = (x1, y1, x2, y2) => {
  const dx = x1 - x2;
  const dy = y1 - y2;
  return Math.sqrt(dx * dx + dy * dy);
};

// https://css-tricks.com/converting-color-spaces-in-javascript/
function hexToRGB(h) { // Assume #123456
  let r = 0, g = 0, b = 0;
  r = +('0x' + h[1] + h[2]);
  g = +('0x' + h[3] + h[4]);
  b = +('0x' + h[5] + h[6]);
  return [r, g, b];
};
function HSLToRGB(h,s,l) {
  // Must be fractions of 1
  s /= 100;
  l /= 100;
  let c = (1 - Math.abs(2 * l - 1)) * s,
      x = c * (1 - Math.abs((h / 60) % 2 - 1)),
      m = l - c/2,
      r = 0,
      g = 0,
      b = 0;
  if (0 <= h && h < 60) {
    r = c; g = x; b = 0;
  } else if (60 <= h && h < 120) {
    r = x; g = c; b = 0;
  } else if (120 <= h && h < 180) {
    r = 0; g = c; b = x;
  } else if (180 <= h && h < 240) {
    r = 0; g = x; b = c;
  } else if (240 <= h && h < 300) {
    r = x; g = 0; b = c;
  } else if (300 <= h && h < 360) {
    r = c; g = 0; b = x;
  }
  r = Math.round((r + m) * 255);
  g = Math.round((g + m) * 255);
  b = Math.round((b + m) * 255);
  return [r, g, b];
};

// https://stackoverflow.com/a/47355187/20838
const colorContext = document.createElement('canvas').getContext('2d');
const colorNameCache = new Map();
const colorName2RGB = (str) => {
  if (colorNameCache.has(str)) return colorNameCache.get(str);
  colorContext.fillStyle = str;
  const rgb = hexToRGB(colorContext.fillStyle);
  colorNameCache.set(str, rgb);
  return rgb;
};

const $modal = document.getElementById('modal');
const $card = document.getElementById('card');
const $layersButton = document.getElementById('layers-button');
const $layers = document.getElementById('layers');

$layersButton.onclick = function(){
  document.body.classList.toggle('modal');
  $layers.hidden = !$layers.hidden;
};

function closeLayers(){
  document.body.classList.remove('modal');
  $layers.hidden = true;
}

$modal.onclick = closeLayers;

$layers.onclick = function(e){
  if (e.target.className.toLowerCase() === 'close'){
    closeLayers();
  }
}

const mapBounds = [
  [ 103.6016626883025, 1.233357600011331 ], // sw
  [ 104.0381760444838, 1.473818072475055 ] // ne
];
const map = window._map = new mapboxgl.Map({
  container: 'map',
  style: 'https://api.maptiler.com/maps/darkmatter/style.json?key=xjrAbdVfXA48AYcOS16e',
  minZoom: 8,
  maxZoom: 20,
  renderWorldCopies: false,
  boxZoom: false,
  attributionControl: false, // Attribution is inside Layers modal
  bounds: mapBounds,
  maxTileCacheSize: renderingMode === 'low' ? 0 : null,
});
map.addControl(new mapboxgl.GeolocateControl({
  positionOptions: {
    enableHighAccuracy: true,
  },
  trackUserLocation: true,
}));
map.addControl(new mapboxgl.NavigationControl());

const highlightPoint = {};
const highlightTreeLayer = new MapboxLayer({
  visible: false,
  id: 'highlight-tree',
  type: ScatterplotLayer,
  opacity: 1,
  radiusMinPixels: 10,
  getRadius: 3,
  getFillColor: [26,128,227,50],
  stroked: true,
  lineWidthUnits: 'pixels',
  getLineWidth: 3,
  getLineColor: [26,128,227,255],
});

let labelLayerId;
const mapLoaded = new Promise((res, rej) => map.once('load', () => {
  const layers = map.getStyle().layers;
  console.log(layers);

  for (let i=0, l=layers.length; i<l; i++){
    const layer = layers[i];
    if (!/water/i.test(layer.id) && layer.type === 'symbol' && layer.layout['text-field']) {
      const opacity = Math.max(i / l - .1, .5);
      map.setPaintProperty(layer.id, 'text-color', `rgba(255,255,255,${opacity})`);
      map.setLayoutProperty(layer.id, 'text-transform', 'none');
      if (!labelLayerId) labelLayerId = layer.id;
    }
  }
  map.setPaintProperty('water', 'fill-color', '#1A1D21');

  if (renderingMode === 'high') {
    map.removeLayer('building');

    map.addLayer({
      id: 'building-3d',
      source: 'openmaptiles',
      'source-layer': 'building',
      type: 'fill-extrusion',
      minzoom: 16,
      paint: {
        'fill-extrusion-color': 'rgb(200,200,200)',
        'fill-extrusion-base': ['get', 'render_min_height'],
        'fill-extrusion-height': ['get', 'render_height'],
        'fill-extrusion-opacity': [
          'interpolate', ['linear'], ['zoom'],
          16, 0,
          17, .2
        ],
      },
    });
  } else {
    map.setPaintProperty('building', 'fill-color', 'rgba(200,200,200,.1)');
    map.setPaintProperty('building', 'fill-antialias', false);
    map.setLayerZoomRange('building', 15, 21);
    map.setPaintProperty('building', 'fill-opacity', [
      'interpolate', ['linear'], ['zoom'],
      15, 0,
      16, 1
    ]);
  }

  map.setPaintProperty('landcover_wood', 'fill-color', 'green');
  map.setPaintProperty('landcover_wood', 'fill-opacity', .1);
  map.setPaintProperty('landcover_wood', 'fill-pattern', null);
  map.addLayer({
    id: 'landcover_grass',
    type: 'fill',
    source: 'openmaptiles',
    'source-layer': 'landcover',
    filter: [
      'all',
      [
        '==',
        'class',
        'grass'
      ]
    ],
    paint: {
      'fill-antialias': false,
      'fill-color': 'green',
      'fill-opacity': .1,
    },
  });

  const poiStyles = {
    layout: {
      'icon-offset': [0, -4],
      'icon-size': .5,
      'text-font': [
        'Metropolis Light',
        'Noto Sans Regular'
      ],
      'text-max-width': 12,
      'text-variable-anchor': ['left', 'right', 'bottom', 'top'],
      'text-justify': 'auto',
      'text-radial-offset': .9,
      'text-padding': 1,
      'text-size': 11,
      'text-optional': true,
    },
    paint: {
      'text-halo-blur': 1,
      'text-halo-width': 1,
    },
  }

  map.loadImage(busIconPath, (e, img) => {
    map.addImage('bus', img);
  });
  map.addLayer({
    id: 'poi_bus',
    type: 'symbol',
    source: 'openmaptiles',
    'source-layer': 'poi',
    minzoom: 16,
    filter: ['==', 'class', 'bus'],
    layout: {
      'icon-image': 'bus',
      'text-field': [
        'step', ['zoom'],
        '',
        17, ['concat', ['get', 'name:latin'], '\n', ['get', 'name:nonlatin']],
      ],
      ...poiStyles.layout,
    },
    paint: {
      'text-color': 'rgba(255,255,255,.7)',
      'text-halo-color': 'rgba(0,0,0,0.7)',
      ...poiStyles.paint,
    },
  });

  map.loadImage(trainIconPath, (e, img) => {
    map.addImage('train', img);
  });
  map.addLayer({
    id: 'poi_train',
    type: 'symbol',
    source: 'openmaptiles',
    'source-layer': 'poi',
    minzoom: 13,
    filter: ['==', 'class', 'railway'],
    layout: {
      'icon-image': 'train',
      'text-field': '{name:latin}\n{name:nonlatin}',
      'text-allow-overlap': true,
      'text-ignore-placement': true,
      ...poiStyles.layout,
    },
    paint: {
      'text-color': 'rgba(255,255,255,.7)',
      'text-halo-color': 'rgba(0,0,0,0.7)',
      ...poiStyles.paint,
    },
  });

  map.addImage('park', document.getElementById('park-icon'));
  map.addImage('hroad', document.getElementById('hroad-icon'));
  map.addImage('srgreenery', document.getElementById('srgreenery-icon'));
  map.addImage('garden', document.getElementById('garden-icon'));

  map.addSource('pois', {
    type: 'geojson',
    data: {
      type: 'FeatureCollection',
      features: poisData.map(p => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: p.position,
        },
        properties: {
          name: p.name,
          type: p.type,
        },
      })),
    },
  });
  map.addLayer({
    id: 'pois',
    type: 'symbol',
    source: 'pois',
    minzoom: 14,
    layout: {
      'icon-image': [
        'match', ['get', 'type'],
        'park', 'park',
        'hroad', 'hroad',
        'srgreenery', 'srgreenery',
        'garden', 'garden',
        'circle-11'
      ],
      'text-allow-overlap': true,
      'text-ignore-placement': true,
      'text-field': [
        'step', ['zoom'],
        '',
        16, ['get', 'name'],
      ],
      ...poiStyles.layout,
    },
    paint: {
      'text-color': 'rgba(255,255,255,.85)',
      'text-halo-color': 'rgba(0,0,0,0.85)',
      ...poiStyles.paint,
    },
  });

  setTimeout(() => {
    map.addLayer(highlightTreeLayer);
  }, 300);

  map.once('idle', () => {
    document.getElementById('map').classList.add('loaded');
  });

  res();
}));

const families = Object.keys(familiesSpeciesData).sort();
const fColors = [];
const fColorsMap = {};
const familiesCount = families.length;
families.forEach((f, i) => {
  const hue = i/familiesCount*300;
  const color = `hsl(${hue}, 100%, 50%)`;
  fColors.push(f, color);
  fColorsMap[f] = {
    hslStr: color,
    rgbArr: HSLToRGB(hue, 100, 50),
  };
});
fColors.push('slategray');
document.getElementById('legend-family').innerHTML = Object.keys(fColorsMap).map((f, i) => {
  return `<span class="ib">
    <span class="circle" style="background-color: ${fColorsMap[f].hslStr}" title="${i}"></span>
    ${f}
  </span>`;
}).join('');

const markupCard = (d, selected) => html`
  <button type="button" class="close">×</button>
  <h1>${d.name || (speciesData[d.species_id] || {}).name}
    ${(!d.flowering && !d.heritage ? '🌱' : '')}
    ${(d.flowering ? html`<span title="flowering">🌸</span>` : '')}
    ${(d.heritage ? html`<span title="heritage">🌳</span>` : '')}
  </h1>
  <div class="common ${selected ? 'expand' : ''}">
    Family name: ${d.family ? (
      html`<b>${d.family}</b> <span class="circle" style="background-color: ${d.familyColor ? d.familyColor.hslStr : fColorsMap[d.family]}"></span>`
    ) : '-'}
    ${selected ? html`
      <br>
      Common name: ${d.common_name || (speciesData[d.species_id] || {}).common_name || '-'}
    ` : ''}
  </div>
  <table>
    <thead>
      <tr>
        <th>Tree ID</th>
        <th style="width: 8em">Girth (m)</th>
        <th style="width: 8em">Height (m)</th>
        <th style="width: 4em; text-align: right;">Age (Y)</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>${d.tree_id}</td>
        <td>${d.girth}</td>
        <td>${d.height || '-'}</td>
        <td style="text-align: right;">${d.age || '-'}</td>
      </tr>
    </tbody>
  </table>
  ${selected ? html`
    <div class="footer-buttons">
      <a href="https://www.google.com/maps/search/?api=1&query=${d.position.slice(0, 2).reverse().join(',')}" target="_blank">
        <span hidden class="show-m">🗺 Open in </span>Google Maps
      </a>
      <a href="https://florafaunaweb.nparks.gov.sg/Special-Pages/plant-detail-master.aspx?id=${d.species_id}" target="_blank">
        🔍 Learn more
      </a>
    </div>
  ` : ''}
`;
const showTree = (d, selected = false) => {
  render(markupCard(d, selected), $card);
  $card.hidden = false;
  $card.classList.toggle('selected', selected);
};

let highlightedTree;
let selectedTree;
$card.onclick = (e) => {
  if (e.target && e.target.tagName.toLowerCase() === 'a') {
    return;
  }
  e.preventDefault();
  e.stopPropagation();
  if (e.target && e.target.classList.contains('close')) {
    $card.hidden = true;
    highlightTreeLayer.setProps({
      visible: false,
    });
    selectedTree = highlightedTree = null;
  } else if (highlightedTree) {
    selectedTree = highlightedTree;
    showTree(selectedTree, true);
    flyToPosition(selectedTree.position);
  }
};

const flyToPosition = (lngLat) => {
  document.body.style.pointerEvents = 'none';
  map.once('moveend', () => {
    document.body.style.pointerEvents = '';
  });
  const zoom = map.getZoom();
  if (zoom >= 16) {
    map.easeTo({
      center: lngLat,
      zoom: Math.max(18, zoom),
    });
  } else {
    map.flyTo({
      speed: 1,
      center: lngLat,
      zoom: 16,
    });
  }
};

(async () => {
  if (renderingMode === 'low') {

    mapboxgl.accessToken = 'pk.eyJ1IjoiY2hlZWF1biIsImEiOiJjanF3azBrMjMwM2w1NDNyN3Yzc21saDUzIn0.jNWlsBO-S3uDKdfT9IKT1A';
    await mapLoaded;

    map.addSource('trees-source', {
      type: 'vector',
      url: 'mapbox://cheeaun.bptkspgy',
    });

    const layerStyles = {
      type: {
        paint: {
          'circle-color': [
            'case',
            ['all', ['to-boolean', ['get', 'flowering']], ['to-boolean', ['get', 'heritage']]], 'magenta',
            ['to-boolean', ['get', 'flowering']], 'orangered',
            ['to-boolean', ['get', 'heritage']], 'aqua',
            'green'
          ],
          'circle-radius': [
            'interpolate', ['linear'], ['zoom'],
            8, .5,
            14, ['case',
              ['to-boolean', ['get', 'flowering']], 3,
              ['to-boolean', ['get', 'heritage']], 3,
              1.25
            ],
            20, ['case',
              ['to-boolean', ['get', 'flowering']], 10,
              ['to-boolean', ['get', 'heritage']], 10,
              6
            ]
          ],
          'circle-stroke-width': [
            'interpolate', ['linear'], ['zoom'],
            11, 0,
            14, 1,
          ],
          'circle-stroke-color': 'rgba(0,0,0,.25)',
        },
      },
      girth: {
        paint: {
          'circle-color': [
            'match', ['get', 'girth_size'],
            'L', 'orangered',
            'M', 'green',
            'S', 'limegreen',
            'XS', 'yellow',
            'slategray',
          ],
          'circle-opacity': [
            'match', ['get', 'girth_size'],
            'L', 1,
            'M', .78,
            'S', .56,
            'XS', .5,
            .5,
          ],
          'circle-radius': [
            'interpolate', ['linear'], ['zoom'],
            10, .5,
            20, 5,
          ],
        },
      },
      age: {
        paint: {
          'circle-color': [
            'interpolate', ['linear'], ['to-number', ['get', 'age'], 0],
            0, 'slategray',
            0.001, 'yellow',
            10, 'orange',
            20, 'lime',
            30, 'orangered',
            100, 'magenta'
          ],
          'circle-opacity': [
            'interpolate', ['linear'], ['to-number', ['get', 'age'], 0],
            0, .25,
            1, .5,
            10, .6,
            20, .78,
            30, 1
          ],
          'circle-radius': [
            'interpolate', ['linear'], ['zoom'],
            10, ['case',
              ['>', ['to-number', ['get', 'age']], 30],
                ['max', .5, ['min', 3, ['to-number', ['get', 'age']]]],
              .5,
            ],
            20, 5,
          ],
        }
      },
      family: {
        paint: {
          'circle-color': [
            'match',
            ['to-string', ['get', 'family']]
          ].concat(fColors),
          'circle-opacity': [
            'case',
            ['to-boolean', ['get', 'family']], 1,
            .5
          ],
          'circle-radius': [
            'interpolate', ['linear'], ['zoom'],
            10, .5,
            20, 5,
          ],
        }
      }
    };

    map.addLayer({
      id: 'trees',
      type: 'circle',
      source: 'trees-source',
      'source-layer': 'trees',
      layout: {
        visibility: 'none',
      },
    }, labelLayerId);

    window.onhashchange = function(){
      const hash = location.hash.slice(1);
      let filter = (hash.match(/^[^/]+/i) || ['type'])[0];
      let styles = layerStyles[filter];
      if (!styles) {
        filter = 'type';
        styles = layerStyles.type;
      };
      const { paint } = styles;
      for (let name in paint){
        map.setPaintProperty('trees', name, paint[name]);
      };
      map.setLayoutProperty('trees', 'visibility', 'visible');
      const links = document.querySelectorAll('#layers a');
      for (let i=0; i<links.length; i++){
        const link = links[i];
        link.classList.toggle('selected', link.innerText.toLowerCase() == filter);
      }
      const legends = document.querySelectorAll('#layers .legend');
      for (let i=0; i<legends.length; i++){
        const legend = legends[i];
        legend.classList.toggle('selected', legend.classList.contains(filter));
      }
    };
    window.onhashchange();

    const pointRange = 10;
    map.on('click', (e) => {
      const { point, lngLat } = e;
      if (selectedTree) {
        const { point } = e;
        const treePoint = map.project(selectedTree.position);
        const distance = distancePoints(point.x, point.y, treePoint.x, treePoint.y);
        if (distance > 30) {
          // If cursor click is far away from selected tree,
          // reset everything
          selectedTree = highlightedTree = null;
          $card.hidden = true;
          highlightTreeLayer.setProps({
            visible: false,
          });
        }
      } else {
        let feature;
        let features = map.queryRenderedFeatures(point, { layers: ['trees'] });
        if (features.length) {
          feature = features[0];
        } else {
          const { x, y } = point;
          features = map.queryRenderedFeatures([{
            x: x - pointRange,
            y: y - pointRange,
          },{
            x: x + pointRange,
            y: y + pointRange,
          }], { layers: ['trees'] });
          let shortestDistance = Infinity;
          features.forEach(f => {
            const { coordinates } = f.geometry;
            const distance = distancePoints(lngLat.lng, lngLat.lat, coordinates[0], coordinates[1]);
            if (distance < shortestDistance) {
              shortestDistance = distance;
              feature = f;
            }
          });
        }
        console.log(e, features);
        if (feature) {
          const { properties } = feature;
          const position = properties.position = properties.position.split(',').map(Number);
          highlightedTree = properties;
          showTree(highlightedTree);
          highlightPoint.position = position;
          highlightTreeLayer.setProps({
            visible: true,
            data: [highlightPoint],
          });
        } else {
          highlightedTree = null;
          $card.hidden = true;
          highlightTreeLayer.setProps({
            visible: false,
          });
        }
      }
      return true;
    });

    const throttledDrag = throttle(() => {
      if (selectedTree) return;
      if ($card.hidden) return;
      $card.hidden = true;
      highlightTreeLayer.setProps({
        visible: false,
      });
      return true;
    }, 1000);
    map.on('drag', throttledDrag);

  } else {

    // Pitch control
    class PitchControl {
      onAdd(map) {
        this._map = map;
        const container = document.createElement('div');
        container.className = 'mapboxgl-ctrl mapboxgl-ctrl-group';
        container.innerHTML = `
          <button class="mapboxgl-ctrl-icon mapboxgl-ctrl-custom-pitch" type="button">
            <span>3D</span>
          </button>
        `;
        container.onclick = function(){
          const pitch = map.getPitch();
          const zoom = map.getZoom();
          let nextPitch = 0;
          if (pitch <= 5) nextPitch = 60;
          if (zoom < 17 && pitch < 5) {
            map.flyTo({
              pitch: nextPitch,
              zoom: 17,
            });
          } else {
            map.easeTo({
              pitch: nextPitch,
            });
          }
        };
        map.on('pitchend', this.onPitch);
        this._container = container;
        return this._container;
      }
      onPitch = () => {
        const pitch = this._map.getPitch();
        const is3DMode = pitch > 5;
        this._container.classList.toggle('active', is3DMode);
      }
      onRemove() {
        this._container.parentNode.removeChild(this._container);
        this._map.off('pitchend', this.onPitch);
        this._map = undefined;
      }
    };
    map.addControl(new PitchControl(), 'top-right');

    console.time('data download and decode');
    const fetchTrees = fetch(treesDataPath)
      .then(res => res.arrayBuffer())
      .then(res => {
        const response = msgpack.deserialize(new Uint8Array(res));
        console.timeEnd('data download and decode');
        console.time('data massage');
        const coords = polyline.decode(response.line);
        const metadata = {};
        const data = response.props.map((p, i) => {
          const [
            id,
            tree_id,
            species_id,
            girth,
            girth_size,
            height,
            height_est,
            age,
            flowering,
            heritage,
          ] = p;
          const names = speciesData[species_id] || {};
          const family = speciesFamily[species_id] || null;
          const elevation = (heritage || flowering) ? .3 : (age > 30) ? .2 : family ? .1 : 0;
          metadata[id] = {
            tree_id,
            species_id,
            girth,
            height,
            name: names.name || '',
            common_name: names.common_name || '',
            family,
          };
          return {
            id,
            position: coords[i].concat(elevation),
            // all properties needed for rendering
            girth_size,
            height_est,
            age,
            flowering,
            heritage,
            familyColor: fColorsMap[family] || null,
          };
        });
        console.timeEnd('data massage');
        return [data, metadata];
      });

    const treesLayer = new MapboxLayer({
      id: 'trees',
      type: ScatterplotLayer,
      opacity: 1,
      radiusMinPixels: .1,
      radiusMaxPixels: 5,
      lineWidthUnits: 'pixels',
      getLineWidth: 1,
      getLineColor: [0,0,0,200],
    });

    map.on('zoom', () => {
      const zoom = map.getZoom();
      treesLayer.setProps({
        stroked: (zoom >= 16),
      });
    });

    const layerStyles = {
      type: {
        getRadius: (d) => (d.flowering || d.heritage) ? 100 : 3,
        getFillColor: (d) => {
          if (d.flowering && d.heritage) return colorName2RGB('magenta');
          if (d.flowering) return colorName2RGB('orangered');
          if (d.heritage) return colorName2RGB('aqua');
          return colorName2RGB('green');
        },
      },
      girth: {
        getRadius: 3,
        getFillColor: (d) => {
          const color = {
            NULL: ['slategray', 128],
            XS: ['yellow', 140],
            S: ['limegreen', 170],
            M: ['green', 200],
            L: ['orangered', 255],
          }[d.girth_size || 'NULL'];
          return colorName2RGB(color[0]).concat(color[1]);
        },
      },
      age: {
        getRadius: (d) => d.age > 30 ? Math.max(3, d.age) : 3,
        getFillColor: ({ age }) => {
          if (age >= 100) return colorName2RGB('magenta');
          if (age > 30) return colorName2RGB('orangered');
          if (age > 20) return colorName2RGB('lime').concat(200);
          if (age > 10) return colorName2RGB('orange').concat(170);
          if (age > 0.001) return colorName2RGB('yellow').concat(140);
          return colorName2RGB('slategray').concat(128);
        },
      },
      family: {
        getRadius: 3,
        getFillColor: ({ familyColor }) => familyColor ? familyColor.rgbArr : colorName2RGB('slategray').concat(128),
      },
    };

    const trees3DLayer = new MapboxLayer({
      visible: false,
      id: 'trees-3d',
      type: SolidPolygonLayer,
      getFillColor: (d) => d.crown ? colorName2RGB('green').concat(100) : colorName2RGB('saddlebrown').concat(128),
      extruded: true,
      getElevation: (d) => d.elevation,
    });

    const treesCrownLayer = new MapboxLayer({
      visible: false,
      id: 'trees-crown',
      type: SimpleMeshLayer,
      texture: document.getElementById('leaves'),
      mesh: new SphereGeometry(),
      data: [],
      getColor: colorName2RGB('green').concat(100),
      getTranslation: (d) => [0, 0, d.height_est * .75],
      getScale: (d) => {
        const scale = d.height_est * .5;
        return [scale * .8, scale * .8, scale * .9];
      },
    });

    const tree3DCache = new Map();
    const tree3Dify = (id, d) => {
      if (tree3DCache.has(id)) return tree3DCache.get(id);
      const { height_est: height, position } = d;
      const girth = parseFloat(d.girth.match(/[\d.]+[^\d.]?$/)[0], 10);
      const steps = 6 + ((girth - 0.5) * 2) // girth: from 0.5 to 1.5
      const trunkRadius = girth / Math.PI * 2;
      const trunkPolygon = circle(position, trunkRadius/1000, { steps }).geometry.coordinates;
      const trunk = {
        polygon: trunkPolygon,
        elevation: height * .75, // let the trunk "goes into" the crown a bit
      };
      // const crownRadius = height * .4;
      // const crownPolygon = circle(position, crownRadius/1000, { steps: steps * 2 }).geometry.coordinates[0];
      // const crown = {
      //   crown: true,
      //   polygon: crownPolygon.map(c => c.concat(height * .5)),
      //   elevation: height * .5,
      // };
      // const polygons = [trunk, crown];
      const polygons = [trunk];
      tree3DCache.set(id, polygons);
      return polygons;
    };
    const trees3Dify = (data, metadata) => {
      const finalData = [];
      data.forEach(d => {
        finalData.push(...tree3Dify(d.id, { ...d, ...metadata[d.id] }));
      });
      return finalData;
    };

    await mapLoaded;
    const [data, metadata] = await fetchTrees;

    treesLayer.setProps({ data });
    map.addLayer(treesLayer, labelLayerId);

    document.getElementById('total-trees').innerHTML = data.length.toLocaleString();
    document.getElementById('total-flowering').innerHTML = data.filter(d => d.flowering).length.toLocaleString();
    document.getElementById('total-heritage').innerHTML = data.filter(d => d.heritage).length.toLocaleString();

    window.onhashchange = function(){
      const hash = location.hash.slice(1);
      const filter = (hash.match(/^[^/]+/i) || ['type'])[0];
      const styles = layerStyles[filter] || layerStyles.type;
      if (!styles) {
        filter = 'type';
        styles = layerStyles.type;
      };
      treesLayer.setProps({
        ...styles,
        updateTriggers: styles,
      });
      const links = document.querySelectorAll('#layers a');
      for (let i=0; i<links.length; i++){
        const link = links[i];
        link.classList.toggle('selected', link.innerText.toLowerCase() == filter);
      }
      const legends = document.querySelectorAll('#layers .legend');
      for (let i=0; i<legends.length; i++){
        const legend = legends[i];
        legend.classList.toggle('selected', legend.classList.contains(filter));
      }
    };
    window.onhashchange();

    const index = new KDBush(data, (p) => p.position[0], (p) => p.position[1]);
    const data3D = data.filter(d => !!d.girth_size && !!d.height_est);
    const index3D = new KDBush(data3D, (p) => p.position[0], (p) => p.position[1]);

    const throttledDrag = throttle(() => {
      if (selectedTree) return;
      if ($card.hidden) return;
      $card.hidden = true;
      highlightTreeLayer.setProps({
        visible: false,
      });
      return true;
    }, 1000);
    map.on('drag', throttledDrag);

    const isTree3DMode = () => {
      const zoom = map.getZoom();
      const pitch = map.getPitch();
      return zoom >= 17 && pitch > 5;
    };

    // Zoom 0 - 12: within 100 meters (0.1 km)
    // Zoom 12 - 20: decreasing to within 10 meters (0.01 km)
    const zoomMin = 12;
    const zoomRange = 20 - zoomMin;
    const radiusMin = .1;
    const radiusRange = .01 - radiusMin;
    const getRadiusByZoom = (zoom) => (((zoom - zoomMin) * radiusRange) / zoomRange) + radiusMin;
    const getNearestTree = (point) => {
      const zoom = map.getZoom();
      const radius = zoom <= zoomMin ? .1 : getRadiusByZoom(zoom);
      const nearestPoints = geokdbush.around(isTree3DMode() ? index3D : index, point.lng, point.lat, 1, radius);
      if (nearestPoints && nearestPoints.length) {
        const nearestPoint = nearestPoints[0];
        return {
          ...nearestPoint,
          ...metadata[nearestPoint.id],
        };
      }
      return;
    };

    let mousemoveRAF;
    map.on('mousemove', (e) => {
      if (mousemoveRAF) cancelAnimationFrame(mousemoveRAF);
      if (selectedTree) return;
      if (map.isMoving()) return;
      mousemoveRAF = requestAnimationFrame(() => {
        const point = e.lngLat;
        const nearestTree = getNearestTree(point);
        if (nearestTree) {
          highlightedTree = nearestTree;
          showTree(highlightedTree);
          highlightPoint.position = highlightedTree.position;
          highlightTreeLayer.setProps({
            visible: true,
            data: [highlightPoint],
          });
        }
      });
    });

    map.on('click', (e) => {
      if (selectedTree) {
        const { point } = e;
        const treePoint = map.project(selectedTree.position);
        const distance = distancePoints(point.x, point.y, treePoint.x, treePoint.y);
        if (distance > 30) {
          // If cursor click is far away from selected tree,
          // reset everything
          selectedTree = highlightedTree = null;
          $card.hidden = true;
          highlightTreeLayer.setProps({
            visible: false,
          });
        }
      } else {
        const point = e.lngLat;
        highlightedTree = getNearestTree(point);
        if (highlightedTree) {
          if (isTouch) {
            showTree(highlightedTree);
            highlightPoint.position = highlightedTree.position;
            highlightTreeLayer.setProps({
              visible: true,
              data: [highlightPoint],
            });
          } else {
            selectedTree = highlightedTree;
            showTree(selectedTree, true);
            flyToPosition(selectedTree.position);
          }
        } else {
          $card.hidden = true;
          highlightTreeLayer.setProps({
            visible: false,
          });
        }
      }
      return true;
    });

    map.addLayer(trees3DLayer, labelLayerId);
    map.setLayerZoomRange('trees-3d', 16, 20.5);
    map.addLayer(treesCrownLayer, labelLayerId);
    map.setLayerZoomRange('trees-crown', 16, 20.5);

    // create ambient light source
    const ambientLight = new AmbientLight({
      color: [255, 255, 255],
      intensity: 1.0
    });
    // create point light source
    const pointLight = new PointLight({
      color: [255, 255, 255],
      intensity: 2.0,
      // use coordinate system as the same as view state
      position: [-125, 50.5, 5000]
    });
    // create directional light source
    const directionalLight = new DirectionalLight({
      color: [255, 255, 255],
      intensity: 1.0,
      direction: [-3, -9, -1]
    });
    // create lighting effect with light sources
    const lightingEffect = new LightingEffect({ambientLight, pointLight, directionalLight});
    // trees3DLayer.deck.setProps({
    //   effects: [lightingEffect],
    // });
    treesCrownLayer.deck.setProps({
      effects: [lightingEffect],
    });

    let renderRAF;
    const renderTrees = throttle(() => {
      if (renderRAF) cancelAnimationFrame(renderRAF);
      renderRAF = requestAnimationFrame(() => {
        if (isTree3DMode()) {
          const bounds = map.getBounds();
          let results = index3D.range(...bounds.toArray().flat()).map(id => data3D[id]);
          // Min: 1000, Max: 10000 3D trees
          if (results.length < 1000) {
            const center = map.getCenter();
            results = geokdbush.around(index3D, center.lng, center.lat, 1000);
          } else if (results.length > 10000) {
            const center = map.getCenter();
            results = geokdbush.around(index3D, center.lng, center.lat, 10000);
          }
          console.log(`3D trees count: ${results.length}`);
          trees3DLayer.setProps({
            visible: true,
            data: trees3Dify(results, metadata),
          });
          treesCrownLayer.setProps({
            visible: true,
            data: results,
          });
          treesLayer.setProps({
            visible: false,
          });
          if (!selectedTree) highlightTreeLayer.setProps({
            visible: false,
          });
        } else {
          trees3DLayer.setProps({
            visible: false,
          });
          treesCrownLayer.setProps({
            visible: false,
          });
          treesLayer.setProps({
            visible: true,
          });
        }
      });
    }, 1000);
    map.on('move', renderTrees);

  }
})();

// Touch demo mode
// Renders finger taps on screen for demo purposes
// Supports up to 2 taps, for now
if (/touch\-demo/i.test(location.hash)) {
  const pointers = [];
  pointers[0] = document.createElement('div');
  pointers[0].style = 'background-color: rgba(220,220,220,.3); border: 10px solid rgba(5,5,5,.3); width: 100px; height: 100px; border-radius: 123123px; margin: -50px 0 0 -50px; position: absolute; left: 0; top: 0; pointer-events: none;';
  pointers[0].hidden = true;
  pointers[1] = pointers[0].cloneNode();
  pointers.forEach(p => document.body.appendChild(p));

  document.body.ontouchstart =
    document.body.ontouchend =
    document.body.ontouchmove =
    document.body.ontouchcancel =
    (e) => {
      requestAnimationFrame(() => {
        pointers.forEach(p => p.hidden = true);
        [...e.touches].forEach((touch, i) => {
          if (i >= 2) return;
          pointers[i].style.transform = `translate(${touch.clientX}px, ${touch.clientY}px)`;
          pointers[i].hidden = false;
        });
      });
    };
}