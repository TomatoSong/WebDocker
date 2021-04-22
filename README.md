# WebDocker [![Gitpod ready-to-code](https://img.shields.io/badge/Gitpod-ready--to--code-blue?logo=gitpod)](https://gitpod.io/#https://github.com/TomatoSong/WebDocker)

Container runtime inside your browser, built using [React](https://reactjs.org/) and [Unicorn.js](https://alexaltea.github.io/unicorn.js/). 
We highly customized the system call handler and docker commands in our BrokerOS that runs each process as a Web Worker.

This is a monorepo, so all dependencies will be installed at the project root folder

[Demo](https://webdocker.org/)

## Setup

### One click setup on Gitpod

You can use the following button to setup the project on an online IDE.

It will automatically start the project and expose the port.

[![Open in Gitpod](https://gitpod.io/button/open-in-gitpod.svg)](https://gitpod.io/from-referrer/)

### Manual setup

Makesure you have Node.js v16 with yarn as the package manager. 

Git clone this repo, then run `yarn` in the project root folder.

You will need to build the react-webworker component by `cd packages/react-webdocker` then `yarn build`

Finally you can go to www folder and launch the demo website `cd examples/www` then `yarn start`

To deploy and publish on Cloudflare workers, using `yarn build` then `yarn wrangler publish`

## File Outlines

| File Name        | Description   |
| ---              | ------------- | 
| packages/react-webdocker | React component for webdocker |
| packages/webdocker       | Main CLI interface for the docker |
| examples/www             | Application that demos webdocker |
| &nbsp;&nbsp;&nbsp;&nbsp;examples/www/src/public/cpp    | Some cpp source code and binary to test BrokerOS |
| &nbsp;&nbsp;&nbsp;&nbsp;examples/www/src/public/worker | BrokerOS that runs processes as Web Workers |
| &nbsp;&nbsp;&nbsp;&nbsp;examples/www/src/public/v2     | Docker images served statically following API |

Note: CRA v2 with webpack v4 [#3660](https://github.com/facebook/create-react-app/issues/3660) does not support packing wasm and webworkers without ejecting.

We have to put BrokerOS code inside examples/www/public folder. We will need wait for the CRA support of webpack v5.

## Supported images

* hello-world
* busybox
* bash
* alpine
* alpine/git
* alpine/make
* alpine/socat

### Images to be supported

* cirros
* photon
* toybox
* alpine/openssl
* iron/go

### Supported busybox commands

sh
ash
arch
uname
basename
vi
busybox
yes
cryptpw
bc
cal
clear
date
dirname
dmesg
env
expr
factor
false
getopt
hexedit
hostid
hostname
hush
head
hwclock
i2cdetect
i2cdump
i2cset
i2ctransfer
id
ip
ipcalc
linux32
linux64
mkpasswd
printf
reset
setsid
time
true
uptime
yes

## Contributing

Thank you for your interest in this project!

You can refer to the Roadmap page in [Wiki](https://github.com/TomatoSong/WebDocker/wiki) to help with various parts of the system.

Also you can easily customize almost everypart of this system and add plugins to WebDocker, we can backlink your repo.
