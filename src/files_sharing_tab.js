/**
 * SPDX-FileCopyrightText: 2019 Nextcloud GmbH and Nextcloud contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { getCSPNonce } from '@nextcloud/auth'
import { getSidebar } from '@nextcloud/files'
import { translate as t, translatePlural as n } from '@nextcloud/l10n'
import { generateFilePath } from '@nextcloud/router'
import Vue from 'vue'

// eslint-disable-next-line camelcase
__webpack_public_path__ = generateFilePath('nmcsharing', '', 'js/')

// eslint-disable-next-line camelcase
__webpack_nonce__ = getCSPNonce()

Vue.prototype.t = t
Vue.prototype.n = n

const tagName = 'sharing-sidebar-tab'

const shareIcon = `
	<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
		<path fill="currentColor" d="M18 16c-.79 0-1.5.31-2.03.81L8.91 12.7c.05-.23.09-.46.09-.7s-.03-.47-.09-.7l6.98-4.11C16.43 7.69 17.14 8 18 8c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.11 9.81C7.57 9.31 6.86 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.86 0 1.57-.31 2.11-.81l6.98 4.11c-.05.21-.09.44-.09.7 0 1.66 1.34 3 3 3s3-1.34 3-3-1.34-3-3-3z" />
	</svg>
`.trim()

getSidebar().registerTab({
	id: 'sharing',
	displayName: t('files_sharing', 'Sharing'),
	iconSvgInline: shareIcon,
	order: 10,
	tagName,

	enabled() {
		return true
	},

	async onInit() {
		if (window.customElements.get(tagName)) {
			return
		}

		const { default: SharingSidebarTab } = await import('./views/SharingSidebarTab.vue')

		class SharingSidebarElement extends HTMLElement {
			constructor() {
				super()

				this._node = undefined
				this._folder = undefined
				this._view = undefined
				this._active = false
				this._state = undefined
				this._vm = undefined
			}

			connectedCallback() {
				if (this._vm) {
					return
				}

				this._state = Vue.observable({
					node: this._node,
					folder: this._folder,
					view: this._view,
					active: this._active,
				})

				this._vm = new Vue({
					render: h => h(SharingSidebarTab, {
						props: {
							node: this._state.node,
							folder: this._state.folder,
							view: this._state.view,
							active: this._state.active,
						},
					}),
				}).$mount()

				this.appendChild(this._vm.$el)
			}

			disconnectedCallback() {
				if (!this._vm) {
					return
				}

				this._vm.$destroy()

				if (this._vm.$el?.parentNode === this) {
					this.removeChild(this._vm.$el)
				}

				this._vm = undefined
				this._state = undefined
			}

			get node() {
				return this._node
			}

			set node(value) {
				this._node = value

				if (this._state) {
					this._state.node = value
				}
			}

			get folder() {
				return this._folder
			}

			set folder(value) {
				this._folder = value

				if (this._state) {
					this._state.folder = value
				}
			}

			get view() {
				return this._view
			}

			set view(value) {
				this._view = value

				if (this._state) {
					this._state.view = value
				}
			}

			get active() {
				return this._active
			}

			set active(value) {
				this._active = Boolean(value)

				if (this._state) {
					this._state.active = Boolean(value)
				}
			}
		}

		window.customElements.define(tagName, SharingSidebarElement)
	},
})
