<template>
	<div>
		<NcCheckboxRadioSwitch
			:checked="isLimitEnabled"
			:disabled="loading || !share.token"
			@update:checked="toggleDownloadLimit">
			{{ t('nmcsharing', 'Set download limit') }}
		</NcCheckboxRadioSwitch>

		<NcInputField
			v-if="isLimitEnabled"
			type="number"
			min="1"
			step="1"
			:disabled="loading"
			:error="!isValidPositiveInteger"
			:helper-text="invalidIntegerError"
			:label="t('nmcsharing', 'Maximum number of downloads')"
			:title="downloadsLeftTooltip"
			:value="limit"
			@update:value="onLimitInput" />
	</div>
</template>

<script>
import { showError } from '@nextcloud/dialogs'
import NcCheckboxRadioSwitch from '@nextcloud/vue/dist/Components/NcCheckboxRadioSwitch.js'
import NcInputField from '@nextcloud/vue/dist/Components/NcInputField.js'
import { debounce } from 'throttle-debounce'

import {
	deleteDownloadLimit,
	getDownloadLimit,
	setDownloadLimit,
} from '../services/DownloadLimitService.js'

const DEFAULT_DOWNLOAD_LIMIT = '1'

export default {
	name: 'DownloadLimit',

	components: {
		NcCheckboxRadioSwitch,
		NcInputField,
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
			debouncedUpdateLimit: null,
		}
	},

	computed: {
		isValidPositiveInteger() {
			return /^[1-9]\d*$/.test(String(this.limit))
		},

		downloadsLeftTooltip() {
			if (!this.isValidPositiveInteger) {
				return ''
			}

			const limit = Number.parseInt(this.limit, 10)
			const count = Number(this.count ?? 0)
			const downloadsLeft = Math.max(0, limit - count)

			return t(
				'nmcsharing',
				'This share was limited to {limit} downloads. There is still {downloadsLeft} left allowed.',
				{
					limit,
					downloadsLeft,
				},
			)
		},

		invalidIntegerError() {
			if (!this.isValidPositiveInteger) {
				return t(
					'nmcsharing',
					'Limit needs to be a positive number',
				)
			}

			return undefined
		},
	},

	watch: {
		'share.token': {
			immediate: true,
			handler(token) {
				this.debouncedUpdateLimit?.cancel?.()
				this.getInitialData(token)
			},
		},
	},

	created() {
		this.debouncedUpdateLimit = debounce(
			300,
			(limit, token) => this.updateLimit(limit, token),
		)
	},

	beforeDestroy() {
		this.debouncedUpdateLimit?.cancel?.()
	},

	methods: {
		async getInitialData(token = this.share.token) {
			if (!token) {
				this.token = null
				this.limit = ''
				this.count = null
				this.isLimitEnabled = false
				this.loading = false
				return
			}

			this.loading = true
			this.token = token

			try {
				const data = await getDownloadLimit(token)

				// Ignore stale responses if the component switched to another share.
				if (this.share.token !== token) {
					return
				}

				this.isLimitEnabled = data.limit !== null
				&& data.limit !== undefined

				this.limit = this.isLimitEnabled
					? String(data.limit)
					: ''

				this.count = data.count ?? 0

				this.$emit(
					'limit-changed',
					this.isLimitEnabled && !this.isValidPositiveInteger,
				)
			} catch (error) {
				if (this.share.token === token) {
					console.error(
						'[nmcsharing] Failed to load download limit',
						error,
					)

					showError(
						t(
							'nmcsharing',
							'Unable to load download limit',
						),
					)
				}
			} finally {
				if (this.share.token === token) {
					this.loading = false
				}
			}
		},

		async toggleDownloadLimit(enabled) {
			const token = this.share.token

			if (!token || this.loading) {
				return
			}

			this.debouncedUpdateLimit?.cancel?.()
			this.loading = true

			try {
				if (!enabled) {
					await deleteDownloadLimit(token)

					if (this.share.token !== token) {
						return
					}

					this.isLimitEnabled = false
					this.limit = ''
					this.count = null
					this.$emit('limit-changed', false)

					return
				}

				const initialLimit = this.isValidPositiveInteger
					? this.limit
					: DEFAULT_DOWNLOAD_LIMIT

				await setDownloadLimit(
					token,
					Number.parseInt(initialLimit, 10),
				)

				if (this.share.token !== token) {
					return
				}

				const data = await getDownloadLimit(token)

				if (this.share.token !== token) {
					return
				}

				this.isLimitEnabled = true
				this.limit = String(data.limit ?? initialLimit)
				this.count = data.count ?? 0
				this.$emit('limit-changed', false)
			} catch (error) {
				console.error(
					'[nmcsharing] Failed to change download limit',
					error,
				)

				showError(
					t(
						'nmcsharing',
						'Unable to update download limit',
					),
				)

				// Restore the actual state from the server.
				await this.reloadAfterError(token)
			} finally {
				if (this.share.token === token) {
					this.loading = false
				}
			}
		},

		onLimitInput(value) {
			this.limit = value === null || value === undefined
				? ''
				: String(value)

			const invalid = !this.isValidPositiveInteger

			this.$emit('limit-changed', invalid)

			if (invalid) {
				this.debouncedUpdateLimit?.cancel?.()
				return
			}

			this.debouncedUpdateLimit(
				this.limit,
				this.share.token,
			)
		},

		async updateLimit(limit, token) {
			if (
				!token
				|| token !== this.share.token
				|| !this.isLimitEnabled
				|| !/^[1-9]\d*$/.test(String(limit))
			) {
				return
			}

			this.loading = true

			try {
				await setDownloadLimit(
					token,
					Number.parseInt(limit, 10),
				)

				if (this.share.token !== token) {
					return
				}

				// Reload so count and server-normalized values stay correct.
				const data = await getDownloadLimit(token)

				if (this.share.token !== token) {
					return
				}

				this.limit = String(data.limit ?? limit)
				this.count = data.count ?? 0
				this.$emit('limit-changed', false)
			} catch (error) {
				console.error(
					'[nmcsharing] Failed to update download limit',
					error,
				)

				showError(
					t(
						'nmcsharing',
						'Unable to update download limit',
					),
				)

				await this.reloadAfterError(token)
			} finally {
				if (this.share.token === token) {
					this.loading = false
				}
			}
		},

		async reloadAfterError(token) {
			if (!token || this.share.token !== token) {
				return
			}

			try {
				const data = await getDownloadLimit(token)

				if (this.share.token !== token) {
					return
				}

				this.isLimitEnabled = data.limit !== null
					&& data.limit !== undefined

				this.limit = this.isLimitEnabled
					? String(data.limit)
					: ''

				this.count = data.count ?? 0
			} catch (error) {
				console.error(
					'[nmcsharing] Failed to restore download limit state',
					error,
				)
			}
		},
	},
}
</script>