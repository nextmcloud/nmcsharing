<template>
	<div class="sharingPopupDetailsView">
		<h2 class="sharingTabDetailsView__header" style="margin-bottom: 0;">
			{{ t('nmcsharing', 'Permissions') }}
		</h2>

		<span class="sharingPopup__fileinfo">{{ fileInfo.name }} ⸱ {{ size }}</span>

		<div class="sharingTabDetailsView__quick-permissions">
			<div>
				<NcCheckboxRadioSwitch :checked.sync="sharingPermission"
					:disabled="!isPermissionEditAllowed"
					:value="bundledPermissions.READ_ONLY.toString()"
					name="sharing_permission_radio"
					type="radio"
					@update:checked="toggleCustomPermissions">
					{{ t('nmcsharing', 'Read only') }}
				</NcCheckboxRadioSwitch>
				<NcCheckboxRadioSwitch :checked.sync="sharingPermission"
					:disabled="!isPermissionEditAllowed"
					:value="isFolder ? bundledPermissions.ALL.toString() : bundledPermissions.ALL_FILE.toString()"
					name="sharing_permission_radio"
					type="radio"
					@update:checked="toggleCustomPermissions">
					{{ isFolder ? t('nmcsharing', 'Read, write and upload') : t('nmcsharing', 'Read and write') }}
				</NcCheckboxRadioSwitch>
				<NcCheckboxRadioSwitch v-if="allowsFileDrop"
					:checked.sync="sharingPermission"
					:value="bundledPermissions.FILE_DROP.toString()"
					name="sharing_permission_radio"
					type="radio"
					@update:checked="toggleCustomPermissions">
					{{ t('nmcsharing', 'File drop (upload only)') }}
				</NcCheckboxRadioSwitch>
				<p v-if="allowsFileDrop" class="sharing_permission-desc">
					{{ t('nmcsharing', 'With File drop, only uploading is allowed. Only you can see files and folders that have been uploaded.') }}
				</p>
			</div>
		</div>
		<div class="sharingTabDetailsView__advanced-control">
			<button id="btn-advanced"
				type="button"
				:class="{ open: advancedSectionAccordionExpanded }"
				@click="advancedSectionAccordionExpanded = !advancedSectionAccordionExpanded">
				{{ t('nmcsharing', 'Advanced') }}
			</button>
		</div>
		<div v-if="advancedSectionAccordionExpanded" class="sharingTabDetailsView__advanced">
			<section>
				<NcCheckboxRadioSwitch v-if="isPublicShare"
					:disabled="canChangeHideDownload"
					:checked.sync="share.hideDownload"
					@update:checked="queueUpdate('hideDownload')">
					{{ t('files_sharing', 'Hide download') }}
				</NcCheckboxRadioSwitch>
				<template v-if="isPublicShare">
					<NcCheckboxRadioSwitch :checked.sync="isPasswordProtected" :disabled="isPasswordEnforced">
						{{ t('nmcsharing', 'Set password') }}
					</NcCheckboxRadioSwitch>
					<NcInputField v-if="isPasswordProtected"
						:type="hasUnsavedPassword ? 'text' : 'password'"
						:value="hasUnsavedPassword ? mutableShare.password : '***************'"
						:error="passwordError"
						:required="isPasswordEnforced"
						@update:value="onPasswordChange" />

					<!-- Migrate icons and remote -> icon="icon-info"-->
					<span v-if="isEmailShareType && passwordExpirationTime" icon="icon-info">
						{{ t('files_sharing', 'Password expires {passwordExpirationTime}', { passwordExpirationTime }) }}
					</span>
					<span v-else-if="isEmailShareType && passwordExpirationTime !== null" icon="icon-error">
						{{ t('files_sharing', 'Password expired') }}
					</span>
				</template>
				<NcCheckboxRadioSwitch :checked.sync="hasExpirationDate" :disabled="isExpiryDateEnforced">
					{{ isExpiryDateEnforced
						? t('files_sharing', 'Expiration date (enforced)')
						: t('files_sharing', 'Set expiration date') }}
				</NcCheckboxRadioSwitch>
				<NcDateTimePickerNative v-if="hasExpirationDate"
					id="share-date-picker"
					:value="new Date(share.expireDate)"
					:min="dateTomorrow"
					:max="dateMaxEnforced"
					:hide-label="true"
					:disabled="isExpiryDateEnforced"
					:placeholder="t('files_sharing', 'Expiration date')"
					type="date"
					@input="onExpirationChange" />
				<NcCheckboxRadioSwitch v-if="isEmailShare" :checked.sync="writeNoteToRecipientIsChecked">
					{{ t('files_sharing', 'Note to recipient') }}
				</NcCheckboxRadioSwitch>
				<template v-if="writeNoteToRecipientIsChecked && isEmailShare">
					<textarea :value="mutableShare.note" @input="mutableShare.note = $event.target.value" />
				</template>
				<DownloadLimit v-if="(isLinkShare || isEmailShare) && !isNewShare && !isFolder"
					:share="share"
					:file-info="fileInfo" />
				<NcCheckboxRadioSwitch v-if="!isPublicShare && resharingAllowedGlobal"
					:checked.sync="allowResharingIsChecked">
					{{ t('nmcsharing', 'Allow resharing') }}
				</NcCheckboxRadioSwitch>
			</section>
		</div>

		<div class="sharingTabDetailsView__footer">
			<div class="button-group">
				<NcButton class="button-details" @click="$emit('close-sharing-details')">
					{{ t('files_sharing', 'Cancel') }}
				</NcButton>
				<NcButton class="button-details" type="primary" @click="saveShareSettings">
					{{ shareButtonText }}
				</NcButton>
			</div>
		</div>
	</div>
</template>

<script>
import NcButton from '@nextcloud/vue/dist/Components/NcButton.js'
import NcInputField from '@nextcloud/vue/dist/Components/NcInputField.js'
import NcDateTimePickerNative from '@nextcloud/vue/dist/Components/NcDateTimePickerNative.js'
import NcCheckboxRadioSwitch from '@nextcloud/vue/dist/Components/NcCheckboxRadioSwitch.js'

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
import DownloadLimit from '../components/DownloadLimit.vue'

export default {
	name: 'SharingInputDetailsTab',
	components: {
		NcButton,
		NcInputField,
		NcDateTimePickerNative,
		NcCheckboxRadioSwitch,
		DownloadLimit,
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
		resharingAllowedGlobal: {
			type: Boolean,
			required: true,
		},
	},
	data() {
		return {
			allowResharingIsChecked: this.share.hasSharePermission,
			passwordError: false,
			setCustomPermissions: false,
			writeNoteToRecipientIsChecked: false,
			advancedSectionAccordionExpanded: true,
			bundledPermissions: BUNDLED_PERMISSIONS,
			sharingPermission: BUNDLED_PERMISSIONS.ALL.toString(),
			mutableShare: {
				note: this.share.note,
				password: this.share.password,
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
				return !!this.share.expireDate || this.config.isDefaultInternalExpireDateEnforced
			},
			set(enabled) {
				this.share.expireDate = enabled
					? this.formatDateToString(this.defaultExpiryDate)
					: ''
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
				this.mutableShare.password = enabled ? await GeneratePassword() : ''
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
			return new Date(new Date().setDate(new Date().getDate() + 1))
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
				if (this.share.type === this.SHARE_TYPES.SHARE_TYPE_LINK || this.share.type === this.SHARE_TYPES.SHARE_TYPE_EMAIL) {
					return true
				}
			}
			return false
		},
		hasFileDropPermissions() {
			return this.share.permissions === this.bundledPermissions.FILE_DROP
		},
		shareButtonText() {
			return t('nmcsharing', 'Accept settings')
		},
		/**
		 * Can the sharer set whether the sharee can edit the file ?
		 *
		 * @return {boolean}
		 */
		canSetEdit() {
			// If the owner revoked the permission after the resharer granted it
			// the share still has the permission, and the resharer is still
			// allowed to revoke it too (but not to grant it again).
			return (this.fileInfo.sharePermissions & OC.PERMISSION_UPDATE) || this.canEdit
		},
		/**
		 * Can the sharer set whether the sharee can create the file ?
		 *
		 * @return {boolean}
		 */
		canSetCreate() {
			// If the owner revoked the permission after the resharer granted it
			// the share still has the permission, and the resharer is still
			// allowed to revoke it too (but not to grant it again).
			return (this.fileInfo.sharePermissions & OC.PERMISSION_CREATE) || this.canCreate
		},
		/**
		 * Can the sharer set whether the sharee can delete the file ?
		 *
		 * @return {boolean}
		 */
		canSetDelete() {
			// If the owner revoked the permission after the resharer granted it
			// the share still has the permission, and the resharer is still
			// allowed to revoke it too (but not to grant it again).
			return (this.fileInfo.sharePermissions & OC.PERMISSION_DELETE) || this.canDelete
		},
		/**
		 * Can the sharer set whether the sharee can reshare the file ?
		 *
		 * @return {boolean}
		 */
		canSetReshare() {
			// If the owner revoked the permission after the resharer granted it
			// the share still has the permission, and the resharer is still
			// allowed to revoke it too (but not to grant it again).
			return (this.fileInfo.sharePermissions & OC.PERMISSION_SHARE) || this.canReshare
		},
		/**
		 * Can the sharer set whether the sharee can download the file ?
		 *
		 * @return {boolean}
		 */
		canSetDownload() {
			// If the owner revoked the permission after the resharer granted it
			// the share still has the permission, and the resharer is still
			// allowed to revoke it too (but not to grant it again).
			return (this.fileInfo.canDownload() || this.canDownload)
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
		canChangeHideDownload() {
			const hasDisabledDownload = (shareAttribute) => shareAttribute.key === 'download' && shareAttribute.scope === 'permissions' && shareAttribute.enabled === false
			return this.fileInfo.shareAttributes.some(hasDisabledDownload)
		},
		customPermissionsList() {
			const perms = []
			if (hasPermissions(this.share.permissions, ATOMIC_PERMISSIONS.READ)) {
				perms.push('read')
			}
			if (hasPermissions(this.share.permissions, ATOMIC_PERMISSIONS.CREATE)) {
				perms.push('create')
			}
			if (hasPermissions(this.share.permissions, ATOMIC_PERMISSIONS.UPDATE)) {
				perms.push('update')
			}
			if (hasPermissions(this.share.permissions, ATOMIC_PERMISSIONS.DELETE)) {
				perms.push('delete')
			}
			if (hasPermissions(this.share.permissions, ATOMIC_PERMISSIONS.SHARE)) {
				perms.push('share')
			}
			if (this.share.hasDownloadPermission) {
				perms.push('download')
			}
			const capitalizeFirstAndJoin = array => array.map((item, index) => index === 0 ? item[0].toUpperCase() + item.substring(1) : item).join(', ')

			return capitalizeFirstAndJoin(perms)
		},
	},

	watch: {
		setCustomPermissions(isChecked) {
			if (isChecked) {
				this.sharingPermission = 'custom'
			}
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

		expandCustomPermissions() {
			if (!this.advancedSectionAccordionExpanded) {
				this.advancedSectionAccordionExpanded = true
			}
			this.toggleCustomPermissions()
		},

		toggleCustomPermissions() {
			this.setCustomPermissions = this.sharingPermission === 'custom'
		},

		initializeAttributes() {
			let hasAdvancedAttributes = false
			if (this.isValidShareAttribute(this.share.note)) {
				this.writeNoteToRecipientIsChecked = true
				hasAdvancedAttributes = true
			}

			if (this.isValidShareAttribute(this.share.password)) {
				hasAdvancedAttributes = true
			}

			if (this.isValidShareAttribute(this.share.expireDate)) {
				hasAdvancedAttributes = true
			}

			if (this.isValidShareAttribute(this.share.label)) {
				hasAdvancedAttributes = true
			}

			if (hasAdvancedAttributes) {
				this.advancedSectionAccordionExpanded = true
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
			if (this.isPublicShare) {
				permissionsAndAttributes.push(...publicShareAttributes)
			}
			const sharePermissionsSet = parseInt(this.sharingPermission)

			if (this.setCustomPermissions) {
				this.updateAtomicPermissions()
			} else {
				this.share.permissions = sharePermissionsSet
			}

			if (!this.isFolder && this.share.permissions === BUNDLED_PERMISSIONS.ALL) {
				// It's not possible to create an existing file.
				this.share.permissions = BUNDLED_PERMISSIONS.ALL_FILE
			}

			// add SHARE permission if share doesn't have it, 'Allow resharing' is checked and Resharing is enabled globally
			if (this.allowResharingIsChecked && !this.canReshare && this.resharingAllowedGlobal) {
				this.share.permissions |= ATOMIC_PERMISSIONS.SHARE
			// remove SHARE permission if internal share, 'Allow resharing' is unchecked and it initially had SHARE permission
			} else if (!this.isPublicShare && this.canReshare && !this.allowResharingIsChecked) {
				this.share.permissions = this.share.permissions & ~ATOMIC_PERMISSIONS.SHARE
			}

			if (!this.writeNoteToRecipientIsChecked) {
				this.mutableShare.note = ''
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

			if (!this.hasExpirationDate) {
				this.share.expireDate = ''
			}

			const incomingShare = {
				permissions: this.share.permissions,
				shareType: this.share.type,
				shareWith: this.share.shareWith,
				attributes: this.share.attributes,
				label: this.mutableShare.label,
				note: this.mutableShare.note,
				shareSet: true,
			}

			if (this.hasExpirationDate) {
				incomingShare.expireDate = this.share.expireDate
			}

			if (this.isPasswordProtected) {
				this.share.password = this.mutableShare.password
				incomingShare.password = this.mutableShare.password
			}

			this.share.label = this.mutableShare.label
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
			this.passwordError = !this.isValidShareAttribute(password)
			this.mutableShare.password = password
			// this.$set(this.share, 'newPassword', password)
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

	#share-date-picker {
		border: var(--telekom-spacing-composition-space-01) solid var(--telekom-color-ui-border-standard);
		height: 44px;
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
