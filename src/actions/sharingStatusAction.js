import {
	getSidebar,
	Permission,
} from '@nextcloud/files'

import { translate as t } from '@nextcloud/l10n'

/**
 * Remove focus from a button inside an NcActions/FloatingVue popover
 * before the file action closes the menu.
 */
function releaseActionMenuFocus() {
	const activeElement = document.activeElement

	if (!(activeElement instanceof HTMLElement)) {
		return
	}

	if (
		activeElement.closest('.action-item__popper')
		|| activeElement.closest('.v-popper__popper')
	) {
		activeElement.blur()
	}
}

export const action = {
	id: 'sharing-manage',

	displayName() {
		return t('nmcsharing', 'Manage shares')
	},

	title() {
		return t('nmcsharing', 'Manage shares')
	},

	iconSvgInline() {
		return ''
	},

	enabled({ nodes }) {
		if (!Array.isArray(nodes) || nodes.length !== 1) {
			return false
		}

		if (window.OCP?.Files?.Router?.params?.view === 'trashbin') {
			return false
		}

		const node = nodes[0]

		if (!node) {
			return false
		}

		if ((node.permissions & Permission.READ) === 0) {
			return false
		}

		const isEncrypted =
			node.attributes?.['is-encrypted'] === 1
			|| node.attributes?.['is-encrypted'] === true
			|| node.attributes?.isEncrypted === 1
			|| node.attributes?.isEncrypted === true

		if (isEncrypted) {
			return false
		}

		const sidebar = getSidebar()

		return sidebar?.available === true
	},

	async exec({ nodes }) {
		if (!Array.isArray(nodes) || nodes.length !== 1) {
			return false
		}

		const node = nodes[0]

		if (!node) {
			return false
		}

		if ((node.permissions & Permission.READ) === 0) {
			return false
		}

		const sidebar = getSidebar()

		if (!sidebar?.available) {
			console.error(
				'[nmcsharing] Files sidebar is not available',
			)

			return false
		}

		try {
			/*
			 * The file action is executed from an NcActions popover.
			 * The clicked menu button still owns focus at this point.
			 *
			 * Release it before Nextcloud hides the popover, otherwise
			 * Chromium reports:
			 *
			 * "Blocked aria-hidden on an element because its descendant
			 * retained focus."
			 */
			releaseActionMenuFocus()

			/*
			 * Give the browser one frame to apply the focus change
			 * before opening the sidebar and allowing the action menu
			 * to close.
			 */
			await new Promise(resolve => {
				requestAnimationFrame(resolve)
			})

			sidebar.open(node, 'sharing')

			return null
		} catch (error) {
			console.error(
				'[nmcsharing] Failed to open sharing sidebar',
				error,
			)

			return false
		}
	},

	order: -60,

	inline() {
		return false
	},
}
