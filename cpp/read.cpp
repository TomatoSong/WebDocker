#include <unistd.h>

int
main()
{
    char string[1024];
	int count = 0;

	read(0, string, 1024);
	
	while (string[count] != '\0')
	{
		count ++;
	}

	write(1, string, count);

	return 0;
}
