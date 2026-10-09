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
import { Permission } from '@nextcloud/files'

import SharingTab from './views/SharingTab.vue'
import { getShareAttributes } from './utils/shareAttributes.js'

// eslint-disable-next-line camelcase
__webpack_nonce__ = btoa(getRequestToken())
__webpack_public_path__ = '/customapps/nmcsharing/js/'

Vue.prototype.t = t
Vue.prototype.n = n

// Init Sharing tab component
const View = Vue.extend(SharingTab)

const tabId = 'sharing-manage'
const tagName = 'nmcsharing-sidebar-tab'

function toFileInfo(node) {
	const attributes = node.attributes ?? {}
	const sharePermissions = Number(attributes['share-permissions'] ?? node.permissions)

	return {
		id: node.fileid,
		fileid: node.fileid,
		name: node.basename,
		path: node.dirname,
		size: node.size,
		type: node.mime === 'httpd/unix-directory' ? 'dir' : 'file',
		mime: node.mime,
		mimetype: node.mime,
		permissions: node.permissions,
		sharePermissions,
		shareAttributes: getShareAttributes(node),
		shareOwner: attributes['owner-display-name'],
		shareOwnerId: attributes['owner-id'],
		attributes,
		canDownload: () => Boolean(node.permissions & Permission.READ),
	}
}

class SharingSidebarTab extends HTMLElement {
	constructor() {
		super()
		this.currentNode = null
		this.sharingView = null
		this.refreshing = false
	}

	set node(node) {
		this.currentNode = node
		this.refresh()
	}

	get node() {
		return this.currentNode
	}

	connectedCallback() {
		this.refresh()
	}

	disconnectedCallback() {
		this.sharingView?.$destroy()
		this.sharingView = null
	}

	async refresh() {
		if (!this.isConnected || !this.currentNode || this.refreshing) {
			return
		}

		this.refreshing = true
		try {
			const node = this.currentNode
			if (this.sharingView) {
				await this.sharingView.update(toFileInfo(node))
				return
			}

			const view = new View()
			await view.update(toFileInfo(node))
			if (!this.isConnected || node !== this.currentNode) {
				view.$destroy()
				return
			}

			view.$mount()
			this.appendChild(view.$el)
			this.sharingView = view
		} finally {
			this.refreshing = false
		}
	}
}

const sharingTab = {
	id: tabId,
	displayName: t('nmcsharing', 'Manage shares'),
	iconSvgInline: '',
	order: -60,
	tagName,
	async onInit() {
		if (!window.customElements.get(tagName)) {
			window.customElements.define(tagName, SharingSidebarTab)
		}
	},
}

const filesScope = (window._nc_files_scope ??= {})
const v4 = (filesScope.v4_0 ??= {})
const sidebarTabs = (v4.filesSidebarTabs ??= new Map())
sidebarTabs.set(tabId, sharingTab)
