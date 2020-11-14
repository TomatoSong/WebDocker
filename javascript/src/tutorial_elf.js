function tutorial_elf_worker(file)
{
	// Create ELF file object
	var elf = new Elf(file);

	// Check if file is ELF
	if (elf.kind() != "elf")
	{
		throw "[ERROR]: not an ELF file.";
	}

	// Obtain ELF header
	var ehdr = elf.getehdr();

	// Write to document
	document.getElementById("elf_loader").innerHTML = JSON.stringify(ehdr);
}

function tutorial_elf()
{
	const file_name = "data/hello";

    fetch(file_name)
        .then(response => response.arrayBuffer())
        .then(file => tutorial_elf_worker(file));
}
