// Type declaration for pdf-parse (untyped library)
declare module 'pdf-parse' {
  interface PDFParseData {
    numpages: number;
    numrender: number;
    info: any;
    metadata: any;
    version: string;
    text: string;
    textAsHtml?: string;
  }
  function pdfparse(data: Buffer | Uint8Array | string): Promise<PDFParseData>;
  export = pdfparse;
}
