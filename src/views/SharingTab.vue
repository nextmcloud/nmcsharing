<template>
	<div :class="{ 'icon-loading': loading }">
		<!-- error message -->
		<div v-if="error" class="emptycontent" :class="{ emptyContentWithSections: sections.length > 0 }">
			<div class="icon icon-error" />
			<h2>{{ error }}</h2>
		</div>

		<!-- shares content -->
		<div v-if="!showSharingDetailsView" class="sharingTab__content">
			<h2 class="sharingTab__header">
				{{ t('nmcsharing', 'Manage shares') }}
			</h2>

			<!-- shared with me information -->
			<SharingEntrySimple
				v-if="isSharedWithMe"
				v-bind="sharedWithMe"
				class="sharing-entry__reshare" />

			<p v-if="canReshare">
				{{ isSharedWithMe ? `${t('nmcsharing', 'Resharing is allowed')}. ` : '' }}
				<span v-if="shares.length === 0 && linkShares.length === 0">
					{{ t('nmcsharing', "You haven't shared your file/folder yet. Share to give others access.") }}
				</span>
				<span v-else>
					{{ t('nmcsharing', 'Here you can see who has access to your file/folder.') }}
				</span>
			</p>

			<p v-else>
				{{ t('files_sharing', 'Resharing is not allowed') }}
			</p>

			<!-- add new share input -->
			<SharingInput
				v-if="!loading && false"
				:can-reshare="canReshare"
				:file-info="fileInfo"
				:link-shares="linkShares"
				:reshare="reshare"
				:shares="shares"
				:is-shared-with-me="isSharedWithMe"
				@open-sharing-details="toggleShareDetailsView"
				@open-sharing-details-all="toggleShareDetailsViewAll" />

			<!-- link shares list -->
			<SharingLinkList
				v-if="!loading"
				ref="linkShareList"
				:can-reshare="canReshare"
				:file-info="fileInfo"
				:shares="linkShares"
				@open-sharing-details="toggleShareDetailsView" />

			<!-- other shares list -->
			<SharingList
				v-if="!loading && canReshare"
				ref="shareList"
				:shares="shares"
				:file-info="fileInfo"
				@open-sharing-details="toggleShareDetailsView" />

			<OpenSharingButton
				v-if="canReshare"
				:file-info="fileInfo" />
		</div>

		<!-- share details -->
		<div v-else>
			<SharingTabDetails
				:file-info="shareDetailsData.fileInfo"
				:share="shareDetailsData.share"
				:share-all="shareDetailsDataAll"
				:resharing-allowed-global="config.isResharingAllowed"
				@close-sharing-details="toggleShareDetailsView"
				@add:share="addShare"
				@remove:share="removeShare" />
		</div>

		<!-- additional entries -->
		<div
			v-for="(section, index) in sections"
			:ref="'section-' + index"
			:key="index"
			class="sharingTab__additionalContent">
			<component
				:is="section($refs['section-' + index], fileInfo)"
				:file-info="fileInfo" />
		</div>
	</div>
</template>

<!-- eslint-disable @nextcloud/no-deprecations -->

<script>
import axios from '@nextcloud/axios'
import { translate as t } from '@nextcloud/l10n'
import { generateOcsUrl } from '@nextcloud/router'
import { ShareType } from '@nextcloud/sharing'

import OpenSharingButton from '../components/OpenSharingButton.vue'
import SharingEntrySimple from '../components/SharingEntrySimple.vue'
import SharingInput from '../components/SharingInput.vue'

import Share from '../models/Share.js'
import Config from '../services/ConfigService.js'
import { shareWithTitle } from '../utils/SharedWithMe.js'

import SharingLinkList from './SharingLinkList.vue'
import SharingList from './SharingList.vue'
import SharingTabDetails from './SharingTabDetails.vue'

export default {
	name: 'SharingTab',

	components: {
		OpenSharingButton,
		SharingEntrySimple,
		SharingInput,
		SharingLinkList,
		SharingList,
		SharingTabDetails,
	},

	props: {
		fileInfo: {
			type: Object,
			required: true,
		},
	},

	data() {
		return {
			config: new Config(),
			deleteEvent: null,
			error: '',
			expirationInterval: null,
			loading: true,
			reshare: null,
			sharedWithMe: {},
			shares: [],
			linkShares: [],
			sections: OCA.Sharing?.ShareTabSections?.getSections?.() ?? [],
			showSharingDetailsView: false,
			shareDetailsData: {},
			shareDetailsDataAll: [],
		}
	},

	computed: {
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
	},

	watch: {
		fileInfo(newFileInfo, oldFileInfo) {
			if (!newFileInfo) {
				return
			}

			if (!oldFileInfo || newFileInfo.id !== oldFileInfo.id) {
				this.refresh()
			}
		},
	},

	mounted() {
		this.refresh()
	},

	beforeDestroy() {
		clearInterval(this.expirationInterval)
	},

	methods: {
		async refresh() {
			if (!this.fileInfo) {
				return
			}

			this.resetState()
			await this.getShares()
			this.applyShareIconOverlay()
		},

		applyShareIconOverlay() {
			const file = this.fileInfo

			if (!file || !file.attributes) {
				return
			}

			const raw = file.attributes['share-types'] || {}
			const shareTypes = Object.values(raw).flat()

			if (!shareTypes.some(type => type === ShareType.Link || type === ShareType.Email || type === ShareType.User)) {
				return
			}

			const figureDiv = document.getElementsByClassName('app-sidebar-header__figure')[0]
			if (!figureDiv) {
				return
			}

			const overlayLinkIcon = getComputedStyle(document.documentElement)
				.getPropertyValue('--original-icon-folder-overlay-share-white')
				.trim()

			const overlayClass = 'nmcsharing-share-overlay'
			let overlayElement = figureDiv.querySelector(`.${overlayClass}`)

			const ensureOverlayElement = () => {
				if (!overlayElement) {
					overlayElement = document.createElement('span')
					overlayElement.className = overlayClass
					overlayElement.style.position = 'absolute'
					overlayElement.style.inset = '0'
					overlayElement.style.pointerEvents = 'none'
					overlayElement.style.display = 'block'
					overlayElement.style.zIndex = '1'
					figureDiv.appendChild(overlayElement)
				}

				const figurePosition = getComputedStyle(figureDiv).position
				if (figurePosition === 'static') {
					figureDiv.style.setProperty('position', 'relative', 'important')
				}

				overlayElement.style.setProperty('background-image', overlayLinkIcon, 'important')
				overlayElement.style.setProperty('background-repeat', 'no-repeat', 'important')
				overlayElement.style.setProperty('background-position', 'center', 'important')
				overlayElement.style.setProperty('background-size', '2.1rem 2.5rem', 'important')

				return overlayElement
			}

			const folderUrl = 'url("/customapps/nmctheme/img/filetypes/folder.svg")'

			const restoreOriginalBackground = () => {
				figureDiv.style.setProperty('background-image', folderUrl, 'important')
			}

			setTimeout(() => {
				if (file.mimetype === 'httpd/unix-directory') {
					restoreOriginalBackground()
					ensureOverlayElement()
				}
			}, 50)
		},

		/**
		 * Get the existing shares.
		 */
		async getShares() {
			try {
				this.loading = true
				this.error = ''

				const shareUrl = generateOcsUrl('apps/files_sharing/api/v1/shares')
				const format = 'json'
				const path = (this.fileInfo.path + '/' + this.fileInfo.name).replace('//', '/')

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
				this.error = message || t('files_sharing', 'Unable to load the shares list')
				console.error('Error loading the shares list', error)
			} finally {
				this.loading = false
			}
		},

		/**
		 * Reset the current view to its default state.
		 */
		resetState() {
			clearInterval(this.expirationInterval)

			this.loading = true
			this.error = ''
			this.reshare = null
			this.sharedWithMe = {}
			this.shares = []
			this.linkShares = []
			this.showSharingDetailsView = false
			this.shareDetailsData = {}
			this.shareDetailsDataAll = []
		},

		/**
		 * Update sharedWithMe.subtitle with the appropriate expiration time left.
		 *
		 * @param {Share} share the sharedWithMe Share object
		 */
		updateExpirationSubtitle(share) {
			// eslint-disable-next-line no-undef
			const expiration = moment(share.expireDate).unix()

			this.$set(this.sharedWithMe, 'subtitle', t('files_sharing', 'Expires {relativetime}', {
				relativetime: OC.Util.relativeModifiedDate(expiration * 1000),
			}))

			// eslint-disable-next-line no-undef
			if (moment().unix() > expiration) {
				clearInterval(this.expirationInterval)
				this.$set(this.sharedWithMe, 'subtitle', t('files_sharing', 'this share just expired.'))
			}
		},

		/**
		 * Process current shares data.
		 *
		 * @param {object} response Axios response
		 */
		processShares({ data }) {
			const rawShares = data?.ocs?.data ?? []

			const shares = rawShares
				.map(share => new Share(share))
				.sort((a, b) => b.createdTime - a.createdTime)

			this.linkShares = shares.filter(share =>
				share.type === ShareType.Link || share.type === ShareType.Email,
			)

			this.shares = shares.filter(share =>
				share.type !== ShareType.Link && share.type !== ShareType.Email,
			)
		},

		/**
		 * Process the shared-with-me data.
		 *
		 * @param {object} response Axios response
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

				// eslint-disable-next-line no-undef
				if (share.expireDate && moment(share.expireDate).unix() > moment().unix()) {
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
		 * Add a share to the appropriate share list.
		 *
		 * @param {Share} share share to add
		 * @param {Function} resolve callback
		 */
		addShare(share, resolve = () => {}) {
			if (share.type === ShareType.Link || share.type === ShareType.Email) {
				this.linkShares.unshift(share)
			} else {
				this.shares.unshift(share)
			}

			this.awaitForShare(share, resolve)
		},

		/**
		 * Remove a share from the appropriate list.
		 *
		 * @param {Share} share share to remove
		 */
		removeShare(share) {
			const shareIndex = this.shares.findIndex(item => item.id === share.id)
			if (shareIndex !== -1) {
				this.shares.splice(shareIndex, 1)
			}

			const linkShareIndex = this.linkShares.findIndex(item => item.id === share.id)
			if (linkShareIndex !== -1) {
				this.linkShares.splice(linkShareIndex, 1)
			}
		},

		/**
		 * Resolve with the newly rendered share component.
		 *
		 * @param {Share} share newly created share
		 * @param {Function} resolve callback
		 */
		awaitForShare(share, resolve) {
			let listComponent = this.$refs.shareList

			if (share.type === ShareType.Link || share.type === ShareType.Email) {
				listComponent = this.$refs.linkShareList
			}

			if (!listComponent) {
				return
			}

			this.$nextTick(() => {
				const newShare = listComponent.$children.find(component => component.share === share)

				if (newShare) {
					resolve(newShare)
				}
			})
		},

		toggleShareDetailsView(eventData) {
			if (eventData) {
				this.shareDetailsData = eventData
			}

			this.showSharingDetailsView = !this.showSharingDetailsView
		},

		toggleShareDetailsViewAll(eventData) {
			if (eventData) {
				this.shareDetailsData = eventData[0]
				this.shareDetailsDataAll = eventData
			}

			this.showSharingDetailsView = !this.showSharingDetailsView
		},
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
		padding: 0;

		p,
		.sharing-entry__noshare {
			margin-bottom: 1rem;
		}
	}

	&__additionalContent {
		margin: 3rem 0;
	}
}
</style>
