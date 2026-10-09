<template>
	<div>
		<ul v-if="canLinkShare && canReshare" class="sharing-link-list">
			<template v-if="hasMailShares">
				<li class="sharing-link-list-caption">
					<strong>{{ t('nmcsharing', 'Links sent via E-Mail') }}</strong>
				</li>

				<template v-for="(share, index) in shares">
					<SharingEntryLink
						v-if="share.type === shareTypeMail"
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
			</template>
		</ul>

		<ul v-if="canLinkShare && canReshare" class="sharing-link-list">
			<template v-if="hasLinkShares">
				<li class="sharing-link-list-caption">
					<strong>{{ t('nmcsharing', 'Link to copy') }}</strong>
				</li>

				<template v-for="(share, index) in shares">
					<SharingEntryLink
						v-if="share.type === shareTypeLink"
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
			</template>
		</ul>
	</div>
</template>

<script>
import { ShareType } from '@nextcloud/sharing'

import ShareDetails from '../mixins/ShareDetails.js'
import SharingEntryLink from '../components/SharingEntryLink.vue'

export default {
	name: 'SharingLinkList',

	components: {
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
			canLinkShare: OC.getCapabilities()?.files_sharing?.public?.enabled === true,
		}
	},

	computed: {
		hasLinkShares() {
			return this.shares.some(
				share => share.type === ShareType.Link,
			)
		},

		hasMailShares() {
			return this.shares.some(
				share => share.type === ShareType.Email,
			)
		},

		shareTypeLink() {
			return ShareType.Link
		},

		shareTypeMail() {
			return ShareType.Email
		},
	},

	methods: {
		/**
		 * Add a new share into the link shares list.
		 *
		 * @param {object} share share to add
		 * @param {Function} resolve callback
		 */
		addShare(share, resolve = () => {}) {
			// eslint-disable-next-line vue/no-mutating-props
			this.shares.unshift(share)

			this.awaitForShare(share, resolve)
		},

		/**
		 * Wait until the new share component has been rendered.
		 *
		 * @param {object} share newly created share
		 * @param {Function} resolve callback
		 */
		awaitForShare(share, resolve = () => {}) {
			this.$nextTick(() => {
				const newShare = this.$children.find(
					component => component.share === share,
				)

				if (newShare) {
					resolve(newShare)
				}
			})
		},

		/**
		 * Remove a share from the shares list.
		 *
		 * @param {object} share share to remove
		 */
		removeShare(share) {
			const index = this.shares.findIndex(item => item === share)

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
}
</style>
