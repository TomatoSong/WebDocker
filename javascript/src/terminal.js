String.prototype.insert = function(idx, str)
{
	return this.slice(0, idx) + str + this.slice(idx);
};

String.prototype.remove = function(idx)
{
	return this.slice(0, idx - 1) + this.slice(idx);
};

export default class WebDockerTerminal {
	constructor(onCmd, onCtrl) {
		this.onCmd = onCmd;
		this.onCtrl = onCtrl;
		this.term= new Terminal();
		this.fit_addon = new FitAddon.FitAddon();
		this.source = "WebDocker$ ";

		this.init();

		this.buffer = "";
		this.cursor = 0;
		this.ignoreCode = [38, 40]; // 38: arrow up, 40: arrow down
	}

	prompt() {
		this.term.write(this.source);
	}

	write(str) {
		this.term.write(str);
	}

	resetBuffer() {
		this.buffer = "";
		this.cursor = 0;
		this.term.writeln("");
		this.prompt();
	}

	init() {
		this.term.loadAddon(this.fit_addon);
		this.term.open(document.getElementById("container_terminal"));
		this.term.focus()
		this.fit_addon.fit();

		if (this.term._initialized)
			return;

		this.term.writeln("Welcome to WebDocker!");
		this.term.writeln("Use docker run <img> <cmd> to run a docker image.");
		this.term.writeln("");
		this.prompt();	
	}

	start() {
		this.term.onKey((e) => {
			const ev = e.domEvent;
			const printable = !ev.altKey && !ev.ctrlKey && !ev.metaKey;

			if (ev.ctrlKey) 
			{
				this.onCtrl(ev.keyCode);
				this.resetBuffer();
				return;
			}
			
			if (this.ignoreCode.includes(ev.keyCode) || !printable)
				return;
			
			switch (ev.keyCode){
				case 13: // enter
				{
					if (this.buffer != "")
						this.onCmd(this.buffer);
					this.resetBuffer();
					break;
				}
				case 8: // backspace
				{
					if (this.cursor > 0)
					{
						this.buffer = this.buffer.remove(this.cursor);
						this.term.write('\b\x1b[1P');
						this.cursor --;
					}
					break;
				}
				case 37: // arrow left
				{
					if ((this.cursor + this.source.length) >= this.term.cols && 
						(this.cursor + this.source.length) % this.term.cols == 0)
						{
							this.term.write(`\x1b[A`);
							this.term.write(`\x1b[${this.term.cols}G`);
						}
					else if (this.cursor > 0)
						this.term.write('\b');
					else
						return;

					this.cursor --;
					break;
				}
				case 39: // arrow right
				{
					if ((this.cursor + this.source.length) % this.term.cols == this.term.cols - 1)
						this.term.write("\r\n");
					else if (this.cursor < this.buffer.length)
						this.term.write(`\x1b[1C`);
					else
						return;

					this.cursor ++;
					break;
				}
				default:
				{
					if (this.cursor == this.buffer.length)
					{
						if ((this.buffer.length + this.source.length) % this.term.cols == this.term.cols - 1)
						{
							this.term.write(e.key);
							this.buffer += e.key;
							this.term.write("\r\n");
						}
						else
						{
							this.term.write(e.key);
							this.buffer += e.key;
						}
					}
					else if (this.cursor < this.buffer.length)
					{
						this.term.write(`\x1b[1@`);
						this.term.write(e.key);
						this.buffer = this.buffer.insert(this.cursor, e.key);
					}
					else
						return;

					this.cursor ++;
					break;
				}
			}
		})
	}
}