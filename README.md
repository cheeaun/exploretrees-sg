ExploreTrees.SG - Explore Trees in Singapore
===

On [17 March 2018](https://twitter.com/nparksbuzz/status/974857306734120960), [National Parks Board](https://www.nparks.gov.sg/) launched an all-new web site called [Trees.sg](http://trees.sg). On the next day, I started [my journey in getting the data](https://twitter.com/cheeaun/status/975272277926330369) [and visualizing it to my heart's content](https://twitter.com/cheeaun/status/976657582105362432).

![Screenshot of ExploreTrees.SG](screenshots/trees-screenshot.gif)

![Screenshots of 3D trees](screenshots/trees-3d-screenshot.jpg)

This is a personal side project to fuel my curiosity on these factors:

- Plotting more than 500,000 data points on [Mapbox GL JS](https://www.mapbox.com/mapbox-gl-js/).
- Data visualization of all tree data, in 4 criterias:
  - **Type**; Tree, Flowering, Heritage
  - **Girth** (meters)
  - **Age** (years)
  - **Family** (to group up the large number of species)
- Discovery of trees.
  - Prominent/important trees stand out more by having larger radii.
  - Super fast info card by just hovering on the tree markers (for devices with a mouse).

👉👉👉 **Read more about it**: [Building ExploreTrees.SG](https://cheeaun.com/blog/2018/04/building-exploretrees-sg/). 👈👈👈

Technicalities
---

All scripts for fetching and cleaning up data are in the `scripts` folder. [Node.js](https://nodejs.org/en/) and [`npm`](https://www.npmjs.com/) are required to run them.

Begin by installing all the essential dependencies.

> npm install

Scripts provided (should be executed in order):

- Data collection:
  - `npm run trees` - fetch all raw tree data from [Trees.SG](http://trees.sg) (NOT included in this repository) and generate `grid-*.json` files in the `data` folder.
  - `npm run family` - fetch family categories for the trees, and generate `species-info.json`, `families-species.json` and `families.json`.
  - `npm run pois` - fetch Points of Interets, mainly the parks, community gardens, heritage roads and skyrise greeneries.
- Data manipulation:
  - `npm run chunk` - read all the raw data and generate a cleaner `trees-everything.geojson`  (NOT included in this repository).
  - `npm run minify` - generate minified/compressed data from `trees-everything.geojson` into `trees.min.json`, `trees.min.mp.ico` and `trees.min.mp.gz` (not included in this repos).
    - `.ico` file extension is used to mask the `.mp` extension which is actually a [MessagePack](https://msgpack.org/) file. It's NOT an icon file and the `.ico` file extension is meant to fool the server to apply Gzip/Brotli compression on it, since there's no official MIME type for MessagePack. GitHub Pages serves `.mp` as uncompressed `application/octet-stream`. Cloudflare [compresses](https://support.cloudflare.com/hc/en-us/articles/200168396-What-will-Cloudflare-compress-) `image/x-icon`.
    - `.gz` file is not used but only to show how large the file size is after gzipped.
  - `npm run pre-tiles` - generate the needed `GeoJSON` files before converting to `MBTiles`  (NOT included in this repository).
  - `npm run tiles` - generate the ultimate final `trees.mbtiles` file  (NOT included in this repository), to be uploaded on [Mapbox Studio](https://www.mapbox.com/mapbox-studio/) as a [tileset](https://www.mapbox.com/help/define-tileset/).
- Dev server:
  - `npm start` - start a local server for the site.
- Production build:
  - `npm run build` - build the assets in `dist` folder for deployment.

Copyright & license
---

- Data from [Trees.sg](http://trees.sg) © [National Parks Board](http://www.nparks.gov.sg/)
- Map © [Mapbox](https://www.mapbox.com/about/maps/) © [MapTiler](https://www.maptiler.com/copyright/) © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright)
- SVG icons from [Font Awesome](https://fontawesome.com/license)
- Code licensed under [MIT](https://cheeaun.mit-license.org/)

Similar visualizations/effort
---

- [New York City Street Trees by Species](http://jillhubley.com/blog/nyctrees)
- [Treepedia: Singapore](http://senseable.mit.edu/treepedia/cities/singapore)
- [An Interactive Visualization of NYC Street Trees](https://www.cloudred.com/labprojects/nyctrees/)
- [New York City Street Trees](https://belindakanpetch.shinyapps.io/StreetTrees/)
- [Atlanta's Tree Canopy Data Visualization](http://www.beckyscheel.com/atl-tree-dataviz/)
- [Trees of Madison](http://acouch.github.io/madison-trees/)
- [Melbourne Urban Forest Visual](http://melbourneurbanforestvisual.com.au/)
- [OpenTrees.org](http://www.opentrees.org/)
- [San Francisco Urban Forest Map](https://urbanforestmap.org/)
- [OpenTreeMap](https://www.opentreemap.org/)