String.prototype.insert = function (idx, str) {
    return this.slice(0, idx) + str + this.slice(idx);
};

String.prototype.remove = function (idx) {
    return this.slice(0, idx - 1) + this.slice(idx);
};

export default class Shell {
    constructor(kernel, term) {
        // headless mode
        this.kernel = kernel;
        this.term = term;

        this.trapped = false;
        this.trapped_pid = -1;
        this.pid_tmux = -1;
        this.buffer = '';
        this.cursor = 0;
        this.source = 'WebDocker$ ';
        this.ignoreCode = [38, 40]; // 38: arrow up, 40: arrow down
        this.history_command = [];
        this.history_cursor = 0;

        this.init();
        this.reset_buffer();
        this.term.onKey(e => this.onKey(e));
    }

    prompt() {
        this.write(this.source);
    }

    write(string) {
        this.term.write(string);
    }

    writeln(string) {
        this.term.writeln(string);
    }

    reset_buffer() {
        this.buffer = 'docker run hello-world';
        this.buffer = '';
        this.cursor = 0;
    }

    on_ctrl(keyCode) {
        switch (keyCode) {
            case 67: {
                // Ctrl+C
                this.writeln('');
                this.writeln('INFO: received signal: "Ctrl+C".');
                this.prompt();
                break;
            }
            case 90: {
                // Ctrl+Z
                this.writeln('');
                this.writeln('INFO: received signal: "Ctrl+Z".');
                this.prompt();
                break;
            }
            case 220: {
                // Ctrl+\
                this.writeln('');
                this.writeln('INFO: received signal: "Ctrl+\\".');
                this.prompt();
                break;
            }
        }
    }

    init() {
        this.writeln('Welcome to WebDocker!');
        this.writeln('Type `help` for help');
        this.writeln('Usage:  docker run IMAGE [COMMAND] [ARG...]');
        this.writeln('E.g.:  docker run library/hello-world');
        this.writeln('Run a command in a new container');
        this.writeln('');
        this.prompt();
    }

    onCmd(buffer) {
        let buffer_array = buffer.split(' ');

        if (buffer_array[0] == 'help') {
            this.kernel.help();
            this.prompt();
        } else if (buffer_array[0] == 'docker') {
            if (buffer_array[1] && buffer_array[1] == 'run') {
                if (!buffer_array[2] || buffer_array[2] == '') {
                    this.writeln('ERROR: invalid docker image name.');
                    this.prompt();
                } else {
                    let image = buffer_array[2];
                    let args = buffer_array.slice(3);

                    this.kernel.run(image, args);
                }
            } else {
                this.writeln('ERROR: invalid docker command.');
                this.prompt();
            }
        } else if (buffer_array[0] == '') {
            this.prompt();
        }
    }

    onKey(e) {
        const ev = e.domEvent;
        const printable = !ev.altKey && !ev.ctrlKey && !ev.metaKey;

        if (ev.ctrlKey) {
            this.reset_buffer();
            this.on_ctrl(ev.keyCode);
            return;
        }

        if (this.ignoreCode.includes(ev.keyCode) || !printable) {
            return;
        }

        switch (ev.keyCode) {
            case 13: {
                // enter
                this.writeln('');

                if (this.trapped == true) {
                    this.trapped = false;
                    this.kernel.processes[this.trapped_pid].buffer =
                        this.buffer;
                    this.kernel.processes[this.trapped_pid].trapped = false;
                    this.kernel.processes[
                        this.trapped_pid
                    ].workerProcess.postMessage({
                        type: 'READ_TERMINAL',
                        payload: this.buffer,
                    });
                    this.reset_buffer();
                } else {
                    this.onCmd(this.buffer);
                }

                this.reset_buffer();

                break;
            }
            case 8: {
                // backspace
                if (this.cursor > 0) {
                    this.buffer = this.buffer.remove(this.cursor);
                    this.write('\b\x1b[1P');
                    this.cursor--;
                }

                break;
            }
            case 37: {
                // arrow left
                if (
                    this.cursor + this.source.length >= this.term.cols &&
                    (this.cursor + this.source.length) % this.term.cols == 0
                ) {
                    this.write(`\x1b[A`);
                    this.write(`\x1b[${this.term.cols}G`);
                } else if (this.cursor > 0) {
                    this.write('\b');
                } else {
                    return;
                }

                this.cursor--;

                break;
            }
            case 39: {
                // arrow right
                if (
                    (this.cursor + this.source.length) % this.term.cols ==
                    this.term.cols - 1
                ) {
                    this.writeln('');
                } else if (this.cursor < this.buffer.length) {
                    this.write(`\x1b[1C`);
                } else {
                    return;
                }

                this.cursor++;

                break;
            }
            default: {
                if (this.cursor == this.buffer.length) {
                    if (
                        (this.buffer.length + this.source.length) %
                            this.term.cols ==
                        this.term.cols - 1
                    ) {
                        this.write(e.key);
                        this.buffer += e.key;
                        this.writeln('');
                    } else {
                        this.write(e.key);
                        this.buffer += e.key;
                    }
                } else if (this.cursor < this.buffer.length) {
                    this.write(`\x1b[1@`);
                    this.write(e.key);
                    this.buffer = this.buffer.insert(this.cursor, e.key);
                } else {
                    return;
                }

                this.cursor++;

                break;
            }
        }
    }
}
