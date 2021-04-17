#include <unistd.h>

#define SIZE 1024

int
main()
{
    char string[SIZE];
	int count = 0;

	read(0, string, SIZE);
	
	while (string[count] != '\0')
	{
		count ++;
	}

	write(1, string, count);

	return 0;
}
