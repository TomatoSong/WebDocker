import React, {useEffect, useState, useRef, useContext} from "react";

import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css'

import { DockerContext } from "./WebDockerContext";

const UI = () => { 

    const [terminal, setTerminal] = useState(new Terminal({
      convertEol: true
    }));
    
    const terminalEl = useRef(null);
    
    const dockerContext = useContext(DockerContext)
    
    
    useEffect(() => {
        if (terminalEl.current) {
          const fitAddon = new FitAddon();
          terminal.loadAddon(fitAddon)
          terminal.open(terminalEl.current);
          terminal.focus()
          fitAddon.fit()
          terminal.write('Hello from \x1B[1;3;31mxterm.jsaabbccdd \x1B[0m $ ')
          dockerContext.attachTerminal(terminal)
       }
    }, [terminalEl.current]);
    
    return (
        <div>
          <div ref={terminalEl} id="terminal"></div>
          <div id="panel"></div>
        </div>
    )
}

export { UI };
