fetch("data/test").then(response => response.arrayBuffer()).then((buffer) => {
  // var buffer = new Uint8Array([0x7F, 0x45, 0x4C, 0x46, ...]);
  var elf = new Elf(buffer);
  if (elf.kind() != "elf") {
    throw "Not an ELF file";
  }

  var ehdr = elf.getehdr();
  document.getElementById("ehdr").innerHTML = JSON.stringify(ehdr);

  // Handle segments
  for (var i = 0; i < ehdr.phnum; i++) {
    var phdr = elf.getphdr(i);
  }
  // Handle sections
  for (var i = 0; i < ehdr.shnum; i++) {
    var scn = elf.getscn(i);
    var shdr = elf.getshdr(scn);
    var name = elf.strptr(ehdr.e_shstrndx.num(), shdr.sh_name.num());
  }
});
