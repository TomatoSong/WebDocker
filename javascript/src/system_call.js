import { syscall_table } from './table_x86_64.js';

export default class SystemCall
{
	constructor(unicorn, terminal, logger)
	{
		this.unicorn = unicorn;
		this.terminal = terminal;
		this.logger = logger;

		this.heap_addr = 0;
		this.data_end = 0;
		this.elf_entry = 0;
		this.continue_arch_prctl_flag = 0;
		this.continue_arch_prctl_rip = 0;
		this.continue_arch_prctl_rax = 0;
		this.continue_arch_prctl_rcx = 0;
		this.continue_arch_prctl_rdx = 0;
		this.continue_arch_prctl_mem = 0;

		this.unicorn.hook_add(uc.HOOK_INSN, this.hook_system_call.bind(this), {}, 1, 0,
							  uc.X86_INS_SYSCALL);
		this.unicorn.hook_add(uc.HOOK_MEM_READ_UNMAPPED,
							  this.hook_unmapped_memory_read.bind(this),
							  {}, 1, 0, 0);

		this.system_call_dictionary = {
			1: this.write.bind(this),
			12: this.brk.bind(this),
			39: this.getpid.bind(this),
			57: this.fork.bind(this),
			60: this.exit.bind(this),
			158: this.arch_prctl.bind(this),
			186: this.gettid.bind(this),
			218: this.set_tid_address.bind(this),
			231: this.exit_group.bind(this)
		};
	}

	write()
	{
		const rdi = this.unicorn.reg_read_i64(uc.X86_REG_RDI);
		const rsi = this.unicorn.reg_read_i64(uc.X86_REG_RSI);
		const rdx = this.unicorn.reg_read_i64(uc.X86_REG_RDX);
		
		if (rdi.num() != 1 && rdi.num() != 2)
		{
			return;
		}

		const buffer = this.unicorn.mem_read(rsi, rdx.num());
		const string = new TextDecoder("utf-8").decode(buffer);
		const string_array = string.split("\n");

		for (var i = 0; i < string_array.length - 1; i ++)
		{
			this.terminal.writeln(string_array[i]);
		}

		this.terminal.write(string_array[string_array.length - 1]);
		this.unicorn.reg_write_i64(uc.X86_REG_RAX, rdx.num());
	}

	brk()
	{
		this.logger.log_to_document("BRK");
		const rdi = this.unicorn.reg_read_i64(uc.X86_REG_RDI);

		if (this.heap_addr == 0)
		{
			this.heap_addr = this.data_end;
		}

		if (rdi.num() < this.heap_addr)
		{
			this.unicorn.reg_write_i64(uc.X86_REG_RAX, this.heap_addr);
			return;
		}

		if (Math.floor((rdi.num()-1) / 4096) > Math.floor((this.heap_addr-1) / 4096)) 
		{
			// Missing Page
			let map_base = (Math.floor((this.heap_addr-1) / 4096)+1)*4096;
			let size = Math.ceil(rdi.num() / 4096)*4096;
			this.unicorn.mem_map(map_base, size-map_base, uc.PROT_ALL);
		}

		this.heap_addr = rdi.num();
		this.unicorn.reg_write_i64(uc.X86_REG_RAX, this.heap_addr);
	}

	getpid()
	{
		this.unicorn.reg_write_i64(uc.X86_REG_RAX, 0);
	}

	fork()
	{
		// Get mem state
		var mem_lower = original.mem_read(0, 0x11f000);
		var mem_higher = original.mem_read(0x800000000000 - 8192, 8192)
		
		// Get CPU state
		var rax = original.reg_read_i64(uc.X86_REG_RAX);
		var rbx = original.reg_read_i64(uc.X86_REG_RBX);
		var rcx = original.reg_read_i64(uc.X86_REG_RCX);
		var rdx = original.reg_read_i64(uc.X86_REG_RDX);
		var rsi = original.reg_read_i64(uc.X86_REG_RSI);
		var rdi = original.reg_read_i64(uc.X86_REG_RDI);
		var rbp = original.reg_read_i64(uc.X86_REG_RBP);
		var rsp = original.reg_read_i64(uc.X86_REG_RSP);
		var r8 = original.reg_read_i64(uc.X86_REG_R8);
		var r9 = original.reg_read_i64(uc.X86_REG_R9);
		var r10 = original.reg_read_i64(uc.X86_REG_R10);
		var r11 = original.reg_read_i64(uc.X86_REG_R11);
		var r12 = original.reg_read_i64(uc.X86_REG_R12);
		var r13 = original.reg_read_i64(uc.X86_REG_R13);
		var r14 = original.reg_read_i64(uc.X86_REG_R14);
		var r15 = original.reg_read_i64(uc.X86_REG_R15);
		var rip = original.reg_read_i64(uc.X86_REG_RIP);
		var eflags = original.reg_read_i32(uc.X86_REG_EFLAGS);
		
		var cloned = new uc.Unicorn(uc.ARCH_X86, uc.MODE_64);

		cloned.set_integer_type(ELF_INT_OBJECT);
		cloned.mem_map(0, 0x11f000, uc.PROT_ALL);
		cloned.mem_write(0, mem_lower);
		cloned.mem_map(0x800000000000 - 8192, 8192, uc.PROT_ALL);
		cloned.mem_write(0x800000000000 - 8192, mem_higher);
		
		cloned.reg_write_i64(uc.X86_REG_RAX, rax);
		cloned.reg_write_i64(uc.X86_REG_RBX, rbx);
		cloned.reg_write_i64(uc.X86_REG_RCX, rcx);
		cloned.reg_write_i64(uc.X86_REG_RDX, rdx);
		cloned.reg_write_i64(uc.X86_REG_RSI, rsi);
		cloned.reg_write_i64(uc.X86_REG_RDI, rdi);
		cloned.reg_write_i64(uc.X86_REG_RBP, rbp);
		cloned.reg_write_i64(uc.X86_REG_RSP, rsp);
		cloned.reg_write_i64(uc.X86_REG_R8, r8);
		cloned.reg_write_i64(uc.X86_REG_R9, r9);
		cloned.reg_write_i64(uc.X86_REG_R10, r10);
		cloned.reg_write_i64(uc.X86_REG_R11, r11);
		cloned.reg_write_i64(uc.X86_REG_R12, r12);
		cloned.reg_write_i64(uc.X86_REG_R13, r13);
		cloned.reg_write_i64(uc.X86_REG_R14, r14);
		cloned.reg_write_i64(uc.X86_REG_R15, r15);
		cloned.reg_write_i32(uc.X86_REG_EFLAGS, eflags);
		
		unicorn = cloned;

		return rip;
	}

	exit()
	{
		const rdi = this.unicorn.reg_read_i64(uc.X86_REG_RDI);

		this.unicorn.emu_stop();

		if (rdi.num() != 0)
		{
			this.terminal.writeln("WARN: program exit with code " + rdi.num() + ".\r\n");
		}
	}

	arch_prctl()
	{
		const rdi = this.unicorn.reg_read_i64(uc.X86_REG_RDI);
		const rsi = this.unicorn.reg_read_i64(uc.X86_REG_RSI);
		const rip = this.unicorn.reg_read_i64(uc.X86_REG_RIP);
		const rax = this.unicorn.reg_read_i64(uc.X86_REG_RAX);
		const rcx = this.unicorn.reg_read_i64(uc.X86_REG_RCX);
		const rdx = this.unicorn.reg_read_i64(uc.X86_REG_RDX);
		this.logger.log_to_document(["PRCTL", rdi.hex(), rsi.hex(), rip.hex()])
		
		// Normal method to write FS
		// const fsmsr = 0xC0000100;
		// const fsmsr = [0x00, 0x01, 0x00, 0xc0, 0xb8, 0xe4, 0x11, 0x00, 0x00, 0x00, 0x00, 0x00];
		// unicorn.reg_write(uc.X86_REG_MSR, fsmsr);
		// console.log(unicorn.reg_read(uc.X86_REG_MSR, 12))
		
		if (this.continue_arch_prctl_rip == rip.num()) 
		{
			this.logger.log_to_document(["Returning", rdi.hex(), rsi.hex(), rip.hex()])
			this.continue_arch_prctl_flag = 0;
			this.continue_arch_prctl_rip = 0;
			this.continue_arch_prctl_rax = 0;
			this.continue_arch_prctl_rcx = 0;
			this.continue_arch_prctl_rdx = 0;
			this.continue_arch_prctl_mem = 0;
			this.unicorn.reg_write_i64(uc.X86_REG_RAX, 0);

			return;
		}

		this.continue_arch_prctl_flag = 1;
		this.continue_arch_prctl_rip = rip.num();
		this.continue_arch_prctl_rax = rax;
		this.continue_arch_prctl_rcx = rcx;
		this.continue_arch_prctl_rdx = rdx;
		this.continue_arch_prctl_mem = this.unicorn.mem_read(this.elf_entry, 5);
		this.unicorn.reg_write_i64(uc.X86_REG_RAX, rsi);
		this.unicorn.reg_write_i64(uc.X86_REG_RDX, 0);
		this.unicorn.reg_write_i64(uc.X86_REG_RCX, 0xC0000100);
		this.unicorn.mem_write(this.elf_entry, [0x0f, 0x30, 0x90, 0x90, 0x90]);
		this.logger.log_to_document(["PRCTLSTOP", rdi.hex(), rsi.hex(), rip.hex()]);

		this.unicorn.emu_stop();

		return;
	}

	gettid()
	{
		this.unicorn.reg_write_i64(uc.X86_REG_RAX, 0);
	}

	set_tid_address()
	{
	}

	exit_group()
	{
		this.exit();
	}

	hook_system_call()
    {
		const rax = this.unicorn.reg_read_i64(uc.X86_REG_RAX);

        if (!this.system_call_dictionary[rax.num()])
        {
			this.terminal.writeln("ERROR: missing system call: " 
			+ rax.num() + " " + syscall_table[rax.num()] + ".");
            return;
        }

		this.system_call_dictionary[rax.num()]();
	}
	
	hook_unmapped_memory_read()
	{
		this.logger.log_to_document("[ERROR]: unmapped memory read.");
		this.logger.log_register(this.unicorn);
	}
}
