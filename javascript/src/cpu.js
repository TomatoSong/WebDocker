import writeToTerm from './terminal.js';
import './utility.js';
// import '../lib/unicorn.js';

export default class Process {
    constructor(filename, file, args) {
        this.filename = filename;
        this.file = file;
        this.args = args;
        this.unicorn = new uc.Unicorn(uc.ARCH_X86, uc.MODE_64);
        this.unicorn.set_integer_type(ELF_INT_OBJECT);
        this.heap_addr = 0;
        this.data_end = 0;
        this.unicorn.hook_add(uc.HOOK_INSN, this.hook_system_call, {}, 1, 0, uc.X86_INS_SYSCALL);
		this.unicorn.hook_add(uc.HOOK_MEM_READ_UNMAPPED, this.hook_mem_issue, {}, 1, 0, 0);

		this.system_call_dictionary = {
			1: this.write,
			12: this.brk,
			39: this.getpid,
			60: this.exit,
			158: this.arch_prctl,
			186: this.gettid,
			218: this.set_tid_address,
			231: this.exit_group
		};

		this.continue_arch_prctl_flag = 0;
		this.continue_arch_prctl_rip = 0;
		this.continue_arch_prctl_rax = 0;
		this.continue_arch_prctl_rcx = 0;
		this.continue_arch_prctl_rdx = 0;
		this.continue_arch_prctl_mem = 0;
	}
	
	write()
	{
		const rsi = this.unicorn.reg_read_i64(uc.X86_REG_RSI);
		const rdx = this.unicorn.reg_read_i64(uc.X86_REG_RDX);

		const buffer = this.unicorn.mem_read(rsi, rdx.num());
		console.log(buffer);
		const string = new TextDecoder("utf-8").decode(buffer);
		const string_array = string.split("\n");

		for (var i = 0; i < string_array.length - 1; i ++)
			writeToTerm(string_array[i]);

		writeToTerm(string_array[string_array.length - 1]);
	}

	brk()
	{
		document_log("BRK");
		const rdi = this.unicorn.reg_read_i64(uc.X86_REG_RDI);

		if (this.heap_addr == 0) {
			this.heap_addr = this.data_end;
		}

		if (rdi.num() < this.heap_addr)
		{
			this.unicorn.reg_write_i64(uc.X86_REG_RAX, this.heap_addr);
			return;
		}

		if (Math.floor((rdi.num()-1) / 4096) > Math.floor((this.heap_addr-1) / 4096)) {
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

	exit()
	{
		const rdi = this.unicorn.reg_read_i64(uc.X86_REG_RDI);

		this.unicorn.emu_stop();

		if (rdi.num() != 0)
			writeToTerm("WARN: program exit with code " + rdi.num() + ".");
	}

	arch_prctl()
	{
		const rdi = this.unicorn.reg_read_i64(uc.X86_REG_RDI);
		const rsi = this.unicorn.reg_read_i64(uc.X86_REG_RSI);
		const rip = this.unicorn.reg_read_i64(uc.X86_REG_RIP);
		const rax = this.unicorn.reg_read_i64(uc.X86_REG_RAX);
		const rcx = this.unicorn.reg_read_i64(uc.X86_REG_RCX);
		const rdx = this.unicorn.reg_read_i64(uc.X86_REG_RDX);
		document_log(["PRCTL", rdi.hex(), rsi.hex(), rip.hex() ])
		
		// Normal method to write FS
		//const fsmsr = 0xC0000100;
		//const fsmsr = [0x00, 0x01, 0x00, 0xc0, 0xb8, 0xe4, 0x11, 0x00, 0x00, 0x00, 0x00, 0x00];
		//unicorn.reg_write(uc.X86_REG_MSR, fsmsr);
		//console.log(unicorn.reg_read(uc.X86_REG_MSR, 12))
		
		if (this.continue_arch_prctl_rip == rip.num()) {
			document_log(["Returning", rdi.hex(), rsi.hex(), rip.hex()])
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
		document_log(["PRCTLSTOP", rdi.hex(), rsi.hex(), rip.hex()]);

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
            writeToTerm("ERROR: missing system call: " + rax.num() + ".")
            return
        }

        this.system_call_dictionary[rax.num()]();
	}
	
	hook_mem_issue() {
		document_log("MEMORY Issue")
		let rip = this.unicorn.reg_read_i64(uc.X86_REG_RIP);
		reg_log(this.unicorn);
	}
    
    write_mem(){
		// Create ELF file object
		let elf = new Elf(this.file);

		// Check if file is ELF
		if (elf.kind() !== "elf")
		{
			document_log("[ERROR]: not an ELF file.");
			throw "[ERROR]: not an ELF file.";
		}

		// Obtain ELF header
		let ehdr = elf.getehdr();

		// Check if file is x86_64
		if (ehdr.e_machine.num() !== EM_X86_64)
		{
			document_log("[ERROR]: not an x86_64 file.");
			throw "[ERROR]: not an x86_64 file.";
		}

		this.elf_entry = ehdr.e_entry.num();
		this.elf_end = this.file.byteLength;

		// Write segments to memory
		for (let i = 0; i < ehdr.e_phnum.num(); i ++)
		{
			const phdr = elf.getphdr(i);

			if (phdr.p_type.num() !== PT_LOAD || phdr.p_filesz.num() === 0)
			{
				continue;
			}

			const seg_start = phdr.p_offset.num();
			const seg_end = seg_start + phdr.p_filesz.num();
			const seg_data = new Uint8Array(this.file.slice(seg_start, seg_end));

			// Map memory for ELF file
			const seg_size = phdr.p_memsz.num();
			const mem_start = Math.floor(phdr.p_vaddr.num() / (4 * 1024)) * (4 * 1024);
			const mem_end = Math.ceil((phdr.p_vaddr.num() + seg_size) / (4 * 1024)) * (4 * 1024);
			const mem_diff = mem_end - mem_start;

			document_log("[INFO]: mmap range: " + mem_start.toString(16) + " " + mem_end.toString(16))

			if (this.data_end < mem_end) {
				this.data_end = mem_end;
			}
			this.unicorn.mem_map(mem_start, mem_diff, uc.PROT_ALL);
			this.unicorn.mem_write(phdr.p_vaddr.num(), seg_data);
		}
	}

	setup_stack()
	{
		const stack_size = 8192;
		const stack_addr = 0x800000000000 - stack_size;
		let stack_pointer = stack_addr + stack_size;
		let argv_pointers = [];

		// Map memory for stack
		this.unicorn.mem_map(stack_addr, stack_size, uc.PROT_ALL);

		// Set up stack
		// Refer to stack layout: https://www.win.tue.nl/~aeb/linux/hh/stack-layout.html

		// NULL pointer
		stack_pointer -= 8;

		// Program name
		stack_pointer -= this.filename.length;
		console.log("filename");
		console.log(stack_pointer);
		console.log(this.filename);
		console.log(this.filename.length);
		this.unicorn.mem_write(stack_pointer, new TextEncoder("utf-8").encode(this.filename));

		// Environment string
		// Empty for now

		// Argv strings
		for (var i = 0; i < this.args.length; i ++)
		{
			stack_pointer -= 1; // NULL termination of string
			stack_pointer -= this.args[i].length;
			this.unicorn.mem_write(stack_pointer, new TextEncoder("utf-8").encode(this.args[i]));
			argv_pointers.push(stack_pointer);
			console.log(i);
			console.log(args[i]);
			console.log(stack_pointer);
		}
		console.log(argv_pointers);

		// ELF Auxiliary Table
		// Empty for now, put NULL
		stack_pointer -= 8;

		// NULL that ends envp[]
		stack_pointer -= 8;

		// Environment pointers
		// Empty for now

		// NULL that ends argv[]
		stack_pointer -= 8;

		// Argv pointers
		for (var i = 0; i < argv_pointers.length; i ++)
		{
			stack_pointer -= 8;
			this.unicorn.mem_write(stack_pointer, new Uint8Array(new ElfUInt64(argv_pointers[i]).chunks.buffer));
			console.log(i);
			console.log(argv_pointers[i]);
			console.log(stack_pointer);
		}

		// Argc (which is 64 bit)
		stack_pointer -= 8;
		this.unicorn.mem_write(stack_pointer, new Uint8Array(new ElfUInt64(argv_pointers.length).chunks.buffer));
		console.log(argv_pointers.length);
		console.log(stack_pointer);
		
		mem_log(this.unicorn, stack_pointer, 20)

		// Set stack pointer
		this.unicorn.reg_write_i64(uc.X86_REG_RSP, stack_pointer);
		
		// Log
		mem_log(this.unicorn, stack_addr, 10);
	}

	execute() {
		// Log
		mem_log(this.unicorn, this.elf_entry, 10);
		reg_log(this.unicorn);

		// Start emulation
		document_log("[INFO]: emulation started at 0x" + this.elf_entry.toString(16) + ".")

		do {
			try
			{
				if (this.continue_arch_prctl_flag) {
					document_log("[INFO]: 2nd half of emulation")
					this.continue_arch_prctl_flag = 0;
					mem_log(this.unicorn, this.elf_entry, 10);
					
					this.unicorn.emu_start(this.elf_entry, this.elf_entry+2, 0, 0);
					
					document_log("[INFO]: prctl fixed");
					this.unicorn.mem_write(this.elf_entry, this.continue_arch_prctl_mem);
					this.unicorn.reg_write_i64(uc.X86_REG_RAX, this.continue_arch_prctl_rax);
					this.unicorn.reg_write_i64(uc.X86_REG_RDX, this.continue_arch_prctl_rdx);
					this.unicorn.reg_write_i64(uc.X86_REG_RCX, this.continue_arch_prctl_rcx);
					
					document_log("Continuing at" + this.continue_arch_prctl_rip.toString(16))
					this.unicorn.emu_start(this.continue_arch_prctl_rip, this.elf_end , 0, 0);
					
				} else {
					this.unicorn.emu_start(this.elf_entry, this.elf_end, 0, 0);
				}
			}
			catch (error)
			{
				document_log("[ERROR]: emulation failed: " + error + ".")
			}
		} while (this.continue_arch_prctl_flag)

		// Log
		reg_log(this.unicorn);
	}
}