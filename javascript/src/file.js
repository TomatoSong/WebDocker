export default class File
{
	constructor(image)
	{
		this.image = image;
		this.file_name_command = "";
		this.file_name = "";
		this.buffer = [];
		this.seek = 0;
		this.file_found = true;
	}

	open(file_name)
	{
		this.file_name_command = file_name;
		this.file_name = "";

		let link_name = "";

		if(this.file_name_command[0] === "/")
		{
			this.file_name_command = this.file_name_command.slice(1);
		}
		else // Find in PATH variable
		{
			let path_array = this.image.path.split("=")[1].split(":");

			for (var i = 0; i < path_array.length; i ++)
			{
				var search_name = (path_array[i] + "/" + this.file_name_command).slice(1);
				
				if (this.image.files[search_name])
				{
					this.file_name_command = search_name;
					break;
				}
			}
		}

		if (this.file_name_command == "")
		{
			throw "[ERROR]: invalid file name.";
		}
		
		if(this.image.files[this.file_name_command] == undefined)
		{
		    this.file_found = false;
		    return
		}
		
 
		link_name = this.image.files[this.file_name_command].linkname;

		if (link_name != "")
		{
			while (link_name != "")
			{
			    if(link_name[0] == "/")
			    {
			        link_name = link_name.substr(1);
			    }
				this.file_name = this.image.files[link_name].name;
				link_name = this.image.files[link_name].linkname;
			}

			if (this.file_name == "")
			{
				throw "[ERROR]: invalid linked file name.";
			}
		}
		else
		{
			this.file_name = this.file_name_command;
		}

		this.buffer = this.image.files[this.file_name].buffer;
	}
}
