import { FileAction, Permission } from '@nextcloud/files'
import { translate as t } from '@nextcloud/l10n'

import { action as sidebarAction } from './sidebarAction.js'

export const action = new FileAction({
	id: 'sharing-popup-magentacloud',
	displayName(nodes) {
		/*
		const node = nodes[0]
		const shareTypes = Object.values(node?.attributes?.['share-types'] || {}).flat()

		if (shareTypes.length > 0) {
			return t('files_sharing', 'Shared')
		}
		*/
		return 'Sharing Popup'
	},

	title(nodes) {
		const node = nodes[0]

		if (Array.isArray(node.attributes?.['share-types'])) {
			return t('files_sharing', 'Shared multiple times with different people')
		}

		return t('files_sharing', 'Show sharing options')
	},

	iconSvgInline() {
		return ''
	},

	enabled(nodes) {
		if (nodes.length !== 1) {
			return false
		}

		const node = nodes[0]
		const isMixed = Array.isArray(node.attributes?.['share-types'])

		if (isMixed) {
			return true
		}

		return (node.permissions & Permission.SHARE) !== 0
	},

	async exec(node, view, dir) {
		if ((node.permissions & Permission.READ) !== 0) {
			OCA.Files.Sidebar.setActiveTab('sharing-popup')
			return sidebarAction.exec(node, view, dir)
		}
		return null
	},

})
