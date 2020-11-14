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
	var eax = unicorn.reg_read_i32(uc.X86_REG_EAX);
	var rax = unicorn.reg_read_i64(uc.X86_REG_RAX);
	var ebx = unicorn.reg_read_i32(uc.X86_REG_EBX);
	var esp = unicorn.reg_read_i32(uc.X86_REG_ESP);
	var eip = unicorn.reg_read_i32(uc.X86_REG_EIP);
	var rsp = unicorn.reg_read_i64(uc.X86_REG_RSP);
	var rip = unicorn.reg_read_i64(uc.X86_REG_RIP);

	// Print register values
	document_log("[INFO]: reg_log[eax]: " + eax + " (uint), " + eax.hex() + " (hex)");
	document_log("[INFO]: reg_log[rax]: " + rax + " (uint), " + rax.hex() + " (hex)");
	document_log("[INFO]: reg_log[ebx]: " + ebx + " (uint), " + ebx.hex() + " (hex)");
	document_log("[INFO]: reg_log[esp]: " + esp + " (uint), " + esp.hex() + " (hex)");
	document_log("[INFO]: reg_log[eip]: " + eip + " (uint), " + eip.hex() + " (hex)");
	document_log("[INFO]: reg_log[rsp]: " + rsp + " (uint), " + rsp.hex() + " (hex)");
	document_log("[INFO]: reg_log[rip]: " + rip + " (uint), " + rip.hex() + " (hex)");
}
