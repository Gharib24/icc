'use strict';
'require ui';
'require view';
'require dom';
'require poll';
'require uci';
'require rpc';
//'require fs';
'require form';
'require tools.widgets as widgets';
//TODO
//http://openwrt.github.io/luci/jsapi/fs.js.html
//https://openwrt.github.io/luci/jsapi/LuCI.rpc.html
//TODO
//------------------------------------------------------------------------------
return view.extend({
	icc_data : {
		version : 22.05,
	},
	
	callInitAction: rpc.declare({
		object: 'luci',
		method: 'setInitAction',
		params: [ 'name', 'action' ],
		expect: { result: true },
	}),

	callFileList : rpc.declare({
		object: 'file',
		method: 'list',
		params: [ 'path' ],
	}),
	
	handleRestart: function(m, ev) {
		return this.callInitAction('icc', 'restart')
			.then(L.bind(m.render, m));
	},
	
	handleToggleEnableDisable: function(m, ev) {
		return Promise.all([
			this.callInitAction('icc', 'enabled'),
				]).then(L.bind(function (data) {
					if (data[0]){
						return this.callInitAction('icc', 'disable');
					}else{
						return this.callInitAction('icc', 'enable');
					};
				},this))
			.then(L.bind(m.render, m))
	},
	
	handleToggleStartStop: function(m, ev) {
		return Promise.all([
			this.callFileList('/var/run/icc.pid'),
				]).then(L.bind(function (data) {
					if (data[0] == 2){
						return this.callInitAction('icc', 'stop');

					}else{
						return this.callInitAction('icc', 'start');
					};
				},this))
			.then(L.bind(m.render, m))
	},

	poll_status: function(map, data) {
//		console.log(data[0], data[1])
		var enabled = data[0], active = data[1];
		var status = map.querySelector('[data-name="_service_status"]').querySelector('.cbi-value-field');
		var toggle_enable_disable = map.querySelector('[data-name="_toggle_enable_disable"]').querySelector('button');
		var toggle_start_stop = map.querySelector('[data-name="_toggle_start_stop"]').querySelector('button');

		if (enabled){
			toggle_enable_disable.innerHTML = _('Disable');
			toggle_enable_disable.className =  "btn cbi-button-negative";
			status.textContent =           _('Enabled');
		} else {
			toggle_enable_disable.innerHTML = _('Enable');
			toggle_enable_disable.className = "btn cbi-button-positive";
			status.textContent =           _('Disabled');
		};
		
		if (active == 2){
			toggle_start_stop.innerHTML =  _('Stop');
			toggle_start_stop.className = "btn cbi-button-negative";
			status.textContent +=          " - "+_('Running');
			status.classList.remove("spinning")
		} else  {
			toggle_start_stop.innerHTML = _('Start');
			toggle_start_stop.className =  "btn cbi-button-positive";
			status.textContent +=          " - "+_('Stopped');
			status.classList.remove("spinning")
		};
	},

	load: function() {
		return Promise.all([
			uci.load('icc'),
//			this.callInitAction('icc', 'enabled'),
//			this.callFileList('/var/run/icc.pid'),
		]);
	},

//----------------------------------------------------------------------------//

	render: function (result) {
		var m, s, o;
		var status = result[1], active = result[2];
		var btn1_style, btn1_title, btn2_style, btn2_title;
//		console.log(status, active)
//		if (status){
//			btn1_title = _('Disable');
//		} else {
//			btn1_title = _('Enable');
//		};
//		if (active == 2){
//			btn2_title = _('Stop');
//		} else  {
//			btn2_title = _('Start');
//		};

		m = new form.Map('icc', _('ICC'));
		m.description = _('ICC is <b>I</b>nternet <b>C</b>onnection <b>C</b>hecker via Ping.');
		
		s = m.section(form.TypedSection);
		s.description = _("ICC Version") + " " + this.icc_data['version'];
		s.anonymous = true;
	
		s = m.section(form.TypedSection, _(""), _("Service Control"));
		s.anonymous = true;

		o = s.option(form.DummyValue, "_service_status", _("Service status"));
//		o.default     = _('Loading...');
		o.rawhtml = true;
		o.default = '<p class="cbi-value-field spinning"> Loading...</p>';
		o.description = _('');

		o = s.option(form.Button, '_toggle_start_stop');
		o.title      =  _('Start / Stop Service');
		o.description = _('');
		o.inputtitle =  _('Loading');
		o.inputstyle = 'btn cbi-button-action';
		o.onclick = L.bind(this.handleToggleStartStop, this, m);

		o = s.option(form.Button, 'restart');
		o.title      = _('Restart Service');
		o.inputtitle = _('Restart');
		o.inputstyle = 'btn cbi-button-action';
		o.onclick = L.bind(this.handleRestart, this, m);
		
		o = s.option(form.Button, '_toggle_enable_disable');
		o.title      = _('Enable / Disable Service');
		o.description = _('');
		o.inputtitle =  _('Loading');
		o.inputstyle = 'btn cbi-button-action';
		o.onclick = L.bind(this.handleToggleEnableDisable, this, m);

		/*
			tabbed config section
		*/
		s = m.section(form.TypedSection, "icc", _('Settings'), _(''));
		s.anonymous=true;
		s.addremove=false
		s.tab('general', _('General Settings'), _(''));
		s.tab('ping', _('Ping Settings'), _(''));
		s.tab('hook', _('Hook Settings'), _('Must all scripts serially named in inside of all directories, example <b> 00-script.sh 01-script.sh</b>'));
		
		/*
			general settings tab
		*/
		o=s.taboption('general', form.Value, 'interval', _('Interval'), _('Probe interval, Effective range 0-86400, Unit in seconds.'));
		o.default='60';
		o.datatype = 'range(0,86400)';

		o=s.taboption('general', form.Value, 'panic', _('Panic'), _('Time before call the panic scripts, Effective range 3-1440, Unit in minutes.'));
		o.default='60';
		o.datatype = 'range(3,1440)';
		
		o=s.taboption('general', form.Flag, 'hotplug', _('Auto set interface'), _('Automatically set interface when <b>WWAN</b>  source change.'));
		
		o=s.taboption('general', form.Flag, 'debug', _('Debug'), _('Enable debug log, Monitoring command \'logread -f -e icc\'.'));
		
		/*
			ping settings tab
		*/
		o=s.taboption('ping', widgets.DeviceSelect, 'ifname', _('Device'), _('Device that need to be monitored.'));
		o.default='wlan0';
		o.multiple=false;
		o.noaliases=true;

		o=s.taboption('ping', form.Value, 'host', _('Host To Check'), _('IPv4 address or hostname to ping destination.'));
		o.default = '8.8.8.8';

		o=s.taboption('ping', form.Value, 'timeout', _('Timeout'), _('Probe timeout, Effective range 1-60, Unit in seconds.'));
		o.default='15';
		o.datatype = 'range(1,60)';
		
		/*
			hook settings tab
		*/
		o=s.taboption('hook', form.Value, 'if_startup_d', _('Startup'), _('When a startup ICC, scripts in this directory are called.'));
		o.default = '/etc/icc/startup.d';
		o.rmempty = false;
		
		o=s.taboption('hook', form.Value, 'if_online_d', _('Online'), _('When a interface status changes to online, scripts in this directory are called.'));
		o.default = '/etc/icc/online.d';
		o.rmempty = false;
		
		o=s.taboption('hook', form.Value, 'if_offline_d', _('Offline'), _('When a interface status changes to offline, scripts in this directory are called.'));
		o.default = '/etc/icc/offline.d';
		o.rmempty = false;
		
		o=s.taboption('hook', form.Value, 'if_panic_d', _('Panic'), _('Scripts in this directory called after the interface has been offline.'));
		o.default = '/etc/icc/panic.d';
		o.rmempty  = false;

		return m.render().then(L.bind(function(m, nodes) {
			poll.add(L.bind(function() {
				return Promise.all([
					this.callInitAction('icc', 'enabled'),
					this.callFileList('/var/run/icc.pid'),
				]).then(L.bind(this.poll_status, this, nodes));
			}, this), 1);
			return nodes;
		}, this, m));
	}
});








