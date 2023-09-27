<template>
	<div>
		<NcCheckboxRadioSwitch :checked="isLimitEnabled" :disabled="loading" @update:checked="toggleDownloadLimit">
			{{ t('nmcsharing', 'Set download limit') }}
		</NcCheckboxRadioSwitch>
		<NcInputField v-if="isLimitEnabled"
			:value.sync="limit"
			@update:value="debounceUpdateLimit" />
	</div>
</template>
<script>
import NcInputField from '@nextcloud/vue/dist/Components/NcInputField.js'
import NcCheckboxRadioSwitch from '@nextcloud/vue/dist/Components/NcCheckboxRadioSwitch.js'

import { debounce } from 'throttle-debounce'
import { deleteDownloadLimit, getDownloadLimit, setDownloadLimit } from '../services/DownloadLimitService.js'

export default {
	name: 'DownloadLimit',
	components: {
		NcInputField,
		NcCheckboxRadioSwitch,
	},
	props: {
		fileInfo: {
			type: Object,
			required: true,
		},
		share: {
			type: Object,
			required: true,
		},
	},
	data() {
		return {
			isLimitEnabled: false,
			limit: '',
			count: null,
			token: null,
			loading: false,
		}
	},
	beforeMount() {
		this.getInitialData()
	},
	methods: {
		getInitialData() {
			this.loading = true
			getDownloadLimit(this.share.token).then(data => {
				// If token changed, let's update the checkbox state.
				if (this.token !== this.share.token) {
					this.isLimitEnabled = data.limit !== null
				}

				this.limit = data.limit === null ? '' : data.limit.toString()
				this.count = data.count
				this.token = this.share.token
			}).finally(() => {
				this.loading = false
			})
		},
		toggleDownloadLimit() {
			if (this.isLimitEnabled && this.limit !== '') {
				deleteDownloadLimit(this.token)
				this.limit = ''
			}
			this.isLimitEnabled = !this.isLimitEnabled
		},
		debounceUpdateLimit: debounce(300, async function(limit) {
			this.loading = true

			// If the value is not correct, let's remove the limit
			if (!parseInt(limit) || parseInt(limit) < 1) {
				await deleteDownloadLimit(this.token)
			} else {
				await setDownloadLimit(this.token, limit)
			}

			this.loading = false
		}),
	},
}

</script>
