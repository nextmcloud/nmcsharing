<template>
	<div v-if="canReshare">
		<h2 class="sharing-link-list-caption">
			<strong>{{ t('nmcsharing', 'Link to copy') }}</strong>
		</h2>

		<ul v-if="canLinkShare && hasLinkShares" class="sharing-link-list">
			<template v-for="(share, index) in shares">
				<SharingEntryLink
					v-if="share.type === ShareType.Link"
					:key="share.id"
					:index="shares.length > 1 ? index + 1 : null"
					:can-reshare="canReshare"
					:share.sync="shares[index]"
					:file-info="fileInfo"
					@add:share="addShare(...arguments)"
					@update:share="awaitForShare(...arguments)"
					@remove:share="removeShare"
					@open-sharing-details="openSharingDetails(share)" />
			</template>
		</ul>

		<AddLinkButton
			v-if="canLinkShare"
			:file-info="fileInfo"
			@add:share="addShare" />
	</div>
</template>

<script>
import { ShareType } from '@nextcloud/sharing'

import AddLinkButton from '../components/AddLinkButton.vue'
import SharingEntryLink from '../components/SharingEntryLink.vue'
import ShareDetails from '../mixins/ShareDetails.js'

export default {
	name: 'SharingPopupLinkList',

	components: {
		AddLinkButton,
		SharingEntryLink,
	},

	mixins: [ShareDetails],

	props: {
		fileInfo: {
			type: Object,
			required: true,
		},

		shares: {
			type: Array,
			required: true,
		},

		canReshare: {
			type: Boolean,
			required: true,
		},
	},

	data() {
		return {
			ShareType,
			canLinkShare: OC.getCapabilities()?.files_sharing?.public?.enabled === true,
		}
	},

	computed: {
		hasLinkShares() {
			return this.shares.some(
				share => share.type === ShareType.Link,
			)
		},
	},

	methods: {
		/**
		 * Add a new share to the list.
		 *
		 * @param {object} share share to add
		 * @param {Function} resolve optional callback
		 */
		addShare(share, resolve = () => {}) {
			if (!share) {
				return
			}

			const exists = this.shares.some(
				item => item.id !== undefined
					&& share.id !== undefined
					&& item.id === share.id,
			)

			if (!exists) {
				// eslint-disable-next-line vue/no-mutating-props
				this.shares.unshift(share)
			}

			this.awaitForShare(share, resolve)
			this.$emit('link-share-created', share)
		},

		/**
		 * Wait until the newly added SharingEntryLink exists.
		 *
		 * @param {object} share newly created share
		 * @param {Function} resolve optional callback
		 */
		awaitForShare(share, resolve = () => {}) {
			this.$nextTick(() => {
				const newShare = this.$children.find(
					component => component.share === share
						|| (
							component.share?.id !== undefined
							&& share?.id !== undefined
							&& component.share.id === share.id
						),
				)

				if (newShare) {
					resolve(newShare)
				}
			})
		},

		/**
		 * Remove a share from the list.
		 *
		 * @param {object} share share to remove
		 */
		removeShare(share) {
			const index = this.shares.findIndex(
				item => item === share || item.id === share.id,
			)

			if (index === -1) {
				return
			}

			// eslint-disable-next-line vue/no-mutating-props
			this.shares.splice(index, 1)
		},
	},
}
</script>

<style lang="scss" scoped>
.sharing-link-list {
	margin-bottom: 1rem;
}

.sharing-link-list-caption {
	display: flex;
	align-items: center;
	min-height: 2rem;
	margin-bottom: 1rem;
}
</style>
