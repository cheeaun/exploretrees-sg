const fs = require('fs');
const zlib = require('zlib');
const polyline = require('@mapbox/polyline');
const msgpack = require('@ygoe/msgpack');

console.time('Minifying');
const data = JSON.parse(fs.readFileSync('data/trees-everything.geojson'));

const props = data.features.map(f => Object.values(f.properties).map(v => v === null ? '' : v));

const points = data.features.map(f => f.geometry.coordinates);
const line = polyline.encode(points);

const finalData = { props, line };
console.timeEnd('Minifying');

const filePath = `data/trees.min.json`;
fs.writeFileSync(filePath, JSON.stringify(finalData));
console.log(`JSON file written: ${filePath}`);

const mpData = msgpack.serialize(finalData);
const mpFilePath = 'data/trees.min.mp.ico';
fs.writeFileSync(mpFilePath, mpData);
console.log(`MessagePack file written: ${mpFilePath}`);

const gzFilePath = 'data/trees.min.mp.gz';
fs.writeFileSync(gzFilePath, zlib.gzipSync(mpData, { level: 9 }));
console.log(`Gzipped file written: ${gzFilePath}`);
