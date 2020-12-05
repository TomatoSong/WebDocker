#include <unistd.h>

int
main(int argc, char *argv[])
{
	const char* space = " ";
	const char* new_line = "\n";

	for (int i = 0; i < argc; i ++)
	{
		int count = 0;

		while (argv[i][count] != '\0')
		{
			count ++;
		}
		
		write(1, argv[i], count);

		if (i < argc - 1)
		{
			write(1, space, 1);
		}
	}

	write(1, new_line, 1);

	return 0;
}
