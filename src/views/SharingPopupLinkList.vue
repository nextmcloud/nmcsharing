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
	<div v-if="canReshare">
		<h2 class="sharing-link-list-caption">
			<strong>{{ t('nmcsharing', 'Link to copy') }}</strong>
		</h2>
		<ul v-if="canLinkShare && canReshare && hasLinkShares" class="sharing-link-list">
			<template v-for="(share, index) in shares">
				<SharingEntryLink v-if="share.type === shareTypeLink"
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
		<AddLinkButton :file-info="fileInfo" @add:share="addShare" />
	</div>
</template>

<script>
// eslint-disable-next-line no-unused-vars
import Share from '../models/Share.js'
import ShareDetails from '../mixins/ShareDetails.js'
import ShareTypes from '../mixins/ShareTypes.js'
import SharingEntryLink from '../components/SharingEntryLink.vue'
import AddLinkButton from '../components/AddLinkButton.vue'

export default {
	name: 'SharingPopupLinkList',

	components: {
		SharingEntryLink,
		AddLinkButton,
	},

	mixins: [ShareTypes, ShareDetails],

	props: {
		fileInfo: {
			type: Object,
			default: () => {},
			required: true,
		},
		shares: {
			type: Array,
			default: () => [],
			required: true,
		},
		canReshare: {
			type: Boolean,
			required: true,
		},
	},

	data() {
		return {
			canLinkShare: OC.getCapabilities().files_sharing.public.enabled,
		}
	},

	computed: {
		/**
		 * Do we have link shares?
		 *
		 * @return {boolean}
		 */
		hasLinkShares() {
			return this.shares.filter(share => share.type === this.shareTypeLink).length > 0
		},

		/**
		 * Do we have email shares?
		 *
		 * @return {boolean}
		 */
		hasMailShares() {
			return this.shares.filter(share => share.type === this.shareTypeMail).length > 0
		},

		/**
		 * @return {number}
		 */
		shareTypeLink() {
			return this.SHARE_TYPES.SHARE_TYPE_LINK
		},

		/**
		 * @return {number}
		 */
		shareTypeMail() {
			return this.SHARE_TYPES.SHARE_TYPE_EMAIL
		},
	},

	methods: {
		/**
		 * Add a new share into the link shares list
		 * and return the newly created share component
		 *
		 * @param {Share} share the share to add to the array
		 * @param {Function} resolve a function to run after the share is added and its component initialized
		 */
		addShare(share, resolve) {
			// eslint-disable-next-line vue/no-mutating-props
			this.shares.unshift(share)
			this.awaitForShare(share, resolve)
			this.$emit('link-share-created')
		},

		/**
		 * Await for next tick and render after the list updated
		 * Then resolve with the matched vue component of the
		 * provided share object
		 *
		 * @param {Share} share newly created share
		 * @param {Function} resolve a function to execute after
		 */
		awaitForShare(share, resolve) {
			this.$nextTick(() => {
				const newShare = this.$children.find(component => component.share === share)
				if (newShare) {
					resolve(newShare)
				}
			})
		},

		/**
		 * Remove a share from the shares list
		 *
		 * @param {Share} share the share to remove
		 */
		removeShare(share) {
			const index = this.shares.findIndex(item => item === share)
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
