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
			try {
				const fileInfoPathName = this.fileInfo.path + '/' + this.fileInfo.name

				window.OCA.Files.Sidebar.close()

				window.OCA.Files.Sidebar.setActiveTab('sharing-manage')
				window.OCA.Files.Sidebar.setActiveTab('sharing')
				window.OCA.Files.Sidebar.setFullScreenMode(true)

				const currentUrl = window.location.search;
				if(!currentUrl.includes('openfile')) {
					document.querySelector('#app-sidebar-vue').style.width = '0%';
				}

				// TODO: migrate Sidebar to use a Node instead
				window.OCA.Files.Sidebar.open(fileInfoPathName)

				return null
			} catch (error) {
				return false
			}
		},
	},
}
</script>

<style lang="scss" scoped>
#openSharing_button {
	margin-top: 1rem !important;
}
</style>
