#!/bin/sh

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

if [ -f $dest ]; then
    old_version=$($dest --version)
    if ! ask "hlx version $old_version ($dest) exists, overwrite?" Y; then
      exit 1
    fi
fi

if cp a.out $dest; then
  version=$($dest --version)
  echo "hlx version $version successfully installed: $dest"
else
  error_exit "failed to install hlx, aborting"
fi

