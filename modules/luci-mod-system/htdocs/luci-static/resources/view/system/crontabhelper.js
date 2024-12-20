'use strict';
'require view';
'require fs';
'require ui';

var isReadonlyView = !L.hasViewPermission() || null;


const yearly  = { minute: '@yearly',  command: '', comment: '', };
const monthly = { minute: '@monthly', command: '', comment: '', };
const weekly  = { minute: '@weekly',  command: '', comment: '', };
const daily   = { minute: '@daily',   command: '', comment: '', };
const hourly  = { minute: '@hourly',  command: '', comment: '', };
const a_task  = { minute: '*', hour: '*', day: '*', month: '*', weekday: '*', command: '', comment: '', };
const alias   = { minute: '@', hour: '*', day: '*', month: '*', weekday: '*', command: '', comment: '', };

const width = 'width:160px;';
const padding = 'padding:3px;';

return view.extend({
	load() {
		return L.resolveDefault(fs.read('/etc/crontabs/root'), '');
	},

	handleSave(ev) {
		const tasks = Array.from(document.querySelectorAll('.crontab-row')).map(row => {
			const getFieldValue = (fieldName) => {
				const mode = row.querySelector(`.${fieldName}-mode`)?.value;

				switch (mode) {
				case 'custom':
					const custom = row.querySelector(`.${fieldName}-custom`).value.trim();
					return custom;
				case 'ignore':
					return '*';
				case 'interval':
					const interval = row.querySelector(`.${fieldName}-interval`).value.trim();
					return interval ? `*/${interval}` : '*'; // Every Xth unit
				case 'specific':
					const specific = row.querySelector(`.${fieldName}-specific`).value.trim();
					return specific || '*'; // Specific units
				}
			};

			const comment = row.querySelector('.comment').value.trim();
			return {
				minute: getFieldValue('minute') || '*',
				hour: getFieldValue('hour') || '*',
				day: getFieldValue('day') || '*',
				month: getFieldValue('month') || '*',
				weekday: getFieldValue('weekday') || '*',
				command: row.querySelector('.command').value.trim(),
				comment: comment ? `# ${comment}` : '',
			};
		});

		const value = tasks.map(task => {
			if (task.minute[0] !== '@')
				return `${task.minute} ${task.hour} ${task.day} ${task.month} ${task.weekday} ${task.command} ${task.comment}`;
			else
				return `${task.minute} ${task.command} ${task.comment}`;
		}).join('\n') + '\n';

		return fs.write('/etc/crontabs/root', value).then(() => {
			ui.addNotification(null, E('p', _('Contents have been saved.')), 5000, 'info');
			return fs.exec('/etc/init.d/cron', [ 'reload' ]);
		}).catch(e => {
			ui.addNotification(null, E('p', _('Unable to save contents: %s').format(e.message)));
		});
	},

	render(crontab) {
		const tasks = (crontab || '').split('\n').filter(line => line.trim() && !line.startsWith('#')).map(line => {
			const parts = line.split(/\s+/);
			const commentIndex = parts.findIndex(part => part.startsWith('#'));
			// exclude the '#' character:
			if (commentIndex !== -1) parts[commentIndex] = parts[commentIndex].substring(1).trim();
			const comment = commentIndex !== -1 ? parts.slice(commentIndex).join(' ') : '';

			if(parts[0][0] == '@') {
				const updatedTask = { ...alias };
				updatedTask.minute = parts[0];
				updatedTask.command = commentIndex !== -1 ? parts.slice(1, commentIndex).join(' ') : parts.slice(1).join(' ');
				updatedTask.comment = comment;
				return updatedTask;
			}

			return {
				minute:  parts[0] || '',
				hour:    parts[1] || '',
				day:     parts[2] || '',
				month:   parts[3] || '',
				weekday: parts[4] || '',
				command: commentIndex !== -1 ? parts.slice(5, commentIndex).join(' ') : parts.slice(5).join(' ') || '',
				comment: comment || '',
			};
		});

		return E([
			E('h2', _('Scheduled Tasks')),
			E('p', { 'class': 'cbi-section-descr' }, _('Define your scheduled tasks for root below.')),
			E('a', { 'href': 'https://openwrt.org/docs/guide-user/base-system/cron', 'target':'_blank' }, _('Crontab help wiki')),
			E('table', { 'class': 'table', }, [
				E('thead', {}, [
					E('tr', {}, [
						E('th', {}, _('Minute')),
						E('th', {}, _('Hour')),
						E('th', {}, _('Day')),
						E('th', {}, _('Month')),
						E('th', {}, _('Weekday')),
						E('th', {}, _('Command')),
						E('th', {}, _('Comment')),
						E('th', {}, _('Actions'))
					])
				]),
				E('tbody', { 'id': 'crontab-rows' }, this.renderTaskRows(tasks)),
				E('hr', {}),
				E('tfoot', {}, [
					E('tr', {}, [
						E('td', { 'colspan': 1, 'style': padding }, [
							E('button', { 'class': 'btn', 'click': ui.createHandlerFn(this, 'addTask', alias   ) }, _('Add alias'))
						]),
						E('td', { 'colspan': 1, 'style': padding }, [
							E('button', { 'class': 'btn', 'click': ui.createHandlerFn(this, 'addTask') }, _('Add task'))
						]),
						E('td', { 'colspan': 1, 'style': padding }, [
							E('button', { 'class': 'btn', 'click': ui.createHandlerFn(this, 'addTask', yearly  ) }, _('Yearly task'))
						]),
						E('td', { 'colspan': 1, 'style': padding }, [
							E('button', { 'class': 'btn', 'click': ui.createHandlerFn(this, 'addTask', monthly ) }, _('Monthly task'))
						]),
						E('td', { 'colspan': 1, 'style': padding }, [
							E('button', { 'class': 'btn', 'click': ui.createHandlerFn(this, 'addTask', weekly  ) }, _('Weekly task'))
						]),
						E('td', { 'colspan': 1, 'style': padding }, [
							E('button', { 'class': 'btn', 'click': ui.createHandlerFn(this, 'addTask', daily   ) }, _('Daily task'))
						]),
						E('td', { 'colspan': 1, 'style': padding }, [
							E('button', { 'class': 'btn', 'click': ui.createHandlerFn(this, 'addTask', hourly  ) }, _('Hourly task'))
						]),
					])
				])
			])
		]);
	},

	renderTaskRows(tasks) {
		const rows = [];

		tasks.forEach((task, index) => {
			rows.push(E('tr', { 'class': 'crontab-hr' }, E('td', { 'colspan': 7 }, E('hr', { 'style': 'margin: 10px 0;' }))));
			if (task.minute[0] == '@')
				rows.push(this.renderAliasRow(task));
			else
				rows.push(this.renderTaskRow(task));
		});

		return rows;
	},

	renderAliasRow(task) {
		return E('tr', { 'class': 'crontab-row', 'style': padding }, [
					this.createTimeDropdown('minute', task.minute, 'Minute'),
					E('td', { 'style': padding },
						E('div', {}, [
							E('label', {}, _('Command')),
							E('input', { 'type': 'text', 'class': 'command', 'style': width, 'value': task.command, 'disabled': isReadonlyView }),
						]),
					),
					E('td', { 'style': padding },
						E('div', {}, [
							E('label', {}, _('Comment')),
							E('input', { 'type': 'text', 'class': 'comment', 'style': width, 'value': task.comment, 'disabled': isReadonlyView }),
						]),
					),
					E('td', { 'style': padding }, [
						E('button', { 'class': 'btn remove-task cbi-button-negative', 'click': ui.createHandlerFn(this, 'removeTask') }, _('Remove'))
					])
				]);
	},

	renderTaskRow(task) {
		return E('tr', { 'class': 'crontab-row' }, [
					this.createTimeDropdown('minute', task.minute, 'Minute', 0, 59),
					this.createTimeDropdown('hour', task.hour, 'Hour', 0, 23),
					this.createTimeDropdown('day', task.day, 'Day', 0, 31),
					this.createTimeDropdown('month', task.month, 'Month', 0, 12),
					this.createTimeDropdown('weekday', task.weekday, 'Weekday', 0, 6),
					E('td', { 'style': padding }, E('input', { 'type': 'text', 'class': 'command', 'style': width, 'value': task.command, 'disabled': isReadonlyView })),
					E('td', { 'style': padding }, E('input', { 'type': 'text', 'class': 'comment', 'style': width, 'value': task.comment, 'disabled': isReadonlyView })),
					E('td', { 'style': padding }, [
						E('button', { 'class': 'btn remove-task cbi-button-negative', 'click': ui.createHandlerFn(this, 'removeTask') }, _('Remove'))
					])
				]);
	},

	createTimeDropdown(fieldName, value, label, min, max) {
		const mode = value.includes(',') || parseInt(value, 10) >= 0 || value.startsWith('@')
			? (value.split(',').filter(v => v.startsWith('*/')).length > 1 || value.startsWith('@') ? 'custom' : 'specific')
			: value.startsWith('*/')
			? 'interval'
			: 'ignore';

		const intervalValue = mode === 'interval' ? value.substring(2) : '';
		const specificValue = mode === 'specific' ? value : '';
		const customValue = mode === 'custom' ? value : '';

		return E('td', { 'style': padding }, [
			E('div', { 'class': 'dropdown-container' }, [
				E('select', { 
					'class': `${fieldName}-mode`,
					'style': width,
					'change': ev => this.updateDropdownMode(ev, fieldName) 
				}, [
					E('option', { 'value': 'ignore', 'style': width,
						...(mode === 'ignore' ? { 'selected': 'true' } : {})
					}, _('-')),
					E('option', { 'value': 'interval', 'style': width,
						...(mode === 'interval' ? { 'selected': 'true' } : {}) 
					}, _('Every Xth')),
					E('option', { 'value': 'specific', 'style': width,
						...(mode === 'specific' ? { 'selected': 'true' } : {}) 
					}, _('Specific')),
					E('option', { 'value': 'custom', 'style': width,
						...(mode === 'custom' ? { 'selected': 'true' } : {}) 
					}, _('Custom'))
				]),
				E('div', { 'class': `${fieldName}-input ignore-input`, 'style': mode === 'ignore' ? '' : 'display:none;' }, [
					E('input', { 'type': 'text', 'class': fieldName, 'value': '*', 'style': mode === 'ignore' ? 'display:none;': width,
					})
				]),
				E('div', { 'class': `${fieldName}-input interval-input`, 'style': mode === 'interval' ? width : 'display:none;' }, [
					E('label', {}, _('Every')),
					E('input', { 'type': 'number', 'min': min, 'max': max, 'class': `${fieldName}-interval`, 'value': intervalValue, 'style': width }),
					E('span', {}, _(label.toLowerCase() + 's'))
				]),
				E('div', { 'class': `${fieldName}-input specific-input`, 'style': mode === 'specific' ? width : 'display:none;' }, [
					E('label', {}, _('At')),
					E('input', { 'type': 'text', 'class': `${fieldName}-specific`, 'value': specificValue, 'style': width }),
					E('span', {}, _(label.toLowerCase() + 's (comma-separated)'))
				]),
				E('div', { 'class': `${fieldName}-input custom-input`, 'style': mode === 'custom' ? width : 'display:none;' }, [
					E('label', {}, _('Value')),
					E('input', { 'type': 'text', 'class': `${fieldName}-custom`, 'value': customValue, 'style': width })
				]),
			])
		]);
	},

	updateDropdownMode(ev, fieldName) {
		const dropdown = ev.target.closest('.dropdown-container');
		const mode = ev.target.value;

		dropdown.querySelectorAll(`.${fieldName}-input`).forEach(input => {
			input.style.display = 'none';
		});

		dropdown.querySelector(`.${fieldName}-input.${mode}-input`).style.display = '';
	},

	addTask(param) {
		const tbody = document.getElementById('crontab-rows');

		let newTask
		if (param?.type !== 'click') {
			newTask = param;
		} else {
			newTask = a_task; 
		}
		const newRows = this.renderTaskRows([newTask]);
		newRows.forEach(row => {
			tbody.appendChild(row);
		})
	},

	removeTask(ev) {
		const row = ev.target.closest('.crontab-row');
		const hr = row.previousElementSibling;
		if (hr)	hr.remove();
		if (row) row.remove();
	},

	handleSaveApply: null,
	handleReset: null
});
