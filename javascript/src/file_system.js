async function open_image(image_name, command)
{
	// Parse image name for image tag
	var tag = "latest";

	if (image_name.split(":")[1])
	{
		tag = image_name.split(":")[1];
	}

	// Opens Docker Hub repository
	const repo = new Container.Repository('www.simonyu.net:5000', image_name.split(":")[0]);

	// Set repository credentials
	repo.setCredentials("webdocker", "@Webdocker")

	// Get image
	const image = await repo.Image(tag);

	// Get image config
	const config = await image.Config;
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
	const layers = await image.Layers;

	// Parse layers into dictionary
	var file_dictionary = {};

	for (var i = 0; i < layers.length; i++)
	{
		const layerArrayBuffer = await layers[i].arrayBuffer;
		const unzipped = pako.ungzip(layerArrayBuffer).buffer;
		const files = await untar(unzipped);
		
		file_dictionary = files.reduce(
			(file_dictionary, file) => {
				file_dictionary[file.name] = file;
				return file_dictionary;
			}, 
			file_dictionary
		);
	}

	return [path, command, file_dictionary]
}
