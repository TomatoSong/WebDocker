// Terminal write
function system_call_1(unicorn)
{
	var rsi = unicorn.reg_read_i64(uc.X86_REG_RSI);
	var rdx = unicorn.reg_read_i64(uc.X86_REG_RDX);

	var buffer = unicorn.mem_read(rsi, rdx.num());
	var string = new TextDecoder("utf-8").decode(buffer);

	term.write(string);
}

var system_call_dictionary = {1 : system_call_1};
