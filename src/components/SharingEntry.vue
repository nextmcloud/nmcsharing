<!--
  - @copyright Copyright (c) 2019 John Molakvoæ <skjnldsv@protonmail.com>
  -
  - @author John Molakvoæ <skjnldsv@protonmail.com>
  -
  - @license GNU AGPL version 3 or any later version
  -
  - This program is free software: you can redistribute it and/or modify
  - it under the terms of the GNU Affero General Public License as
  - published by the Free Software Foundation, either version 3 of the
  - License, or (at your option) any later version.
  -
  - This program is distributed in the hope that it will be useful,
  - but WITHOUT ANY WARRANTY; without even the implied warranty of
  - MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  - GNU Affero General Public License for more details.
  -
  - You should have received a copy of the GNU Affero General Public License
  - along with this program. If not, see <http://www.gnu.org/licenses/>.
  -
  -->

<template>
	<li class="sharing-entry">
		<div class="sharing-entry__desc" @click.prevent="toggleQuickShareSelect">
			<component :is="share.shareWithLink ? 'a' : 'div'"
				:title="tooltip"
				:aria-label="tooltip"
				:href="share.shareWithLink"
				class="sharing-entry__title">
				<span>{{ title }}<span v-if="!isUnique" class="sharing-entry__desc-unique"> ({{
					share.shareWithDisplayNameUnique }})</span></span>
				<p v-if="hasStatus">
					<span>{{ share.status.icon || '' }}</span>
					<span>{{ share.status.message || '' }}</span>
				</p>
			</component>
			<QuickShareSelect :share="share"
				:file-info="fileInfo"
				:toggle="showDropdown"
				@open-sharing-details="openShareDetailsForCustomSettings(share)" />
		</div>

		<NcButton v-if="share.canDelete"
			:disabled="saving"
			:title="t('files_sharing', 'Delete')"
			@click.prevent="onDelete">
			<template #icon>
				<span class="icon icon-delete" />
			</template>
			<template #default>
				{{ t('files_sharing', 'Delete') }}
			</template>
		</NcButton>
	</li>
</template>

<script>

import NcButton from '@nextcloud/vue/dist/Components/NcButton.js'
import QuickShareSelect from './SharingEntryQuickShareSelect.vue'
import SharesMixin from '../mixins/SharesMixin.js'
import ShareDetails from '../mixins/ShareDetails.js'

export default {
	name: 'SharingEntry',

	components: {
		NcButton,
		QuickShareSelect,
	},

	mixins: [SharesMixin, ShareDetails],

	props: {
		// TODO add reshare property
		canReshare: {
			type: Boolean,
			default: true,
		},
	},

	data() {
		return {
			showDropdown: false,
		}
	},
	computed: {
		title() {
			let title = this.share.shareWithDisplayName
			if (this.share.type === this.SHARE_TYPES.SHARE_TYPE_GROUP) {
				title += ` (${t('files_sharing', 'group')})`
			} else if (this.share.type === this.SHARE_TYPES.SHARE_TYPE_ROOM) {
				title += ` (${t('files_sharing', 'conversation')})`
			} else if (this.share.type === this.SHARE_TYPES.SHARE_TYPE_REMOTE) {
				title += ` (${t('files_sharing', 'remote')})`
			} else if (this.share.type === this.SHARE_TYPES.SHARE_TYPE_REMOTE_GROUP) {
				title += ` (${t('files_sharing', 'remote group')})`
			} else if (this.share.type === this.SHARE_TYPES.SHARE_TYPE_GUEST) {
				title += ` (${t('files_sharing', 'guest')})`
			}
			return title
		},
		tooltip() {
			if (this.share.owner !== this.share.uidFileOwner) {
				const data = {
					// todo: strong or italic?
					// but the t function escape any html from the data :/
					user: this.share.shareWithDisplayName,
					owner: this.share.ownerDisplayName,
				}
				if (this.share.type === this.SHARE_TYPES.SHARE_TYPE_GROUP) {
					return t('files_sharing', 'Shared with the group {user} by {owner}', data)
				} else if (this.share.type === this.SHARE_TYPES.SHARE_TYPE_ROOM) {
					return t('files_sharing', 'Shared with the conversation {user} by {owner}', data)
				}

				return t('files_sharing', 'Shared with {user} by {owner}', data)
			}
			return null
		},

		/**
		 * @return {boolean}
		 */
		hasStatus() {
			if (this.share.type !== this.SHARE_TYPES.SHARE_TYPE_USER) {
				return false
			}

			return (typeof this.share.status === 'object' && !Array.isArray(this.share.status))
		},
	},

	methods: {
		/**
		 * Save potential changed data on menu close
		 */
		onMenuClose() {
			this.onNoteSubmit()
		},
		toggleQuickShareSelect() {
			this.showDropdown = !this.showDropdown
		},
	},
}
</script>

<style lang="scss" scoped>
.sharing-entry {
	display: flex;
	align-items: center;
	min-height: 2rem;
	justify-content: flex-end;

	&__desc {
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		padding: 0.5rem;
		line-height: 1rem;
		margin-right: auto;

		p {
			color: var(--color-text-maxcontrast);
		}

		&-unique {
			color: var(--color-text-maxcontrast);
		}
	}

	&__title {
		text-overflow: ellipsis;
		overflow: hidden;
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
		margin: 0;
		padding: 14px;
		margin-left: auto;
	}

	// put menus to the left
	// but only the first one
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

	.button-vue:hover:not(:disabled) {
		background-color: initial;
	}
}
</style>
