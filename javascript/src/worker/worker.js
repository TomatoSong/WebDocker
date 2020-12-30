importScripts(
'../../lib/unicorn.min.js', 
'../../lib/libelf.min.js', 
'./file.js', 
'./systemCallTable.js', 
'./workerSystemCallHandler.js',  
'./workerProcess.js'
);

function isFunction(functionToCheck) {
 return functionToCheck && {}.toString.call(functionToCheck) === '[object Function]';
}

var process;
console.log(MUnicorn)

if (isFunction(MUnicorn)) {
  MUnicorn().then(() => {
    process = new Process()
    self.postMessage("process loaded")
  })
} else {
  process = new Process();
  self.postMessage("process loaded")
}


console.log("worker started")
console.log(uc)
console.log(system_call_table)

let mode = "inner";
let pausePromise = null;
async function loop() {
    for(var i=0;i<1000;i++) {
        //Do stuff with unicorn emulation, the giant while loop
        for(var j=0;j<1000;j++) {
            if(pausePromise) {
              console.log("Loop paused");
              await pausePromise;
              console.log("Loop resumed");
            }
        }
    }
}
let workerLoop = null;
self.onmessage = function(event) {
    var m = event.data;    
    if(m.operation == 'run') {
        mode = m.mode;
        if(!workerLoop) {
          workerLoop = loop();
        }
    }

    if(m.operation == 'pause') {
        if(workerLoop) {
          var listener = null;
          pausePromise = new Promise(resolve=>self.addEventListener("message", listener = (event)=>{
              if(event.data.operation=="run") {
                console.log("Resuming loop from promise.");
                self.removeEventListener("message", listener);
                pausePromise = null;
                resolve();
              }
          }))
        }
        else {
          console.warn("Not running!");
        }
    }
}

self.onmessage = function (msg) {
    process.file.buffer = msg.data.buffer;
    process.load("");
    console.log("process loaded")
}
