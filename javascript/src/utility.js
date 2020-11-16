function document_log(log)
{
	if (!this.string)
	{
		this.string = "";
	}

	if (this.string !== "")
	{
		this.string += "<br>";
	}

	this.string += log;
	document.getElementById("elf_loader").innerHTML = this.string;
}

function mem_log(unicorn, address, size)
{
	var buffer = unicorn.mem_read(address, size);
	var string = "[INFO]: mem_log[0x" + address.toString(16) + ", " + size + "]: ";

	for (var i = 0; i < size; i ++)
	{		
		string += ("0" + buffer[i].toString(16)).substr(-2) + " ";
	}

	document_log(string);
}

function reg_log(unicorn)
{
	// Read register values
	var rax = unicorn.reg_read_i64(uc.X86_REG_RAX);
	var rsp = unicorn.reg_read_i64(uc.X86_REG_RSP);
	var rip = unicorn.reg_read_i64(uc.X86_REG_RIP);

	// Print register values
	document_log("[INFO]: reg_log[rax]: " + rax.hex() + " (hex), " + rax + " (uint)");
	document_log("[INFO]: reg_log[rsp]: " + rsp.hex() + " (hex), " + rsp + " (uint)");
	document_log("[INFO]: reg_log[rip]: " + rip.hex() + " (hex), " + rip + " (uint)");
}
