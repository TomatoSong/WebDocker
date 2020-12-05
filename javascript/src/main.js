import WebDockerTerminal from './terminal.js' 
import Process from './cpu.js'

class WebDocker {
	constructor() {
		this.terminal = new WebDockerTerminal(this.onCmd.bind(this), this.onCtrl.bind(this));
		this.fs = {};
	}

	write_to_term(str){
		this.terminal.write(str);
		this.terminal.write("\r\n");
		this.terminal.prompt();
	}

	onCtrl(keyCode) {
		switch (keyCode) {
			case 67: // Ctrl+C
			{
				this.write_to_term("\r\nINFO: received signal: \"Ctrl+C\".")
				break;
			}
			case 90: // Ctrl+Z
			{
				this.write_to_term("\r\nINFO: received signal: \"Ctrl+Z\".")
				break;
			}
			case 220: // Ctrl+\
			{
				this.write_to_term("\r\nINFO: received signal: \"Ctrl+\\\".")
				break;
			}
		}
	}

	onCmd(buffer) {
		let buffer_array = buffer.split(" ");

		if (buffer === "fg")
				this.write_to_term("\r\nINFO: received command: \"fg\".")
		else if (this.buffer === "jobs")
				this.write_to_term("\r\nINFO: received command: \"jobs\".")
		else if (buffer_array[0] == "docker")
		{
			if (!buffer_array[1] || buffer_array[1] != "run")
					this.write_to_term("\r\nERROR: invalid docker command.")
			else
			{
				if (!buffer_array[2] || buffer_array[2] == "")
					this.write_to_term("\r\nERROR: invalid docker image name.")
				else
				{
					let args = buffer_array.slice(3);
					open_image(buffer_array[2], args)
						.then(file_system => elf_loader(file_system))
				}
			}
		}
		else if (buffer_array[0] != "")
		{
			let p;
			let filename = buffer_array[0];
			let args = buffer_array.slice(1);
			fetch("bin/" + filename)
				.then(response => response.arrayBuffer())
				.then(file => {
					p = new Process(filename, file, args, this.write_to_term.bind(this));
					p.write_mem();
					p.setup_stack();
					p.execute();
				});
		}
	}

	run()
	{
		this.terminal.start();
	}
}

window.onload = function()
{
	let app = new WebDocker();
	app.run();
}
