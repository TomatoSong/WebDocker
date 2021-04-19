[![Gitpod ready-to-code](https://img.shields.io/badge/Gitpod-ready--to--code-blue?logo=gitpod)](https://gitpod.io/#https://github.com/TomatoSong/WebDocker)

Main application is in the examples/www folder
React and webdocker/brokeros is in the packages folder

!!Since Create react app does not support packing wasm and webworkers, some of the code are put in the examples/www/public folder

This is a monorepo, so yarn will install dependencies at the root folder
Then go to packages/react-webdocker to use yarn build to build the dependencies
Go to examples/www to use yarn start to start the example
Finally use yarn build && yarn wrangler publish to publish

# WebDocker

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
