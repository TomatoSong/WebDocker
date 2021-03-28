import React, {useEffect, useState} from "react";

import { Terminal } from 'xterm';

export default () => { 

    const [terminal, setTerminal] = useState({});
    
    //const terminalEl = useRef(null);
    
    //useEffect(() => {
    //    terminal.open(terminalEl.current);
    //    terminal.write('Hello from \x1B[1;3;31mxterm.js\x1B[0m $ ')
    //});
    
    return <div id="terminal">aaaa</div>;
}
