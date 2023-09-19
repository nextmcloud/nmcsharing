module.exports = {
	globals: {
		__webpack_nonce__: true,
		moment: true,
		__webpack_public_path__: true,
	},
	extends: [
		'@nextcloud',
	],
	rules: {
		'vue/no-mutating-props': 'warn',
		camelcase: 'off',
		'jsdoc/require-param-description': 'off',
		'n/no-unpublished-import': 'off',
		'vue/require-default-prop': 'off',
		'vue/require-prop-type-constructor': 'off',
		'@typescript-eslint/no-explicit-any': 'off',
	},
}
