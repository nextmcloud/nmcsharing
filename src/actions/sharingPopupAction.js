import { FileAction, Permission } from '@nextcloud/files'
import { translate as t } from '@nextcloud/l10n'

export const action = new FileAction({
	id: 'sharing-popup',
	displayName(nodes) {
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

	title(nodes) {
		/*
		const node = nodes[0]

		if (Array.isArray(node.attributes?.['share-types'])) {
			return t('files_sharing', 'Shared multiple times with different people')
		}
		*/
		return t('files_sharing', 'Show sharing options')
	},

	iconSvgInline() {
		return ''
	},

	enabled(nodes) {
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

	async exec(node, view, dir) {
		// You need read permissions to see the sidebar
		if ((node.permissions & Permission.READ) !== 0) {

			window.OCA.Files.Sidebar.close()

			window.OCA.Files.Sidebar.setActiveTab('sharing-manage')
			window.OCA.Files.Sidebar.setActiveTab('sharing')
			window.OCA.Files.Sidebar.setFullScreenMode(true)

			// TODO: migrate Sidebar to use a Node instead
			window.OCA.Files.Sidebar.open(node.path)

			try {
				// Silently update current fileid
				window.OCP.Files.Router.goToRoute(
					null,
					{ view: view.id, fileid: node.fileid },
					{ ...window.OCP.Files.Router.query, dir, popup: 'true' },
					true,
				)

				return null
			} catch (error) {
				return false
			}
		}
	},

	inline: () => true,

})
