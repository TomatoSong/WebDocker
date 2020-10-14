.section .text
.globl main

main:
	movl $0, %eax
	movl $1, %ebx
	inc %eax
	dec %ebx
	call exit
