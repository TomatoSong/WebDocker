var heap_addr = 0;

function write(unicorn)
{
	const rdi = unicorn.reg_read_i64(uc.X86_REG_RDI);
	const rsi = unicorn.reg_read_i64(uc.X86_REG_RSI);
	const rdx = unicorn.reg_read_i64(uc.X86_REG_RDX);

	if (rdi.num() != 1 && rdi.num() != 2)
	{
		return;
	}

	const buffer = unicorn.mem_read(rsi, rdx.num());
	const string = new TextDecoder("utf-8").decode(buffer);
	const string_array = string.split("\n")

	for (var i = 0; i < string_array.length - 1; i ++)
	{
		term.writeln(string_array[i]);
	}

	term.write(string_array[string_array.length - 1]);

	unicorn.reg_write_i64(uc.X86_REG_RAX, rdx.num());
}

function brk(unicorn)
{
    document_log("BRK")

	const rdi = unicorn.reg_read_i64(uc.X86_REG_RDI);
	const elf_header = elf.getehdr();

	if (heap_addr == 0)
	{
		heap_addr = data_end;
	}

	if (rdi.num() < heap_addr)
	{
		unicorn.reg_write_i64(uc.X86_REG_RAX, heap_addr);
		return;
	}

	if (Math.floor((rdi.num()-1) / 4096) > Math.floor((heap_addr-1) / 4096))
	{
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

function fork(original)
{
    // Get mem state
    var mem_lower = original.mem_read(0, 0x11f000);
    var mem_higher = original.mem_read(0x800000000000 - 8192, 8192)
    
    // Get CPU state
    var rax = original.reg_read_i64(uc.X86_REG_RAX);
    var rbx = original.reg_read_i64(uc.X86_REG_RBX);
    var rcx = original.reg_read_i64(uc.X86_REG_RCX);
    var rdx = original.reg_read_i64(uc.X86_REG_RDX);
    var rsi = original.reg_read_i64(uc.X86_REG_RSI);
    var rdi = original.reg_read_i64(uc.X86_REG_RDI);
    var rbp = original.reg_read_i64(uc.X86_REG_RBP);
    var rsp = original.reg_read_i64(uc.X86_REG_RSP);
    var r8 = original.reg_read_i64(uc.X86_REG_R8);
    var r9 = original.reg_read_i64(uc.X86_REG_R9);
    var r10 = original.reg_read_i64(uc.X86_REG_R10);
    var r11 = original.reg_read_i64(uc.X86_REG_R11);
    var r12 = original.reg_read_i64(uc.X86_REG_R12);
    var r13 = original.reg_read_i64(uc.X86_REG_R13);
    var r14 = original.reg_read_i64(uc.X86_REG_R14);
    var r15 = original.reg_read_i64(uc.X86_REG_R15);
    var rip = original.reg_read_i64(uc.X86_REG_RIP);
    var eflags = original.reg_read_i32(uc.X86_REG_EFLAGS);
    
    var cloned = new uc.Unicorn(uc.ARCH_X86, uc.MODE_64);

    cloned.set_integer_type(ELF_INT_OBJECT);
    cloned.mem_map(0, 0x11f000, uc.PROT_ALL);
    cloned.mem_write(0, mem_lower);
    cloned.mem_map(0x800000000000 - 8192, 8192, uc.PROT_ALL);
    cloned.mem_write(0x800000000000 - 8192, mem_higher);
    
    cloned.reg_write_i64(uc.X86_REG_RAX, rax);
    cloned.reg_write_i64(uc.X86_REG_RBX, rbx);
    cloned.reg_write_i64(uc.X86_REG_RCX, rcx);
    cloned.reg_write_i64(uc.X86_REG_RDX, rdx);
    cloned.reg_write_i64(uc.X86_REG_RSI, rsi);
    cloned.reg_write_i64(uc.X86_REG_RDI, rdi);
    cloned.reg_write_i64(uc.X86_REG_RBP, rbp);
    cloned.reg_write_i64(uc.X86_REG_RSP, rsp);
    cloned.reg_write_i64(uc.X86_REG_R8, r8);
    cloned.reg_write_i64(uc.X86_REG_R9, r9);
    cloned.reg_write_i64(uc.X86_REG_R10, r10);
    cloned.reg_write_i64(uc.X86_REG_R11, r11);
    cloned.reg_write_i64(uc.X86_REG_R12, r12);
    cloned.reg_write_i64(uc.X86_REG_R13, r13);
    cloned.reg_write_i64(uc.X86_REG_R14, r14);
    cloned.reg_write_i64(uc.X86_REG_R15, r15);
    cloned.reg_write_i32(uc.X86_REG_EFLAGS, eflags);
    
    unicorn = cloned;

    return rip;
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

continue_arch_prctl_flag = 0;
continue_arch_prctl_rip = 0;
continue_arch_prctl_rax = 0;
continue_arch_prctl_rcx = 0;
continue_arch_prctl_rdx = 0;
continue_arch_prctl_mem = 0;

function arch_prctl(unicorn)
{
    const rdi = unicorn.reg_read_i64(uc.X86_REG_RDI);
    const rsi = unicorn.reg_read_i64(uc.X86_REG_RSI);
    const rip = unicorn.reg_read_i64(uc.X86_REG_RIP);
    const rax = unicorn.reg_read_i64(uc.X86_REG_RAX);
    const rcx = unicorn.reg_read_i64(uc.X86_REG_RCX);
    const rdx = unicorn.reg_read_i64(uc.X86_REG_RDX);
    document_log(["PRCTL", rdi.hex(), rsi.hex(), rip.hex()])
    
    // Normal method to write FS
    // const fsmsr = 0xC0000100;
    // const fsmsr = [0x00, 0x01, 0x00, 0xc0, 0xb8, 0xe4, 0x11, 0x00, 0x00, 0x00, 0x00, 0x00];
    // unicorn.reg_write(uc.X86_REG_MSR, fsmsr);
    // console.log(unicorn.reg_read(uc.X86_REG_MSR, 12))
    
    if (continue_arch_prctl_rip == rip.num())
	{
        document_log(["Returning", rdi.hex(), rsi.hex(), rip.hex()])
        continue_arch_prctl_flag = 0;
        continue_arch_prctl_rip = 0;
        continue_arch_prctl_rax = 0;
        continue_arch_prctl_rcx = 0;
        continue_arch_prctl_rdx = 0;
        continue_arch_prctl_mem = 0;
        unicorn.reg_write_i64(uc.X86_REG_RAX, 0);

        return;
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
	57: fork,
	60: exit,
	158: arch_prctl,
	186: gettid,
	218: set_tid_address,
	231: exit_group
};
