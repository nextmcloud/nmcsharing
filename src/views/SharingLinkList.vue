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
	<ul v-if="canLinkShare && canReshare" class="sharing-link-list">
		<OpenSharingModalButton :file-info="fileInfo" @add:share="addShare" class="share-button" />

		<template v-if="hasMailShares">
			<h1>
				<strong>{{ t('nmcsharing', 'Links sent per E-mail') }}</strong>
			</h1>

			<template v-for="(share, index) in shares">
				<!-- using shares[index] to work with .sync -->
				<SharingEntryLink v-if="share.type === shareTypeMail"
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

		<template v-if="hasLinkShares">
			<h1>
				<strong>{{ t('nmcsharing', 'Links to Copy') }}</strong>
			</h1>

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
		</template>
	</ul>
</template>

<script>
// eslint-disable-next-line no-unused-vars
import Share from '../models/Share.js'
import OpenSharingModalButton from '../components/OpenSharingModalButton.vue'
import SharingEntryLink from '../components/SharingEntryLink.vue'
import ShareDetails from '../mixins/ShareDetails.js'
import ShareTypes from '../mixins/ShareTypes.js'

export default {
	name: 'SharingLinkList',

	components: {
		SharingEntryLink,
		OpenSharingModalButton,
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
		 * @return {int}
		 */
		shareTypeLink() {
			return this.SHARE_TYPES.SHARE_TYPE_LINK
		},

		/**
		 * Do we have mail shares?
		 *
		 * @return {boolean}
		 */
		hasMailShares() {
			return this.shares.filter(share => share.type === this.shareTypeMail).length > 0
		},

		/**
		 * @return {int}
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
.sharing-link-list-caption {
	display: flex;
	align-items: center;
	min-height: 44px;
}
.share-button {
	display: flex;
	justify-content: end;
}
</style>
