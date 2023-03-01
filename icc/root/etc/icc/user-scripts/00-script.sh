#!/bin/sh

if [ "$LED" = "none" ]; then
	case $SERVICE_ACTION in
		start)
			/usr/bin/mt1300_led off
			/usr/bin/mt1300_led blue_breath daemon
		;;
		stop)
			/etc/init.d/led start
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
			/usr/bin/mt1300_led white daemon
		;;
		offline)
			/usr/bin/mt1300_led white_breath daemon
		;;
		unknown)
			:
		;;
		panic)
			:
		;;
	esac
fi

case $STATUS in
	online)
		:
	;;
	offline)
	:
		/usr/bin/btwifi.login
	;;
	unknown)
		:
	;;
esac
