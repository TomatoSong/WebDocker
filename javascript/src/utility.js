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
    var rbx = unicorn.reg_read_i64(uc.X86_REG_RBX);
    var rcx = unicorn.reg_read_i64(uc.X86_REG_RCX);
    var rdx = unicorn.reg_read_i64(uc.X86_REG_RDX);
    var rsi = unicorn.reg_read_i64(uc.X86_REG_RSI);
    var rdi = unicorn.reg_read_i64(uc.X86_REG_RDI);
    var rbp = unicorn.reg_read_i64(uc.X86_REG_RBP);
    var rsp = unicorn.reg_read_i64(uc.X86_REG_RSP);
    var r8 = unicorn.reg_read_i64(uc.X86_REG_R8);
    var r9 = unicorn.reg_read_i64(uc.X86_REG_R9);
    var r10 = unicorn.reg_read_i64(uc.X86_REG_R10);
    var r11 = unicorn.reg_read_i64(uc.X86_REG_R11);
    var r12 = unicorn.reg_read_i64(uc.X86_REG_R12);
    var r13 = unicorn.reg_read_i64(uc.X86_REG_R13);
    var r14 = unicorn.reg_read_i64(uc.X86_REG_R14);
    var r15 = unicorn.reg_read_i64(uc.X86_REG_R15);
    var rip = unicorn.reg_read_i64(uc.X86_REG_RIP);
    var eflags = unicorn.reg_read_i32(uc.X86_REG_EFLAGS);

	// Print register values
	document_log("[INFO]: reg_log[rax]: " + rax.hex() + " (hex), " + rax + " (uint)");
	document_log("[INFO]: reg_log[rbx]: " + rbx.hex() + " (hex), " + rbx + " (uint)");
	document_log("[INFO]: reg_log[rcx]: " + rcx.hex() + " (hex), " + rcx + " (uint)");
	document_log("[INFO]: reg_log[rdx]: " + rdx.hex() + " (hex), " + rdx + " (uint)");
	document_log("[INFO]: reg_log[rsi]: " + rsi.hex() + " (hex), " + rsi + " (uint)");
	document_log("[INFO]: reg_log[rdi]: " + rdi.hex() + " (hex), " + rdi + " (uint)");
	document_log("[INFO]: reg_log[rbp]: " + rbp.hex() + " (hex), " + rbp + " (uint)");
	document_log("[INFO]: reg_log[rsp]: " + rsp.hex() + " (hex), " + rsp + " (uint)");
	document_log("[INFO]: reg_log[rip]: " + rip.hex() + " (hex), " + rip + " (uint)");
	document_log("[INFO]: eflags_log[eflags]: " + eflags.hex() + " (hex), " + eflags + " (uint)");
}
