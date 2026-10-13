/**
 * @copyright Copyright (c) 2019 John Molakvoæ <skjnldsv@protonmail.com>
 *
 * @author Daniel Calviño Sánchez <danxuliu@gmail.com>
 * @author Gary Kim <gary@garykim.dev>
 * @author Georg Ehrke <oc.list@georgehrke.com>
 * @author John Molakvoæ <skjnldsv@protonmail.com>
 * @author Julius Härtl <jus@bitgrid.net>
 * @author Roeland Jago Douma <roeland@famdouma.nl>
 *
 * @license AGPL-3.0-or-later
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 */

export default class Share {

	_share

	/**
	 * Create the share object.
	 *
	 * @param {object} ocsData OCS request response
	 */
	constructor(ocsData) {
		ocsData = ocsData ?? {}

		if (
			ocsData.ocs
			&& ocsData.ocs.data
			&& ocsData.ocs.data[0]
		) {
			ocsData = ocsData.ocs.data[0]
		}

		/*
		 * The OCS API may return the share ID as a string.
		 */
		if (typeof ocsData.id === 'string') {
			ocsData.id = Number.parseInt(
				ocsData.id,
				10,
			)
		}

		// Convert int values into booleans.
		ocsData.hide_download =
			!!ocsData.hide_download

		ocsData.mail_send =
			!!ocsData.mail_send

		/*
		 * Share attributes may either already be an array or be
		 * returned by the server as a JSON encoded string.
		 */
		if (
			typeof ocsData.attributes === 'string'
		) {
			try {
				ocsData.attributes =
					JSON.parse(ocsData.attributes)
			} catch (error) {
				console.warn(
					'[nmcsharing] Could not parse share attributes returned by server',
					ocsData.attributes,
					error,
				)

				ocsData.attributes = []
			}
		}

		/*
		 * Internally we always work with an array.
		 */
		ocsData.attributes =
			Array.isArray(ocsData.attributes)
				? ocsData.attributes
				: []

		/*
		 * Pre-declare the property so Vue 2 observes it when the
		 * Share instance becomes reactive.
		 */
		ocsData.newPassword =
			ocsData.newPassword ?? undefined

		this._share = ocsData
	}

	/**
	 * Get the raw share state.
	 *
	 * Used for Vue 2 reactivity.
	 *
	 * @return {object}
	 */
	get state() {
		return this._share
	}

	/**
	 * Get the share ID.
	 *
	 * @return {number}
	 */
	get id() {
		return this._share.id
	}

	/**
	 * Get the share type.
	 *
	 * @return {number}
	 */
	get type() {
		return this._share.share_type
	}

	/**
	 * Get the share permissions.
	 *
	 * @return {number}
	 */
	get permissions() {
		return this._share.permissions
	}

	/**
	 * Set the share permissions.
	 *
	 * @param {number} permissions Permissions
	 */
	set permissions(permissions) {
		this._share.permissions = permissions
	}

	/**
	 * Get the share attributes.
	 *
	 * @return {Array}
	 */
	get attributes() {
		return this._share.attributes ?? []
	}

	// SHARE OWNER --------------------------------------------------

	/**
	 * Get the share owner UID.
	 *
	 * @return {string}
	 */
	get owner() {
		return this._share.uid_owner
	}

	/**
	 * Get the share owner's display name.
	 *
	 * @return {string}
	 */
	get ownerDisplayName() {
		return this._share.displayname_owner
	}

	// SHARED WITH --------------------------------------------------

	/**
	 * Get the share-with entity UID.
	 *
	 * @return {string}
	 */
	get shareWith() {
		return this._share.share_with
	}

	/**
	 * Get the share-with entity display name.
	 *
	 * @return {string}
	 */
	get shareWithDisplayName() {
		return this._share.share_with_displayname
			|| this._share.share_with
	}

	/**
	 * Get the unique display name.
	 *
	 * @return {string}
	 */
	get shareWithDisplayNameUnique() {
		return this._share.share_with_displayname_unique
			|| this._share.share_with
	}

	/**
	 * Get the share-with entity link.
	 *
	 * @return {string}
	 */
	get shareWithLink() {
		return this._share.share_with_link
	}

	/**
	 * Get the share-with avatar.
	 *
	 * @return {string}
	 */
	get shareWithAvatar() {
		return this._share.share_with_avatar
	}

	// SHARED FILE OR FOLDER OWNER ----------------------------------

	/**
	 * Get the shared item owner UID.
	 *
	 * @return {string}
	 */
	get uidFileOwner() {
		return this._share.uid_file_owner
	}

	/**
	 * Get the shared item owner's display name.
	 *
	 * @return {string}
	 */
	get displaynameFileOwner() {
		return this._share.displayname_file_owner
			|| this._share.uid_file_owner
	}

	// TIME DATA ----------------------------------------------------

	/**
	 * Get the share creation timestamp.
	 *
	 * @return {number}
	 */
	get createdTime() {
		return this._share.stime
	}

	/**
	 * Get the expiration date.
	 *
	 * @return {string}
	 */
	get expireDate() {
		return this._share.expiration
	}

	/**
	 * Set the expiration date.
	 *
	 * @param {string|null} date Date in YYYY-MM-DD format
	 */
	set expireDate(date) {
		this._share.expiration = date
	}

	// EXTRA DATA ---------------------------------------------------

	/**
	 * Get the public share token.
	 *
	 * @return {string}
	 */
	get token() {
		return this._share.token
	}

	/**
	 * Set the public share token.
	 *
	 * @param {string} token Token
	 */
	set token(token) {
		this._share.token = token
	}

	/**
	 * Get the share note.
	 *
	 * @return {string}
	 */
	get note() {
		return this._share.note
	}

	/**
	 * Set the share note.
	 *
	 * @param {string} note Note
	 */
	set note(note) {
		this._share.note = note
	}

	/**
	 * Get the share label.
	 *
	 * @return {string}
	 */
	get label() {
		return this._share.label ?? ''
	}

	/**
	 * Set the share label.
	 *
	 * @param {string} label Label
	 */
	set label(label) {
		this._share.label = label
	}

	/**
	 * Whether a mail has been sent.
	 *
	 * @return {boolean}
	 */
	get mailSend() {
		return this._share.mail_send === true
	}

	/**
	 * Whether downloading is hidden for the public share.
	 *
	 * Both the legacy hide_download property and the current
	 * permissions/download share attribute are respected.
	 *
	 * @return {boolean}
	 */
	get hideDownload() {
		return this._share.hide_download === true
			|| this.attributes.some(
				({ scope, key, value }) =>
					scope === 'permissions'
					&& key === 'download'
					&& value === false,
			)
	}

	/**
	 * Set whether downloading is hidden.
	 *
	 * @param {boolean} state Hide download
	 */
	set hideDownload(state) {
		/*
		 * When hide-download is disabled, also make sure an existing
		 * download share attribute allows downloads again.
		 */
		if (!state) {
			const attribute =
				this.attributes.find(
					({ scope, key }) =>
						scope === 'permissions'
						&& key === 'download',
				)

			if (attribute) {
				attribute.value = true
			}
		}

		this._share.hide_download =
			state === true
	}

	/**
	 * Password protection of the share.
	 *
	 * @return {string}
	 */
	get password() {
		return this._share.password
	}

	/**
	 * Set password protection of the share.
	 *
	 * @param {string} password Password
	 */
	set password(password) {
		this._share.password = password
	}

	/**
	 * Unsaved password used while editing or creating a share.
	 *
	 * @return {string|undefined}
	 */
	get newPassword() {
		return this._share.newPassword
	}

	/**
	 * Set the unsaved password.
	 *
	 * @param {string|undefined} value Password
	 */
	set newPassword(value) {
		this._share.newPassword = value
	}

	/**
	 * Get the password expiration time.
	 *
	 * @return {string}
	 */
	get passwordExpirationTime() {
		return this._share.password_expiration_time
	}

	/**
	 * Set the password expiration time.
	 *
	 * @param {string} passwordExpirationTime Date
	 */
	set passwordExpirationTime(passwordExpirationTime) {
		this._share.password_expiration_time =
			passwordExpirationTime
	}

	/**
	 * Whether the password should be sent by Talk.
	 *
	 * @return {boolean}
	 */
	get sendPasswordByTalk() {
		return this._share.send_password_by_talk
	}

	/**
	 * Set whether the password should be sent by Talk.
	 *
	 * @param {boolean} sendPasswordByTalk State
	 */
	set sendPasswordByTalk(sendPasswordByTalk) {
		this._share.send_password_by_talk =
			sendPasswordByTalk
	}

	// SHARED ITEM DATA ---------------------------------------------

	/**
	 * Get the shared item absolute path.
	 *
	 * @return {string}
	 */
	get path() {
		return this._share.path
	}

	/**
	 * Return the item type.
	 *
	 * @return {string}
	 */
	get itemType() {
		return this._share.item_type
	}

	/**
	 * Get the shared item MIME type.
	 *
	 * @return {string}
	 */
	get mimetype() {
		return this._share.mimetype
	}

	/**
	 * Get the shared item ID.
	 *
	 * @return {number}
	 */
	get fileSource() {
		return this._share.file_source
	}

	/**
	 * Get the target path on the receiving end.
	 *
	 * @return {string}
	 */
	get fileTarget() {
		return this._share.file_target
	}

	/**
	 * Get the parent folder ID.
	 *
	 * @return {number}
	 */
	get fileParent() {
		return this._share.file_parent
	}

	// PERMISSION SHORTCUTS -----------------------------------------

	/**
	 * Does this share have READ permissions?
	 *
	 * @return {boolean}
	 */
	get hasReadPermission() {
		return !!(
			this.permissions
			& window.OC.PERMISSION_READ
		)
	}

	/**
	 * Does this share have CREATE permissions?
	 *
	 * @return {boolean}
	 */
	get hasCreatePermission() {
		return !!(
			this.permissions
			& window.OC.PERMISSION_CREATE
		)
	}

	/**
	 * Does this share have DELETE permissions?
	 *
	 * @return {boolean}
	 */
	get hasDeletePermission() {
		return !!(
			this.permissions
			& window.OC.PERMISSION_DELETE
		)
	}

	/**
	 * Does this share have UPDATE permissions?
	 *
	 * @return {boolean}
	 */
	get hasUpdatePermission() {
		return !!(
			this.permissions
			& window.OC.PERMISSION_UPDATE
		)
	}

	/**
	 * Does this share have SHARE permissions?
	 *
	 * @return {boolean}
	 */
	get hasSharePermission() {
		return !!(
			this.permissions
			& window.OC.PERMISSION_SHARE
		)
	}

	/**
	 * Whether downloading is allowed.
	 *
	 * Current Nextcloud share attributes use:
	 *
	 * {
	 *     scope: 'permissions',
	 *     key: 'download',
	 *     value: false,
	 * }
	 *
	 * to disable downloading.
	 *
	 * @return {boolean}
	 */
	get hasDownloadPermission() {
		const downloadAttribute =
			this.attributes.find(
				({ scope, key }) =>
					scope === 'permissions'
					&& key === 'download',
			)

		if (!downloadAttribute) {
			return true
		}

		return downloadAttribute.value !== false
	}

	/**
	 * Set whether downloading is allowed.
	 *
	 * @param {boolean} enabled Download permission
	 */
	set hasDownloadPermission(enabled) {
		this.setAttribute(
			'permissions',
			'download',
			!!enabled,
		)
	}

	/**
	 * Add or update a share attribute.
	 *
	 * Current Nextcloud versions use `value` instead of the legacy
	 * `enabled` property.
	 *
	 * @param {string} scope Attribute scope
	 * @param {string} key Attribute key
	 * @param {*} value Attribute value
	 */
	setAttribute(scope, key, value) {
		const attributeUpdate = {
			scope,
			key,
			value,
		}

		const existingIndex =
			this._share.attributes.findIndex(
				attribute =>
					attribute.scope === scope
					&& attribute.key === key,
			)

		if (existingIndex !== -1) {
			this._share.attributes.splice(
				existingIndex,
				1,
				attributeUpdate,
			)

			return
		}

		this._share.attributes.push(
			attributeUpdate,
		)
	}

	// PERMISSIONS FOR THE CURRENT USER -----------------------------

	/**
	 * Can the current user edit this share?
	 *
	 * @return {boolean}
	 */
	get canEdit() {
		return this._share.can_edit === true
	}

	/**
	 * Can the current user delete this share?
	 *
	 * @return {boolean}
	 */
	get canDelete() {
		return this._share.can_delete === true
	}

	/**
	 * Top-level accessible shared folder file ID.
	 *
	 * @return {string}
	 */
	get viaFileid() {
		return this._share.via_fileid
	}

	/**
	 * Top-level accessible shared folder path.
	 *
	 * @return {string}
	 */
	get viaPath() {
		return this._share.via_path
	}

	// OTHER PROPERTIES ---------------------------------------------

	get parent() {
		return this._share.parent
	}

	/**
	 * @return {string}
	 */
	get storageId() {
		return this._share.storage_id
	}

	/**
	 * @return {number}
	 */
	get storage() {
		return this._share.storage
	}

	/**
	 * @return {number}
	 */
	get itemSource() {
		return this._share.item_source
	}

	get status() {
		return this._share.status
	}

	/**
	 * Whether the share originates from a trusted server.
	 *
	 * @return {boolean}
	 */
	get isTrustedServer() {
		return !!this._share.is_trusted_server
	}

}
