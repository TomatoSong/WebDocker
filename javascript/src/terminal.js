var term = new Terminal();

term.open(document.getElementById('terminal'));

String.prototype.insert = function(idx, str)
{
	return this.slice(0, idx) + str + this.slice(idx);
};

String.prototype.remove = function(idx)
{
	return this.slice(0, idx - 1) + this.slice(idx);
};

function terminal()
{
    if (term._initialized)
	{
  		return;
    }
	
    term.prompt = () => {
		term.write("\r\n$ ");
    };

    term.writeln("Welcome to WebDocker!");
    term.prompt();

    buffer = "";
    cursor = 0;
    ignoreCode = [38, 40]; // 38: arrow up, 40: arrow down
	
    term.onKey((e) => {
		const ev = e.domEvent;
		const printable = !ev.altKey && !ev.ctrlKey && !ev.metaKey;

		if (ignoreCode.includes(ev.keyCode))
		{
			console.log("ignored: " + ev.keyCode);
			return;
		}

		if (!printable)
		{
			console.log("none printable! " + ev.keyCode);
			return;
		}

		switch (ev.keyCode)
		{
			case 13: // enter
			{
				term.writeln("")

				buffer_array = buffer.split(" ")

				if (buffer_array[0] == "docker")
				{
					if (!buffer_array[1] || buffer_array[1] == "")
					{
						term.writeln("ERROR: invalid docker image.")
					}
					else
					{
						open_image(buffer_array[1]).then(
								file_system => elf_loader(file_system)
						)
					}
				}
				
			 	buffer = '';
				cursor = 0;
				term.prompt();

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
				console.log((cursor + 2) % term.cols);

				if ((cursor + 2) >= term.cols && 
					(cursor + 2) % term.cols == 0)
				{
					console.log("move cursor up");
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
				if ((cursor + 2) % term.cols == 79)
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
				if (buffer.length == term._core.buffer._cols - 3 ||
					(buffer.length > term.cols && 
					 (buffer.length + 2) % term.cols == 79))
				{
					term.write(e.key);
					buffer += e.key;
					term.write("\r\n");
				}
				else
				{
					if (cursor < buffer.length)
					{
						term.write(`\x1b[1@`);
						term.write(e.key);
						buffer = buffer.insert(cursor, e.key);
					}
					else
					{
						term.write(e.key);
						buffer += e.key;
					}
				}

				cursor ++;
			}
		}
    });
}
