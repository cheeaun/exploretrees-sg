const fs = require('fs');
const got = require('got');
const SVY21 = require('./util.svy21');
const svy21 = new SVY21();

const round5 = (n) => Number(Number(n).toFixed(5));

(async() => {
  const { body } = await got('https://www.nparks.gov.sg/clientservice/greenmap.asmx/GetFeatures', { json: true });

  const pois = [];
  const types = new Set();
  Object.values(body).forEach((regions) => {
    Object.values(regions).forEach(locations => {
      locations.forEach(poi => {
        const type = poi.symbol.trim().replace(/s?\.[^.]+$/, '');
        // Ignore heritage trees for now
        // There's already existing htrees data from other scripts
        if (type === 'htree') return;
        types.add(type);
        const pos = svy21.computeLatLon(...poi.XY.split(',').reverse());
        pois.push({
          name: poi.name.trim(),
          type,
          position: [round5(pos.lon), round5(pos.lat)],
        });
      });
    });
  });

  const fileName = 'data/pois.json';
  fs.writeFileSync(fileName, JSON.stringify(pois, null, '\t'));
  console.log(`Generated ${fileName}`);
  console.log('Types', types);
})();