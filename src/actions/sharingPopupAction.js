import { Permission } from '@nextcloud/files'
import { translate as t } from '@nextcloud/l10n'

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

		// enable popup button in any case
		return true
		// return (node.permissions & Permission.SHARE) !== 0
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
		// The popup is mounted by files_sharing_popup.js, which exposes the
		// opener globally; it expects a legacy FileInfo shape, so map the Node.
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

	inline: () => true,

}
