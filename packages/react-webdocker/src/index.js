import React, { useEffect, useState, useRef } from 'react';

import { DockerContext } from './WebDockerContext';
import { UI } from './WebDockerUI';

import Kernel from 'webdocker';

const WebDocker = () => {
    const [docker, setDocker] = useState([new Kernel()]);

    const forceRerender = () => {
        setDocker([...docker]);
    };
    docker[0].forceRerender = forceRerender;

    return (
        <DockerContext.Provider value={{ docker: docker[0], forceRerender }}>
            <UI />
        </DockerContext.Provider>
    );
};

export default WebDocker;
