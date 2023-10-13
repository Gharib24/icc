#!/bin/sh
. /lib/functions.sh
. /lib/functions/network.sh
. /usr/share/libubox/jshn.sh
#-------------------------------------------------------------------------------
ICC_STATE="/var/run/icc.state"

init_var() {
	config_get interface "$1" interface
	config_get timeout "$1" timeout "5"
	config_get host "$1" host "openwrt.org"
	config_get mode "$1" mode
	config_get panic "$1" panic
	config_get interval "$1" interval "1000"
	config_get debug "$1" debug "0"
	config_get led "$1" led 'none'
	config_get indicate "$1" indicate
	
}
time_to_ping=$((`date +%s` + 0))

config_load icc
config_foreach init_var icc

json_init
json_add_string "timer" "0" 
json_add_object "interface"
json_close_object
json_select interface

network_flush_cache
for i in $interface ;do
#	network_get_physdev device $i
	network_get_device device $i
	[ -z "$device" ] && device="Error Network device is not presen"
	json_add_object "$i"
	json_add_string "device" "$device"
	json_add_string "status" "unknown"
	json_add_string "panic" "none"
	json_add_string "host" ""
	json_add_string "ping" "false"
	json_close_object
done
unset __NETWORK_CACHE
json_dump >$ICC_STATE
#json_cleanup
[ ! -z "$mode" ] && {
	panic_time_minutes="$(($panic*60))"
	time_to_panic=$((`date +%s` + $panic_time_minutes))
}

get_val() {
	local interface
	config_get interface "$1" "interface"
	config_get sysfs "$1" "led"
	config_get trigger "$1" "$3"
	if [ "$2" = "$interface" ];then 
		break
	else
		unset sysfs trigger interface
	fi
}
set_LED_status() {
	config_foreach get_val status $1 $2
	[ ! -z "$sysfs" -a ! -z "$trigger" ] &&{
		logger -s -p info -t icc "$1 $2 set LED [ $sysfs $trigger] "
		[ -e "/sys/class/leds/${sysfs}" ] && {
			echo "$trigger" > /sys/class/leds/${sysfs}/trigger
		}
	}
}

for i in $interface ;do
	json_select $i
	set_LED_status $i 'offline'
	json_select ..
done

panic_mode() {
	logger -s -p warn -t icc "$(echo $mode|sed "s/_/ /g")  $@"
	case $mode in
		reboot_device)
			for f in /dev/pts/*; do echo -e "icc note [ System is going down in 1 minute ]" > $f; done
			sleep 60
			touch /etc/banner && reboot
		;;
		restart_network)
			/etc/init.d/network restart
		;;
		restart_interface)
			ip link set "$2" down
			ip link set "$2" up
		;;
		restart_wifi)
			/sbin/wifi down
			/sbin/wifi up
		;;
		*)
			:
	esac
}

export INTERFACE DEVICE STATUS;
while true; do
	[ `date +%s` -ge "$time_to_ping" ] && {
		for i in $interface ;do
			json_select $i
			json_get_var status status
			json_get_var device device
			json_get_var panic panic
			INTERFACE=$i 
			DEVICE=$device

			if [[ "$device" =~ "Error Network device is not presen" ]]; then
				json_add_string "host" "N/A"
			else
				json_add_string "ping" "true"
				for h in $host ;do
					json_add_string "host" "$h"
					json_dump >$ICC_STATE

					if /bin/ping -c 1 -W $timeout -I "$device" $h>/dev/null; then
						STATUS='online'
					else
						STATUS='offline'
					fi
					if [ "$STATUS" != "$status" ]; then
						json_add_string "status" "$STATUS"
						json_dump >$ICC_STATE
						hotplug-call icc $STATUS
						set_LED_status $i $STATUS
					fi
					logger -s -p info -t icc "$i [ Device: $device ] [ Host: $h ] [ status: $STATUS ]"
					[ "$STATUS" = "online" -o $STATUS = 'unknown' ] && break
				done
			fi
			sleep 1
			json_add_string "ping" "false"
			json_dump >$ICC_STATE
			json_select ..
		done
		
		time_to_ping=$((`date +%s` + $interval));
		json_select ..
		json_add_string "timer" "$time_to_ping"
		json_dump >$ICC_STATE
		json_select "interface"
		logger -s -p info -t icc "Next ping: $(date --date @$(($interval + `date +%s`)) +%H:%M:%S)"
	}
	[ ! -z "$mode" ] && {
		for i in $interface ;do
			json_select $i
			json_get_var status status
			json_get_var device device
			json_get_var panic panic
			if [ "$status" == "online" ]; then
				json_add_string "panic" "none"
				json_get_var panic panic
			else
				if [ "$panic" == "none" ]; then
					time_to_panic=$((`date +%s` + $panic_time_minutes));
					json_add_string "panic" "$time_to_panic"
					json_get_var panic panic
					logger -s -p info -t icc "$i Panic $mode: [ $(date --date @$(($panic)) +%H:%M:%S) ]"
				else
					if [ "$panic" -le `date +%s` ]; then
						panic_mode $i $device
						json_add_string "panic" "none"
						json_get_var panic panic
					fi
#					[ "$panic" != "none" ]&&{
#						logger -s -p debug -t icc "interface $i time to panic: $(date --date @$(($panic - `date +%s`)) +%H:%M:%S)"
#					}
				fi
			fi
			json_select ..
		done
		json_dump >$ICC_STATE
	}
	[ "$debug" = "1" ]&& logger -s -p debug -t icc "time to ping: [ $(date --date @$(($time_to_ping - `date +%s`)) +%H:%M:%S) ]"
	sleep 1
done
#-------------------------------------------------------------------------------


