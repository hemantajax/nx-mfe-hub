export interface DocChapter {
  slug: string;
  title: string;
  file: string;
}

export interface DocBook {
  slug: string;
  title: string;
  icon: string;
  description: string;
  chapters: DocChapter[];
}

export interface DocsManifest {
  books: DocBook[];
}
