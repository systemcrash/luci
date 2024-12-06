#!/bin/bash

# Define valid file extensions or patterns
VALID_PATTERNS="*.pot *.po *.js menu.d/*.json acl.d/*.json *.ut *.uc *.lua *.html"
BASE_MODULE_FOLDERS="modules/luci-base modules/luci-compat modules/luci-lua-runtime modules/luci-mod-network modules/luci-mod-status modules/luci-mod-system protocols themes"

# we set $1 and $2 for use in the github worker. 
# Otherwise run this script with no parameters locally and it should work.
# Figure out what branch we are on
[ -z "$1" ] && branch_name_or_sha="$(git rev-parse --abbrev-ref HEAD)" || branch_name_or_sha="$1"
echo "branch (or its SHA): $branch_name_or_sha"

[ -z "$2" ] && base_ref="master" || base_ref="$2"
echo base_ref:"$base_ref"


# Fetch the list of changed files
# changed_files=$(git diff --merge-base "$branch_name_or_sha" --name-only master)
echo running "git diff --name-only $branch_name_or_sha..$base_ref"
changed_files="$(git diff --name-only "$branch_name_or_sha".."$base_ref")"

# Initialize an empty variable to hold unique folders
unique_folders=""

# [ -z "$changed_files" ] && exit 0

# Process each changed file
while IFS= read -r file; do
	# Check if the file matches any valid pattern
	for pattern in $VALID_PATTERNS; do
		case "$file" in
			$pattern|*/$pattern)
				# Extract the two-level parent folder
				parent_folder=$(echo "$file" | awk -F'/' '{print $1"/"$2}')

				# Add to the unique folders list if not already present
				echo "$unique_folders" | grep -qx "$parent_folder" || unique_folders="$unique_folders
$parent_folder"

				break
				;;
		esac
	done
done <<< "$changed_files"

base_pot=""

# Deduplicate and print unique folders
echo -n "Unique folders:"
while IFS= read -r folder; do
	[ -n "$folder" ] && echo "$folder"
	for pattern in $BASE_MODULE_FOLDERS; do
		# If commit touched a folder whose i18n belong to the base.pot, set the
		# "-b" flag for i18n-sync.sh
		[ "$pattern" = "$folder" ] && base_pot="-b" && echo base_pot affected
		[ -n "$folder" ] && echo "Running build/i18n-sync.sh ${base_pot} $folder" && build/i18n-sync.sh ${base_pot} "$folder"
	done
done <<< "$unique_folders"| sort -u
