import FileSystem from "./file_system.js"
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
		this.file_system = new FileSystem();
		this.fit_addon = new FitAddon.FitAddon();

		this.trapped = -1;
		this.buffer = "";
		this.cursor = 0;
		this.source = "WebDocker$ ";
		this.process = null;
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
		else if (buffer_array[0] == "docker")
		{
			if (!buffer_array[1] || buffer_array[1] != "run")
			{
				this.writeln("ERROR: invalid docker command.");
				this.prompt();
			}
			else
			{
				if (!buffer_array[2] || buffer_array[2] == "")
				{
					this.writeln("ERROR: invalid docker image name.");
					this.prompt();
				}
				else
				{
					var command = buffer_array.slice(3);

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

					this.file_system.open(buffer_array[2], command)
						.then(() => {
							this.process = new Process(this, this.file_system);
							this.process.execute();

							if (this.trapped == 0)
							{
								return;
							}

							this.prompt();
						})
						.catch(error => {
							this.writeln("ERROR: " + error._errorMessage + ".");
							this.prompt();
						});
				}
			}
		}
		else if (buffer_array[0] == "")
		{
			this.prompt();
		}
		else
		{
			var command = buffer_array;

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

			fetch("bin/" + command[0])
				.then(response => response.arrayBuffer())
				.then(file => {
					this.file_system.command = command;
					this.file_system.file_name = command[0];
					this.file_system.file = file;

					this.process = new Process(this, this.file_system);
					this.process.execute();

					if (this.trapped == 0)
					{
						return;
					}

					this.prompt();
				})
				.catch(() => {
					this.writeln("ERROR: " + command[0] + ": command not found.");
					this.prompt();
				});
		}
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

					if (this.trapped == 0)
					{
						this.process.unicorn.emu_start(this.process.system_call.read_rip,
													   0, 0);
						this.prompt();
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
					if ((this.cursor + this.source.length) % this.term.cols == this.term.cols - 1)
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
	}
}
