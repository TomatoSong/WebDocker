async function open_image(image_name)
{
	// Opens Docker Hub `repo` repository.
	const repo = new Container.Repository('www.simonyu.net:5000', image_name);

	// Set credentials
	repo.setCredentials("webdocker", "@Webdocker")

	// Gets the tags for `repo`.
	const tags = await repo.Tags;

	// Gets the image `repo:latest`.
	const image = await repo.Image('latest');

	// Gets the manifest JSON for `repo:latest`.
	const manifestJSON = await image.ManifestJSON;

	// Gets the config digest and JSON.
	const config = await image.Config;
	const configDigest = await config.digest;
	const configJSON = await config.Gets;

	// JSON the file system from tar.gz.
	const layers = await image.Layers;

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

	return file_dictionary
}
