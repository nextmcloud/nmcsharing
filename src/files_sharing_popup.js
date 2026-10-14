/**
 * SPDX-FileCopyrightText: 2019 Nextcloud GmbH and Nextcloud contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import Vue from 'vue'
import { getCSPNonce } from '@nextcloud/auth'
import { getClient, getDefaultPropfind, resultToNode } from '@nextcloud/files/dav'
import { translate as t, translatePlural as n } from '@nextcloud/l10n'
import { generateFilePath } from '@nextcloud/router'

import FileInfo from './services/FileInfoService.js'
import SharingPopup from './views/SharingPopup.vue'

// eslint-disable-next-line camelcase
__webpack_public_path__ = generateFilePath('nmcsharing', '', 'js/')

// eslint-disable-next-line camelcase
__webpack_nonce__ = getCSPNonce()

Vue.prototype.t = t
Vue.prototype.n = n

const View = Vue.extend(SharingPopup)
const PENDING_SHARE_KEY = 'nmcsharing:pending-share'

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

async function openPendingSharingPopup() {
	const pendingShare = sessionStorage.getItem(PENDING_SHARE_KEY)

	if (!pendingShare) {
		return
	}

	sessionStorage.removeItem(PENDING_SHARE_KEY)

	try {
		const { fileid, davPath } = JSON.parse(pendingShare)

		if (!fileid || typeof davPath !== 'string' || davPath === '') {
			return
		}

		const response = await getClient().stat(davPath, {
			details: true,
			data: getDefaultPropfind(),
		})

		const node = resultToNode(response.data)

		if (!node?.id || String(node.id) !== String(fileid)) {
			console.error('[nmcsharing] Pending share file does not match resolved node', {
				fileid,
				resolvedFileid: node?.id,
				davPath,
			})
			return
		}

		await openSharingPopup(FileInfo(node))
	} catch (error) {
		console.error('[nmcsharing] Failed to open pending sharing popup', error)
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

if (document.readyState === 'loading') {
	window.addEventListener('DOMContentLoaded', () => openPendingSharingPopup(), { once: true })
} else {
	openPendingSharingPopup()
}
