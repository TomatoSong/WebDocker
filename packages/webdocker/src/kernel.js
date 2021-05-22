import ImageManager from './imageManager.js';
import Process from './process.js';
import Shell from './shell.js';

export default class Kernel {
    constructor() {
        this.imageManager = new ImageManager();
        this.processes = {};
        this.terminal = null;
        this.shell = null;
        this.forceRerender = () => {};
    }

    write(string) {
        this.terminal?.write(string);
    }

    writeln(string) {
        this.terminal?.writeln(string);
    }

    help() {
        this.writeln(
            'Currently only support minimal images hello-world, busybox, alpine'
        );
        this.writeln(
            'docker registry url URL to set registry. e.g. docker registry url registry.docker.io'
        );
        this.writeln(
            'docker registry proxy PROXY to set CORS proxy. e.g. docker registry url https://www.simonyu.net:3000'
        );
        this.writeln(
            'docker registry username USERNAME if registry requires login, otherwise leave blank'
        );
        this.writeln('docker registry password PASSWORD to set credential');
    }

    startShell(terminal) {
        this.terminal = terminal;
        this.shell = new Shell(this, this.terminal);
    }

    load(file) {}

    run(image, args, options) {
        if (image.indexOf('/') === -1) {
            image = 'library/' + image;
        }
        this.imageManager
            .openImage(image, args)
            .then(image => {
                console.log(image);
                let pid = this.get_new_pid();
                let process = new Process(pid, this, image);
                process.start(args);
                this.processes[pid] = process;
            })
            .then(() => {
                this.forceRerender();
            })
            .catch(error => {
                console.log(error);
                this.writeln('ERROR: ' + error._errorMessage + '.');
            });
    }

    get_new_pid() {
        const max_pid = Math.max(...Object.keys(this.processes));
        return max_pid === -Infinity ? 1 : max_pid + 1;
    }

    mapUSBDevice() {
        if (navigator.usb) {
            navigator.usb
                .requestDevice({ filters: [] })
                .then(usbDevice =>
                    console.log('Produce name' + usbDevice.produceName)
                )
                .catch(e => console.log('There is no device .' + e));
        }
    }
}
