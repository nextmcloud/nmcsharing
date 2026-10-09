<template>
	<div class="sharingPopupDetailsView">
		<span class="header-permissions">
			<ChevronLeftIcon
				:size="20"
				class="back-button"
				role="button"
				tabindex="0"
				:aria-label="t('nmcsharing', 'Back')"
				@click="$emit('close-sharing-details')"
				@keydown.enter="$emit('close-sharing-details')"
				@keydown.space.prevent="$emit('close-sharing-details')" />

			<h2 class="sharingPopupDetailsView__header">
				{{ t('nmcsharing', 'Permissions') }}
			</h2>
		</span>

		<span class="sharingPopup__fileinfo">
			{{ fileInfo.name }} ⸱ {{ size }}
		</span>

		<div class="sharingPopupDetailsView__quick-permissions">
			<div>
				<span class="checkbox-text">
					<NcCheckboxRadioSwitch
						:checked.sync="sharingPermission"
						:disabled="!isPermissionEditAllowed"
						:value="bundledPermissions.READ_ONLY.toString()"
						class="checkbox-switch"
						name="sharing_permission_radio"
						type="radio">
						{{ t('nmcsharing', 'Anyone with the link can') }}
						{{ t('nmcsharing', ' ') }}
						<strong>
							{{ t('nmcsharing', 'only view') }}
						</strong>
					</NcCheckboxRadioSwitch>

					<EyeIcon :size="16" />
				</span>

				<span class="checkbox-text">
					<NcCheckboxRadioSwitch
						:checked.sync="sharingPermission"
						:disabled="!isPermissionEditAllowed"
						:value="isFolder
							? bundledPermissions.ALL.toString()
							: bundledPermissions.ALL_FILE.toString()"
						class="checkbox-switch"
						name="sharing_permission_radio"
						type="radio">
						{{ t('nmcsharing', 'Anyone with the link can') }}
						{{ t('nmcsharing', ' ') }}
						<strong>
							{{ t('nmcsharing', 'edit') }}
						</strong>
					</NcCheckboxRadioSwitch>

					<PencilIcon :size="16" />
				</span>

				<NcCheckboxRadioSwitch
					v-if="allowsFileDrop"
					:checked.sync="sharingPermission"
					:disabled="!isPermissionEditAllowed || isMixedShare"
					:value="bundledPermissions.FILE_DROP.toString()"
					name="sharing_permission_radio"
					type="radio">
					{{ t('nmcsharing', 'File drop (upload only)') }}
				</NcCheckboxRadioSwitch>

				<p
					v-if="allowsFileDrop"
					class="sharing_permission-desc">
					{{ t('nmcsharing', 'With File drop, only uploading is allowed. Only you can see files and folders that have been uploaded.') }}
				</p>

				<p
					v-if="isMixedShare"
					class="sharing_permission-desc">
					{{ t('nmcsharing', 'Please note that file drop is not available for internal sharing, i.e. sharing with other MagentaCLOUD users.') }}
				</p>
			</div>
		</div>

		<div class="sharingPopupDetailsView__advanced-control">
			<strong>{{ t('nmcsharing', 'Advanced settings') }}</strong>
		</div>

		<div class="sharingPopupDetailsView__advanced">
			<section>
				<NcCheckboxRadioSwitch
					v-if="(isPublicShare || isMixedShare) && false"
					:disabled="canChangeHideDownload"
					:checked.sync="mutableShare.hideDownload"
					@update:checked="queueUpdate('hideDownload')">
					{{ t('files_sharing', 'Hide download') }}
				</NcCheckboxRadioSwitch>

				<template v-if="isPublicShare || isMixedShare">
					<NcCheckboxRadioSwitch
						:checked.sync="isPasswordProtected"
						:disabled="isPasswordEnforced">
						{{ t('nmcsharing', 'Set password') }}
					</NcCheckboxRadioSwitch>

					<NcPasswordField
						v-if="isPasswordProtected"
						id="share-password-input"
						:value="hasUnsavedPassword ? mutableShare.password : ''"
						:error="passwordError"
						:helper-text="errorPasswordLabel"
						:required="isPasswordEnforced"
						:label="t('files_sharing', 'Password')"
						@update:value="onPasswordChange" />
				</template>

				<NcCheckboxRadioSwitch
					:checked.sync="hasExpirationDate"
					:disabled="isExpiryDateEnforced">
					{{ isExpiryDateEnforced
						? t('files_sharing', 'Expiration date (enforced)')
						: t('files_sharing', 'Set expiration date') }}
				</NcCheckboxRadioSwitch>

				<NcDateTimePickerNative
					v-if="hasExpirationDate"
					id="share-date-picker"
					:value="new Date(mutableShare.expireDate)"
					:min="dateTomorrow"
					:max="dateMaxEnforced"
					:hide-label="true"
					:disabled="isExpiryDateEnforced"
					:label="t('files_sharing', 'Expiration date')"
					:placeholder="t('files_sharing', 'Expiration date')"
					type="date"
					@input="onExpirationDateChange" />

				<NcCheckboxRadioSwitch
					v-if="isEmailShare || isMixedShare"
					:checked.sync="writeNoteToRecipientIsChecked">
					{{ t('files_sharing', 'Note to recipient') }}
				</NcCheckboxRadioSwitch>

				<template v-if="writeNoteToRecipientIsChecked && (isEmailShare || isMixedShare)">
					<textarea
						:value="mutableShare.note"
						:aria-label="t('files_sharing', 'Note to recipient')"
						@input="mutableShare.note = $event.target.value" />
				</template>

				<NcCheckboxRadioSwitch
					v-if="(!isPublicShare || isMixedShare) && resharingAllowedGlobal"
					:disabled="isMixedShare"
					:checked.sync="allowResharingIsChecked"
					:title="t('nmcsharing', 'Please note that resharing is only available for internal sharing, i.e. sharing with other MagentaCLOUD users.')">
					{{ t('nmcsharing', 'Allow resharing') }}
				</NcCheckboxRadioSwitch>
			</section>
		</div>

		<div class="sharingPopupDetailsView__footer">
			<div class="button-group">
				<NcButton
					class="button-details"
					:aria-label="t('files_sharing', 'Cancel')"
					@click="$emit('close-sharing-details')">
					{{ t('files_sharing', 'Cancel') }}
				</NcButton>

				<NcButton
					class="button-details"
					variant="primary"
					:aria-label="shareButtonText"
					:disabled="passwordError"
					@click="saveShareSettings">
					{{ shareButtonText }}
				</NcButton>
			</div>
		</div>
	</div>
</template>

<script>
import { formatFileSize } from '@nextcloud/files'
import { ShareType } from '@nextcloud/sharing'

import NcButton from '@nextcloud/vue/dist/Components/NcButton.js'
import NcCheckboxRadioSwitch from '@nextcloud/vue/dist/Components/NcCheckboxRadioSwitch.js'
import NcDateTimePickerNative from '@nextcloud/vue/dist/Components/NcDateTimePickerNative.js'
import NcPasswordField from '@nextcloud/vue/dist/Components/NcPasswordField.js'

import ChevronLeftIcon from 'vue-material-design-icons/ChevronLeftCircleOutline.vue'
import EyeIcon from 'vue-material-design-icons/EyeCircleOutline.vue'
import PencilIcon from 'vue-material-design-icons/Pencil.vue'

import {
	ATOMIC_PERMISSIONS,
	BUNDLED_PERMISSIONS,
} from '../lib/SharePermissionsToolBox.js'

import ShareRequests from '../mixins/ShareRequests.js'
import SharesMixin from '../mixins/SharesMixin.js'
import ShareTypes from '../mixins/ShareTypes.js'
import GeneratePassword from '../utils/GeneratePassword.js'

export default {
	name: 'SharingPopupDetailsTab',

	components: {
		ChevronLeftIcon,
		EyeIcon,
		NcButton,
		NcCheckboxRadioSwitch,
		NcDateTimePickerNative,
		NcPasswordField,
		PencilIcon,
	},

	/*
	 * ShareTypes bleibt vorerst enthalten, weil eure bestehenden
	 * Sharing-Mixins unter Umständen noch davon abhängen.
	 * Direkte Typvergleiche verwenden aber bereits ShareType.
	 */
	mixins: [
		ShareTypes,
		ShareRequests,
		SharesMixin,
	],

	props: {
		shareRequestValue: {
			type: Object,
			default: undefined,
		},

		fileInfo: {
			type: Object,
			required: true,
		},

		share: {
			type: Object,
			required: true,
		},

		shareType: {
			type: String,
			required: true,
		},

		resharingAllowedGlobal: {
			type: Boolean,
			required: true,
		},
	},

	data() {
		return {
			allowResharingIsChecked: Boolean(this.share.hasSharePermission),
			passwordError: false,
			writeNoteToRecipientIsChecked: false,

			bundledPermissions: BUNDLED_PERMISSIONS,

			sharingPermission: BUNDLED_PERMISSIONS.ALL.toString(),

			mutableShare: {
				note: this.share.note ?? '',
				password: this.share.password ?? '',
				expireDate: this.share.expireDate ?? '',
				label: this.share.label ?? '',
			},
		}
	},

	computed: {
		size() {
			const size = Number.parseInt(this.fileInfo.size, 10)

			if (Number.isNaN(size) || size < 0) {
				return this.t('files', 'Pending')
			}

			return formatFileSize(size, true)
		},

		canEdit: {
			get() {
				return this.share.hasUpdatePermission
			},
			set(checked) {
				this.updateAtomicPermissions({
					isEditChecked: checked,
				})
			},
		},

		canCreate: {
			get() {
				return this.share.hasCreatePermission
			},
			set(checked) {
				this.updateAtomicPermissions({
					isCreateChecked: checked,
				})
			},
		},

		canDelete: {
			get() {
				return this.share.hasDeletePermission
			},
			set(checked) {
				this.updateAtomicPermissions({
					isDeleteChecked: checked,
				})
			},
		},

		canReshare: {
			get() {
				return this.share.hasSharePermission
			},
			set(checked) {
				this.updateAtomicPermissions({
					isReshareChecked: checked,
				})
			},
		},

		canDownload: {
			get() {
				return this.share.hasDownloadPermission
			},
			set(checked) {
				this.updateAtomicPermissions({
					isDownloadChecked: checked,
				})
			},
		},

		hasRead: {
			get() {
				return this.share.hasReadPermission
			},
			set(checked) {
				this.updateAtomicPermissions({
					isReadChecked: checked,
				})
			},
		},

		hasExpirationDate: {
			get() {
				return this.isValidShareAttribute(
					this.mutableShare.expireDate,
				)
			},

			set(enabled) {
				if (!enabled) {
					this.mutableShare.expireDate = ''
					return
				}

				if (this.share.expireDate) {
					this.mutableShare.expireDate = this.share.expireDate
					return
				}

				this.mutableShare.expireDate = this.formatDateToString(
					this.defaultExpiryDate,
				)
			},
		},

		isPasswordProtected: {
			get() {
				return this.isPasswordEnforced
					|| !!this.mutableShare.password
			},

			async set(enabled) {
				if (enabled) {
					if (this.share.password) {
						this.mutableShare.password = this.share.password
					} else if (!this.mutableShare.password) {
						this.mutableShare.password = await GeneratePassword()
					}
				} else {
					this.mutableShare.password = ''
				}

				this.passwordError = false
			},
		},

		isFolder() {
			return this.fileInfo.type === 'dir'
		},

		isUserShare() {
			return this.share.type === ShareType.User
		},

		isGroupShare() {
			return this.share.type === ShareType.Group
		},

		isLinkShare() {
			return this.share.type === ShareType.Link
		},

		isEmailShare() {
			return this.share.type === ShareType.Email
		},

		isRemoteShare() {
			return this.share.type === ShareType.Remote
				|| this.share.type === ShareType.RemoteGroup
		},

		isPublicShare() {
			return this.isLinkShare || this.isEmailShare
		},

		isMixedShare() {
			return this.shareType === 'MIXED'
		},

		isNewShare() {
			return this.share.shareSet === null
				|| this.share.shareSet === undefined
				|| this.share.shareSet === false
		},

		/**
		 * Resolve the correct expiration policy for the current share.
		 *
		 * Mixed USER/EMAIL shares continue to use the internal policy,
		 * matching the previous behaviour of this component.
		 */
		expirationPolicy() {
			if (this.isRemoteShare) {
				return {
					enabled: this.config.isDefaultRemoteExpireDateEnabled,
					enforced: this.config.isDefaultRemoteExpireDateEnforced,
					days: this.config.defaultRemoteExpireDate,
				}
			}

			if (this.isPublicShare && !this.isMixedShare) {
				return {
					enabled: this.config.isDefaultExpireDateEnabled,
					enforced: this.config.isDefaultExpireDateEnforced,
					days: this.config.defaultExpireDate,
				}
			}

			return {
				enabled: this.config.isDefaultInternalExpireDateEnabled,
				enforced: this.config.isDefaultInternalExpireDateEnforced,
				days: this.config.defaultInternalExpireDate,
			}
		},

		dateMaxEnforced() {
			if (!this.expirationPolicy.enforced) {
				return null
			}

			const days = Number(this.expirationPolicy.days)

			if (!Number.isFinite(days) || days < 0) {
				return null
			}

			const date = new Date()
			date.setDate(date.getDate() + days)

			return date
		},

		isPasswordEnforced() {
			return (this.isPublicShare || this.isMixedShare)
				&& this.config.enforcePasswordForPublicLink
		},

		isExpiryDateEnforced() {
			return this.expirationPolicy.enforced === true
		},

		defaultExpiryDate() {
			const days = Number(this.expirationPolicy.days)

			if (
				this.expirationPolicy.enabled
				&& Number.isFinite(days)
				&& days >= 0
			) {
				const date = new Date()
				date.setDate(date.getDate() + days)

				return date
			}

			const fallback = new Date()
			fallback.setFullYear(fallback.getFullYear() + 1)

			return fallback
		},

		allowsFileDrop() {
			if (!this.isFolder) {
				return false
			}

			return this.isLinkShare
				|| this.isEmailShare
				|| this.isMixedShare
		},

		shareButtonText() {
			return t('nmcsharing', 'Accept settings')
		},

		hasUnsavedPassword() {
			return this.mutableShare.password !== this.share.password
		},

		passwordExpirationTime() {
			if (
				this.share.passwordExpirationTime === null
				|| this.share.passwordExpirationTime === undefined
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

		isEmailShareType() {
			return this.share
				? this.share.type === ShareType.Email
				: false
		},

		canChangeHideDownload() {
			const shareAttributes = this.fileInfo.shareAttributes ?? []

			return shareAttributes.some(
				shareAttribute =>
					shareAttribute.key === 'download'
					&& shareAttribute.scope === 'permissions'
					&& shareAttribute.enabled === false,
			)
		},

		errorPasswordLabel() {
			if (this.passwordError) {
				return t(
					'nmcsharing',
					'Password must be at least 6 characters long',
				)
			}

			return undefined
		},
	},

	beforeMount() {
		this.initializePermissions()
		this.initializeAttributes()
	},

	methods: {
		updateAtomicPermissions({
			isReadChecked = this.hasRead,
			isEditChecked = this.canEdit,
			isCreateChecked = this.canCreate,
			isDeleteChecked = this.canDelete,
			isReshareChecked = this.canReshare,
			isDownloadChecked = this.canDownload,
		} = {}) {
			const permissions = 0
				| (isReadChecked ? ATOMIC_PERMISSIONS.READ : 0)
				| (isCreateChecked ? ATOMIC_PERMISSIONS.CREATE : 0)
				| (isDeleteChecked ? ATOMIC_PERMISSIONS.DELETE : 0)
				| (isEditChecked ? ATOMIC_PERMISSIONS.UPDATE : 0)
				| (isReshareChecked ? ATOMIC_PERMISSIONS.SHARE : 0)

			this.share.permissions = permissions

			if (
				this.share.hasDownloadPermission
				!== isDownloadChecked
			) {
				this.$set(
					this.share,
					'hasDownloadPermission',
					isDownloadChecked,
				)
			}
		},

		initializeAttributes() {
			this.writeNoteToRecipientIsChecked = false
			this.passwordError = false

			if (this.isValidShareAttribute(this.share.note)) {
				this.writeNoteToRecipientIsChecked = true
			}

			if (this.isValidShareAttribute(this.share.password)) {
				this.mutableShare.password = this.share.password
			}

			if (this.isValidShareAttribute(this.share.expireDate)) {
				this.mutableShare.expireDate = this.share.expireDate
			}

			if (!this.share.shareSet) {
				this.mutableShare.expireDate = this.formatDateToString(
					this.defaultExpiryDate,
				)
			}
		},

		initializePermissions() {
			if (this.share.share_type !== undefined) {
				this.share.type = this.share.share_type
			}

			// ShareType.User === 0, therefore we must not use a truthy check.
			if ('shareType' in this.share) {
				this.share.type = this.share.shareType
			}

			if (this.isNewShare) {
				this.sharingPermission = BUNDLED_PERMISSIONS.READ_ONLY.toString()
				return
			}

			if (this.canReshare) {
				this.sharingPermission = (
					this.share.permissions
					& ~ATOMIC_PERMISSIONS.SHARE
				).toString()
			} else {
				this.sharingPermission = this.share.permissions.toString()
			}
		},

		saveShareSettings() {
			const sharePermissionsSet = Number.parseInt(
				this.sharingPermission,
				10,
			)

			if (Number.isNaN(sharePermissionsSet)) {
				return
			}

			this.share.permissions = sharePermissionsSet

			if (
				!this.isFolder
				&& this.share.permissions === BUNDLED_PERMISSIONS.ALL
			) {
				this.share.permissions = BUNDLED_PERMISSIONS.ALL_FILE
			}

			if (
				this.allowResharingIsChecked
				&& !this.canReshare
				&& this.resharingAllowedGlobal
			) {
				this.share.permissions |= ATOMIC_PERMISSIONS.SHARE
			} else if (
				(!this.isPublicShare || this.isMixedShare)
				&& this.canReshare
				&& !this.allowResharingIsChecked
			) {
				this.share.permissions &= ~ATOMIC_PERMISSIONS.SHARE
			}

			if (!this.writeNoteToRecipientIsChecked) {
				this.mutableShare.note = ''
			}

			if (!this.hasExpirationDate) {
				this.mutableShare.expireDate = ''
			}

			if (this.isPasswordProtected) {
				if (
					!this.isValidShareAttribute(
						this.mutableShare.password,
					)
					&& this.isPasswordEnforced
				) {
					this.passwordError = true
					return
				}
			} else {
				this.mutableShare.password = ''
			}

			this.share.label = this.mutableShare.label
			this.share.password = this.mutableShare.password
			this.share.expireDate = this.mutableShare.expireDate
			this.share.note = this.mutableShare.note
			this.share.shareSet = true

			this.$emit('save:share', this.share)
		},

		onPasswordChange(password) {
			this.mutableShare.password = password

			if (!password) {
				this.passwordError = this.isPasswordEnforced
				return
			}

			this.passwordError = password.length < 6
				|| !this.isValidShareAttribute(password)
		},

		onExpirationDateChange(date) {
			try {
				if (
					!(date instanceof Date)
					|| Number.isNaN(date.getTime())
					|| date.getFullYear() <= 99
				) {
					return
				}

				this.mutableShare.expireDate = this.formatDateToString(
					date,
				)
			} catch (error) {
				console.error(
					'[nmcsharing] Invalid expiration date',
					error,
				)
			}
		},

		isValidShareAttribute(value) {
			if (value === null || value === undefined) {
				return false
			}

			if (typeof value === 'string') {
				return value.trim().length > 0
			}

			return true
		},
	},
}
</script>

<style scoped lang="scss">
.header-permissions {
	display: flex;
	flex-direction: row;
	align-items: center;

	.back-button {
		padding: 4px;

		&:hover {
			background-color: initial;
			cursor: pointer;
		}
	}
}

.checkbox-text {
	display: flex;
	flex-direction: row;
	align-items: center;

	.checkbox-switch {
		margin-right: -8px;
	}
}

.sharingPopupDetailsView {
	position: absolute;
	z-index: 10;
	top: 0;
	left: 0;
	min-width: calc(100% - 3rem);
	min-height: calc(100% - 3rem);
	padding: 1.5rem;
	border-radius: var(--border-radius-large);
	background-color: var(--color-main-background);

	&__header {
		font-weight: bold;
	}

	&__quick-permissions {
		display: flex;
		width: 100%;
		margin-top: 1rem;
	}

	&__advanced-control {
		width: 100%;
		margin-top: 1rem;
	}

	&__advanced {
		width: 100%;
		margin-bottom: 0.5em;
		padding-left: 0;
		text-align: left;

		section {
			textarea,
			div.mx-datepicker {
				width: 100%;
			}

			textarea {
				height: 80px;

				&:hover {
					cursor: text;
				}
			}

			span.checkbox-radio-switch-checkbox {
				.checkbox-radio-switch__label {
					padding-left: 0;
				}

				::v-deep label {
					padding-left: 0 !important;
					border: none !important;
					background-color: initial !important;
				}
			}

			section.custom-permissions-group {
				padding-left: 1.5em;
			}
		}
	}

	&__footer {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		justify-content: space-between;
		width: 100%;

		.button-group {
			display: flex;
			justify-content: flex-end;
			width: 100%;
			margin-top: 1rem;
			gap: 1rem;

			.button-details {
				padding: 0 1.5rem !important;
			}
		}
	}

	.sharingPopup__fileinfo {
		font-size: var(--font-size-small);
	}

	#share-date-picker,
	#share-password-input {
		position: relative;
		height: 44px;

		&::-webkit-calendar-picker-indicator {
			position: absolute;
			top: 50%;
			right: 6px;
			width: 1.5rem;
			transform: translateY(-50%);
			cursor: pointer;
		}
	}
}
</style>
