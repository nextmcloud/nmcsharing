<template>
	<div
		ref="quickShareDropdownContainer"
		:class="{
			active: showDropdown,
			'share-select': true,
		}">

		<button
			type="button"
			class="trigger-text"
			:disabled="disabled"
			:aria-label="t('nmcsharing', 'Open sharing details')"
			@click.stop="openSharingDetails">

			<EyeIcon
				v-if="canView"
				:size="16"
				aria-hidden="true" />

			<PencilIcon
				v-if="canEdit"
				:size="16"
				aria-hidden="true" />

			<UploadIcon
				v-if="fileDrop"
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

		<div
			v-if="showDropdown"
			ref="quickShareDropdown"
			class="share-select-dropdown"
			role="menu"
			:aria-label="t('nmcsharing', 'Quick share options')"
			tabindex="-1"
			@keydown.down.prevent="handleArrowDown"
			@keydown.up.prevent="handleArrowUp"
			@keydown.esc.prevent.stop="closeDropdown">

			<button
				v-for="option in options"
				:key="option.value"
				type="button"
				role="menuitemradio"
				class="dropdown-item"
				:class="{ selected: option.value === selectedPermission }"
				:aria-checked="option.value === selectedPermission"
				:disabled="disabled || !isPermissionEditAllowed"
				@click.stop="selectOption(option.value)">
				{{ option.label }}
			</button>
		</div>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { ShareType } from '@nextcloud/sharing'

import CalendarMonthIcon from 'vue-material-design-icons/CalendarMonth.vue'
import ChevronRightIcon from 'vue-material-design-icons/ChevronRight.vue'
import EyeIcon from 'vue-material-design-icons/EyeCircleOutline.vue'
import LockOutlineIcon from 'vue-material-design-icons/LockOutline.vue'
import PencilIcon from 'vue-material-design-icons/Pencil.vue'
import UploadIcon from 'vue-material-design-icons/Upload.vue'

import { createFocusTrap } from 'focus-trap'

import ShareDetails from '../mixins/ShareDetails.js'
import SharesMixin from '../mixins/SharesMixin.js'
import ShareTypes from '../mixins/ShareTypes.js'

import {
	ATOMIC_PERMISSIONS,
	BUNDLED_PERMISSIONS,
	hasPermissions,
} from '../lib/SharePermissionsToolBox.js'

export default {
	name: 'SharingEntryQuickShareSelect',

	components: {
		CalendarMonthIcon,
		ChevronRightIcon,
		EyeIcon,
		LockOutlineIcon,
		PencilIcon,
		UploadIcon,
	},

	/*
	 * Keep ShareTypes for now in case SharesMixin or ShareDetails
	 * still depend on the legacy constants internally.
	 *
	 * Direct comparisons in this component already use ShareType.
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

		toggle: {
			type: Boolean,
			default: false,
		},

		disabled: {
			type: Boolean,
			default: false,
		},
	},

	data() {
		return {
			showDropdown: Boolean(this.toggle),
			focusTrap: null,
		}
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
		 * Normalize API/model variants.
		 *
		 * @return {number|undefined}
		 */
		currentShareType() {
			const type =
				this.share?.type
				?? this.share?.shareType
				?? this.share?.share_type

			if (type === null || type === undefined) {
				return undefined
			}

			const normalizedType = Number(type)

			return Number.isNaN(normalizedType)
				? undefined
				: normalizedType
		},

		/**
		 * Permissions relevant to the bundled quick selection.
		 * SHARE itself is handled separately and therefore ignored here.
		 *
		 * @return {number}
		 */
		normalizedPermissions() {
			let permissions = Number(this.share?.permissions ?? 0)

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
		 * Stable internal identifier for the selected option.
		 *
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
			case 'view':
				return this.canViewText

			case 'edit':
				return this.canEditText

			case 'file-drop':
				return this.fileDropText

			default:
				return this.customPermissionsText
			}
		},

		canView() {
			return this.selectedPermission === 'view'
		},

		canEdit() {
			return this.selectedPermission === 'edit'
		},

		fileDrop() {
			return this.selectedPermission === 'file-drop'
		},

		options() {
			const options = [
				{
					value: 'view',
					label: this.canViewText,
				},
				{
					value: 'edit',
					label: this.canEditText,
				},
			]

			if (this.supportsFileDrop) {
				options.push({
					value: 'file-drop',
					label: this.fileDropText,
				})
			}

			return options
		},

		supportsFileDrop() {
			if (!this.isFolder) {
				return false
			}

			return this.currentShareType === ShareType.Link
				|| this.currentShareType === ShareType.Email
		},
	},

	watch: {
		toggle(value) {
			this.setDropdownState(
				Boolean(value),
				false,
			)
		},
	},

	mounted() {
		window.addEventListener(
			'click',
			this.handleClickOutside,
		)

		if (this.showDropdown) {
			this.$nextTick(() => {
				this.useFocusTrap()
			})
		}
	},

	beforeDestroy() {
		window.removeEventListener(
			'click',
			this.handleClickOutside,
		)

		this.clearFocusTrap(false)
	},

	methods: {
		/**
		 * Apply an externally or internally requested dropdown state.
		 *
		 * @param {boolean} open Open state
		 * @param {boolean} emit Whether to sync the state to the parent
		 */
		setDropdownState(open, emit = true) {
			const newState = Boolean(open)

			if (this.showDropdown === newState) {
				return
			}

			if (!newState) {
				this.clearFocusTrap()
			}

			this.showDropdown = newState

			if (emit) {
				this.$emit(
					'update:toggle',
					newState,
				)
			}

			if (newState) {
				this.$nextTick(() => {
					this.useFocusTrap()
				})
			}
		},

		closeDropdown() {
			this.setDropdownState(false)
		},

		/**
		 * Select one of the bundled permission presets.
		 *
		 * @param {'view'|'edit'|'file-drop'} option Selected option
		 */
		selectOption(option) {
			let permissions

			switch (option) {
			case 'edit':
				permissions = this.isFolder
					? BUNDLED_PERMISSIONS.ALL
					: BUNDLED_PERMISSIONS.ALL_FILE
				break

			case 'file-drop':
				if (!this.supportsFileDrop) {
					return
				}

				permissions = BUNDLED_PERMISSIONS.FILE_DROP
				break

			case 'view':
			default:
				permissions = BUNDLED_PERMISSIONS.READ_ONLY
				break
			}

			/*
			 * Preserve resharing when the current share already has it.
			 * The quick selector only changes the bundled read/write/
			 * file-drop permissions.
			 */
			if (
				hasPermissions(
					Number(this.share.permissions ?? 0),
					ATOMIC_PERMISSIONS.SHARE,
				)
			) {
				permissions |= ATOMIC_PERMISSIONS.SHARE
			}

			this.share.permissions = permissions

			this.queueUpdate('permissions')
			this.closeDropdown()
		},

		openSharingDetails() {
			if (this.disabled) {
				return
			}

			if (this.showDropdown) {
				this.closeDropdown()
			}

			this.$emit('open-sharing-details')
		},

		handleClickOutside(event) {
			if (!this.showDropdown) {
				return
			}

			const dropdownContainer =
				this.$refs.quickShareDropdownContainer

			if (
				dropdownContainer
				&& !dropdownContainer.contains(event.target)
			) {
				this.closeDropdown()
			}
		},

		useFocusTrap() {
			const dropdownElement =
				this.$refs.quickShareDropdown

			if (!dropdownElement || this.focusTrap) {
				return
			}

			window._nc_focus_trap ??= []

			this.focusTrap = createFocusTrap(
				dropdownElement,
				{
					allowOutsideClick: true,
					escapeDeactivates: false,
					fallbackFocus: dropdownElement,
					trapStack: window._nc_focus_trap,
				},
			)

			this.focusTrap.activate()
		},

		/**
		 * @param {boolean} returnFocus Restore focus to the element
		 * that was active when the trap was opened
		 */
		clearFocusTrap(returnFocus = true) {
			if (!this.focusTrap) {
				return
			}

			try {
				this.focusTrap.deactivate({
					returnFocus,
				})
			} finally {
				this.focusTrap = null
			}
		},

		getDropdownItems() {
			const dropdown =
				this.$refs.quickShareDropdown

			if (!dropdown) {
				return []
			}

			return Array.from(
				dropdown.querySelectorAll(
					'button:not(:disabled)',
				),
			)
		},

		shiftFocusForward() {
			const items = this.getDropdownItems()

			if (items.length === 0) {
				return
			}

			const currentIndex =
				items.indexOf(document.activeElement)

			const nextIndex =
				currentIndex < 0
					? 0
					: (currentIndex + 1) % items.length

			items[nextIndex].focus()
		},

		shiftFocusBackward() {
			const items = this.getDropdownItems()

			if (items.length === 0) {
				return
			}

			const currentIndex =
				items.indexOf(document.activeElement)

			const previousIndex =
				currentIndex <= 0
					? items.length - 1
					: currentIndex - 1

			items[previousIndex].focus()
		},

		handleArrowUp() {
			this.shiftFocusBackward()
		},

		handleArrowDown() {
			this.shiftFocusForward()
		},
	},
}
</script>

<style lang="scss" scoped>
.share-select {
	position: relative;
	cursor: pointer;

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
		}
	}

	.share-select-dropdown {
		position: absolute;
		z-index: 1;
		top: 100%;
		left: 0;
		display: flex;
		flex-direction: column;
		max-height: 0;
		overflow: hidden;
		padding: 4px 0;
		border-radius: 8px;
		background-color: var(--color-main-background);
		box-shadow: 0 2px 4px rgb(0 0 0 / 20%);
		transition: max-height 0.3s ease;

		.dropdown-item {
			width: 100%;
			padding: 8px;
			border: none;
			border-radius: 0;
			background: none;
			color: inherit;
			font: inherit;
			font-size: 12px;
			text-align: left;
			white-space: nowrap;
			cursor: pointer;

			&:hover:not(:disabled),
			&:focus-visible {
				background-color: var(--color-background-hover);
			}

			&:disabled {
				cursor: default;
				opacity: 0.5;
			}
		}
	}

	&.active {
		.share-select-dropdown {
			max-height: 200px;
		}
	}
}
</style>
