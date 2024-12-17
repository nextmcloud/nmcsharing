e``<template>
	<div>
		<NcButton id="addlink_button" type="secondary" @click.prevent.stop="addMultipleEmailShares">
			{{ t('nmcsharing', 'Add All Emails') }}
		</NcButton>
	</div>
</template>

<script>
import NcButton from '@nextcloud/vue/dist/Components/NcButton.js'
import SharesMixin from '../mixins/SharesMixin.js'

export default {
	name: 'AddAllEmailsButton',
	components: {
		NcButton,
	},
	mixins: [SharesMixin],
	props: {
		isLoading: {
			type: Boolean,
			default: false,
			required: true,
		},
		fileInfo: {
			type: Object,
			default: () => { },
			required: true,
		},
		filteredEmailArr: {
			type: Array,
			default: () => [],
			required: true,
		},
		// On button click, we will submit the multiple email shares defined by user
		// passing callback function as a prop for async $emit
		onSubmit: {
			type: Function,
			required: true,
		},
	},
	methods: {
		async addMultipleEmailShares() {
			for (const emailObj of this.filteredEmailArr) {
				await this.onSubmit(emailObj)
				this.$emit('add-share', emailObj)
			}
		},
	},
}
</script>

<style lang="scss" scoped>
button#addlink_button {
	font-size: 1rem;
	margin-bottom: 24px;
}
</style>
