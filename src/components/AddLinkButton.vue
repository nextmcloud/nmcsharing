<template>
	<div>
		<NcButton id="addlink_button" type="secondary" @click.prevent.stop="onNewLinkShare">
			{{ t('nmcsharing', 'Create new link') }}
		</NcButton>
	</div>
</template>

<script>
import NcButton from '@nextcloud/vue/dist/Components/NcButton.js'
import { Type as ShareTypes } from '@nextcloud/sharing'
import { showError, showSuccess } from '@nextcloud/dialogs'
import SharesMixin from '../mixins/SharesMixin.js'

export default {
	name: 'AddLinkButton',
	components: {
		NcButton,
	},
	mixins: [SharesMixin],
	props: {
		fileInfo: {
			type: Object,
			default: () => {},
			required: true,
		},
	},
	methods: {
		async onNewLinkShare() {
			try {
				// do nothing if we're already pending creation
				if (this.loading) {
					return true
				}

				this.loading = true
				this.errors = {}

				const path = (this.fileInfo.path + '/' + this.fileInfo.name).replace('//', '/')
				const expireDate = new Date(new Date().setFullYear(new Date().getFullYear() + 1))
				const options = {
					path,
					shareType: ShareTypes.SHARE_TYPE_LINK,
					expireDate,
				}

				// console.debug('Creating link share with options', options)

				const newShare = await this.createShare(options)

				// console.debug('Link share created', newShare)

				await new Promise(resolve => {
					this.$emit('add:share', newShare, resolve)
				})
				showSuccess(t('files_sharing', 'Link share created'))

			} catch (data) {
				const message = data?.response?.data?.ocs?.meta?.message
				if (!message) {
					showError(t('files_sharing', 'Error while creating the share'))
					console.error(data)
					return
				}
				this.onSyncError('pending', message)
				throw data
			} finally {
				this.loading = false
			}
		},
	},
}
</script>
