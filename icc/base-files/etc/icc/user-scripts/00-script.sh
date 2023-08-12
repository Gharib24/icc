#!/bin/sh

[ "$LED" = "none" ] && {
	case $SERVICE_ACTION in
		start)
			:
		;;
		stop)
			:
			exit 0
		;;
		reload)
			:
		;;
		running)
			:
		;;
	esac
	
	case $STATUS in
		online)
			:
		;;
		offline)
			:
		;;
		unknown)
			:
		;;
		panic)
			:
		;;
	esac
}

case $STATUS in
	online)
		:
	;;
	offline)
	:
		:
	;;
	unknown)
		:
	;;
esac
