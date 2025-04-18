<!--
  - @copyright Copyright (c) 2019 John Molakvoæ <skjnldsv@protonmail.com>
  -
  - @author John Molakvoæ <skjnldsv@protonmail.com>
  -
  - @license GNU AGPL version 3 or any later version
  -
  - This program is free software: you can redistribute it and/or modify
  - it under the terms of the GNU Affero General Public License as
  - published by the Free Software Foundation, either version 3 of the
  - License, or (at your option) any later version.
  -
  - This program is distributed in the hope that it will be useful,
  - but WITHOUT ANY WARRANTY; without even the implied warranty of
  - MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  - GNU Affero General Public License for more details.
  -
  - You should have received a copy of the GNU Affero General Public License
  - along with this program. If not, see <http://www.gnu.org/licenses/>.
  -
  -->

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
import { generateOcsUrl } from '@nextcloud/router'
import { getCurrentUser } from '@nextcloud/auth'
import axios from '@nextcloud/axios'
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
			value: null,
			fallbackShare: { permissions: 1 },
		}
	},

	computed: {
		/**
		 * Implement ShareSearch
		 * allows external appas to inject new
		 * results into the autocomplete dropdown
		 * Used for the guests app
		 *
		 * @return {Array}
		 */
		externalResults() {
			return this.ShareSearch.results
		},
		inputPlaceholder() {
			const allowRemoteSharing = this.config.isRemoteShareAllowed

			if (!this.canReshare) {
				return t('files_sharing', 'Resharing is not allowed')
			}
			// We can always search with email addresses for users too
			if (!allowRemoteSharing) {
				return t('files_sharing', 'Name or email …')
			}

			return t('nmcsharing', 'Name, email')
		},

		isValidValue() {
			if (this.value) {
				return this.value.length > 0
			}
			return false
		},

		isValidQuery() {
			return this.query && this.query.trim() !== '' && this.query.length > this.config.minSearchStringLength
		},

		options() {
			if (this.isValidQuery) {
				return this.suggestions
			}
			return this.recommendations
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

		async sendSharing() {
			const promises = []

			let thisShare = this.fallbackShare

			if (this.shareSet) {
				thisShare = this.newShare
			}

			for (const thisValue of this.value) {
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
				}

				promises.push(
					this.addShare(incomingShare, this.fileInfo, this.config)
						.then(newShare => {
							this.$emit('add:share', newShare) // Emit nach Abschluss
						})
						.catch(error => {
							console.error('Error adding share:', error) // Fehlerbehandlung
						}),
				)
			}

			await Promise.all(promises) // Warte auf alle Promises

			this.$emit('done:share') // Emit nach Abschluss
		},

		/**
		 * Process the new share request
		 *
		 * @param {object} value the multiselect option
		 * @param {object} fileInfo file data
		 * @param {Config} config instance configs
		 */
		async addShare(value, fileInfo, config) {
			// Clear the displayed selection
			this.value = null

			// handle externalResults from OCA.Sharing.ShareSearch
			if (value.handler) {
				const share = await value.handler(this)
				this.$emit('add:share', new Share(share))
				return true
			}

			// this.loading = true // Are we adding loaders the new share flow?
			// console.debug('Adding a new share from the input for', value)
			try {
				const path = (fileInfo.path + '/' + fileInfo.name).replace('//', '/')
				const share = await this.createShare({
					path,
					shareType: value.shareType,
					shareWith: value.shareWith,
					permissions: value.permissions,
					attributes: JSON.stringify(fileInfo.shareAttributes),
					...(value.note ? { note: value.note } : {}),
					...(value.password ? { password: value.password } : {}),
					...(value.expireDate ? { expireDate: value.expireDate } : {}),
					...(value.label ? { label: value.label } : {}),
					...(value.hideDownload ? { hideDownload: value.hideDownload ? 1 : 0 } : {}),
				})
				return share
			} catch (error) {
				console.error('Error while adding new share', error)
			} finally {
				// this.loading = false // No loader here yet
			}
		},

		async asyncFind(query) {
			// save current query to check if we display
			// recommendations or search results
			this.query = query.trim()
			if (this.isValidQuery) {
				// start loading now to have proper ux feedback
				// during the debounce
				this.loading = true
				await this.debounceGetSuggestions(query)
			}
		},

		/**
		 * Get suggestions
		 *
		 * @param {string} search the search query
		 * @param {boolean} [lookup] search on lookup server
		 */
		async getSuggestions(search, lookup = false) {
			this.loading = true

			if (OC.getCapabilities().files_sharing.sharee.query_lookup_default === true) {
				lookup = true
			}

			const shareType = [
				this.SHARE_TYPES.SHARE_TYPE_USER,
			]

			if (OC.getCapabilities().files_sharing.public.enabled === true) {
				shareType.push(this.SHARE_TYPES.SHARE_TYPE_EMAIL)
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
				return
			}

			const data = request.data.ocs.data
			const exact = request.data.ocs.data.exact
			data.exact = [] // removing exact from general results

			// flatten array of arrays
			const rawExactSuggestions = Object.values(exact).reduce((arr, elem) => arr.concat(elem), [])
			const rawSuggestions = Object.values(data).reduce((arr, elem) => arr.concat(elem), [])

			// remove invalid data and format to user-select layout
			const exactSuggestions = this.filterOutExistingShares(rawExactSuggestions)
				.map(share => this.formatForMultiselect(share))
				// sort by type so we can get user&groups first...
				.sort((a, b) => a.shareType - b.shareType)
			const suggestions = this.filterOutExistingShares(rawSuggestions)
				.map(share => this.formatForMultiselect(share))
				// sort by type so we can get user&groups first...
				.sort((a, b) => a.shareType - b.shareType)

			// lookup clickable entry
			// show if enabled and not already requested
			/*
			const lookupEntry = []
			if (data.lookupEnabled && !lookup) {
				lookupEntry.push({
					id: 'global-lookup',
					isNoUser: true,
					displayName: t('files_sharing', 'Search globally'),
					lookup: true,
				})
			}
			*/

			// if there is a condition specified, filter it
			const externalResults = this.externalResults.filter(result => !result.condition || result.condition(this))

			const allSuggestions = exactSuggestions.concat(suggestions).concat(externalResults)

			// Count occurrences of display names in order to provide a distinguishable description if needed
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
				// Make sure that items with duplicate displayName get the shareWith applied as a description
				if (nameCounts[item.displayName] > 1 && !item.desc) {
					return { ...item, desc: item.shareWithDisplayNameUnique + Math.random().toString(16).slice(2) }
				}
				return item
			})

			this.loading = false
		},

		/**
		 * Debounce getSuggestions
		 *
		 * @param {...*} args the arguments
		 */
		debounceGetSuggestions: debounce(750, function(...args) {
			this.getSuggestions(...args)
		}),

		/**
		 * Get the sharing recommendations
		 */
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
				return
			}

			// Add external results from the OCA.Sharing.ShareSearch api
			const externalResults = this.externalResults.filter(result => !result.condition || result.condition(this))

			// flatten array of arrays
			const rawRecommendations = Object.values(request.data.ocs.data.exact)
				.reduce((arr, elem) => arr.concat(elem), [])

			// remove invalid data and format to user-select layout
			this.recommendations = this.filterOutExistingShares(rawRecommendations)
				.map(share => this.formatForMultiselect(share))
				.concat(externalResults)

			this.loading = false
		},

		/**
		 * Filter out existing shares from
		 * the provided shares search results
		 *
		 * @param {object[]} shares the array of shares object
		 * @return {object[]}
		 */
		 filterOutExistingShares(shares) {
			return shares.reduce((arr, share) => {
				// only check proper objects
				if (typeof share !== 'object') {
					return arr
				}
				try {
					if (share.value.shareType === this.SHARE_TYPES.SHARE_TYPE_USER) {
						// filter out current user
						if (share.value.shareWith === getCurrentUser().uid) {
							return arr
						}

						// filter out the owner of the share
						if (this.reshare && share.value.shareWith === this.reshare.owner) {
							return arr
						}
					}

					// filter out existing mail shares and invalid emails
					if (share.value.shareType === this.SHARE_TYPES.SHARE_TYPE_EMAIL) {
						const emails = this.linkShares.map(elem => elem.shareWith)
						const emailRegex = /\S+@\S+\.\S+/
						if (emails.indexOf(share.value.shareWith.trim()) !== -1 || !emailRegex.test(share.value.shareWith)) {
							return arr
						}
					} else { // filter out existing shares
						// creating an object of uid => type
						const sharesObj = this.shares.reduce((obj, elem) => {
							obj[elem.shareWith] = elem.type
							return obj
						}, {})

						// if shareWith is the same and the share type too, ignore it
						const key = share.value.shareWith.trim()
						if (key in sharesObj
							&& sharesObj[key] === share.value.shareType) {
							return arr
						}
					}

					// ALL GOOD
					// let's add the suggestion
					arr.push(share)
				} catch {
					return arr
				}
				return arr
			}, [])
		},

		/**
		 * Get the icon based on the share type
		 *
		 * @param {number} type the share type
		 * @return {string} the icon class
		 */
		shareTypeToIcon(type) {
			switch (type) {
			case this.SHARE_TYPES.SHARE_TYPE_GUEST:
				// default is a user, other icons are here to differentiate
				// themselves from it, so let's not display the user icon
				// case this.SHARE_TYPES.SHARE_TYPE_REMOTE:
				// case this.SHARE_TYPES.SHARE_TYPE_USER:
				return {
					icon: 'icon-user',
					iconTitle: t('files_sharing', 'Guest'),
				}
			case this.SHARE_TYPES.SHARE_TYPE_USER:
				return {
					icon: 'icon-upload-to-cloud',
					iconTitle: t('nmcsharing', 'User'),
				}
			case this.SHARE_TYPES.SHARE_TYPE_REMOTE_GROUP:
			case this.SHARE_TYPES.SHARE_TYPE_GROUP:
				return {
					icon: 'icon-group',
					iconTitle: t('files_sharing', 'Group'),
				}
			case this.SHARE_TYPES.SHARE_TYPE_EMAIL:
				return {
					icon: 'icon-mail',
					iconTitle: t('files_sharing', 'Email'),
				}
			case this.SHARE_TYPES.SHARE_TYPE_CIRCLE:
				return {
					icon: 'icon-circle',
					iconTitle: t('files_sharing', 'Circle'),
				}
			case this.SHARE_TYPES.SHARE_TYPE_ROOM:
				return {
					icon: 'icon-room',
					iconTitle: t('files_sharing', 'Talk conversation'),
				}
			case this.SHARE_TYPES.SHARE_TYPE_DECK:
				return {
					icon: 'icon-deck',
					iconTitle: t('files_sharing', 'Deck board'),
				}
			case this.SHARE_TYPES.SHARE_TYPE_SCIENCEMESH:
				return {
					icon: 'icon-sciencemesh',
					iconTitle: t('files_sharing', 'ScienceMesh'),
				}
			default:
				return {}
			}
		},

		/**
		 * Format shares for the multiselect options
		 *
		 * @param {object} result select entry item
		 * @return {object}
		 */
		formatForMultiselect(result) {
			let subtitle
			if (result.value.shareType === this.SHARE_TYPES.SHARE_TYPE_USER && this.config.shouldAlwaysShowUnique) {
				subtitle = result.shareWithDisplayNameUnique ?? ''
			} else if ((result.value.shareType === this.SHARE_TYPES.SHARE_TYPE_REMOTE
					|| result.value.shareType === this.SHARE_TYPES.SHARE_TYPE_REMOTE_GROUP
			) && result.value.server) {
				subtitle = t('files_sharing', 'on {server}', { server: result.value.server })
			} else if (result.value.shareType === this.SHARE_TYPES.SHARE_TYPE_EMAIL) {
				subtitle = result.value.shareWith
			} else {
				subtitle = result.shareWithDescription ?? ''
			}

			return {
				shareWith: result.value.shareWith,
				shareType: result.value.shareType,
				user: result.uuid || result.value.shareWith,
				isNoUser: result.value.shareType !== this.SHARE_TYPES.SHARE_TYPE_USER,
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
};

ul.vs__dropdown-menu {
	--vs-border-width: 1px;
	--vs-dropdown-option-padding: 1rem 1rem 1rem 0.5rem;
	padding: 0px !important;

	.vs__dropdown-option {
		border-radius: 0px !important;

		// remove user avatar
		.avatardiv {
			display: none;
		}

		// set dropdown option height
		span.option {
			--height: 16px !important;
		}

		// add a new icon definition
		.icon {
			background-size: 24px;
			background-position: right;

			.icon-upload-to-cloud {
				background-image: var(--icon-upload-to-cloud-dark);
			}
		}

	}
	// No elements found
	.vs__no-options {
		padding: 1rem 0.5rem;
		line-height: 1rem;
	}
}

.vs__dropdown-menu {
	// properly style the lookup entry
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
