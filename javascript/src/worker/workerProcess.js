class Process {
  constructor(pid, kernel, image) {
    this.pid = pid;

    this.terminal = kernel;
    this.image = { path: "busybox" };

    // Fixed base during loading
    this.executableBase = 0x0;
    this.interpreterBase = 0x0000ff000000;
    this.stackSize = 0x800000;
    this.stackBase = 0x7fffff800000;
    // Adjustable base during loading
    this.brkBase = 0;
    this.mmapBase = 0x7ff000000000;
    this.ehdrBase = 0x800000000000;

    this.executableElf = null;
    this.executableEntry = 0x0;
    this.interpreter = "";
    this.interpreterEntry = 0x0;

    this.unicorn = new uc.Unicorn(uc.ARCH_X86, uc.MODE_64);
    this.unicorn.set_integer_type(ELF_INT_OBJECT);

    this.exit_flag = false;
    this.last_saved_rip = 0;

    this.trapped = false;

    this.command = [];

    this.file = new File(this.image);
    this.logger = {
      log_to_document: (msg) => {
        console.log(msg);
      },
    };

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
            .replace(/\0/g, "");
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

      // Update base for ehdr table
      if (this.ehdrBase > this.executableBase + segmentMemoryBase) {
        this.ehdrBase = this.executableBase + segmentMemoryBase;
      }

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
    const interpreterFile = new File(this.image);
    interpreterFile.open(this.interpreter.replace(/^\//, ""));
    const interpreterBuffer = interpreterFile.buffer;
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
      this.logger.log_to_document(
        "[ERROR]: interpreter is not an x86_64 file."
      );
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
    // Map memory for stack
    this.unicorn.mem_map(this.stackBase, this.stackSize, uc.PROT_ALL);

    // Set up stack
    // with following layout: https://www.win.tue.nl/~aeb/linux/hh/stack-layout.html
    let stackPointer = this.stackBase + this.stackSize;

    // NULL
    stackPointer -= 8;

    // program name
    stackPointer -= this.file.file_name_command.length + 1;
    this.unicorn.mem_write(
      stackPointer,
      new TextEncoder("utf-8").encode(this.file.file_name_command)
    );
    let programNamePointer = stackPointer;

    // envp strings
    let envpPointers = [];
    stackPointer -= this.image.path.length + 1;
    this.unicorn.mem_write(
      stackPointer,
      new TextEncoder("utf-8").encode(this.image.path)
    );
    envpPointers.unshift(stackPointer);

    // argv strings
    let argvPointers = [];
    for (let i = this.command.length - 1; i >= 0; i--) {
      stackPointer -= this.command[i].length + 1;
      this.unicorn.mem_write(
        stackPointer,
        new TextEncoder("utf-8").encode(this.command[i])
      );
      argvPointers.unshift(stackPointer);
    }

    // Alignment
    stackPointer -= stackPointer & 0xf;

    // auxv data
    stackPointer -= "x86_64".length + 1;
    this.unicorn.mem_write(
      stackPointer,
      new TextEncoder("utf-8").encode("x86_64")
    );
    let platformPointer = stackPointer;
    stackPointer -= 16;
    this.unicorn.mem_write(
      stackPointer,
      crypto.getRandomValues(new Uint8Array(16))
    );
    let randomPointer = stackPointer;

    // Alignment
    stackPointer -= stackPointer & 0xf;

    // auxv table
    // AT_NULL 0x00
    stackPointer -= 16;

    // AT_PLATFORM 0x0F;
    stackPointer -= 16;
    this.unicorn.mem_write(
      stackPointer,
      new Uint8Array(new ElfUInt64(0x0f).chunks.buffer)
    );
    this.unicorn.mem_write(
      stackPointer + 8,
      new Uint8Array(new ElfUInt64(platformPointer).chunks.buffer)
    );

    // AT_EXECFN 0x1F
    stackPointer -= 16;
    this.unicorn.mem_write(
      stackPointer,
      new Uint8Array(new ElfUInt64(0x1f).chunks.buffer)
    );
    this.unicorn.mem_write(
      stackPointer + 8,
      new Uint8Array(new ElfUInt64(programNamePointer).chunks.buffer)
    );

    // AT_RANDOM 0x19
    stackPointer -= 16;
    this.unicorn.mem_write(
      stackPointer,
      new Uint8Array(new ElfUInt64(0x19).chunks.buffer)
    );
    this.unicorn.mem_write(
      stackPointer + 8,
      new Uint8Array(new ElfUInt64(randomPointer).chunks.buffer)
    );

    // AT_SECURE 0x17
    stackPointer -= 16;
    this.unicorn.mem_write(
      stackPointer,
      new Uint8Array(new ElfUInt64(0x17).chunks.buffer)
    );
    this.unicorn.mem_write(
      stackPointer + 8,
      new Uint8Array(new ElfUInt64(0).chunks.buffer)
    );

    // AT_ENTRY 0x09
    stackPointer -= 16;
    this.unicorn.mem_write(
      stackPointer,
      new Uint8Array(new ElfUInt64(0x09).chunks.buffer)
    );
    this.unicorn.mem_write(
      stackPointer + 8,
      new Uint8Array(new ElfUInt64(this.executableEntry).chunks.buffer)
    );

    // AT_FLAGS 0x08
    stackPointer -= 16;
    this.unicorn.mem_write(
      stackPointer,
      new Uint8Array(new ElfUInt64(0x08).chunks.buffer)
    );
    this.unicorn.mem_write(
      stackPointer + 8,
      new Uint8Array(new ElfUInt64(0).chunks.buffer)
    );

    const ehdr = this.executableElf.getehdr();
    // AT_BASE 0x07
    stackPointer -= 16;
    this.unicorn.mem_write(
      stackPointer,
      new Uint8Array(new ElfUInt64(0x07).chunks.buffer)
    );
    this.unicorn.mem_write(
      stackPointer + 8,
      new Uint8Array(
        new ElfUInt64(
          this.interpreter === "" ? 0 : this.interpreterBase
        ).chunks.buffer
      )
    );

    // AT_PHNUM 0x05
    stackPointer -= 16;
    this.unicorn.mem_write(
      stackPointer,
      new Uint8Array(new ElfUInt64(0x05).chunks.buffer)
    );
    this.unicorn.mem_write(
      stackPointer + 8,
      new Uint8Array(new ElfUInt64(ehdr.e_phnum.num()).chunks.buffer)
    );

    // AT_PHENT 0x04
    stackPointer -= 16;
    this.unicorn.mem_write(
      stackPointer,
      new Uint8Array(new ElfUInt64(0x04).chunks.buffer)
    );
    this.unicorn.mem_write(
      stackPointer + 8,
      new Uint8Array(new ElfUInt64(ehdr.e_phentsize.num()).chunks.buffer)
    );

    // AT_PHDR 0x03
    stackPointer -= 16;
    this.unicorn.mem_write(
      stackPointer,
      new Uint8Array(new ElfUInt64(0x03).chunks.buffer)
    );
    this.unicorn.mem_write(
      stackPointer + 8,
      new Uint8Array(
        new ElfUInt64(this.ehdrBase + ehdr.e_phoff.num()).chunks.buffer
      )
    );

    // AT_PAGESZ 0x06
    stackPointer -= 16;
    this.unicorn.mem_write(
      stackPointer,
      new Uint8Array(new ElfUInt64(0x06).chunks.buffer)
    );
    this.unicorn.mem_write(
      stackPointer + 8,
      new Uint8Array(new ElfUInt64(0x1000).chunks.buffer)
    );

    // envp pointers with NULL
    stackPointer -= 8;
    for (let i = envpPointers.length - 1; i >= 0; i--) {
      stackPointer -= 8;
      this.unicorn.mem_write(
        stackPointer,
        new Uint8Array(new ElfUInt64(envpPointers[i]).chunks.buffer)
      );
    }

    // argv pointers with NULL
    stackPointer -= 8;
    for (let i = argvPointers.length - 1; i >= 0; i--) {
      stackPointer -= 8;
      this.unicorn.mem_write(
        stackPointer,
        new Uint8Array(new ElfUInt64(argvPointers[i]).chunks.buffer)
      );
    }

    // argc
    stackPointer -= 8;
    this.unicorn.mem_write(
      stackPointer,
      new Uint8Array(new ElfUInt64(argvPointers.length).chunks.buffer)
    );

    // Write rsp
    this.unicorn.reg_write_i64(uc.X86_REG_RSP, stackPointer);
  }

  load(command) {
    if (command[0]) {
      this.file.open(command[0]);
      this.command = command;
    } else {
      //this.file.open(this.image.command[0]);

      //FIXME: hardcode for web worker testing
      this.command = ["busybox"];
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
