import { getShareAttributes } from '../utils/ShareAttributes.js'

/**
 * Same normalisation as the legacy OC.Files.FileInfo, which Nextcloud 34 removed.
 *
 * @param {object} data raw file info values
 * @return {object} FileInfo
 */
function createLegacyFileInfo(data) {
	const fileInfo = {
		icon: null,
		hasPreview: true,
		shareAttributes: [],
		quotaAvailableBytes: -1,
	}

	for (const [key, value] of Object.entries(data)) {
		if (typeof value !== 'function') {
			fileInfo[key] = value
		}
	}

	if (fileInfo.id !== undefined) {
		fileInfo.id = parseInt(data.id, 10)
	}

	fileInfo.path = data.path || ''

	if (fileInfo.type === 'dir') {
		fileInfo.mimetype = 'httpd/unix-directory'
	} else {
		fileInfo.mimetype = fileInfo.mimetype || 'application/octet-stream'
	}

	if (!fileInfo.type) {
		fileInfo.type = fileInfo.mimetype === 'httpd/unix-directory' ? 'dir' : 'file'
	}

	return fileInfo
}

/**
 * Convert a Nextcloud FileNode into the legacy FileInfo shape
 * expected by the sharing components.
 *
 * @param {object} node Nextcloud file node
 * @return {object} FileInfo
 */
export default function FileInfo(node) {
	const attributes = node.attributes ?? {}

	const rawFileInfo = {
		id: node.fileid,
		path: node.dirname,
		name: node.basename,

		mtime:
			node.mtime instanceof Date
				? node.mtime.getTime()
				: node.mtime,

		etag: attributes.etag,
		size: node.size,

		hasPreview:
			attributes.hasPreview,

		isEncrypted:
			attributes['is-encrypted'] === 1
			|| attributes['is-encrypted'] === true
			|| attributes.isEncrypted === 1
			|| attributes.isEncrypted === true,

		isFavourited:
			attributes.favorite === 1
			|| attributes.favorite === true,

		mimetype: node.mime,

		permissions:
			node.permissions,

		mountType:
			attributes['mount-type'],

		sharePermissions: Number(
			attributes['share-permissions']
				?? node.permissions,
		),

		shareAttributes:
			getShareAttributes(node),

		shareOwner:
			attributes['share-owner-displayname'],

		shareOwnerId:
			attributes['share-owner-id'],

		type:
			node.type === 'file'
				? 'file'
				: 'dir',

		attributes,
	}

	const fileInfo =
		createLegacyFileInfo(rawFileInfo)

	/*
	 * Compatibility helpers required by the existing
	 * nmcsharing components.
	 */
	fileInfo.get = key =>
		fileInfo[key]

	fileInfo.isDirectory = () =>
		fileInfo.type === 'dir'

	fileInfo.canEdit = () =>
		Boolean(
			fileInfo.permissions
			& OC.PERMISSION_UPDATE,
		)

	fileInfo.canDownload = () => {
		if (
			typeof node.canDownload === 'function'
		) {
			return node.canDownload()
		}

		return true
	}

	/*
	 * Keep access to the original modern FileNode if a
	 * component needs it later.
	 */
	fileInfo.node = node

	return fileInfo
}
