<<<<<<< HEAD
=======
var unicorn = null;
var elf = null;

var data_end = 0;

function set_up_stack(command)
{
	const stack_size = 8192;
	const stack_addr = 0x800000000000 - stack_size;
	var stack_pointer = stack_addr + stack_size;
	var argv_pointers = [];

	// Map memory for stack
	unicorn.mem_map(stack_addr, stack_size, uc.PROT_ALL);

	// Set up stack
	// Refer to stack layout: https://www.win.tue.nl/~aeb/linux/hh/stack-layout.html

	// NULL pointer
	stack_pointer -= 8;

	// Program name
	stack_pointer -= command[0].length;
	unicorn.mem_write(stack_pointer, new TextEncoder("utf-8").encode(command[0]));

	// Environment string
	// Empty for now

	// Argv strings
	for (var i = 0; i < command.length; i ++)
	{
		stack_pointer -= 1; // NULL termination of string
		stack_pointer -= command[i].length;
		unicorn.mem_write(stack_pointer, new TextEncoder("utf-8").encode(command[i]));

		argv_pointers.push(stack_pointer);
	}

	// ELF Auxiliary Table
	// Empty for now, put NULL
	stack_pointer -= 8;

	// NULL that ends envp[]
	stack_pointer -= 8;

	// Environment pointers
	// Empty for now

	// NULL that ends argv[]
	stack_pointer -= 8;

	// Argv pointers
	for (var i = argv_pointers.length - 1; i >= argv_pointers.length; i --)
	{
		stack_pointer -= 8;
		unicorn.mem_write(stack_pointer, new Uint8Array(new ElfUInt64(argv_pointers[i]).chunks.buffer));
	}

	// Argc (which is 64 bit)
	stack_pointer -= 8;
	unicorn.mem_write(stack_pointer, new Uint8Array(new ElfUInt64(argv_pointers.length).chunks.buffer));
	
	mem_log(unicorn, stack_pointer, 20)

	// Set stack pointer
	unicorn.reg_write_i64(uc.X86_REG_RSP, stack_pointer);
	
	// Log
	mem_log(unicorn, stack_addr, 10)
}

function hook_mem_issue(unicorn) {
    document_log("MEMORY ISsue")
    var rip = unicorn.reg_read_i64(uc.X86_REG_RIP);
    reg_log(unicorn);
}

function start_thread(command, elf_entry, elf_end)
{
	// Set up stack
	set_up_stack(command);

	// Add system call hook
	unicorn.hook_add(uc.HOOK_INSN, hook_system_call, {}, 1, 0, uc.X86_INS_SYSCALL);
	unicorn.hook_add(uc.HOOK_MEM_READ_UNMAPPED, hook_mem_issue, {}, 1, 0, 0);

	// Log
	mem_log(unicorn, elf_entry, 10)
	reg_log(unicorn);

	// Start emulation
	document_log("[INFO]: emulation started at 0x" + elf_entry.toString(16) + ".")

    do {
    	try
	    {
	        if (continue_arch_prctl_flag) {
	            document_log("[INFO]: 2nd half of emulation")
	            continue_arch_prctl_flag = 0;
	            mem_log(unicorn, elf_entry, 10);
	            
	            unicorn.emu_start(elf_entry, elf_entry+2, 0, 0);
	            
	            document_log("[INFO]: prctl fixed");
	            unicorn.mem_write(elf_entry, continue_arch_prctl_mem);
	            unicorn.reg_write_i64(uc.X86_REG_RAX, continue_arch_prctl_rax);
                unicorn.reg_write_i64(uc.X86_REG_RDX, continue_arch_prctl_rdx);
                unicorn.reg_write_i64(uc.X86_REG_RCX, continue_arch_prctl_rcx);
	            
	            document_log("Continuing at" + continue_arch_prctl_rip.toString(16))
	            unicorn.emu_start(continue_arch_prctl_rip, elf_end , 0, 0);
	            
	        } else {
	        	unicorn.emu_start(elf_entry, elf_end , 0, 0);
	        }
	    }
	    catch (error)
	    {
		    document_log("[ERROR]: emulation failed: " + error + ".")
	    }
    } while (continue_arch_prctl_flag)


	// Log
	reg_log(unicorn);
}

>>>>>>> 302dc0382345f424aae872db6d7193851383583d
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
