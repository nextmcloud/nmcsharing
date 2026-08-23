import { action as statusAtion } from './actions/sharingStatusAction'
import { action as popupAction } from './actions/sharingPopupAction'
import { action as popupMenuAction } from './actions/sharingPopupMenuAction'

/**
 * Register a file action into Nextcloud 33's scoped file-action registry.
 *
 * NC33 ships @nextcloud/files v4, which moved the registry from the legacy
 * `window._nc_fileactions` global to a version-scoped store at
 * `window._nc_files_scope.v4_0.fileActions`. This app is built against
 * @nextcloud/files v3 (it stays on Vue 2), so its bundled `registerFileAction`
 * would write to the old global that core no longer reads — the actions would
 * silently never appear. We therefore push directly into the v4 registry that
 * core actually consumes, mirroring v4's own `registerFileAction`: a Map keyed
 * by action id where the first registration for an id wins.
 *
 * @param {object} action the file action to register (must have a string `id`)
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
