//simplify each shape into 3 parts:
//edges, bbox, properties

const shpProcessor = require("./shpProcessor");
const geotiffProcessor = require("./geotiffProcessor");
const raycaster = require("./raycasting");
const fs = require("fs");

let shapefile = "test.zip";
let geotiff = "./RA-Monthly_RF_st_1920_08_mm_.tif";

let nodata = -9999;
let outFile = "./test.asc";

let shpPromise = shpProcessor.getPolys(shapefile);


let geotiffPromise = geotiffProcessor.getDataFromGeoTIFFFile(geotiff, -3.3999999521443642e+38);

let inAreaData = {}


Promise.all([shpPromise, geotiffPromise]).then((values) => {
    let geometries = values[0];
    let raster = values[1];
    
    for(let geometry of geometries) {
        bbox = geometry.bbox;
        cells = getCellsInBounds(raster.header, bbox);
        for(let cell of cells) {
            if(raster.values[cell.index] && raycaster.isInternal(geometry.geometry, cell.centroid)) {
                inAreaData[cell.index] = raster.values[cell.index];
            }
        }
    }

    writeOutRaster(outFile, raster.header, inAreaData, nodata);
    
}, (e) => {
    console.error(e);
});


//space separated ascii file
function writeOutRaster(outfile, header, data, nodata) {

    let ws = fs.createWriteStream(outfile);

    index = 0;

    for(let field in header) {
        value = header[field];
        ws.write(`${field}\t${value}\n`)
    }
    ws.write(`NODATA_value\t${nodata}\n`)

    for(let i = 0; i < header.nrows; i++, index++) {
        for(let j = 0; j < header.ncols; j++, index++) {
            let value = data[index];
            if(value === undefined) {
                value = nodata;
            }
            ws.write(`${value} `);
        }
        ws.write("\n");
    }

    ws.end();
}



//return array of {centroid: [lng, lat], index: cellIndex} objects
function getCellsInBounds(header, bounds) {

    let cells = [];

    let cellHeight = header.cellsize === undefined ? header.cellYSize : header.cellsize;
    let cellWidth = header.cellsize === undefined ? header.cellXSize : header.cellsize;

    //work from center of cells
    //lng x, lat y
    let xllCenter = header.xllcorner + cellWidth / 2.0;
    let yllCenter = header.yllcorner + cellHeight / 2.0;

    let offsetXNear = bounds[0] - xllCenter;
    let offsetYNear = bounds[1] - yllCenter;

    let offsetXFar = bounds[2] - xllCenter;
    let offsetYFar = bounds[3] - yllCenter;

    // let boundsWidth = bounds[2] - bounds[0];
    // let boundsHeight = bounds[3] - bounds[1];

    // console.log(offsetXNear, offsetXFar, offsetYNear, offsetYFar, cellWidth, cellHeight);

    let cellOffsetXNear = offsetXNear / cellWidth;
    let cellOffsetYNear = offsetYNear / cellHeight;

    let cellOffsetXFar = offsetXFar / cellWidth;
    let cellOffsetYFar = offsetYFar / cellHeight;



    let startingCellX = Math.max(Math.ceil(cellOffsetXNear), 0);
    let startingCellY = Math.max(Math.ceil(cellOffsetYNear), 0);

    let endingCellX = Math.min(Math.floor(cellOffsetXFar), header.ncols);
    let endingCellY = Math.min(Math.floor(cellOffsetYFar), header.nrows);

    // console.log(startingCellX, startingCellY, endingCellX, endingCellY);

    //warn if no cells are inside bounding box
    if(startingCellX > endingCellX || startingCellY > endingCellY) {
        console.log("Warning: Shape bounding box too small to include any map cells or out of raster range.");
    }

    for(let i = startingCellX; i <= endingCellX; i++) {
        for(let j = startingCellY; j <= endingCellY; j++) {
            let cell = {
                centroid: null,
                index: null
            }

            let lng = xllCenter + i * cellWidth;
            let lat = yllCenter + j * cellHeight;
            let index = getCellIndexFromXYOffsetLL(i, j, header.ncols, header.nrows);

            cell.centroid = [lng, lat];
            cell.index = index;

            cells.push(cell);
        }
    }

    // let cellSpanX = boundsWidth / cellWidth;
    // let cellSpanY = boundsHeight / cellHeight;

    return cells;

}

function getCellIndexFromXYOffsetLL(x, y, ncols, nrows) {
    let yAdjusted = nrows - y;
    return yAdjusted * ncols + x;
}
