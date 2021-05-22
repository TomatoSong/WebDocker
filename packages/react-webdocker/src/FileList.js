import React, { useContext, useEffect } from 'react';

import { makeStyles } from '@material-ui/core';
import { TreeView, TreeItem } from '@material-ui/lab';
import { ExpandMore, ChevronRight } from '@material-ui/icons';

import { DockerContext } from './WebDockerContext';

const useStyles = makeStyles({
    root: {
        height: 240,
        flexGrow: 1,
        maxWidth: 400,
    },
});

export const FileList = props => {
    const dockerContext = useContext(DockerContext);
    
    useEffect(() => console.log(dockerContext.processes), [dockerContext.processes])

    const classes = useStyles();
    
    const renderTree = (files, path) => {
        if (!files) {
            return "No files"
        }
        return "Hello"
    }

    return (
        <TreeView
            className={classes.root}
            defaultCollapseIcon={<ExpandMore />}
            defaultExpandIcon={<ChevronRight />}
        >
            {renderTree(dockerContext.processes[1]?.image, "/")}
        </TreeView>
    );
};
