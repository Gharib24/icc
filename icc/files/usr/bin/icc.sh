#!/bin/sh
. /lib/functions.sh
#-------------------------------------------------------------------------------

init_var() {
#	config_get interface "$1" interface "empty"
	config_get timeout "$1" timeout "5"
	config_get host "$1" host "openwrt.org"
	config_get mode "$1" mode
	config_get panic "$1" panic
	config_get interval "$1" interval "900"
	config_get debug "$1" debug "0"
	config_get led "$1" led 'none'
	config_get user_scripts_dir "$1" user_scripts_dir "/etc/icc/user-scripts"
}

config_load icc
config_foreach init_var icc

version="$(opkg list-installed |grep "^icc")"
status="unknown"
export DEBUG=$debug STATUS=$status LED=$led
time_to_ping=$((`date +%s` + $interval))

[ "$debug" = "1"  ] && {
	logger -p info -t "$LOGTAG" $(env)
}
[ ! -z "$mode" ] && {
	panic_time_minutes="$(($panic*60))"
	time_to_panic=$((`date +%s` + $panic_time_minutes))
}
#interval="$(awk -v min=30 -v max=$((60*3)) 'BEGIN{srand(); print int(min+rand()*(max-min+1))}')"

mkdir -p $user_scripts_dir; chmod -R +x $user_scripts_dir
echo "{ \"version\": \"$version\", \"status\": \"$status\" }" > /tmp/icc.json

callUserScripts() {
	STATUS=$status
	for script in $(ls $user_scripts_dir |grep '[0-9]'); do
		logger -p notice -t "$LOGTAG" "runing: $user_scripts_dir/$script $status"
		$user_scripts_dir/$script $status
		local exitcode=$?
		[ "$exitcode" != "0" ] && {
			logger -p err -t "$LOGTAG" "$user_scripts_dir/$script, exit code: [$exitcode]"
		}
	done
}

setLEDstatus() {
	[ "$led" != "none" ] &&{
		local sysfs=$led
		[ -e "/sys/class/leds/${sysfs}" ] && {
			case $status in
				online)
					echo "default-on" > /sys/class/leds/${sysfs}/trigger;;
				offline)
					echo "timer" > /sys/class/leds/${sysfs}/trigger;;
				*)
					echo "none" > /sys/class/leds/${sysfs}/trigger;;
			esac
		}
	}
}

panic_mode() {
	logger -p warn -t "$LOGTAG" "icc "$(echo $mode|sed "s/_/ /g")"."
	case $mode in
		reboot_device)
#			for f in /dev/pts/*; do echo -e "System is going down in 1 minute" > $f; done
			touch /etc/banner && reboot
		;;
		restart_network)
			/etc/init.d/network restart
		;;
		restart_interface)
			ip link set "$DEVICE" down
			ip link set "$DEVICE" up
		;;
		restart_wifi)
			/sbin/wifi down
			/sbin/wifi up
		;;
		*)
			:
	esac
}

setLEDstatus
callUserScripts
[ "$SERVICE_ACTION" = "stop" ]&& exit

while [ -z "$DEVICE" ]; do
	logger -p err -t "$LOGTAG" "network not yet up or interface does not exist will reload service when are up"
	sleep 5
done
#-------------------------------------------------------------------------------
while true; do
	[ `date +%s` -ge "$time_to_ping" -o "$status" = "unknown" ] && {
		LatestStatus=$status
		for i in 1 2 3; do
			[ "$i" != "1" -a "$LatestStatus" == "$status" ] && break
			if /bin/ping -c 1 -W $timeout -I "$DEVICE" $host>/dev/null; then
				[ "$status" != "online" ] && {
					sed "s/$status/online/" -i /tmp/icc.json
					status="online"
					setLEDstatus
					callUserScripts
				}
			else
				[ "$status" != "offline" ] && {
					sed "s/$status/offline/" -i /tmp/icc.json
					status="offline"
					setLEDstatus
				}
				callUserScripts
			fi
		done
		time_to_ping=$((`date +%s` + $interval));
		logger -p info -t "$LOGTAG" "status: $status, next check: $(date --date @$(($interval + `date +%s`)) +%H:%M:%S)"
	}

	[ ! -z "$mode" ] && {
		if [ "$status" == "online" ]; then
			time_to_panic=$((`date +%s` + $panic_time_minutes))
		elif [ "$time_to_panic" -le `date +%s` ]; then
			panic_mode
			time_to_panic=$((`date +%s` + $panic_time_minutes));
		fi
	}

	if [ "$debug" = "1"  ]; then
		msg1="interval countdown: $(date --date @$(($time_to_ping - `date +%s`)) +%H:%M:%S)"
		[ ! -z "$mode" ] && {
			msg2="panic countdown: $(date --date @$(($time_to_panic - `date +%s`)) +%H:%M:%S)"
		}
		logger -p debug -t "$LOGTAG" "$msg1 $msg2"
		sleep 1 
	else
		sleep $interval
	fi
done
#-------------------------------------------------------------------------------


