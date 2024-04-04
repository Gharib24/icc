# luci-app-icc & icc
        

### Description
Internet Connection Checker for OpenWrt

### Build From Source

1. Download Openwrt Source Code to build the package.

```bash

git clone https://github.com/openwrt/openwrt
cd openwrt

```

2. Feed Configuration

```bash

echo "src-git icc_package https://github.com/Gharib24/icc" >> feeds.conf.default

./scripts/feeds update -a
./scripts/feeds install -a
```

3. Choose to build **luci-app-icc** as a module or built-in module

```bash
make menuconfig

...

LuCI  --->
    Applications  --->
        <M> luci-app-icc

...

```

4. Build packages

```bash
make package/feeds/icc_package/luci-app-icc/compile V=s
```

## Screenshot 

### View: Services/icc
![screenshot](.documents/1.png)


![screenshot](.documents/2.png)


