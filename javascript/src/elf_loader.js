var unicorn = null;
var elf = null;

function start_thread(elf_entry, elf_end)
{
	const stack_size = 8192;
	const stack_data = new Uint8Array([1,2,3,4,5]);
	const stack_addr = 0x7fffffffc000;

	// Map memory for stack
	unicorn.mem_map(stack_addr, stack_size, uc.PROT_ALL);
	unicorn.mem_write(stack_addr, stack_data);
	unicorn.reg_write_i64(uc.X86_REG_RSP, 0xffffdf20);

	// Log memory values
	mem_log(unicorn, elf_entry, 10)
	mem_log(unicorn, stack_addr, 10)

	// Log register values
	reg_log(unicorn);

	// Add system call hook
	unicorn.hook_add(uc.HOOK_INSN, hook_system_call, {}, 1, 0, uc.X86_INS_SYSCALL);

	// Start emulation
	term.writeln("")
	document_log("[INFO]: emulation started at 0x" + elf_entry.toString(16) + ".")

	try
	{
		unicorn.emu_start(elf_entry, elf_end , 0, 0);
	}
	catch (error)
	{
		document_log("[ERROR]: emulation failed.")
	}

	// Log memory and register values
	reg_log(unicorn);
}

function execve(file)
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

	start_thread(elf_entry)
}

function elf_loader(file_system)
{
	const path = file_system[0];
	const command = file_system[1];
	const file_dictionary = file_system[2];

	if(command[0] === "/")
	{
		file_name = command.slice(1);
	}
    else // Find in PATH variable
	{
		var path_array = path.split("=")[1].split(":");

        for (var i = 0; i < path_array.length; i ++)
		{
			var search_name = (path_array[i] + "/" + command).slice(1);
	
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

	var link_name = file_dictionary[file_name].linkname

	while (link_name != "")
	{
		file_name = file_dictionary[link_name].name
		link_name = file_dictionary[link_name].linkname
	}

	if (file_name == "")
	{
		throw "[ERROR]: invalid ELF file name.";
		return
	}

	execve(file_dictionary[file_name].buffer)
}
