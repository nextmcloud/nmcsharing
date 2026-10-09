/**
 * SPDX-FileCopyrightText: 2019 Nextcloud GmbH and Nextcloud contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Convert a modern @nextcloud/files Node to the legacy FileInfo format
 * expected by the existing sharing components.
 *
 * @param {object} node The selected file/folder node
 * @return {object} Legacy FileInfo instance
 */
export default function FileInfo(node) {
	const attributes = node.attributes ?? {}

	let shareAttributes = []

	try {
		shareAttributes = JSON.parse(
			attributes['share-attributes'] || '[]',
		)
	} catch (error) {
		console.error(
			'[nmcsharing] Failed to parse share attributes',
			error,
		)

		shareAttributes = []
	}

	const rawFileInfo = {
		id: node.fileid,
		path: node.dirname,
		name: node.basename,
		mtime: node.mtime?.getTime(),
		etag: attributes.etag,
		size: node.size,
		hasPreview: attributes.hasPreview,
		isEncrypted: attributes.isEncrypted === 1,
		isFavourited: attributes.favorite === 1,
		mimetype: node.mime,
		permissions: node.permissions,
		mountType: attributes['mount-type'],
		sharePermissions: attributes['share-permissions'],
		shareAttributes,
		type: node.type === 'file'
			? 'file'
			: 'dir',
		attributes,
	}

	const fileInfo = new OC.Files.FileInfo(rawFileInfo)

	// Compatibility with the old sharing components.
	fileInfo.get = key => fileInfo[key]

	fileInfo.isDirectory = () =>
		fileInfo.mimetype === 'httpd/unix-directory'

	fileInfo.canEdit = () =>
		Boolean(
			fileInfo.permissions
			& OC.PERMISSION_UPDATE,
		)

	// Keep access to the modern Node.
	fileInfo.node = node

	return fileInfo
}