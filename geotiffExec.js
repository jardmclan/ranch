const shpProcessor = require("./shpProcessor");
const geotiffProcessor = require("./geotiffProcessor");
const raycaster = require("./raycasting");
const fs = require("fs");
const path = require("path");




function execConfig(config, range) {

    //verify range valid
    if(range[1] > index.length || range[0] < 0) {
        throw new Error("Invalid range.");
    }



    let configFile = "./geotiffConfig.json";
    let config = require(configFile);
    let index = require(config.geotiffIndex).index;

    //prepare geometries
    shpPromises = [];
    //extract polys from shapefiles
    for(let shapefile of config.shapefiles) {
        shpPromises.push(shpProcessor.getPolys(shapefile));
    }

    let combinedShpPromise = Promise.all(shpPromises).then((geometries) => {
        //flatten geometries to single array of geometries
        geometries = geometries.flat();
        return geometries;
    }, (e) => {
        throw new Error(e.toString());
    })
    .catch((e) => {
        throw e;
    });


    for(let i = range[0]; i < range[1]; i++) {
        let inAreaData = {};
        let meta = index[i];
        let geotiffFile = meta.fpath;
        let geotiffPath = path.join(config.geotiffRoot, geotiffFile);

        let geotiffPromise = geotiffProcessor.getDataFromGeoTIFFFile(geotiffPath, config.geotiffCustomNodata);

        Promise.all([combinedShpPromise, geotiffPromise]).then((values) => {
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

            //outfile?
            //should also write metadata
        
            writeOutRaster(outFile, raster.header, inAreaData, config.nodata);
            
        }, (e) => {
            throw e;
        });

    }

}




//space separated ascii file
function writeOutRaster(outfile, header, data, nodata) {

    let ws = fs.createWriteStream(outfile);

    let index = 0;

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


module.exports.exec = exec;
