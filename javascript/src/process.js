import File from "./file.js";
import Logger from "./logger.js";
import SystemCall from "./systemCallHandler.js";

export default class Process {
  constructor(pid, kernel, image) {
    this.pid = pid;

    this.terminal = kernel;
    this.image = image;

    this.executableBase = 0x0;
    this.interpreterBase = 0x0000ff000000;
    this.stackSize = 0x800000;
    this.stackBase = 0x7fffff800000;
    this.brkBase = 0;
    this.mmapBase = 0x7ff000000000;

    this.executableElf = null;
    this.executableEntry = 0x0;
    this.interpreter = "";
    this.interpreterEntry = 0x0;
    
    this.exit_flag = false;
    this.last_saved_rip = 0;

    this.trapped = false;
    this.unicorn = new uc.Unicorn(uc.ARCH_X86, uc.MODE_64);
    this.unicorn.set_integer_type(ELF_INT_OBJECT);
    this.command = [];

    this.file = new File(this.image);
    this.logger = new Logger();
    this.system_call = new SystemCall(
      this,
      this.unicorn,
      this.terminal,
      this.logger
    );
  }

  loadExecutable() {
    // Create ELF file object
    const executableBuffer = this.file.buffer;
    this.executableElf = new Elf(executableBuffer);

    // Check if file is ELF
    if (this.executableElf.kind() !== "elf") {
      this.logger.log_to_document("[ERROR]: executable is not an ELF file.");
      throw "[ERROR]: executable is not an ELF file.";
    }

    // Obtain ELF header
    const ehdr = this.executableElf.getehdr();

    // Check if file is x86_64
    if (ehdr.e_machine.num() !== EM_X86_64) {
      this.logger.log_to_document("[ERROR]: executable is not an x86_64 file.");
      throw "[ERROR]: executable is not an x86_64 file.";
    }

    // Check if file is position independent
    if (ehdr.e_type.num() == ET_EXEC) {
      this.executableBase = 0;
    }
    
    // Load segments to memory
    for (let i = 0; i < ehdr.e_phnum.num(); i++) {
      // Obtain program header
      const phdr = this.executableElf.getphdr(i);

      // Check if segment is loadable
      if (phdr.p_type.num() !== PT_LOAD || phdr.p_filesz.num() === 0) {
        // Check if segment is interpreter
        if (phdr.p_type.num() === PT_INTERP) {
          const segmentFileBase = phdr.p_offset.num();
          const segmentFileTop = segmentFileBase + phdr.p_filesz.num();
          const interpreterBuffer = new Uint8Array(
            executableBuffer.slice(segmentFileBase, segmentFileTop)
          );
          
          // Obtain interpreter file name
          this.interpreter = new TextDecoder("utf-8")
            .decode(interpreterBuffer)
            .replace(/\0/g, '');
        }
        continue;
      }

      // Obtain segment buffer
      const segmentFileBase = phdr.p_offset.num();
      const segmentFileTop = segmentFileBase + phdr.p_filesz.num();
      const segmentBuffer = new Uint8Array(
        executableBuffer.slice(segmentFileBase, segmentFileTop)
      );
      
      // Obtain segment memory
      const segmentMemoryBase =
        Math.floor(phdr.p_vaddr.num() / 0x1000) * 0x1000;
      const segmentMemoryTop =
        Math.ceil((phdr.p_vaddr.num() + phdr.p_memsz.num()) / 0x1000) * 0x1000;
      const segmentMemorySize = segmentMemoryTop - segmentMemoryBase;

      // Update base for brk syscall
      if (this.brkBase < this.executableBase + segmentMemoryTop) {
        this.brkBase = this.executableBase + segmentMemoryTop;
      }

      // Map and write memory
      this.unicorn.mem_map(
        this.executableBase + segmentMemoryBase,
        segmentMemorySize,
        uc.PROT_ALL
      );
      this.unicorn.mem_write(
        this.executableBase + phdr.p_vaddr.num(),
        segmentBuffer
      );
    }
    
    this.executableEntry = this.executableBase + ehdr.e_entry.num();
  }

  loadInterpreter() {
    // Check if there is no need to load interpreter
    if (this.interpreter === "") {
      return;
    }
    
    // Create interpreter file object
    const interpreterBuffer = this.image.files[this.interpreter.replace(/^\//, '')].buffer;
    const interpreterElf = new Elf(interpreterBuffer);

    // Check if interpreter is ELF
    if (interpreterElf.kind() !== "elf") {
      this.logger.log_to_document("[ERROR]: interpreter is not an ELF file.");
      throw "[ERROR]: interpreter is not an ELF file.";
    }

    // Obtain interpreter header
    const ehdr = interpreterElf.getehdr();

    // Check if interpreter is x86_64
    if (ehdr.e_machine.num() !== EM_X86_64) {
      this.logger.log_to_document("[ERROR]: interpreter is not an x86_64 file.");
      throw "[ERROR]: interpreter is not an x86_64 file.";
    }

    // Write segments to memory
    for (let i = 0; i < ehdr.e_phnum.num(); i++) {
      // Obtain program header
      const phdr = interpreterElf.getphdr(i);
      
      // Check if segment is loadable
      if (phdr.p_type.num() !== PT_LOAD || phdr.p_filesz.num() === 0) {
        continue;
      }

      // Obtain segment buffer
      const segmentFileBase = phdr.p_offset.num();
      const segmentFileTop = segmentFileBase + phdr.p_filesz.num();
      const segmentBuffer = new Uint8Array(
        interpreterBuffer.slice(segmentFileBase, segmentFileTop)
      );

      // Obtain segment memory
      const segmentMemoryBase =
        Math.floor(phdr.p_vaddr.num() / 0x1000) * 0x1000;
      const segmentMemoryTop =
        Math.ceil((phdr.p_vaddr.num() + phdr.p_memsz.num()) / 0x1000) * 0x1000;
      const segmentMemorySize = segmentMemoryTop - segmentMemoryBase;

      // Map and write memory
      this.unicorn.mem_map(
        this.interpreterBase + segmentMemoryBase,
        segmentMemorySize,
        uc.PROT_ALL
      );
      this.unicorn.mem_write(
        this.interpreterBase + phdr.p_vaddr.num(),
        segmentBuffer
      );
    }
    
    this.interpreterEntry = this.interpreterBase + ehdr.e_entry.num();
  }

  loadStack() {
    let stack_pointer = this.stackBase + this.stackSize;

    // Map memory for stack
    this.unicorn.mem_map(this.stackBase, this.stackSize, uc.PROT_ALL);

    // Set up stack
    // Refer to stack layout: https://www.win.tue.nl/~aeb/linux/hh/stack-layout.html

    // NULL pointer
    stack_pointer -= 8;

    // Program name
    stack_pointer -= this.file.file_name_command.length;
    this.unicorn.mem_write(
      stack_pointer,
      new TextEncoder("utf-8").encode(this.file.file_name_command)
    );

    // Environment string
    // Empty for now
    // PATH
    stack_pointer -= this.image.path.length + 1;
    this.unicorn.mem_write(
      stack_pointer,
      new TextEncoder("utf-8").encode(this.image.path)
    );
    const path_ptr = stack_pointer;
    let argv_pointers = [];
    //ARGV strings
    for (var i = 0; i < this.command.length; i++) {
      stack_pointer -= 1; // NULL termination of string
      stack_pointer -= this.command[i].length;
      this.unicorn.mem_write(
        stack_pointer,
        new TextEncoder("utf-8").encode(this.command[i])
      );
      argv_pointers.push(stack_pointer);
    }

    const ehdr = this.executableElf.getehdr();
    this.phoff = ehdr.e_phoff.num();
    this.phentsize = ehdr.e_phentsize.num();
    this.phnum = ehdr.e_phnum.num();
    // ELF Auxiliary Table
    // Empty for now, put NULL
    // AT_NULL
    stack_pointer -= 16;

    stack_pointer -= 192;

    // AT_ENTRY
    stack_pointer -= 16;
    this.unicorn.mem_write(
      stack_pointer,
      new Uint8Array(new ElfUInt64(0x09).chunks.buffer)
    );
    this.unicorn.mem_write(
      stack_pointer + 8,
      new Uint8Array(
        new ElfUInt64(this.executableEntry).chunks.buffer
      )
    );
    console.log((this.executableEntry).toString(16));

    // AT_FlaGS
    stack_pointer -= 16;
    this.unicorn.mem_write(
      stack_pointer,
      new Uint8Array(new ElfUInt64(0x08).chunks.buffer)
    );
    this.unicorn.mem_write(
      stack_pointer + 8,
      new Uint8Array(new ElfUInt64(0).chunks.buffer)
    );

    // AT_BASE
    stack_pointer -= 16;
    this.unicorn.mem_write(
      stack_pointer,
      new Uint8Array(new ElfUInt64(0x07).chunks.buffer)
    );
    const interpreter_base = this.interpreter == "" ? 0 : this.interpreterBase;
    this.unicorn.mem_write(
      stack_pointer + 8,
      new Uint8Array(new ElfUInt64(interpreter_base).chunks.buffer)
    );

    // AT_PAGESZ
    stack_pointer -= 16;
    this.unicorn.mem_write(
      stack_pointer,
      new Uint8Array(new ElfUInt64(0x06).chunks.buffer)
    );
    this.unicorn.mem_write(
      stack_pointer + 8,
      new Uint8Array(new ElfUInt64(0x1000).chunks.buffer)
    );

    // AT_Phnum
    //stack_pointer -= 16;
    //this.unicorn.mem_write(
    //  stack_pointer,
    //  new Uint8Array(new ElfUInt64(0x05).chunks.buffer)
    //);
    //this.unicorn.mem_write(
    //  stack_pointer + 8,
    //  new Uint8Array(new ElfUInt64(ehdr.e_phnum.num()).chunks.buffer)
    //);

    // AT_PHENT
    stack_pointer -= 16;
    this.unicorn.mem_write(
      stack_pointer,
      new Uint8Array(new ElfUInt64(0x04).chunks.buffer)
    );
    this.unicorn.mem_write(
      stack_pointer + 8,
      new Uint8Array(new ElfUInt64(ehdr.e_phentsize.num()).chunks.buffer)
    );

    // AT_PHDR
    stack_pointer -= 16;
    this.unicorn.mem_write(
      stack_pointer,
      new Uint8Array(new ElfUInt64(0x03).chunks.buffer)
    );
    this.unicorn.mem_write(
      stack_pointer + 8,
      new Uint8Array(
        new ElfUInt64(this.executableBase + ehdr.e_phoff.num()).chunks.buffer
      )
    );

    // NULL that ends envp[]
    stack_pointer -= 8;

    // PATH
    stack_pointer -= 8;
    this.unicorn.mem_write(
      stack_pointer,
      new Uint8Array(new ElfUInt64(path_ptr).chunks.buffer)
    );

    // NULL that ends argv[]
    stack_pointer -= 8;

    // Argv pointers (reversed)
    for (var i = argv_pointers.length - 1; i >= 0; i--) {
      stack_pointer -= 8;
      this.unicorn.mem_write(
        stack_pointer,
        new Uint8Array(new ElfUInt64(argv_pointers[i]).chunks.buffer)
      );
    }

    // Write argc
    stack_pointer -= 8;
    this.unicorn.mem_write(
      stack_pointer,
      new Uint8Array(new ElfUInt64(argv_pointers.length).chunks.buffer)
    );

    // Write rsp
    this.unicorn.reg_write_i64(uc.X86_REG_RSP, stack_pointer);
  }

  load(command) {
    if (command[0]) {
      this.file.open(command[0]);
      this.command = command;
    } else {
      this.file.open(this.image.command[0]);
      this.command = this.image.command;
    }

    this.loadExecutable();
    this.loadInterpreter();
    this.loadStack();
    // Write rip
    this.last_saved_rip = this.interpreterEntry
      ? this.interpreterEntry
      : this.executableEntry;
    // Start emulation
    this.logger.log_to_document(
      "[INFO]: emulation started at 0x" + this.last_saved_rip.toString(16) + "."
    );
  }
}
