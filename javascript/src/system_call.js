var heap_addr = 0;

function hook_system_call(unicorn)
{
    var rax = unicorn.reg_read_i64(uc.X86_REG_RAX);

	if (!system_call_dictionary[rax.num()])
	{
		term.writeln("ERROR: Unimplemented system call: " + rax.num() + ".")
		return
	}

	system_call_dictionary[rax.num()](unicorn)
}

function write(unicorn)
{
	var rsi = unicorn.reg_read_i64(uc.X86_REG_RSI);
	var rdx = unicorn.reg_read_i64(uc.X86_REG_RDX);

	var buffer = unicorn.mem_read(rsi, rdx.num());
	var string = new TextDecoder("utf-8").decode(buffer);

	var string_array = string.split("\n")

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

	if (heap_addr == 0)
	{
		for (var i = 0; i < elf_header.e_shnum.num(); i++)
		{
			const section = elf.getscn(i);
			const section_header = elf.getshdr(section);
			const section_name = elf.strptr(elf_header.e_shstrndx.num(),
											section_header.sh_name.num());

			if (section_name == ".data")
			{
				heap_addr = section_header.sh_addr.num() + section_header.sh_size.num();
			}
		}
	}

	if (rdi.num() < heap_addr)
	{
		unicorn.reg_write_i64(uc.X86_REG_RAX, heap_addr);
		return;
	}

	heap_addr = rdi.num();
	unicorn.reg_write_i64(uc.X86_REG_RAX, heap_addr);
}

function getpid(unicorn)
{
	unicorn.reg_write_i64(uc.X86_REG_RAX, 0);
}

function arch_prctl(unicorn)
{
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
	var rdi = unicorn.reg_read_i64(uc.X86_REG_RDI);

	unicorn.emu_stop()

	if (rdi.num() != 0)
	{
		term.writeln("WARN: program exit with code " + rdi.num() + ".");
	}
}

var system_call_dictionary = {
	1: write,
	12: brk,
	39: getpid,
	158: arch_prctl,
	186: gettid,
	218: set_tid_address,
	231: exit_group
};
