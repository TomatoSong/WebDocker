import Image from "./image.js"
import Process from "./process.js"

String.prototype.insert = function(idx, str)
{
	return this.slice(0, idx) + str + this.slice(idx);
};

String.prototype.remove = function(idx)
{
	return this.slice(0, idx - 1) + this.slice(idx);
};

export default class WebDockerTerminal
{
	constructor()
	{
		this.term = new Terminal();
		this.fit_addon = new FitAddon.FitAddon();
		this.image = new Image();

		this.processes = {};

		this.trapped = false;
		this.trapped_pid = -1;
		this.buffer = "";
		this.cursor = 0;
		this.source = "WebDocker$ ";
		this.ignoreCode = [38, 40]; // 38: arrow up, 40: arrow down

		this.init();
		this.reset_buffer();
	}

	prompt()
	{
		this.write(this.source);
	}

	write(string)
	{
		this.term.write(string);
	}

	writeln(string)
	{
		this.term.writeln(string);
	}

	reset_buffer()
	{
		this.buffer = "";
		this.cursor = 0;
	}

	on_ctrl(keyCode)
	{
		switch (keyCode)
		{
			case 67: // Ctrl+C
			{
				this.writeln("");
				this.writeln("INFO: received signal: \"Ctrl+C\".");
				this.prompt();
				break;
			}
			case 90: // Ctrl+Z
			{
				this.writeln("");
				this.writeln("INFO: received signal: \"Ctrl+Z\".");
				this.prompt();
				break;
			}
			case 220: // Ctrl+\
			{
				this.writeln("");
				this.writeln("INFO: received signal: \"Ctrl+\\\".");
				this.prompt();
				break;
			}
		}
	}

	format_cmd(command)
	{
		if (command.length > 0)
		{
			command[0] = command[0].replace(/"/g, "");
			command[0] = command[0].replace(/'/g, "");
			command[command.length - 1] = command[
				command.length - 1].replace(/"/g, "");
			command[command.length - 1] = command[
				command.length - 1].replace(/'/g, "");
		}

		if (command.length > 1)
		{
			command[1] = command[1].replace(/"/g, "");
			command[1] = command[1].replace(/'/g, "");
		}

		return command;
	}

	on_cmd(buffer)
	{
		let buffer_array = buffer.split(" ");

		if (buffer === "fg")
		{
			this.writeln("INFO: received command: \"fg\".");
			this.prompt();
		}	
		else if (buffer === "jobs")
		{
			this.writeln("INFO: received command: \"jobs\".");
			this.prompt();
		}
		else if (buffer_array[0] == "debug")
		{
			if (buffer_array[1] && buffer_array[1] == "on")
			{
				document.getElementById("container_debug").style.display = "block";
			}
			else if (buffer_array[1] && buffer_array[1] == "off")
			{
				document.getElementById("container_debug").style.display = "none";
			}
			else
			{
				this.writeln("ERROR: invalid debug setting.");
			}

			this.prompt();
		}
		else if (buffer_array[0] == "docker")
		{
			if (buffer_array[1] && buffer_array[1] == "run")
			{
				if (!buffer_array[2] || buffer_array[2] == "")
				{
					this.writeln("ERROR: invalid docker image name.");
					this.prompt();
				}
				else
				{
					let command = buffer_array.slice(3);
					command = this.format_cmd(command);

					this.image.open(buffer_array[2], command)
						.then(() => {
							let pid = this.get_new_pid();
							let process = new Process(pid, this, this.image);

							this.processes[pid] = process;
							process.file.open(process.image.command[0]);
							process.execute();

							if (this.trapped == true)
							{
								return;
							}
						})
						.catch(error => {
							this.writeln("ERROR: " + error._errorMessage + ".");
							this.prompt();
						});
				}
			}
			else if (buffer_array[1] == "registry")
			{
				if (buffer_array[2] && buffer_array[2] == "url")
				{
					if (buffer_array[3] && buffer_array[3] != "")
					{
						this.image.registry_url = buffer_array[3];
					}
					else
    				{
						this.writeln("ERROR: invalid docker registry URL.");
					}
				}
				else if (buffer_array[2] && buffer_array[2] == "proxy")
				{
					if (buffer_array[3] && buffer_array[3] != "")
					{
						this.image.registry_proxy = buffer_array[3];
					}
					else
    				{
						this.writeln("ERROR: invalid docker registry proxy.");
					}
				}
				else if (buffer_array[2] && buffer_array[2] == "username")
				{
					if (buffer_array[3] && buffer_array[3] != "")
					{
						this.image.registry_username = buffer_array[3];
					}
					else
					{
						this.image.registry_username = "";
					}
				}
				else if (buffer_array[2] && buffer_array[2] == "password")
				{
					if (buffer_array[3] && buffer_array[3] != "")
					{
						this.image.registry_password = buffer_array[3];
					}
					else
					{
						this.image.registry_password = "";
					}
				}
				else
    	        {
                    this.writeln("ERROR: invalid docker registry command.");
                }

				this.prompt();
			}
			else
			{
				this.writeln("ERROR: invalid docker command.");
				this.prompt();
			}
		}
		else if (buffer_array[0] == "")
		{
			this.prompt();
		}
		else
		{
			let command = buffer_array;
			command = this.format_cmd(command);
			this.image.command = command;

			fetch("bin/" + command[0])
				.then(response => response.arrayBuffer())
				.then(file => {
					let pid = this.get_new_pid();
					let process = new Process(pid, this, this.image);

					this.processes[pid] = process;
					process.file.file_name_command = command[0];
					process.file.file_name = command[0];
					process.file.buffer = file;
					process.execute();

					if (this.trapped == true)
					{
						return;
					}
				})
				.catch((error) => {
					this.writeln("ERROR: " + command[0] + ": command not found.");
					this.prompt();
				});
		}
	}

	get_new_pid()
	{
		if (Object.keys(this.processes).length == 0)
		{
			return 1;
		}

		return Object.keys(this.processes).length + 1;
	}

	init()
	{
		this.term.loadAddon(this.fit_addon);
		this.term.open(document.getElementById("container_terminal"));
		this.term.focus()
		this.fit_addon.fit();

		if (this.term._initialized)
		{
			return;
		}

		this.writeln("Welcome to WebDocker!");
		this.writeln("Use docker run <img> <cmd> to run a docker image.");
		this.writeln("");
		this.prompt();	
	}
	
	on_timeout() 
	{
	    console.log("timetick for one syscall")
	    console.log(this.processes)
	    for (const [key, value] of Object.entries(this.processes))
	    {
	        let process = this.processes[key];
	        // trapped on reading terminal
	        if(this.processes[key].trapped == true) { continue;}
	        
	        // Should schedule for removal from process list
	        if(this.processes[key].exit_dead == true) {continue;}
	        
	        try {
	                // We just hit enter and process is no longer trapped, set up read syscall
	                if (process.system_call.continue_read_rip != 0) {
	                    this.processes[key].last_saved_rip = process.system_call.continue_read_rip;
	                }
	                process.logger.log_to_document(this.processes[key].last_saved_rip.toString(16))
	                process.unicorn.emu_start(this.processes[key].last_saved_rip, 0xffffffff, 0, 0);
					// We kick out the execution after a syscall is successfully handled
					process.logger.log_register(process.unicorn);
					console.log(this.processes[key].unicorn.reg_read_i64(uc.X86_REG_RIP).num());
	                process.last_saved_rip = this.processes[key].unicorn.reg_read_i64(uc.X86_REG_RIP).num();
	                // Yielding at next syscall
	                if (process.system_call.continue_arch_prctl_flag) {
					    process.system_call.continue_arch_prctl_flag = 0;
					    
					    process.unicorn.emu_start(process.elf_entry, process.elf_entry + 2, 0, 0);
					    process.unicorn.mem_write(process.elf_entry,
										       process.system_call.continue_arch_prctl_mem);
					    process.unicorn.reg_write_i64(uc.X86_REG_RAX,
											       process.system_call.continue_arch_prctl_rax);
					    process.unicorn.reg_write_i64(uc.X86_REG_RDX,
											       process.system_call.continue_arch_prctl_rdx);
					    process.unicorn.reg_write_i64(uc.X86_REG_RCX,
											       process.system_call.continue_arch_prctl_rcx);
					    process.unicorn.emu_start(process.system_call.continue_arch_prctl_rip,
										       process.elf_end , 0, 0);
										       
					    // Yielding after prctl syscall is correctly handled					   
					    process.last_saved_rip = this.processes[key].unicorn.reg_read_i64(uc.X86_REG_RIP).num();
					    
	                }
	                if (process.system_call.execve_flag) {
	                    process.system_call.execve_flag = false;
	                    let command = process.system_call.execve_command[0];
	                    
	                    let newprocess = new Process(parseInt(key), this, this.image);
	                    newprocess.command = command;
						this.processes[key] = newprocess;
						newprocess.file.open(command);
						newprocess.execute();
	                }
	        } catch (error) {
	            console.log(error)
	            console.log(key)
			    this.processes[key].trapped = true;
			    console.log(this.processes[key].unicorn.reg_read_i64(uc.X86_REG_RIP).hex())
			    process.last_saved_rip = this.processes[key].unicorn.reg_read_i64(uc.X86_REG_RIP);
			    process.logger.log_register(process.unicorn)
				process.logger.log_to_document("[ERROR]: Timesharine emulation failed: " + error + ".")
				return
	        }

	        
	    }
	    setTimeout(() => {this.on_timeout()}, 0)
	}

	start()
	{
		this.term.onKey((e) => {
			const ev = e.domEvent;
			const printable = !ev.altKey && !ev.ctrlKey && !ev.metaKey;

			if (ev.ctrlKey) 
			{
				this.reset_buffer();
				this.on_ctrl(ev.keyCode);
				return;
			}
			
			if (this.ignoreCode.includes(ev.keyCode) || !printable)
			{
				return;
			}
			
			switch (ev.keyCode)
			{
				case 13: // enter
				{
					this.writeln("");

					if (this.trapped == true)
					{
					    this.trapped = false;
						this.processes[this.trapped_pid].buffer = this.buffer;
						this.processes[this.trapped_pid].trapped = false;
				        this.reset_buffer();
					}
					else
					{
						this.on_cmd(this.buffer);
					}

					this.reset_buffer();

					break;
				}
				case 8: // backspace
				{
					if (this.cursor > 0)
					{
						this.buffer = this.buffer.remove(this.cursor);
						this.write('\b\x1b[1P');
						this.cursor --;
					}

					break;
				}
				case 37: // arrow left
				{
					if ((this.cursor + this.source.length) >= this.term.cols && 
						(this.cursor + this.source.length) % this.term.cols == 0)
					{
						this.write(`\x1b[A`);
						this.write(`\x1b[${this.term.cols}G`);
					}
					else if (this.cursor > 0)
					{
						this.write('\b');
					}
					else
					{
						return;
					}

					this.cursor --;

					break;
				}
				case 39: // arrow right
				{
					if ((this.cursor + this.source.length) %
						this.term.cols == this.term.cols - 1)
					{
						this.writeln("");
					}
					else if (this.cursor < this.buffer.length)
					{
						this.write(`\x1b[1C`);
					}
					else
					{
						return;
					}

					this.cursor ++;

					break;
				}
				default:
				{
					if (this.cursor == this.buffer.length)
					{
						if ((this.buffer.length + this.source.length) %
							this.term.cols == this.term.cols - 1)
						{
							this.write(e.key);
							this.buffer += e.key;
							this.writeln("");
						}
						else
						{
							this.write(e.key);
							this.buffer += e.key;
						}
					}
					else if (this.cursor < this.buffer.length)
					{
						this.write(`\x1b[1@`);
						this.write(e.key);
						this.buffer = this.buffer.insert(this.cursor, e.key);
					}
					else
					{
						return;
					}

					this.cursor ++;

					break;
				}
			}
		})
		setTimeout(() => this.on_timeout(), 0)
	}
}
