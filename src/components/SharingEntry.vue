<template>
	<li class="sharing-entry">
		<div class="sharing-entry__desc">
			<component
				:is="share.shareWithLink ? 'a' : 'div'"
				:title="tooltip || undefined"
				:aria-label="tooltip || title"
				:href="share.shareWithLink || undefined"
				:role="!share.shareWithLink && isPermissionEditAllowed
					? 'button'
					: undefined"
				:tabindex="!share.shareWithLink && isPermissionEditAllowed
					? 0
					: undefined"
				class="sharing-entry__title"
				@click="onTitleClick"
				@keydown="onTitleKeydown">

				<span>
					{{ title }}

					<span
						v-if="!isUnique && share.shareWithDisplayNameUnique"
						class="sharing-entry__desc-unique">
						({{ share.shareWithDisplayNameUnique }})
					</span>
				</span>

				<p v-if="hasStatus">
					<span
						v-if="share.status.icon"
						aria-hidden="true">
						{{ share.status.icon }}
					</span>

					<span v-if="share.status.message">
						{{ share.status.message }}
					</span>
				</p>
			</component>

			<QuickShareSelect
				v-if="share && share.permissions !== undefined"
				:share="share"
				:file-info="fileInfo"
				:toggle="showDropdown"
				@open-sharing-details="openShareDetailsForCustomSettings(share)" />
		</div>

		<NcButton
			v-if="share && share.canDelete"
			:disabled="saving"
			:title="t('files_sharing', 'Delete')"
			:aria-label="t('files_sharing', 'Delete')"
			variant="secondary"
			@click.prevent="onDelete">

			<template #icon>
				<span
					aria-hidden="true"
					class="icon icon-delete" />
			</template>

			<template #default>
				{{ t('files_sharing', 'Delete') }}
			</template>
		</NcButton>
	</li>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { ShareType } from '@nextcloud/sharing'

import NcButton from '@nextcloud/vue/dist/Components/NcButton.js'

import QuickShareSelect from './SharingEntryQuickShareSelect.vue'

import ShareDetails from '../mixins/ShareDetails.js'
import SharesMixin from '../mixins/SharesMixin.js'

export default {
	name: 'SharingEntry',

	components: {
		NcButton,
		QuickShareSelect,
	},

	mixins: [
		SharesMixin,
		ShareDetails,
	],

	props: {
		/*
		 * Kept for compatibility with existing parents.
		 * Currently not used directly by this component.
		 */
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
		/**
		 * Normalized share type.
		 *
		 * @return {number|undefined}
		 */
		currentShareType() {
			const type = this.share?.type

			if (type === null || type === undefined) {
				return undefined
			}

			const normalized = Number(type)

			return Number.isNaN(normalized)
				? undefined
				: normalized
		},

		/**
		 * Display name including the share type where appropriate.
		 *
		 * @return {string}
		 */
		title() {
			let title = this.share?.shareWithDisplayName
				|| this.share?.shareWith
				|| ''

			switch (this.currentShareType) {
			case ShareType.Group:
				title += ` (${t('files_sharing', 'group')})`
				break

			case ShareType.Room:
				title += ` (${t('files_sharing', 'conversation')})`
				break

			case ShareType.Remote:
				title += ` (${t('files_sharing', 'remote')})`
				break

			case ShareType.RemoteGroup:
				title += ` (${t('files_sharing', 'remote group')})`
				break

			case ShareType.Guest:
				title += ` (${t('files_sharing', 'guest')})`
				break
			}

			return title
		},

		/**
		 * Description of who created the share.
		 *
		 * @return {string|undefined}
		 */
		tooltip() {
			if (
				!this.share
				|| this.share.owner === this.share.uidFileOwner
			) {
				return undefined
			}

			const data = {
				user: this.share.shareWithDisplayName
					|| this.share.shareWith
					|| '',
				owner: this.share.ownerDisplayName || '',
			}

			if (this.currentShareType === ShareType.Group) {
				return t(
					'files_sharing',
					'Shared with the group {user} by {owner}',
					data,
				)
			}

			if (this.currentShareType === ShareType.Room) {
				return t(
					'files_sharing',
					'Shared with the conversation {user} by {owner}',
					data,
				)
			}

			return t(
				'files_sharing',
				'Shared with {user} by {owner}',
				data,
			)
		},

		/**
		 * Does the user share have a status?
		 *
		 * @return {boolean}
		 */
		hasStatus() {
			if (this.currentShareType !== ShareType.User) {
				return false
			}

			const status = this.share?.status

			if (
				status === null
				|| typeof status !== 'object'
				|| Array.isArray(status)
			) {
				return false
			}

			return Boolean(
				status.icon
				|| status.message,
			)
		},
	},

	methods: {
		/**
		 * Either allow the native link navigation or toggle the
		 * permission selector for non-link entries.
		 *
		 * @param {MouseEvent} event Click event
		 */
		onTitleClick(event) {
			if (this.share?.shareWithLink) {
				return
			}

			if (!this.isPermissionEditAllowed) {
				return
			}

			event.preventDefault()
			this.toggleQuickShareSelect()
		},

		/**
		 * Keyboard support for the clickable non-link title.
		 *
		 * @param {KeyboardEvent} event Keyboard event
		 */
		onTitleKeydown(event) {
			if (
				this.share?.shareWithLink
				|| !this.isPermissionEditAllowed
			) {
				return
			}

			if (
				event.key !== 'Enter'
				&& event.key !== ' '
			) {
				return
			}

			event.preventDefault()
			this.toggleQuickShareSelect()
		},

		toggleQuickShareSelect() {
			if (!this.isPermissionEditAllowed) {
				return
			}

			this.showDropdown = !this.showDropdown
		},
	},
}
</script>

<style lang="scss" scoped>
.sharing-entry {
	display: flex;
	align-items: center;
	justify-content: flex-end;
	min-height: 2rem;

	&__desc {
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		margin-right: auto;
		padding: 0.5rem;
		line-height: 1rem;

		p {
			color: var(--color-text-maxcontrast);
		}

		&-unique {
			color: var(--color-text-maxcontrast);
		}
	}

	&__title {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;

		&[role='button'] {
			cursor: pointer;
		}
	}

	::v-deep .avatar-link-share {
		background-color: var(--color-main-background);
	}
}
</style>
