#!/bin/sh
echo $@
dest=/usr/local/bin/hlx

error_exit() {
	echo "$1" 1>&2
	exit 1
}

ask() {
    # https://djm.me/ask
    local prompt default reply

    while true; do

        if [ "${2:-}" = "Y" ]; then
            prompt="Y/n"
            default=Y
        elif [ "${2:-}" = "N" ]; then
            prompt="y/N"
            default=N
        else
            prompt="y/n"
            default=
        fi

        # Ask the question (not using "read -p" as it uses stderr not stdout)
        echo "$1 [$prompt] "

        # Read the answer (use /dev/tty in case stdin is redirected from somewhere else)
        read reply </dev/tty

        # Default?
        if [ -z "$reply" ]; then
            reply=$default
        fi

        # Check if the reply is valid
        case "$reply" in
            Y*|y*) return 0 ;;
            N*|n*) return 1 ;;
        esac

    done
}

if [ -L $dest -o -f $dest ]; then
    if [ -x $dest ]; then 
        old_version=$($dest --version)
        if [ x"$@" == x"--overwrite" ]; then
            rm $dest
        elif ! ask "hlx version $old_version ($dest) exists, overwrite?" Y; then
            exit 1
        fi
    else
        rm $dest
    fi
fi

if cp a.out $dest; then
  chmod 755 $dest   # TODO: respect umask
  version=$($dest --version)
  # hlx bash completion
  # remove traces of previous installations
  sed -i '' '/###-begin-hlx-completions-###/,/###-end-hlx-completions-###/d' ~/.bash_profile
  # remove trailing empty lines
  sed -i '' -e :a -e '/^\n*$/{$d;N;};/\n$/ba' ~/.bash_profile
  # append hlx bash completion
  printf '\n' >> ~/.bash_profile
  hlx completion >> ~/.bash_profile
  echo "hlx version $version successfully installed: $dest"
else
  error_exit "failed to install hlx, aborting"
fi
