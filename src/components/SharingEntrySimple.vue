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
	<div class="sharing-entry">
		<span class="icon icon-upload-to-cloud" />
		<div class="sharing-entry__desc">
			<span class="sharing-entry__title">{{ title }}. <span v-if="reshare">{{ reshare }}.</span></span>
			<p v-if="subtitle">
				{{ subtitle }}
			</p>
		</div>
	</div>
</template>

<script>

export default {
	name: 'SharingEntrySimple',

	props: {
		title: {
			type: String,
			default: '',
			required: true,
		},
		subtitle: {
			type: String,
			default: '',
		},
		reshare: {
			type: String,
			default: '',
		},
	},
}
</script>

<style lang="scss" scoped>
.sharing-entry {
	display: flex;
	align-items: start;

	.icon {
		min-width: 2rem;
		min-height: 1.2rem;
		filter: invert(61%) sepia(98%) saturate(4546%) hue-rotate(181deg) brightness(99%) contrast(109%);
		margin-top: 1rem;
	}

	&__desc {
		padding: 1rem 0.5rem;
		line-height: 1.2em;
		position: relative;
		flex: 1 1;
		min-width: 0;

		p {
			color: var(--color-text-maxcontrast);
		}
	}

	&__title {
		white-space: nowrap;
		text-overflow: ellipsis;
		overflow: hidden;
		max-width: inherit;
	}
}
</style>
