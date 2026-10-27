<template>
	<div v-if="canReshare" class="sharing-search">
		<SharingInputDetailsLink :file-info="fileInfo"
			:disabled="!isValidValue"
			:share.sync="newShare"
			@open-sharing-details-all="openDetails" />
		<NcSelect ref="select"
			v-model="value"
			input-id="sharing-search-input"
			class="sharing-search__input"
			:loading="loading"
			:filterable="false"
			:placeholder="inputPlaceholder"
			:clear-search-on-blur="() => false"
			:user-select="true"
			:multiple="true"
			:options="options"
			@search="asyncFind">
			<template #no-options="{ search }">
				{{ search ? noResultText : t('files_sharing', 'No recommendations. Start typing.') }}
			</template>
		</NcSelect>
		<div class="button-group">
			<NcButton type="primary"
				class="button-send"
				:disabled="!isValidValue"
				@click="sendSharing">
				{{ t('nmcsharing', 'Send') }}
			</NcButton>
		</div>
	</div>
</template>

<script>
import { getCurrentUser } from '@nextcloud/auth'
import axios from '@nextcloud/axios'
import { showError } from '@nextcloud/dialogs'
import { generateOcsUrl } from '@nextcloud/router'
import { debounce } from 'throttle-debounce'
import NcButton from '@nextcloud/vue/dist/Components/NcButton.js'
import NcSelect from '@nextcloud/vue/dist/Components/NcSelect.js'
import Config from '../services/ConfigService.js'
import Share from '../models/Share.js'
import ShareDetails from '../mixins/ShareDetails.js'
import SharesMixin from '../mixins/SharesMixin.js'
import ShareRequests from '../mixins/ShareRequests.js'
import ShareTypes from '../mixins/ShareTypes.js'
import SharingInputDetailsLink from './SharingInputDetailsLink.vue'

export default {
	name: 'SharingInput',
	components: {
		NcButton,
		NcSelect,
		SharingInputDetailsLink,
	},
	mixins: [ShareTypes, ShareRequests, SharesMixin, ShareDetails],
	props: {
		shares: {
			type: Array,
			default: () => [],
			required: true,
		},
		linkShares: {
			type: Array,
			default: () => [],
			required: true,
		},
		newShare: {
			type: Object,
			default: () => {},
			required: true,
		},
		fileInfo: {
			type: Object,
			default: () => {},
			required: true,
		},
		reshare: {
			type: Share,
			default: null,
		},
		canReshare: {
			type: Boolean,
			required: true,
		},
		isSharedWithMe: {
			type: Boolean,
			required: true,
		},
		shareSet: {
			type: Boolean,
			required: true,
		},
	},
	data() {
		return {
			config: new Config(),
			loading: false,
			query: '',
			recommendations: [],
			ShareSearch: OCA.Sharing.ShareSearch.state,
			suggestions: [],
			value: [],
			fallbackShare: { permissions: 1 },
			createdShareKeys: [],
		}
	},
	computed: {
		externalResults() {
			return this.ShareSearch.results
		},
		inputPlaceholder() {
			const allowRemoteSharing = this.config.isRemoteShareAllowed
			if (!this.canReshare) {
				return t('files_sharing', 'Resharing is not allowed')
			}
			if (!allowRemoteSharing) {
				return t('files_sharing', 'Name or email …')
			}
			return t('nmcsharing', 'Name, email')
		},
		isValidValue() {
			return Array.isArray(this.value) && this.value.length > 0
		},
		isValidQuery() {
			return this.query && this.query.trim() !== '' && this.query.length > this.config.minSearchStringLength
		},
		options() {
			return this.isValidQuery ? this.suggestions : this.recommendations
		},
		noResultText() {
			if (this.loading) {
				return t('files_sharing', 'Searching …')
			}
			return t('files_sharing', 'No elements found.')
		},
	},
	mounted() {
		this.getRecommendations()
	},
	methods: {
		openDetails() {
			this.openSharingDetailsAll(this.value)
		},
		getShareType(share) {
			const type = share?.value?.shareType ?? share?.shareType ?? share?.type ?? null
			if (type === null || type === undefined || type === '') {
				return null
			}
			const normalizedType = Number(type)
			return Number.isNaN(normalizedType) ? null : normalizedType
		},
		getShareWith(share) {
			return share?.value?.shareWith ?? share?.shareWith ?? ''
		},
		getCurrentItemKey() {
			const path = this.fileInfo?.path ?? ''
			const name = this.fileInfo?.name ?? ''
			return `${path}/${name}`.replace('//', '/')
		},
		getShareKey(shareType, shareWith) {
			if (shareType === null || shareType === undefined || typeof shareWith !== 'string') {
				return ''
			}
			const normalizedType = Number(shareType)
			const normalizedShareWith = normalizedType === this.SHARE_TYPES.Email
				? shareWith.trim().toLowerCase()
				: shareWith.trim()
			if (normalizedShareWith === '') {
				return ''
			}
			return `${this.getCurrentItemKey()}|${normalizedType}:${normalizedShareWith}`
		},
		getExistingShareKeys() {
			const keys = new Set(this.createdShareKeys)
			for (const share of [...this.shares, ...this.linkShares]) {
				const key = this.getShareKey(
					this.getShareType(share),
					this.getShareWith(share),
				)
				if (key !== '') {
					keys.add(key)
				}
			}
			return keys
		},
		isExistingShare(shareType, shareWith) {
			const key = this.getShareKey(shareType, shareWith)
			return key !== '' && this.getExistingShareKeys().has(key)
		},
		getShareErrorMessage(error) {
			return error?.response?.data?.ocs?.meta?.message
				?? error?.response?.data?.ocs?.data?.message
				?? error?.response?.data?.message
				?? error?.message
				?? t('files_sharing', 'Adding share failed')
		},
		async sendSharing() {
			if (!this.isValidValue) {
				return
			}
			const selectedValues = [...this.value]
			const thisShare = this.shareSet ? this.newShare : this.fallbackShare
			const pendingShareKeys = new Set()
			let failed = false
			for (const thisValue of selectedValues) {
				const shareKey = this.getShareKey(thisValue.shareType, thisValue.shareWith)
				if (shareKey === '' || pendingShareKeys.has(shareKey) || this.isExistingShare(thisValue.shareType, thisValue.shareWith)) {
					failed = true
					showError(t('nmcsharing', 'This file or folder has already been shared with this person or group.'))
					continue
				}
				pendingShareKeys.add(shareKey)
				const incomingShare = {
					permissions: thisShare.permissions,
					shareType: thisValue.shareType,
					shareWith: thisValue.shareWith,
					shareWithDisplayName: thisValue.displayName,
					shareWithDisplayNameUnique: thisValue.shareWithDisplayNameUnique,
					attributes: thisShare.attributes,
					label: thisShare.label,
					note: thisShare.note,
					expireDate: thisShare.expireDate,
					password: thisShare.password,
					hideDownload: thisShare.hideDownload,
					handler: thisValue.handler,
				}
				try {
					const newShare = await this.addShare(incomingShare, this.fileInfo)
					if (!this.createdShareKeys.includes(shareKey)) {
						this.createdShareKeys.push(shareKey)
					}
					this.$emit('add:share', newShare)
				} catch (error) {
					failed = true
					showError(this.getShareErrorMessage(error))
					console.error('Error adding share:', error)
				}
			}
			this.value = []
			this.query = ''
			this.suggestions = []
			if (!failed) {
				this.$emit('done:share')
			}
		},
		async addShare(value, fileInfo) {
			if (value.handler) {
				const share = await value.handler(this)
				return new Share(share)
			}
			const path = (fileInfo.path + '/' + fileInfo.name).replace('//', '/')
			return await this.createShare({
				path,
				shareType: value.shareType,
				shareWith: value.shareWith,
				permissions: value.permissions,
				attributes: JSON.stringify(fileInfo.shareAttributes),
				...(value.note ? { note: value.note } : {}),
				...(value.password ? { password: value.password } : {}),
				...(value.expireDate ? { expireDate: value.expireDate } : {}),
				...(value.label ? { label: value.label } : {}),
				...(value.hideDownload ? { hideDownload: 1 } : {}),
			})
		},
		async asyncFind(query) {
			this.query = query.trim()
			if (this.isValidQuery) {
				this.loading = true
				await this.debounceGetSuggestions(query)
			}
		},
		async getSuggestions(search, lookup = false) {
			this.loading = true
			if (OC.getCapabilities().files_sharing.sharee.query_lookup_default === true) {
				lookup = true
			}
			const shareType = [
				this.SHARE_TYPES.User,
			]
			if (OC.getCapabilities().files_sharing.public.enabled === true) {
				shareType.push(this.SHARE_TYPES.Email)
			}
			let request = null
			try {
				request = await axios.get(generateOcsUrl('apps/files_sharing/api/v1/sharees'), {
					params: {
						format: 'json',
						itemType: this.fileInfo.type === 'dir' ? 'folder' : 'file',
						search,
						lookup,
						perPage: this.config.maxAutocompleteResults,
						shareType,
					},
				})
			} catch (error) {
				console.error('Error fetching suggestions', error)
				this.suggestions = []
				this.loading = false
				return
			}
			const data = request.data.ocs.data
			const exact = data.exact
			data.exact = []
			const rawExactSuggestions = Object.values(exact).reduce((arr, elem) => arr.concat(elem), [])
			const rawSuggestions = Object.values(data).reduce((arr, elem) => arr.concat(elem), [])
			const exactSuggestions = this.filterOutExistingShares(rawExactSuggestions)
				.map(share => this.formatForMultiselect(share))
				.sort((a, b) => a.shareType - b.shareType)
			const suggestions = this.filterOutExistingShares(rawSuggestions)
				.map(share => this.formatForMultiselect(share))
				.sort((a, b) => a.shareType - b.shareType)
			const externalResults = this.filterOutExistingShares(
				this.externalResults.filter(result => !result.condition || result.condition(this)),
			)
			const allSuggestions = exactSuggestions.concat(suggestions).concat(externalResults)
			const nameCounts = allSuggestions.reduce((nameCounts, result) => {
				if (!result.displayName) {
					return nameCounts
				}
				if (!nameCounts[result.displayName]) {
					nameCounts[result.displayName] = 0
				}
				nameCounts[result.displayName]++
				return nameCounts
			}, {})
			this.suggestions = allSuggestions.map(item => {
				if (nameCounts[item.displayName] > 1 && !item.desc) {
					return {
						...item,
						desc: item.shareWithDisplayNameUnique + Math.random().toString(16).slice(2),
					}
				}
				return item
			})
			this.loading = false
		},
		debounceGetSuggestions: debounce(750, function(...args) {
			this.getSuggestions(...args)
		}),
		async getRecommendations() {
			this.loading = true
			let request = null
			try {
				request = await axios.get(generateOcsUrl('apps/files_sharing/api/v1/sharees_recommended'), {
					params: {
						format: 'json',
						itemType: this.fileInfo.type,
					},
				})
			} catch (error) {
				console.error('Error fetching recommendations', error)
				this.recommendations = []
				this.loading = false
				return
			}
			const externalResults = this.filterOutExistingShares(
				this.externalResults.filter(result => !result.condition || result.condition(this)),
			)
			const rawRecommendations = Object.values(request.data.ocs.data.exact).reduce((arr, elem) => arr.concat(elem), [])
			this.recommendations = this.filterOutExistingShares(rawRecommendations)
				.map(share => this.formatForMultiselect(share))
				.concat(externalResults)
			this.loading = false
		},
		filterOutExistingShares(shares) {
			const existingShareKeys = this.getExistingShareKeys()

			console.log('SharingInput DEBUG', {
				file: this.getCurrentItemKey(),
				shares: this.shares.map(share => ({
					type: this.getShareType(share),
					shareWith: this.getShareWith(share),
				})),
				linkShares: this.linkShares.map(share => ({
					type: this.getShareType(share),
					shareWith: this.getShareWith(share),
				})),
				existingShareKeys: [...existingShareKeys],
				candidates: shares.map(share => ({
					type: this.getShareType(share),
					shareWith: this.getShareWith(share),
				})),
			})

			const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
			return shares.reduce((arr, share) => {
				if (!share || typeof share !== 'object') {
					return arr
				}
				try {
					const shareType = this.getShareType(share)
					const shareWith = this.getShareWith(share)
					if (shareType === null || typeof shareWith !== 'string' || shareWith.trim() === '') {
						return arr
					}
					if (shareType === this.SHARE_TYPES.User) {
						if (shareWith === getCurrentUser().uid) {
							return arr
						}
						if (this.reshare && shareWith === this.reshare.owner) {
							return arr
						}
					}
					if (shareType === this.SHARE_TYPES.Email && !emailRegex.test(shareWith.trim())) {
						return arr
					}
					const key = this.getShareKey(shareType, shareWith)
					if (key !== '' && existingShareKeys.has(key)) {
						return arr
					}
					arr.push(share)
				} catch {
					return arr
				}
				return arr
			}, [])
		},
		shareTypeToIcon(type) {
			switch (type) {
				case this.SHARE_TYPES.Guest:
					return {
						icon: 'icon-user',
						iconTitle: t('files_sharing', 'Guest'),
					}
				case this.SHARE_TYPES.User:
					return {
						icon: 'icon-upload-to-cloud',
						iconTitle: t('nmcsharing', 'User'),
					}
				case this.SHARE_TYPES.RemoteGroup:
				case this.SHARE_TYPES.Group:
					return {
						icon: 'icon-group',
						iconTitle: t('files_sharing', 'Group'),
					}
				case this.SHARE_TYPES.Email:
					return {
						icon: 'icon-mail',
						iconTitle: t('files_sharing', 'Email'),
					}
				case this.SHARE_TYPES.Room:
					return {
						icon: 'icon-room',
						iconTitle: t('files_sharing', 'Talk conversation'),
					}
				case this.SHARE_TYPES.Deck:
					return {
						icon: 'icon-deck',
						iconTitle: t('files_sharing', 'Deck board'),
					}
				case this.SHARE_TYPES.ScienceMesh:
					return {
						icon: 'icon-sciencemesh',
						iconTitle: t('files_sharing', 'ScienceMesh'),
					}
				default:
					return {}
			}
		},
		formatForMultiselect(result) {
			let subtitle
			if (result.value.shareType === this.SHARE_TYPES.User && this.config.shouldAlwaysShowUnique) {
				subtitle = result.shareWithDisplayNameUnique ?? ''
			} else if ((result.value.shareType === this.SHARE_TYPES.Remote
					|| result.value.shareType === this.SHARE_TYPES.RemoteGroup)
				&& result.value.server) {
				subtitle = t('files_sharing', 'on {server}', { server: result.value.server })
			} else if (result.value.shareType === this.SHARE_TYPES.Email) {
				subtitle = result.value.shareWith
			} else {
				subtitle = result.shareWithDescription ?? ''
			}
			return {
				shareWith: result.value.shareWith,
				shareType: result.value.shareType,
				user: result.uuid || result.value.shareWith,
				isNoUser: result.value.shareType !== this.SHARE_TYPES.User,
				displayName: result.name || result.label,
				subtitle,
				shareWithDisplayNameUnique: result.shareWithDisplayNameUnique || '',
				...this.shareTypeToIcon(result.value.shareType),
			}
		},
	},
}
</script>

<style lang="scss">
.sharing-search {
	display: flex;
	flex-direction: column;
	margin-bottom: 1rem;

	label[for="sharing-search-input"] {
		margin-bottom: 0;
	}

	&__input.v-select.select {
		min-width: auto;
		width: 100%;
		margin: 0.75rem 0;

		input {
			opacity: 1;
		}

		&.vs--searching:not(.vs--open):not(.vs--loading) .vs__search {
			opacity: 1;
		}
	}

	.button-group {
		display: flex;
		justify-content: end;

		.button-send {
			padding: 0 1.5rem !important;
		}
	}
}

ul.vs__dropdown-menu {
	--vs-border-width: 1px;
	--vs-dropdown-option-padding: 1rem 1rem 1rem 0.5rem;
	padding: 0 !important;

	.vs__dropdown-option {
		border-radius: 0 !important;

		.avatardiv {
			display: none;
		}

		span.option {
			--height: 16px !important;
		}

		.icon {
			background-size: 24px;
			background-position: right;

			.icon-upload-to-cloud {
				background-image: var(--icon-upload-to-cloud-dark);
			}
		}
	}

	.vs__no-options {
		padding: 1rem 0.5rem;
		line-height: 1rem;
	}
}

.vs__dropdown-menu {
	span[lookup] {
		.avatardiv {
			background-image: var(--icon-search-white);
			background-repeat: no-repeat;
			background-position: center;
			background-color: var(--color-text-maxcontrast) !important;

			div {
				display: none;
			}
		}
	}
}
</style>
