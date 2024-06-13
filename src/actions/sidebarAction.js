import { Permission, FileAction } from '@nextcloud/files'
import { translate as t } from '@nextcloud/l10n'

export const ACTION_DETAILS = 'details'

export const action = new FileAction({
	id: ACTION_DETAILS,
	displayName: () => t('files', 'Open details'),
	iconSvgInline: () => '',

	// Sidebar currently supports user folder only, /files/USER
	enabled: (nodes) => {
		// Only works on single node
		if (nodes.length !== 1) {
			return false
		}

		if (!nodes[0]) {
			return false
		}

		// Only work if the sidebar is available
		if (!window?.OCA?.Files?.Sidebar) {
			return false
		}

		return (nodes[0].root?.startsWith('/files/') && nodes[0].permissions !== Permission.NONE) ?? false
	},

	async exec(node, view, dir) {
		try {
			// TODO: migrate Sidebar to use a Node instead
			await window.OCA.Files.Sidebar.open(node.path)

			// Silently update current fileid
			window.OCP.Files.Router.goToRoute(
				null,
				{ view: view.id, fileid: node.fileid },
				{ dir },
				true,
			)

			return null
		} catch (error) {
			return false
		}
	},

	order: -50,
})
