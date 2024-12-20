import { registerFileAction, getFileActions } from '@nextcloud/files'
import { action as statusAtion } from './actions/sharingStatusAction'
import { action as popupAction } from './actions/sharingPopupAction'

registerFileAction(statusAtion)
registerFileAction(popupAction)
