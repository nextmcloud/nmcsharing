import { action as statusAtion } from './actions/sharingStatusAction'
import { action as popupAction } from './actions/sharingPopupAction'
import { action as popupMenuAction } from './actions/sharingPopupMenuAction'

/**
 * The app is built against @nextcloud/files v3, but on NC33 core reads file
 * actions from the version-scoped window._nc_files_scope.v4_0.fileActions Map,
 * not the legacy window._nc_fileactions global that v3 writes to. Register
 * directly into that Map (first registration per id wins).
 *
 * @param {object} action the file action to register (needs a string `id`)
 */
function registerFileAction(action) {
	const filesScope = (window._nc_files_scope ??= {})
	const v4 = (filesScope.v4_0 ??= {})
	const actions = (v4.fileActions ??= new Map())

	if (actions.has(action.id)) {
		return
	}

	actions.set(action.id, action)
}

registerFileAction(statusAtion)
registerFileAction(popupAction)
registerFileAction(popupMenuAction)
