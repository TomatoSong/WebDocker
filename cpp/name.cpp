#include <unistd.h>

int
main(int argc, char *argv[])
{
	int count = 0;

	while (argv[0][count] != '\0')
	{
		count ++;
	}

	write(1, argv[0], count);

	return 0;
}
