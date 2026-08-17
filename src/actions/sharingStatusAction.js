import { Permission, getSidebar } from '@nextcloud/files'
import { translate as t } from '@nextcloud/l10n'

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

		// enable sharing button in any case
		return true
		// return (node.permissions & Permission.SHARE) !== 0
	},

	async exec({ nodes }) {
		const node = nodes[0]

		// You need read permissions to see the sidebar
		if ((node.permissions & Permission.READ) === 0) {
			return false
		}

		const sidebar = getSidebar()
		if (!sidebar?.available) {
			return false
		}

		// "Manage shares" opens the files sidebar on the sharing tab.
		// Nextcloud 33 replaced the legacy OCA.Files.Sidebar API with
		// getSidebar(), which takes the Node itself and the tab id.
		sidebar.open(node, 'sharing')

		return null
	},

	order: -60,
}
