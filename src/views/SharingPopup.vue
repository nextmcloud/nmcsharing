<template>
	<NcModal size="normal"
		:show.sync="modal"
		:has-next="false"
		:has-previous="false"
		@close="closeThisModal">
		<!-- error message -->
		<div v-if="error" class="emptycontent" :class="{ emptyContentWithSections: sections.length > 0 }">
			<div class="icon icon-error" />
			<h2>{{ error }}</h2>
		</div>

		<div v-if="!shareSent">
			<!-- shares content -->
			<div class="sharingPopup__content" v-if="!loading">
				<h2 class="sharingPopup__header" style="margin-bottom: 0;">
					{{ t('nmcsharing', 'Send link via E-Mail') }}
				</h2>

				<span class="sharingPopup__fileinfo">{{ fileInfo.name }} ⸱ {{ size }}</span>

				<!-- shared with me information -->
				<SharingEntrySimple v-if="isSharedWithMe" v-bind="sharedWithMe" class="sharing-entry__reshare" />

				<!-- share details -->
				<template v-if="showSharingDetailsView">
					<SharingInputDetailsTab :file-info="shareDetailsData.fileInfo"
						:share="shareDetailsData.share"
						:resharing-allowed-global="config.isResharingAllowed"
						@close-sharing-details="toggleShareDetailsView"
						@save:share="saveShare" />
				</template>

				<!-- add new share input -->
				<SharingInput :can-reshare="canReshare"
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

				<div class="sharingPopup__divider">
					<span class="sharingPopup__or">{{ t('nmcsharing', 'Or') }}</span>
				</div>

				<!-- link shares list -->
				<SharingLinkListPopup ref="linkShareList"
					:can-reshare="canReshare"
					:file-info="fileInfo"
					:shares="linkShares"
					@open-sharing-details="toggleShareDetailsView"
					@link-share-created="linkShareCreated" />
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
import { formatFileSize } from '@nextcloud/files'
import { generateOcsUrl } from '@nextcloud/router'
import axios from '@nextcloud/axios'
import NcModal from '@nextcloud/vue/dist/Components/NcModal.js'
import CheckCircleOutlineIcon from 'vue-material-design-icons/CheckCircleOutline.vue'

import Config from '../services/ConfigService.js'
import { shareWithTitle } from '../utils/SharedWithMe.js'
import Share from '../models/Share.js'
import ShareTypes from '../mixins/ShareTypes.js'
import SharingEntrySimple from '../components/SharingEntrySimple.vue'
import SharingInput from '../components/SharingInput.vue'
import SharingInputDetailsTab from './SharingInputDetailsTab.vue'
import SharingLinkListPopup from './SharingLinkListPopup.vue'

export default {
	name: 'SharingPopup',

	components: {
		NcModal,
		CheckCircleOutlineIcon,
		SharingEntrySimple,
		SharingInput,
		SharingInputDetailsTab,
		SharingLinkListPopup,
	},

	mixins: [ShareTypes],

	data() {
		return {
			config: new Config(),
			deleteEvent: null,
			error: '',
			expirationInterval: null,
			loading: true,
			modal: false,
			fileInfo: null,
			// reshare Share object
			reshare: null,
			sharedWithMe: {},
			shares: [],
			linkShares: [],
			newShare: {},
			shareSet: false,
			sections: OCA.Sharing.ShareTabSections.getSections(),
			// projectsEnabled: loadState('core', 'projects_enabled', false),
			showSharingDetailsView: false,
			shareDetailsData: {},
			shareSent: false,
			newLinkShare: false,
			sharedWith: [],
		}
	},

	computed: {
		/**
		 * Is this share shared with me?
		 *
		 * @return {boolean}
		 */
		isSharedWithMe() {
			if (this.$parent.getActiveTab() === 'sharing') {
				this.showThisModal()
			}
			return Object.keys(this.sharedWithMe).length > 0
		},

		canReshare() {
			return !!(this.fileInfo.permissions & OC.PERMISSION_SHARE)
                || !!(this.reshare && this.reshare.hasSharePermission && this.config.isResharingAllowed)
		},

		size() {
			const size = parseInt(this.fileInfo.size, 10)
			if (typeof size !== 'number' || isNaN(size) || size < 0) {
				return this.t('files', 'Pending')
			}
			return formatFileSize(size, true)
		},
		recipients() {
			return this.sharedWith.join(', ')
		},
	},

	methods: {
		linkShareCreated() {
			this.newLinkShare = true
		},

		showThisModal() {
			this.modal = true
		},

		closeThisModal() {
			this.modal = false

			if (this.newLinkShare || this.shareSent) {
				this.openSharingManage()
			} else {
				window.OCA.Files.Sidebar.close()
				window.OCA.Files.Sidebar.setFullScreenMode(false)
			}
		},

		async openSharingManage() {
			try {
				const fileInfoPathName = this.fileInfo.path + '/' + this.fileInfo.name

				window.OCA.Files.Sidebar.close()
				window.OCA.Files.Sidebar.setActiveTab('sharing')
				window.OCA.Files.Sidebar.setActiveTab('sharing-manage')
				window.OCA.Files.Sidebar.setFullScreenMode(false)

				// TODO: migrate Sidebar to use a Node instead
				window.OCA.Files.Sidebar.open(fileInfoPathName)

				return null
			} catch (error) {
				return false
			}
		},

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
			this.modal = false
			this.error = ''
			this.sharedWithMe = {}
			this.shares = []
			this.linkShares = []
			this.newShare = {}
			this.shareSet = false
			this.showSharingDetailsView = false
			this.shareDetailsData = {}
			this.shareSent = false
			this.newLinkShare = false
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

				// console.debug('Processed', this.linkShares.length, 'link share(s)')
				// console.debug('Processed', this.shares.length, 'share(s)')
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
		 * and the share details data
		 *
		 * @param {Share} share the share to add to the array
		 */
		saveShare(share) {
			this.shareDetailsData.share = share
			this.newShare = share
			this.shareSet = true
			this.showSharingDetailsView = false
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
			if (share.type === this.SHARE_TYPES.SHARE_TYPE_EMAIL) {
				this.linkShares.unshift(share)
			} else {
				this.shares.unshift(share)
			}
			this.sharedWith.push(share.shareWith)
			this.awaitForShare(share, resolve)
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

		doneSharing() {
			this.shareSent = true
		},

		toggleShareDetailsView() {
			this.showSharingDetailsView = !this.showSharingDetailsView
		},

		toggleShareDetailsViewAll(eventData) {
			if (eventData && !this.shareSet) {
				this.shareDetailsData = eventData[0]
			}
			this.showSharingDetailsView = !this.showSharingDetailsView
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
    &__content {
        padding: 1.5rem;
    }

    &__info {
        display: block;
        margin-bottom: 1rem
    }

    &__additionalContent {
        margin: 3rem 0;
    }

    &__fileinfo {
        font-size: 14px;
        margin: 1rem 0;
    }

    &__divider {
        border-bottom: 1px solid var(--color-border);
        margin-bottom: 1rem;
        text-align: center;
    }

    &__or {
        background-color: var(--telekom-color-background-surface);
        bottom: -0.75rem;
        font-size: 14px;
        padding: 0.75rem;;
        position: relative;
    }
}
</style>
