const Container = (function() {
  const exportedClasses = () => ({

    // A remote container image repository.
    Repository: Repository,

    // A registry exception.
    RegistryError: RegistryError,
  });

  // A remote container image repository.
  class Repository {

    // Initialize with the registry host and repository.
    constructor(registry, repository) {
      this._registry = registry;
      this._repository = repository;
      this._containerRegistry = new _ContainerRegistry(registry, repository);
    }

    get registry() {
      return this._registry;
    }

    get repository() {
      return this._repository;
    }

    setCredentials(username, password) {
      this._containerRegistry.setCredentials(username, password);
    }

    // Gets the all the tags in the repository.
    // returns Promise(list of tags)
    get Tags() {
      return this._containerRegistry.listTags();
    }

    // returns tag => Promise(RemoteImage)
    get Image() {
      return tag => Promise.resolve(new RemoteImage(this._containerRegistry, tag));
    }
  };

  // A remote container image.
  class RemoteImage {

    constructor(containerRegistry, tag) {
      this._containerRegistry = containerRegistry;
      this._tag = tag;

      this._manifestPromise = null;
    }

    // returns Promise(JSON)
    get ManifestJSON() {
      return (async () => (await this._manifest).JSON)();
    }

    // returns Promise(Container.Blob)
    get Config() {
      return (async () => new Blob(this._containerRegistry, (await this._manifest).configDigest))();
    }

    // returns Promise(list of Container.Blob)
    get Layers() {
      return (async () => {
        const manifest = await this._manifest;
        const layerBlobs = [];
        for (let layer of manifest.layers) {
          layerBlobs.push(new Blob(this._containerRegistry, layer.digest));
        }
        return layerBlobs;
      })();
    }

    // returns Promise(_Manifest)
    get _manifest() {
      if (this._manifestPromise === null) {
        this._manifestPromise = (async () => {
          const manifest = await this._containerRegistry.pullManifest(this._tag);
          return _Manifest.parse(manifest);
        })();
      }
      return this._manifestPromise;
    }
  }

  // A blob.
  class Blob {

    constructor(containerRegistry, digest) {
      this._containerRegistry = containerRegistry;
      this._digest = digest;

      this._contentPromise = null;
    }

    // returns Promise(JSON)
    get JSON() {
      return (async () => (await this._blob).json())();
    }

    // returns Promise(ArrayBuffer)
    get arrayBuffer() {
      return (async () => (await this._blob).arrayBuffer())();
    }

    // returns Promise(digest)
    get digest() {
      return Promise.resolve(this._digest);
    }

    // returns Promise(Body)
    get _blob() {
      if (this._contentPromise === null) {
        this._contentPromise = this._containerRegistry.pullBlob(this._digest);
      }
      return this._contentPromise;
    }
  }

  // A registry exception.
  class RegistryError {

    constructor(errorMessage) {
      this._errorMessage = errorMessage;
    }

    get error() {
      return this._errorMessage;
    }
  }

  /**
   * Make calls to a Docker Registry V2 API.
   */
  class _ContainerRegistry {

    constructor(registry, repository) {
      this._registry = registry;
      this._repository = repository;
    }

    setCredentials(username, password) {
      this._credentials = {
        username: username,
        password: password
      };
    }

    // returns Promise(list of tags)
    async listTags() {
      const request = this._makeRequest('/tags/list');
      const response = await request.send();
      const result = await response.json();
      return result.tags;
    }

    // returns Promise(manifest JSON)
    async pullManifest(tag) {
      const request = 
        this._makeRequest('/manifests/' + tag)
          .appendHeader('Accept', 'application/vnd.docker.distribution.manifest.v2+json');
      const response = await request.send();
      return response.json();
    }

    // returns Promise(Body)
    async pullBlob(digest) {
      const request = this._makeRequest('/blobs/' + digest);
      return request.send();
    }

    _makeRequest(apiSuffix) {
      const url = this._makeUrl(apiSuffix);
      const request = _CrossOriginRequest.wrap(url);

      request.setErrorHandler(401, this._make401Handler(request));
      if (this._credentials !== undefined) {
        request.setBasicAuthorization(this._credentials.username, this._credentials.password);
      }
      return request;
    }

    _makeUrl(apiSuffix) {
      const apiPrefix = 'https://' + this._registry + '/v2/' + this._repository;
      return apiPrefix + apiSuffix;
    }

    // Handles 401 Unauthorized by fetching an auth token.
    _make401Handler(request) {
      return async response => {
        const wwwAuthenticate = response.headers.get('WWW-Authenticate');
        const authorizationToken = await _TokenAuthenticator
          .fromWwwAuthenticate(wwwAuthenticate)
          .setRepository(this._repository)
          .fetchToken();
        return request
          .setAuthorizationToken(authorizationToken)
          .setErrorHandler(401, response => {
            throw new RegistryError('authenticate failed even with auth token');
          })
          .send();
      };
    }
  };

  // Sends a cross-origin Request through a cors proxy.
  class _CrossOriginRequest {

    static wrap(url) {
      const _PROXY_PREFIX = 'https://cors-anywhere.herokuapp.com/';
      return new _CrossOriginRequest(_PROXY_PREFIX + url);
    }

    // private
    constructor(url) {
      this._request = new Request(url);
      this._headers = new Headers({
        Origin: '*'
      });

      this._errorHandlers = {};
    }

    setErrorHandler(statusCode, responseHandler) {
      this._errorHandlers[statusCode] = responseHandler;
      return this;
    }

    appendHeader(name, value) {
      this._headers.append(name, value);
      return this;
    }

    setBasicAuthorization(username, password) {
      const base64 = window.btoa(username + ':' + password);
      this._headers.append('Authorization', 'Basic ' + base64);
      return this;
    }

    setAuthorizationToken(token) {
      this._headers.append('Authorization', 'Bearer ' + token);
      return this;
    }

    async send() {
      const response = await fetch(this._request, {
        headers: this._headers
      });
      if (response.status !== 200) {
        if (response.status in this._errorHandlers) {
          return this._errorHandlers[response.status](response);
        }
        throw new RegistryError(
          'Looks like there was a problem. Status Code: ' + response.status);
      }
      return response;
    }
  }

  class _TokenAuthenticator {

    static fromWwwAuthenticate(wwwAuthenticate) {
      console.debug('wwwAuthenticate: ' + wwwAuthenticate);

      const realm = wwwAuthenticate.match(/realm="(.*?)"/)[1];
      const service = wwwAuthenticate.match(/service="(.*?)"/)[1];

      return new _TokenAuthenticator(realm, service);
    }

    // private
    constructor(realm, service) {
      this._realm = realm;
      this._service = service;
      this._includePushScope = false;
    }

    setRepository(repository) {
      this._repository = repository;
      return this;
    }

    setPush() {
      this._includePushScope = true;
      return this;
    }
    unsetPush() {
      this._includePushScope = false;
      return this;
    }

    async fetchToken() {
      const response = await _CrossOriginRequest.wrap(this._makeUrl).send();
      if (response.status !== 200) {
        throw new RegistryError('request failed: ' + response.status);
      }
      const authResponse = await response.json();
      return authResponse.token;
    }

    get _makeUrl() {
      if (this._repository === undefined) {
        throw new RegistryError('repository undefined');
      }

      const permissions = 'pull' + (this._includePushScope ? ',push' : '');
      return this._realm +
          '?service=' + this._service +
          '&scope=repository:' + this._repository + ':' + permissions;
    }
  }

  // Manifest for an image
  class _Manifest {

    static parse(manifestJson) {
      console.debug('Parsing manifest:');
      console.debug(manifestJson);
      if (manifestJson.schemaVersion !== 2) {
        throw new RegistryError('schemaVersion invalid: ' + manifestJson.schemaVersion);
      }

      return new _Manifest(manifestJson, manifestJson.config, manifestJson.layers);
    }

    // private
    constructor(manifestJson, config, layers) {
      this._manifestJson = manifestJson;
      this._config = config;
      this._layers = layers;
    }

    // returns the original JSON for the manifest
    get JSON() {
      return this._manifestJson;
    }

    // returns the `config` field
    get config() {
      return this._config;
    }

    // returns the container configuration blob digest
    get configDigest() {
      return this._config.digest;
    }

    // returns the list of layers
    get layers() {
      return this._layers;
    }
  }

  return exportedClasses();
})();