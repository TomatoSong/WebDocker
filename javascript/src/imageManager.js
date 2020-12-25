import Image from "./image.js";

export default class ImageManager {
  constructor() {
    this.images = {};

    this.registry_url = "www.simonyu.net:5000";
    this.registry_proxy = "https://www.simonyu.net:8080/";
    this.registry_username = "webdocker";
    this.registry_password = "@Webdocker";
  }

  async openFile(file_name) {
    const response = await fetch("bin/" + file_name);
    const file = await response.arrayBuffer();

    let return_image = new Image();
    return_image.files[file_name] = { linkname: "", buffer: file };
    return return_image;
  }

  async openImage(image_name, command = "") {
    // Parse image name for image tag
    let return_image = new Image();

    let tag = "latest";

    if (image_name.split(":")[1]) {
      tag = image_name.split(":")[1];
    }

    // Opens Docker Hub repository
    const repo = new Container.Repository(
      this.registry_url,
      this.registry_proxy,
      image_name.split(":")[0]
    );

    // Set repository credentials
    repo.setCredentials(this.registry_username, this.registry_password);

    // Get image
    const image = await repo.Image(tag);

    // Get image config
    const config = await image.Config;
    const config_json = await config.JSON;
    const config_json_config = await config_json.config;
    const config_json_config_env = await config_json_config.Env;
    const config_json_config_cmd = await config_json_config.Cmd;
    return_image.path = config_json_config_env[0];

    if (command.length == 0) {
      return_image.command = config_json_config_cmd;
    } else {
      return_image.command = command;
    }

    // Get layers
    const layers = await image.Layers;

    // Parse layers into dictionary
    for (let i = 0; i < layers.length; i++) {
      const layerArrayBuffer = await layers[i].arrayBuffer;
      const unzipped = pako.ungzip(layerArrayBuffer).buffer;
      const files = await untar(unzipped);

      return_image.files = files.reduce((files, file) => {
        files[file.name] = file;
        return files;
      }, return_image.files);
    }

    return return_image;
  }
}
