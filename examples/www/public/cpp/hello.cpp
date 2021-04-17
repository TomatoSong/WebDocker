#include <unistd.h>

int
main()
{
	const char* string = "Hello World!\n";
	int count = 0;
	
	while (string[count] != '\0')
	{
		count ++;
	}

	write(1, string, count);

	return 0;
}
