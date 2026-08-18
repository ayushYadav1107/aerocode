interface TemplateItem {
  filename?: string;
  fileExtension?: string;
  content?: string;
  folderName?: string;
  items?: TemplateItem[];
}

interface WebContainerFile {
  file: {
    contents: string;
  };
}

interface WebContainerDirectory {
  directory: {
    [key: string]: WebContainerFile | WebContainerDirectory;
  };
}

type WebContainerFileSystem = Record<string, WebContainerFile | WebContainerDirectory>;

function isFolder(item: TemplateItem): boolean {
  return typeof item.folderName === "string" && Array.isArray(item.items);
}

function getKey(item: TemplateItem): string {
  if (isFolder(item)) {
    return item.folderName!;
  }

  return item.fileExtension
    ? `${item.filename}.${item.fileExtension}`
    : item.filename ?? "";
}

export function transformToWebContainerFormat(template: { folderName: string; items: TemplateItem[] }): WebContainerFileSystem {
  function processItem(item: TemplateItem): WebContainerFile | WebContainerDirectory {
    if (isFolder(item)) {
      // This is a directory
      const directoryContents: WebContainerFileSystem = {};

      item.items!.forEach(subItem => {
        directoryContents[getKey(subItem)] = processItem(subItem);
      });

      return {
        directory: directoryContents
      };
    }

    // This is a file
    return {
      file: {
        contents: item.content ?? ""
      }
    };
  }

  const result: WebContainerFileSystem = {};

  (template?.items ?? []).forEach(item => {
    result[getKey(item)] = processItem(item);
  });

  return result;
}
