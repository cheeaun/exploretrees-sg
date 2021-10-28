import { html, render } from 'lit';
import Papa from 'papaparse';

const DATA_API_ROOT = 'https://data.exploretrees.sg/';

const speciesFamily = {};
const fColorsMap = {};
const fColors = [];
const familiesSpeciesFetch = fetch(`${DATA_API_ROOT}families-species.json`)
  .then((res) => res.json())
  .then((data) => {
    const familiesSpeciesData = data;
    for (let family in familiesSpeciesData) {
      familiesSpeciesData[family].forEach((s) => (speciesFamily[s] = family));
    }

    const families = Object.keys(familiesSpeciesData).sort();
    const familiesCount = families.length;
    families.forEach((f, i) => {
      const hue = (i / familiesCount) * 300;
      const color = `hsl(${hue}, 100%, 50%)`;
      fColors.push(f, color);
      fColorsMap[f] = {
        hslStr: color,
        rgbArr: HSLToRGB(hue, 100, 50),
      };
    });
    fColors.push('slategray');
    document.getElementById('legend-family').innerHTML = Object.keys(fColorsMap)
      .map((f, i) => {
        return `<a href="#family/${f}" class="ib">
      <span class="circle" style="background-color: ${fColorsMap[f].hslStr}" title="${i}"></span>
      ${f}
    </a>`;
      })
      .join('');
    document.getElementById('legend-family').onclick = (e) => {
      if (e.target.tagName.toLowerCase() === 'a') {
        if (e.target.classList.contains('selected')) {
          e.preventDefault();
          location.hash = '#family';
        }
      }
    };
  });

const isTouch = 'ontouchstart' in window || navigator.msMaxTouchPoints;
const hqHash = /#hq/.test(location.hash);
const renderingMode = !hqHash && isTouch ? 'low' : 'high';

if (renderingMode === 'low')
  document.getElementById('rendering-mode').hidden = false;

const distancePoints = (x1, y1, x2, y2) => {
  const dx = x1 - x2;
  const dy = y1 - y2;
  return Math.sqrt(dx * dx + dy * dy);
};

// https://css-tricks.com/converting-color-spaces-in-javascript/
function hexToRGB(h) {
  // Assume #123456
  let r = 0,
    g = 0,
    b = 0;
  r = +('0x' + h[1] + h[2]);
  g = +('0x' + h[3] + h[4]);
  b = +('0x' + h[5] + h[6]);
  return [r, g, b];
}
function HSLToRGB(h, s, l) {
  // Must be fractions of 1
  s /= 100;
  l /= 100;
  let c = (1 - Math.abs(2 * l - 1)) * s,
    x = c * (1 - Math.abs(((h / 60) % 2) - 1)),
    m = l - c / 2,
    r = 0,
    g = 0,
    b = 0;
  if (0 <= h && h < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (60 <= h && h < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (120 <= h && h < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (180 <= h && h < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (240 <= h && h < 300) {
    r = x;
    g = 0;
    b = c;
  } else if (300 <= h && h < 360) {
    r = c;
    g = 0;
    b = x;
  }
  r = Math.round((r + m) * 255);
  g = Math.round((g + m) * 255);
  b = Math.round((b + m) * 255);
  return [r, g, b];
}

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

$layersButton.onclick = function () {
  document.body.classList.toggle('modal');
  $layers.hidden = !$layers.hidden;
};

function closeLayers() {
  document.body.classList.remove('modal');
  $layers.hidden = true;
}

$modal.onclick = closeLayers;

$layers.onclick = function (e) {
  if (e.target.className.toLowerCase() === 'close') {
    closeLayers();
  }
  if (/family\//i.test(e.target.href)) {
    closeLayers();
  }
};

mapboxgl.accessToken =
  'pk.eyJ1IjoiY2hlZWF1biIsImEiOiJjanF3azBrMjMwM2w1NDNyN3Yzc21saDUzIn0.jNWlsBO-S3uDKdfT9IKT1A';
const mapBounds = [
  [103.6016626883025, 1.233357600011331], // sw
  [104.0381760444838, 1.473818072475055], // ne
];
const map = (window._map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/cheeaun/ckuuzdbmpf0uw17s058a34qq3?optimize=true',
  minZoom: 8,
  maxZoom: 20,
  renderWorldCopies: false,
  boxZoom: false,
  attributionControl: false, // Attribution is inside Layers modal
  bounds: mapBounds,
  // maxTileCacheSize: renderingMode === 'low' ? 0 : null,
  pitchWithRotate: renderingMode === 'high',
  dragRotate: renderingMode === 'high',
  keyboard: renderingMode === 'high',
  fadeDuration: renderingMode === 'high' ? 300 : 0,
  touchPitch: renderingMode === 'high',
}));
if (renderingMode === 'low') {
  map.touchZoomRotate.disableRotation();
  // map.on('error', (e) => alert(e));
}
const geolocateControl = new mapboxgl.GeolocateControl({
  positionOptions: {
    enableHighAccuracy: true,
  },
  showUserHeading: true,
  trackUserLocation: true,
});
map.addControl(geolocateControl);
map.addControl(new mapboxgl.NavigationControl());

let orientationGranted = false;
geolocateControl._geolocateButton.addEventListener('click', (e) => {
  if (window.DeviceOrientationEvent && !orientationGranted) {
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
      DeviceOrientationEvent.requestPermission()
        .then(function (permissionState) {
          if (permissionState === 'granted') {
            console.log('granted');
          }
        })
        .catch((e) => {});
    }
  }
});

let labelLayerId;
let mapLoaded = new Promise((res, rej) => map.once('load', res));

let speciesData = {};
fetch(DATA_API_ROOT + 'species.json')
  .then((res) => res.json())
  .then((data) => {
    speciesData = data;
  });

map.once('styledata', () => {
  const layers = map.getStyle().layers;
  console.log(layers);
  labelLayerId = layers.find(
    (layer) => layer.type === 'symbol' && layer.layout['text-field'],
  ).id;

  const poiStyles = {
    layout: {
      'icon-offset': [0, -4],
      'icon-size': 0.5,
      'text-max-width': 12,
      'text-variable-anchor': ['left', 'right', 'bottom', 'top'],
      'text-justify': 'auto',
      'text-radial-offset': 0.9,
      'text-padding': 1,
      'text-size': 11,
      'text-optional': true,
    },
    paint: {
      'text-halo-blur': 1,
      'text-halo-width': 1,
    },
  };

  map.once('idle', () => {
    fetch(DATA_API_ROOT + 'pois.json')
      .then((res) => res.json())
      .then((poisData) => {
        map.addSource('pois', {
          type: 'geojson',
          tolerance: 10,
          buffer: 0,
          data: {
            type: 'FeatureCollection',
            features: poisData.map((p) => ({
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

        map.addImage('poi-park', document.getElementById('park-icon'));
        map.addImage('poi-hroad', document.getElementById('hroad-icon'));
        map.addImage(
          'poi-srgreenery',
          document.getElementById('srgreenery-icon'),
        );
        map.addImage('poi-garden', document.getElementById('garden-icon'));

        map.addLayer({
          id: 'pois',
          type: 'symbol',
          source: 'pois',
          minzoom: 16,
          layout: {
            'icon-image': [
              'match',
              ['get', 'type'],
              'park',
              'poi-park',
              'hroad',
              'poi-hroad',
              'srgreenery',
              'poi-srgreenery',
              'garden',
              'poi-garden',
              'circle-11',
            ],
            'text-allow-overlap': true,
            'text-ignore-placement': true,
            'text-field': ['step', ['zoom'], '', 16, ['get', 'name']],
            ...poiStyles.layout,
          },
          paint: {
            'text-color': 'rgba(255,255,255,.85)',
            'text-halo-color': 'rgba(0,0,0,0.85)',
            ...poiStyles.paint,
          },
        });
      });
  });
});

const markupCard = (d, selected) => html`
  <button type="button" class="close">×</button>
  <h1>
    ${(speciesData[d.species_id] || { name: d.species_id }).name}
    ${d.heritage ? html` <span title="heritage">🌳</span> ` : '🌱'}
  </h1>
  <div class="common ${selected ? 'expand' : ''}">
    Family name:
    ${d.family
      ? html`
          <b>${d.family}</b>
          <span
            class="circle"
            style="background-color: ${d.familyColor
              ? d.familyColor.hslStr
              : fColorsMap[d.family]}"
          ></span>
        `
      : '-'}
    ${selected
      ? html`
          <br />
          Common name:
          ${d.common_name ||
          (speciesData[d.species_id] || {}).common_name ||
          '-'}
        `
      : ''}
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
  ${selected
    ? html`
        <div class="footer-buttons">
          <a
            href="https://www.google.com/maps/search/?api=1&query=${d.position
              .slice(0, 2)
              .reverse()
              .join(',')}"
            target="_blank"
          >
            <span hidden class="show-m">🗺 Open in</span>
            Google Maps
          </a>
          <a
            href="https://www.nparks.gov.sg/api/FFWApi/RedirectToFloraByMasterId?masterId=${d.species_id}"
            target="_blank"
          >
            🔍 Learn more
          </a>
        </div>
      `
    : ''}
`;
const showTree = (d, selected = false) => {
  render(markupCard(d, selected), $card);
  $card.hidden = false;
  $card.classList.toggle('selected', selected);
};

let highlightedTree;
let selectedTree;
let hideHighlightTree;
$card.onclick = (e) => {
  if (e.target && e.target.tagName.toLowerCase() === 'a') {
    return;
  }
  e.preventDefault();
  e.stopPropagation();
  if (e.target && e.target.classList.contains('close')) {
    $card.hidden = true;
    hideHighlightTree && hideHighlightTree();
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
  let currentFamily = null;
  if (renderingMode === 'low') {
    await mapLoaded;

    map.addSource('trees-source', {
      type: 'vector',
      url: 'mapbox://cheeaun.bptkspgy', // Production
      // url: 'mapbox://cheeaun.dgcdx6zd', // Staging
    });

    const layerStyles = {
      type: {
        paint: {
          'circle-color': [
            'case',
            ['to-boolean', ['get', 'heritage']],
            'aqua',
            'green',
          ],
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            8,
            0.5,
            14,
            ['case', ['to-boolean', ['get', 'heritage']], 3, 1.25],
            20,
            ['case', ['to-boolean', ['get', 'heritage']], 10, 6],
          ],
          'circle-stroke-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            11,
            0,
            14,
            1,
          ],
          'circle-stroke-color': 'rgba(0,0,0,.25)',
        },
      },
      girth: {
        paint: {
          'circle-color': [
            'match',
            ['get', 'girth_size'],
            'L',
            'orangered',
            'M',
            'green',
            'S',
            'limegreen',
            'XS',
            'yellow',
            'slategray',
          ],
          'circle-opacity': [
            'match',
            ['get', 'girth_size'],
            'L',
            1,
            'M',
            0.78,
            'S',
            0.56,
            'XS',
            0.5,
            0.5,
          ],
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            10,
            0.5,
            20,
            5,
          ],
        },
      },
      age: {
        paint: {
          'circle-color': [
            'interpolate',
            ['linear'],
            ['to-number', ['get', 'age'], 0],
            0,
            'slategray',
            0.001,
            'yellow',
            10,
            'orange',
            20,
            'lime',
            30,
            'orangered',
            100,
            'magenta',
          ],
          'circle-opacity': [
            'interpolate',
            ['linear'],
            ['to-number', ['get', 'age'], 0],
            0,
            0.25,
            1,
            0.5,
            10,
            0.6,
            20,
            0.78,
            30,
            1,
          ],
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            10,
            [
              'case',
              ['>', ['to-number', ['get', 'age']], 30],
              ['max', 0.5, ['min', 3, ['to-number', ['get', 'age']]]],
              0.5,
            ],
            20,
            5,
          ],
        },
      },
      family: {
        paint: {
          'circle-color': ['match', ['to-string', ['get', 'family']]].concat(
            fColors,
          ),
          'circle-opacity': () => [
            'case',
            ['all', !!currentFamily, ['!=', ['get', 'family'], currentFamily]],
            16 / 256,
            ['to-boolean', ['get', 'family']],
            1,
            0.5,
          ],
          'circle-radius': () => [
            'interpolate',
            ['linear'],
            ['zoom'],
            10,
            [
              'case',
              [
                'all',
                !!currentFamily,
                ['==', ['get', 'family'], currentFamily],
              ],
              2,
              0.5,
            ],
            20,
            5,
          ],
        },
      },
    };

    map.addLayer(
      {
        id: 'trees',
        type: 'circle',
        source: 'trees-source',
        'source-layer': 'trees',
        layout: {
          visibility: 'none',
        },
      },
      labelLayerId,
    );

    map.addSource('highlight-tree', {
      type: 'geojson',
      tolerance: 10,
      buffer: 0,
      data: {
        type: 'Feature',
      },
    });
    map.addLayer({
      id: 'highlight-tree',
      type: 'circle',
      source: 'highlight-tree',
      layout: {
        visibility: 'none',
      },
      paint: {
        'circle-color': [
          'interpolate',
          ['linear'],
          ['zoom'],
          0,
          'rgba(255, 255, 255, .5)',
          20,
          'rgba(255, 255, 255, .1)',
        ],
        'circle-stroke-width': 3,
        'circle-stroke-color': 'dodgerblue',
        'circle-radius': [
          'interpolate',
          ['linear'],
          ['zoom'],
          0,
          5,
          14,
          8,
          24,
          16,
        ],
      },
    });
    const highlightTreeSource = map.getSource('highlight-tree');
    function showHighlightTree(coordinates) {
      map.setLayoutProperty('highlight-tree', 'visibility', 'visible');
      highlightTreeSource.setData({
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Point',
          coordinates,
        },
      });
    }
    hideHighlightTree = () => {
      map.setLayoutProperty('highlight-tree', 'visibility', 'none');
    };

    window.onhashchange = function () {
      const hash = decodeURIComponent(location.hash.slice(1));
      let filters = hash.trim().split('/');
      const filter = filters[0] || 'type';
      const filter2 = filters[1] || null;
      currentFamily = filter === 'family' ? filter2 : null;
      console.log({ filters });
      let styles = layerStyles[filter];
      if (!styles) {
        filter = 'type';
        styles = layerStyles.type;
      }
      const { paint } = styles;
      for (let name in paint) {
        map.setPaintProperty(
          'trees',
          name,
          typeof paint[name] === 'function' ? paint[name]() : paint[name],
        );
      }
      map.setLayoutProperty('trees', 'visibility', 'visible');
      const links = document.querySelectorAll('#layers a');
      for (let i = 0; i < links.length; i++) {
        const link = links[i];
        link.classList.toggle(
          'selected',
          link.innerText.toLowerCase() == filter ||
            link.innerText.trim() == currentFamily,
        );
      }
      const legends = document.querySelectorAll('#layers .legend');
      for (let i = 0; i < legends.length; i++) {
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
        const distance = distancePoints(
          point.x,
          point.y,
          treePoint.x,
          treePoint.y,
        );
        if (distance > 30) {
          // If cursor click is far away from selected tree,
          // reset everything
          selectedTree = highlightedTree = null;
          $card.hidden = true;
          hideHighlightTree();
        }
      } else {
        let feature;
        let features = map.queryRenderedFeatures(point, { layers: ['trees'] });
        if (features.length) {
          feature = features[0];
        } else {
          const { x, y } = point;
          features = map.queryRenderedFeatures(
            [
              [x - pointRange, y - pointRange],
              [x + pointRange, y + pointRange],
            ],
            { layers: ['trees'] },
          );
          let shortestDistance = Infinity;
          features.forEach((f) => {
            const { coordinates } = f.geometry;
            const distance = distancePoints(
              lngLat.lng,
              lngLat.lat,
              coordinates[0],
              coordinates[1],
            );
            if (distance < shortestDistance) {
              shortestDistance = distance;
              feature = f;
            }
          });
        }
        // console.log(e, features);
        if (feature) {
          const { properties } = feature;
          const position = (properties.position = properties.position
            .split(',')
            .map(Number));
          highlightedTree = properties;
          showTree(highlightedTree);
          showHighlightTree(position);
        } else {
          highlightedTree = null;
          $card.hidden = true;
          hideHighlightTree();
        }
      }
      return true;
    });

    map.on('dragstart', () => {
      if (selectedTree) return;
      if ($card.hidden) return;
      $card.hidden = true;
      hideHighlightTree();
      return true;
    });

    class Link3DControl {
      onAdd(map) {
        this._map = map;
        const container = document.createElement('a');
        container.className = 'mapboxgl-ctrl mapboxgl-ctrl-group';
        container.innerHTML = `
          <button class="mapboxgl-ctrl-icon mapboxgl-ctrl-custom-pitch" type="button">
            <span>🌳</span>
          </button>
        `;
        container.href = '/3d/';
        container.target = '_blank';
        container.style.textDecoration = 'none';
        this._container = container;
        return this._container;
      }
    }
    map.addControl(new Link3DControl(), 'top-right');
  } else {
    const {
      MapboxLayer,
      AmbientLight,
      SunLight,
      LightingEffect,
      ScatterplotLayer,
      // SolidPolygonLayer,
      SimpleMeshLayer,
      SphereGeometry,
      TruncatedConeGeometry,
      polyline,
      KDBush,
      geokdbush,
      // circle,
      throttle,
    } = await import('./hq.bundle');

    const highlightPoint = {};
    const highlightTreeLayer = new MapboxLayer({
      visible: false,
      id: 'highlight-tree',
      type: ScatterplotLayer,
      opacity: 1,
      radiusMinPixels: 10,
      getRadius: 3,
      getFillColor: [26, 128, 227, 50],
      stroked: true,
      lineWidthUnits: 'pixels',
      getLineWidth: 3,
      getLineColor: [26, 128, 227, 255],
      parameters: {
        depthTest: false,
      },
    });
    function showHighlightTree(coordinates) {
      highlightPoint.position = coordinates;
      highlightTreeLayer.setProps({
        visible: true,
        data: [highlightPoint],
      });
    }
    hideHighlightTree = () => {
      highlightTreeLayer.setProps({
        visible: false,
      });
    };

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
        container.onclick = function () {
          const pitch = map.getPitch();
          const zoom = map.getZoom();
          let nextPitch = 0;
          if (pitch <= 5) nextPitch = 80;
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
      };
      onRemove() {
        this._container.parentNode.removeChild(this._container);
        this._map.off('pitchend', this.onPitch);
        this._map = undefined;
      }
    }
    map.addControl(new PitchControl(), 'top-right');

    document.getElementById('map').classList.remove('loaded');

    const fetchCSV = new Promise((resolve, reject) => {
      console.time('csv download');
      Papa.parse(DATA_API_ROOT + 'trees-no-coords.csv.txt', {
        download: true,
        header: true,
        fastMode: true,
        worker: true,
        complete: (results) => {
          console.timeEnd('csv download');
          resolve(results.data);
        },
        error: (e) => {
          reject(e);
        },
      });
    });

    const fetchLines = fetch(DATA_API_ROOT + 'trees.line.txt')
      .then((res) => res.text())
      .then((text) => {
        const coords = polyline.decode(text);
        return coords;
      });

    const fetchHeritage = fetch(DATA_API_ROOT + 'heritage-trees.json').then(
      (res) => res.json(),
    );

    const fetchTrees = Promise.all([
      fetchCSV,
      fetchLines,
      fetchHeritage,
      familiesSpeciesFetch,
    ]).then(([props, coords, heritageList]) => {
      // console.log({ props, coords });
      const metadata = {};
      const data = props.map((p, i) => {
        const {
          id,
          tree_id,
          species_id,
          girth,
          girth_size,
          height,
          height_est,
          age,
        } = p;
        // const names = speciesData[species_id] || {};
        const family = speciesFamily[species_id] || null;
        const heritage = heritageList.includes(id);
        const elevation = heritage ? 0.4 : age > 30 ? 0.3 : family ? 0.2 : 0.1;
        const position = coords[i].concat(elevation);
        metadata[id] = {
          tree_id,
          species_id,
          girth,
          height,
          // name: names.name || '',
          // common_name: names.common_name || '',
          family,
        };
        return {
          id,
          position,
          // all properties needed for rendering
          girth,
          girth_size,
          height_est: +height_est,
          age: +age,
          heritage,
          family,
          familyColor: fColorsMap[family] || null,
        };
      });

      return [data, metadata];
    });

    const treesLayer = new MapboxLayer({
      id: 'trees',
      type: ScatterplotLayer,
      opacity: 1,
      radiusMinPixels: 0.2,
      radiusMaxPixels: 5,
      lineWidthUnits: 'pixels',
      getLineWidth: 1,
      getLineColor: [0, 0, 0, 200],
      // parameters: {
      //   depthTest: false,
      // },
    });

    map.on('zoom', () => {
      const zoom = map.getZoom();
      treesLayer.setProps({
        stroked: zoom >= 16,
      });
    });

    const layerStyles = {
      type: {
        getRadius: (d) => (d.heritage ? 100 : 3),
        getFillColor: (d) => {
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
        getRadius: (d) => (d.age > 30 ? Math.max(3, d.age) : 3),
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
        getRadius: (d) =>
          currentFamily && d.family === currentFamily ? 100 : 3,
        getFillColor: ({ family, familyColor }) => {
          if (currentFamily && family !== currentFamily) {
            return colorName2RGB('slategray').concat(16);
          }
          return familyColor
            ? familyColor.rgbArr
            : colorName2RGB('slategray').concat(128);
        },
      },
    };

    const treesTrunkLayer = (window.treesTrunkLayer = new MapboxLayer({
      visible: false,
      id: 'trees-trunk',
      type: SimpleMeshLayer,
      mesh: new TruncatedConeGeometry({
        topRadius: 0.5,
        bottomRadius: 1.2,
      }),
      getColor: [67, 39, 21],
      getOrientation: [0, 0, 90],
      getTranslation: (d) => [0, 0, (d.height_est * 0.75) / 2],
      getScale: (d) => {
        const girth = parseFloat(
          (d.girth || '0.5').match(/[\d.]+[^\d.]?$/)[0],
          10,
        );
        const girthScale = girth / 1.5;
        return [girthScale, d.height_est * 0.75, girthScale];
      },
    }));

    // const trees3DLayer = new MapboxLayer({
    //   visible: false,
    //   id: 'trees-3d',
    //   type: SolidPolygonLayer,
    //   getFillColor: (d) =>
    //     d.crown
    //       ? colorName2RGB('green').concat(100)
    //       : colorName2RGB('saddlebrown').concat(128),
    //   extruded: true,
    //   getElevation: (d) => d.elevation,
    // });

    const treesCrownLayer = new MapboxLayer({
      visible: false,
      id: 'trees-crown',
      type: SimpleMeshLayer,
      texture: require('./assets/leaves.png'),
      mesh: new SphereGeometry(),
      data: [],
      getColor: colorName2RGB('green').concat(100),
      getTranslation: (d) => [0, 0, d.height_est * 0.75],
      getScale: (d) => {
        const scale = d.height_est * 0.5;
        return [scale * 0.8, scale * 0.8, scale * 0.9];
      },
    });

    // const tree3DCache = new Map();
    // const tree3Dify = (id, d) => {
    //   if (tree3DCache.has(id)) return tree3DCache.get(id);
    //   const { height_est: height, position } = d;
    //   const girth = parseFloat(d.girth.match(/[\d.]+[^\d.]?$/)[0], 10);
    //   const steps = 6 + (girth - 0.5) * 2; // girth: from 0.5 to 1.5
    //   const trunkRadius = (girth / Math.PI) * 2;
    //   const trunkPolygon = circle(position, trunkRadius / 1000, { steps })
    //     .geometry.coordinates;
    //   const trunk = {
    //     polygon: trunkPolygon,
    //     elevation: height * 0.75, // let the trunk "goes into" the crown a bit
    //   };
    //   // const crownRadius = height * .4;
    //   // const crownPolygon = circle(position, crownRadius/1000, { steps: steps * 2 }).geometry.coordinates[0];
    //   // const crown = {
    //   //   crown: true,
    //   //   polygon: crownPolygon.map(c => c.concat(height * .5)),
    //   //   elevation: height * .5,
    //   // };
    //   // const polygons = [trunk, crown];
    //   const polygons = [trunk];
    //   tree3DCache.set(id, polygons);
    //   return polygons;
    // };
    // const trees3Dify = (data, metadata) => {
    //   const finalData = [];
    //   data.forEach((d) => {
    //     finalData.push(...tree3Dify(d.id, { ...d, ...metadata[d.id] }));
    //   });
    //   return finalData;
    // };

    await mapLoaded;

    map.addLayer({
      id: 'sky',
      type: 'sky',
      paint: {
        'sky-type': 'gradient',
        'sky-gradient': [
          'interpolate',
          ['linear'],
          ['sky-radial-progress'],
          0.8,
          '#040613',
          1,
          '#16326a',
        ],
      },
    });

    map.addLayer(highlightTreeLayer);

    const [data, metadata] = await fetchTrees;

    treesLayer.setProps({ data });
    map.addLayer(treesLayer, labelLayerId);

    document.getElementById('total-trees').innerHTML = data
      .filter((d) => !d.heritage)
      .length.toLocaleString();
    document.getElementById('total-heritage').innerHTML = data
      .filter((d) => d.heritage)
      .length.toLocaleString();

    window.onhashchange = function () {
      const hash = decodeURIComponent(location.hash.slice(1));
      let filters = hash.trim().split('/');
      const filter = filters[0] || 'type';
      const filter2 = filters[1] || null;
      currentFamily = filter === 'family' ? filter2 : null;
      let styles = layerStyles[filter];
      if (!styles) {
        filter = 'type';
        styles = layerStyles.type;
      }
      treesLayer.setProps({
        ...styles,
        updateTriggers: {
          getRadius: hash,
          getFillColor: hash,
        },
      });
      const links = document.querySelectorAll('#layers a');
      for (let i = 0; i < links.length; i++) {
        const link = links[i];
        link.classList.toggle(
          'selected',
          link.innerText.toLowerCase() == filter ||
            link.innerText.trim() == currentFamily,
        );
      }
      const legends = document.querySelectorAll('#layers .legend');
      for (let i = 0; i < legends.length; i++) {
        const legend = legends[i];
        legend.classList.toggle('selected', legend.classList.contains(filter));
      }
    };
    window.onhashchange();

    const index = new KDBush(
      data,
      (p) => p.position[0],
      (p) => p.position[1],
    );
    const data3D = data.filter((d) => !!d.girth_size && !!d.height_est);
    const index3D = new KDBush(
      data3D,
      (p) => p.position[0],
      (p) => p.position[1],
    );

    const throttledDrag = throttle(() => {
      if (selectedTree) return;
      if ($card.hidden) return;
      $card.hidden = true;
      hideHighlightTree();
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
    const radiusMin = 0.1;
    const radiusRange = 0.01 - radiusMin;
    const getRadiusByZoom = (zoom) =>
      ((zoom - zoomMin) * radiusRange) / zoomRange + radiusMin;
    const getNearestTree = (point) => {
      const zoom = map.getZoom();
      const radius = zoom <= zoomMin ? 0.1 : getRadiusByZoom(zoom);
      const nearestPoints = geokdbush.around(
        isTree3DMode() ? index3D : index,
        point.lng,
        point.lat,
        1,
        radius,
      );
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
          showHighlightTree(highlightedTree.position);
        }
      });
    });

    map.on('click', (e) => {
      if (selectedTree) {
        const { point } = e;
        const treePoint = map.project(selectedTree.position);
        const distance = distancePoints(
          point.x,
          point.y,
          treePoint.x,
          treePoint.y,
        );
        if (distance > 30) {
          // If cursor click is far away from selected tree,
          // reset everything
          selectedTree = highlightedTree = null;
          $card.hidden = true;
          hideHighlightTree();
        }
      } else {
        const point = e.lngLat;
        highlightedTree = getNearestTree(point);
        if (highlightedTree) {
          if (isTouch) {
            showTree(highlightedTree);
            showHighlightTree(highlightedTree.position);
          } else {
            selectedTree = highlightedTree;
            showTree(selectedTree, true);
            flyToPosition(selectedTree.position);
          }
        } else {
          $card.hidden = true;
          hideHighlightTree();
        }
      }
      return true;
    });

    // map.addLayer(trees3DLayer, labelLayerId);
    // map.setLayerZoomRange('trees-3d', 16, 20.5);
    map.addLayer(treesTrunkLayer, labelLayerId);
    map.setLayerZoomRange('trees-trunk', 16, 20.5);
    map.addLayer(treesCrownLayer, labelLayerId);
    map.setLayerZoomRange('trees-crown', 16, 20.5);

    // Modified from https://observablehq.com/@mourner/sun-position-in-900-bytes
    const getSunAzimuth = (date, lng, lat) => {
      const { sin, cos, asin, atan2, PI } = Math,
        r = PI / 180,
        t = date / 315576e7 - 0.3,
        m = r * (357.52911 + t * (35999.05029 - t * 1537e-7)),
        c = cos(r * (125.04 - 1934.136 * t)),
        l =
          r *
            (280.46646 +
              t * (36000.76983 + t * 3032e-7) +
              (1.914602 - t * (4817e-6 - t * 14e-6)) * sin(m) -
              569e-5 -
              478e-5 * c) +
          (0.019993 - 101e-6 * t) * sin(2 * m) +
          289e-6 * sin(3 * m),
        e =
          (r * (84381.448 - t * (46.815 - t * (59e-5 + 1813e-6 * t)))) / 3600 +
          r * 256e-5 * c,
        sl = sin(l),
        cr = cos(r * lat),
        sr = sin(r * lat),
        d = asin(sin(e) * sl),
        h =
          r * (280.46061837 + 13184999.8983375 * t + lng) -
          atan2(cos(e) * sl, cos(l)),
        sd = sin(d),
        cd = cos(d),
        ch = cos(h);
      return asin(sr * sd + cr * cd * ch);
    };
    const getPhaseColor = (timestamp) => {
      const altitude = getSunAzimuth(timestamp, 103.8, 1.4); // SG coords
      const d = 180 / Math.PI;
      const h = d * altitude;
      return h < -0.833 ? 'dark' : 'bright';
    };
    const setLighting = (window._setLighting = (timestamp) => {
      const phaseColor = getPhaseColor(timestamp);
      const ambientLight = new AmbientLight({
        intensity: phaseColor === 'dark' ? 1 : 1.5,
      });
      const sunLight = new SunLight({
        timestamp,
        intensity: phaseColor === 'dark' ? 2 : 2,
      });
      const lightingEffect = new LightingEffect({ ambientLight, sunLight });
      treesCrownLayer.deck.setProps({
        effects: [lightingEffect],
      });
    });
    setLighting(+new Date());
    setInterval(() => {
      console.log('Update sun light');
      setLighting(+new Date());
    }, 10 * 60 * 1000); // Update sun light 10 mins

    let renderRAF;
    const renderTrees = throttle(() => {
      if (renderRAF) cancelAnimationFrame(renderRAF);
      renderRAF = requestAnimationFrame(() => {
        if (isTree3DMode()) {
          const bounds = map.getBounds();
          let results = index3D
            .range(...bounds.toArray().flat())
            .map((id) => data3D[id]);
          // Min: 1000, Max: 5000 3D trees
          if (results.length < 1000) {
            const center = map.getCenter();
            results = geokdbush.around(index3D, center.lng, center.lat, 1000);
          } else if (results.length > 5000) {
            const center = map.getCenter();
            results = geokdbush.around(index3D, center.lng, center.lat, 5000);
          }
          console.log(`3D trees count: ${results.length}`);
          // trees3DLayer.setProps({
          //   visible: true,
          //   data: trees3Dify(results, metadata),
          // });
          treesTrunkLayer.setProps({
            visible: true,
            data: results,
          });
          treesCrownLayer.setProps({
            visible: true,
            data: results,
          });
          treesLayer.setProps({
            visible: false,
          });
          if (!selectedTree) hideHighlightTree();
        } else {
          // trees3DLayer.setProps({
          //   visible: false,
          // });
          treesTrunkLayer.setProps({
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
    map.on('moveend', renderTrees);
  }

  map.once('idle', () => {
    document.getElementById('map').classList.add('loaded');
  });
})();

// Touch demo mode
// Renders finger taps on screen for demo purposes
// Supports up to 2 taps, for now
if (/touch\-demo/i.test(location.hash)) {
  const pointers = [];
  pointers[0] = document.createElement('div');
  pointers[0].style =
    'background-color: rgba(220,220,220,.3); border: 10px solid rgba(5,5,5,.3); width: 100px; height: 100px; border-radius: 123123px; margin: -50px 0 0 -50px; position: absolute; left: 0; top: 0; pointer-events: none;';
  pointers[0].hidden = true;
  pointers[1] = pointers[0].cloneNode();
  pointers.forEach((p) => document.body.appendChild(p));

  document.body.ontouchstart =
    document.body.ontouchend =
    document.body.ontouchmove =
    document.body.ontouchcancel =
      (e) => {
        requestAnimationFrame(() => {
          pointers.forEach((p) => (p.hidden = true));
          [...e.touches].forEach((touch, i) => {
            if (i >= 2) return;
            pointers[
              i
            ].style.transform = `translate(${touch.clientX}px, ${touch.clientY}px)`;
            pointers[i].hidden = false;
          });
        });
      };
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(new URL('./sw.js', import.meta.url), {
      type: 'module',
    });
  });
}
