import { Permission } from '@nextcloud/files'
import { translate as t } from '@nextcloud/l10n'

import FileInfo from '../services/FileInfoService.js'

export const action = {
	id: 'sharing-popup',

	displayName({ nodes }) {
		const node = nodes[0]
		const sharedWithMe = node?.attributes?.['mount-type'] === 'shared'

		if (sharedWithMe) {
			return t('nmcsharing', 'Shared with me')
		}

		const shareTypes = Object.values(node?.attributes?.['share-types'] || {}).flat()

		if (shareTypes.length > 0) {
			return t('files_sharing', 'Shared')
		}

		return ''
	},

	title() {
		return t('nmcsharing', 'Show sharing options')
	},

	iconSvgInline() {
		return ''
	},

	enabled({ nodes }) {
		if (nodes.length !== 1) {
			return false
		}

		if (window.OCP?.Files?.Router?.params?.view === 'trashbin') {
			return false
		}

		const node = nodes[0]

		if (node.attributes?.['is-encrypted'] === 1) {
			return false
		}

		return true
	},

	async exec({ nodes }) {
		const node = nodes[0]

		if ((node.permissions & Permission.READ) === 0) {
			return false
		}

		const openSharingPopup = window.OCA?.Nmcsharing?.openSharingPopup

		if (typeof openSharingPopup !== 'function') {
			console.error('[nmcsharing] Sharing popup opener is not available')
			return false
		}

		const fileInfo = FileInfo(node)

		await openSharingPopup(fileInfo)

		return null
	},

	inline: () => true,
}
