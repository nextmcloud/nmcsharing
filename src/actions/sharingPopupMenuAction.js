import { Permission } from '@nextcloud/files'
import { translate as t } from '@nextcloud/l10n'

import FileInfo from '../services/FileInfoService.js'

export const action = {
	id: 'sharing-popup-menu',

	displayName() {
		return t('files_sharing', 'Share')
	},

	title() {
		return t('nmcsharing', 'Show sharing options')
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

		const isEncrypted = node.attributes?.['is-encrypted'] === 1
			|| node.attributes?.['is-encrypted'] === true
			|| node.attributes?.isEncrypted === 1
			|| node.attributes?.isEncrypted === true

		if (isEncrypted) {
			return false
		}

		const shareTypes = node.attributes?.['share-types']

		const hasExistingShares = Array.isArray(shareTypes)
			? shareTypes.length > 0
			: shareTypes && typeof shareTypes === 'object'
				? Object.values(shareTypes).flat().length > 0
				: false

		const canShare = (node.permissions & Permission.SHARE) !== 0

		return canShare || hasExistingShares
	},

	async exec({ nodes }) {
		if (!Array.isArray(nodes) || nodes.length !== 1) {
			return false
		}

		const node = nodes[0]

		if (!node || (node.permissions & Permission.READ) === 0) {
			return false
		}

		const openSharingPopup = window.OCA?.Nmcsharing?.openSharingPopup

		if (typeof openSharingPopup !== 'function') {
			console.error('[nmcsharing] Sharing popup opener is not available')
			return false
		}

		try {
			const fileInfo = FileInfo(node)
			const opened = await openSharingPopup(fileInfo)

			return opened === false ? false : null
		} catch (error) {
			console.error(
				'[nmcsharing] Failed to open sharing popup from file menu',
				error,
			)

			return false
		}
	},

	order: -61,

	inline() {
		return false
	},
}
