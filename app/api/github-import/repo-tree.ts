// Pure helpers for turning a GitHub repo listing into the editor's TemplateFolder
// shape. Kept free of next/* imports so they can be unit tested directly.

const SKIP_DIRS = new Set([".git", "node_modules", "dist", "build", ".next", ".turbo", "vendor"])
const BINARY_EXT =
    /\.(png|jpe?g|gif|webp|avif|ico|svg|woff2?|ttf|eot|otf|mp[34]|mov|avi|zip|gz|tar|pdf|lock|wasm|so|dll|exe|bin|class|jar)$/i

export type FileNode = { filename: string; fileExtension: string; content: string }
export type FolderNode = { folderName: string; items: (FileNode | FolderNode)[] }

export function parseRepoUrl(input: string): { owner: string; repo: string } | null {
    let rest = input.trim().replace(/\.git$/, "").replace(/\/+$/, "")

    const onGithub = rest.match(/^(?:https?:\/\/)?(?:www\.)?github\.com\/(.*)$/i)
    if (onGithub) {
        rest = onGithub[1]
    } else if (/^[a-z][\w+.-]*:\/\//i.test(rest) || /^[\w-]+(\.[\w-]+)+\//.test(rest)) {
        return null // some other host, e.g. gitlab.com/a/b
    }

    const match = rest.match(/^([\w.-]+)\/([\w.-]+)/)
    if (!match) return null

    const [, owner, repo] = match
    if ([owner, repo].some((part) => part === "." || part === "..")) return null
    return { owner, repo }
}

export function splitFilename(path: string): { filename: string; fileExtension: string } {
    const base = path.split("/").pop() || path
    const dot = base.lastIndexOf(".")
    if (dot <= 0) return { filename: base, fileExtension: "" }
    return { filename: base.slice(0, dot), fileExtension: base.slice(dot + 1) }
}

export function shouldSkip(path: string): boolean {
    if (path.split("/").some((segment) => SKIP_DIRS.has(segment))) return true
    return BINARY_EXT.test(path)
}

export function buildTree(rootName: string, files: { path: string; content: string }[]): FolderNode {
    const root: FolderNode = { folderName: rootName, items: [] }

    for (const file of files) {
        const segments = file.path.split("/")
        let cursor = root

        for (const segment of segments.slice(0, -1)) {
            let next = cursor.items.find(
                (item): item is FolderNode => "folderName" in item && item.folderName === segment,
            )
            if (!next) {
                next = { folderName: segment, items: [] }
                cursor.items.push(next)
            }
            cursor = next
        }

        cursor.items.push({ ...splitFilename(file.path), content: file.content })
    }

    return root
}
