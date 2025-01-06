/**
 * @copyright Copyright (c) 2019 John Molakvoæ <skjnldsv@protonmail.com>
 *
 * @author John Molakvoæ <skjnldsv@protonmail.com>
 * @author Julius Härtl <jus@bitgrid.net>
 *
 * @license AGPL-3.0-or-later
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 *
 */

import Vue from 'vue'
import { translate as t, translatePlural as n } from '@nextcloud/l10n'
import { getRequestToken } from '@nextcloud/auth'

import SharingPopup from './views/SharingPopup.vue'

// eslint-disable-next-line camelcase
__webpack_nonce__ = btoa(getRequestToken())
__webpack_public_path__ = '/customapps/nmcsharing/js/'

Vue.prototype.t = t
Vue.prototype.n = n

// Init Sharing tab component
const View = Vue.extend(SharingPopup)
let TabInstance = null

/**
 * Check if tap should be removed
 *
 * @param id
 */
function checkTabs(id) {
	return id !== 'sharing' && id !== 'photos' && id !== 'comments' && id !== 'version_vue'
}

const sharingTab = new OCA.Files.Sidebar.Tab({
	id: 'sharing',
	name: t('files_sharing', 'Sharing Popup'),
	icon: 'icon-share',

	async mount(el, fileInfo, context) {
		if (TabInstance) {
			TabInstance.$destroy()
		}
		TabInstance = new View({
			// Better integration with vue parent component
			parent: context,
		})
		// Only mount after we have all the info we need
		await TabInstance.update(fileInfo)
		TabInstance.$mount(el)
	},
	update(fileInfo) {
		TabInstance.update(fileInfo)
	},
	destroy() {
		TabInstance.$destroy()
		TabInstance = null
	},
})

window.addEventListener('DOMContentLoaded', () => {
	if (OCA.Files && OCA.Files.Sidebar) {
		// remove all unused tabs
		const tabsState = OCA.Files.Sidebar.state.tabs
		OCA.Files.Sidebar.state.tabs = tabsState.filter((tab) => checkTabs(tab.id))
		// register new sharing popup
		OCA.Files.Sidebar.registerTab(sharingTab)
	}
})
