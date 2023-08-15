#!/bin/sh

if [ "$debug" = "1"  ]; then
	logger -p debug -t "$LOGTAG" "$(env) $@"
fi
