var heap_addr = 0;

function hook_system_call(unicorn)
{
    const rax = unicorn.reg_read_i64(uc.X86_REG_RAX);

	if (!system_call_dictionary[rax.num()])
	{
		term.writeln("ERROR: missing system call: " + rax.num() + ".")
		return
	}

	system_call_dictionary[rax.num()](unicorn)
}

function write(unicorn)
{
	const rsi = unicorn.reg_read_i64(uc.X86_REG_RSI);
	const rdx = unicorn.reg_read_i64(uc.X86_REG_RDX);

	const buffer = unicorn.mem_read(rsi, rdx.num());
	const string = new TextDecoder("utf-8").decode(buffer);
	const string_array = string.split("\n")

	for (var i = 0; i < string_array.length - 1; i ++)
	{
		term.writeln(string_array[i]);
	}

	term.write(string_array[string_array.length - 1]);
}

function brk(unicorn)
{
	const rdi = unicorn.reg_read_i64(uc.X86_REG_RDI);
	const elf_header = elf.getehdr();

	if (heap_addr == 0) {
		heap_addr = data_end;
	}

	if (rdi.num() < heap_addr)
	{
		unicorn.reg_write_i64(uc.X86_REG_RAX, heap_addr);
		return;
	}

	if (Math.floor((rdi.num()-1) / 4096) > Math.floor((heap_addr-1) / 4096)) {
	// Missing Page
		var map_base = (Math.floor((heap_addr-1) / 4096)+1)*4096;
		var size = Math.ceil(rdi.num() / 4096)*4096;
		unicorn.mem_map(map_base, size-map_base, uc.PROT_ALL);
	}
	heap_addr = rdi.num();
	unicorn.reg_write_i64(uc.X86_REG_RAX, heap_addr);
}

function getpid(unicorn)
{
	unicorn.reg_write_i64(uc.X86_REG_RAX, 0);
}

function exit(unicorn)
{
	const rdi = unicorn.reg_read_i64(uc.X86_REG_RDI);

	unicorn.emu_stop()

	if (rdi.num() != 0)
	{
		term.writeln("WARN: program exit with code " + rdi.num() + ".");
	}
}

function arch_prctl(unicorn)
{
    document_log("PRCTL")
    unicorn.reg_write_i64(uc.X86_REG_RAX, 0);
}

function gettid(unicorn)
{
	unicorn.reg_write_i64(uc.X86_REG_RAX, 0);
}

function set_tid_address(unicorn)
{
}

function exit_group(unicorn)
{
	exit(unicorn);
}

const system_call_dictionary = {
	1: write,
	12: brk,
	39: getpid,
	60: exit,
	158: arch_prctl,
	186: gettid,
	218: set_tid_address,
	231: exit_group
};
