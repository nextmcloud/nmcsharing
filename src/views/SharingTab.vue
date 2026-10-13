<template>
	<div :class="{ 'icon-loading': loading }">
		<div v-if="error" class="emptycontent" :class="{ emptyContentWithSections: sections.length > 0 }">
			<div class="icon icon-error" />
			<h2>{{ error }}</h2>
		</div>

		<div v-if="!showSharingDetailsView" class="sharingTab__content">
			<h2 class="sharingTab__header">
				{{ t('nmcsharing', 'Manage shares') }}
			</h2>

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

			<SharingLinkList
				v-if="!loading"
				ref="linkShareList"
				:can-reshare="canReshare"
				:file-info="fileInfo"
				:shares="linkShares"
				@open-sharing-details="toggleShareDetailsView" />

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
import { debounce } from 'throttle-debounce'

import OpenSharingButton from '../components/OpenSharingButton.vue'
import SharingEntrySimple from '../components/SharingEntrySimple.vue'
import SharingInput from '../components/SharingInput.vue'
import Share from '../models/Share.js'
import Config from '../services/ConfigService.js'
import { subscribeToShareChanges, unsubscribeFromShareChanges } from '../services/SharingEvents.js'
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
			error: '',
			expirationInterval: null,
			loading: true,
			reshare: null,
			sharedWithMe: {},
			shares: [],
			linkShares: [],
			sections: window.OCA?.Sharing?.ShareTabSections?.getSections?.() ?? [],
			showSharingDetailsView: false,
			shareDetailsData: {},
			shareDetailsDataAll: [],
			sharesRequestId: 0,
			refreshSharesDebounced: null,
		}
	},

	computed: {
		isSharedWithMe() {
			return Object.keys(this.sharedWithMe).length > 0
		},

		canReshare() {
			return !!(this.fileInfo.permissions & window.OC.PERMISSION_SHARE)
				|| !!(this.reshare?.hasSharePermission && this.config.isResharingAllowed)
		},
	},

	watch: {
		fileInfo(newFileInfo, oldFileInfo) {
			if (newFileInfo && (!oldFileInfo || newFileInfo.id !== oldFileInfo.id)) {
				this.refresh()
			}
		},
	},

	created() {
		this.refreshSharesDebounced = debounce(100, () => {
			this.refreshShares()
		})
	},

	mounted() {
		subscribeToShareChanges(this.onSharesChanged)
		this.refresh()
	},

	beforeDestroy() {
		clearInterval(this.expirationInterval)
		this.sharesRequestId++
		this.refreshSharesDebounced?.cancel?.()
		unsubscribeFromShareChanges(this.onSharesChanged)
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

		async refreshShares() {
			if (!this.fileInfo) {
				return
			}

			await this.getShares()
			this.applyShareIconOverlay()
		},

		onSharesChanged(event) {
			if (!this.fileInfo) {
				return
			}

			const currentPath = `${this.fileInfo.path}/${this.fileInfo.name}`.replace(/\/+/g, '/')
			const changedPath = typeof event?.path === 'string'
				? event.path.replace(/\/+/g, '/')
				: null

			if (changedPath && changedPath !== currentPath) {
				return
			}

			this.refreshSharesDebounced?.()
		},

		applyShareIconOverlay() {
			const file = this.fileInfo

			if (!file?.attributes) {
				return
			}

			const figureDiv = document.getElementsByClassName('app-sidebar-header__figure')[0]

			if (!figureDiv) {
				return
			}

			const overlayClass = 'nmcsharing-share-overlay'
			let overlayElement = figureDiv.querySelector(`.${overlayClass}`)
			const rawShareTypes = file.attributes['share-types'] ?? {}
			const fileShareTypes = Object.values(rawShareTypes).flat().map(type => Number(type))

			const hasShares = this.shares.length > 0
				|| this.linkShares.length > 0
				|| fileShareTypes.some(type =>
					type === ShareType.Link
					|| type === ShareType.Email
					|| type === ShareType.User,
				)

			if (!hasShares) {
				overlayElement?.remove()
				return
			}

			const overlayLinkIcon = getComputedStyle(document.documentElement)
				.getPropertyValue('--original-icon-folder-overlay-share-white')
				.trim()

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

				if (getComputedStyle(figureDiv).position === 'static') {
					figureDiv.style.setProperty('position', 'relative', 'important')
				}

				overlayElement.style.setProperty('background-image', overlayLinkIcon, 'important')
				overlayElement.style.setProperty('background-repeat', 'no-repeat', 'important')
				overlayElement.style.setProperty('background-position', 'center', 'important')
				overlayElement.style.setProperty('background-size', '2.1rem 2.5rem', 'important')

				return overlayElement
			}

			const restoreOriginalBackground = () => {
				figureDiv.style.setProperty(
					'background-image',
					'url("/customapps/nmctheme/img/filetypes/folder.svg")',
					'important',
				)
			}

			setTimeout(() => {
				const isFolder = file.type === 'dir' || file.mimetype === 'httpd/unix-directory'

				if (isFolder) {
					restoreOriginalBackground()
					ensureOverlayElement()
				}
			}, 50)
		},

		async getShares() {
			if (!this.fileInfo) {
				return
			}

			const requestId = ++this.sharesRequestId
			const fileInfo = this.fileInfo
			const path = `${fileInfo.path}/${fileInfo.name}`.replace(/\/+/g, '/')

			try {
				this.loading = true
				this.error = ''

				const shareUrl = generateOcsUrl('apps/files_sharing/api/v1/shares')
				const params = { format: 'json', path }

				const [sharesResponse, sharedWithMeResponse] = await Promise.all([
					axios.get(shareUrl, {
						params: {
							...params,
							reshares: true,
						},
					}),
					axios.get(shareUrl, {
						params: {
							...params,
							shared_with_me: true,
						},
					}),
				])

				if (requestId !== this.sharesRequestId) {
					return
				}

				const currentPath = `${this.fileInfo.path}/${this.fileInfo.name}`.replace(/\/+/g, '/')

				if (currentPath !== path) {
					return
				}

				this.processSharedWithMe(sharedWithMeResponse)
				this.processShares(sharesResponse)
			} catch (error) {
				if (requestId !== this.sharesRequestId) {
					return
				}

				const message = error?.response?.data?.ocs?.meta?.message
				this.error = message || t('files_sharing', 'Unable to load the shares list')
				console.error('[nmcsharing] Error loading the shares list', error)
			} finally {
				if (requestId === this.sharesRequestId) {
					this.loading = false
				}
			}
		},

		resetState() {
			clearInterval(this.expirationInterval)

			this.expirationInterval = null
			this.sharesRequestId++
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

		updateExpirationSubtitle(share) {
			// eslint-disable-next-line no-undef
			const expiration = moment(share.expireDate).unix()

			this.$set(this.sharedWithMe, 'subtitle', t('files_sharing', 'Expires {relativetime}', {
				relativetime: window.OC.Util.relativeModifiedDate(expiration * 1000),
			}))

			// eslint-disable-next-line no-undef
			if (moment().unix() > expiration) {
				clearInterval(this.expirationInterval)
				this.expirationInterval = null
				this.$set(this.sharedWithMe, 'subtitle', t('files_sharing', 'this share just expired.'))
			}
		},

		processShares({ data }) {
			const rawShares = Array.isArray(data?.ocs?.data) ? data.ocs.data : []
			const shares = rawShares
				.map(rawShare => new Share(rawShare))
				.sort((a, b) => b.createdTime - a.createdTime)

			this.linkShares = shares.filter(share =>
				Number(share.type) === ShareType.Link || Number(share.type) === ShareType.Email,
			)

			this.shares = shares.filter(share =>
				Number(share.type) !== ShareType.Link && Number(share.type) !== ShareType.Email,
			)
		},

		processSharedWithMe({ data }) {
			clearInterval(this.expirationInterval)

			this.expirationInterval = null
			this.sharedWithMe = {}
			this.reshare = null

			const rawShare = data?.ocs?.data?.[0]

			if (rawShare) {
				const share = new Share(rawShare)

				this.sharedWithMe = {
					displayName: share.ownerDisplayName,
					title: shareWithTitle(share),
					user: share.owner,
				}

				this.reshare = share

				// eslint-disable-next-line no-undef
				if (share.expireDate && moment(share.expireDate).unix() > moment().unix()) {
					this.updateExpirationSubtitle(share)
					this.expirationInterval = setInterval(this.updateExpirationSubtitle, 10000, share)
				}

				return
			}

			if (
				this.fileInfo
				&& this.fileInfo.shareOwnerId !== undefined
				&& this.fileInfo.shareOwnerId !== window.OC.currentUser
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

		addShare(share, resolve = () => {}) {
			const normalizedShare = share instanceof Share ? share : new Share(share)
			const type = Number(normalizedShare.type)
			const targetList = type === ShareType.Link || type === ShareType.Email
				? this.linkShares
				: this.shares

			if (!targetList.some(item => item.id === normalizedShare.id)) {
				targetList.unshift(normalizedShare)
			}

			this.awaitForShare(normalizedShare, resolve)
		},

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

		awaitForShare(share, resolve) {
			this.$nextTick(() => {
				const type = Number(share.type)
				const listComponent = type === ShareType.Link || type === ShareType.Email
					? this.$refs.linkShareList
					: this.$refs.shareList

				if (!listComponent) {
					return
				}

				const newShare = listComponent.$children.find(component => component.share?.id === share.id)

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