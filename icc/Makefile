#
# Copyright (c) 2016-2022 AG (ag@localhost.lan)
# This is free software, licensed under the GNU General Public License v3.
#

include $(TOPDIR)/rules.mk

PKG_NAME:=icc
PKG_VERSION:=23.02
PKG_RELEASE:=1
PKG_LICENSE:=GPL-3.0-or-later
PKG_MAINTAINER:=AG <ag@ag.org>

include $(INCLUDE_DIR)/package.mk

define Package/icc
	SECTION:=net
	CATEGORY:=Network
	TITLE:=Internet connection checker
	DEPENDS:=+jshn +jsonfilter
	PKGARCH:=all
endef

define Package/icc/description
 Internet connection checker.
 Please see https://github.com/Gharib24/icc/blob/master/README.md for further information.

endef

define Package/icc/conffiles
/etc/config/icc
endef

define Build/Prepare
endef

define Build/Configure
endef

define Build/Compile
endef

define Package/icc/install
	$(INSTALL_DIR) $(1)/usr/bin
	$(INSTALL_BIN) ./files/usr/bin/icc.sh $(1)/usr/bin

	$(INSTALL_DIR) $(1)/etc/init.d
	$(INSTALL_BIN) ./files/etc/init.d/icc $(1)/etc/init.d/icc

	$(INSTALL_DIR) $(1)/etc/uci-defaults
	$(INSTALL_BIN) ./files/etc/uci-defaults/95_icc $(1)/etc/uci-defaults/95_icc

	$(INSTALL_DIR) $(1)/etc/config
	$(INSTALL_CONF) ./files/etc/config/icc $(1)/etc/config/icc

	$(INSTALL_DIR) $(1)/etc/icc/user-scripts
	$(INSTALL_BIN) ./files/etc/icc/user-scripts/00-test.sh $(1)/etc/icc/user-scripts/00-test.sh
endef

$(eval $(call BuildPackage,icc))
