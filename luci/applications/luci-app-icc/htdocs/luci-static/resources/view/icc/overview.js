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
//var panic_mode;
return view.extend({
	callInitAction: rpc.declare({
		object: 'luci.icc',
		method: 'set_init_action',
		params: ['name', 'action'],
		//expect: { 'result': false },
		}),
	callgetVersion: rpc.declare({
		object: 'luci.icc',
		method: 'get_icc_version',
		expect: {'': {}},}
		),
	callgetData: rpc.declare({
		object: 'luci.icc',
		method: 'get_data',
		expect: {'': {}},}
		),
	callgetLEDs: rpc.declare({
		object: 'luci.icc',
		method: 'get_leds',
		expect: {'': {}},}
		),
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
							} else {
								return this.callInitAction('icc', ev[2]);
							};
						},this))
							.then(L.bind(m.render, m));
				break;
			default:
				return L.bind(m.render, m);
			}
		},

	poll_status: function(map, data) {
		var icc_data = data[1].interface
		var timer = data[1].timer
		var panic_mode = data[2]
		
		var end = new Date(timer * 1000);
		var _second = 1000;
		var _minute = _second * 60;
		var _hour = _minute * 60;
		var _day = _hour * 24;
		
		var now = new Date();
		var distance = end - now;
		var days = Math.floor(distance / _day);
		var hours = Math.floor((distance % _day) / _hour);
		var minutes = Math.floor((distance % _hour) / _minute);
		var seconds = Math.floor((distance % _minute) / _second);

		var distance = end - now;
		if (distance > 0) {
			var timer = String(hours).padStart(2, '0') + ":" + String(minutes).padStart(2, '0') + ":" + String(seconds).padStart(2, '0');
		} else {
			var timer = '00:00:00';
		}
		document.getElementById('timer').innerHTML = timer
		
		for (const key in icc_data) {
			var color = icc_data[key]['status'] === 'online' ? "var(--success-color-medium)" : icc_data[key]['status'] === 'offline' ? "var(--error-color-medium)" : "";
			document.getElementById(key + '_status').style.color = color
			if (icc_data[key]['ping'] === 'true'){
				document.getElementById(key + "_interface").classList.add("spinning")
			} else {
				document.getElementById(key + "_interface").classList.remove("spinning")
			}
			document.getElementById(key + '_status').innerHTML = icc_data[key]['status'][0].toUpperCase()+icc_data[key]['status'].slice(1);
			document.getElementById(key + '_device').innerHTML = icc_data[key]['device'];
			document.getElementById(key + '_host').innerHTML = icc_data[key]['host'];
			
			if (icc_data[key]['panic'] !== 'none') {
				var d = new Date(icc_data[key]['panic'] * 1000);
				var panic = panic_mode.replace('_', ' ') + " at " + d.toLocaleTimeString('en-AU') + " on " + d.toLocaleDateString('en-AU');
			} else {
				var panic = null;
			};
			document.getElementById(key + '_panic').innerHTML = panic
		};
	},
	
	load: function() {
		return Promise.all([
			uci.load('icc'),
			this.callgetVersion(),
			this.callInitAction('icc', 'enabled'),
			this.callInitAction('icc', 'running'),
			this.callgetLEDs(),
		]);
	},
	render: function(result) {
		var m, s, o;
		//console.log(result)
		var icc_version = result[1].version;
		var leds = result[4].leds;
		
		m = new form.Map('icc', _("ICC"));
		m.title = _("ICC");
		var link = "<a href='%s'> ICC version: %s </a>".format('https://github.com/Gharib24/icc' ,icc_version)
		m.description = _("<b>I</b>nternet <b>C</b>onnection <b>C</b>hecker (<b>ICC</b>)<br>"+ link)

		var isEnabled = result[2].result;
		var isRunning = result[3].result;
		if (isEnabled){
			var enabled_color = 'var(--success-color-medium)'
			var enabled_innerHTML = _("ENABLED") 
		
		} else {
			var enabled_color = 'var(--error-color-medium)'
			var enabled_innerHTML = _("DISABLED") 
		}
		if (isRunning){
			var running_color = 'var(--success-color-medium)'
			var running_innerHTML = _("RUNNING") 
		
		} else {
			var running_color = 'var(--error-color-medium)'
			var running_innerHTML = _("NOT RUNNING") 
		}
		s = m.section(form.NamedSection, null);
		s.render = L.bind(function(view, section_id) {
			return E('div', {'class': ''}, [
					E('p', {'class': '', 'id': ''}, [
						E('span', {'class': '', 'id': ''}, _('icc service autostart -&nbsp;'), ),
						E('span', {'class': 'flash', 'id': '', 'style': 'font-weight:bold; color: ' + enabled_color }, enabled_innerHTML ),
						E('br',),
						E('span', {'class': '', 'id': ''}, _('icc service status -&nbsp'), ),
						E('span', {'class': 'flash', 'id': '','style': 'font-weight:bold; color: ' + running_color }, running_innerHTML ),
					]),
				])
		}, o, this);

		var panic_mode = uci.get('icc', '@icc[0]', 'mode');
		var listinterface = L.toArray(uci.get('icc', '@icc[0]', 'interface'))
		var liststatus = [];
		for (let i = 0; i < listinterface.length; i++) {
			var link = ("%s" + listinterface[i].toUpperCase() +"%s").format("<a href=\"" + L.url("admin", "network", "network") + "\">", "</a>")
			liststatus.push(E('tr', {'class': 'tr cbi-section-table-row'}, [
					E('td', {'class': 'td cbi-value-field', 'colspan': '1', 'id': listinterface[i] + "_interface" }, _(link)),
					E('td', {'class': 'td cbi-value-field', 'colspan': '1', 'id': listinterface[i] + "_device" }, _('lodding')),
					E('td', {'class': 'td cbi-value-field', 'colspan': '1', 'id': listinterface[i] + "_status" }, _('lodding')),
					E('td', {'class': 'td cbi-value-field', 'colspan': '1', 'id': listinterface[i] + "_host" }, _('lodding' )),
					E('td', {'class': 'td cbi-value-field', 'colspan': '1', 'id': listinterface[i] + "_panic" }, _('lodding')),
				], ))
		}
		s = m.section(form.NamedSection, null);
		s.render = L.bind(function(view, section_id) {
			var html =  E('div', { 'class': 'cbi-section' }, [
					E('h3', _('Status')), 
					E('table', { 'class': 'table cbi-section-table' }, [
						E('tr', { 'class': 'tr cbi-section-table-titles anonymous' }, [
							E('th', { 'class': 'th cbi-section-table-cell' }, _('Interface')),
							E('th', { 'class': 'th cbi-section-table-cell' }, _('Device')),
							E('th', { 'class': 'th cbi-section-table-cell' }, _('Connection status')),
							E('th', { 'class': 'th cbi-section-table-cell' }, _('Ping destination')),
							E('th', { 'class': 'th cbi-section-table-cell' }, _('Panic')),
						], ),
						E(liststatus),
						E('tr', { 'class': 'tr'}, [
							E('td', { 'class': 'th cbi-section-table-cell', 'colspan': '1', 'style': 'font-weight:bold', 'id': '' }, [ E('b', { 'id': '' }, _('Time to check:') )], ),
							E('td', { 'class': 'th cbi-section-table-cell', 'colspan': '1', 'style': 'font-weight:bold', 'id': 'timer' } ,_('00:00:00') ),
							E('td', { 'class': 'td cbi-section-table-cell', 'colspan': '3', 'style': '', 'id': '' },[
								E('button', {
									'class': 'btn cbi-button-action',
									'id': 'btn_restart',
									'click': ui.createHandlerFn(this, function () {
										return view.handleAction(m, ['restart',]);
									})
								}, [_('Check now')]),
							]),
						]),
						E('td', { 'class': 'td cbi-section-table-cell nowrap cbi-section-actions"', 'colspan': '5'}, ""),
					]),
					])
			return E(html)
		}, o, this);

		s = m.section(form.TypedSection, 'icc', _('Settings'), null);
		s.tab('tab_ping', _('Basic Configuration'));
		s.tab('tab_icc', _('Advanced Configuration'));
		s.tab('tab_led', _('LEDs Configuration'));
		s.anonymous = true;
		s.addremove = false;
		
//Basic Configuration
		o = s.taboption('tab_ping', widgets.NetworkSelect, 'interface', _('Network interface'))
		o.description = _('Network interface that need to be monitored.');
		o.default = 'wwan';
		o.multiple = true;
		o.noaliases = true;
		
		o = s.taboption('tab_ping', form.DynamicList, 'host', _('Host to Check'))
		o.description = _('IPv4 address or hostname to ping destination.');
		o.datatype = 'host';
		o.default = '8.8.8.8';
		o.multiple = true;
		o.rmempty = false;

		o = s.taboption('tab_ping', form.Value, 'timeout', _('Timeout'))
		o.description = _('Time to wait for response, Effective range 1-60, Unit in seconds.');
		o.default = '5';
		o.datatype = 'range(1,60)';
		o.rmempty = false;
		
//Advanced Configuration
		o = s.taboption('tab_icc', form.Value, 'interval', _('Check interval'))
		o.description = _('Probe interval, Effective range 1-86400, Unit in seconds.');
		o.default = '300';
		o.datatype = 'range(1,86400)';
		o.rmempty = false;
		
		o = s.taboption('tab_icc', form.ListValue, 'mode', _('Mode'))
		o.description = _('Reboot this device or Restart network or Restart interface after a specified panic time.');
		o.value("", _("Unspecified"));
		o.value("reboot_device", _("Reboot device"));
		o.value("restart_network", _("Restart network"));
		o.value("restart_interface", _("Restart interface"));
		o.value("restart_wifi", _("Restart WIFI"));
		o.rmempty = true;
		
		o = s.taboption('tab_icc', form.Value, 'panic', _('Panic'))
		o.description = _('If a ping to a specified host fails time to panic ,Effective range 5-1440, Unit in minutes.');
		o.depends({ mode: 'reboot_device' });
		o.depends({ mode: 'restart_network' });
		o.depends({ mode: 'restart_interface' });
		o.depends({ mode: 'restart_wifi' });
		o.default = '60';
		o.datatype = 'range(5,1440)';
		o.rmempty = false;

		o = s.taboption('tab_icc', form.ListValue, 'debug', _('Enable logread'))
		o.description = _("Enable %sdebug log%s , Monitoring command <b>logread -f -e icc.").format("<a href=\"" +
					L.url("admin", "services", "icc", "logread") + "\">", "</a>");
		o.value("1", _("Enable Debugging"));
		o.value("0", _("Disable Debugging"));
		o.rmempty = true;
		
//LEDs Configuration
		o = s.taboption('tab_led', form.SectionValue, 'status', form.GridSection, 'status', null, _("set LED to indicate interface status"));
		s = o.subsection;
		s.addremove = true;
		s.anonymous = true;
		s.sortable = true;
		s.nodescriptions= true;
		s.modaltitle = _('LEDs Configuration')

		o = s.option(form.ListValue, "interface", _("Interface"))
		o.description = _("when online or offline indicate interface status.");
		for (var i = 0; i < listinterface.length; i++) {
			o.value(listinterface[i], _(listinterface[i]));
		}
		
		o = s.option(form.ListValue, "led", _("LED Name"))
		o.description = _("Pick the LED not already used in %sSystem LED Configuration%s.").format("<a href=\"" + L.url("admin", "system", "leds") + "\">", "</a>");
		for (var i = 0; i < leds.length; i++) {
			o.value(leds[i], _(leds[i]));
		}

		o = s.option(form.ListValue, 'online', _('Online Status'))
		o.value('default-on', 'LED ON');
		o.value('none', 'LED OFF');
		o.value('timer', 'LED Flashing');

		o = s.option(form.ListValue, 'offline', _('Offline Status'))
		o.value('none', 'LED OFF');
		o.value('default-on', 'LED ON');
		o.value('timer', 'LED Flashing');


		return m.render().then(L.bind(function(m, nodes) {
			poll.add(L.bind(function() {
				return Promise.all([,
					this.callgetData(),panic_mode
				]).then(L.bind(this.poll_status, this, nodes));
			}, this), 1);
			return nodes;
		}, this, m));
	}
});
