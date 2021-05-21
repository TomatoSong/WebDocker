import React, { useContext } from 'react';

import { Button } from '@material-ui/core';

import { DockerContext } from './WebDockerContext';

const AddDevice = props => {
    const dockerContext = useContext(DockerContext);

    const onClick = () => {
        dockerContext.mapUSBDevice();
    };

    return <Button variant="contained" onClick={onClick}>Add USB Devices</Button>;
};

export { AddDevice };
