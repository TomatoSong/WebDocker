function hook_syscall(unicorn)
{
    var rax = unicorn.reg_read_i64(uc.X86_REG_RAX);

	term.write("Hello world from syscall " + rax.num() + " Please ok to continue\n");

	if (!system_call_dictionary[rax.num()])
	{
		term.write("ERROR: Nonexistent system call.\n")
		return
	}

	system_call_dictionary[rax.num()](unicorn)
}

var unicorn = null;

function load_elf_binary(file) {
	// Create ELF file object
	var elf = new Elf(file);

	// Check if file is ELF
	if (elf.kind() !== "elf")
	{
		document_log("[ERROR]: not an ELF file.");
		throw "[ERROR]: not an ELF file.";
	}

	// Obtain ELF header
	var ehdr = elf.getehdr();

	var arch = 0;
	var mode = 0;

	// Check if file is x86
	if (ehdr.e_machine.num() === EM_386)
	{
		arch = uc.ARCH_X86;
		mode = uc.MODE_32;
	} else if (ehdr.e_machine.num() === EM_X86_64)
	{
		arch = uc.ARCH_X86;
		mode = uc.MODE_64;
	} else {
		document_log("[ERROR]: not an x86 file.");
		throw "[ERROR]: not an x86 file.";
	}

	// Define variables
	unicorn = new uc.Unicorn(arch, mode);

	unicorn.set_integer_type(ELF_INT_OBJECT);

	const elf_entry = ehdr.e_entry.num();

	// Write segments to memory
	for (var i = 0; i < ehdr.e_phnum.num(); i++)
	{
		// NOTE: only loading PF_X segment (loading others would override it, fix needed)
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

	return elf_entry
}

function start_thread64(elf_entry) {
	const main_function_addr = 0x401010;
	const program_size = 67;

	const stack_size = 8192;
	const stack_data = new Uint8Array([1,2,3,4,5]);
	const stack_addr = 0xffffc000;

	// Map memory for stack
	unicorn.mem_map(stack_addr, stack_size, uc.PROT_ALL);
	unicorn.mem_write(stack_addr, stack_data);
	unicorn.reg_write_i64(uc.X86_REG_RSP, 0xffffdf20);

	// Log memory values
	mem_log(unicorn, elf_entry, 10)
	mem_log(unicorn, main_function_addr, 10)
	mem_log(unicorn, 0x403ff0, 10) // Why it is zero/unloaded?
	mem_log(unicorn, stack_addr, 10)
	mem_log(unicorn, 0xffffdf16, 10)

	// Log register values
	reg_log(unicorn);

	// Start emulation
	// NOTE: starting from main directly (starting from entry point would fail, fix needed)
	document_log("[INFO]: emulation started at 0x" + main_function_addr.toString(16) + ".")
	unicorn.hook_add(uc.HOOK_INSN, hook_syscall, {}, 1, 0, uc.X86_INS_SYSCALL);
	unicorn.emu_start(elf_entry, main_function_addr+program_size , 0, 0);
	//unicorn.emu_start(0x401669, 0x40167a , 0, 50000);
	document_log("[INFO]: emulation finished at 0x" +
				 (main_function_addr + program_size - 1).toString(16) + ".")
	mem_log(unicorn, 0xffffdf16, 10)

	// Log register values
	reg_log(unicorn);
}

function start_thread(elf_entry) {
	const main_function_addr = 0x08049cf5;
	const program_size = 10;

	const stack_size = 8192;
	const stack_data = new Uint8Array([1,2,3,4,5]);
	const stack_addr = 0xffffc000;

	// Map memory for stack
	unicorn.mem_map(stack_addr, stack_size, uc.PROT_ALL);
	unicorn.mem_write(stack_addr, stack_data);
	unicorn.reg_write_i32(uc.X86_REG_ESP, 0xffffdf20);

	// Log memory values
	mem_log(unicorn, elf_entry, 10)
	mem_log(unicorn, main_function_addr, 10)

	// Write register values
	unicorn.reg_write_i32(uc.X86_REG_EAX, 22);
	unicorn.reg_write_i32(uc.X86_REG_EBX, 456);

	// Log register values
	reg_log(unicorn);

	// Start emulation
	// NOTE: starting from main directly (starting from entry point would fail, fix needed)
	document_log("[INFO]: emulation started at 0x" + main_function_addr.toString(16) + ".")
	var hook2 = unicorn.hook_add(uc.HOOK_INSN, hook_syscall, {}, 1, 0, uc.X86_INS_INT);
	console.log(hook2);
	//var hook1 = unicorn.hook_add(uc.HOOK_INTR, hook_syscall, {}, 1, 0);
	//console.log(hook1);
	mem_log(unicorn, 0x080712d0, 10)
	unicorn.emu_start(0x80712d0, 0x80712d2, 0, 0);
	//unicorn.emu_start(main_function_addr, main_function_addr + program_size, 0, 0);
	document_log("[INFO]: emulation finished at 0x" +
				 (main_function_addr + program_size - 1).toString(16) + ".")

	// Log register values
	reg_log(unicorn);
}

function execve(file)
{
	const elf_entry = load_elf_binary(file);
	start_thread64(elf_entry);
}

function elf_loader()
{
	const file_name = "data/hello";

	fetch(file_name)
		.then(response => response.arrayBuffer())
		.then(file => execve(file))//.catch(() => {alert("error! core dumped"); reg_log(unicorn)});
}
