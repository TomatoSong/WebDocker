for src in $(ls); do
	if [[ "$src" == *".c"* ]] || [[ "$src" == *".cpp"* ]]; then
		bin=${src%".c"}
		bin=${bin%".cpp"}
		musl-gcc -static $src -o ../bin/$bin
	fi
done
