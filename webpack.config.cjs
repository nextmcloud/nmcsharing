const path = require('path')
const webpackConfig = require('@nextcloud/webpack-vue-config')

webpackConfig.entry = {
	...webpackConfig.entry,
	tab: path.join(__dirname, 'src', 'files_sharing_tab.js'),
	popup: path.join(__dirname, 'src', 'files_sharing_popup.js'),
	action: path.join(__dirname, 'src', 'action.ts'),
}

// Workaround for https://github.com/nextcloud/webpack-vue-config/pull/432 causing problems with nextcloud-vue-collections
webpackConfig.resolve.alias = {}

module.exports = webpackConfig
