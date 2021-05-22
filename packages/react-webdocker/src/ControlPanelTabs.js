import React, { useContext } from 'react';

import { Tabs, Tab, AppBar } from '@material-ui/core';
import { DockerContext } from './WebDockerContext';

const ControlPanelTabs = props => {
    const dockerContext = useContext(DockerContext).docker;

    return (
        <div>
            <AppBar position="static" color="default">
                <Tabs scrollButtons="auto">
                    <Tab label="File" />
                    <Tab label="Device" />
                    <Tab label="Network" />
                    <Tab label="Advanced" />
                </Tabs>
            </AppBar>
        </div>
    );
};

export { ControlPanelTabs };
