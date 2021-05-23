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
    const dockerContext = useContext(DockerContext).docker;

    const classes = useStyles();

    const renderTree = (files, currentPath) => {
        if (!files) {
            return 'No files';
        }
        const level = (currentPath.match(/\//g) || []).length;
        const folders = Object.keys(files).filter(
            path =>
                (path.match(/\//g) || []).length == level + 1 &&
                path.slice(-1) == '/'
        );

        return folders.map(folder => (
            <TreeItem key={folder} label={folder} nodeId={folder} />
        ));
    };

    return (
        <TreeView
            className={classes.root}
            defaultCollapseIcon={<ExpandMore />}
            defaultExpandIcon={<ChevronRight />}
        >
            {renderTree(dockerContext.processes['1']?.image?.files, '')}
        </TreeView>
    );
};
