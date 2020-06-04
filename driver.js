//simplify each shape into 3 parts:
//edges, bbox, properties

const shpProcessor = require("./shpProcessor");
const geotiffProcessor = require("./geotiffProcessor");

let shapefile = "test.zip";
let geotiff = "./RA-Monthly_RF_st_1920_08_mm_.tif";

shpPromise = shpProcessor.getPolys(shapefile)


geotiffPromise = geotiffProcessor.getDataFromGeoTIFFFile(geotiff)


Promise.all([shpPromise, geotiffPromise]).then((values) => {
    geometry = values[0];
    raster = values[1];
    //work from center of cells
}, (e) => {
    console.error(e);
});
