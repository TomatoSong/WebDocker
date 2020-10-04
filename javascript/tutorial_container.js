async function tutorial_container()
{
	// Opens Docker Hub `repo` repository.
	const repo = new Container.Repository('fa20-cs523-40.cs.illinois.edu:5000', 'python');

	// Gets the tags for `repo`.
	const tags = await repo.Tags;

	// Gets the image `repo:latest`.
	const image = await repo.Image('latest');

	// Gets the manifest JSON for `repo:latest`.
	const manifestJSON = await image.ManifestJSON;

	// Gets the config digest and JSON.
	const config = await image.Config;
	const configDigest = await config.digest;
	const configJSON = await config.JSON;

	// Gets the file system from tar.gz.
	const layers = await image.Layers;
	let filenameToFile = {};
	var i;
	for (i = 0; i < layers.length; i++){
		const layerArrayBuffer = await layers[i].arrayBuffer;
		console.log(layers[i]);
		const unzipped = pako.ungzip(layerArrayBuffer).buffer;
		const files = await untar(unzipped);
		filenameToFile = files.reduce(
			(filenameToFile, file) => {
			  filenameToFile[file.name] = file;
			  return filenameToFile;
			}, 
			filenameToFile);
	}

	// Write to document
	document.getElementById("tags").innerHTML = JSON.stringify(tags);
	document.getElementById("image").innerHTML = JSON.stringify(image);
	document.getElementById("manifest").innerHTML = JSON.stringify(manifestJSON);
	document.getElementById("config_digest").innerHTML = JSON.stringify(configDigest);
	document.getElementById("config").innerHTML = JSON.stringify(configJSON);
	document.getElementById("file_system").innerHTML = JSON.stringify(filenameToFile);
}

window.onload = function()
{
	tutorial_container();
}
