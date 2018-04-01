const fs = require('fs');
const turf = require('@turf/turf');

const data = JSON.parse(fs.readFileSync('data/trees-everything.geojson'));
const speciesInfo = JSON.parse(fs.readFileSync('data/species-info.json'));
const importantFeatures = [];
const otherFeatures = [];
let count = 0;

data.features.forEach(f => {
  const { flowering, heritage, species_id } = f.properties;
  // Family
  f.properties.family = speciesInfo[species_id] && speciesInfo[species_id].Family || null;
  // Split important trees from the others
  if (flowering || heritage){
    count++;
    importantFeatures.push(f);
  } else {
    otherFeatures.push(f);
  }
});

console.log(`Tippecanoe-d features count: ${count}`);

const collectionOther = turf.featureCollection(otherFeatures);
let filePath = `data/trees-other.geojson`;
fs.writeFileSync(filePath, JSON.stringify(collectionOther, null, ' '));
console.log(`GeoJSON file written: ${filePath}`);

const collectionImportant = turf.featureCollection(importantFeatures);
filePath = `data/trees-important.geojson`;
fs.writeFileSync(filePath, JSON.stringify(collectionImportant, null, ' '));
console.log(`GeoJSON file written: ${filePath}`);
