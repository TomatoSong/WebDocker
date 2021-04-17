#include <unistd.h>

#define SIZE 1024

int
main(int argc, char *argv[])
{
	const char* space = " ";
	const char* new_line = "\n";

	char name[SIZE];
	int count_total = 0;

	for (int i = 0; i < argc; i ++)
	{
		int count = 0;

		while (argv[i][count] != '\0')
		{
			name[count_total] = argv[i][count];
			count_total ++;
			count ++;
		}

		if (i < argc - 1)
		{
			name[count_total] = ' ';
			count_total ++;
		}
	}

	name[count_total] = '\n';
	count_total ++;

	write(1, name, count_total);

	return 0;
}
