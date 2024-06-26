# luci-app-icc & icc
        

### Description
Internet Connection Checker for OpenWrt

### Build From Source

$\color{red}{\textsf{1.}}$ Download Openwrt Source Code to build the package.

```shell

git clone https://github.com/openwrt/openwrt
cd openwrt

```

$\color{red}{\textsf{2.}}$ Feed Configuration

```shell

echo "src-git icc_package https://github.com/Gharib24/icc" >> feeds.conf.default

./scripts/feeds update -a
./scripts/feeds install -a
```
$\color{red}{\textsf{3.}}$ Choose to build **luci-app-icc** as a module or built-in module

```shell
make menuconfig

...

LuCI  --->
    Applications  --->
        <M> luci-app-icc

...

```

$\color{red}{\textsf{4.}}$ Build packages

```shell
make package/feeds/icc_package/luci-app-icc/compile V=s
```

## Screenshot 

### View: Services/icc
![screenshot](.documents/1.png)


![screenshot](.documents/2.png)


