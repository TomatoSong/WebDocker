async function tutorial_container()
{
	// Opens Docker Hub `busybox` repository.
	const busybox = new Container.Repository('registry.hub.docker.com', 'library/busybox');

	// Gets the tags for `busybox`.
	const tags = await busybox.Tags;

	// Gets the image `busybox:latest`.
	const image = await busybox.Image('latest');

	// Gets the manifest JSON for `busybox:latest`.
	const manifestJSON = await image.ManifestJSON;

	// Gets the config digest and JSON.
	const config = await image.Config;
	const configDigest = await config.digest;
	const configJSON = await config.JSON;

	// Gets the layer tar.gz.
	const layers = await image.Layers;
	const layerDigest = await layers[0].digest;
	const layerArrayBuffer = await layers[0].arrayBuffer;

	// Write to document
	document.getElementById("tags").innerHTML = JSON.stringify(tags);
	document.getElementById("image").innerHTML = JSON.stringify(image);
	document.getElementById("manifest").innerHTML = JSON.stringify(manifestJSON);
	document.getElementById("config_digest").innerHTML = JSON.stringify(configDigest);
	document.getElementById("config").innerHTML = JSON.stringify(configJSON);
	document.getElementById("layer_digest").innerHTML = JSON.stringify(layerDigest);
	document.getElementById("layer_array").innerHTML = JSON.stringify(layerArrayBuffer);
}

window.onload = function()
{
	tutorial_container();
}
