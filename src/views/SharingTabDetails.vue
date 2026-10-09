<template>
	<div class="sharingTabDetailsView">
		<div class="header-permissions">
			<ChevronLeftIcon :size="24" class="back-button" @click="$emit('close-sharing-details')" />
			<h2 class="sharingTabDetailsView__header">
				{{ t('nmcsharing', 'Permissions') }}
			</h2>
		</div>

		<span class="sharingPopup__fileinfo">{{ fileInfo.name }} ⸱ {{ size }}</span>

		<div class="sharingTabDetailsView__quick-permissions">
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
						<strong>{{ t('nmcsharing', 'only view') }}</strong>
					</NcCheckboxRadioSwitch>
					<EyeIcon :size="16" />
				</span>

				<span class="checkbox-text">
					<NcCheckboxRadioSwitch
						:checked.sync="sharingPermission"
						:disabled="!isPermissionEditAllowed"
						:value="isFolder ? bundledPermissions.ALL.toString() : bundledPermissions.ALL_FILE.toString()"
						class="checkbox-switch"
						name="sharing_permission_radio"
						type="radio">
						{{ t('nmcsharing', 'Anyone with the link can') }}
						{{ t('nmcsharing', ' ') }}
						<strong>{{ t('nmcsharing', 'edit') }}</strong>
					</NcCheckboxRadioSwitch>
					<PencilIcon :size="16" />
				</span>

				<NcCheckboxRadioSwitch
					v-if="allowsFileDrop"
					:checked.sync="sharingPermission"
					:value="bundledPermissions.FILE_DROP.toString()"
					name="sharing_permission_radio"
					type="radio">
					{{ t('nmcsharing', 'File drop (upload only)') }}
				</NcCheckboxRadioSwitch>

				<p v-if="allowsFileDrop" class="sharing_permission-desc">
					{{ t('nmcsharing', 'With File drop, only uploading is allowed. Only you can see files and folders that have been uploaded.') }}
				</p>
			</div>
		</div>

		<div class="sharingTabDetailsView__advanced-control">
			<strong>{{ t('nmcsharing', 'Advanced settings') }}</strong>
		</div>

		<div class="sharingTabDetailsView__advanced">
			<section>
				<NcInputField
					v-if="isPublicShare"
					id="share-label-input"
					autocomplete="off"
					show-trailing-button
					:label="t('nmcsharing', 'Share label')"
					:value.sync="mutableShare.label">
					<template #trailing-button-icon>
						<PencilIcon :size="16" />
					</template>
				</NcInputField>

				<NcCheckboxRadioSwitch
					v-if="isPublicShare"
					:checked.sync="share.hideDownload"
					:disabled="canChangeHideDownload"
					@update:checked="queueUpdate('hideDownload')">
					{{ t('files_sharing', 'Hide download') }}
				</NcCheckboxRadioSwitch>

				<template v-if="isPublicShare">
					<div class="password-row">
						<NcCheckboxRadioSwitch :checked.sync="isPasswordProtected" :disabled="isPasswordEnforced">
							{{ passwordHint }}
						</NcCheckboxRadioSwitch>

						<NcButton
							v-if="passwordIsChecked && !showPasswordField"
							type="tertiary"
							@click="showPasswordField = true">
							{{ t('nmcsharing', 'Change password') }}
							<template #icon>
								<PencilIcon :size="16" />
							</template>
						</NcButton>
					</div>

					<NcPasswordField
						v-if="isPasswordProtected"
						id="share-password-input"
						:value="hasUnsavedPassword ? mutableShare.password : ''"
						:error="passwordError"
						:helper-text="errorPasswordLabel"
						:required="isPasswordEnforced"
						:label="t('files_sharing', 'Password')"
						@update:value="onPasswordChange" />

					<span v-if="isEmailShareType && passwordExpirationTime" class="password-expiration-info">
						{{ t('files_sharing', 'Password expires {passwordExpirationTime}', { passwordExpirationTime }) }}
					</span>

					<span v-else-if="isEmailShareType && passwordExpirationTime !== null" class="password-expiration-error">
						{{ t('files_sharing', 'Password expired') }}
					</span>
				</template>

				<NcCheckboxRadioSwitch :checked.sync="hasExpirationDate" :disabled="isExpiryDateEnforced">
					{{ isExpiryDateEnforced
						? t('files_sharing', 'Expiration date (enforced)')
						: t('files_sharing', 'Set expiration date') }}
				</NcCheckboxRadioSwitch>

				<NcDateTimePickerNative
					v-if="hasExpirationDate"
					id="share-date-picker"
					:value="new Date(share.expireDate ?? defaultExpiryDate)"
					:min="dateTomorrow"
					:max="dateMaxEnforced"
					:hide-label="true"
					:label="t('files_sharing', 'Expiration date')"
					:placeholder="t('files_sharing', 'Expiration date')"
					type="date"
					@input="onExpirationChange" />

				<NcCheckboxRadioSwitch v-if="isEmailShare" :checked.sync="writeNoteToRecipientIsChecked">
					{{ t('files_sharing', 'Note to recipient') }}
				</NcCheckboxRadioSwitch>

				<template v-if="writeNoteToRecipientIsChecked && isEmailShare">
					<textarea :value="mutableShare.note" @input="mutableShare.note = $event.target.value" />
				</template>

				<DownloadLimit
					v-if="(isLinkShare || isEmailShare) && !isFolder"
					:share="share"
					:file-info="fileInfo"
					@limit-changed="handleLimitChangeEvent" />

				<NcCheckboxRadioSwitch
					v-if="!isPublicShare && resharingAllowedGlobal"
					:checked.sync="allowResharingIsChecked">
					{{ t('nmcsharing', 'Allow resharing') }}
				</NcCheckboxRadioSwitch>
			</section>
		</div>

		<div class="sharingTabDetailsView__footer">
			<div class="button-group">
				<NcButton @click="$emit('close-sharing-details')">
					{{ t('files_sharing', 'Cancel') }}
				</NcButton>

				<NcButton
					class="button-details"
					type="primary"
					:disabled="passwordError || limitError"
					@click="saveShare">
					{{ shareButtonText }}
				</NcButton>
			</div>
		</div>
	</div>
</template>

<script>
import { formatFileSize } from '@nextcloud/files'
import { translate as t } from '@nextcloud/l10n'
import { ShareType } from '@nextcloud/sharing'

import NcButton from '@nextcloud/vue/dist/Components/NcButton.js'
import NcCheckboxRadioSwitch from '@nextcloud/vue/dist/Components/NcCheckboxRadioSwitch.js'
import NcDateTimePickerNative from '@nextcloud/vue/dist/Components/NcDateTimePickerNative.js'
import NcInputField from '@nextcloud/vue/dist/Components/NcInputField.js'
import NcPasswordField from '@nextcloud/vue/dist/Components/NcPasswordField.js'

import ChevronLeftIcon from 'vue-material-design-icons/ChevronLeftCircleOutline.vue'
import EmailIcon from 'vue-material-design-icons/Email.vue'
import EyeIcon from 'vue-material-design-icons/EyeCircleOutline.vue'
import LinkIcon from 'vue-material-design-icons/Link.vue'
import PencilIcon from 'vue-material-design-icons/Pencil.vue'

import DownloadLimit from '../components/DownloadLimit.vue'
import {
	ATOMIC_PERMISSIONS,
	BUNDLED_PERMISSIONS,
	hasPermissions,
} from '../lib/SharePermissionsToolBox.js'

import ShareRequests from '../mixins/ShareRequests.js'
import SharesMixin from '../mixins/SharesMixin.js'
import ShareTypes from '../mixins/ShareTypes.js'

import Share from '../models/Share.js'
import Config from '../services/ConfigService.js'
import GeneratePassword from '../utils/GeneratePassword.js'

export default {
	name: 'SharingTabDetails',

	components: {
		ChevronLeftIcon,
		DownloadLimit,
		EyeIcon,
		NcButton,
		NcCheckboxRadioSwitch,
		NcDateTimePickerNative,
		NcInputField,
		NcPasswordField,
		PencilIcon,
	},

	mixins: [ShareTypes, ShareRequests, SharesMixin],

	props: {
		shareRequestValue: {
			type: Object,
			required: false,
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
		shareAll: {
			type: Array,
			required: false,
			default: () => [],
		},
		resharingAllowedGlobal: {
			type: Boolean,
			required: true,
		},
	},

	data() {
		return {
			config: new Config(),
			writeNoteToRecipientIsChecked: false,
			allowResharingIsChecked: this.share.hasSharePermission,
			sharingPermission: BUNDLED_PERMISSIONS.ALL.toString(),
			bundledPermissions: BUNDLED_PERMISSIONS,
			passwordError: false,
			passwordIsChecked: false,
			showPasswordField: false,
			mutableShare: {
				note: this.share.note,
				password: this.share.password,
				label: this.share.label,
			},
			limitError: false,
		}
	},

	computed: {
		size() {
			const size = Number.parseInt(this.fileInfo.size, 10)
			if (Number.isNaN(size) || size < 0) {
				return t('files', 'Pending')
			}
			return formatFileSize(size, true)
		},

		title() {
			let title = t('files_sharing', 'Share with ')

			if (this.share.type === ShareType.User) {
				title += this.share.shareWithDisplayName
			} else if (this.share.type === ShareType.Link) {
				title = t('files_sharing', 'Share link')
			}

			return title
		},

		canEdit: {
			get() {
				return this.share.hasUpdatePermission
			},
			set(checked) {
				this.updateAtomicPermissions({ isEditChecked: checked })
			},
		},

		canCreate: {
			get() {
				return this.share.hasCreatePermission
			},
			set(checked) {
				this.updateAtomicPermissions({ isCreateChecked: checked })
			},
		},

		canDelete: {
			get() {
				return this.share.hasDeletePermission
			},
			set(checked) {
				this.updateAtomicPermissions({ isDeleteChecked: checked })
			},
		},

		canReshare: {
			get() {
				return this.share.hasSharePermission
			},
			set(checked) {
				this.updateAtomicPermissions({ isReshareChecked: checked })
			},
		},

		canDownload: {
			get() {
				return this.share.hasDownloadPermission
			},
			set(checked) {
				this.updateAtomicPermissions({ isDownloadChecked: checked })
			},
		},

		hasRead: {
			get() {
				return this.share.hasReadPermission
			},
			set(checked) {
				this.updateAtomicPermissions({ isReadChecked: checked })
			},
		},

		hasExpirationDate: {
			get() {
				return this.isValidShareAttribute(this.share.expireDate)
			},
			set(enabled) {
				this.share.expireDate = enabled ? this.formatDateToString(this.defaultExpiryDate) : ''
			},
		},

		isPasswordProtected: {
			get() {
				return this.config.enforcePasswordForPublicLink || !!this.mutableShare.password
			},
			async set(enabled) {
				this.mutableShare.password = enabled ? await GeneratePassword() : ''
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
			return this.share.type === ShareType.Remote || this.share.type === ShareType.RemoteGroup
		},

		isPublicShare() {
			return this.isLinkShare || this.isEmailShare
		},

		isEmailShareType() {
			return this.share ? this.share.type === ShareType.Email : false
		},

		dateMaxEnforced() {
			if (this.isPublicShare && this.config.isDefaultExpireDateEnforced) {
				return this.config.defaultExpirationDate
			}

			if (this.isRemoteShare && this.config.isDefaultRemoteExpireDateEnforced) {
				return this.config.defaultRemoteExpirationDateString
			}

			if (!this.isPublicShare && !this.isRemoteShare && this.config.isDefaultInternalExpireDateEnforced) {
				return this.config.defaultInternalExpirationDate
			}

			return null
		},

		isExpiryDateEnforced() {
			if (this.isPublicShare) {
				return this.config.isDefaultExpireDateEnforced
			}

			if (this.isRemoteShare) {
				return this.config.isDefaultRemoteExpireDateEnforced
			}

			return this.config.isDefaultInternalExpireDateEnforced
		},

		defaultExpiryDate() {
			if (
				(this.isGroupShare || this.isUserShare)
				&& this.config.isDefaultInternalExpireDateEnabled
				&& this.config.defaultInternalExpirationDate
			) {
				return new Date(this.config.defaultInternalExpirationDate)
			}

			if (
				this.isRemoteShare
				&& this.config.isDefaultRemoteExpireDateEnabled
				&& this.config.defaultRemoteExpirationDateString
			) {
				return new Date(this.config.defaultRemoteExpirationDateString)
			}

			if (
				this.isPublicShare
				&& this.config.isDefaultExpireDateEnabled
				&& this.config.defaultExpirationDate
			) {
				return new Date(this.config.defaultExpirationDate)
			}

			return new Date(new Date().setFullYear(new Date().getFullYear() + 1))
		},

		allowsFileDrop() {
			return this.isFolder
				&& (this.share.type === ShareType.Link || this.share.type === ShareType.Email)
		},

		hasFileDropPermissions() {
			return this.share.permissions === this.bundledPermissions.FILE_DROP
		},

		shareButtonText() {
			return t('files_sharing', 'Update share')
		},

		isSetDownloadButtonVisible() {
			const allowedMimetypes = [
				'application/msword',
				'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
				'application/vnd.ms-powerpoint',
				'application/vnd.openxmlformats-officedocument.presentationml.presentation',
				'application/vnd.ms-excel',
				'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
				'application/vnd.oasis.opendocument.text',
				'application/vnd.oasis.opendocument.spreadsheet',
				'application/vnd.oasis.opendocument.presentation',
			]

			return this.isFolder || allowedMimetypes.includes(this.fileInfo.mimetype)
		},

		isPasswordEnforced() {
			return this.isPublicShare && this.config.enforcePasswordForPublicLink
		},

		canSetEdit() {
			return Boolean(this.fileInfo.sharePermissions & OC.PERMISSION_UPDATE) || this.canEdit
		},

		canSetCreate() {
			return Boolean(this.fileInfo.sharePermissions & OC.PERMISSION_CREATE) || this.canCreate
		},

		canSetDelete() {
			return Boolean(this.fileInfo.sharePermissions & OC.PERMISSION_DELETE) || this.canDelete
		},

		canSetReshare() {
			return Boolean(this.fileInfo.sharePermissions & OC.PERMISSION_SHARE) || this.canReshare
		},

		canSetDownload() {
			return (
				typeof this.fileInfo.canDownload === 'function'
				&& this.fileInfo.canDownload()
			) || this.canDownload
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

			const expirationTime = moment(this.share.passwordExpirationTime)

			if (expirationTime.diff(moment()) < 0) {
				return false
			}

			return expirationTime.fromNow()
		},

		canChangeHideDownload() {
			const shareAttributes = this.fileInfo.shareAttributes ?? []
			const hasDisabledDownload = shareAttribute =>
				shareAttribute.key === 'download'
				&& shareAttribute.scope === 'permissions'
				&& shareAttribute.enabled === false

			return shareAttributes.some(hasDisabledDownload)
		},

		customPermissionsList() {
			const permissions = []

			if (hasPermissions(this.share.permissions, ATOMIC_PERMISSIONS.READ)) {
				permissions.push('read')
			}
			if (hasPermissions(this.share.permissions, ATOMIC_PERMISSIONS.CREATE)) {
				permissions.push('create')
			}
			if (hasPermissions(this.share.permissions, ATOMIC_PERMISSIONS.UPDATE)) {
				permissions.push('update')
			}
			if (hasPermissions(this.share.permissions, ATOMIC_PERMISSIONS.DELETE)) {
				permissions.push('delete')
			}
			if (hasPermissions(this.share.permissions, ATOMIC_PERMISSIONS.SHARE)) {
				permissions.push('share')
			}
			if (this.share.hasDownloadPermission) {
				permissions.push('download')
			}

			return permissions
				.map((item, index) => index === 0 ? item[0].toUpperCase() + item.substring(1) : item)
				.join(', ')
		},

		errorPasswordLabel() {
			if (this.passwordError) {
				return t('nmcsharing', 'Password must be at least 6 characters long')
			}
			return undefined
		},

		passwordHint() {
			return this.passwordIsChecked
				? t('nmcsharing', 'Password set')
				: t('nmcsharing', 'Set password')
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

			if (this.share.hasDownloadPermission !== isDownloadChecked) {
				this.$set(this.share, 'hasDownloadPermission', isDownloadChecked)
			}
		},

		initializeAttributes() {
			if (this.isValidShareAttribute(this.share.note)) {
				this.writeNoteToRecipientIsChecked = true
			}

			if (this.isValidShareAttribute(this.share.password)) {
				this.passwordIsChecked = true
			}
		},

		initializePermissions() {
			if (this.share.share_type !== undefined && this.share.share_type !== null) {
				this.share.type = this.share.share_type
			}

			if ('shareType' in this.share) {
				this.share.type = this.share.shareType
			}

			if (this.canReshare) {
				this.sharingPermission = (this.share.permissions & ~ATOMIC_PERMISSIONS.SHARE).toString()
			} else {
				this.sharingPermission = this.share.permissions.toString()
			}
		},

		async saveShare() {
			const permissionsAndAttributes = ['permissions', 'attributes', 'note', 'expireDate']
			let publicShareAttributes = ['label', 'password', 'hideDownload']

			if (!this.hasUnsavedPassword) {
				publicShareAttributes = ['label', 'hideDownload']
			}

			if (this.isPublicShare) {
				permissionsAndAttributes.push(...publicShareAttributes)
			}

			this.share.permissions = Number.parseInt(this.sharingPermission, 10)

			if (!this.isFolder && this.share.permissions === BUNDLED_PERMISSIONS.ALL) {
				this.share.permissions = BUNDLED_PERMISSIONS.ALL_FILE
			}

			if (this.allowResharingIsChecked && !this.canReshare && this.resharingAllowedGlobal) {
				this.share.permissions |= ATOMIC_PERMISSIONS.SHARE
			} else if (!this.isPublicShare && this.canReshare && !this.allowResharingIsChecked) {
				this.share.permissions &= ~ATOMIC_PERMISSIONS.SHARE
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

			this.queueUpdate(...permissionsAndAttributes)
			this.$emit('close-sharing-details')
		},

		async addShare(value, fileInfo) {
			this.value = null

			if (value.handler) {
				const share = await value.handler(this)
				this.$emit('add:share', new Share(share))
				return true
			}

			try {
				const path = (fileInfo.path + '/' + fileInfo.name).replace('//', '/')

				return await this.createShare({
					path,
					shareType: value.shareType,
					shareWith: value.shareWith,
					permissions: value.permissions,
					attributes: JSON.stringify(fileInfo.shareAttributes ?? []),
					...(value.note ? { note: value.note } : {}),
					...(value.password ? { password: value.password } : {}),
					...(value.expireDate ? { expireDate: value.expireDate } : {}),
					...(value.label ? { label: value.label } : {}),
				})
			} catch (error) {
				console.error('Error while adding new share', error)
				return undefined
			}
		},

		async removeShare() {
			await this.onDelete()
			this.$emit('close-sharing-details')
		},

		onPasswordChange(password) {
			this.mutableShare.password = password
			this.passwordError = password.length < 6 || !this.isValidShareAttribute(password)
			this.passwordModified = true
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

		handleLimitChangeEvent(payload) {
			this.limitError = payload
		},

		getShareTypeIcon(type) {
			switch (type) {
			case ShareType.Link:
				return LinkIcon
			case ShareType.Email:
				return EmailIcon
			default:
				return null
			}
		},
	},
}
</script>

<style lang="scss">
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

.sharingTabDetailsView__header {
	margin-bottom: 0;
	font-weight: bold;
}

.password-row {
	display: flex;
	flex-direction: row;
	align-items: center;

	.button-vue--vue-tertiary {
		min-height: unset;
		height: 24px;
		padding: 0 4px;
		font-size: 0.8rem;
		color: var(--color-main-text);

		.button-vue__wrapper {
			flex-direction: row-reverse;
		}

		.button-vue__text {
			font-weight: bold;
		}

		&:hover {
			color: var(--color-primary-element);
			background-color: transparent;
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

.password-expiration-info {
	color: var(--color-text-maxcontrast);
}

.password-expiration-error {
	color: var(--color-error);
}

.sharingTabDetailsView {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	padding: 0 1rem 1rem;

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
		}
	}
}
</style>
