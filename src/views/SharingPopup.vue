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
	<div :class="{ 'icon-loading': loading }">
		<NcModal v-if="true" size="small">
			<!-- error message -->
			<div v-if="error" class="emptycontent" :class="{ emptyContentWithSections: sections.length > 0 }">
				<div class="icon icon-error" />
				<h2>{{ error }}</h2>
			</div>

			<!-- shares content -->
			<div v-if="!showSharingDetailsView" class="sharingTab__content" style="padding: 10px;">
				<h2 class="sharingTab__header" style="margin-bottom: 0;">
					{{ t('nmcsharing', 'Send link by E-Mail') }}
				</h2>
				<!-- <label v-if="canReshare" for="sharing-search-input"> -->
				<!-- <p v-if="canReshare" class="sharingTab__info"> not needed here
					  {{ t('nmcsharing', 'You did not share this file/ folder yet. You can share the file/ folder to others') }}
					  {{ isSharedWithMe ? `${t('nmcsharing', 'Resharing is allowed')}. ` : '' }}
				  </p> -->

				<span>{{ fileInfo.name }} . {{ size }}</span>

				<!-- shared with me information -->
				<SharingEntrySimple v-if="isSharedWithMe" v-bind="sharedWithMe" class="sharing-entry__reshare" />

				<template v-if="!loading">
					<div class="sharing-detail-link">
						<EyeIcon :size="15" />
						<a class="target-message">{{ t('nmcsharing', 'Edit link permissions') }}</a>
						<ChevronRight :size="15" :fill-color="'var(--color-primary-element)'" />
					</div>

					<!-- display multiple email share recipients -->
					<SharingInput :can-reshare="canReshare"
						:file-info="fileInfo"
						:link-shares="linkShares"
						:reshare="reshare"
						:shares="shares"
						:filtered-email-arr="filteredEmailArr"
						:is-shared-with-me="isSharedWithMe"
						@open-sharing-details="toggleShareDetailsView" />

					<AddAllEmailsButton :file-info="fileInfo"
						:filtered-email-arr="filteredEmailArr"
						:on-submit="addEmailShare" />
				</template>
				<!-- add new share input -->
				<template v-if="true">
					<textarea class="sharingTabDetailsView__advanced" placeholder="Add Personal Message" />
				</template>
				<!-- link shares list -->
				<SharingLinkList v-if="!loading"
					ref="linkShareList"
					:can-reshare="canReshare"
					:can-edit="canEdit"
					:file-info="fileInfo"
					:shares="linkShares"
					@open-sharing-details="toggleShareDetailsView" />

				<!-- other shares list -->
				<SharingList v-if="!loading && canReshare"
					ref="shareList" 
					:shares="shares" 
					:file-info="fileInfo"
					@open-sharing-details="toggleShareDetailsView" />
			</div>

			<!-- share details -->
			<div v-else>
				<SharingDetailsTab :file-info="shareDetailsData.fileInfo"
					:share="shareDetailsData.share"
					:resharing-allowed-global="config.isResharingAllowed"
					@close-sharing-details="toggleShareDetailsView"
					@add:share="addShare"
					@remove:share="removeShare"
					@update:share="updateEmailShares" />
			</div>

			<!-- additional entries, use it with cautious -->
			<div v-for="(section, index) in sections"
				:ref="'section-' + index"
				:key="index"
				class="sharingTab__additionalContent">
				<component :is="section($refs['section-' + index], fileInfo)" :file-info="fileInfo" />
			</div>
		</NcModal>
	</div>
</template>
<!-- eslint-disable @nextcloud/no-deprecations -->
<script>
import { generateOcsUrl } from '@nextcloud/router'
import axios from '@nextcloud/axios'

import Config from '../services/ConfigService.js'
import { shareWithTitle } from '../utils/SharedWithMe.js'
import Share from '../models/Share.js'
import ShareTypes from '../mixins/ShareTypes.js'
import SharingEntrySimple from '../components/SharingEntrySimple.vue'
import SharingInput from '../components/SharingInput.vue'
import SharingLinkList from './SharingLinkList.vue'
import SharingList from './SharingList.vue'
import SharingDetailsTab from './SharingDetailsTab.vue'
import AddAllEmailsButton from '../components/AddAllEmailsButton.vue'
import NcModal from '@nextcloud/vue/dist/Components/NcModal.js'
import { formatFileSize } from '@nextcloud/files'
import EyeIcon from 'vue-material-design-icons/EyeCircleOutline.vue'
import ChevronRight from 'vue-material-design-icons/ChevronRight.vue'

export default {
	name: 'SharingPopup',

	components: {
		SharingEntrySimple,
		SharingInput,
		SharingLinkList,
		SharingList,
		SharingDetailsTab,
		AddAllEmailsButton,
		NcModal,
		EyeIcon,
		ChevronRight
	},

	mixins: [ShareTypes],

	data() {
		return {
			config: new Config(),
			deleteEvent: null,
			error: '',
			expirationInterval: null,
			loading: true,

			fileInfo: null,

			// reshare Share object
			reshare: null,
			edit: null,
			sharedWithMe: {},
			shares: [],
			linkShares: [],

			sections: OCA.Sharing.ShareTabSections.getSections(),
			// projectsEnabled: loadState('core', 'projects_enabled', false),
			showSharingDetailsView: false,
			shareDetailsData: {},
			emailSharesArray: [],
			writeNoteToRecipientIsChecked: false,
		}
	},

	computed: {
		console: () => console,
		window: () => window,
		/**
		 * Is this share shared with me?
		 *
		 * @return {boolean}
		 */
		isSharedWithMe() {
			return Object.keys(this.sharedWithMe).length > 0
		},

		canReshare() {
			return !!(this.fileInfo.permissions & OC.PERMISSION_SHARE)
				|| !!(this.reshare && this.reshare.hasSharePermission && this.config.isResharingAllowed)
		},

		// Check if file is Read Only or can be Updated / Edited
		canEdit() {
			return !!(this.fileInfo.permissions & OC.PERMISSION_UPDATE)
				|| !!(this.edit && this.edit.hasUpdatePermission)
		},
		// remove duplicate email addresses
		filteredEmailArr() {
			return this.emailSharesArray.filter((value, index, self) =>
				self.findIndex(v => v.shareWith === value.shareWith) === index
			)
		},
		size() {
			const size = parseInt(this.fileInfo.size, 10)
			if (typeof size !== 'number' || isNaN(size) || size < 0) {
				return this.t('files', 'Pending')
			}
			return formatFileSize(size, true)
		},
	},

	methods: {
		/**
		 * Update current fileInfo and fetch new data
		 *
		 * @param {object} fileInfo the current file FileInfo
		 */
		async update(fileInfo) {
			this.fileInfo = fileInfo
			this.resetState()
			this.getShares()
		},
		/**
		 * Process single new Email share request
		 *
		 * @param {object} value the multiselect option
		 */
		async addEmailShare(emailObj) {				// Clear the displayed selection
			// this.value = null

			// handle externalResults from OCA.Sharing.ShareSearch
			// if (value.handler) {
			// 	const share = await value.handler(this)
			// 	this.addShare(new Share(share));
			// 	return true
			// }

			// this.loading = true // Are we adding loaders the new share flow?
			// console.debug('Adding a new share from the input for', value)
			try {
				const share = await this.createShare(emailObj.path, emailObj.shareType, emailObj.shareWith, emailObj.permissions, emailObj.attributes);
				return share
			} catch (error) {
				console.error('Error while adding new share', error)
			} finally {
				// this.loading = false // No loader here yet
			}
		},
		async removeShare() {
			await this.onDelete()
			this.$emit('close-sharing-details')
		},

		async updateEmailShares(emailSharesElement) {
			this.emailSharesArray.push(emailSharesElement)
		},

		/**
		 * Get the existing shares infos
		 */
		async getShares() {
			try {
				this.loading = true

				// init params
				const shareUrl = generateOcsUrl('apps/files_sharing/api/v1/shares')
				const format = 'json'
				// TODO: replace with proper getFUllpath implementation of our own FileInfo model
				const path = (this.fileInfo.path + '/' + this.fileInfo.name).replace('//', '/')

				// fetch shares
				const fetchShares = axios.get(shareUrl, {
					params: {
						format,
						path,
						reshares: true,
					},
				})
				const fetchSharedWithMe = axios.get(shareUrl, {
					params: {
						format,
						path,
						shared_with_me: true,
					},
				})

				// wait for data
				const [shares, sharedWithMe] = await Promise.all([fetchShares, fetchSharedWithMe])
				this.loading = false

				// process results
				this.processSharedWithMe(sharedWithMe)
				this.processShares(shares)
			} catch (error) {
				if (error.response.data?.ocs?.meta?.message) {
					this.error = error.response.data.ocs.meta.message
				} else {
					this.error = t('files_sharing', 'Unable to load the shares list')
				}
				this.loading = false
				console.error('Error loading the shares list', error)
			}
		},

		/**
		 * Reset the current view to its default state
		 */
		resetState() {
			clearInterval(this.expirationInterval)
			this.loading = true
			this.error = ''
			this.sharedWithMe = {}
			this.shares = []
			this.linkShares = []
			this.showSharingDetailsView = false
			this.shareDetailsData = {},
				this.emailSharesArray = []
		},

		/**
		 * Update sharedWithMe.subtitle with the appropriate
		 * expiration time left
		 *
		 * @param {Share} share the sharedWith Share object
		 */
		updateExpirationSubtitle(share) {
			// eslint-disable-next-line no-undef
			const expiration = moment(share.expireDate).unix()
			this.$set(this.sharedWithMe, 'subtitle', t('files_sharing', 'Expires {relativetime}', {
				relativetime: OC.Util.relativeModifiedDate(expiration * 1000),
			}))

			// share have expired
			// eslint-disable-next-line no-undef
			if (moment().unix() > expiration) {
				clearInterval(this.expirationInterval)
				// TODO: clear ui if share is expired
				this.$set(this.sharedWithMe, 'subtitle', t('files_sharing', 'this share just expired.'))
			}
		},

		/**
		 * Process the current shares data
		 * and init shares[]
		 *
		 * @param {object} share the share ocs api request data
		 * @param {object} share.data the request data
		 */
		processShares({ data }) {
			if (data.ocs && data.ocs.data && data.ocs.data.length > 0) {
				// create Share objects and sort by newest
				const shares = data.ocs.data
					.map(share => new Share(share))
					.sort((a, b) => b.createdTime - a.createdTime)

				this.linkShares = shares.filter(share => share.type === this.SHARE_TYPES.SHARE_TYPE_LINK || share.type === this.SHARE_TYPES.SHARE_TYPE_EMAIL)
				this.shares = shares.filter(share => share.type !== this.SHARE_TYPES.SHARE_TYPE_LINK && share.type !== this.SHARE_TYPES.SHARE_TYPE_EMAIL)

				console.debug('Processed', this.linkShares.length, 'link share(s)')
				console.debug('Processed', this.shares.length, 'share(s)')
			}
		},

		/**
		 * Process the sharedWithMe share data
		 * and init sharedWithMe
		 *
		 * @param {object} share the share ocs api request data
		 * @param {object} share.data the request data
		 */
		processSharedWithMe({ data }) {
			if (data.ocs && data.ocs.data && data.ocs.data[0]) {
				const share = new Share(data)
				const title = shareWithTitle(share)
				const displayName = share.ownerDisplayName
				const user = share.owner

				this.sharedWithMe = {
					displayName,
					title,
					user,
				}
				this.reshare = share

				// If we have an expiration date, use it as subtitle
				// Refresh the status every 10s and clear if expired
				// eslint-disable-next-line no-undef
				if (share.expireDate && moment(share.expireDate).unix() > moment().unix()) {
					// first update
					this.updateExpirationSubtitle(share)
					// interval update
					this.expirationInterval = setInterval(this.updateExpirationSubtitle, 10000, share)
				}
			} else if (this.fileInfo && this.fileInfo.shareOwnerId !== undefined ? this.fileInfo.shareOwnerId !== OC.currentUser : false) {
				// Fallback to compare owner and current user.
				this.sharedWithMe = {
					displayName: this.fileInfo.shareOwner,
					title: t(
						'files_sharing',
						'Shared with you by {owner}',
						{ owner: this.fileInfo.shareOwner },
						undefined,
						{ escape: false },
					),
					user: this.fileInfo.shareOwnerId,
				}
			}
		},

		/**
		 * Add a new share into the shares list
		 * and return the newly created share component
		 *
		 * @param {Share} share the share to add to the array
		 * @param {Function} [resolve] a function to run after the share is added and its component initialized
		 */
		addShare(share, resolve = () => { }) {
			// only catching share type MAIL as link shares are added differently
			// meaning: not from the ShareInput
			// For email addresses in emailSharesArray
			if (share.type === this.SHARE_TYPES.SHARE_TYPE_EMAIL) {
				this.linkShares.unshift(share)
			} else {
				this.shares.unshift(share)
			}
			this.awaitForShare(share, resolve)
		},
		/**
		 * Remove a share from the shares list
		 *
		 * @param {Share} share the share to remove
		 */
		removeShare(share) {
			const index = this.shares.findIndex(item => item.id === share.id)
			// eslint-disable-next-line vue/no-mutating-props
			this.shares.splice(index, 1)
		},
		/**
		 * Await for next tick and render after the list updated
		 * Then resolve with the matched vue component of the
		 * provided share object
		 *
		 * @param {Share} share newly created share
		 * @param {Function} resolve a function to execute after
		 */
		awaitForShare(share, resolve) {
			let listComponent = this.$refs.shareList
			// Only mail shares comes from the input, link shares
			// are managed internally in the SharingLinkList component
			if (share.type === this.SHARE_TYPES.SHARE_TYPE_EMAIL) {
				listComponent = this.$refs.linkShareList
			}

			if (!listComponent) return
			this.$nextTick(() => {
				const newShare = listComponent.$children.find(component => component.share === share)
				if (newShare) {
					resolve(newShare)
				}
			})
		},
		toggleShareDetailsView(eventData) {
			if (eventData) {
				this.shareDetailsData = eventData;
			}
			this.showSharingDetailsView = !this.showSharingDetailsView
		},
		formatFileSize
	},
}
</script>

<style scoped lang="scss">
.emptyContentWithSections {
	margin: 1rem auto;
}

.sharingTab__header {
	line-height: initial;
}

.sharingTab {
	&__content {
		padding: 0px;
	}

	&__info {
		display: block;
		margin-bottom: 1rem
	}

	&__additionalContent {
		margin: 44px 0;
	}
}

.sharing-detail-link {
	display: flex;
	flex-direction: row;
	align-items: center;
	font-size: 14px;
	gap: 2px;
	color: var(--color-primary-element);
	margin: 10px 0 0;

	.target-message {
		color: var(--color-primary-element);
	}
}
</style>
