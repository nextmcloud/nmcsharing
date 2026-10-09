<template>
	<div class="sharing-entry">
		<span
			class="icon icon-upload-to-cloud"
			aria-hidden="true" />

		<div class="sharing-entry__desc">
			<span
				class="sharing-entry__title"
				:title="fullTitle">
				{{ title }}.<template v-if="reshare"> {{ reshare }}.</template>
			</span>

			<p
				v-if="subtitle"
				class="sharing-entry__subtitle">
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

	computed: {
		fullTitle() {
			return this.reshare
				? `${this.title}. ${this.reshare}.`
				: `${this.title}.`
		},
	},
}
</script>

<style lang="scss" scoped>
.sharing-entry {
	display: flex;
	align-items: flex-start;

	.icon {
		min-width: 2rem;
		min-height: 1.2rem;
		margin-top: 1rem;
		filter: invert(61%) sepia(98%) saturate(4546%) hue-rotate(181deg) brightness(99%) contrast(109%);
	}

	&__desc {
		position: relative;
		flex: 1 1 auto;
		min-width: 0;
		padding: 1rem 0.5rem;
		line-height: 1.2em;
	}

	&__title {
		display: block;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	&__subtitle {
		color: var(--color-text-maxcontrast);
	}
}
</style>
