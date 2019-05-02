const fs = require('fs');
const species = JSON.parse(fs.readFileSync('data/species.json'));

const durioSpeciesNames = {};
const durioSpecies = Object.keys(species).filter((id) => {
  const { name } = species[id];
  const isDurio = /^durio\s/i.test(name);
  if (isDurio) {
    console.log(`💥  Found ${name} (${id})`);
    durioSpeciesNames[id] = name;
  }
  return isDurio;
});

const data = JSON.parse(fs.readFileSync('data/trees-everything.geojson'));
data.features = data.features.filter(d => durioSpecies.includes(d.properties.species_id)).map(d => {
  d.properties.species_name = durioSpeciesNames[d.properties.species_id];
  return d;
});
console.log(`Durio species count: ${data.features.length}`);

const filePath = 'data/durian.geojson';
fs.writeFileSync(filePath, JSON.stringify(data, null, ' '));
console.log(`GeoJSON file written: ${filePath}`);
