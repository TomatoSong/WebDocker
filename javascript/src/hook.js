function hook_system_call(unicorn)
{
    const rax = unicorn.reg_read_i64(uc.X86_REG_RAX);

	if (!system_call_dictionary[rax.num()])
	{
		term.writeln("ERROR: missing system call: " + rax.num() + ".");
		return;
	}

	system_call_dictionary[rax.num()](unicorn);
}

function hook_memory_read_unmapped(unicorn)
{
    document_log("[ERROR]: Unmapped memory read.");
    reg_log(unicorn);
}
