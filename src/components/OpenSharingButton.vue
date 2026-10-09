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
			required: true,
		},
	},

	methods: {
		async openSharing() {
			const openSharingPopup = window.OCA?.Nmcsharing?.openSharingPopup

			if (typeof openSharingPopup !== 'function') {
				console.error('[nmcsharing] Sharing popup opener is not available')
				return false
			}

			await openSharingPopup(this.fileInfo)

			return true
		},
	},
}
</script>

<style lang="scss" scoped>
#openSharing_button {
	margin-top: 1rem !important;
}
</style>
