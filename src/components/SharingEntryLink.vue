<template>
	<li
		:class="{ 'sharing-entry--share': share }"
		class="sharing-entry sharing-entry__link">

		<div
			class="sharing-entry__desc"
			@click.prevent="toggleQuickShareSelect">

			<span
				class="sharing-entry__title"
				:title="title">
				{{ title }}
			</span>

			<QuickShareSelect
				v-if="share && share.permissions !== undefined"
				:share="share"
				:file-info="fileInfo"
				:toggle="showDropdown"
				@open-sharing-details="openShareDetailsForCustomSettings(share)" />
		</div>

		<NcButton
			v-if="share && !isEmailShareType && share.token"
			:disabled="saving"
			:title="copyText"
			:aria-label="copyLinkTooltip"
			:variant="copied && copySuccess ? 'success' : 'secondary'"
			@click.prevent="copyLink">
			<template #icon>
				<span
					aria-hidden="true"
					:class="{
						'icon icon-checkmark': copied && copySuccess,
						'icon icon-clipboard': !(copied && copySuccess),
					}" />
			</template>
		</NcButton>

		<NcButton
			v-if="share && share.canDelete"
			:disabled="saving"
			:title="t('files_sharing', 'Delete')"
			:aria-label="t('files_sharing', 'Delete')"
			variant="secondary"
			@click.prevent="onDelete">
			<template #icon>
				<span
					aria-hidden="true"
					class="icon icon-delete" />
			</template>

			<template v-if="isEmailShareType" #default>
				{{ t('files_sharing', 'Delete') }}
			</template>
		</NcButton>

		<!-- Required data for a newly created share -->
		<NcActions
			v-if="pendingPassword || pendingEnforcedPassword || pendingExpirationDate"
			class="sharing-entry__actions"
			:aria-label="actionsTooltip"
			menu-align="right"
			:open.sync="open"
			:force-menu="true">

			<NcActionText
				v-if="errors.pending"
				icon="icon-error"
				:class="{ error: errors.pending }">
				{{ errors.pending }}
			</NcActionText>

			<NcActionText
				v-else
				icon="icon-info">
				{{ t(
					'files_sharing',
					'Please enter the following required information before creating the share',
				) }}
			</NcActionText>

			<!-- Password -->
			<NcActionText
				v-if="pendingEnforcedPassword"
				icon="icon-password">
				{{ t('files_sharing', 'Password protection (enforced)') }}
			</NcActionText>

			<NcActionCheckbox
				v-else-if="pendingPassword"
				:checked.sync="isPasswordProtected"
				:disabled="config.enforcePasswordForPublicLink || saving || loading || pending"
				class="share-link-password-checkbox"
				@uncheck="onPasswordDisable">
				{{ t('files_sharing', 'Password protection') }}
			</NcActionCheckbox>

			<NcActionInput
				v-if="pendingEnforcedPassword || share.password"
				class="share-link-password"
				:value.sync="share.password"
				:disabled="saving || loading || pending"
				:required="config.enableLinkPasswordByDefault || config.enforcePasswordForPublicLink"
				:minlength="passwordMinLength"
				autocomplete="new-password"
				@submit="onNewLinkShare">
				{{ t('files_sharing', 'Enter a password') }}
			</NcActionInput>

			<!-- Expiration date -->
			<NcActionText
				v-if="pendingExpirationDate"
				icon="icon-calendar-dark">
				{{ t('files_sharing', 'Expiration date (enforced)') }}
			</NcActionText>

			<NcActionInput
				v-if="pendingExpirationDate"
				class="share-link-expire-date"
				:disabled="saving || loading || pending"
				:is-native-picker="true"
				:hide-label="true"
				:value="expirationDateValue"
				type="date"
				:min="dateTomorrow"
				:max="dateMaxEnforced"
				@input="onExpirationChange">
				{{ t('files_sharing', 'Enter a date') }}
			</NcActionInput>

			<NcActionButton
				icon="icon-checkmark"
				:disabled="saving || loading || pending"
				@click.prevent.stop="onNewLinkShare">
				{{ t('files_sharing', 'Create share') }}
			</NcActionButton>

			<NcActionButton
				icon="icon-close"
				:disabled="saving || loading || pending"
				@click.prevent.stop="onCancel">
				{{ t('files_sharing', 'Cancel') }}
			</NcActionButton>
		</NcActions>
	</li>
</template>

<script>
import { showError, showSuccess } from '@nextcloud/dialogs'
import { translate as t } from '@nextcloud/l10n'
import { generateUrl } from '@nextcloud/router'
import { ShareType } from '@nextcloud/sharing'

import NcActionButton from '@nextcloud/vue/dist/Components/NcActionButton.js'
import NcActionCheckbox from '@nextcloud/vue/dist/Components/NcActionCheckbox.js'
import NcActionInput from '@nextcloud/vue/dist/Components/NcActionInput.js'
import NcActionText from '@nextcloud/vue/dist/Components/NcActionText.js'
import NcActions from '@nextcloud/vue/dist/Components/NcActions.js'
import NcButton from '@nextcloud/vue/dist/Components/NcButton.js'

import QuickShareSelect from './SharingEntryQuickShareSelect.vue'

import ShareDetails from '../mixins/ShareDetails.js'
import SharesMixin from '../mixins/SharesMixin.js'
import Share from '../models/Share.js'
import GeneratePassword from '../utils/GeneratePassword.js'

export default {
	name: 'SharingEntryLink',

	components: {
		NcActionButton,
		NcActionCheckbox,
		NcActionInput,
		NcActionText,
		NcActions,
		NcButton,
		QuickShareSelect,
	},

	mixins: [
		SharesMixin,
		ShareDetails,
	],

	props: {
		canReshare: {
			type: Boolean,
			default: true,
		},

		index: {
			type: Number,
			default: null,
		},
	},

	data() {
		return {
			showDropdown: false,

			copySuccess: true,
			copied: false,
			copyResetTimeout: null,

			/*
			 * True while a pending share is being submitted.
			 *
			 * Do NOT use this to v-if the NcActions component away.
			 * Doing that while one of its buttons has focus can cause
			 * FloatingVue to put aria-hidden on the focused element's
			 * ancestor.
			 */
			pending: false,
		}
	},

	computed: {
		copyText() {
			return this.copied && this.copySuccess
				? t('nmcsharing', 'Copied')
				: t('nmcsharing', 'Copy')
		},

		/**
		 * Display title for the share.
		 *
		 * @return {string}
		 */
		title() {
			if (this.share?.id) {
				if (
					!this.isShareOwner
					&& this.share.ownerDisplayName
				) {
					if (this.isEmailShareType) {
						return t(
							'files_sharing',
							'{shareWith} by {initiator}',
							{
								shareWith: this.share.shareWith,
								initiator: this.share.ownerDisplayName,
							},
						)
					}

					return t(
						'files_sharing',
						'Shared via link by {initiator}',
						{
							initiator: this.share.ownerDisplayName,
						},
					)
				}

				const label = typeof this.share.label === 'string'
					? this.share.label.trim()
					: ''

				if (label !== '') {
					if (this.isEmailShareType) {
						return t(
							'files_sharing',
							'Mail share ({label})',
							{ label },
						)
					}

					return t(
						'files_sharing',
						'Share link ({label})',
						{ label },
					)
				}

				if (this.isEmailShareType) {
					return this.share.shareWith
						|| t('files_sharing', 'Mail share')
				}
			}

			if (this.index !== null && this.index > 1) {
				return t(
					'files_sharing',
					'Share link ({index})',
					{
						index: this.index,
					},
				)
			}

			return t('files_sharing', 'Share link')
		},

		/**
		 * Does the current share have an expiration date?
		 */
		hasExpirationDate: {
			get() {
				return this.config.isDefaultExpireDateEnforced
					|| !!this.share?.expireDate
			},

			set(enabled) {
				if (!this.share) {
					return
				}

				if (!enabled) {
					this.share.expireDate = ''
					return
				}

				this.share.expireDate = this.formatDateToString(
					this.defaultExpirationDate,
				)
			},
		},

		defaultExpirationDate() {
			const configuredDate = this.config.defaultExpirationDate

			if (configuredDate) {
				const date = new Date(configuredDate)

				if (!Number.isNaN(date.getTime())) {
					return date
				}
			}

			const days = Number(this.config.defaultExpireDate)

			if (Number.isFinite(days) && days > 0) {
				const date = new Date()
				date.setDate(date.getDate() + days)
				return date
			}

			const fallback = new Date()
			fallback.setDate(fallback.getDate() + 1)

			return fallback
		},

		dateMaxEnforced() {
			if (!this.config.isDefaultExpireDateEnforced) {
				return null
			}

			return this.defaultExpirationDate
		},

		expirationDateValue() {
			if (!this.share?.expireDate) {
				return this.defaultExpirationDate
			}

			const date = new Date(this.share.expireDate)

			return Number.isNaN(date.getTime())
				? this.defaultExpirationDate
				: date
		},

		/**
		 * Is the current share password protected?
		 */
		isPasswordProtected: {
			get() {
				return this.config.enforcePasswordForPublicLink
					|| !!this.share?.password
			},

			async set(enabled) {
				if (!this.share) {
					return
				}

				const password = enabled
					? await GeneratePassword()
					: ''

				this.$set(
					this.share,
					'password',
					password,
				)

				this.$set(
					this.share,
					'newPassword',
					password,
				)
			},
		},

		passwordMinLength() {
			if (!this.isPasswordPolicyEnabled) {
				return undefined
			}

			const minLength = Number(
				this.config.passwordPolicy?.minLength,
			)

			if (!Number.isFinite(minLength) || minLength <= 0) {
				return undefined
			}

			return minLength
		},

		passwordExpirationTime() {
			if (
				this.share?.passwordExpirationTime === null
				|| this.share?.passwordExpirationTime === undefined
			) {
				return null
			}

			const expirationTime = moment(
				this.share.passwordExpirationTime,
			)

			if (expirationTime.diff(moment()) < 0) {
				return false
			}

			return expirationTime.fromNow()
		},

		isTalkEnabled() {
			return window.OC?.appswebroots?.spreed !== undefined
		},

		isPasswordProtectedByTalkAvailable() {
			return this.isPasswordProtected
				&& this.isTalkEnabled
		},

		isPasswordProtectedByTalk: {
			get() {
				return !!this.share?.sendPasswordByTalk
			},

			set(enabled) {
				if (this.share) {
					this.share.sendPasswordByTalk = enabled
				}
			},
		},

		isEmailShareType() {
			return this.share?.type === ShareType.Email
		},

		isLinkShareType() {
			return this.share?.type === ShareType.Link
		},

		canTogglePasswordProtectedByTalkAvailable() {
			if (!this.isPasswordProtected) {
				return false
			}

			if (
				this.isEmailShareType
				&& !this.hasUnsavedPassword
			) {
				return false
			}

			return true
		},

		/**
		 * A new local share without id still requires the configured
		 * mandatory data.
		 */
		pendingPassword() {
			return this.config.enableLinkPasswordByDefault
				&& !!this.share
				&& !this.share.id
		},

		pendingEnforcedPassword() {
			return this.config.enforcePasswordForPublicLink
				&& !!this.share
				&& !this.share.id
		},

		pendingExpirationDate() {
			return this.config.isDefaultExpireDateEnforced
				&& !!this.share
				&& !this.share.id
		},

		hasUnsavedPassword() {
			return this.share?.newPassword !== undefined
		},

		/**
		 * Public URL of the current link share.
		 *
		 * @return {string}
		 */
		shareLink() {
			if (!this.share?.token) {
				return ''
			}

			return window.location.origin
				+ generateUrl('/s/')
				+ this.share.token
		},

		actionsTooltip() {
			return t(
				'files_sharing',
				'Actions for "{title}"',
				{
					title: this.title,
				},
			)
		},

		copyLinkTooltip() {
			if (this.copied) {
				if (this.copySuccess) {
					return t(
						'files_sharing',
						'Public link copied',
					)
				}

				return t(
					'files_sharing',
					'Cannot copy, please copy the link manually',
				)
			}

			return t(
				'files_sharing',
				'Copy public link of "{title}" to clipboard',
				{
					title: this.title,
				},
			)
		},

		isPasswordPolicyEnabled() {
			return this.config.passwordPolicy !== null
				&& typeof this.config.passwordPolicy === 'object'
		},

		canChangeHideDownload() {
			const shareAttributes = this.fileInfo?.shareAttributes ?? []

			return shareAttributes.some(
				shareAttribute =>
					shareAttribute.key === 'download'
					&& shareAttribute.scope === 'permissions'
					&& shareAttribute.enabled === false,
			)
		},
	},

	beforeDestroy() {
		if (this.copyResetTimeout !== null) {
			clearTimeout(this.copyResetTimeout)
			this.copyResetTimeout = null
		}

		this.releasePopoverFocus()
	},

	methods: {
		/**
		 * Remove focus from a control inside a FloatingVue popover before
		 * the popover is hidden.
		 *
		 * Otherwise Chrome can report:
		 * "Blocked aria-hidden on an element because its descendant
		 * retained focus."
		 */
		releasePopoverFocus() {
			const activeElement = document.activeElement

			if (!(activeElement instanceof HTMLElement)) {
				return
			}

			const popover = activeElement.closest(
				'.action-item__popper, .v-popper__popper',
			)

			if (popover) {
				activeElement.blur()
			}
		},

		/**
		 * Close the action menu without leaving focus inside the hidden
		 * FloatingVue popover.
		 */
		closeActionsMenu() {
			this.releasePopoverFocus()
			this.open = false
		},

		/**
		 * Create a new link share.
		 *
		 * @return {Promise<boolean>}
		 */
		async onNewLinkShare() {
			if (this.loading || this.pending) {
				return false
			}

			const shareDefaults = {
				share_type: ShareType.Link,
			}

			if (this.config.isDefaultExpireDateEnforced) {
				shareDefaults.expiration = this.formatDateToString(
					this.defaultExpirationDate,
				)
			}

			const requiresPendingData =
				this.config.enableLinkPasswordByDefault
				|| this.config.enforcePasswordForPublicLink
				|| this.config.isDefaultExpireDateEnforced

			if (requiresPendingData) {
				/*
				 * If this is already a locally created share without id,
				 * validate and persist that share.
				 */
				if (this.share && !this.share.id) {
					if (!this.checkShare(this.share)) {
						this.open = true

						OC.Notification.showTemporary(
							t(
								'files_sharing',
								'Error, please enter proper password and/or expiration date',
							),
						)

						return false
					}

					this.pending = true

					try {
						return await this.pushNewLinkShare(
							this.share,
							true,
						)
					} finally {
						this.pending = false
					}
				}

				if (
					this.config.enableLinkPasswordByDefault
					|| this.config.enforcePasswordForPublicLink
				) {
					shareDefaults.password = await GeneratePassword()
				}

				const share = new Share(shareDefaults)

				const component = await new Promise(resolve => {
					this.$emit(
						'add:share',
						share,
						resolve,
					)
				})

				this.closeActionsMenu()

				if (component) {
					component.open = true
				}

				return true
			}

			const share = new Share(shareDefaults)

			return this.pushNewLinkShare(share)
		},

		/**
		 * Push a new link share to the server.
		 *
		 * @param {Share} share New share
		 * @param {boolean} [update=false] Update an existing local share
		 * @return {Promise<boolean>}
		 */
		async pushNewLinkShare(share, update = false) {
			if (this.loading) {
				return false
			}

			try {
				this.loading = true
				this.errors = {}

				const path = `${this.fileInfo.path}/${this.fileInfo.name}`
					.replace(/\/+/g, '/')

				const options = {
					path,
					shareType: ShareType.Link,
					attributes: JSON.stringify(
						this.fileInfo.shareAttributes ?? [],
					),
				}

				if (share.password) {
					options.password = share.password
				}

				if (share.expireDate) {
					options.expireDate = share.expireDate
				}

				const newShare = await this.createShare(options)

				if (!newShare) {
					throw new Error(
						'Share creation returned no share object',
					)
				}

				/*
				 * The current NcActionButton can still have focus here.
				 * Remove focus before FloatingVue hides the popover.
				 */
				this.closeActionsMenu()

				let component

				if (update) {
					component = await new Promise(resolve => {
						this.$emit(
							'update:share',
							newShare,
							resolve,
						)
					})
				} else {
					component = await new Promise(resolve => {
						this.$emit(
							'add:share',
							newShare,
							resolve,
						)
					})
				}

				if (
					!this.config.enforcePasswordForPublicLink
					&& typeof component?.copyLink === 'function'
				) {
					await component.copyLink()
				}

				showSuccess(
					t(
						'files_sharing',
						'Link share created',
					),
				)

				return true
			} catch (error) {
				const message =
					error?.response?.data?.ocs?.meta?.message

				if (message) {
					if (/password/i.test(message)) {
						this.onSyncError(
							'password',
							message,
						)
					} else if (/date/i.test(message)) {
						this.onSyncError(
							'expireDate',
							message,
						)
					} else {
						this.onSyncError(
							'pending',
							message,
						)
					}

					showError(message)
				} else {
					showError(
						t(
							'files_sharing',
							'Error while creating the share',
						),
					)
				}

				console.error(
					'[nmcsharing] Error while creating link share',
					error,
				)

				return false
			} finally {
				this.loading = false
			}
		},

		/**
		 * Copy public link to clipboard.
		 *
		 * @return {Promise<boolean>}
		 */
		async copyLink() {
			if (!this.shareLink) {
				return false
			}

			try {
				if (!navigator.clipboard?.writeText) {
					throw new Error(
						'Clipboard API is not available',
					)
				}

				await navigator.clipboard.writeText(
					this.shareLink,
				)

				showSuccess(
					t(
						'files_sharing',
						'Link copied',
					),
				)

				this.copySuccess = true
				this.copied = true

				return true
			} catch (error) {
				this.copySuccess = false
				this.copied = true

				console.error(
					'[nmcsharing] Unable to copy link',
					error,
				)

				return false
			} finally {
				if (this.copyResetTimeout !== null) {
					clearTimeout(this.copyResetTimeout)
				}

				this.copyResetTimeout = setTimeout(() => {
					this.copySuccess = true
					this.copied = false
					this.copyResetTimeout = null
				}, 4000)
			}
		},

		/**
		 * Update the unsaved password value.
		 *
		 * @param {string} password Changed password
		 */
		onPasswordChange(password) {
			if (!this.share) {
				return
			}

			this.$set(
				this.share,
				'newPassword',
				password,
			)
		},

		/**
		 * Disable password protection.
		 */
		onPasswordDisable() {
			if (!this.share) {
				return
			}

			this.share.password = ''

			this.$delete(
				this.share,
				'newPassword',
			)

			if (this.share.id) {
				this.queueUpdate('password')
			}
		},

		/**
		 * Save password if it has unsaved changes.
		 */
		onPasswordSubmit() {
			if (!this.hasUnsavedPassword) {
				return
			}

			const password =
				typeof this.share.newPassword === 'string'
					? this.share.newPassword.trim()
					: ''

			this.share.password = password

			this.queueUpdate('password')
		},

		/**
		 * Update password and sendPasswordByTalk together.
		 */
		onPasswordProtectedByTalkChange() {
			if (this.hasUnsavedPassword) {
				this.share.password =
					typeof this.share.newPassword === 'string'
						? this.share.newPassword.trim()
						: ''
			}

			this.queueUpdate(
				'sendPasswordByTalk',
				'password',
			)
		},

		/**
		 * Cancel local share creation.
		 */
		onCancel() {
			this.closeActionsMenu()

			this.$nextTick(() => {
				this.$emit(
					'remove:share',
					this.share,
				)
			})
		},

		toggleQuickShareSelect() {
			if (!this.isPermissionEditAllowed) {
				return
			}

			this.showDropdown = !this.showDropdown
		},
	},
}
</script>

<style lang="scss" scoped>
.sharing-entry {
	display: flex;
	align-items: center;
	justify-content: flex-end;
	min-height: 2rem;

	&__desc {
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		margin-right: auto;
		padding: 0.5rem;
		line-height: 1rem;
	}

	&__title {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	&:not(.sharing-entry--share) &__actions {
		.new-share-link {
			border-top: 1px solid var(--color-border);
		}
	}

	::v-deep .avatar-link-share {
		background-color: var(--color-main-background);
	}

	.sharing-entry__action--public-upload {
		border-bottom: 1px solid var(--color-border);
	}

	&__loading {
		width: 44px;
		height: 44px;
		margin: 0 0 0 auto;
		padding: 14px;
	}

	.action-item {
		margin-left: auto;

		~ .action-item,
		~ .sharing-entry__loading {
			margin-left: 0;
		}
	}

	.icon-checkmark-color {
		opacity: 1;
	}
}
</style>
