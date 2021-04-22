# WebDocker [![Gitpod ready-to-code](https://img.shields.io/badge/Gitpod-ready--to--code-blue?logo=gitpod)](https://gitpod.io/#https://github.com/TomatoSong/WebDocker)

Container runtime inside your browser.
This is a monorepo, so all dependencies will be installed at the project root folder

[Demo](https://webdocker.org)

## Setup

### One click setup on Gitpod

You can use the following button to setup the project on an online IDE.

It will automatically start the project and expose the port.

[![Open in Gitpod](https://gitpod.io/button/open-in-gitpod.svg)](https://gitpod.io/from-referrer/)

### Manual setup

Makesure you have NodeJS v14 with `yarn` as the package manager. 

Git clone this repo, then run `yarn` in the repo folder.

You will need to build the react-webworker component by `cd packages/react-webdocker` then `yarn build`

Finally you can go to www folder and launch the demo website `cd examples/www` then `yarn start`

The www application is deployed to Cloudflare workers, using `yarn build` then `yarn wrangler publish`

## File Outlines

Main application is in the examples/www folder

React and webdocker/brokeros is in the packages folder

!!Since Create react app does not support packing wasm and webworkers, some of the code are put in the examples/www/public folder



Supported images
alpine
bash
busybox
alpine/git
alpine/make
alpine/socat

Images to be supported
cirros
alpine/openssl
photon
toybox
iron/go


Supported busybox commands:
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
