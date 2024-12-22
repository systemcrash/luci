#!/bin/sh

print_help() {	
	echo "Execute as ./build/i18n-sync.sh [-b]" >&2
	echo "Or run as: ./build/i18n-sync.sh [-b] [--ln=<never|file|full>] [module folder e.g. applications/luci-app-example]" >&2
	echo "Options:"
	echo "	-b: Generate the base .pot file ( invokes ./build/mkbasepot.sh )"
}

[ -d ./build ] || {
	print_help
	exit 1
}

# If you need to set a new default for [--ln=<never|file|full>], set it here:
line_numbers="--ln=full"
# line_numbers="--ln=never"

for arg in "$@"; do
	case $arg in
		-h | --help )
			print_help
			exit 0
			;;
		--ln=* )
			line_numbers="$arg"
			shift
			;;
		--ln )
			print_help
			exit 0
			;;
		-b )
			makebase=true
			shift
			;;
	esac
done

[ -n "$1" ] && set -- "${1%/}"

# If we received no parameters, update base.pot (also)
[ -z "$1" ] && makebase=true

[ "$makebase" = true ] && {
	[ -n "$line_numbers" ] && ./build/mkbasepot.sh "$line_numbers"
	[ -z "$line_numbers" ] && ./build/mkbasepot.sh
}

# Absent a [folder] parameter, use the current path
find "${1:-.}" -name '*.pot' -and -not -name base.pot | sort | \
	xargs -P 10 -I{} sh -c '
		dir="${1%/po/templates/*}"
		echo "Updating ${1#./} ... ${2:+with: $2}"
		./build/i18n-scan.pl "$2" "$dir" > "$1"
		echo "done"
	' sh {} "${line_numbers}"

	# while read path; do
	# 	dir="${path%/po/templates/*}"
	# 	echo "Updating ${path#./} ... "
	# 	# Scan for strings in a directory and stash them in the .pot file:
	# 	./build/i18n-scan.pl "$dir" > "$path"
	# 	echo "done"
	# done


if [ -n "$1" ]; then
	if [ "$(uname)" = "Darwin" ] || [ "$(uname)" = "FreeBSD" ]; then
		# macOS-specific commands
		find "$1" -path '*/templates/*.pot' -print0 | xargs -0r stat -f '%N' | \
			xargs -r -n 1 dirname | \
			xargs -r -n 1 dirname | sort | \
			# Note: do not quote ${parameters}
			xargs -r -n 1 -P 40 ./build/i18n-update.pl ${line_numbers}
	elif [ "$(uname)" = "Linux" ]; then
		# Linux-specific commands
		find "$1" -path '*/templates/*.pot' -printf '%h ' | \
			xargs -r -n 1 dirname | \
			# Note: do not quote ${parameters}
			xargs -r -n 1 -P 40 ./build/i18n-update.pl ${line_numbers}
	# elif [ "$(uname)" = "SunOS" ]; then
	# 	# Solaris-specific commands
	else
		# GNU specific commands can go here:
		find "$1" -path '*/templates/*.pot' -printf '%h ' | \
			xargs -r -n 1 dirname | \
			# Note: do not quote ${parameters}
			xargs -r -n 1 -P 40 ./build/i18n-update.pl ${line_numbers}
	fi
else
	# this performs operations on all .po files
	./build/i18n-update.pl
fi
