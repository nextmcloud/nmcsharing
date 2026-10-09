export function getShareAttributes(node) {
	const attributes = node.attributes?.['share-attributes']
	if (Array.isArray(attributes)) {
		return attributes
	}

	if (typeof attributes !== 'string' || attributes.length === 0) {
		return []
	}

	try {
		const parsedAttributes = JSON.parse(attributes)
		return Array.isArray(parsedAttributes) ? parsedAttributes : []
	} catch {
		return []
	}
}