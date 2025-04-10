declare module 'formidable' {
  export interface Files {
    [key: string]: {
      filepath: string;
      originalFilename: string;
      mimetype: string;
      size: number;
      path: string;
    };
  }

  export interface Fields {
    [key: string]: string | string[];
  }

  export class IncomingForm {
    constructor(options?: {
      uploadDir?: string;
      keepExtensions?: boolean;
      maxFieldsSize?: number;
      maxFields?: number;
      hash?: boolean | string;
      multiples?: boolean;
    });

    parse(
      req: any,
      callback: (err: Error, fields: Fields, files: Files) => void
    ): void;
  }
}
