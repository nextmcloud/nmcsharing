import { getShareAttributes } from '../utils/shareAttributes.js'

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
		new OC.Files.FileInfo(rawFileInfo)

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
