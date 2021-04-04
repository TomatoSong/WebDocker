import React, {useEffect, useState, useRef} from "react";

import { Terminal } from 'xterm';
import 'xterm/css/xterm.css'

import { DockerContext } from "./WebDockerContext";
import { UI } from "./WebDockerUI";

import Kernel from "webdocker";

const Card = () => {
    
    return (
       <DockerContext.Provider value={new Kernel()}>
        <UI />
       </DockerContext.Provider>
    )
}

export default Card;
