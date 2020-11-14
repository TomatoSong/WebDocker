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

// Terminal write
function system_call_1(unicorn)
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

var system_call_dictionary = {1 : system_call_1};
