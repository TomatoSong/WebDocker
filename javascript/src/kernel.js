import ImageManager from "./imageManager.js";
import Process from "./process.js";
import Shell from "./shell.js";
import Image from "./image.js";

export default class Kernel {
  constructor(headless) {
    // Launch shell or we will run in headless mode
    this.shell = new Shell(this);
    this.imageManager = new ImageManager();
    this.processes = {};

    this.start();
  }

  write(string) {
    this.shell.term.write(string);
  }

  writeln(string) {
    this.shell.term.writeln(string);
  }

  format_cmd(command) {
    if (command.length > 0) {
      command[0] = command[0].replace(/"/g, "");
      command[0] = command[0].replace(/'/g, "");
      command[command.length - 1] = command[command.length - 1].replace(
        /"/g,
        ""
      );
      command[command.length - 1] = command[command.length - 1].replace(
        /'/g,
        ""
      );
    }

    if (command.length > 1) {
      command[1] = command[1].replace(/"/g, "");
      command[1] = command[1].replace(/'/g, "");
    }

    return command;
  }

  help() {
    this.writeln("Currently only support minimal images hello-world, busybox, alpine");
    this.writeln("debug [on|off] to toggle debug");
    this.writeln(
      "docker registry url URL to set registry. e.g. docker registry url www.simonyu.net:5000"
    );
    this.writeln(
      "docker registry proxy PROXY to set CORS proxy. e.g. docker registry url https://www.simonyu.net:3000"
    );
    this.writeln(
      "docker registry username USERNAME if registry requires login, otherwise leave blank"
    );
    this.writeln("docker registry password PASSWORD to set credential");
    this.shell.prompt();
  }

  //These should be moved to shell!
  onCmd(buffer) {
    let buffer_array = buffer.split(" ");

    if (buffer === "fg") {
      this.writeln('INFO: received command: "fg".');
      this.shell.prompt();
    } else if (buffer === "jobs") {
      this.writeln('INFO: received command: "jobs".');
      this.shell.prompt();
    } else if (buffer_array[0] == "debug") {
      if (buffer_array[1] && buffer_array[1] == "on") {
        document.getElementById("container_debug").style.display = "block";
      } else if (buffer_array[1] && buffer_array[1] == "off") {
        document.getElementById("container_debug").style.display = "none";
      } else {
        this.writeln("ERROR: invalid debug setting.");
      }

      this.shell.prompt();
    } else if (buffer_array[0] == "help") {
      this.help()
    } else if (buffer_array[0] == "docker") {
      if (buffer_array[1] && buffer_array[1] == "run") {
        if (!buffer_array[2] || buffer_array[2] == "") {
          this.writeln("ERROR: invalid docker image name.");
          this.shell.prompt();
        } else {
          let image = buffer_array[2];
          let args = buffer_array.slice(3);
          args = this.format_cmd(args);

          this.imageManager
            .openImage(image, args)
            .then((image) => {
              console.log(image);
              let pid = this.get_new_pid();
              let process = new Process(pid, this, image);
              process.load(args);
              this.processes[pid] = process;
            })
            .catch((error) => {
              console.log(error);
              this.writeln("ERROR: " + error._errorMessage + ".");
            });
        }
      } else if (buffer_array[1] == "registry") {
        if (buffer_array[2] && buffer_array[2] == "url") {
          if (buffer_array[3] && buffer_array[3] != "") {
            this.imageManager.registry_url = buffer_array[3];
            this.imageManager.registry_username = "";
            this.imageManager.registry_password = "";
          } else {
            this.writeln("ERROR: invalid docker registry URL.");
          }
        } else if (buffer_array[2] && buffer_array[2] == "proxy") {
          if (buffer_array[3] && buffer_array[3] != "") {
            this.imageManager.registry_proxy = buffer_array[3];
          } else {
            this.writeln("ERROR: invalid docker registry proxy.");
          }
        } else if (buffer_array[2] && buffer_array[2] == "username") {
          if (buffer_array[3] && buffer_array[3] != "") {
            this.imageManager.registry_username = buffer_array[3];
          } else {
            this.imageManager.registry_username = "";
          }
        } else if (buffer_array[2] && buffer_array[2] == "password") {
          if (buffer_array[3] && buffer_array[3] != "") {
            this.imageManager.registry_password = buffer_array[3];
          } else {
            this.imageManager.registry_password = "";
          }
        } else {
          this.writeln("ERROR: invalid docker registry command.");
        }

        this.shell.prompt();
      } else {
        this.writeln("ERROR: invalid docker command.");
        this.shell.prompt();
      }
    } else if (buffer_array[0] == "") {
      this.shell.prompt();
    } else {
      let command = buffer_array;
      command = this.format_cmd(command);
      this.imageManager.command = command;

      this.imageManager.openFile(command[0]).then((image) => {
        console.log(image);
        let pid = this.get_new_pid();
        let process = new Process(pid, this, image);
        command[0] = "/" + command[0];
        process.load(command);
        this.processes[pid] = process;
      });
    }
  }

  get_new_pid() {
    const max_pid = Math.max(...Object.keys(this.processes));
    return max_pid === -Infinity ? 1 : max_pid + 1;
  }

  onTimeout() {
    for (const [key, value] of Object.entries(this.processes)) {
      let process = this.processes[key];
      // trapped on reading terminal
      if (this.processes[key].trapped == true) {
        continue;
      }

      // Should schedule for removal from process list
      if (this.processes[key].exit_flag == true) {
        continue;
      }

      try {
        // We just hit enter and process is no longer trapped, set up read syscall
        if (process.system_call.continue_read_rip != 0) {
          this.processes[key].last_saved_rip =
            process.system_call.continue_read_rip;
        }
        process.unicorn.emu_start(
          this.processes[key].last_saved_rip,
          0xfffffff,
          0,
          0
        );
        // We kick out the execution after a syscall is successfully handled
        process.last_saved_rip = this.processes[key].unicorn
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
          process.last_saved_rip = this.processes[key].unicorn
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
        console.log(key);
        this.processes[key].trapped = true;
        console.log(
          this.processes[key].unicorn.reg_read_i64(uc.X86_REG_RIP).hex()
        );
        process.last_saved_rip = this.processes[key].unicorn.reg_read_i64(
          uc.X86_REG_RIP
        );
        process.logger.log_register(process.unicorn);
        process.logger.log_to_document(
          "[ERROR]: Time sharing emulation failed: " + error + "."
        );
        return;
      }
    }
    setTimeout(() => {
      this.onTimeout();
    }, 0);
  }

  start() {
    setTimeout(() => this.onTimeout(), 0);
    
    var terminalchannel = new BroadcastChannel('terminal');
    terminalchannel.onmessage = (ev) => this.write(ev.data);
    
    navigator.serviceWorker.register('serviceWorker.js').then(function(registration) {
      // Registration was successful
      console.log('ServiceWorker registration successful with scope: ', registration.scope);
    }, function(err) {
      // registration failed :(
      console.log('ServiceWorker registration failed: ', err);
    });
  }
}
