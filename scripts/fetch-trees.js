const fs = require('fs');
const turf = require('@turf/turf');
const got = require('got');

const bbox = [103.6016626883025, 1.233357600011331 ,104.0381760444838, 1.473818072475055];
const squareGrid = turf.squareGrid(bbox, 5);
console.log('Grid squares count:', squareGrid.features.length);
fs.writeFileSync('data/grid.json', JSON.stringify(squareGrid, null, '\t'));

const bboxes = squareGrid.features.map((feature) => {
  const [a, b, c, d] = feature.geometry.coordinates[0];
  return [...a, ...c];
});

const box = bboxes[0];

bboxes.forEach(async (box, i) => {
  const url = 'https://imaven.nparks.gov.sg/arcgis/rest/services/maven/PTMap/FeatureServer/2/query';
  const { body } = await got(url, {
    json: true,
    query: {
      returnGeometry: true,
      where: '1=1',
      outSr: 4326,
      outFields: '*',
      inSr: 4326,
      geometry: JSON.stringify({
        xmin: box[0],
        ymin: box[1],
        xmax: box[2],
        ymax: box[3],
        spatialReference: {
          wkid: 4326,
        },
      }),
      // geometry: '{"xmin":103.8262939453125,"ymin":1.3408962578522488,"xmax":103.82698059082031,"ymax":1.3415827152334823,"spatialReference":{"wkid":4326}}',
      geometryType: 'esriGeometryEnvelope',
      spatialRel: 'esriSpatialRelIntersects',
      geometryPrecision: 6,
      f: 'geojson',
    },
  });

  const featuresLength = body.features.length;
  console.log(`Box ${i}:`, featuresLength);
  if (featuresLength){
    fs.writeFileSync(`data/grid-${i}.json`, JSON.stringify(body, null, '\t'));
  }
});