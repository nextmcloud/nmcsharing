<template>
	<div>
		<NcButton id="openSharing_button" type="secondary" @click.prevent.stop="openSharing">
			<template #icon>
				<ShareIcon />
			</template>
			{{ t('files_sharing', 'Sharing') }}
		</NcButton>
	</div>
</template>

<script>
import NcButton from '@nextcloud/vue/dist/Components/NcButton.js'
import ShareIcon from 'vue-material-design-icons/ShareCircle.vue'

export default {
	name: 'OpenSharingButton',
	components: {
		NcButton,
		ShareIcon,
	},
	props: {
		fileInfo: {
			type: Object,
			default: () => {},
			required: true,
		},
	},
	methods: {
		async openSharing() {
			const openSharingPopup = window.OCA?.Nmcsharing?.openSharingPopup
			if (typeof openSharingPopup !== 'function') {
				return false
			}

			window.OCA?.Files?._sidebar?.()?.close()
			await openSharingPopup(this.fileInfo)
			return null
		},
	},
}
</script>

<style lang="scss" scoped>
#openSharing_button {
	margin-top: 1rem !important;
}
</style>
