const {fork} = require("child_process");

class ProcessPool {
    constructor(maxProcesses) {

    }
}

function runModule(moduleName) {
    fork(moduleName);
}


function test() {
    console.log("a");
}