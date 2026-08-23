declare global {
    interface Window {
        OC: any
        // Nextcloud 33's version-scoped @nextcloud/files v4 registry, written to
        // directly from action.ts so this v3-built app's file actions reach core.
        _nc_files_scope?: {
            v4_0?: {
                fileActions?: Map<string, { id: string }>
            }
        }
    }
}

export default global
