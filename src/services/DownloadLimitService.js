import axios from '@nextcloud/axios'
import { generateOcsUrl } from '@nextcloud/router'

export const getDownloadLimit = async function(token) {
	const response = await axios.get(generateOcsUrl('/apps/files_downloadlimit/{token}/limit', { token }))
	return response.data.ocs.data
}

export const setDownloadLimit = async function(token, limit) {
	const response = await axios.put(generateOcsUrl('/apps/files_downloadlimit/{token}/limit', { token }), {
		limit,
	})
	return response.data.ocs.data
}

export const deleteDownloadLimit = async function(token) {
	const response = await axios.delete(generateOcsUrl('/apps/files_downloadlimit/{token}/limit', { token }))
	return response.data.ocs.data
}
