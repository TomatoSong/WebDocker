import React, { useEffect, useState, useRef, useContext, useMemo } from 'react';

import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';

import { Paper, Grid } from '@material-ui/core';

import { DockerContext } from './WebDockerContext';

import { ControlPanel } from './ControlPanel';

const UI = () => {
    const [terminal, setTerminal] = useState(
        new Terminal({
            convertEol: true,
        })
    );

    const terminalEl = useRef(null);

    const { docker, forceRerender } = useContext(DockerContext);

    const [terminalDiv, setTerminalDiv] = useState(
        <div ref={terminalEl} id="terminal"></div>
    );

    useEffect(() => {
        if (terminalEl.current) {
            const fitAddon = new FitAddon();
            terminal.loadAddon(fitAddon);
            terminal.open(terminalEl.current);
            terminal.focus();
            fitAddon.fit();
            terminal.write('Hello from \x1B[1;3;31mxterm.js \x1B[0m $ ');
            docker.startShell(terminal);
        }
    }, [terminalEl.current]);

    return (
        <div>
            <Grid container space={3}>
                <Grid item xs={6}>
                    {terminalDiv}
                </Grid>
                <Grid item xs={6}>
                    <ControlPanel />
                </Grid>
            </Grid>
        </div>
    );
};

export { UI };
