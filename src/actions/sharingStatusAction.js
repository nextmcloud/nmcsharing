import { FileAction, Permission } from '@nextcloud/files'
import { translate as t } from '@nextcloud/l10n'

export const action = new FileAction({
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

	enabled(nodes) {
		if (nodes.length !== 1) {
			return false
		}

		const node = nodes[0]
		const shareTypes = node.attributes?.['share-types']
		const isMixed = Array.isArray(shareTypes) && shareTypes.length > 0

		// If the node is shared multiple times with
		// different share types to the current user
		if (isMixed) {
			return true
		}

		return (node.permissions & Permission.SHARE) !== 0
	},

	async exec(node, view, dir) {
		// You need read permissions to see the sidebar
		if ((node.permissions & Permission.READ) !== 0) {

			window.OCA.Files.Sidebar.close()

			window.OCA.Files.Sidebar.setActiveTab('sharing')
			window.OCA.Files.Sidebar.setActiveTab('sharing-manage')

			try {
				// Silently update current fileid
				window.OCP.Files.Router.goToRoute(
					null,
					{ view: view.id, fileid: node.fileid },
					{ dir },
					true,
				)

				// TODO: migrate Sidebar to use a Node instead
				await window.OCA.Files.Sidebar.open(node.path)

				return null
			} catch (error) {
				return false
			}
		}
	},

	order: -60,
})
