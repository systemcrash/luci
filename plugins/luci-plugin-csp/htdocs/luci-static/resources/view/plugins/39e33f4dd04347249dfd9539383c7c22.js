'use strict';
'require baseclass';
'require form';
'require uci';

/*
class, type, name and id are used to build a reference for the uci config. E.g.

config http_headers '39e33f4dd04347249dfd9539383c7c22'
	option name 'Content-Security-Policy'
	...

*/

return baseclass.extend({
	// Plugin classification
	class: 'http',
	class_i18n: _('HTTP'),

	type: 'headers',
	type_i18n: _('Headers'),

	// Plugin identity
	name: 'Content-Security-Policy',
	id: '39e33f4dd04347249dfd9539383c7c22',
	title: _('Content-Security-Policy'),
	description: _('Configures the content of the Content-Security-Policy header.') + '<br />' +
		_('See %s for more information').format('<a href="https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP">CSP</a>'),

	// Add configuration form options
	addFormOptions(s) {
		let o;

		o = s.option(form.Flag, 'enabled', _('Enabled'));
		o.default = o.disabled;
		o.rmempty = false;

		o = s.option(form.ListValue, 'preset', _('Preset'));
		o.default = 'permissive';
		o.depends('enabled', '1');
		o.value('strict');
		o.value('permissive');
		o.value('custom');

		function write_custom_profile(sid, value) {
			let result = '';
			for (let child of this.section.children) {
				if (['enabled', 'preset', 'custom_profile'].includes(child.option))
					continue;
				let value = child.formvalue(sid);
				
				if (value && value !== '0') {
					if (child.option === 'upgrade_insecure_requests') {
						result += `${child.option.replaceAll('_', '-')}; `;
					}
					else {
						result += `${child.option.replaceAll('_', '-')} ${value}; `;
					}
				}
			}
			uci.set('luci_plugins', sid, this.option, value);
			uci.set('luci_plugins', sid, 'custom_profile', result);
		};

		o = s.option(form.Value, 'base_uri', _('Base URI'),
			_('Restricts the URLs which can be used in a document\'s base element.'));
		o.placeholder = "'self' *.example.org";
		o.default = "'self'";
		o.datatype = 'string';
		o.depends({'enabled': '1', 'preset': 'custom'});
		o.write = write_custom_profile;

		o = s.option(form.Value, 'default_src', _('Default source'),
			_('Fallback for all other fetch directives.'));
		o.placeholder = "'self' *.example.org";
		o.default = "'self'";
		o.datatype = 'string';
		o.depends({'enabled': '1', 'preset': 'custom'});
		o.write = write_custom_profile;

		o = s.option(form.Value, 'child_src', _('Child source'),
			_('Fallback for frame-src and worker-src.'));
		o.placeholder = "'none'";
		o.rmempty = true;
		o.depends({'enabled': '1', 'preset': 'custom'});
		o.write = write_custom_profile;

		o = s.option(form.Value, 'connect_src', _('Connect source'),
			_('Restricts the URLs which can be loaded using script interfaces.'));
		o.default = "'self' https://sysupgrade.openwrt.org";
		o.placeholder = "'self' https://*";
		o.rmempty = true;
		o.depends({'enabled': '1', 'preset': 'custom'});
		o.write = write_custom_profile;

		o = s.option(form.Value, 'font_src', _('Font source'),
			_('Specifies valid sources for fonts loaded using @font-face.'));
		o.placeholder = "'none'";
		o.depends({'enabled': '1', 'preset': 'custom'});
		o.write = write_custom_profile;

		o = s.option(form.Value, 'frame_ancestors', _('Frame ancestors'),
			_('Specifies valid parents that may embed a page using frame, iframe, object, or embed elements.'));
		o.placeholder = "'none'";
		o.depends({'enabled': '1', 'preset': 'custom'});
		o.write = write_custom_profile;

		o = s.option(form.Value, 'frame_source', _('Frame source'),
			_('Specifies valid sources for nested browsing contexts loaded into elements such as frame and iframe.'));
		o.placeholder = "'none'";
		o.depends({'enabled': '1', 'preset': 'custom'});
		o.write = write_custom_profile;

		o = s.option(form.Value, 'img_src', _('Image source'),
			_('Image source.'));
		o.default = "'self' data: blob:";
		o.placeholder = "'self' data: blob: https://*";
		o.depends({'enabled': '1', 'preset': 'custom'});
		o.write = write_custom_profile;

		o = s.option(form.Value, 'manifest_src', _('Manifest source'),
			_('Specifies valid sources of application manifest files.'));
		o.placeholder = "'self'";
		o.depends({'enabled': '1', 'preset': 'custom'});
		o.write = write_custom_profile;

		o = s.option(form.Value, 'media_src', _('Media source'),
			_('Specifies valid sources for loading media using the audio, video and track elements.'));
		o.default = "'self'";
		o.depends({'enabled': '1', 'preset': 'custom'});
		o.write = write_custom_profile;

		o = s.option(form.Value, 'object_src', _('Object source'),
			_('Object source.'));
		o.default = "'self'";
		o.depends({'enabled': '1', 'preset': 'custom'});
		o.write = write_custom_profile;

		o = s.option(form.Value, 'script_src', _('Script source'),
			_('Specifies valid sources for JavaScript and WebAssembly resources.'));
		o.default = "'self' 'unsafe-inline' 'unsafe-eval'";
		o.placeholder = "'self' 'unsafe-inline' 'unsafe-eval' 'trusted-types-eval'";
		o.depends({'enabled': '1', 'preset': 'custom'});
		o.write = write_custom_profile;

		o = s.option(form.Value, 'style_src', _('Style source'),
			_('CSS and style source.'));
		o.default = "'self' 'unsafe-inline'";
		o.placeholder = "'self' 'unsafe-inline' https://*";
		o.depends({'enabled': '1', 'preset': 'custom'});
		o.write = write_custom_profile;

		o = s.option(form.Flag, 'upgrade_insecure_requests', _('Upgrade to HTTPS'),
			_('Upgrade insecure requests.'));
		o.depends({'enabled': '1', 'preset': 'custom'});
		o.rmempty = false;
		o.write = write_custom_profile;

		o = s.option(form.DummyValue, 'custom_profile', _('Custom profile'),
			_('result'));
		o.depends({'enabled': '1', 'preset': 'custom'});
	},

	// Display current configuration summary
	configSummary(section) {
		if (section.enabled != '1')
			return null;

		const preset = section.preset || 'permissive';
		const cust = section.custom_profile;

		return _('Preset: %s').format(preset) + (section.custom_profile && preset === 'custom' ? '<br />' + _('Value: %s').format(section.custom_profile) : '');
	}
});
