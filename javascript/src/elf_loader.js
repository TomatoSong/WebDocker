function fork(original) {
    // Get mem state
    var mem_lower = original.mem_read(0, 0x11f000);
    var mem_higher = original.mem_read(0x800000000000-8192, 8192)
    
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
    cloned.mem_map(0x800000000000-8192, 8192, uc.PROT_ALL);
    cloned.mem_write(0x800000000000-8192, mem_higher);
    
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
    
    unicorn=cloned;
	return rip;
}