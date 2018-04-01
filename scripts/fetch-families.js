const fs = require('fs');
const PQueue = require('p-queue');
const queue = new PQueue({ concurrency: 1 });
const got = require('got');

const species = JSON.parse(fs.readFileSync('data/species.json'));
const speciesInfo = {};
const familiesSpecies = {};

Object.keys(species).map((id) => {
  if (!id || id == 'null') return;
  queue.add(() => got.post('https://www1.nparks.gov.sg/ptmapi/TreeInformationApi/GetTreeInformation', {
    json: true,
    body: {
      TreeId: 1, // Any ID will work
      MasterId: id,
    },
  }).then(({ body }) => {
    console.log(`Fetched ${id}: ${species[id].name}`);
    const data = body[0];
    speciesInfo[id] = data;

    const { Family } = data;
    if (!Family) return;
    if (!familiesSpecies[Family]) familiesSpecies[Family] = [];
    familiesSpecies[Family].push(id);
  }));
});

queue.onEmpty().then(() => {
  let filePath = 'data/species-info.json';
  fs.writeFileSync(filePath, JSON.stringify(speciesInfo));
  console.log(`JSON file written: ${filePath}`);

  filePath = 'data/families-species.json';
  fs.writeFileSync(filePath, JSON.stringify(familiesSpecies));
  console.log(`JSON file written: ${filePath}`);

  const families = Object.keys(familiesSpecies);
  console.log(`Total families: ${families.length}`);
  filePath = 'data/families.json';
  fs.writeFileSync(filePath, JSON.stringify(families));
  console.log(`JSON file written: ${filePath}`);
});

