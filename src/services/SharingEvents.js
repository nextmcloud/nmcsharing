import {
	emit,
	subscribe,
	unsubscribe,
} from '@nextcloud/event-bus'

export const SHARES_CHANGED =
	'nmcsharing:shares:changed'

export function notifySharesChanged(payload = {}) {
	emit(
		SHARES_CHANGED,
		payload,
	)
}

export function subscribeToShareChanges(callback) {
	subscribe(
		SHARES_CHANGED,
		callback,
	)
}

export function unsubscribeFromShareChanges(callback) {
	unsubscribe(
		SHARES_CHANGED,
		callback,
	)
}
