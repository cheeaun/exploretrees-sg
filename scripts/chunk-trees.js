const fs = require('fs');
const turf = require('@turf/turf');

const trees = {};
fs.readdir('data', (e, files) => {
  const grids = files.filter(file => /^grid\-/i.test(file));

  grids.forEach(grid => {
    console.log(`Reading data/${grid}`);
    const data = JSON.parse(fs.readFileSync(`data/${grid}`));
    data.features.forEach(feature => {
      trees[feature.id] = feature;
    });
  });

  const total = Object.keys(trees).length;

  let index = 0;
  const speciesMap = {};
  const count = {
    flowering: 0,
    heritage: 0,
  };
  const features = [];
  const treeIDs = {};
  const { circle: turfCircle, point } = turf;
  for (id in trees){
    const {
      geometry,
      properties,
    } = trees[id];
    const center = geometry.coordinates;
    const {
      ID: tree_id,
      GRTH_SIZE,
      HEIGHT: height,
      SPCS_CD: species_id,
      SPSC_NM,
      COMMON_NM,
      AGE,
      Type,
      ACTUAL_TREE_TYPE,
      FLOWERING,
    } = properties;

    console.log(`${++index}/${total}\tTree ID: ${id}`);

    const type = (Type || '').toLowerCase();
    const heritage = type === 'heritage' || (ACTUAL_TREE_TYPE || '').toLowerCase() === 'heritage';
    const flowering = type === 'flowering' || (FLOWERING || '').toLowerCase() === 'yes';
    if (heritage) count.heritage++;
    if (flowering) count.flowering++;

    // Get radius from girth, in meters
    // If `null`, assume 0.01 girth
    // const radius = parseFloat((GRTH_SIZE || 0.01)/(Math.PI*2).toFixed(3), 10);

    // if height is `null`, assume 1
    const height_est = parseInt(((height || '1').match(/(\d+)[^\d]*$/) || [,0])[1], 10);
    const girth = GRTH_SIZE && parseFloat(GRTH_SIZE.toFixed(3), 10);
    const age = parseInt(AGE, 10);

    let originalPt = treeIDs[tree_id + ' – ht'] || treeIDs[tree_id.replace(/\s*[^\s]\s*ht\s*$/i, '')];
    if (originalPt){
      // Remove ` - HT`
      originalPt.properties.tree_id = originalPt.properties.tree_id.replace(/\s*[^\s]\s*ht\s*$/i, '');
      originalPt.properties.girth = originalPt.properties.girth || girth;
      originalPt.properties.height = originalPt.properties.height || height;
      originalPt.properties.age = originalPt.properties.age || age;
      originalPt.properties.heritage = true;
    } else {
      const pt = point(center, {
        id,
        tree_id,
        species_id,
        girth,
        // radius,
        height,
        height_est,
        age,
        flowering,
        heritage,
      });
      features.push(pt);
      treeIDs[tree_id.toLowerCase()] = pt;

      if (!speciesMap[species_id]){
        speciesMap[species_id] = {
          name: SPSC_NM,
          common_name: COMMON_NM,
        };
      }
    }

    /*

    const circle = turfCircle(center, radius/1000, {
      steps: 6,
      properties: {
        id,
        name,
        girth,
        height_text: HEIGHT,
        // if height is `null`, assume 1
        height: parseInt(((HEIGHT || '1').match(/(\d+)[^\d]*$/) || [,0])[1], 10),
        flowering: FLOWERING === 'YES',
        heritage: GIS_Layer === 'HERITAGE_TREES',
      },
    });
    features.add(circle);
    */
  }

  console.log(`Done generating. Actual trees count: ${features.length}`);

  const collection = turf.featureCollection(features);
  const filePath = `data/trees-everything.geojson`;
  fs.writeFileSync(filePath, JSON.stringify(collection));
  console.log(`GeoJSON file written: ${filePath}`);

  fs.writeFileSync('data/species.json', JSON.stringify(speciesMap));
  console.log(`Species count: ${Object.keys(speciesMap).length}`);

  console.log(JSON.stringify(count));
});