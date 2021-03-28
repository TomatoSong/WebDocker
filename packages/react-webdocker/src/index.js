import React, {useEffect, useState, useRef} from "react";

import { Terminal } from 'xterm';
import 'xterm/css/xterm.css'

const Card = () => { 

    const [terminal, setTerminal] = useState(new Terminal());
    
    const terminalEl = useRef(null);
    
    useEffect(() => {
        if (terminalEl.current) {
          terminal.open(terminalEl.current);
          terminal.write('Hello from \x1B[1;3;31mxterm.js\x1B[0m $ ')
       }
    }, [terminalEl.current]);
    
    return (<div ref={terminalEl} id="terminal"></div>)
}

export default Card;
