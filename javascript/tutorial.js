var addr = 0x10000;
var code = [
  0x37, 0x00, 0xA0, 0xE3,  // mov r0, #0x37
  0x03, 0x10, 0x42, 0xE0,  // sub r1, r2, r3
];

// Initialize engine
var e = new uc.Unicorn(uc.ARCH_ARM, uc.MODE_ARM);

// Write registers and memory
e.reg_write_i32(uc.ARM_REG_R2, 0x456);
e.reg_write_i32(uc.ARM_REG_R3, 0x123);
e.mem_map(addr, 4*1024, uc.PROT_ALL);
e.mem_write(addr, code)

// Start emulator
var begin = addr;
var until = addr + code.length;
e.emu_start(begin, until, 0, 0);

// Read registers
var r0 = e.reg_read_i32(uc.ARM_REG_R0);  // 0x37
var r1 = e.reg_read_i32(uc.ARM_REG_R1);  // 0x333

// Write to document
document.getElementById("r0_value").innerHTML = "r0 = 0x" + r0.toString(16);
document.getElementById("r1_value").innerHTML = "r1 = 0x" + r1.toString(16);
