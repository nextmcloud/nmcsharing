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

// Sharing popup modal component
const View = Vue.extend(SharingPopup)
let instance = null

/**
 * Tear down the currently mounted popup instance, if any.
 */
function destroyInstance() {
	if (instance) {
		const el = instance.$el
		instance.$destroy()
		el?.remove()
		instance = null
	}
}

/**
 * Open the MagentaCLOUD sharing popup as a standalone modal.
 *
 * Nextcloud 33 removed the OCA.Files.Sidebar API that this popup used to be
 * embedded in as a sidebar tab. The modal is now mounted directly on the page
 * and opened from the file action.
 *
 * @param {object} fileInfo the file to share ({ path, name, size, permissions, id, mime })
 */
async function openSharingPopup(fileInfo) {
	destroyInstance()

	const mountPoint = document.createElement('div')
	document.body.appendChild(mountPoint)

	instance = new View()
	instance.$on('close-popup', destroyInstance)
	instance.$mount(mountPoint)

	// Only show the modal once the share data is loaded
	await instance.update(fileInfo)
	instance.showThisModal()
}

window.OCA = window.OCA || {}
window.OCA.Nmcsharing = window.OCA.Nmcsharing || {}
window.OCA.Nmcsharing.openSharingPopup = openSharingPopup
