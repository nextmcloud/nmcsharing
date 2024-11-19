<template>
	<div ref="quickShareDropdownContainer"
		:class="{ 'active': showDropdown, 'share-select': true, 'disabled': !isPermissionEditAllowed }">
		<span :id="dropdownId"
			class="trigger-text"
			:aria-expanded="showDropdown"
			:aria-haspopup="true"
			aria-label="Quick share options dropdown"
			@click="toggleDropdown">
			<!-- <DropdownIcon :size="15" /> -->
			<UploadIcon v-if="dropPermission" :size="15" />
			<PencilIcon v-if="editPermission" :size="15" />
			<EyeIcon v-if="readPermission" :size="15" />
			{{ selectedOption }}
		</span>
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
			dropPermission: false,
			editPermission: false,
			readPermission: false,
			showDropdown: this.toggle,
			focusTrap: null,
		}
	},
	computed: {
		canViewText() {
			return t('nmcsharing', 'Read only')
		},
		canEditText() {
			return t('nmcsharing', 'Can edit')
		},
		fileDropText() {
			return t('nmcsharing', 'File drop')
		},
		customPermissionsText() {
			return t('files_sharing', 'Custom permissions')
		},
		/* eslint-disable */
		preSelectedOption() {
			let permissions = this.share.permissions
			if (hasPermissions(this.share.permissions, ATOMIC_PERMISSIONS.SHARE)) {
				// We remove the share permission for the comparison as it is not relevant for bundled permissions.
				permissions = this.share.permissions & ~ATOMIC_PERMISSIONS.SHARE
			}
			if (permissions === BUNDLED_PERMISSIONS.READ_ONLY) {
				this.readPermission = true
				return this.canViewText
			} else if (permissions === BUNDLED_PERMISSIONS.ALL || permissions === BUNDLED_PERMISSIONS.ALL_FILE) {
				this.editPermission = true
				return this.canEditText
			} else if (permissions === BUNDLED_PERMISSIONS.FILE_DROP) {
				this.dropPermission = true
				return this.fileDropText
			}

			return this.customPermissionsText
		},
		/* eslint-enable */
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
		/* eslint-disable */
		dropDownPermissionValue() {
			switch (this.selectedOption) {
			case this.canEditText:
				this.editPermission = true
				this.readPermission = false
				this.dropPermission = false
				return this.isFolder ? BUNDLED_PERMISSIONS.ALL : BUNDLED_PERMISSIONS.ALL_FILE
			case this.fileDropText:
				this.dropPermission = true
				this.editPermission = false
				this.readPermission = false
				return BUNDLED_PERMISSIONS.FILE_DROP
				// case this.customPermissionsText:
				// return 'custom'
			case this.canViewText:
				this.readPermission = true
				this.editPermission = false
				this.dropPermission = false
				break
			default:
				return BUNDLED_PERMISSIONS.READ_ONLY
			}
		},
		/* eslint-enable */
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
	}

	.share-select-dropdown {
		position: absolute;
		display: flex;
		flex-direction: column;
		top: 100%;
		left: 0;
		background-color: var(--telekom-color-background-surface);
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

			&:hover {
				color: var(--telekom-color-primary-standard)
			}
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
		/* Adjust the value to your desired height */
	}

	&.disabled .trigger-text {
		color: var(--telekom-color-text-and-icon-disabled);
	}
}
</style>
