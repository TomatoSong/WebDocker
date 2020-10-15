function mem_log(unicorn, address, size)
{
	var buffer = unicorn.mem_read(address, size);
	var string = "[INFO]: mem_log[0x" + address.toString(16) + ", " + size + "]: ";

	for (var i = 0; i < size; i ++)
	{		
		string += buffer[i].toString(16) + " ";
	}

	console.log(string);
}

function reg_log(unicorn)
{
	// Read register values
	var eax = unicorn.reg_read_i32(uc.X86_REG_EAX);
	var ebx = unicorn.reg_read_i32(uc.X86_REG_EBX);

	// Print register values
	console.log("[INFO]: eax:", eax)
	console.log("[INFO]: ebx:", ebx)
}

function execve(file)
{
	// Create ELF file object
	var elf = new Elf(file);

	// Check if file is ELF
	if (elf.kind() != "elf")
	{
		throw "[ERROR]: not an ELF file.";
	}

	// Obtain ELF header
	var ehdr = elf.getehdr();

	// Check if file is x86
	if (ehdr.e_machine.num() != EM_386)
	{
		throw "[ERROR]: not an x86 file.";
	}

	// Define variables
	var unicorn = new uc.Unicorn(uc.ARCH_X86, uc.MODE_32);
	const unicorn_base_addr = 0x08040000;
	const unicorn_page_size = Math.ceil(file.byteLength / (4 * 1024)) * (4 * 1024)
	const entry_point_addr = unicorn_base_addr + ehdr.e_entry.num();
	const main_function_addr = 0x08049cf5;
	const program_size = 12;
	
	// Map memory for ELF file
	unicorn.mem_map(unicorn_base_addr, unicorn_page_size, uc.PROT_ALL);

	// Write segments to memory
	for (var i = 0; i < ehdr.e_phnum.num(); i++)
	{
		// NOTE: only loading PF_X segment (loading others would override it, fix needed)
		const phdr = elf.getphdr(1);

		if (phdr.p_type.num() != PT_LOAD || phdr.p_filesz.num() == 0)
		{
			continue;
		}

		const seg_start = phdr.p_offset.num();
		const seg_end = seg_start + phdr.p_filesz.num();
		const seg_data = new Uint8Array(file.slice(seg_start, seg_end));

		unicorn.mem_write(unicorn_base_addr + phdr.p_vaddr.num(), seg_data);
	}

	// Log memory values
	mem_log(unicorn, entry_point_addr, 10)
	mem_log(unicorn, main_function_addr, 10)

	// Write register values
	unicorn.reg_write_i32(uc.X86_REG_EAX, 123);
	unicorn.reg_write_i32(uc.X86_REG_EBX, 456);

	// Log register values
	reg_log(unicorn);

	// Start emulation
	// NOTE: starting from main directly (starting from entry point would fail, fix needed)
	console.log("[INFO]: emulation started at 0x" + main_function_addr.toString(16) + ".")
	unicorn.emu_start(main_function_addr, main_function_addr + program_size, 0, 0);
	console.log("[INFO]: emulation finished at 0x" +
				(main_function_addr + program_size - 1).toString(16) + ".")

	// Log register values
	reg_log(unicorn);
}

function elf_loader()
{
	const file_name = "data/test";

	fetch(file_name)
		.then(response => response.arrayBuffer())
		.then(file => execve(file));
}
