<template>
	<SharingTab v-if="fileInfo" :key="fileInfo.id" :file-info="fileInfo" />
</template>

<script>
import SharingTab from './SharingTab.vue'
import FileInfo from '../services/FileInfoService.js'

export default {
	name: 'SharingSidebarTab',

	components: {
		SharingTab,
	},

	props: {
		node: {
			type: Object,
			default: undefined,
		},
		folder: {
			type: Object,
			default: undefined,
		},
		view: {
			type: Object,
			default: undefined,
		},
		active: {
			type: Boolean,
			default: false,
		},
	},

	computed: {
		fileInfo() {
			if (!this.node) {
				return undefined
			}

			return FileInfo(this.node)
		},
	},
}
</script>
