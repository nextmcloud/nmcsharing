<template>
	<div>
		<NcButton
			id="addlink_button"
			type="secondary"
			:disabled="loading"
			@click.prevent.stop="onNewLinkShare">
			{{ t('nmcsharing', 'Create new link') }}
		</NcButton>
	</div>
</template>

<script>
import { showError, showSuccess } from '@nextcloud/dialogs'
import { ShareType } from '@nextcloud/sharing'
import NcButton from '@nextcloud/vue/dist/Components/NcButton.js'

import SharesMixin from '../mixins/SharesMixin.js'

export default {
	name: 'AddLinkButton',

	components: {
		NcButton,
	},

	mixins: [
		SharesMixin,
	],

	props: {
		fileInfo: {
			type: Object,
			required: true,
		},
	},

	methods: {
		async onNewLinkShare() {
			if (this.loading) {
				return false
			}

			try {
				this.loading = true
				this.errors = {}

				const path = `${this.fileInfo.path}/${this.fileInfo.name}`.replace(/\/+/g, '/')

				// Keep the existing behaviour: link expires after one year.
				const expiration = new Date()
				expiration.setFullYear(expiration.getFullYear() + 1)

				const expireDate = [
					expiration.getFullYear(),
					String(expiration.getMonth() + 1).padStart(2, '0'),
					String(expiration.getDate()).padStart(2, '0'),
				].join('-')

				const options = {
					path,
					shareType: ShareType.Link,
					expireDate,
					attributes: JSON.stringify(this.fileInfo.shareAttributes ?? []),
				}

				const newShare = await this.createShare(options)

				// No callback/Pending Promise needed here.
				// AddLinkButton does not need the rendered SharingEntryLink instance.
				this.$emit('add:share', newShare)

				showSuccess(t('files_sharing', 'Link share created'))

				return true
			} catch (error) {
				const message = error?.response?.data?.ocs?.meta?.message

				if (message) {
					this.onSyncError('pending', message)
					showError(message)
				} else {
					showError(t('files_sharing', 'Error while creating the share'))
				}

				console.error('[nmcsharing] Error while creating link share', error)

				return false
			} finally {
				this.loading = false
			}
		},
	},
}
</script>
