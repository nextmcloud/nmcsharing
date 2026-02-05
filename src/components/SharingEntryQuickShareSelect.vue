<template>
	<div ref="quickShareDropdownContainer"
		:class="{ 'active': showDropdown, 'share-select': true }">
		<button :id="dropdownId"
			class="trigger-text"
			tabindex="0"
			:aria-expanded="showDropdown"
			:aria-haspopup="true"
			aria-label="Quick share options dropdown"
			@click="openSharingDetails">
			<EyeIcon v-if="canView" :size="16" />
			<PencilIcon v-if="canEdit" :size="16" />
			<UploadIcon v-if="fileDrop" :size="16" />
			{{ selectedOption }}
			<LockOutlineIcon v-if="hasPassword" :size="16" />
			<CalendarMonthIcon v-if="hasExpireDate" :size="16" />
			<ChevronRightIcon :size="18" />
		</button>
		<div v-if="showDropdown"
			ref="quickShareDropdown"
			class="share-select-dropdown"
			:aria-labelledby="dropdownId"
			tabindex="0"
			@keydown.down="handleArrowDown"
			@keydown.up="handleArrowUp"
			@keydown.esc="closeDropdown">
			<button v-for="option in options"
				:key="option"
				:class="{ 'dropdown-item': true, 'selected': option === selectedOption }"
				:aria-selected="option === selectedOption"
				@click="selectOption(option)">
				{{ option }}
			</button>
		</div>
	</div>
</template>

<script>
import EyeIcon from 'vue-material-design-icons/EyeCircleOutline.vue'
import PencilIcon from 'vue-material-design-icons/Pencil.vue'
import UploadIcon from 'vue-material-design-icons/Upload.vue'
import LockOutlineIcon from 'vue-material-design-icons/LockOutline.vue'
import CalendarMonthIcon from 'vue-material-design-icons/CalendarMonth.vue'
import ChevronRightIcon from 'vue-material-design-icons/ChevronRight.vue'
import SharesMixin from '../mixins/SharesMixin.js'
import ShareDetails from '../mixins/ShareDetails.js'
import ShareTypes from '../mixins/ShareTypes.js'

import {
	BUNDLED_PERMISSIONS,
	ATOMIC_PERMISSIONS,
	hasPermissions,
} from '../lib/SharePermissionsToolBox.js'

import { createFocusTrap } from 'focus-trap'

export default {
	components: {
		EyeIcon,
		PencilIcon,
		UploadIcon,
		LockOutlineIcon,
		CalendarMonthIcon,
		ChevronRightIcon,
	},
	mixins: [SharesMixin, ShareDetails, ShareTypes],
	props: {
		share: {
			type: Object,
			required: true,
		},
		toggle: {
			type: Boolean,
			default: false,
		},
		// TODO apply based on mime type
		disabled: {
			type: Boolean,
			default: false,
		},
	},
	data() {
		return {
			selectedOption: '',
			showDropdown: this.toggle,
			focusTrap: null,
			fileDrop: false,
			canEdit: false,
			canView: false,
		}
	},
	computed: {
		hasExpireDate() {
			if (this.share.expireDate) {
				return true
			}
			return false
		},
		hasPassword() {
			if (this.share.password) {
				return true
			}
			return false
		},
		canViewText() {
			return t('nmcsharing', 'Anyone with the link can only view')
		},
		canEditText() {
			return t('nmcsharing', 'Anyone with the link can edit')
		},
		fileDropText() {
			return t('nmcsharing', 'Anyone with the link can file drop')
		},
		customPermissionsText() {
			return t('files_sharing', 'Custom permissions')
		},
		preSelectedOption() {
			let permissions = this.share.permissions
			if (hasPermissions(this.share.permissions, ATOMIC_PERMISSIONS.SHARE)) {
				// We remove the share permission for the comparison as it is not relevant for bundled permissions.
				permissions = this.share.permissions & ~ATOMIC_PERMISSIONS.SHARE
			}
			if (permissions === BUNDLED_PERMISSIONS.READ_ONLY) {
				this.setCanView(true)
				return this.canViewText
			} else if (permissions === BUNDLED_PERMISSIONS.ALL || permissions === BUNDLED_PERMISSIONS.ALL_FILE) {
				this.setCanEdit(true)
				return this.canEditText
			} else if (permissions === BUNDLED_PERMISSIONS.FILE_DROP) {
				this.setFileDrop(true)
				return this.fileDropText
			}

			return this.customPermissionsText

		},
		options() {
			const options = [this.canViewText, this.canEditText]
			if (this.supportsFileDrop) {
				options.push(this.fileDropText)
			}
			// options.push(this.customPermissionsText)

			return options
		},
		supportsFileDrop() {
			if (this.isFolder) {
				const shareType = this.share.type ?? this.share.shareType
				return [this.SHARE_TYPES.SHARE_TYPE_LINK, this.SHARE_TYPES.SHARE_TYPE_EMAIL].includes(shareType)
			}
			return false
		},
		dropDownPermissionValue() {
			switch (this.selectedOption) {
			case this.canEditText:
				this.setCanView(true)
				this.setCanEdit(true)
				this.setFileDrop(false)
				return this.isFolder ? BUNDLED_PERMISSIONS.ALL : BUNDLED_PERMISSIONS.ALL_FILE
			case this.fileDropText:
				this.setCanView(false)
				this.setCanEdit(false)
				this.setFileDrop(true)
				return BUNDLED_PERMISSIONS.FILE_DROP
			// case this.customPermissionsText:
			// return 'custom'
			case this.canViewText:
			default:
				this.setCanView(true)
				this.setCanEdit(false)
				this.setFileDrop(false)
				return BUNDLED_PERMISSIONS.READ_ONLY
			}
		},
		dropdownId() {
			// Generate a unique ID for ARIA attributes
			return `dropdown-${Math.random().toString(36).substr(2, 9)}`
		},
	},
	watch: {
		toggle(toggleValue) {
			this.showDropdown = toggleValue
		},
	},
	mounted() {
		this.initializeComponent()
		window.addEventListener('click', this.handleClickOutside)
	},
	beforeDestroy() {
		// Remove the global click event listener to prevent memory leaks
		window.removeEventListener('click', this.handleClickOutside)
	},
	methods: {
		setCanView(value) {
			this.canView = value
		},

		setCanEdit(value) {
			this.canEdit = value
		},

		setFileDrop(value) {
			this.fileDrop = value
		},

		toggleDropdown() {
			if (!this.isPermissionEditAllowed) {
				return
			}
			this.showDropdown = !this.showDropdown
			if (this.showDropdown) {
				this.$nextTick(() => {
					this.useFocusTrap()
				})
			} else {
				this.clearFocusTrap()
			}
		},
		closeDropdown() {
			this.clearFocusTrap()
			this.showDropdown = false
		},
		selectOption(option) {
			this.selectedOption = option
			// if (option === this.customPermissionsText) {
			// this.$emit('open-sharing-details')
			// } else {
			// }
			this.share.permissions = this.dropDownPermissionValue
			this.queueUpdate('permissions')
			this.showDropdown = false
		},
		openSharingDetails() {
			this.$emit('open-sharing-details')
		},
		initializeComponent() {
			this.selectedOption = this.preSelectedOption
		},
		handleClickOutside(event) {
			const dropdownContainer = this.$refs.quickShareDropdownContainer

			if (dropdownContainer && !dropdownContainer.contains(event.target)) {
				this.showDropdown = false
			}
		},
		useFocusTrap() {
			// Create global stack if undefined
			// Use in with trapStack to avoid conflicting traps
			Object.assign(window, { _nc_focus_trap: window._nc_focus_trap || [] })
			const dropdownElement = this.$refs.quickShareDropdown
			this.focusTrap = createFocusTrap(dropdownElement, {
				allowOutsideClick: true,
				trapStack: window._nc_focus_trap,
			})

			this.focusTrap.activate()
		},
		clearFocusTrap() {
			this.focusTrap?.deactivate()
			this.focusTrap = null
		},
		shiftFocusForward() {
			const currentElement = document.activeElement
			let nextElement = currentElement.nextElementSibling
			if (!nextElement) {
				nextElement = this.$refs.quickShareDropdown.firstElementChild
			}
			nextElement.focus()
		},
		shiftFocusBackward() {
			const currentElement = document.activeElement
			let previousElement = currentElement.previousElementSibling
			if (!previousElement) {
				previousElement = this.$refs.quickShareDropdown.lastElementChild
			}
			previousElement.focus()
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
		font-size: 14px;
		gap: 2px;
		color: var(--color-primary-element);
		cursor: pointer;

		background: none;
		border: none;
		border-radius: 0;
		margin: 0;
		min-height: 1.5rem;
		padding: 0;
		text-align: left;

		&:hover {
			text-decoration: underline;
		}
	}

	.share-select-dropdown {
		position: absolute;
		display: flex;
		flex-direction: column;
		top: 100%;
		left: 0;
		border-radius: 8px;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
		padding: 4px 0;
		z-index: 1;

		.dropdown-item {
			padding: 8px;
			font-size: 12px;
			background: none;
			border: none;
			border-radius: 0;
			font: inherit;
			cursor: pointer;
			color: inherit;
			outline: none;
			width: 100%;
			white-space: nowrap;
			text-align: left;
		}
	}

	/* Optional: Add a transition effect for smoother dropdown animation */
	.share-select-dropdown {
		max-height: 0;
		overflow: hidden;
		transition: max-height 0.3s ease;
	}

	&.active .share-select-dropdown {
		max-height: 200px;
	}
}
</style>
