export default class FileSystem
{
	constructor()
	{
		this.file_system_dictionary = {};
		this.path = "";
		this.command = "";
		this.file_name = "";
		this.file = [];
	}

	open_file()
	{
		let file_name = this.command[0];
		let file_name_linked = "";
		let link_name = "";

		if(file_name[0] === "/")
		{
			file_name = file_name.slice(1);
		}
		else // Find in PATH variable
		{
			let path_array = this.path.split("=")[1].split(":");

			for (var i = 0; i < path_array.length; i ++)
			{
				var search_name = (path_array[i] + "/" + file_name).slice(1);
		
				if (this.file_system_dictionary[search_name])
				{
					file_name = search_name
					break;
				}
			}
		}

		if (file_name == "")
		{
			throw "[ERROR]: invalid file name.";
		}

		link_name = this.file_system_dictionary[file_name].linkname;

		if (link_name != "")
		{
			while (link_name != "")
			{
				file_name_linked = this.file_system_dictionary[link_name].name
				link_name = this.file_system_dictionary[link_name].linkname
			}

			if (file_name_linked == "")
			{
				throw "[ERROR]: invalid linked file name.";
			}
		}
		else
		{
			file_name_linked = file_name;
		}

		this.file_name = file_name_linked;
		this.file = this.file_system_dictionary[this.file_name].buffer;
	}

	async open(image_name, command)
	{
		// Parse image name for image tag
		let tag = "latest";

		if (image_name.split(":")[1])
		{
			tag = image_name.split(":")[1];
		}

		// Opens Docker Hub repository
		const repo = new Container.Repository('www.simonyu.net:5000', image_name.split(":")[0]);

		// Set repository credentials
		repo.setCredentials("webdocker", "@Webdocker");

		// Get image
		const image = await repo.Image(tag);

		// Get image config
		const config = await image.Config;
		const config_json = await config.JSON;
		const config_json_config = await config_json.config;
		const config_json_config_env = await config_json_config.Env;
		const config_json_config_cmd = await config_json_config.Cmd;
		this.path = config_json_config_env[0];

		if (command.length == 0)
		{
			this.command = config_json_config_cmd;
		}
		else
		{
			this.command = command;
		}

		// Get layers
		const layers = await image.Layers;

		// Parse layers into dictionary
		for (let i = 0; i < layers.length; i++)
		{
			const layerArrayBuffer = await layers[i].arrayBuffer;
			const unzipped = pako.ungzip(layerArrayBuffer).buffer;
			const files = await untar(unzipped);
			
			this.file_system_dictionary = files.reduce(
				(file_system_dictionary, file) => {
					file_system_dictionary[file.name] = file;
					return file_system_dictionary;
				},
				this.file_system_dictionary
			);
		}

		this.open_file();
	}
}
