#!/bin/sh

if [ ! -f /tmp/led-stoppd ];then
	/etc/init.d/led stop
	echo 0 > /sys/class/leds/white\:system/brightness
	echo 0 > /sys/class/leds/blue\:run/brightness
	touch /tmp/led-stoppd
	mt1300_led off
fi

if [ "$STATUS" = "offline" ];then
	mt1300_led white_flash
	btwifi.login
elif [ "$STATUS" = "online" ];then
	mt1300_led white domain
fi
