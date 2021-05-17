import React, { useEffect, useState, useRef, useContext } from 'react';

import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';

import { Paper, Grid } from '@material-ui/core';

import { DockerContext } from './WebDockerContext';

import { ImageDropzone } from './ImageDropzone';

const UI = () => {
    const [terminal, setTerminal] = useState(
        new Terminal({
            convertEol: true,
        })
    );

    const terminalEl = useRef(null);

    const dockerContext = useContext(DockerContext);

    useEffect(() => {
        if (terminalEl.current) {
            const fitAddon = new FitAddon();
            terminal.loadAddon(fitAddon);
            terminal.open(terminalEl.current);
            terminal.focus();
            fitAddon.fit();
            terminal.write('Hello from \x1B[1;3;31mxterm.js \x1B[0m $ ');
            dockerContext.attachTerminal(terminal);
        }
    }, [terminalEl.current]);

    return (
        <div>
            <Grid container space={3}>
                <Grid item xs={6}>
                    <div ref={terminalEl} id="terminal"></div>
                </Grid>
                <Grid item xs={6}>
                    <div id="panel"></div>
                    <ImageDropzone />
                </Grid>
            </Grid>
        </div>
    );
};

export { UI };
