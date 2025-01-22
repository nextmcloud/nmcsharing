<template>
	<div :class="{ 'share-select': true, 'disabled': disabled }">
		<span :id="dropdownId"
			class="trigger-text"
			@click="openDetails">
			<EyeIcon v-if="canView" :size="16" />
			<PencilIcon v-if="canEdit" :size="16" />
			<UploadIcon v-if="canFileDrop" :size="16" />
			{{ selectedOption }}
			<LockOutlineIcon v-if="hasPassword" :size="16" />
			<CalendarMonthIcon v-if="hasExpireDate" :size="16" />
			<ChevronRightIcon :size="18" />
		</span>
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
			default: () => ({}),
			required: true,
		},
		// TODO apply based on mime type
		disabled: {
			type: Boolean,
			default: false,
		},
	},
	data() {
		return {
			canViewPermission: 1,
		}
	},
	computed: {
		canView() {
			if (this.selectedOption === this.canViewText) {
				return true
			}
			return false
		},
		canEdit() {
			if (this.selectedOption === this.canEditText) {
				return true
			}
			return false
		},
		canFileDrop() {
			if (this.selectedOption === this.fileDropText) {
				return true
			}
			return false
		},
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
			return t('nmcsharing', 'No share permissions set yet')
		},
		selectedOption() {
			let permissions = this.share.permissions
			console.log(this.share)
			console.log(this.share.permissions)
			if (hasPermissions(this.share.permissions, ATOMIC_PERMISSIONS.SHARE)) {
				// We remove the share permission for the comparison as it is not relevant for bundled permissions.
				permissions = this.share.permissions & ~ATOMIC_PERMISSIONS.SHARE
			}
			if (permissions === BUNDLED_PERMISSIONS.READ_ONLY) {
				return this.canViewText
			} else if (permissions === BUNDLED_PERMISSIONS.ALL || permissions === BUNDLED_PERMISSIONS.ALL_FILE) {
				return this.canEditText
			} else if (permissions === BUNDLED_PERMISSIONS.FILE_DROP) {
				return this.fileDropText
			}
			return this.customPermissionsText
		},
		dropdownId() {
			// Generate a unique ID for ARIA attributes
			return `dropdown-${Math.random().toString(36).substr(2, 9)}`
		},
	},
	mounted() {
		window.addEventListener('click', this.handleClickOutside)
	},
	beforeDestroy() {
		window.removeEventListener('click', this.handleClickOutside)
	},
	methods: {
		openDetails() {
			this.$emit('open-sharing-details-all')
		},
	},
}
</script>

<style lang="scss" scoped>
.share-select {
	cursor: pointer;    
	position: relative;
	margin-top: 0.5rem;

	.trigger-text {
		display: flex;
		flex-direction: row;
		align-items: center;
		font-size: 14px;
		gap: 2px;
		color: var(--color-primary-element);
		cursor: pointer;

		&:hover {
			text-decoration: underline;
		}
	}

	&.disabled .trigger-text {
		color: var(--telekom-color-text-and-icon-disabled);

		&:hover {
			text-decoration: none;
		}
	}
}
</style>
