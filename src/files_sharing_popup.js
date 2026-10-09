/**
 * @copyright Copyright (c) 2019 John Molakvoæ <skjnldsv@protonmail.com>
 *
 * @author John Molakvoæ <skjnldsv@protonmail.com>
 * @author Julius Härtl <jus@bitgrid.net>
 *
 * @license AGPL-3.0-or-later
 */

import Vue from 'vue'
import { getCSPNonce } from '@nextcloud/auth'
import { translate as t, translatePlural as n } from '@nextcloud/l10n'
import { generateFilePath } from '@nextcloud/router'

import SharingPopup from './views/SharingPopup.vue'

// eslint-disable-next-line camelcase
__webpack_public_path__ = generateFilePath('nmcsharing', '', 'js/')

// eslint-disable-next-line camelcase
__webpack_nonce__ = getCSPNonce()

Vue.prototype.t = t
Vue.prototype.n = n

const View = Vue.extend(SharingPopup)

let instance = null
let mountPoint = null

/**
 * Create the global sharing popup instance if it does not exist yet.
 *
 * @return {Vue} SharingPopup instance
 */
function getInstance() {
	if (instance) {
		return instance
	}

	mountPoint = document.createElement('div')
	mountPoint.id = 'nmcsharing-popup'
	document.body.appendChild(mountPoint)

	instance = new View()
	instance.$mount(mountPoint)

	instance.$on('close-popup', () => {
		// Keep the instance mounted so it can be reused.
	})

	return instance
}

/**
 * Open the MagentaCLOUD sharing popup.
 *
 * @param {object} fileInfo Legacy FileInfo object
 * @return {Promise<boolean>}
 */
async function openSharingPopup(fileInfo) {
	if (!fileInfo) {
		console.error('[nmcsharing] Cannot open sharing popup without fileInfo')
		return false
	}

	try {
		const popup = getInstance()

		await popup.open(fileInfo)

		return true
	} catch (error) {
		console.error('[nmcsharing] Failed to open sharing popup', error)
		return false
	}
}

/**
 * Destroy the globally mounted popup.
 *
 * Primarily useful for cleanup during development or app teardown.
 */
function destroySharingPopup() {
	if (!instance) {
		return
	}

	instance.$destroy()

	if (instance.$el?.parentNode) {
		instance.$el.parentNode.removeChild(instance.$el)
	}

	if (mountPoint?.parentNode) {
		mountPoint.parentNode.removeChild(mountPoint)
	}

	instance = null
	mountPoint = null
}

window.OCA ??= {}
window.OCA.Nmcsharing ??= {}

window.OCA.Nmcsharing.openSharingPopup = openSharingPopup
window.OCA.Nmcsharing.destroySharingPopup = destroySharingPopup
