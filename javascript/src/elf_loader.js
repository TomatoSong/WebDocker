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
	var ebx = unicorn.reg_read_i32(uc.X86_REG_EBX);
	var esp = unicorn.reg_read_i32(uc.X86_REG_ESP);
	var eip = unicorn.reg_read_i32(uc.X86_REG_EIP);
	var rsp = unicorn.reg_read(uc.X86_REG_RSP,8);
	var rip = unicorn.reg_read(uc.X86_REG_RIP,8);

	// Print register values
	document_log("[INFO]: reg_log[eax]: " + eax.toString() + " Hex: " + eax.toString(16));
	document_log("[INFO]: reg_log[ebx]: " + ebx.toString() + " Hex: " + ebx.toString(16));
	document_log("[INFO]: reg_log[esp]: " + esp.toString() + " Hex: " + esp.toString(16));
	document_log("[INFO]: reg_log[eip]: " + eip.toString() + " Hex: " + eip.toString(16));

	document_log("[INFO]: reg_log[rsp]: " + rsp + " Hex: " + rsp);
	document_log("[INFO]: reg_log[rip]: " + rip + " Hex: " + rip);
}

function hook_syscall() {
    alert("syscall");
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
	var unicorn_base_addr = 0;

	// Check if file is x86
	if (ehdr.e_machine.num() === EM_386)
	{
		arch = uc.ARCH_X86;
		mode = uc.MODE_32;
		unicorn_base_addr = 0x08048000;
	} else if (ehdr.e_machine.num() === EM_X86_64)
	{
		arch = uc.ARCH_X86;
		mode = uc.MODE_64;
		unicorn_base_addr = 0x400000;
	} else {
		document_log("[ERROR]: not an x86 file.");
		throw "[ERROR]: not an x86 file.";
	}

	// Define variables
	unicorn = new uc.Unicorn(arch, mode);

	const unicorn_page_size = Math.ceil(file.byteLength / (4 * 1024)) * (4 * 1024) + 4096
	const elf_entry = ehdr.e_entry.num();

	// Map memory for ELF file
	// FIXME: mem_map range based on segment range
	unicorn.mem_map(unicorn_base_addr, unicorn_page_size, uc.PROT_ALL);
	document_log("[MMAP range]: " + unicorn_base_addr.toString(16) + " " + (unicorn_base_addr + unicorn_page_size).toString(16))
	console.log(ehdr.e_phnum.num())

	// Write segments to memory
	for (var i = 0; i < ehdr.e_phnum.num(); i++)
	{
		// NOTE: only loading PF_X segment (loading others would override it, fix needed)
		console.log(i)
		const phdr = elf.getphdr(i);
		if (phdr.p_type.num() !== PT_LOAD || phdr.p_filesz.num() === 0)
		{

			continue;
		}

		const seg_start = phdr.p_offset.num();
		const seg_end = seg_start + phdr.p_filesz.num();
		const seg_data = new Uint8Array(file.slice(seg_start, seg_end));

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
	//unicorn.reg_write_i64(uc.X86_REG_RSP, 0xfffdf20);

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
	//unicorn.hook_add(uc.HOOK_INSN, hook_syscall, {}, 0, 1, uc.X86_INS_SYSCALL);
	unicorn.emu_start(main_function_addr, 0x401369 , 0, 0);
	document_log("[INFO]: emulation finished at 0x" +
		(main_function_addr + program_size - 1).toString(16) + ".")
	mem_log(unicorn, 0xffffdf16, 10)

	// Log register values
	reg_log(unicorn);
}

function start_thread(elf_entry) {
	const main_function_addr = 0x08049cf5;
	const program_size = 12;

	// Log memory values
	mem_log(unicorn, elf_entry, 10)
	mem_log(unicorn, main_function_addr, 10)

	// Write register values
	unicorn.reg_write_i32(uc.X86_REG_EAX, 123);
	unicorn.reg_write_i32(uc.X86_REG_EBX, 456);

	// Log register values
	reg_log(unicorn);

	// Start emulation
	// NOTE: starting from main directly (starting from entry point would fail, fix needed)
	document_log("[INFO]: emulation started at 0x" + main_function_addr.toString(16) + ".")
	unicorn.emu_start(main_function_addr, main_function_addr + program_size, 0, 0);
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
