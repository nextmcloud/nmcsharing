import { registerFileAction } from '@nextcloud/files'
import { action as statusAtion } from './actions/sharingStatusAction'
import { action as popupAction } from './actions/sharingPopupAction'
import { action as popupMenuAction } from './actions/sharingPopupMenuAction'

registerFileAction(statusAtion)
registerFileAction(popupAction)
registerFileAction(popupMenuAction)
