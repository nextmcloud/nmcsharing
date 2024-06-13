import { registerFileAction } from '@nextcloud/files'
import { action } from './actions/sharingStatusAction'

registerFileAction(action)
