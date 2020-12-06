export default class Logger
{
 	constructor()
	{
		this.document_log = "";
	}

	log_to_document(string)
	{
		this.document_log += string;
		this.document_log += "<br>";

		document.getElementById("logger").innerHTML = this.document_log;
	}

	log_memory(unicorn, address, size)
	{
		var buffer = unicorn.mem_read(address, size);
		var string = "[INFO]: memory[0x" + address.toString(16) + ", " + size + "]: ";

		for (var i = 0; i < size; i ++)
		{		
			string += ("0" + buffer[i].toString(16)).substr(-2) + " ";
		}

		this.log_to_document(string);
	}

	log_register(unicorn)
	{
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

		this.log_to_document("[INFO]: register[rax]: " +
							 rax.hex() + " (hex), " + rax + " (uint)");
		this.log_to_document("[INFO]: register[rbx]: " +
							 rbx.hex() + " (hex), " + rbx + " (uint)");
		this.log_to_document("[INFO]: register[rcx]: " +
							 rcx.hex() + " (hex), " + rcx + " (uint)");
		this.log_to_document("[INFO]: register[rdx]: " +
							 rdx.hex() + " (hex), " + rdx + " (uint)");
		this.log_to_document("[INFO]: register[rsi]: " +
							 rsi.hex() + " (hex), " + rsi + " (uint)");
		this.log_to_document("[INFO]: register[rdi]: " +
							 rdi.hex() + " (hex), " + rdi + " (uint)");
		this.log_to_document("[INFO]: register[rbp]: " +
							 rbp.hex() + " (hex), " + rbp + " (uint)");
		this.log_to_document("[INFO]: register[rsp]: " +
							 rsp.hex() + " (hex), " + rsp + " (uint)");
		this.log_to_document("[INFO]: register[rip]: " +
							 rip.hex() + " (hex), " + rip + " (uint)");
		this.log_to_document("[INFO]: register[efl]: " +
							 eflags.hex() + " (hex), " + eflags + " (uint)");
	}
}
