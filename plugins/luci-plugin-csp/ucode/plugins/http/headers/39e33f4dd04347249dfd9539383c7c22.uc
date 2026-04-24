// Copyright 2026
// SPDX-License-Identifier: Apache-2.0

/*
The plugin filename shall be the 32 character uuid in its JS config front-end.
This allows parsing plugins against user-defined configuration. User retains
all control over whether a plugin is active or not.
*/

'use strict';

import { cursor } from 'uci';

// Define preset policies
const presets = {
	'strict': 'default-src \'none\'; script-src \'self\' \'unsafe-inline\' \'unsafe-eval\' \'trusted-types-eval\'; img-src \'self\' data: blob:; style-src \'self\' \'unsafe-inline\'; connect-src \'self\' https://sysupgrade.openwrt.org;',
	'permissive': 'default-src \'self\' https://*; script-src \'self\' \'unsafe-inline\' \'unsafe-eval\' \'trusted-types-eval\'; img-src \'self\' data: blob: https://*; style-src \'self\' \'unsafe-inline\' https://*;',
};

/* 
The ucode plugin portion shall return a default action which returns a value
and type of value appropriate for its usage class and type. For http.headers,
it shall return a string array[] with header_name, header_value, without any
\r or \n.
*/

function default_action(...args) {
	const uci = cursor();
	const preset = uci.get('luci_plugins', args[0], 'preset') || 'permissive';
	const custom = uci.get('luci_plugins', args[0], 'custom_profile') || '';
	const value = (custom && preset === 'custom') ? sprintf('%s', custom) : sprintf('%s', presets[preset]);

	return ['Content-Security-Policy', value];
};


return default_action;
