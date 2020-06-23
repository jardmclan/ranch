//simplify each shape into 3 parts:
//edges, bbox, properties



const os = require("os");
const geotiffExec = require("./geotiffExec");

const {fork} = require("child_process");

// let shapefile = "test.zip";
// let geotiff = "./RA-Monthly_RF_st_1920_08_mm_.tif";

// let nodata = -9999;
// let outFile = "./test.asc";

//default config file, or can provide one through cmd args
let configFile = "geotiffConfig.json";
if(process.argv.length > 2) {
    configFile = process.argv[2];
}



const config = require(configFile);
let indexFile = config.geotiffIndex;
const index = require(indexFile);
index = index.index;
let indexLen = index.length;

if(indexLen < 1) {
    console.log("Empty index.");
    process.exit();
}

let procLimit = config.processLimit < 1 ? os.cpus.length() : config.processLimit;
//make sure not spawning more processes than there are values
procLimit = Math.min(indexLen, procLimit);

let chunkSizeLow = Math.floor(indexLen / procLimit);
let chunkSizeHigh = chunkSizeLow + 1;

let leftover = indexLen % procLimit;

let procLimitHigh = leftover;
let procLimitLow = procLimit - procLimitHigh;

//generate ranges
let ranges = [];

let s = 0;
//ranges are [low, high)
for(let i = 0; i < procLimitHigh; i++) {
    ranges.push([s, s + chunkSizeHigh]);
    s += chunkSizeHigh;
}

for(let i = 0; i < procLimitLow; i++) {
    ranges.push([s, s + chunkSizeLow]);
    s += chunkSizeLow;
}

//sanity check
if(s != metaLen || ranges.length != procLimit) {
    errorExit("Failed sanity check, index file not chunked correctly.");
}

//use main process for one
let i = 0;
for(; i < ranges.length - 1; i++) {
    let args = {
        range: ranges[i],
        configFile: configFile
    }

    let child = fork("geotiffModule", [JSON.stringify(args)]);
    child.on("error", (e) => {
        console.error(e);
    });
    child.on("exit", (code) => {
        if(code != 0) {
            console.error(`Child process exited with error code ${code}`);
        }
    })
}

let range = ranges[i];

try {
    geotiffExec.execConfig(configFile, range);
}
catch(e) {
    console.error(e);
}







