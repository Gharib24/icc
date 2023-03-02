![screenshot](screenshot/screenshot1.png)




scp to router

host=openwrt.lan

user=root

router=$user@$host:/


src=$(dirname $0)/ICC/luci-app-icc/htdocs/

scp -O -r $src/* $router/www

src=$(dirname $0)/ICC/luci-app-icc/root/

scp -O -r $src/* $router/

src=$(dirname $0)/ICC/icc/root/

scp -O -r $src/* $router/

