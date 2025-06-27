import axios from '@nextcloud/axios'
import { generateOcsUrl } from '@nextcloud/router'

export const getDownloadLimit = async function(token) {
	const url = generateOcsUrl(`/apps/files_downloadlimit/api/v1/${encodeURIComponent(token)}/limit`)
	const response = await axios.get(url)
	return response.data.ocs.data
}

export const setDownloadLimit = async function(token, limit) {
	const url = generateOcsUrl(`/apps/files_downloadlimit/api/v1/${encodeURIComponent(token)}/limit`)
	const response = await axios.put(url, { limit })
	return response.data.ocs.data
}

export const deleteDownloadLimit = async function(token) {
	const url = generateOcsUrl(`/apps/files_downloadlimit/api/v1/${encodeURIComponent(token)}/limit`)
	const response = await axios.delete(url)
	return response.data.ocs.data
}
