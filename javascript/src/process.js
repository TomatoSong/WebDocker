import File from "./file.js";
import Logger from "./logger.js";
import SystemCall from "./system_call.js";

export default class Process
{
    constructor(pid, terminal, image)
	{
		this.pid = pid;
		this.trapped = -1;
		this.terminal = terminal;
		this.image = image;
		this.elf_entry = 0;
		this.elf_end = 0;
		this.exit_dead = false;

		this.unicorn = new uc.Unicorn(uc.ARCH_X86, uc.MODE_64);
		this.file = new File(this.image);
		this.logger = new Logger();
		this.system_call = new SystemCall(this, this.unicorn, 
										  this.terminal, this.logger);

        this.unicorn.set_integer_type(ELF_INT_OBJECT);
	}
	
	load_elf()
	{
		// Create ELF file object
		let elf = new Elf(this.file.buffer);

		// Check if file is ELF
		if (elf.kind() !== "elf")
		{
			this.logger.log_to_document("[ERROR]: not an ELF file.");
			throw "[ERROR]: not an ELF file.";
		}

		// Obtain ELF header
		let ehdr = elf.getehdr();

		// Check if file is x86_64
		if (ehdr.e_machine.num() !== EM_X86_64)
		{
			this.logger.log_to_document("[ERROR]: not an x86_64 file.");
			throw "[ERROR]: not an x86_64 file.";
		}

		this.elf_entry = ehdr.e_entry.num();
		this.system_call.elf_entry = this.elf_entry;
		this.elf_end = this.file.buffer.byteLength;

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
			const seg_data = new Uint8Array(this.file.buffer.slice(seg_start, seg_end));

			// Map memory for ELF file
			const seg_size = phdr.p_memsz.num();
			const mem_start = Math.floor(phdr.p_vaddr.num() / (4 * 1024)) * (4 * 1024);
			const mem_end = Math.ceil((phdr.p_vaddr.num() + seg_size) /
									  (4 * 1024)) * (4 * 1024);
			const mem_diff = mem_end - mem_start;

			this.logger.log_to_document("[INFO]: mmap range: " +
										mem_start.toString(16) + " " +
										mem_end.toString(16));

			if (this.system_call.data_end < mem_end)
			{
				this.system_call.data_end = mem_end;
			}

			this.unicorn.mem_map(mem_start, mem_diff, uc.PROT_ALL);
			this.unicorn.mem_write(phdr.p_vaddr.num(), seg_data);
		}
	}

	set_up_stack()
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
		stack_pointer -= this.file.file_name_command.length;
		this.unicorn.mem_write(stack_pointer,
							   new TextEncoder("utf-8").encode(this.file.file_name_command));

		// Environment string
		// Empty for now
		
		// Argv strings
		for (var i = 0; i < this.image.command.length; i ++)
		{
			stack_pointer -= 1; // NULL termination of string
			stack_pointer -= this.image.command[i].length;
			this.unicorn.mem_write(stack_pointer,
								   new TextEncoder("utf-8").encode(this.image.command[i]));
			argv_pointers.push(stack_pointer);
		}

		// ELF Auxiliary Table
		// Empty for now, put NULL
		stack_pointer -= 8;

		// NULL that ends envp[]
		stack_pointer -= 8;

		// Environment pointers
		// Empty for now

		// NULL that ends argv[]
		stack_pointer -= 8;

		// Argv pointers (reversed)
		for (var i = argv_pointers.length - 1; i >= 0; i --)
		{
			stack_pointer -= 8;
			this.unicorn.mem_write(stack_pointer,
								   new Uint8Array(new ElfUInt64(
									   argv_pointers[i]).chunks.buffer));
		}

		// Argc (which is 64 bit)
		stack_pointer -= 8;
		this.unicorn.mem_write(stack_pointer,
							   new Uint8Array(new ElfUInt64(
								   argv_pointers.length).chunks.buffer));
		
		this.logger.log_memory(this.unicorn, stack_pointer, 20)

		// Set stack pointer
		this.unicorn.reg_write_i64(uc.X86_REG_RSP, stack_pointer);
		
		// Log
		this.logger.log_memory(this.unicorn, stack_addr, 10);
	}

	execute()
	{
		this.load_elf();
		this.set_up_stack();
		
		// Log
		this.logger.log_memory(this.unicorn, this.elf_entry, 10);
		this.logger.log_register(this.unicorn);

		// Start emulation
		this.logger.log_to_document("[INFO]: emulation started at 0x" +
									this.elf_entry.toString(16) + ".");
									
		this.last_saved_rip = this.elf_entry;
	}
}
