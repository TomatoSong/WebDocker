import File from "./file.js";
import Logger from "./logger.js";
import SystemCall from "./systemCallHandler.js";

export default class Process {
  constructor(pid, kernel, image) {
    this.pid = pid;

    this.terminal = kernel;
    this.image = image;
    
    this.executableAddress = 0x0;
    this.stackSize = 0x800000;
    this.stackAddress = 0x7fffff800000;
    this.interpreterAddress = 0x7f0000000000;
    
    this.elf_entry = 0;
    this.elf_end = 0;
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

  load_interpreter(ld_so_buffer) {}

  load_executable() {
    // Create ELF file object
    let buffer = this.file.buffer;
    let elf = new Elf(this.file.buffer);

    // Check if file is ELF
    if (elf.kind() !== "elf") {
      this.logger.log_to_document("[ERROR]: not an ELF file.");
      throw "[ERROR]: not an ELF file.";
    }

    // Obtain ELF header
    let ehdr = elf.getehdr();

    // Check if file is x86_64
    if (ehdr.e_machine.num() !== EM_X86_64) {
      this.logger.log_to_document("[ERROR]: not an x86_64 file.");
      throw "[ERROR]: not an x86_64 file.";
    }

    this.elf_entry = ehdr.e_entry.num();
    this.phoff = ehdr.e_phoff.num();
    this.phentsize = ehdr.e_phentsize.num();
    this.phnum = ehdr.e_phnum.num();
    this.system_call.elf_entry = this.elf_entry;
    this.elf_end = buffer.byteLength;

    // Write segments to memory
    for (let i = 0; i < ehdr.e_phnum.num(); i++) {
      const phdr = elf.getphdr(i);

      if (phdr.p_type.num() !== PT_LOAD || phdr.p_filesz.num() === 0) {
        if (phdr.p_type.num() == PT_INTERP) {
          const seg_start = phdr.p_offset.num();
          const seg_end = seg_start + phdr.p_filesz.num();
          const interpreter = new Uint8Array(
            buffer.slice(seg_start, seg_end)
          );
          const character = new TextDecoder("utf-8")
            .decode(interpreter)
            .slice(1, -1);
          console.log(this.image.files[character].buffer);
          ld_so_filebuffer = this.image.files[character].buffer;

          this.load_interpreter(ld_so_filebuffer);
        }
        continue;
      }

      const seg_start = phdr.p_offset.num();
      const seg_end = seg_start + phdr.p_filesz.num();
      const seg_data = new Uint8Array(
        buffer.slice(seg_start, seg_end)
      );

      // Map memory for ELF file
      const seg_size = phdr.p_memsz.num();
      const mem_start =
        Math.floor(phdr.p_vaddr.num() / (4 * 1024)) * (4 * 1024);
      const mem_end =
        Math.ceil((phdr.p_vaddr.num() + seg_size) / (4 * 1024)) * (4 * 1024);
      const mem_diff = mem_end - mem_start;

      this.logger.log_to_document(
        "[INFO]: mmap range: " +
          mem_start.toString(16) +
          " " +
          mem_end.toString(16)
      );

      if (this.system_call.data_end < mem_end) {
        this.system_call.data_end = mem_end;
      }

      this.unicorn.mem_map(mem_start, mem_diff, uc.PROT_ALL);
      this.unicorn.mem_write(phdr.p_vaddr.num(), seg_data);
    }
  }

  load_stack() {
    let stack_pointer = this.stackAddress + this.stackSize;


    // Map memory for stack
    this.unicorn.mem_map(this.stackAddress, this.stackSize, uc.PROT_ALL);

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
      new Uint8Array(new ElfUInt64(this.elf_entry).chunks.buffer)
    );

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
    this.unicorn.mem_write(
      stack_pointer + 8,
      new Uint8Array(new ElfUInt64(0).chunks.buffer)
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
    stack_pointer -= 16;
    this.unicorn.mem_write(
      stack_pointer,
      new Uint8Array(new ElfUInt64(0x05).chunks.buffer)
    );
    this.unicorn.mem_write(
      stack_pointer + 8,
      new Uint8Array(new ElfUInt64(this.punum).chunks.buffer)
    );

    // AT_PHENT
    stack_pointer -= 16;
    this.unicorn.mem_write(
      stack_pointer,
      new Uint8Array(new ElfUInt64(0x04).chunks.buffer)
    );
    this.unicorn.mem_write(
      stack_pointer + 8,
      new Uint8Array(new ElfUInt64(this.phentsize).chunks.buffer)
    );

    // AT_PHDR
    stack_pointer -= 16;
    this.unicorn.mem_write(
      stack_pointer,
      new Uint8Array(new ElfUInt64(0x03).chunks.buffer)
    );
    this.unicorn.mem_write(
      stack_pointer + 8,
      new Uint8Array(new ElfUInt64(this.phoff).chunks.buffer)
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
    
    this.load_executable();
    this.load_interpreter()
    this.load_stack();

    // Start emulation
    this.logger.log_to_document(
      "[INFO]: emulation started at 0x" + this.elf_entry.toString(16) + "."
    );
    
    // Write rip
    this.last_saved_rip = this.elf_entry;
  }
}
