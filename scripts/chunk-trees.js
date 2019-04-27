const fs = require('fs');
const turf = require('@turf/turf');
const { circle: turfCircle, point } = turf;

const girthSize = (girth) => {
  switch (girth) {
    case '0.0 - 0.5': return 'XS';
    case '0.6 - 1.0': return 'S';
    case '1.1 - 1.5': return 'M';
    case '> 1.5': return 'L';
    default: return null;
  }
};

// Merge Tree t2 to Tree t1
const treeMerge = (t1, t2) => {
  // Prioritize heritage and flowering ones
  if (t2.heritage || t2.flowering) {
    t1.id = t2.id;
    t1.tree_id = t2.tree_id;
    t1.species_id = t2.species_id;
    if (t2.girth) {
      t1.girth = t2.girth;
      t1.girth_size = t2.girth_size;
    }
  }
  // Prioritize taller ones
  if (t2.height_est && t2.height_est > t1.height_est) {
    t1.height_est = t2.height_est;
    t1.height = t2.height;
  }
  // Prioritize older ones
  if (t2.age && t2.age > t1.age) {
    t1.age = t2.age;
  }
  t1.flowering = t2.flowering || t1.flowering;
  t1.heritage = t2.heritage || t1.heritage;
  return t1;
};

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
  const treeCoords = {};

  for (id in trees){
    const {
      geometry,
      properties,
    } = trees[id];
    const center = geometry.coordinates;
    const {
      Girth,
      HEIGHT: height,
      SPCS_CD: species_id,
      SPSC_NM,
      COMMON_NM,
      AGE,
      Type,
      ACTUAL_TREE_TYPE,
      FLOWERING,
      Public_treeid: tree_id,
    } = properties;

    // console.log(`${++index}/${total}\tTree ID: ${id}`);

    const type = (Type || '').toLowerCase();
    const heritage = type === 'heritage' || (ACTUAL_TREE_TYPE || '').toLowerCase() === 'heritage';
    const flowering = type === 'flowering' || (FLOWERING || '').toLowerCase() === 'yes';
    if (heritage) count.heritage++;
    if (flowering) count.flowering++;

    // if height is `null`, assume 1
    const height_est = parseInt(((height || '0').match(/(\d+)[^\d]*$/) || [,0])[1], 10);
    const girth_size = girthSize(Girth);
    const age = AGE ? parseInt(AGE, 10) : null;

    let tree = {
      id,
      tree_id,
      species_id,
      girth: Girth,
      girth_size,
      height,
      height_est,
      age,
      flowering,
      heritage,
    };

    if (treeIDs[tree_id]) {
      console.warn(`🐑  Tree ${tree_id} already exists.`);
      tree = treeMerge(treeIDs[tree_id], tree);
      continue;
    } else {
      treeIDs[tree_id] = tree;
    }

    const centerStr = center.toString();
    if (treeCoords[centerStr]) {
      console.warn(`📍  Tree ${tree_id} already exists with EXACT SAME location.`);
      tree = treeMerge(treeCoords[centerStr], tree);
      continue;
    } else {
      treeCoords[centerStr] = tree;
    }

    features.push(point(center, tree));

    if (!speciesMap[species_id] && species_id){
      speciesMap[species_id] = {
        name: SPSC_NM,
        common_name: COMMON_NM,
      };
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
  fs.writeFileSync(filePath, JSON.stringify(collection, null, '\t'));
  console.log(`GeoJSON file written: ${filePath}`);

  fs.writeFileSync('data/species.json', JSON.stringify(speciesMap, null, '\t'));
  console.log(`Species count: ${Object.keys(speciesMap).length}`);

  console.log(JSON.stringify(count));
});