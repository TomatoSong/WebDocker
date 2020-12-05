import WebDockerTerminal from './terminal.js' 
import Process from './process.js'

class WebDocker {
	constructor() {
		this.terminal = new WebDockerTerminal(this.onCmd.bind(this), this.onCtrl.bind(this));
		this.fs = {};
	}

	write_to_term(str){
		this.terminal.write("\r\n");
		this.terminal.write(str);
	}

	prompt(){
		this.terminal.prompt();
	}

	onCtrl(keyCode) {
		switch (keyCode) {
			case 67: // Ctrl+C
			{
				this.write_to_term("INFO: received signal: \"Ctrl+C\".\r\n");
				break;
			}
			case 90: // Ctrl+Z
			{
				this.write_to_term("INFO: received signal: \"Ctrl+Z\".\r\n");
				break;
			}
			case 220: // Ctrl+\
			{
				this.write_to_term("INFO: received signal: \"Ctrl+\\\".\r\n");
				break;
			}
		}
	}

	onCmd(buffer) {
		let buffer_array = buffer.split(" ");

		if (buffer === "fg")
		{
			this.write_to_term("INFO: received command: \"fg\".\r\n");
			this.prompt();
		}	
		else if (buffer === "jobs")
		{
			this.write_to_term("INFO: received command: \"jobs\".\r\n");
			this.prompt();
		}	
		else if (buffer_array[0] == "docker")
		{
			if (!buffer_array[1] || buffer_array[1] != "run")
			{
				this.write_to_term("ERROR: invalid docker command.\r\n");
				this.prompt();
			}
			else
			{
				if (!buffer_array[2] || buffer_array[2] == "")
				{
					this.write_to_term("ERROR: invalid docker img name.\r\n");
					this.prompt();
				}
				else
				{
					let img_name = buffer_array[2];
					let args = buffer_array.slice(3);
					this.open_img(img_name, args)
						.then(info => {
							let filename = this.find_entry(info["path"], info["cmd"]);
							let file = this.fs[filename].buffer;
							p = new Process(filename, file, info["cmd"], this.write_to_term.bind(this));
							p.write_mem();
							p.setup_stack();
							p.execute();
							this.prompt();
						})
						.catch((error) => {
							this.write_to_term(error + '\r\n');
							this.prompt(); 
						});
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
					let command = args;
					command.splice(0, 0, filename);
					p = new Process(filename, file, command, this.write_to_term.bind(this));
					p.write_mem();
					p.setup_stack();
					p.execute();
					this.prompt();
				})
				.catch((error) => {
					this.write_to_term(error + '\r\n');
					this.prompt(); 
				});
		}
	}

	async open_img(img_name, command)
	{
		// Parse img name for img tag
		let tag = "latest";

		if (img_name.split(":")[1])
		{
			tag = img_name.split(":")[1];
		}

		// Opens Docker Hub repository
		const repo = new Container.Repository('www.simonyu.net:5000', img_name.split(":")[0]);

		// Set repository credentials
		repo.setCredentials("webdocker", "@Webdocker");

		// Get img
		const img = await repo.img(tag);

		// Get img config
		const config = await img.Config;
		const config_json = await config.JSON;
		const config_json_config = await config_json.config;
		const config_json_config_env = await config_json_config.Env;
		const config_json_config_cmd = await config_json_config.Cmd;
		const path = config_json_config_env[0];

		if (command.length == 0)
		{
			command = config_json_config_cmd;
		}

		// Get layers
		const layers = await img.Layers;

		// Parse layers into dictionary
		let file_dict = {};

		for (let i = 0; i < layers.length; i++)
		{
			const layerArrayBuffer = await layers[i].arrayBuffer;
			const unzipped = pako.ungzip(layerArrayBuffer).buffer;
			const files = await untar(unzipped);
			
			file_dict = files.reduce(
				(file_dict, file) => {
					file_dict[file.name] = file;
					return file_dict;
				}, 
				file_dict
			);
		}

		this.fs = file_dict;

		return { "path" : path, "cmd" : command }
	}

	find_entry(path, command)
	{
		let file_name = command[0];
		let file_name_linked = "";
		let link_name = "";

		if(file_name[0] === "/")
		{
			file_name = file_name.slice(1);
		}
		else // Find in PATH variable
		{
			let path_array = path.split("=")[1].split(":");

			for (var i = 0; i < path_array.length; i ++)
			{
				var search_name = (path_array[i] + "/" + file_name).slice(1);
		
				if (this.fs[search_name])
				{
					file_name = search_name
					break;
				}
			}
		}

		if (file_name == "")
			throw "[ERROR]: invalid ELF file name.";

		link_name = this.fs[file_name].linkname;

		if (link_name != "")
		{
			while (link_name != "")
			{
				file_name_linked = this.fs[link_name].name
				link_name = this.fs[link_name].linkname
			}

			if (file_name_linked == "")
				throw "[ERROR]: invalid linked ELF file name.";
		}
		else
		{
			file_name_linked = file_name;
		}

		return file_name_linked;
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
