import File from "./file.js";

export default class Process {
  constructor(pid, kernel, image) {
    this.pid = pid;

    this.kernel = kernel;
    this.image = image;

    this.trapped = false;

    this.command = [];
    this.file = new File(this.image);
  }

  start(command) {
    if (command[0]) {
      this.file.open(command[0]);
      this.command = command;
    } else {
      this.file.open(this.image.command[0]);
      this.command = this.image.command;
    }

    this.workerProcess = new Worker("worker/worker.js");
    
    this.workerProcess.onmessage = (msg) => {
      if (msg.data.type == "LOAD_EXECUTABLE") {
        // Worker is ready ,we can load process
        const aBuf = this.file.buffer.slice(0);
        this.workerProcess.postMessage(
          {
            type: "LOAD_EXECUTABLE",
            payload: {
              executableBuffer: aBuf,
              command: this.command,
            },
          },
          [aBuf]
        );
      } else if (msg.data.type == "LOAD_INTERPRETER") {
        const interpreter = msg.data.payload
        const interpreterFile = new File(this.image);
        interpreterFile.open(interpreter.replace(/^\//, ""));
        const aBuf = interpreterFile.buffer.slice(0);
        this.workerProcess.postMessage(
          {
            type: "LOAD_INTERPRETER",
            payload: {
              interpreterBuffer: aBuf,
            },
          },
          [aBuf]
        );
      } else if (msg.data.type == "READ_TERMINAL") {
        const read_terminal_flag = true;
        this.trapped = true;
      } else {
        // Msg is write to terminal
        this.kernel.write(msg.data.payload);
      }
    };
  }
}
