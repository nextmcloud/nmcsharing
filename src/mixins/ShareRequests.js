/**
 * SPDX-FileCopyrightText: 2019 Nextcloud GmbH and Nextcloud contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import axios from '@nextcloud/axios'
import { showError } from '@nextcloud/dialogs'
import { emit } from '@nextcloud/event-bus'
import { translate as t } from '@nextcloud/l10n'
import { generateOcsUrl } from '@nextcloud/router'

import Share from '../models/Share.js'
import { notifySharesChanged } from '../services/SharingEvents.js'

const shareUrl = generateOcsUrl('apps/files_sharing/api/v1/shares')

export default {
	methods: {
		async createShare({
			path,
			permissions,
			shareType,
			shareWith,
			publicUpload,
			password,
			sendPasswordByTalk,
			expireDate,
			label,
			note,
			attributes,
			hideDownload,
		}) {
			try {
				const normalizedAttributes = Array.isArray(attributes)
					? JSON.stringify(attributes)
					: attributes

				const request = await axios.post(shareUrl, {
					path,
					permissions,
					shareType,
					shareWith,
					publicUpload,
					password,
					sendPasswordByTalk,
					expireDate,
					label,
					note,
					attributes: normalizedAttributes,
					...(hideDownload !== undefined
						? { hideDownload: hideDownload ? 1 : 0 }
						: {}),
				})

				if (!request?.data?.ocs || request.data.ocs.data === undefined) {
					throw new Error('Invalid response while creating share')
				}

				const share = new Share(request.data.ocs.data)

				emit('files_sharing:share:created', { share })
				emit('files:config:updated', { share })

				notifySharesChanged({
					action: 'created',
					path,
					share,
				})

				return share
			} catch (error) {
				console.error('[nmcsharing] Error while creating share', error)

				const errorMessage = error?.response?.data?.ocs?.meta?.message

				showError(
					errorMessage
						? t('files_sharing', 'Error creating the share: {errorMessage}', { errorMessage })
						: t('files_sharing', 'Error creating the share'),
				)

				throw error
			}
		},

		async deleteShare(id) {
			try {
				const request = await axios.delete(`${shareUrl}/${id}`)

				if (!request?.data?.ocs) {
					throw new Error('Invalid response while deleting share')
				}

				emit('files_sharing:share:deleted', { id })
				emit('files:config:updated', { id })

				return true
			} catch (error) {
				console.error('[nmcsharing] Error while deleting share', error)

				const errorMessage = error?.response?.data?.ocs?.meta?.message

				showError(
					errorMessage
						? t('files_sharing', 'Error deleting the share: {errorMessage}', { errorMessage })
						: t('files_sharing', 'Error deleting the share'),
				)

				throw error
			}
		},

		async updateShare(id, properties) {
			try {
				const request = await axios.put(`${shareUrl}/${id}`, properties)

				if (!request?.data?.ocs || request.data.ocs.data === undefined) {
					throw new Error('Invalid response while updating share')
				}

				emit('files_sharing:share:updated', { id })
				emit('files:config:updated', { id })

				return request.data.ocs.data
			} catch (error) {
				console.error('[nmcsharing] Error while updating share', error)

				const status = error?.response?.status
				const message = error?.response?.data?.ocs?.meta?.message
					?? error?.message
					?? t('files_sharing', 'Error updating the share')

				if (status !== 400) {
					showError(message)
				}

				throw new Error(message)
			}
		},
	},
}
