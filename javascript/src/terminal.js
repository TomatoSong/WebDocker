var term = new Terminal();
var fit_addon = new FitAddon.FitAddon();

term.loadAddon(fit_addon);
term.open(document.getElementById("container_terminal"));
fit_addon.fit();

String.prototype.insert = function(idx, str)
{
	return this.slice(0, idx) + str + this.slice(idx);
};

String.prototype.remove = function(idx)
{
	return this.slice(0, idx - 1) + this.slice(idx);
};

let source = "WebDocker$ ";

function terminal()
{
    if (term._initialized)
	{
  		return;
    }
	
    term.prompt = () => {
		term.write(source);
    };

    term.writeln("Welcome to WebDocker!");
	term.writeln("Use docker run <img> <cmd> to run a docker image.")
	term.writeln("")
	term.prompt();
	

    buffer = "";
    cursor = 0;
    ignoreCode = [38, 40]; // 38: arrow up, 40: arrow down
	
	// term.write(`\x1b[?7h`);
    term.onKey((e) => {
		const ev = e.domEvent;
		const printable = !ev.altKey && !ev.ctrlKey && !ev.metaKey;

		if (ev.ctrlKey && ev.keyCode == 67) // Crtl-C
		{ 
			console.log("Control sequence: Crtl-C");
			return;
		}
		else if (ev.ctrlKey && ev.keyCode == 90)
		{ 
			console.log("Control sequence: Crtl-Z");
			return;
		}
		else if (ev.ctrlKey && ev.keyCode == 220)
		{ 
			console.log("Control sequence: Crtl-\\");
			return;
		}
			
		if (ignoreCode.includes(ev.keyCode))
		{
			return;
		}

		if (!printable)
		{
			return;
		}

		switch (ev.keyCode)
		{
			case 13: // enter
			{
				if (buffer === "fg")
				{
					console.log("fg");
					buffer = "";
					cursor = 0;
					term.write("\r\n");
					term.prompt();
					return;
				}
				else if (buffer === "jobs")
				{
					console.log("jobs");
					buffer = "";
					cursor = 0;
					term.write("\r\n");
					term.prompt();
					return;
				}

				term.writeln("")
				buffer_array = buffer.split(" ")

				if (buffer_array[0] == "docker")
				{
					if (!buffer_array[1] || buffer_array[1] != "run")
					{
						term.writeln("ERROR: invalid docker command.")
						term.prompt();
					}
					else
					{
						if (!buffer_array[2] || buffer_array[2] == "")
						{
							term.writeln("ERROR: invalid docker image name.")
							term.prompt();
						}
						else
						{
							var command = buffer_array.slice(3);

							if (command.length != 0)
							{
								command[0] = command[0].replace(/"/g, "");
								command[0] = command[0].replace(/'/g, "");
								command[command.length - 1] = command[
									command.length - 1].replace(/"/g, "");
								command[command.length - 1] = command[
									command.length - 1].replace(/'/g, "");
							}

							open_image(buffer_array[2], command)
								.then(file_system => elf_loader(file_system))
								.then(() => term.prompt());
						}
					}
				}
				else if (buffer_array[0] == "")
				{
					term.prompt();
				}
				else
				{
					var command = buffer_array;

					if (command.length != 0)
					{
						command[0] = command[0].replace(/"/g, "");
						command[0] = command[0].replace(/'/g, "");
						command[command.length - 1] = command[
							command.length - 1].replace(/"/g, "");
						command[command.length - 1] = command[
							command.length - 1].replace(/'/g, "");
					}

					fetch("bin/" + command[0])
						.then(response => response.arrayBuffer())
						.then(file => execve(command, file))
						.then(() => term.prompt())
						.catch(function() {
							term.writeln("ERROR: " + buffer_array[0] +
										 ": command not found.");
							term.prompt();
						});
				}
				
			 	buffer = "";
				cursor = 0;

				break;
			}
			case 8: // backspace
			{
				if (cursor > 0)
				{
					buffer = buffer.remove(cursor);
					term.write('\b\x1b[1P');
					cursor --;
				}

				break;
			}
			case 37: // arrow left
			{
				if ((cursor + source.length) >= term.cols && 
					(cursor + source.length) % term.cols == 0)
				{
					term.write(`\x1b[A`);
					term.write(`\x1b[${term.cols}G`);
				}
				else if (cursor > 0)
				{
					term.write('\b');
				}
				else
				{
					return;
				}

				cursor --;

				break;
			}
			case 39: // arrow right
			{
				if ((cursor + source.length) % term.cols == term.cols - 1)
				{
					term.write("\r\n");
				}
				else if (cursor < buffer.length)
				{
					term.write(`\x1b[1C`);
				}
				else
				{
					return;
				}

				cursor ++;

				break;
			}
			default:
			{
				if (cursor == buffer.length){
					if ((buffer.length + source.length) % term.cols == term.cols - 1)
					{
						term.write(e.key);
						buffer += e.key;
						term.write("\r\n");
					}
					else
					{
						term.write(e.key);
						buffer += e.key;
					}
				}
				else if (cursor < buffer.length)
				{
					// let id = cursor;
					// while (id < buffer.length) 
					// {
					// 	if (id + source.length < term.cols)
					// 	{
							
					// 	}
					// }
					term.write(`\x1b[1@`);
					term.write(e.key);
					buffer = buffer.insert(cursor, e.key);
				}
				else
				{
					return;
				}

				cursor ++;

			}
		}
    });
}
