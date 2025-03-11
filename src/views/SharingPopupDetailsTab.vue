<template>
	<div class="sharingPopupDetailsView">
		<span class="header-permissions">
			<ChevronLeftIcon :size="20" class="back-button" @click="$emit('close-sharing-details')" />
			<h2 class="sharingTabDetailsView__header">
				{{ t('nmcsharing', 'Permissions') }}
			</h2>
		</span>

		<span class="sharingPopup__fileinfo">{{ fileInfo.name }} ⸱ {{ size }}</span>

		<div class="sharingTabDetailsView__quick-permissions">
			<div>
				<span class="checkbox-text">
					<NcCheckboxRadioSwitch :checked.sync="sharingPermission"
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
					<NcCheckboxRadioSwitch :checked.sync="sharingPermission"
						:disabled="!isPermissionEditAllowed"
						:value="isFolder ? bundledPermissions.ALL.toString() : bundledPermissions.ALL_FILE.toString()"
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
				<NcCheckboxRadioSwitch v-if="allowsFileDrop"
					:checked.sync="sharingPermission"
					:disabled="isMixedShare"
					:value="bundledPermissions.FILE_DROP.toString()"
					name="sharing_permission_radio"
					type="radio">
					{{ t('nmcsharing', 'File drop (upload only)') }}
				</NcCheckboxRadioSwitch>
				<p v-if="allowsFileDrop" class="sharing_permission-desc">
					{{ t('nmcsharing', 'With File drop, only uploading is allowed. Only you can see files and folders that have been uploaded.') }}
				</p>
				<p v-if="isMixedShare" class="sharing_permission-desc">
					{{ t('nmcsharing', 'Please note that file drop is not available for internal sharing, i.e. sharing with other MagentaCLOUD users.') }}
				</p>
			</div>
		</div>
		<div class="sharingTabDetailsView__advanced-control">
			<strong>{{ t('nmcsharing', 'Advanced settings') }}</strong>
		</div>
		<div class="sharingTabDetailsView__advanced">
			<section>
				<NcCheckboxRadioSwitch v-if="(isPublicShare || isMixedShare) && false"
					:disabled="canChangeHideDownload"
					:checked.sync="mutableShare.hideDownload"
					@update:checked="queueUpdate('hideDownload')">
					{{ t('files_sharing', 'Hide download') }}
				</NcCheckboxRadioSwitch>
				<template v-if="isPublicShare || isMixedShare">
					<NcCheckboxRadioSwitch :checked.sync="isPasswordProtected" :disabled="isPasswordEnforced">
						{{ t('nmcsharing', 'Set password') }}
					</NcCheckboxRadioSwitch>
					<NcPasswordField v-if="isPasswordProtected"
						id="share-password-input"
						:value="mutableShare.password"
						:error="passwordError"
						:helper-text="errorPasswordLabel"
						:required="isPasswordEnforced"
						@update:value="onPasswordChange" />
				</template>
				<NcCheckboxRadioSwitch :checked.sync="hasExpirationDate" :disabled="isExpiryDateEnforced">
					{{ isExpiryDateEnforced
						? t('files_sharing', 'Expiration date (enforced)')
						: t('files_sharing', 'Set expiration date') }}
				</NcCheckboxRadioSwitch>
				<NcDateTimePickerNative v-if="hasExpirationDate" 
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
				<NcCheckboxRadioSwitch v-if="isEmailShare || isMixedShare" :checked.sync="writeNoteToRecipientIsChecked">
					{{ t('files_sharing', 'Note to recipient') }}
				</NcCheckboxRadioSwitch>
				<template v-if="writeNoteToRecipientIsChecked && (isEmailShare || isMixedShare)">
					<textarea :value="mutableShare.note" @input="mutableShare.note = $event.target.value" />
				</template>
				<NcCheckboxRadioSwitch v-if="(!isPublicShare || isMixedShare) && resharingAllowedGlobal"
					:disabled="isMixedShare"
					:checked.sync="allowResharingIsChecked"
					:title="t('nmcsharing', 'Please note that resharing is only available for internal sharing, i.e. sharing with other MagentaCLOUD users.')">
					{{ t('nmcsharing', 'Allow resharing') }}
				</NcCheckboxRadioSwitch>
			</section>
		</div>

		<div class="sharingTabDetailsView__footer">
			<div class="button-group">
				<NcButton class="button-details" @click="$emit('close-sharing-details')">
					{{ t('files_sharing', 'Cancel') }}
				</NcButton>
				<NcButton class="button-details"
					type="primary"
					:disabled="passwordError"
					@click="saveShareSettings">
					{{ shareButtonText }}
				</NcButton>
			</div>
		</div>
	</div>
</template>

<script>
import EyeIcon from 'vue-material-design-icons/EyeCircleOutline.vue'
import PencilIcon from 'vue-material-design-icons/Pencil.vue'
import ChevronLeftIcon from 'vue-material-design-icons/ChevronLeftCircleOutline.vue'

import NcButton from '@nextcloud/vue/dist/Components/NcButton.js'
import NcDateTimePickerNative from '@nextcloud/vue/dist/Components/NcDateTimePickerNative.js'
import NcCheckboxRadioSwitch from '@nextcloud/vue/dist/Components/NcCheckboxRadioSwitch.js'
import NcPasswordField from '@nextcloud/vue/dist/Components/NcPasswordField.js'

import GeneratePassword from '../utils/GeneratePassword.js'
import ShareRequests from '../mixins/ShareRequests.js'
import ShareTypes from '../mixins/ShareTypes.js'
import SharesMixin from '../mixins/SharesMixin.js'

import { formatFileSize } from '@nextcloud/files'

import {
	ATOMIC_PERMISSIONS,
	BUNDLED_PERMISSIONS,
	hasPermissions,
} from '../lib/SharePermissionsToolBox.js'

export default {
	name: 'SharingPopupDetailsTab',
	components: {
		EyeIcon,
		PencilIcon,
		ChevronLeftIcon,
		NcButton,
		NcDateTimePickerNative,
		NcCheckboxRadioSwitch,
		NcPasswordField,
	},
	mixins: [ShareTypes, ShareRequests, SharesMixin],
	props: {
		shareRequestValue: {
			type: Object,
			required: false,
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
			allowResharingIsChecked: this.share.hasSharePermission,
			passwordError: false,
			writeNoteToRecipientIsChecked: false,
			bundledPermissions: BUNDLED_PERMISSIONS,
			sharingPermission: BUNDLED_PERMISSIONS.ALL.toString(),
			mutableShare: {
				note: this.share.note,
				password: this.share.password,
				expireDate: this.share.expireDate,
				label: this.share.label,
			},
		}
	},

	computed: {
		size() {
			const size = parseInt(this.fileInfo.size, 10)
			if (typeof size !== 'number' || isNaN(size) || size < 0) {
				return this.t('files', 'Pending')
			}
			return formatFileSize(size, true)
		},
		title() {
			let title = t('files_sharing', 'Share with ')
			if (this.share.type === this.SHARE_TYPES.SHARE_TYPE_USER) {
				title = title + this.share.shareWithDisplayName
			} else if (this.share.type === this.SHARE_TYPES.SHARE_TYPE_LINK) {
				title = t('files_sharing', 'Share link')
			}

			return title
		},
		/**
		 * Can the sharee edit the shared file ?
		 */
		canEdit: {
			get() {
				return this.share.hasUpdatePermission
			},
			set(checked) {
				this.updateAtomicPermissions({ isEditChecked: checked })
			},
		},
		/**
		 * Can the sharee create the shared file ?
		 */
		canCreate: {
			get() {
				return this.share.hasCreatePermission
			},
			set(checked) {
				this.updateAtomicPermissions({ isCreateChecked: checked })
			},
		},
		/**
		 * Can the sharee delete the shared file ?
		 */
		canDelete: {
			get() {
				return this.share.hasDeletePermission
			},
			set(checked) {
				this.updateAtomicPermissions({ isDeleteChecked: checked })
			},
		},
		/**
		 * Can the sharee reshare the file ?
		 */
		canReshare: {
			get() {
				return this.share.hasSharePermission
			},
			set(checked) {
				this.updateAtomicPermissions({ isReshareChecked: checked })
			},
		},
		/**
		 * Can the sharee download files or only view them ?
		 */
		canDownload: {
			get() {
				return this.share.hasDownloadPermission
			},
			set(checked) {
				this.updateAtomicPermissions({ isDownloadChecked: checked })
			},
		},
		/**
		 * Is this share readable
		 * Needed for some federated shares that might have been added from file drop links
		 */
		hasRead: {
			get() {
				return this.share.hasReadPermission
			},
			set(checked) {
				this.updateAtomicPermissions({ isReadChecked: checked })
			},
		},
		/**
		 * Does the current share have an expiration date
		 *
		 * @return {boolean}
		 */
		hasExpirationDate: {
			get() {
				return this.isValidShareAttribute(this.mutableShare.expireDate)
			},
			set(enabled) {
				if (enabled) {
					if (this.share.expireDate) {
						this.mutableShare.expireDate = this.share.expireDate
					} else {
						this.mutableShare.expireDate = this.formatDateToString(this.defaultExpiryDate)
					}
				} else {
					this.mutableShare.expireDate = ''
				}
			},
		},
		/**
		 * Is the current share password protected ?
		 *
		 * @return {boolean}
		 */
		isPasswordProtected: {
			get() {
				return this.config.enforcePasswordForPublicLink
					|| !!this.mutableShare.password
			},
			async set(enabled) {
				if (enabled) {
					if (this.share.password) {
						this.mutableShare.password = this.share.password
					} else {
						this.mutableShare.password = await GeneratePassword()
					}
				} else {
					this.mutableShare.password = ''
				}
				this.passwordError = false
			},
		},
		/**
		 * Is the current share a folder ?
		 *
		 * @return {boolean}
		 */
		isFolder() {
			return this.fileInfo.type === 'dir'
		},
		dateMaxEnforced() {
			if (!this.isRemote && this.config.isDefaultInternalExpireDateEnforced) {
				return new Date(new Date().setDate(new Date().getDate() + 1 + this.config.defaultInternalExpireDate))
			} else if (this.config.isDefaultRemoteExpireDateEnforced) {
				return new Date(new Date().setDate(new Date().getDate() + 1 + this.config.defaultRemoteExpireDate))
			}
			return null
		},
		isPasswordEnforced() {
			return this.isPublicShare && this.config.enforcePasswordForPublicLink
		},
		isExpiryDateEnforced() {
			return this.config.isDefaultInternalExpireDateEnforced
		},
		defaultExpiryDate() {
			if ((this.isGroupShare || this.isUserShare) && this.config.isDefaultInternalExpireDateEnabled) {
				return new Date(this.config.defaultInternalExpirationDate)
			} else if (this.isRemoteShare && this.config.isDefaultRemoteExpireDateEnabled) {
				return new Date(this.config.defaultRemoteExpireDateEnabled)
			} else if (this.isPublicShare && this.config.isDefaultExpireDateEnabled) {
				return new Date(this.config.defaultExpirationDate)
			}
			return new Date(new Date().setFullYear(new Date().getFullYear() + 1))
		},
		isUserShare() {
			return this.share.type === this.SHARE_TYPES.SHARE_TYPE_USER
		},
		isGroupShare() {
			return this.share.type === this.SHARE_TYPES.SHARE_TYPE_GROUP
		},
		isLinkShare() {
			return this.share.type === this.SHARE_TYPES.SHARE_TYPE_LINK
		},
		isEmailShare() {
			return this.share.type === this.SHARE_TYPES.SHARE_TYPE_EMAIL
		},
		isRemoteShare() {
			return this.share.type === this.SHARE_TYPES.SHARE_TYPE_REMOTE_GROUP || this.share.type === this.SHARE_TYPES.SHARE_TYPE_REMOTE
		},
		isNewShare() {
			return this.share.shareSet === null || this.share.shareSet === undefined || this.share.shareSet === false
		},
		allowsFileDrop() {
			if (this.isFolder) {
				if (this.share.type === this.SHARE_TYPES.SHARE_TYPE_LINK || this.share.type === this.SHARE_TYPES.SHARE_TYPE_EMAIL || this.shareType === 'MIXED') {
					return true
				}
			}
			return false
		},
		shareButtonText() {
			return t('nmcsharing', 'Accept settings')
		},
		// if password in mutableShare differs then it means
		// the user deleted the original password
		hasUnsavedPassword() {
			return this.mutableShare.password !== this.share.password
		},
		passwordExpirationTime() {
			if (this.share.passwordExpirationTime === null || this.share.passwordExpirationTime === undefined) {
				return null
			}

			const expirationTime = moment(this.share.passwordExpirationTime)

			if (expirationTime.diff(moment()) < 0) {
				return false
			}

			return expirationTime.fromNow()
		},
		/**
		 * Is the current share an email share ?
		 *
		 * @return {boolean}
		 */
		isEmailShareType() {
			return this.share
				? this.share.type === this.SHARE_TYPES.SHARE_TYPE_EMAIL
				: false
		},
		/**
		 * Is the current share a mixed share ?
		 *
		 * @return {boolean}
		 */
		isMixedShare() {
			return this.shareType === 'MIXED'
		},
		canChangeHideDownload() {
			const hasDisabledDownload = (shareAttribute) => shareAttribute.key === 'download' && shareAttribute.scope === 'permissions' && shareAttribute.enabled === false
			return this.fileInfo.shareAttributes.some(hasDisabledDownload)
		},
		errorPasswordLabel() {
			if (this.passwordError) {
				return t('nmcsharing', 'Password must be at least 6 characters long')
			}
			return undefined
		},
	},

	beforeMount() {
		this.initializePermissions()
		this.initializeAttributes()
		// console.debug('shareSentIn', this.share)
		// console.debug('config', this.config)
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
			// calc permissions if checked
			const permissions = 0
				| (isReadChecked ? ATOMIC_PERMISSIONS.READ : 0)
				| (isCreateChecked ? ATOMIC_PERMISSIONS.CREATE : 0)
				| (isDeleteChecked ? ATOMIC_PERMISSIONS.DELETE : 0)
				| (isEditChecked ? ATOMIC_PERMISSIONS.UPDATE : 0)
				| (isReshareChecked ? ATOMIC_PERMISSIONS.SHARE : 0)
			this.share.permissions = permissions
			if (this.share.hasDownloadPermission !== isDownloadChecked) {
				this.$set(this.share, 'hasDownloadPermission', isDownloadChecked)
			}
		},

		initializeAttributes() {
			this.writeNoteToRecipientIsChecked = false
			this.isPasswordProtected = false
			this.hasExpirationDate = false
			if (this.isValidShareAttribute(this.share.note)) {
				this.writeNoteToRecipientIsChecked = true
			}
			if (this.isValidShareAttribute(this.share.password)) {
				this.isPasswordProtected = true
			}
			if (this.isValidShareAttribute(this.share.expireDate)) {
				this.hasExpirationDate = true
			}
		},

		initializePermissions() {
			if (this.share.share_type) {
				this.share.type = this.share.share_type
			}
			// shareType 0 (USER_SHARE) would evaluate to zero
			// Hence the use of hasOwnProperty
			if ('shareType' in this.share) {
				this.share.type = this.share.shareType
			}

			if (this.isNewShare) {
				this.sharingPermission = BUNDLED_PERMISSIONS.READ_ONLY.toString()
			} else {
				if (this.canReshare) {
					this.sharingPermission = (this.share.permissions & ~ATOMIC_PERMISSIONS.SHARE).toString()
				} else {
					this.sharingPermission = this.share.permissions.toString()
				}
			}
		},

		async saveShareSettings() {
			const permissionsAndAttributes = ['permissions', 'attributes', 'note', 'expireDate']
			const publicShareAttributes = ['label', 'password', 'hideDownload']
			if (this.isPublicShare || this.isMixedShare) {
				permissionsAndAttributes.push(...publicShareAttributes)
			}
			const sharePermissionsSet = parseInt(this.sharingPermission)

			this.share.permissions = sharePermissionsSet

			if (!this.isFolder && this.share.permissions === BUNDLED_PERMISSIONS.ALL) {
				// It's not possible to create an existing file.
				this.share.permissions = BUNDLED_PERMISSIONS.ALL_FILE
			}

			// add SHARE permission if share doesn't have it, 'Allow resharing' is checked and Resharing is enabled globally
			if (this.allowResharingIsChecked && !this.canReshare && this.resharingAllowedGlobal) {
				this.share.permissions |= ATOMIC_PERMISSIONS.SHARE
			// remove SHARE permission if internal share, 'Allow resharing' is unchecked and it initially had SHARE permission
			} else if ((!this.isPublicShare || this.isMixedShare) && this.canReshare && !this.allowResharingIsChecked) {
				this.share.permissions = this.share.permissions & ~ATOMIC_PERMISSIONS.SHARE
			}

			if (!this.writeNoteToRecipientIsChecked) {
				this.mutableShare.note = ''
			}

			if (!this.hasExpirationDate) {
				this.mutableShare.expireDate = ''
			}

			if (this.isPasswordProtected) {
				if (!this.isValidShareAttribute(this.mutableShare.password) && this.isPasswordEnforced) {
					this.passwordError = true
					return
				}
				this.mutableShare.password = this.mutableShare.password || ''
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

		/**
		 * Update newPassword values
		 * of share. If password is set but not newPassword
		 * then the user did not changed the password
		 * If both co-exists, the password have changed and
		 * we show it in plain text.
		 * Then on submit (or menu close), we sync it.
		 *
		 * @param {string} password the changed password
		 */
		onPasswordChange(password) {
			if (password.length < 6) {
				this.passwordError = true
				return
			}
			this.passwordError = !this.isValidShareAttribute(password)
			this.mutableShare.password = password
		},

		/**
		 * Save given value to expireDate and trigger queueUpdate
		 *
		 * @param {Date} date
		 */
		 onExpirationDateChange(date) {
			try {
				// Date.UTC marks years between 0 and 99 as '1900 + year' forcing error and incorrect date value
				// thus we need to skip formatting while user is typing year in the input field
				if (date.getFullYear() <= 99) return
				this.mutableShare.expireDate = this.formatDateToString(new Date(date))
			} catch (error) {}
		},

		isValidShareAttribute(value) {
			if ([null, undefined].includes(value)) {
				return false
			}

			if (!(value.trim().length > 0)) {
				return false
			}

			return true
		},
		formatFileSize,
	},
}
</script>

<style lang="scss">
.header-permissions {
	margin-top: -14px;
	display: flex;
	flex-direction: row;
	align-items: center;

	.back-button {
		padding: 4px;

		&:hover {
				color: var(--telekom-color-primary-hovered);
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
    padding: 1.5rem;
    position: absolute;
    z-index: 10;
    background: var(--telekom-color-background-surface);
    top: 0;
    left: 0;
    min-width: calc(100% - 3rem);
    min-height: calc(100% - 3rem);
	border-radius: var(--border-radius-large);

	.sharingPopup__fileinfo {
		color: var(--telekom-color-ui-regular);
	}

	&__header {
		font-weight: bold;
	}

	&__quick-permissions {
		display: flex;
		width: 100%;
		margin-top: 1rem;

		.sharing_permission-desc {
			color: var(--telekom-color-ui-regular);
		}
	}

	&__advanced-control {
		width: 100%;
		margin-top: 1rem;
	}

	&__advanced {
		width: 100%;
		margin-bottom: 0.5em;
		text-align: left;
		padding-left: 0;

		section {

			textarea,
			div.mx-datepicker {
				width: 100%;
			}

			textarea {
				height: 80px;
				border: var(--telekom-spacing-composition-space-01) solid var(--telekom-color-ui-border-standard);
				border-radius: var(--telekom-radius-small);
				&:hover {
					cursor: text;
				}
			}

			/*
              The following style is applied out of the component's scope
              to remove padding from the label.checkbox-radio-switch__label,
              which is used to group radio checkbox items. The use of ::v-deep
              ensures that the padding is modified without being affected by
              the component's scoping.
              Without this achieving left alignment for the checkboxes would not
              be possible.
            */
			span.checkbox-radio-switch-checkbox {
				.checkbox-radio-switch__label {
					padding-left: 0px;
				}
				::v-deep label {
					padding-left: 0 !important;
					background-color: initial !important;
					border: none !important;
				}
			}

			section.custom-permissions-group {
				padding-left: 1.5em;
			}
		}
	}

	&__footer {
		width: 100%;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		align-items: flex-start;

		.button-group {
			display: flex;
			width: 100%;
			gap: 1rem;
			justify-content: end;
			margin-top: 1rem;

			.button-details {
				padding: 0 1.5rem !important;
			}
		}
	}

	#share-date-picker, #share-password-input {
		border: var(--telekom-spacing-composition-space-01) solid var(--telekom-color-ui-border-standard);
		height: 44px;
		position: relative;

		&::-webkit-calendar-picker-indicator {
			//display: none;
			position: absolute;
			right: 6px;
			top: 50%;
			transform: translateY(-50%);
			cursor: pointer;
			width: 1.5rem;
		}
	}

	#btn-advanced {
		all: unset;
		position: relative;
		font: var(--telekom-text-style-ui-bold);

		&:hover {
			color: var(--telekom-color-primary-hovered);
			background-color: initial;
			cursor: pointer;
			&::after {
				border-bottom-color: var(--color-primary);
			}
		}

		&::after {
			content: '';
			border-left: 5px solid transparent;
			border-right: 5px solid transparent;
			border-bottom: 5px solid var(--color-main-text);
			position: absolute;
			top: calc(50% - 2px);
			margin-left: 4px;
		}

		// rotate arrow when opened
		&.open::after {
			transform: rotate(0.5turn);
		}
	}
}
</style>
