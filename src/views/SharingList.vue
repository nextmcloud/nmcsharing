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
	<ul class="sharing-sharee-list">
		<template v-if="!hasShares">
			<li class="sharing-link-list-caption">
				<strong>{{ t('nmcsharing', 'Shares') }}</strong>
			</li>
			<SharingEntry v-for="share in shares"
				:key="share.id"
				:file-info="fileInfo"
				:share="share"
				:is-unique="isUnique(share)"
				@remove:share="removeShare"
				@open-sharing-details="openSharingDetails(share)" />
		</template>
	</ul>
</template>

<script>
// eslint-disable-next-line no-unused-vars
import Share from '../models/Share.js'
import SharingEntry from '../components/SharingEntry.vue'
import ShareTypes from '../mixins/ShareTypes.js'
import ShareDetails from '../mixins/ShareDetails.js'

export default {
	name: 'SharingList',

	components: {
		SharingEntry,
	},

	mixins: [ShareTypes, ShareDetails],

	props: {
		fileInfo: {
			type: Object,
			default: () => { },
			required: true,
		},
		shares: {
			type: Array,
			default: () => [],
			required: true,
		},
	},
	computed: {
		hasShares() {
			return this.shares.length === 0
		},
		isUnique() {
			return (share) => {
				return [...this.shares].filter((item) => {
					return share.type === this.SHARE_TYPES.SHARE_TYPE_USER && share.shareWithDisplayName === item.shareWithDisplayName
				}).length <= 1
			}
		},
	},
	methods: {
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
