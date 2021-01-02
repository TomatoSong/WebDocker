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
    self.onmessage = function (msg) {
      process.file.buffer = msg.data.buffer;
      process.load("");
      
      console.log("process loaded async")
    while (true) {
      // trapped on reading terminal
      if (process.trapped == true) {
        break;
      }

      // Should schedule for removal from process list
      if (process.exit_flag == true) {
        break;
      }

      try {
        // We just hit enter and process is no longer trapped, set up read syscall
        if (process.system_call.continue_read_rip != 0) {
          process.last_saved_rip =
            process.system_call.continue_read_rip;
        }
        process.unicorn.emu_start(
          process.last_saved_rip,
          0xfffffff,
          0,
          0
        );
        // We kick out the execution after a syscall is successfully handled
        process.last_saved_rip = process.unicorn
          .reg_read_i64(uc.X86_REG_RIP)
          .num();

        // Handling of system calls that require a stop before modifying states
        // OR, yielding for other processes' system call
        if (process.system_call.arch_prctl_flag) {
          process.system_call.arch_prctl_flag = 0;

          process.unicorn.emu_start(
            process.executableEntry,
            process.executableEntry + 2,
            0,
            0
          );
          process.unicorn.reg_write_i64(uc.X86_REG_RAX, 158);

          process.unicorn.emu_start(
            process.system_call.arch_prctl_rip,
            0,
            0,
            0
          );

          // Yielding after prctl syscall is correctly handled
          process.last_saved_rip = process.unicorn
            .reg_read_i64(uc.X86_REG_RIP)
            .num();
        }

        if (process.system_call.execve_flag) {
          process.system_call.execve_flag = false;
          let command = process.system_call.execve_command[0];

          let newprocess = new Process(parseInt(key), this, process.image);
          newprocess.command = process.system_call.execve_command;
          newprocess.load(process.system_call.execve_command);
          this.processes[key] = newprocess;
        }
      } catch (error) {
        console.log(error);
        process.exit_flag = true;
        console.log(
          process.unicorn.reg_read_i64(uc.X86_REG_RIP).hex()
        );
        process.last_saved_rip = process.unicorn.reg_read_i64(
          uc.X86_REG_RIP
        );
        process.logger.log_register(process.unicorn);
        process.logger.log_to_document(
          "[ERROR]: Time sharing emulation failed: " + error + "."
        );
        return;
      }
    }
    self.close()
    }
  })
} else {
  process = new Process();
  self.postMessage("process loaded sync")
}

var channel = new BroadcastChannel('my_bus');

channel.onmessage = function (ev) { console.log(ev.data); }

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

/*
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
*/



