import React, {useEffect, useState, useRef} from "react";

import { DockerContext } from "./WebDockerContext";
import { UI } from "./WebDockerUI";

import Kernel from "webdocker";

const WebDocker = () => {
    
    return (
       <DockerContext.Provider value={new Kernel()}>
        <UI />
       </DockerContext.Provider>
    )
}

export default WebDocker;
