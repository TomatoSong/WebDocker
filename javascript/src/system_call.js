import writeToTerm from './terminal.js';

function write(unicorn)
{
	const rsi = unicorn.reg_read_i64(uc.X86_REG_RSI);
	const rdx = unicorn.reg_read_i64(uc.X86_REG_RDX);

	const buffer = unicorn.mem_read(rsi, rdx.num());
	console.log(buffer);
	const string = new TextDecoder("utf-8").decode(buffer);
	const string_array = string.split("\n");

	for (var i = 0; i < string_array.length - 1; i ++)
	{
		writeToTerm(string_array[i]);
	}

	writeToTerm(string_array[string_array.length - 1]);
}

function brk(unicorn)
{
    document_log("BRK")
	const rdi = unicorn.reg_read_i64(uc.X86_REG_RDI);

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
		let map_base = (Math.floor((heap_addr-1) / 4096)+1)*4096;
		let size = Math.ceil(rdi.num() / 4096)*4096;
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

	unicorn.emu_stop();

	if (rdi.num() != 0)
	{
		writeToTerm("WARN: program exit with code " + rdi.num() + ".");
	}
}

function arch_prctl(unicorn)
{
    const rdi = unicorn.reg_read_i64(uc.X86_REG_RDI);
    const rsi = unicorn.reg_read_i64(uc.X86_REG_RSI);
    const rip = unicorn.reg_read_i64(uc.X86_REG_RIP);
    const rax = unicorn.reg_read_i64(uc.X86_REG_RAX);
    const rcx = unicorn.reg_read_i64(uc.X86_REG_RCX);
    const rdx = unicorn.reg_read_i64(uc.X86_REG_RDX);
    document_log(["PRCTL", rdi.hex(), rsi.hex(), rip.hex() ])
    
    // Normal method to write FS
    //const fsmsr = 0xC0000100;
    //const fsmsr = [0x00, 0x01, 0x00, 0xc0, 0xb8, 0xe4, 0x11, 0x00, 0x00, 0x00, 0x00, 0x00];
    //unicorn.reg_write(uc.X86_REG_MSR, fsmsr);
    //console.log(unicorn.reg_read(uc.X86_REG_MSR, 12))
    
    if (continue_arch_prctl_rip == rip.num()) {
        document_log(["Returning", rdi.hex(), rsi.hex(), rip.hex()])
        continue_arch_prctl_flag = 0;
        continue_arch_prctl_rip = 0;
        continue_arch_prctl_rax = 0;
        continue_arch_prctl_rcx = 0;
        continue_arch_prctl_rdx = 0;
        continue_arch_prctl_mem = 0;
        unicorn.reg_write_i64(uc.X86_REG_RAX, 0);
        return
    }
    continue_arch_prctl_flag = 1;
    continue_arch_prctl_rip = rip.num()
    continue_arch_prctl_rax = rax
    continue_arch_prctl_rcx = rcx
    continue_arch_prctl_rdx = rdx
    continue_arch_prctl_mem = unicorn.mem_read(elf_entry, 5)
    unicorn.reg_write_i64(uc.X86_REG_RAX, rsi);
    unicorn.reg_write_i64(uc.X86_REG_RDX, 0);
    unicorn.reg_write_i64(uc.X86_REG_RCX, 0xC0000100);
    unicorn.mem_write(elf_entry, [0x0f, 0x30, 0x90, 0x90, 0x90]);
    document_log(["PRCTLSTOP", rdi.hex(), rsi.hex(), rip.hex()])

    unicorn.emu_stop()
    return
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
