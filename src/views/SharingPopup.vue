<template>
	<NcModal
		v-if="fileInfo"
		size="normal"
		:name="t('nmcsharing', 'Sharing')"
		:show.sync="modal"
		:has-next="false"
		:has-previous="false"
		:light-backdrop="true"
		@close="closeThisModal">
		<!-- error message -->
		<div v-if="error" class="emptycontent" :class="{ emptyContentWithSections: sections.length > 0 }">
			<div class="icon icon-error" />
			<h2>{{ error }}</h2>
		</div>

		<div v-if="!shareSent">
			<!-- shares content -->
			<div v-if="!loading" class="sharingPopup__content">
				<!-- share link details -->
				<template v-if="showShareLinkDetailsView">
					<SharingTabDetails
						:file-info="shareLinkDetailsData.fileInfo"
						:share="shareLinkDetailsData.share"
						:resharing-allowed-global="config.isResharingAllowed"
						@close-sharing-details="toggleShareLinkDetailsView"
						@save:share="addShare"
						@remove:share="removeShare" />
				</template>

				<div v-else>
					<h2 class="sharingPopup__header" style="margin-bottom: 0;">
						{{ t('nmcsharing', 'Send link via E-Mail') }}
					</h2>

					<span class="sharingPopup__fileinfo">
						{{ fileInfo.name }} ⸱ {{ size }}
					</span>

					<!-- shared with me information -->
					<SharingEntrySimple
						v-if="isSharedWithMe"
						v-bind="sharedWithMe"
						class="sharing-entry__reshare" />

					<!-- share details -->
					<template v-if="showShareDetailsView">
						<SharingPopupDetails
							:file-info="shareDetailsData.fileInfo"
							:share="shareDetailsData.share"
							:share-type="shareType"
							:resharing-allowed-global="config.isResharingAllowed"
							@close-sharing-details="toggleShareDetailsView"
							@save:share="saveShare" />
					</template>

					<!-- add new share input -->
					<SharingInput
						:can-reshare="canReshare"
						:file-info="fileInfo"
						:shares="shares"
						:link-shares="linkShares"
						:new-share="newShare"
						:reshare="reshare"
						:share-set="shareSet"
						:is-shared-with-me="isSharedWithMe"
						@add:share="addShare"
						@done:share="doneSharing"
						@open-sharing-details-all="toggleShareDetailsViewAll" />

					<div v-if="canReshare" class="sharingPopup__divider">
						<span class="sharingPopup__or">
							{{ t('nmcsharing', 'or') }}
						</span>
					</div>

					<!-- link shares list -->
					<SharingPopupLinkList
						v-if="canReshare"
						ref="linkShareList"
						:can-reshare="canReshare"
						:file-info="fileInfo"
						:shares="linkShares"
						@open-sharing-details="toggleShareLinkDetailsView"
						@link-share-created="linkShareCreated" />
				</div>
			</div>
		</div>

		<!-- share sent -->
		<div v-else>
			<div class="sharingPopup__success">
				<CheckCircleOutlineIcon :size="128" />
				<div class="message">
					{{ t('nmcsharing', 'Link to "{fileName}" was sent.', { fileName: fileInfo.name }) }}
				</div>
				<div class="recipients">
					{{ t('nmcsharing', 'To') }}: {{ recipients }}
				</div>
			</div>
		</div>
	</NcModal>
</template>

<!-- eslint-disable @nextcloud/no-deprecations -->
<script>
import axios from '@nextcloud/axios'
import { formatFileSize } from '@nextcloud/files'
import { generateOcsUrl } from '@nextcloud/router'
import { ShareType } from '@nextcloud/sharing'

import NcModal from '@nextcloud/vue/dist/Components/NcModal.js'
import CheckCircleOutlineIcon from 'vue-material-design-icons/CheckCircleOutline.vue'

import SharingEntrySimple from '../components/SharingEntrySimple.vue'
import SharingInput from '../components/SharingInput.vue'
import Share from '../models/Share.js'
import Config from '../services/ConfigService.js'
import { shareWithTitle } from '../utils/SharedWithMe.js'

import SharingPopupDetails from './SharingPopupDetails.vue'
import SharingPopupLinkList from './SharingPopupLinkList.vue'
import SharingTabDetails from './SharingTabDetails.vue'

export default {
	name: 'SharingPopup',

	components: {
		CheckCircleOutlineIcon,
		NcModal,
		SharingEntrySimple,
		SharingInput,
		SharingPopupDetails,
		SharingPopupLinkList,
		SharingTabDetails,
	},

	data() {
		return {
			config: new Config(),
			deleteEvent: null,
			error: '',
			expirationInterval: null,
			loading: true,
			modal: false,
			fileInfo: null,
			reshare: null,
			sharedWithMe: {},
			shares: [],
			linkShares: [],
			newShare: {},
			shareSet: false,
			sections: window.OCA?.Sharing?.ShareTabSections?.getSections?.() ?? [],
			showShareDetailsView: false,
			showShareLinkDetailsView: false,
			shareDetailsData: {},
			shareDetailsDataAll: [],
			shareLinkDetailsData: {},
			shareSent: false,
			newLinkShare: false,
			sharedWith: [],
		}
	},

	computed: {
		isSharedWithMe() {
			return Object.keys(this.sharedWithMe).length > 0
		},

		canReshare() {
			if (!this.fileInfo) {
				return false
			}

			return !!(this.fileInfo.permissions & OC.PERMISSION_SHARE)
				|| !!(this.reshare?.hasSharePermission && this.config.isResharingAllowed)
		},

		size() {
			if (!this.fileInfo) {
				return ''
			}

			const size = Number.parseInt(this.fileInfo.size, 10)

			if (Number.isNaN(size) || size < 0) {
				return this.t('files', 'Pending')
			}

			return formatFileSize(size, true)
		},

		recipients() {
			return this.sharedWith.join(', ')
		},

		shareType() {
			let isUser = false
			let isEmail = false

			for (const element of this.shareDetailsDataAll) {
				if (element?.share?.type === ShareType.User) {
					isUser = true
				} else if (element?.share?.type === ShareType.Email) {
					isEmail = true
				}

				if (isUser && isEmail) {
					return 'MIXED'
				}
			}

			if (isUser) {
				return 'USER'
			}

			return 'EMAIL'
		},
	},

	beforeDestroy() {
		clearInterval(this.expirationInterval)
	},

	methods: {
		/**
		 * Open the popup for the provided file.
		 *
		 * @param {object} fileInfo Legacy FileInfo object
		 * @return {Promise<boolean>}
		 */
		async open(fileInfo) {
			if (!fileInfo) {
				console.error('[nmcsharing] Cannot open SharingPopup without fileInfo')
				return false
			}

			this.fileInfo = fileInfo
			this.resetState()
			this.modal = true

			await this.getShares()

			return true
		},

		linkShareCreated() {
			this.newLinkShare = true
		},

		showThisModal() {
			this.modal = true
		},

		closeThisModal() {
			clearInterval(this.expirationInterval)
			this.modal = false
			this.$emit('close-popup')
		},

		/**
		 * Update current fileInfo and fetch new data.
		 *
		 * Kept for compatibility with callers that still use update().
		 *
		 * @param {object} fileInfo the current file FileInfo
		 * @return {Promise<void>}
		 */
		async update(fileInfo) {
			if (!fileInfo) {
				return
			}

			this.fileInfo = fileInfo
			this.resetState()
			await this.getShares()
		},

		/**
		 * Get existing shares.
		 */
		async getShares() {
			if (!this.fileInfo) {
				return
			}

			try {
				this.loading = true
				this.error = ''

				const shareUrl = generateOcsUrl('apps/files_sharing/api/v1/shares')
				const format = 'json'
				const path = `${this.fileInfo.path}/${this.fileInfo.name}`.replace(/\/+/g, '/')

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

				const [shares, sharedWithMe] = await Promise.all([
					fetchShares,
					fetchSharedWithMe,
				])

				this.processSharedWithMe(sharedWithMe)
				this.processShares(shares)
			} catch (error) {
				const message = error?.response?.data?.ocs?.meta?.message

				this.error = message || t(
					'files_sharing',
					'Unable to load the shares list',
				)

				console.error('[nmcsharing] Error loading the shares list', error)
			} finally {
				this.loading = false
			}
		},

		/**
		 * Reset the popup state.
		 */
		resetState() {
			clearInterval(this.expirationInterval)

			this.loading = true
			this.error = ''
			this.reshare = null
			this.sharedWithMe = {}
			this.shares = []
			this.linkShares = []
			this.newShare = {}
			this.shareSet = false
			this.showShareDetailsView = false
			this.showShareLinkDetailsView = false
			this.shareDetailsData = {}
			this.shareDetailsDataAll = []
			this.shareLinkDetailsData = {}
			this.shareSent = false
			this.newLinkShare = false
			this.sharedWith = []
		},

		/**
		 * Update sharedWithMe subtitle with the expiration time left.
		 *
		 * @param {Share} share shared-with-me Share object
		 */
		updateExpirationSubtitle(share) {
			// eslint-disable-next-line no-undef
			const expiration = moment(share.expireDate).unix()

			this.$set(this.sharedWithMe, 'subtitle', t(
				'files_sharing',
				'Expires {relativetime}',
				{
					relativetime: OC.Util.relativeModifiedDate(expiration * 1000),
				},
			))

			// eslint-disable-next-line no-undef
			if (moment().unix() > expiration) {
				clearInterval(this.expirationInterval)

				this.$set(
					this.sharedWithMe,
					'subtitle',
					t('files_sharing', 'this share just expired.'),
				)
			}
		},

		/**
		 * Process current shares.
		 *
		 * @param {object} response OCS response
		 */
		processShares({ data }) {
			const rawShares = data?.ocs?.data ?? []

			const shares = rawShares
				.map(share => new Share(share))
				.sort((a, b) => b.createdTime - a.createdTime)

			this.linkShares = shares.filter(share =>
				share.type === ShareType.Link
				|| share.type === ShareType.Email,
			)

			this.shares = shares.filter(share =>
				share.type !== ShareType.Link
				&& share.type !== ShareType.Email,
			)
		},

		/**
		 * Process shared-with-me data.
		 *
		 * @param {object} response OCS response
		 */
		processSharedWithMe({ data }) {
			const rawShare = data?.ocs?.data?.[0]

			if (rawShare) {
				const share = new Share(rawShare)
				const title = shareWithTitle(share)
				const displayName = share.ownerDisplayName
				const user = share.owner

				this.sharedWithMe = {
					displayName,
					title,
					user,
				}

				this.reshare = share

				if (this.reshare?.hasSharePermission === false) {
					this.sharedWithMe.reshare = t(
						'files_sharing',
						'Resharing is not allowed',
					)
				}

				// eslint-disable-next-line no-undef
				if (
					share.expireDate
					&& moment(share.expireDate).unix() > moment().unix()
				) {
					this.updateExpirationSubtitle(share)

					this.expirationInterval = setInterval(
						this.updateExpirationSubtitle,
						10000,
						share,
					)
				}
			} else if (
				this.fileInfo
				&& this.fileInfo.shareOwnerId !== undefined
				&& this.fileInfo.shareOwnerId !== OC.currentUser
			) {
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
		 * Save share details.
		 *
		 * @param {Share} share share to save
		 */
		saveShare(share) {
			this.shareDetailsData.share = share
			this.newShare = share
			this.shareSet = true
			this.showShareDetailsView = false
		},

		/**
		 * Add a new share.
		 *
		 * @param {Share} share share to add
		 * @param {Function} resolve callback
		 */
		addShare(share, resolve = () => {}) {
			if (
				share.type === ShareType.Link
				|| share.type === ShareType.Email
			) {
				if (share.type === ShareType.Email) {
					this.sharedWith.push(share.shareWith)
				}

				this.linkShares.unshift(share)
			} else {
				this.sharedWith.push(
					share.shareWithDisplayName || share.shareWith,
				)

				this.shares.unshift(share)
			}

			this.awaitForShare(share, resolve)
		},

		/**
		 * Remove a share.
		 *
		 * @param {Share} share share to remove
		 */
		removeShare(share) {
			const shareIndex = this.shares.findIndex(
				item => item.id === share.id,
			)

			if (shareIndex !== -1) {
				this.shares.splice(shareIndex, 1)
			}

			const linkShareIndex = this.linkShares.findIndex(
				item => item.id === share.id,
			)

			if (linkShareIndex !== -1) {
				this.linkShares.splice(linkShareIndex, 1)
			}
		},

		/**
		 * Wait for the newly created share component.
		 *
		 * @param {Share} share newly created share
		 * @param {Function} resolve callback
		 */
		awaitForShare(share, resolve) {
			let listComponent = this.$refs.shareList

			if (
				share.type === ShareType.Link
				|| share.type === ShareType.Email
			) {
				listComponent = this.$refs.linkShareList
			}

			if (!listComponent) {
				return
			}

			this.$nextTick(() => {
				const newShare = listComponent.$children.find(
					component => component.share === share,
				)

				if (newShare) {
					resolve(newShare)
				}
			})
		},

		doneSharing() {
			this.shareSent = true
		},

		toggleShareDetailsView() {
			this.showShareDetailsView = !this.showShareDetailsView
		},

		toggleShareLinkDetailsView(eventData) {
			if (eventData) {
				this.shareLinkDetailsData = eventData
			}

			this.showShareLinkDetailsView = !this.showShareLinkDetailsView
		},

		toggleShareDetailsViewAll(eventData) {
			if (eventData) {
				if (!this.shareSet) {
					this.shareDetailsData = eventData[0]
				}

				this.shareDetailsDataAll = eventData
			}

			this.showShareDetailsView = !this.showShareDetailsView
		},

		formatFileSize,
	},
}
</script>

<style scoped lang="scss">
.emptyContentWithSections {
	margin: 1rem auto;
}

.sharingPopup__header {
	line-height: initial;
}

.sharingPopup {
	&__info {
		display: block;
		margin-bottom: 1rem;
	}

	&__additionalContent {
		margin: 3rem 0;
	}

	&__fileinfo {
		margin: 1rem 0;
		font-size: 14px;
	}

	&__divider {
		margin-bottom: 1rem;
		border-bottom: 1px solid var(--color-border);
		text-align: center;
	}

	&__or {
		position: relative;
		bottom: -0.75rem;
		padding: 0.75rem;
		background-color: var(--color-main-background);
		font-size: 14px;
	}
}
</style>
