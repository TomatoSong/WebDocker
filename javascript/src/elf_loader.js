var unicorn = null;
var elf = null;

function set_up_stack(command)
{
	const stack_size = 8192;
	const stack_addr = 0x800000000000 - stack_size;
	var stack_pointer = 0x7fffffffff20; // TODO: magic number
	var argv_pointers = [];

	// Map memory for stack
	unicorn.mem_map(stack_addr, stack_size, uc.PROT_ALL);

	// Set up stack
	// Refer to stack layout: https://www.win.tue.nl/~aeb/linux/hh/stack-layout.html

	// NULL pointer
	stack_pointer -= 8;

	// Program name
	stack_pointer -= command[0].length;
	unicorn.mem_write(stack_pointer, new ElfUInt64(command[0]).chunks);

	// Environment string
	// Empty for now

	// Argv strings
	for (var i = 0; i < command.length; i++)
	{
		stack_pointer -= 1; // NULL termination of string
		stack_pointer -= command[i].length;
		unicorn.mem_write(stack_pointer, new ElfUInt64(command[i]).chunks);

		argv_pointers.push(stack_pointer);
	}

	// ELF Auxiliary Table
	// Empty for now

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
		unicorn.mem_write(stack_pointer, new ElfUInt64(argv_pointers[i]).chunks);
	}

	// Argc
	stack_pointer -= 4;
	unicorn.mem_write(stack_pointer, new ElfUInt64(command.length).chunks);

	// Set stack pointer
	unicorn.reg_write_i64(uc.X86_REG_RSP, stack_pointer);
	
	// Log
	mem_log(unicorn, stack_addr, 10)
}

function start_thread(command, elf_entry, elf_end)
{
	// Set up stack
	set_up_stack(command);

	// Add system call hook
	unicorn.hook_add(uc.HOOK_INSN, hook_system_call, {}, 1, 0, uc.X86_INS_SYSCALL);

	// Log
	mem_log(unicorn, elf_entry, 10)
	reg_log(unicorn);

	// Start emulation
	document_log("[INFO]: emulation started at 0x" + elf_entry.toString(16) + ".")

	try
	{
		unicorn.emu_start(elf_entry, elf_end , 0, 0);
	}
	catch (error)
	{
		document_log("[ERROR]: emulation failed.")
	}

	// Log
	reg_log(unicorn);
}

function execve(command, file)
{
	// Create ELF file object
	elf = new Elf(file);

	// Check if file is ELF
	if (elf.kind() !== "elf")
	{
		document_log("[ERROR]: not an ELF file.");
		throw "[ERROR]: not an ELF file.";
	}

	// Obtain ELF header
	var ehdr = elf.getehdr();

	// Check if file is x86_64
	if (ehdr.e_machine.num() !== EM_X86_64)
	{
		document_log("[ERROR]: not an x86_64 file.");
		throw "[ERROR]: not an x86_64 file.";
	}

	// Define variables
	unicorn = new uc.Unicorn(uc.ARCH_X86, uc.MODE_64);
	unicorn.set_integer_type(ELF_INT_OBJECT);

	const elf_entry = ehdr.e_entry.num();
	const elf_end = file.byteLength;

	// Write segments to memory
	for (var i = 0; i < ehdr.e_phnum.num(); i++)
	{
		const phdr = elf.getphdr(i);

		if (phdr.p_type.num() !== PT_LOAD || phdr.p_filesz.num() === 0)
		{
			continue;
		}

		const seg_start = phdr.p_offset.num();
		const seg_end = seg_start + phdr.p_filesz.num();
		const seg_data = new Uint8Array(file.slice(seg_start, seg_end));

		// Map memory for ELF file
		const seg_size = phdr.p_memsz.num();
		const mem_start = Math.floor(phdr.p_vaddr.num() / (4 * 1024)) * (4 * 1024);
		const mem_end = Math.ceil((phdr.p_vaddr.num() + seg_size) / (4 * 1024)) * (4 * 1024);
		const mem_diff = mem_end - mem_start;

		document_log("[INFO]: mmap range: " + mem_start.toString(16) + " " + mem_end.toString(16))

		unicorn.mem_map(mem_start, mem_diff, uc.PROT_ALL);
		unicorn.mem_write(phdr.p_vaddr.num(), seg_data);
	}

	start_thread(command, elf_entry, elf_end)
}

function elf_loader(file_system)
{
	const path = file_system[0];
	const command = file_system[1];
	const file_dictionary = file_system[2];
	var file_name = command[0];
	var file_name_linked = "";
	var link_name = "";

	if(file_name[0] === "/")
	{
		file_name = file_name.slice(1);
	}
    else // Find in PATH variable
	{
		var path_array = path.split("=")[1].split(":");

        for (var i = 0; i < path_array.length; i ++)
		{
			var search_name = (path_array[i] + "/" + file_name).slice(1);
	
			if (file_dictionary[search_name])
			{
				file_name = search_name
				break;
			}
		}
	}

	if (file_name == "")
	{
		throw "[ERROR]: invalid ELF file name.";
		return
	}

	link_name = file_dictionary[file_name].linkname

	if (link_name != "")
	{
		while (link_name != "")
		{
			file_name_linked = file_dictionary[link_name].name
			link_name = file_dictionary[link_name].linkname
		}

		if (file_name_linked == "")
		{
			throw "[ERROR]: invalid linked ELF file name.";
			return
		}
	}
	else
	{
		file_name_linked = file_name;
	}

	execve(command, file_dictionary[file_name_linked].buffer)
}
