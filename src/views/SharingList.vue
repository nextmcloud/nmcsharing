<template>
	<ul class="sharing-sharee-list">
		<template v-if="hasShares">
			<li class="sharing-link-list-caption">
				<strong>{{ t('nmcsharing', 'Shares') }}</strong>
			</li>

			<SharingEntry
				v-for="share in shares"
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
import { ShareType } from '@nextcloud/sharing'

import SharingEntry from '../components/SharingEntry.vue'
import ShareDetails from '../mixins/ShareDetails.js'

export default {
	name: 'SharingList',

	components: {
		SharingEntry,
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
	},

	computed: {
		hasShares() {
			return this.shares.length > 0
		},
	},

	methods: {
		isUnique(share) {
			return this.shares.filter(item =>
				share.type === ShareType.User
				&& share.shareWithDisplayName === item.shareWithDisplayName,
			).length <= 1
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
