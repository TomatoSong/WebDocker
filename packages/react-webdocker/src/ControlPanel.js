import React, { useContext } from 'react';

import {
    makeStyles,
    Drawer,
    Divider,
    List,
    ListItem,
    ListItemText,
} from '@material-ui/core';
import { DockerContext } from './WebDockerContext';

import { ImageDropzone } from './ImageDropzone';
import { AddDevice } from './AddDevice';
import { FileList } from './FileList';
import { ControlPanelTabs } from './ControlPanelTabs';

const useStyles = makeStyles(() => ({ root: { width: 150 } }));

const ControlPanel = props => {
    const classes = useStyles();
    const dockerContext = useContext(DockerContext).docker;

    return (
        <>
            <ControlPanelTabs />
            <div className={classes.root}>
                <List>
                    <ListItem button>
                        <ListItemText primary="busybox" />
                    </ListItem>
                    <ListItem button>
                        <ListItemText primary="Add container" />
                    </ListItem>
                </List>
                <Divider />
                <List>
                    <ListItem button>
                        <ListItemText primary="Image Management" />
                    </ListItem>
                </List>
            </div>
            <ImageDropzone />
            <AddDevice />
            <FileList />
        </>
    );
};

export { ControlPanel };
