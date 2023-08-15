'use strict';
'require ui';
'require view';
'require poll';
'require uci';
'require rpc';
'require form';
'require tools.widgets as widgets';
//TODO
//http://openwrt.github.io/luci/jsapi/fs.js.html
//https://openwrt.github.io/luci/jsapi/LuCI.rpc.html
//TODO
//------------------------------------------------------------------------------
var btn_enable_disable_class, btn_enable_disable_label;
var btn_start_stop_class, btn_start_stop_label;
var icc_version, icc_status, service_status;

return view.extend({
	callInitAction: rpc.declare({
		object: 'luci.icc',
		method: 'setInitAction',
		params: [ 'name', 'action' ],
//		expect: { 'result': false },
	}),
	callgetData: rpc.declare({
		object: 'luci.icc',
		method: 'getData',
		params: [ 'name' ],
		expect:{'':{}},
	}),
	callgetLEDs: rpc.declare({
		object: 'luci.icc',
		method: 'getLEDs',
		expect:{'':{}},
	}),
	handleAction: function(m, ev){
		switch(ev[0]) {
			case 'restart':
				return this.callInitAction('icc', ev[0]).then(L.bind(m.render, m));
				break;
			case 'status':
			case 'enabled':
				return Promise.all([
					this.callInitAction('icc', ev[0]),
						]).then(L.bind(function (data) {
							if (data[0].result){
								return this.callInitAction('icc', ev[1]);
							}else{
								return this.callInitAction('icc', ev[2]);
							};
						},this))
					.then(L.bind(m.render, m));
				break;
			default:
				return L.bind(m.render, m);
		}
	},
	StyleLabel: function(result) {
		var service_active = result[2].result
		var service_enabled = result[3].result
		icc_version = typeof result[0].version !== 'undefined' ? result[0].version : '-';
		icc_status = typeof result[1].status !== 'undefined' ? result[1].status : '-';

		if (service_active){
			btn_start_stop_label = _('Stop');
			btn_start_stop_class = 'btn cbi-button-negative';
			var active_status = _('Running');
		} else{
			btn_start_stop_label = _('Start');
			btn_start_stop_class = 'btn cbi-button-positive';
			var active_status = _('Stopped')
		}
		if (service_enabled){
			btn_enable_disable_label = _('Disable');
			btn_enable_disable_class  = 'btn cbi-button-negative';
			var enabled_status = _('Enabled');
		} else{
			btn_enable_disable_label = _('Enable');;
			btn_enable_disable_class  =   'btn cbi-button-positive';
			var enabled_status = _('Disabled');
		}
		service_status = enabled_status +" / "+ active_status;
		return
},
	poll_status: function(map, data) {
//		console.log(map);
//		console.log(data)
		var data = this.StyleLabel(data);
		var text_icc_version = document.getElementById('text_icc_version');
		var text_icc_status = document.getElementById('text_icc_status');
		var text_service_status = document.getElementById('text_service_status');
		var btn_start_stop = document.getElementById('btn_start_stop');
		var btn_enable_disable = document.getElementById('btn_enable_disable');
//		var toggle_enable_disable = map.querySelector('[data-name="_toggle_enable_disable"]').querySelector('button');
//		var toggle_start_stop = map.querySelector('[data-name="_toggle_start_stop"]').querySelector('button');
		btn_start_stop.innerHTML = btn_start_stop_label;
		btn_start_stop.className = btn_start_stop_class;
		btn_enable_disable.innerHTML = btn_enable_disable_label;
		btn_enable_disable.className = btn_enable_disable_class;
		text_icc_version.textContent = icc_version;
		text_icc_status.textContent = icc_status;
		text_service_status.textContent = service_status;
		
		text_icc_version.classList.remove("spinning")
		text_icc_status.classList.remove("spinning")
		text_service_status.classList.remove("spinning")
	},
	load: function() {
		return Promise.all([
			uci.load('icc'),
			this.callgetData('version'),
			this.callgetData('status'),
			this.callInitAction('icc', 'status'),
			this.callInitAction('icc', 'enabled'),
			this.callgetLEDs(),
		]);
	},
	render: function (result) {
		var m, s, o;
		var oldresult = result.shift();
		var data = this.StyleLabel(result);
		var leds = result[4].leds;

		m = new form.Map('icc', _("ICC"), _("<b>I</b>nternet <b>C</b>onnection <b>C</b>hecker (<b>ICC</b>)"));
		
		s = m.section(form.NamedSection, 'icc', '');
		s.render = L.bind(function(view, section_id) {
			return E('div', { 'class': 'cbi-section' }, [
				E('h3', _('Information')), 
				E('div', { 'class': 'cbi-value' }, [
					E('label', { 'class': 'cbi-value-title', 'style': 'padding-top:0rem' }, _('Version')),
					E('div', { 'class': 'cbi-value-field spinning', 'id': 'text_icc_version', 'style': 'color:#37c' }, icc_version),
				'\xa0',
				]),
				E('div', { 'class': 'cbi-value' }, [
					E('label', { 'class': 'cbi-value-title', 'style': 'padding-top:0rem' }, _('Status')),
					E('div', { 'class': 'cbi-value-field spinning', 'id': 'text_icc_status', 'style': 'color:#37c' },icc_status )
				]),
				'\xa0',
				E('div', { 'class': 'cbi-value' }, [
					E('label', { 'class': 'cbi-value-title', 'style': 'padding-top:0rem' }, _('Service Status')),
					E('div', { 'class': 'cbi-value-field spinning', 'id': 'text_service_status', 'style': 'color:#37c' }, service_status)
				]),
				'\xa0',
//				E('h3', _('Service Control')),
				E('div', { 'class': 'cbi-value' }, [
					E('label', { 'class': 'cbi-value-title', 'style': 'padding-top:0rem' }, _('Service Control')),
					E('div', { 'class': 'cbi-value-field', 'id': '', 'style': '' },
						E('div', { 'class': 'left' }, [
							'\xa0',
							E('button', {
								'class': btn_enable_disable_class,
								'id': 'btn_enable_disable',
								'click': ui.createHandlerFn(this, function () {
									return view.handleAction(m, ['enabled', 'disable', 'enable']);
								})
							}, btn_enable_disable_label),
							'\xa0',
							E('button', {
								'class': btn_start_stop_class,
								'id': 'btn_start_stop',
								'click': ui.createHandlerFn(this, function () {
									return view.handleAction(m, ['status', 'stop', 'start']);
									})
							}, btn_start_stop_label),
							'\xa0',
							E('button', {
								'class': 'btn cbi-button-action',
								'id': 'btn_restart',
								'click': ui.createHandlerFn(this, function () {
									return view.handleAction(m, ['restart',]);
								})
							}, [_('Restart')]),
//							'\xa0',
					]),
				)]),
//				'\xa0',
			]);
		}, o, this);
	
		s = m.section(form.TypedSection, 'icc', _('Settings'));
		s.anonymous=true;
		s.addremove=false
		s.tab('tab_ping', _('Basic Configuration'));
		s.tab('tab_general', _('Advanced Configuration'));
//		s.tab('tab_user', _('User space'), _('Must all scripts serially named, example <b> 00-script.sh 01-script.sh</b>'));
		
		o=s.taboption('tab_ping', widgets.NetworkSelect, 'interface', _('Network interface'), _('Network interface that need to be monitored.'));
		o.default='wwan';
		o.multiple=false;
		o.noaliases=true;

		o=s.taboption('tab_ping', form.Value, 'host', _('Host to Check'), _('IPv4 address or hostname to ping destination.'));
		o.default = '8.8.8.8';
		o.datatype = 'host';
		o.rmempty = false;
		
		o=s.taboption('tab_ping', form.Value, 'interval', _('Check interval'), _('Probe interval, Effective range 1-86400, Unit in seconds.'));
		o.default='60';
		o.datatype = 'range(1,86400)';
		o.rmempty = false;
		
		o=s.taboption('tab_ping', form.Value, 'timeout', _('Timeout'), _('Time to wait for response, Effective range 1-60, Unit in seconds.'));
		o.default='15';
		o.datatype = 'range(1,60)';
		o.rmempty = false;

		o = s.taboption('tab_general', form.ListValue, 'mode', _('Mode'), _('Reboot this device or Restart network or Restart interface after a specified panic time.'));
		o.value("", _("Unspecified"));
		o.value("reboot_device", _("Reboot device"));
		o.value("restart_network", _("Restart network"));
		o.value("restart_interface", _("Restart interface"));
		o.value("restart_wifi", _("Restart WIFI"));
		o.rmempty = true;
		
		o = s.taboption('tab_general', form.Value, 'panic', _('Panic'), _('If a ping to a specified host fails time to panic ,Effective range 1-1440, Unit in minutes.'));
		o.depends({ mode: 'reboot_device' });
		o.depends({ mode: 'restart_network' });
		o.depends({ mode: 'restart_interface' });
		o.depends({ mode: 'restart_wifi' });
		o.default='60';
		o.datatype = 'range(1,1440)';
		o.rmempty = false;

		o = s.taboption("tab_general", form.ListValue, "led", _("LED to indicate status"),
					_("Pick the LED not already used in %sSystem LED Configuration%s.").format("<a href=\"" +
						L.url("admin", "system", "leds") + "\">", "</a>"));
				o.value("", _("none"));
				for (var i = 0; i < leds.length; i++) {
					o.value(leds[i], _(leds[i]));
				}

		o=s.taboption('tab_general', form.Value, 'user_scripts_dir', _('User scripts directory'), _('When certain events happen will be executed all scripts located in directory.'));
		o.default = '/etc/icc/user-scripts';
		o.datatype = "directory";
		o.rmempty = false;
		o.readonly = true;

		o = s.taboption('tab_general', form.ListValue, 'debug', _('Enable Debugging'),
									_("Enable %sdebug log%s , Monitoring command <b>logread -f -e icc.").format("<a href=\"" +
										L.url("admin", "services", "icc", "logread") + "\">", "</a>"));
		o.value("1", _("Enable Debugging"));
		o.value("0", _("Disable Debugging"));
		o.rmempty = true;

//		o=s.taboption('tab_general', form.Flag, 'debug', _('Debug Log'),
//							_("Enable %sdebug log%s , Monitoring command <b>logread -f -e icc.").format("<a href=\"" +
//						L.url("admin", "services", "icc", "logread") + "\">", "</a>"));
		return m.render().then(L.bind(function(m, nodes) {
			poll.add(L.bind(function() {
				return Promise.all([
					this.callgetData('version'),
					this.callgetData('status'),
					this.callInitAction('icc', 'status'),
					this.callInitAction('icc', 'enabled'),
				]).then(L.bind(this.poll_status, this, nodes));
			}, this), 1);
			return nodes;
		}, this, m));
	}
});







