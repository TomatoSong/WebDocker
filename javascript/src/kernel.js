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

  onCmd(buffer) {
    let buffer_array = buffer.split(" ");

    if (buffer === "fg") {
      this.writeln('INFO: received command: "fg".');
      this.prompt();
    } else if (buffer === "jobs") {
      this.writeln('INFO: received command: "jobs".');
      this.prompt();
    } else if (buffer_array[0] == "debug") {
      if (buffer_array[1] && buffer_array[1] == "on") {
        document.getElementById("container_debug").style.display = "block";
      } else if (buffer_array[1] && buffer_array[1] == "off") {
        document.getElementById("container_debug").style.display = "none";
      } else {
        this.writeln("ERROR: invalid debug setting.");
      }

      this.prompt();
    } else if (buffer_array[0] == "docker") {
      if (buffer_array[1] && buffer_array[1] == "run") {
        if (!buffer_array[2] || buffer_array[2] == "") {
          this.writeln("ERROR: invalid docker image name.");
          this.prompt();
        } else {
          let command = buffer_array.slice(3);
          command = this.format_cmd(command);

          this.imageManager
            .open(buffer_array[2], command)
            .then((image) => {
              let pid = this.get_new_pid();
              let process = new Process(pid, this, image);

              process.file.open(process.image.command[0]);
              process.execute();
              this.processes[pid] = process;

              if (this.trapped == true) {
                return;
              }
            })
            .catch((error) => {
              this.writeln("ERROR: " + error._errorMessage + ".");
              this.prompt();
            });
        }
      } else if (buffer_array[1] == "registry") {
        if (buffer_array[2] && buffer_array[2] == "url") {
          if (buffer_array[3] && buffer_array[3] != "") {
            this.imageManager.registry_url = buffer_array[3];
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

        this.prompt();
      } else {
        this.writeln("ERROR: invalid docker command.");
        this.prompt();
      }
    } else if (buffer_array[0] == "") {
      this.shell.prompt();
    } else {
      let command = buffer_array;
      command = this.format_cmd(command);
      this.imageManager.command = command;

      fetch("bin/" + command[0])
        .then((response) => response.arrayBuffer())
        .then((file) => {
          let pid = this.get_new_pid();
          let process = new Process(pid, this, new Image());

          this.processes[pid] = process;
          process.file.file_name_command = command[0];
          process.file.file_name = command[0];
          process.file.buffer = file;
          process.execute();

          if (this.trapped == true) {
            return;
          }
        })
        .catch((error) => {
          this.writeln("ERROR: " + command[0] + ": command not found.");
          this.prompt();
        });
    }
  }

  get_new_pid() {
    const max_pid = Math.max(...Object.keys(this.processes));
    if (max_pid === -Infinity) {
      return 1;
    } else {
      return max_pid + 1;
    }
  }

  onTimeout() {
    for (const [key, value] of Object.entries(this.processes)) {
      let process = this.processes[key];
      // trapped on reading terminal
      if (this.processes[key].trapped == true) {
        continue;
      }

      // Should schedule for removal from process list
      if (this.processes[key].exit_dead == true) {
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
        process.logger.log_to_document(process.last_saved_rip.toString(16));
        //process.logger.log_register(process.unicorn)

        // Yielded for other processes' system call, or
        // Special handling of system calls that require emulator to stop before modifying states

        if (process.system_call.continue_arch_prctl_flag) {
          process.system_call.continue_arch_prctl_flag = 0;

          process.unicorn.emu_start(
            process.elf_entry,
            process.elf_entry + 2,
            0,
            0
          );
          process.unicorn.mem_write(
            process.elf_entry,
            process.system_call.continue_arch_prctl_mem
          );
          process.unicorn.reg_write_i64(
            uc.X86_REG_RAX,
            process.system_call.continue_arch_prctl_rax
          );
          process.unicorn.reg_write_i64(
            uc.X86_REG_RDX,
            process.system_call.continue_arch_prctl_rdx
          );
          process.unicorn.reg_write_i64(
            uc.X86_REG_RCX,
            process.system_call.continue_arch_prctl_rcx
          );
          process.unicorn.emu_start(
            process.system_call.continue_arch_prctl_rip,
            process.elf_end,
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
          newprocess.command = command;
          newprocess.file.open(command);
          newprocess.execute();
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
          "[ERROR]: Timesharine emulation failed: " + error + "."
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
  }
}
