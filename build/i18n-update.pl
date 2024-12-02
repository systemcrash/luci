#!/usr/bin/perl

@ARGV <= 2 || die "Usage: $0 [<po directory>] [<file pattern>]\n";

my $source  = shift @ARGV;
my $pattern = shift @ARGV || '*.po';

sub read_header
{
	my $file = shift || return;
	local $/;

	open P, "< $file" || die "open(): $!";
	my $data = readline P;
	close P;

	$data =~ /
		^ (
		msgid \s "" \n
		msgstr \s "" \n
		(?: " [^\n]+ " \n )+
		\n )
	/mx;

	return $1;
}

sub write_header
{
	my $file = shift || return;
	my $head = shift || return;
	local $/;

	open P, "< $file" || die "open(): $!";
	my $data = readline P;
	close P;

	$data =~ s/
		^ (
		msgid \s "" \n
		msgstr \s "" \n
		(?: " [^\n]+ " \n )+
		\n )
	/$head/mx;

	open P, "> $file" || die "open(): $!";
	print P $data;
	close P;
}

my @dirs;

if( ! $source )
{
	@dirs = glob("./*/*/po");
}
else
{
    my $current_path = $source;
    my @po_dirs;

    $current_path =~ s{/$}{};

    while ($current_path) {
        my $glob_pattern = (-d "$current_path/po") 
            ? "$current_path/po*" 
            : "$current_path/*/po";

        @po_dirs = glob($glob_pattern); # Look for /po
        last if @po_dirs; # Stop if we find any /po

        # Step up one directory
        if ($current_path !~ m{/}) {
            # If no slashes, we've reached the top level
            $current_path = "";
        } else {
            # Remove the last directory component
            $current_path =~ s{/[^/]+$}{};
        }
    }

    die "Error: Could not find any 'po' directories starting from '$source'.\n" unless @po_dirs;

    # Set @dirs to the found /po directories
    @dirs = @po_dirs;
}

foreach my $dir (@dirs)
{
	if( open F, "find $dir -type f -name '$pattern' |" )
	{
		while( chomp( my $file = readline F ) )
		{
			my ( $basename ) = $file =~ m{.+/([^/]+)\.po$};
		
			if( -f "$dir/templates/$basename.pot" )
			{
				my $head = read_header($file);

				printf "Updating %-40s", $file;
				system("msgmerge", "-U", "-N", $file, "$dir/templates/$basename.pot");

				write_header($file, $head);
			}
		}

		close F;
	}
}
