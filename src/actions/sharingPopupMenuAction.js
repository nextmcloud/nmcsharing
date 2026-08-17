import { Permission } from '@nextcloud/files'
import { translate as t } from '@nextcloud/l10n'

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
		if (nodes.length !== 1) {
			return false
		}

		if (window.OCP.Files.Router.params.view === 'trashbin') {
			return false
		}

		const node = nodes[0]

		if (node.attributes?.['is-encrypted'] === 1) {
			return false
		}

		const shareTypes = node.attributes?.['share-types']
		const isMixed = Array.isArray(shareTypes) && shareTypes.length > 0

		// If the node is shared multiple times with
		// different share types to the current user
		if (isMixed) {
			return true
		}

		return (node.permissions & Permission.SHARE) !== 0
	},

	async exec({ nodes }) {
		const node = nodes[0]

		// You need read permissions to share
		if ((node.permissions & Permission.READ) === 0) {
			return false
		}

		const openSharingPopup = window.OCA?.Nmcsharing?.openSharingPopup
		if (typeof openSharingPopup !== 'function') {
			return false
		}

		// Open the MagentaCLOUD sharing popup modal for this node.
		openSharingPopup({
			id: node.fileid,
			name: node.basename,
			path: node.dirname,
			size: node.size,
			permissions: node.permissions,
			mime: node.mime,
		})

		return null
	},

	order: -61,

}
