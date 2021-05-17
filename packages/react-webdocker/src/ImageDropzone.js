import React, { useContext } from 'react';
import Dropzone from 'react-dropzone';

import { DockerContext } from './WebDockerContext';

const ImageDropzone = props => {
    const dockerContext = useContext(DockerContext);

    const onDrop = acceptedFiles => {
        acceptedFiles.forEach(file => dockerContext.load(file));
    };

    return (
        <Dropzone onDrop={onDrop}>
            {({ getRootProps, getInputProps }) => (
                <div {...getRootProps()}>
                    <input {...getInputProps()} />
                    <p>
                        Drag 'n' drop a docker image that is exported by 'docker
                        save' here, or click to select files
                    </p>
                </div>
            )}
        </Dropzone>
    );
};

export { ImageDropzone };
