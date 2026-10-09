<template>
	<div
		class="share-select"
		:class="{ disabled }">

		<button
			type="button"
			class="trigger-text"
			:disabled="disabled"
			:aria-label="selectedOption"
			@click.stop="openDetails">

			<EyeIcon
				v-if="canView"
				:size="16"
				aria-hidden="true" />

			<PencilIcon
				v-if="canEdit"
				:size="16"
				aria-hidden="true" />

			<UploadIcon
				v-if="canFileDrop"
				:size="16"
				aria-hidden="true" />

			{{ selectedOption }}

			<LockOutlineIcon
				v-if="hasPassword"
				:size="16"
				aria-hidden="true" />

			<CalendarMonthIcon
				v-if="hasExpireDate"
				:size="16"
				aria-hidden="true" />

			<ChevronRightIcon
				:size="18"
				aria-hidden="true" />
		</button>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'

import CalendarMonthIcon from 'vue-material-design-icons/CalendarMonth.vue'
import ChevronRightIcon from 'vue-material-design-icons/ChevronRight.vue'
import EyeIcon from 'vue-material-design-icons/EyeCircleOutline.vue'
import LockOutlineIcon from 'vue-material-design-icons/LockOutline.vue'
import PencilIcon from 'vue-material-design-icons/Pencil.vue'
import UploadIcon from 'vue-material-design-icons/Upload.vue'

import ShareDetails from '../mixins/ShareDetails.js'
import SharesMixin from '../mixins/SharesMixin.js'
import ShareTypes from '../mixins/ShareTypes.js'

import {
	ATOMIC_PERMISSIONS,
	BUNDLED_PERMISSIONS,
	hasPermissions,
} from '../lib/SharePermissionsToolBox.js'

export default {
	name: 'SharingEntryQuickShareSelectAll',

	components: {
		CalendarMonthIcon,
		ChevronRightIcon,
		EyeIcon,
		LockOutlineIcon,
		PencilIcon,
		UploadIcon,
	},

	/*
	 * ShareTypes bleibt vorerst enthalten, falls SharesMixin oder
	 * ShareDetails noch auf die Legacy-Konstanten zugreifen.
	 */
	mixins: [
		SharesMixin,
		ShareDetails,
		ShareTypes,
	],

	props: {
		share: {
			type: Object,
			required: true,
		},

		disabled: {
			type: Boolean,
			default: false,
		},
	},

	computed: {
		hasExpireDate() {
			return !!this.share?.expireDate
		},

		hasPassword() {
			return !!this.share?.password
		},

		canViewText() {
			return t(
				'nmcsharing',
				'Anyone with the link can only view',
			)
		},

		canEditText() {
			return t(
				'nmcsharing',
				'Anyone with the link can edit',
			)
		},

		fileDropText() {
			return t(
				'nmcsharing',
				'Anyone with the link can file drop',
			)
		},

		customPermissionsText() {
			return t(
				'files_sharing',
				'Custom permissions',
			)
		},

		/**
		 * Permissions relevant for the bundled quick presets.
		 * Resharing is ignored for this comparison.
		 *
		 * @return {number}
		 */
		normalizedPermissions() {
			let permissions = Number(
				this.share?.permissions ?? 0,
			)

			if (
				hasPermissions(
					permissions,
					ATOMIC_PERMISSIONS.SHARE,
				)
			) {
				permissions &= ~ATOMIC_PERMISSIONS.SHARE
			}

			return permissions
		},

		/**
		 * @return {'view'|'edit'|'file-drop'|'custom'}
		 */
		selectedPermission() {
			if (
				this.normalizedPermissions
				=== BUNDLED_PERMISSIONS.READ_ONLY
			) {
				return 'view'
			}

			if (
				this.normalizedPermissions
					=== BUNDLED_PERMISSIONS.ALL
				|| this.normalizedPermissions
					=== BUNDLED_PERMISSIONS.ALL_FILE
			) {
				return 'edit'
			}

			if (
				this.normalizedPermissions
				=== BUNDLED_PERMISSIONS.FILE_DROP
			) {
				return 'file-drop'
			}

			return 'custom'
		},

		selectedOption() {
			switch (this.selectedPermission) {
			case 'edit':
				return this.canEditText

			case 'file-drop':
				return this.fileDropText

			case 'custom':
				return this.customPermissionsText

			case 'view':
			default:
				return this.canViewText
			}
		},

		canView() {
			return this.selectedPermission === 'view'
		},

		canEdit() {
			return this.selectedPermission === 'edit'
		},

		canFileDrop() {
			return this.selectedPermission === 'file-drop'
		},
	},

	methods: {
		openDetails() {
			if (this.disabled) {
				return
			}

			this.$emit('open-sharing-details-all')
		},
	},
}
</script>

<style lang="scss" scoped>
.share-select {
	position: relative;
	margin-top: 0.5rem;

	.trigger-text {
		display: flex;
		flex-direction: row;
		align-items: center;
		min-height: 1.5rem;
		margin: 0;
		padding: 0;
		gap: 2px;
		border: none;
		border-radius: 0;
		background: none;
		color: var(--color-primary-element);
		font-size: 14px;
		text-align: left;
		cursor: pointer;

		&:hover:not(:disabled) {
			text-decoration: underline;
		}

		&:disabled {
			cursor: default;
			opacity: 0.7;
		}
	}
}
</style>
