function tutorial_terminal()
{
	var term = new Terminal();
	term.open(document.getElementById('terminal'));
	term.write('Hello from \x1B[1;3;31mxterm.js\x1B[0m $ ')

    if (term._initialized)
	{
		return;
    }
	
    term.prompt = () => {
		term.write('\r\n$ ');
    };
	
    term.writeln('Welcome to xterm.js');
    term.writeln('This is a local terminal emulation, without a real terminal in the back-end.');
    term.writeln('Type some keys and commands to play around.');
    term.writeln('');
    term.prompt();

    buffer = '';
	
    term.onKey((e) => {
		const ev = e.domEvent;
		const printable = !ev.altKey && !ev.ctrlKey && !ev.metaKey;
		
		if (ev.keyCode === 13)
		{
			term.prompt();
			term.writeln('Command received: ' + buffer);
			buffer = '';
		}
		else if (ev.keyCode === 8)
		{
			// Do not delete the prompt
			if (term._core.buffer.x > 2)
			{
				buffer = buffer.substr(0, buffer.length-1);
				term.write('\b \b');
			}
		}
		else if (printable)
		{
			buffer += e.key;
			term.write(e.key);
		}
    });
}
