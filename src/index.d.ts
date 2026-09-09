declare global {
    interface Window {
        OC: any
        // NC33's version-scoped @nextcloud/files v4 registry; written from action.ts.
        _nc_files_scope?: {
            v4_0?: {
                fileActions?: Map<string, { id: string }>
            }
        }
    }
}

export default global
