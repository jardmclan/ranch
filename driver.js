//simplify each shape into 3 parts:
//edges, bbox, properties

const shpProcessor = require("./shpProcessor");
const geotiffProcessor = require("./geotiffProcessor");
const raycaster = require("./raycasting");

let shapefile = "test.zip";
let geotiff = "./RA-Monthly_RF_st_1920_08_mm_.tif";

let nodata = "NA";

let shpPromise = shpProcessor.getPolys(shapefile);


let geotiffPromise = geotiffProcessor.getDataFromGeoTIFFFile(geotiff);

let inAreaData = {}


Promise.all([shpPromise, geotiffPromise]).then((values) => {
    let geometries = values[0];
    let raster = values[1];
    //work from center of cells
    console.log(raster.header);
    

    
    
    for(let geometry of geometries) {
        bbox = geometry.bbox;
        cells = getCellsInBounds(raster.header, bbox);
        for(let cell of cells) {
            if(raycaster.isInternal(geometry.geometry, cell.centroid)) {
                inAreaData[cell.index] = raster.data[cell.index];
            }
        }
    }
    
}, (e) => {
    console.error(e);
});

//return array of {centroid: [lng, lat], index: cellIndex} objects
function getCellsInBounds(header, bounds) {

    let cellHeight = raster.header.cellSize === undefined ? raster.header.cellYSize : raster.header.cellSize;
    let cellWidth = raster.header.cellSize === undefined ? raster.header.cellXSize : raster.header.cellSize;

    //lng x, lat y
    let xllCenter = raster.header.xllCorner + cellWidth / 2.0;
    let yllCenter = raster.header.yllCorner + cellHeight / 2.0;

    let offsetXNear = bounds[0] - xllCenter;
    let offsetYNear = bounds[1] - yllCenter;

    let offsetXFar = bounds[2] - xllCenter;
    let offsetYFar = bounds[3] - yllCenter;

    // let boundsWidth = bounds[2] - bounds[0];
    // let boundsHeight = bounds[3] - bounds[1];

    let cellOffsetXNear = offsetXNear / cellWidth;
    let cellOffsetYNear = offsetYNear / cellHeight;

    let cellOffsetXFar = offsetXFar / cellWidth;
    let cellOffsetYFar = offsetYFar / cellHeight;


    let startingCellX = Math.ceil(cellOffsetXNear);
    let startingCellY = Math.ceil(cellOffsetYNear);

    let endingCellX = Math.floor(cellOffsetXFar);
    let endingCellY = Math.floor(cellOffsetYFar);

    // let cellSpanX = boundsWidth / cellWidth;
    // let cellSpanY = boundsHeight / cellHeight;





}

function getCellIndexFromLngLat() {

}
