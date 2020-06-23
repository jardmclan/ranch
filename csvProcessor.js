
const csvWriter = require('csv-write-stream')

const shpProcessor = require("./shpProcessor");
const raycaster = require("./raycasting");

const csv = require("csv-parser");
const fs = require("fs");

const config = require("./csvConfig.json");

source = fs.createReadStream(config.input)
.pipe(csv());



//default opts should be good
let writer = csvWriter();
output = fs.createWriteStream(config.output)
writer.pipe(output);

shpPromises = [];
//extract polys from shapefiles
for(let shapefile of config.shapefiles) {
    shpPromises.push(shpProcessor.getPolys(shapefile));
}

combinedShpPromise = Promise.all(shpPromises).then((geometries) => {
    //flatten geometries to single array of geometries
    geometries = geometries.flat();
    return geometries;
}, (e) => {
    errorExit(e);
})
.catch((e) => {
    errorExit(e);
});

let recordNum = 0;
let filteredRecords = 0;
let finished = false;
source.on("data", (record) => {
    recordNum++;
    combinedShpPromise.then((geometries) => {
        if(filter(record, geometries)) {
            //console.log(record);
            writer.write(record);
        }
        filteredRecords++;
        checkComplete();
    });
});


source.on("end", () => {
    finished = true;
    checkComplete();
});

function checkComplete() {
    if(finished && filteredRecords >= recordNum) {
        complete();
    }
}

function complete() {
    cleanup();
    console.log("Complete!");
}


function cleanup() {
    writer.end();
}

function errorExit(e) {
    cleanup();
    console.error(e);
    process.exit(1);
}


function filter(record, geometries) {
    //get lat lng from record
    let lat = record.LAT;
    let lng = record.LON;

    keep = false;
    for(let geometry of geometries) {
        // console.log(geometry);
        if(raycaster.isInternal(geometry.geometry, [lng, lat])) {
            keep = true;
            break;
        }
        // errorExit("");
    }
    
    return keep
}


process.on("SIGINT", function() {
    console.log("Caught interrupt, exitting...");
    cleanup();
    process.exit(2);
});

process.on("uncaughtException", (e) => {
    errorExit(e);
});