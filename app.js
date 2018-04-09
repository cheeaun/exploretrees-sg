var GOOGLEMAPS_KEY = 'AIzaSyAzSGBaAvvbIN_SGI7U0HgGo9IKZS5EbcY';

var $modal = document.getElementById('modal');
var $card = document.getElementById('card');
var $layersButton = document.getElementById('layers-button');
var $layers = document.getElementById('layers');

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

mapboxgl.accessToken = 'pk.eyJ1IjoiY2hlZWF1biIsImEiOiIwMTkyNjRiOWUzOTMyZThkYTE3YjMyMWFiZGU2OTZlNiJ9.XsOEKtyctGiNGNsmVhetYg';
var map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/dark-v9',
  minZoom: 8,
  maxZoom: 20,
  renderWorldCopies: false,
  boxZoom: false,
  pitchWithRotate: false,
  dragRotate: false,
  attributionControl: false, // Attribution is inside Layers modal
});
map.touchZoomRotate.disableRotation();
map.addControl(new mapboxgl.GeolocateControl({
  positionOptions: {
    enableHighAccuracy: true,
  },
  trackUserLocation: true,
}));

var maxBoundsLike = [
  [ 103.6016626883025, 1.233357600011331 ], // sw
  [ 104.0381760444838, 1.473818072475055 ] // ne
];
var maxBounds = mapboxgl.LngLatBounds.convert(maxBoundsLike);
map.fitBounds(maxBounds, { animate: false });

var families = ['Combretaceae','Fabaceae (Leguminosae)','Anacardiaceae','Lythraceae','Melastomataceae','Rubiaceae','Myrtaceae','Apocynaceae','Arecaceae (Palmae)','Pentaphylacaceae','Araucariaceae','Euphorbiaceae','Sapindaceae','Phyllanthaceae','Meliaceae','Thymelaeaceae','Primulaceae','Moraceae','Oxalidaceae','Lecythidaceae','Malvaceae','Calophyllaceae','Annonaceae','Rhizophoraceae','Caricaceae','Casuarinaceae','Sapotaceae','Lauraceae','Verbenaceae','Clusiaceae (Guttiferae)','Polygonaceae','Boraginaceae','Hypericaceae','Dilleniaceae','Ebenaceae','Dipterocarpaceae','Bignoniaceae','Elaeocarpaceae','Erythroxylaceae','Simaroubaceae','Gentianaceae','Flacourtiaceae','Gnetaceae','Myristicaceae','Achariaceae','Aquifoliaceae','Cupressaceae','Knema globularia ','Malpighiaceae','Chrysobalanaceae','Rutaceae','Magnoliaceae','Moringaceae','Tiliaceae','Olacaceae','Pinaceae','Nyctaginaceae','Pittosporaceae','Podocarpaceae','Salicaceae','Araliaceae','Sterculiaceae','Hernandiaceae','Burseraceae','Lamiaceae (Labiatae)'].sort();
var fColors = [], fColorsMap = {};
var familiesCount = families.length;
families.forEach(function(f, i){
  var color = 'hsl(' + (i/familiesCount*300) + ', 100%, 50%)';
  fColors.push(f, color);
  fColorsMap[f] = color;
});
fColors.push('slategray');
document.getElementById('legend-family').innerHTML = Object.keys(fColorsMap).map(function(f, i){
  return '<span class="ib"><span class="circle" style="background-color: ' + fColorsMap[f] + '" title="' + i + '"></span> ' + f + '</span>';
}).join('');

map.on('load', function(){
  var layers = map.getStyle().layers;
  // Find the index of the first symbol layer in the map style
  var labelLayerId;
  for (var i=0; i<layers.length; i++){
    if (layers[i].type === 'symbol' && layers[i].layout['text-field']){
      labelLayerId = layers[i].id;
      break;
    }
  }

  // map.addSource('grid', {
  //   type: 'geojson',
  //   data: 'data/grid.json',
  // });
  // map.addLayer({
  //   id: 'boxes',
  //   type: 'line',
  //   source: 'grid',
  // });

  map.addSource('trees-source', {
    type: 'vector',
      url: 'mapbox://cheeaun.dgcdx6zd',
  });

  var layerStyles = {
    type: {
      paint: {
        'circle-color': [
          'case',
          ['all', ['to-boolean', ['get', 'flowering']], ['to-boolean', ['get', 'heritage']]], 'magenta',
          ['to-boolean', ['get', 'flowering']], 'orangered',
          ['to-boolean', ['get', 'heritage']], 'aqua',
          'limegreen'
        ],
        'circle-opacity': [
          'case',
          ['to-boolean', ['get', 'flowering']], 1,
          ['to-boolean', ['get', 'heritage']], 1,
          .5
        ],
        'circle-radius': [
          'interpolate', ['linear'], ['zoom'],
          8, .75,
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
          'interpolate', ['linear'], ['to-number', ['get', 'girth'], 0],
          0, 'slategray',
          0.001, 'yellow',
          5, 'green',
          15, 'orangered'
        ],
        'circle-opacity': [
          'interpolate', ['linear'], ['to-number', ['get', 'girth'], 0],
          0, .25,
          2, 1
        ],
        'circle-radius': [
          'interpolate', ['linear'], ['zoom'],
          8, .75,
          14, ['min', 8, ['max', 1.25, ['*', ['/', ['zoom'], 10], ['to-number', ['get', 'girth'], 0]]]],
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
          1, 1
        ],
        'circle-radius': [
          'interpolate', ['exponential', 2], ['zoom'],
          8, .75,
          14, ['min', 8, ['max', 2, ['*', 8, ['/', ['to-number', ['get', 'age'], 0], 30]]]],
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
          .25
        ],
        'circle-radius': [
          'interpolate', ['linear'], ['zoom'],
          8, .75,
          14, 1.25,
          18, 5,
        ],
      }
    }
  };

  map.addLayer({
    id: 'trees',
    type: 'circle',
    source: 'trees-source',
    'source-layer': 'trees',
    paint: layerStyles.type.paint,
  }, labelLayerId);

  map.addSource('tree-focus', {
    type: 'geojson',
    data: {
      type: 'Feature',
    },
  });
  map.addLayer({
    id: 'tree-focus',
    type: 'circle',
    source: 'tree-focus',
    layout: {
      visibility: 'none',
    },
    paint: {
      'circle-color': [
        'interpolate', ['linear'], ['zoom'],
        0, 'rgba(255, 255, 255, .5)',
        20, 'rgba(255, 255, 255, .1)'
      ],
      'circle-stroke-width': 3,
      'circle-stroke-color': 'dodgerblue',
      'circle-radius': [
        'interpolate', ['linear'], ['zoom'],
        0, 5,
        14, 8,
        24, 16
      ],
    },
  });

  window.onhashchange = function(){
    var hash = location.hash.slice(1);
    var filter = (hash.match(/^[^/]+/i) || ['type'])[0];
    var styles = layerStyles[filter];
    if (!styles) return;
    var paint = styles.paint;
    for (var name in paint){
      map.setPaintProperty('trees', name, paint[name]);
    };
    var links = document.querySelectorAll('#layers a');
    for (var i=0; i<links.length; i++){
      var link = links[i];
      link.classList.toggle('selected', link.innerText.toLowerCase() == filter);
    }
    var legends = document.querySelectorAll('#layers .legend');
    for (var i=0; i<legends.length; i++){
      var legend = legends[i];
      legend.classList.toggle('selected', legend.classList.contains(filter));
    }
  };
  window.onhashchange();

  fetch('data/species.json').then(function(res){
    return res.json();
  }).then(function(data){
    var mapCanvas = map.getCanvas();
    var treeFocusSource = map.getSource('tree-focus');

    map.on('mouseenter', 'trees', function(e){
      if (map.getZoom() < 14) return;
      mapCanvas.style.cursor = 'pointer';
    });
    map.on('mouseleave', 'trees', function(){
      mapCanvas.style.cursor = '';
    });

    var showOneTree = false;
    function showTree(feature){
      if (!feature) return;
      var coordinates = feature.geometry.coordinates;
      var p = feature.properties;
      var d = data[p.species_id];
      if (!d) return;

      treeFocusSource.setData({
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Point',
          coordinates: coordinates,
        },
      });
      map.setLayoutProperty('tree-focus', 'visibility', 'visible');
      map.setPaintProperty('tree-focus', 'circle-opacity', showOneTree ? 1 : .75);

      requestAnimationFrame(function(){
        var center = coordinates.slice().reverse();
        var satelliteImage = 'https://maps.googleapis.com/maps/api/staticmap?maptype=satellite&center=' + center + '&zoom=18&size=320x120&scale=2&key=' + GOOGLEMAPS_KEY;
        // var streetViewImage = 'https://maps.googleapis.com/maps/api/streetview?size=640x240&pitch=10&fov=120&location=' + center + '&key=' + GOOGLEMAPS_KEY;
        $card.innerHTML = '<button class="close">×</button>'
          + '<h1>'
            + d.name + ' '
            + (!p.flowering && !p.heritage ? '🌱' : '')
            + (p.flowering ? '<span title="flowering">🌸</span>' : '')
            + (p.heritage ? '<span title="heritage">🌳</span>' : '')
          + '</h1>'
          + '<div class="common ' + (showOneTree ? 'expand' : '') + '">'
            + 'Family name: ' + (p.family ? (
              '<b>' + p.family + '</b> <span class="circle" style="background-color: ' + fColorsMap[p.family] + '"></span>'
            ) : '-') + '<br>'
            + 'Common name: ' + (d.common_name || '-')
          + '</div>'
          + (showOneTree ? (
              '<a href="https://www.google.com/maps/search/?api=1&query=' + center + '" target="_blank">'
                + '<span class="img" style="background-image: url(' + satelliteImage + ')"></span>'
              + '</a>'
            ) : '')
          + '<table>'
            + '<thead>'
              + '<tr>'
                + '<th>Tree ID</th>'
                + '<th style="width: 6em">Girth (m)</th>'
                + '<th style="width: 8em">Height (m)</th>'
                + '<th style="width: 4em; text-align: right;">Age (Y)</th>'
              + '</tr>'
            + '</thead>'
            + '<tbody>'
              + '<tr>'
                + '<td>' + p.tree_id + '</td>'
                + '<td>' + ('>' + p.girth || '-') + '</td>'
                + '<td>' + (p.height || '-') + '</td>'
                + '<td style="text-align: right;">' + (p.age || '-') + '</td>'
              + '</tr>'
            + '</tbody>'
          + '</table>'
          + (showOneTree ? '<a class="learn" href="https://florafaunaweb.nparks.gov.sg/Special-Pages/plant-detail.aspx?id=' + p.species_id + '" target="_blank">Learn more <svg viewBox="0 0 576 512" width="12" height="12"><path d="M576 24v127.984c0 21.461-25.96 31.98-40.971 16.971l-35.707-35.709-243.523 243.523c-9.373 9.373-24.568 9.373-33.941 0l-22.627-22.627c-9.373-9.373-9.373-24.569 0-33.941L442.756 76.676l-35.703-35.705C391.982 25.9 402.656 0 424.024 0H552c13.255 0 24 10.745 24 24zM407.029 270.794l-16 16A23.999 23.999 0 0 0 384 303.765V448H64V128h264a24.003 24.003 0 0 0 16.97-7.029l16-16C376.089 89.851 365.381 64 344 64H48C21.49 64 0 85.49 0 112v352c0 26.51 21.49 48 48 48h352c26.51 0 48-21.49 48-48V287.764c0-21.382-25.852-32.09-40.971-16.97z"></path></svg></a>' : '');
        $card.hidden = false;
        $card.classList.toggle('focus', showOneTree);
      });
    };

    function hideTreeFocusMarker(){
      map.setLayoutProperty('tree-focus', 'visibility', 'none');
      map.setPaintProperty('tree-focus', 'circle-opacity', .75);
    }

    function hideTree(){
      $card.hidden = true;
      hideTreeFocusMarker();
    };

    $card.onclick = function(e){
      if (e.target.className.toLowerCase() === 'close'){
        showOneTree = false;
        document.body.classList.remove('modal');
        hideTree();
      } else if (!showOneTree){
        hideTreeFocusMarker();
        flyToTree(currentFeature);
      }
    }

    // https://github.com/mapbox/mapbox-gl-js/issues/5539#issuecomment-340311798
    var currentFeature = null;
    map.on('mousemove', 'trees', function(e){
      if (showOneTree) return;
      var feature = e.features[0];
      if (currentFeature && currentFeature.properties.id === feature.properties.id) return;
      currentFeature = feature;
      if (map.isMoving()) return;
      showTree(feature);
    });

    function flyToTree(feature){
      function afterFly(){
        document.body.style.pointerEvents = '';
        map.off('moveend', afterFly);
        if (map.getZoom() < 17.9) return;
        setTimeout(function(){
          var features = map.queryRenderedFeatures({layers: ['trees']});
          var realFeature = features.filter(function(f){
            return f.properties.id === feature.properties.id;
          })[0];
          showOneTree = true;
          showTree(realFeature);
        }, 500);
      };
      map.on('moveend', afterFly);
      document.body.style.pointerEvents = 'none';
      map.flyTo({
        center: feature.geometry.coordinates,
        zoom: 18,
        offset: [
          0,
          (window.innerHeight < 700 && window.innerWidth < 1000 ? -window.innerHeight/4: 0)
        ],
      });
    }


    map.on('click', 'trees', function(e){
      var feature = e.features[0];
      var zoom = map.getZoom();
      if (zoom < 14){
        map.flyTo({
          center: feature.geometry.coordinates,
          zoom: zoom + 2,
        });
      } else {
        flyToTree(feature);
      }
      hideTreeFocusMarker();
    });

    map.on('click', 'tree-focus', function(e){
      var feature = e.features[0];
      var zoom = map.getZoom();
      if (zoom < 14){
        map.flyTo({
          center: feature.geometry.coordinates,
          zoom: zoom + 2,
        });
      }
      hideTreeFocusMarker();
    });

    map.on('dragstart', function(){
      if (showOneTree) return;
      hideTree();
    });

  });
});