
class SystemCall {
  constructor(process, unicorn, terminal, logger) {
    this.process = process;
    this.unicorn = unicorn;
    this.terminal = terminal;
    this.logger = logger;

    this.heap_addr = 0;
    this.mmap_addr = 0;

    this.arch_prctl_flag = false;
    this.arch_prctl_rip = 0;
    this.arch_prctl_rcx = 0;
    this.arch_prctl_rdx = 0;
    this.arch_prctl_mem = 0;
    this.saved_arch_prctl_fs = 0;

    this.continue_read_rip = 0;
    this.syscall_yield_flag = false;
    this.execve_flag = false;
    this.child_pid = 0;
    this.opened_files = { 0: null, 1: null, 2: null };

    this.unicorn.hook_add(
      uc.HOOK_INSN,
      this.hook_system_call.bind(this),
      {},
      1,
      0,
      uc.X86_INS_SYSCALL
    );

    this.system_call_dictionary = {
      0: this.read.bind(this),
      1: this.write.bind(this),
      2: this.open.bind(this),
      3: this.close.bind(this),
      4: this.stat.bind(this),
      5: this.fstat.bind(this),
      9: this.mmap.bind(this),
      10: this.mprotect.bind(this),
      11: this.munmap.bind(this),
      12: this.brk.bind(this),
      13: this.rt_sigaction.bind(this),
      16: this.ioctl.bind(this),
      20: this.writev.bind(this),
      21: this.access.bind(this),
      33: this.dup2.bind(this),
      39: this.getpid.bind(this),
      56: this.clone.bind(this),
      58: this.vfork.bind(this),
      59: this.execve.bind(this),
      60: this.exit.bind(this),
      61: this.wait4.bind(this),
      63: this.uname.bind(this),
      72: this.fcntl.bind(this),
      79: this.getcwd.bind(this),
      102: this.getuid.bind(this),
      103: this.syslog.bind(this),
      110: this.getppid.bind(this),
      158: this.arch_prctl.bind(this),
      186: this.gettid.bind(this),
      201: this.time.bind(this),
      218: this.set_tid_address.bind(this),
      228: this.clock_gettime.bind(this),
      231: this.exit_group.bind(this),
      235: this.utimes.bind(this),
      257: this.openat.bind(this),
    };
  }

  read(fd, buf, count) {
    const rdi = this.unicorn.reg_read_i64(uc.X86_REG_RDI);
    const rsi = this.unicorn.reg_read_i64(uc.X86_REG_RSI);
    const rdx = this.unicorn.reg_read_i64(uc.X86_REG_RDX);
    const rip = this.unicorn.reg_read_i64(uc.X86_REG_RIP);

    if (rdi.num() != 0) {
      if (this.opened_files[fd.num()]) {
        let seek = this.opened_files[fd.num()].seek;
        if (seek + count.num() > this.opened_files[fd.num()].buffer.length) {
          count = new ElfUint64(
            this.opened_files[fd.num()].buffer.length - seek
          );
        }
        this.unicorn.mem_write(
          buf,
          new Uint8Array(
            this.opened_files[fd.num()].buffer.slice(seek, seek + count.num())
          )
        );
        this.opened_files[fd.num()].seek = seek + count.num();
        this.unicorn.reg_write_i64(uc.X86_REG_RAX, count.num());
      }
      return;
    }

    if (this.continue_read_rip == rip.num()) {
      let buffer = this.process.buffer;
      this.process.buffer = "";

      if (rdx.num() - 1 < buffer.length) {
        buffer = buffer.slice(0, rdx.num() - 1);
      }

      if (buffer[buffer.length - 1] != "\n") {
        buffer += "\n";
      }

      this.unicorn.mem_write(rsi, new TextEncoder("utf-8").encode(buffer));
      this.unicorn.reg_write_i64(uc.X86_REG_RAX, buffer.length);

      this.continue_read_rip = 0;
    } else {
      this.process.trapped = true;
      self.postMessage({type: "READ_TERMINAL"});
      this.continue_read_rip = rip;
      this.unicorn.emu_stop();
    }
  }

  write(fd, buf, count) {
    if (fd.num() != 1 && fd.num() != 2) {
      return;
    }

    const buffer = this.unicorn.mem_read(buf, count.num());
    const string = new TextDecoder("utf-8").decode(buffer);

    self.postMessage({type: "WRITE_TERMINAL", payload: string});
    this.syscall_yield_flag = true;

    return count.num();
  }

  open(path, flags) {
    let pointer = path.num();
    let character = "";
    character = this.unicorn.mem_read(pointer, 1);
    character = new TextDecoder("utf-8").decode(character);
    let path_name = "";

    while (character.toString() != "\0") {
      path_name += character;
      pointer += 1;
      character = this.unicorn.mem_read(pointer, 1);
      character = new TextDecoder("utf-8").decode(character);
    }

    if (path_name === "/dev/null") {
      const fd = Object.keys(this.opened_files).length;
      this.opened_files[fd] = 1;
      return fd;
    }

    //get new fd
    const fd = Object.keys(this.opened_files).length;

    this.opened_files[fd] = new File(this.process.image);
    this.opened_files[fd].open(path_name);
    console.log(this.opened_files[fd].buffer);
    console.log(this.opened_files[fd].file_found);
    console.log(fd);
    if (this.opened_files[fd].file_found == false) {
      this.unicorn.reg_write_i64(uc.X86_REG_RAX, -2);
    } else {
      this.unicorn.reg_write_i64(uc.X86_REG_RAX, fd);
    }
  }

  close() {
    this.unicorn.reg_write_i64(uc.X86_REG_RAX, 0);
  }

  stat(pathname, statbuf) {
    let pointer = pathname.num();
    let character = "";
    character = this.unicorn.mem_read(pointer, 1);
    character = new TextDecoder("utf-8").decode(character);
    let path_name = "";

    while (character.toString() != "\0") {
      path_name += character;
      pointer += 1;
      character = this.unicorn.mem_read(pointer, 1);
      character = new TextDecoder("utf-8").decode(character);
    }

    let file = new File(this.process.image);
    file.open(path_name);
    if (file.file_found == false) {
      return -2;
    }
    let file_obj = file.file_obj;
    // nlink
    this.unicorn.mem_write(
      statbuf.num() + 24,
      new Uint8Array(new ElfUInt64(1).chunks.buffer)
    );
    // size
    this.unicorn.mem_write(
      statbuf.num() + 48,
      new Uint8Array(new ElfUInt64(file_obj.buffer.length).chunks.buffer)
    );
    // blksize
    this.unicorn.mem_write(
      statbuf.num() + 56,
      new Uint8Array(new ElfUInt64(0x1000).chunks.buffer)
    );
    // blocks
    this.unicorn.mem_write(
      statbuf.num() + 60,
      new Uint8Array(
        new ElfUInt64(Math.ceil(file_obj.buffer.length / 0x1000)).chunks.buffer
      )
    );
    return 0;
  }

  fstat(fd, statbuf) {
    let file_obj = this.opened_files[fd.num()].file_obj;
    // nlink
    this.unicorn.mem_write(
      statbuf.num() + 24,
      new Uint8Array(new ElfUInt64(1).chunks.buffer)
    );
    // size
    this.unicorn.mem_write(
      statbuf.num() + 48,
      new Uint8Array(new ElfUInt64(file_obj.buffer.length).chunks.buffer)
    );
    // blksize
    this.unicorn.mem_write(
      statbuf.num() + 56,
      new Uint8Array(new ElfUInt64(0x1000).chunks.buffer)
    );
    // blocks
    this.unicorn.mem_write(
      statbuf.num() + 60,
      new Uint8Array(
        new ElfUInt64(Math.ceil(file_obj.buffer.length / 0x1000)).chunks.buffer
      )
    );
    return 0;
  }

  mmap(addr, length, prot, flags, fd, offset) {
    if (this.mmap_addr == 0) {
      this.mmap_addr = this.process.mmapBase;
    }
    const adjustedLength = Math.ceil(length.num() / 0x1000) * 0x1000;
    this.logger.log_to_document("MMAP:");
    this.logger.log_to_document([addr.hex(), length.hex()]);
    this.logger.log_to_document([this.mmap_addr.toString(16), length.hex()]);

    // Program required this address
    if (addr.num() > this.mmap_addr) {
      this.mmap_addr = addr.num();
    }

    // Assmue length is page aligned
    this.logger.log_to_document([addr.hex(), length.hex()]);
    this.logger.log_to_document([this.mmap_addr.toString(16), length.hex()]);
    this.unicorn.mem_map(this.mmap_addr, adjustedLength, uc.PROT_ALL);

    if (this.opened_files[fd.num()]) {
      const file_mapped = new Uint8Array(
        this.opened_files[fd.num()].buffer.slice(
          offset.num(),
          offset.num() + length.num()
        )
      );
      if (addr.num() != 0) {
        this.unicorn.mem_write(addr.num(), file_mapped);
      } else {
        this.unicorn.mem_write(this.mmap_addr, file_mapped);
      }
    }

    if (addr.num() != 0) {
      this.unicorn.reg_write_i64(uc.X86_REG_RAX, addr.num());
    } else {
      this.unicorn.reg_write_i64(uc.X86_REG_RAX, this.mmap_addr);
    }

    this.mmap_addr += adjustedLength;
    this.syscall_yield_flag = true;
  }

  mprotect() {
    this.unicorn.reg_write_i64(uc.X86_REG_RAX, 0);
    this.syscall_yield_flag = true;
  }

  munmap(addr, length) {
    this.unicorn.reg_write_i64(uc.X86_REG_RAX, 0);
    this.syscall_yield_flag = true;
  }

  brk() {
    const rdi = this.unicorn.reg_read_i64(uc.X86_REG_RDI);

    if (this.heap_addr == 0) {
      this.heap_addr = this.process.brkBase;
    }

    if (rdi.num() < this.heap_addr) {
      this.unicorn.reg_write_i64(uc.X86_REG_RAX, this.heap_addr);
      return;
    }

    if (
      Math.floor((rdi.num() - 1) / 4096) >
      Math.floor((this.heap_addr - 1) / 4096)
    ) {
      // Page fault handling
      let map_base = (Math.floor((this.heap_addr - 1) / 4096) + 1) * 4096;
      let size = Math.ceil(rdi.num() / 4096) * 4096;
      this.unicorn.mem_map(map_base, size - map_base, uc.PROT_ALL);
    }

    this.heap_addr = rdi.num();
    this.unicorn.reg_write_i64(uc.X86_REG_RAX, this.heap_addr);
    this.syscall_yield_flag = true;
  }

  rt_sigaction() {
    this.unicorn.reg_write_i64(uc.X86_REG_RAX, 0);
  }

  ioctl() {}

  writev(fd, iov, iovcnt) {
    let bytes_written = 0;
    for (var i = 0; i < iovcnt.num(); i++) {
      let iovec = this.unicorn.mem_read(iov.num() + i * 16, 16);

      //Very disappointed at js buffer conversion
      let iov_base =
        iovec[5] * 1099511627776 +
        iovec[4] * 4294967296 +
        iovec[3] * 16777216 +
        iovec[2] * 65536 +
        iovec[1] * 256 +
        iovec[0];
      let iov_len =
        iovec[13] * 1099511627776 +
        iovec[12] * 4294967296 +
        iovec[11] * 16777216 +
        iovec[10] * 65536 +
        iovec[9] * 256 +
        iovec[8];

      const buffer = this.unicorn.mem_read(iov_base, iov_len);
      const string = new TextDecoder("utf-8").decode(buffer);
      self.postMessage({type: "WRITE_TERMINAL", payload: string});
      this.syscall_yield_flag = true;

      bytes_written += iov_len;
    }

    this.unicorn.reg_write_i64(uc.X86_REG_RAX, bytes_written);
  }

  access(pathname, mode) {
    let pointer = pathname.num();
    let character = "";
    character = this.unicorn.mem_read(pointer, 1);
    character = new TextDecoder("utf-8").decode(character);
    let path_name = "";

    while (character.toString() != "\0") {
      path_name += character;
      pointer += 1;
      character = this.unicorn.mem_read(pointer, 1);
      character = new TextDecoder("utf-8").decode(character);
    }

    const file = new File(this.process.image);
    file.open(path_name);
    if (file.file_found == false) {
      this.unicorn.reg_write_i64(uc.X86_REG_RAX, -2);
    } else {
      this.unicorn.reg_write_i64(uc.X86_REG_RAX, 0);
    }
  }

  dup2(oldfd, newfd) {
    return newfd.num();
  }

  getpid() {
    this.syscall_yield_flag = true;

    return this.process.pid;
  }

  getuid() {
    this.syscall_yield_flag = true;

    // For now we assume running as root user
    return 0;
  }

  syslog(type, bufp, len) {
    if (bufp.num() != 0) {
      this.unicorn.mem_write(
        bufp,
        new TextEncoder("utf-8").encode("Future WebDocker log goes here")
      );
    }
    this.unicorn.reg_write_i64(
      uc.X86_REG_RAX,
      "Future WebDocker log goes here".length
    );
  }

  getppid() {}
  vfork() {
    this.clone();
  }

  clone() {
    var original = this.process.unicorn;
    var stackMemory = original.mem_read(
      this.process.stackBase,
      this.process.stackSize
    );

    var mem_lower = original.mem_read(0x401000, this.heap_addr - 0x401000);

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

    var new_pid = this.terminal.get_new_pid();
    var cloned_process = new Process(
      new_pid,
      this.terminal,
      this.process.image
    );

    var cloned = cloned_process.unicorn;

    cloned.set_integer_type(ELF_INT_OBJECT);

    function page_floor(address) {
      return Math.floor(address / (4 * 1024)) * (4 * 1024);
    }

    function page_ceil(address) {
      return Math.ceil(address / (4 * 1024)) * (4 * 1024);
    }

    cloned.mem_map(
      page_floor(0x401000),
      page_ceil(this.heap_addr) - page_floor(0x401000),
      uc.PROT_ALL
    );
    cloned.mem_write(0x401000, mem_lower);
    cloned.mem_map(this.process.stackBase, this.process.stackSize, uc.PROT_ALL);
    cloned.mem_write(this.process.stackBase, stackMemory);
    // fix fs
    cloned.reg_write_i64(uc.X86_REG_RAX, this.saved_arch_prctl_fs);
    cloned.reg_write_i64(uc.X86_REG_RDX, 0);
    cloned.reg_write_i64(uc.X86_REG_RCX, 0xc0000100);
    cloned.mem_write(this.process.executableEntry, [0x0f, 0x30]);
    cloned.emu_start(
      this.process.executableEntry,
      this.process.executableEntry + 2,
      0,
      0
    );

    cloned.reg_write_i64(uc.X86_REG_RAX, 0);
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
    this.child_pid = new_pid;

    this.terminal.processes[new_pid] = cloned_process;
    this.terminal.processes[new_pid].last_saved_rip = rip.num() + 2;
    this.unicorn.reg_write_i64(uc.X86_REG_RAX, new_pid);
  }

  execve() {
    const rdi = this.unicorn.reg_read_i64(uc.X86_REG_RDI);
    const rsi = this.unicorn.reg_read_i64(uc.X86_REG_RSI);
    const rdx = this.unicorn.reg_read_i64(uc.X86_REG_RDX);

    let ptr = rdi;
    let c = "";
    let filename = "";

    while (c.toString() != "\0") {
      c = this.unicorn.mem_read(ptr, 1);
      c = new TextDecoder("utf-8").decode(c);
      filename += c;
      ptr += 1;
    }

    let filename_array = filename.split("/");
    filename = filename_array[filename_array.length - 1];
    filename = filename.slice(0, filename.length - 1);
    console.log(filename);

    ptr = rsi;
    c = "";
    let argv = "";

    while (c.toString() != "\0") {
      c = this.unicorn.mem_read(ptr, 1);
      c = new TextDecoder("utf-8").decode(c);
      argv += c;
      ptr += 1;
    }
    console.log(argv);

    argv = argv.split(" ");
    argv = argv.slice(0, argv.length - 1);
    console.log(argv);
    argv.unshift(filename);
    console.log(argv);

    this.execve_flag = true;
    this.execve_command = argv;
    this.process.unicorn.emu_stop();
    return;
  }

  exit(status) {
    this.unicorn.emu_stop();
    this.process.exit_flag = true;

    if (status.num() != 0) {
      //this.terminal.writeln("WARN: program exit with code " + status.num() + ".");
    }
    //this.terminal.shell.prompt();
  }

  wait4() {
    // TODO: handle this
    this.wait4_flag = true;

    const rdi = this.unicorn.reg_read_i64(uc.X86_REG_RDI);
    this.unicorn.reg_write_i64(uc.X86_REG_RAX, this.child_pid);
    this.syscall_yield_flag = true;
  }

  uname(buf) {
    const FIELD_LENGTH = (1 << 6) + 1;
    const fields = [
      "Linux\0",
      "WebDocker\0",
      "5.4.0-53-generic\0",
      "v4/24/2021\0",
      "x86_64\0",
    ];

    fields.forEach((field, index) =>
      this.unicorn.mem_write(
        buf.num() + index * FIELD_LENGTH,
        new TextEncoder("utf-8").encode(field)
      )
    );

    this.syscall_yield_flag = true;
    return 0;
  }

  fcntl() {
    return 0;
  }

  getcwd() {
    const rdi = this.unicorn.reg_read_i64(uc.X86_REG_RDI);
    const rsi = this.unicorn.reg_read_i64(uc.X86_REG_RSI);

    this.unicorn.mem_write(rdi, new TextEncoder("utf-8").encode("/\0"));
    this.syscall_yield_flag = true;
  }

  arch_prctl(code, addr) {
    // FIXME:
    // a) We should be able to write to uc.X86_REG_FS
    //    using unicorn.reg_write(uc.X86_REG_FS, addr.chunks.buffer);
    //    But this method does not seem to work
    // b) We should also be able to write to uc.X86_REG_MSR
    //    const fs_msr = [0x00, 0x01, 0x00, 0xc0, 0x00, 0x00, 0x00, 0x00, 0xb8, 0xe4, 0x11, 0x00];
    //    unicorn.reg_write(uc.X86_REG_MSR, fs_msr);
    //    And verify it with
    //    console.log(unicorn.reg_read(uc.X86_REG_MSR, 12));
    //    But reg_read does not allow half filled buffer
    //    Both need a fix from upstream

    if (this.arch_prctl_rip === 0) {
      this.arch_prctl_flag = true;
      // Save registers and memory before clobbering them
      this.saved_arch_prctl_fs = addr;
      this.arch_prctl_rip = this.unicorn.reg_read_i64(uc.X86_REG_RIP);
      this.arch_prctl_rcx = this.unicorn.reg_read_i64(uc.X86_REG_RCX);
      this.arch_prctl_rdx = this.unicorn.reg_read_i64(uc.X86_REG_RDX);
      this.arch_prctl_mem = this.unicorn.mem_read(
        this.process.executableEntry,
        2
      );

      // Clobber registers and memory
      this.unicorn.reg_write_i64(uc.X86_REG_RAX, addr);
      this.unicorn.reg_write_i64(uc.X86_REG_RDX, 0);
      this.unicorn.reg_write_i64(uc.X86_REG_RCX, 0xc0000100);
      this.unicorn.mem_write(
        this.process.executableEntry,
        [0x0f, 0x30] // wrmsr
      );

      this.unicorn.emu_stop();
      return;
    } else {
      // Restore registers and memory
      this.arch_prctl_rip = 0;
      this.process.unicorn.mem_write(
        this.process.executableEntry,
        this.process.system_call.arch_prctl_mem
      );
      this.process.unicorn.reg_write_i64(
        uc.X86_REG_RCX,
        this.process.system_call.continue_arch_prctl_rcx
      );
      this.process.unicorn.reg_write_i64(
        uc.X86_REG_RDX,
        this.process.system_call.continue_arch_prctl_rdx
      );

      // Reset temporary variable
      this.arch_prctl_rcx = 0;
      this.arch_prctl_rdx = 0;
      this.arch_prctl_mem = [];

      this.syscall_yield_flag = true;
      return 0;
    }
  }

  gettid() {
    this.syscall_yield_flag = true;
    return 0;
  }

  time(tloc) {
    const now = new Date();
    const utcMilllisecondsSinceEpoch =
      now.getTime() + now.getTimezoneOffset() * 60 * 1000;
    const utcSecondsSinceEpoch = Math.round(utcMilllisecondsSinceEpoch / 1000);
    if (tloc.num() != 0) {
      this.unicorn.mem_write(
        tloc,
        new Uint8Array(new ElfUInt64(utcSecondsSinceEpoch).chunks.buffer)
      );
    }
    this.syscall_yield_flag = true;
    return utcSecondsSinceEpoch;
  }

  set_tid_address() {
    this.unicorn.reg_write_i64(uc.X86_REG_RAX, 5000);
    this.syscall_yield_flag = true;
  }

  clock_gettime(clockid, tp) {
    const now = new Date();
    const utcMilllisecondsSinceEpoch =
      now.getTime() + now.getTimezoneOffset() * 60 * 1000;
    const utcSecondsSinceEpoch = Math.floor(utcMilllisecondsSinceEpoch / 1000);
    const residueMilliseconds =
      utcMilllisecondsSinceEpoch - utcSecondsSinceEpoch * 1000;
    this.unicorn.mem_write(
      tp,
      new Uint8Array(new ElfUInt64(utcSecondsSinceEpoch).chunks.buffer)
    );
    this.unicorn.mem_write(
      tp.num() + 8,
      new Uint8Array(new ElfUInt64(residueMilliseconds).chunks.buffer)
    );

    this.unicorn.reg_write_i64(uc.X86_REG_RAX, 0);
    this.syscall_yield_flag = true;
  }

  exit_group(status) {
    this.exit(status);
  }

  utimes(filename, times) {
    let pointer = filename;
    let character = "";
    let path_name = "";

    while (character.toString() != "\0") {
      character = this.unicorn.mem_read(pointer, 1);
      character = new TextDecoder("utf-8").decode(character);
      path_name += character;
      pointer += 1;
    }

    this.unicorn.reg_write_i64(uc.X86_REG_RAX, -2);
    return;
  }

  openat(dfd, filename, flags, mode) {
    return this.open(filename, flags);
  }

  hook_system_call() {
    const rax = this.unicorn.reg_read_i64(uc.X86_REG_RAX);
    const rdi = this.unicorn.reg_read_i64(uc.X86_REG_RDI);
    const rsi = this.unicorn.reg_read_i64(uc.X86_REG_RSI);
    const rdx = this.unicorn.reg_read_i64(uc.X86_REG_RDX);
    const r10 = this.unicorn.reg_read_i64(uc.X86_REG_R10);
    const r8 = this.unicorn.reg_read_i64(uc.X86_REG_R8);
    const r9 = this.unicorn.reg_read_i64(uc.X86_REG_R9);

    const rip = this.unicorn.reg_read_i64(uc.X86_REG_RIP);

    if (!this.system_call_dictionary[rax.num()]) {
      this.logger.log_to_document(
        "ERROR: missing system call: " +
          system_call_table[rax.num()] +
          " (" +
          rax.num() +
          ")" +
          "." +
          rip.hex()
      );
    } else {
      this.logger.log_to_document(
        "INFO: system call handled: " +
          system_call_table[rax.num()] +
          " (" +
          rax.num() +
          ")" +
          "." +
          rip.hex()
      );

      const retval = this.system_call_dictionary[rax.num()](
        rdi,
        rsi,
        rdx,
        r10,
        r8,
        r9
      );
      if (retval !== undefined) {
        this.unicorn.reg_write_i64(uc.X86_REG_RAX, retval);
      }

      if (this.syscall_yield_flag == true) {
        this.syscall_yield_flag = false;
        this.unicorn.emu_stop();
      }
    }
  }
}
