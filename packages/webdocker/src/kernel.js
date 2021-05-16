import ImageManager from './imageManager.js';
import Process from './process.js';
import Shell from './shell.js';

export default class Kernel {
    constructor() {
        // Launch shell or we will run in headless mode
        // Terminal should be defined here in kernel and passed to sheel
        //, instead of shell
        this.imageManager = new ImageManager();
        this.processes = {};
        this.terminal = null;
        this.shell = null;
    }

    write(string) {
        this.shell.term.write(string);
    }

    writeln(string) {
        this.shell.term.writeln(string);
    }

    format_cmd(command) {
        if (command.length > 0) {
            command[0] = command[0].replace(/"/g, '');
            command[0] = command[0].replace(/'/g, '');
            command[command.length - 1] = command[command.length - 1].replace(
                /"/g,
                ''
            );
            command[command.length - 1] = command[command.length - 1].replace(
                /'/g,
                ''
            );
        }

        if (command.length > 1) {
            command[1] = command[1].replace(/"/g, '');
            command[1] = command[1].replace(/'/g, '');
        }

        return command;
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

    attachTerminal(terminal) {
        this.terminal = terminal;
        this.shell = new Shell(this, this.terminal);
    }

    //These should be moved to shell!
    onCmd(buffer) {
        let buffer_array = buffer.split(' ');

        if (buffer === 'fg') {
            this.writeln('INFO: received command: "fg".');
            this.shell.prompt();
        } else if (buffer === 'jobs') {
            this.writeln('INFO: received command: "jobs".');
            this.shell.prompt();
        } else if (buffer_array[0] == 'debug') {
            if (buffer_array[1] && buffer_array[1] == 'on') {
                document.getElementById('container_debug').style.display =
                    'block';
            } else if (buffer_array[1] && buffer_array[1] == 'off') {
                document.getElementById('container_debug').style.display =
                    'none';
            } else {
                this.writeln('ERROR: invalid debug setting.');
            }

            this.shell.prompt();
        } else if (buffer_array[0] == 'help') {
            this.help();
            this.shell.prompt();
        } else if (buffer_array[0] == 'docker') {
            if (buffer_array[1] && buffer_array[1] == 'run') {
                if (!buffer_array[2] || buffer_array[2] == '') {
                    this.writeln('ERROR: invalid docker image name.');
                    this.shell.prompt();
                } else {
                    let image = buffer_array[2];
                    if (image.indexOf('/') === -1) {
                        image = 'library/' + image;
                    }
                    let args = buffer_array.slice(3);
                    args = this.format_cmd(args);

                    this.imageManager
                        .openImage(image, args)
                        .then(image => {
                            console.log(image);
                            let pid = this.get_new_pid();
                            let process = new Process(pid, this, image);
                            process.start(args);
                            this.processes[pid] = process;
                        })
                        .catch(error => {
                            console.log(error);
                            this.writeln('ERROR: ' + error._errorMessage + '.');
                        });
                }
            } else if (buffer_array[1] == 'registry') {
                if (buffer_array[2] && buffer_array[2] == 'url') {
                    if (buffer_array[3] && buffer_array[3] != '') {
                        this.imageManager.registry_url = buffer_array[3];
                        this.imageManager.registry_username = '';
                        this.imageManager.registry_password = '';
                    } else {
                        this.writeln('ERROR: invalid docker registry URL.');
                    }
                } else if (buffer_array[2] && buffer_array[2] == 'proxy') {
                    if (buffer_array[3] && buffer_array[3] != '') {
                        this.imageManager.registry_proxy = buffer_array[3];
                    } else {
                        this.writeln('ERROR: invalid docker registry proxy.');
                    }
                } else if (buffer_array[2] && buffer_array[2] == 'username') {
                    if (buffer_array[3] && buffer_array[3] != '') {
                        this.imageManager.registry_username = buffer_array[3];
                    } else {
                        this.imageManager.registry_username = '';
                    }
                } else if (buffer_array[2] && buffer_array[2] == 'password') {
                    if (buffer_array[3] && buffer_array[3] != '') {
                        this.imageManager.registry_password = buffer_array[3];
                    } else {
                        this.imageManager.registry_password = '';
                    }
                } else {
                    this.writeln('ERROR: invalid docker registry command.');
                }

                this.shell.prompt();
            } else {
                this.writeln('ERROR: invalid docker command.');
                this.shell.prompt();
            }
        } else if (buffer_array[0] == '') {
            this.shell.prompt();
        } else {
            let command = buffer_array;
            command = this.format_cmd(command);
            this.imageManager.command = command;

            this.imageManager.openFile(command[0]).then(image => {
                console.log(image);
                let pid = this.get_new_pid();
                let process = new Process(pid, this, image);
                command[0] = '/' + command[0];
                process.start(command);
                this.processes[pid] = process;
            });
        }
    }

    get_new_pid() {
        const max_pid = Math.max(...Object.keys(this.processes));
        return max_pid === -Infinity ? 1 : max_pid + 1;
    }
}
