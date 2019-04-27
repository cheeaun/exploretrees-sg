const fs = require('fs');
const turf = require('@turf/turf');
const got = require('got');

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

const bbox = [103.601, 1.232 ,104.1, 1.475];
const squareGrid = turf.squareGrid(bbox, 1.5); // 1.5km
console.log('Grid squares count:', squareGrid.features.length);
fs.writeFileSync('data/grid.json', JSON.stringify(squareGrid, null, '\t'));

const bboxes = squareGrid.features.map((feature) => {
  const [a, b, c, d] = feature.geometry.coordinates[0];
  return [...a, ...c];
});

(async() => {

for (let i=0, l=bboxes.length; i<l; i++) {
  const fileName = `data/grid-${i}.json`;
  try {
    const exists = fs.statSync(fileName);
    if (exists) continue;
  } catch (e) {}

  const box = bboxes[i];
  const url = 'https://imaven.nparks.gov.sg/arcgis/rest/services/maven/Hashing_UAT/FeatureServer/0/query';
  const query = {
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
  };
  console.log(`↗️  ${url}?${(new URLSearchParams(query)).toString()}`);

  let body;
  try {
    const res = await got(url, {
      json: true,
      query,
    });
    body = res.body;
    if (body.exceededTransferLimit) {
      console.error('Error exceededTransferLimit', body.features.length);
      return;
    }
  } catch (e) {
    console.error(e);
    return;
  }

  const featuresLength = body.features.length;
  console.log(`Box ${i}/${l}:`, featuresLength);
  if (featuresLength){
    fs.writeFileSync(fileName, JSON.stringify(body, null, '\t'));
    console.log(`Generated ${fileName}`);
  }

  await delay(300);
}

})();