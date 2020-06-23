
const geotiffExecutor = require("./geotiffExec");

if(process.argv.length < 2) {
    console.error("Module requires argument param.");
    process.exit(2);
}

let args = process.argv[2];

geotiffExecutor.execConfig(args.configFile, args.range);

