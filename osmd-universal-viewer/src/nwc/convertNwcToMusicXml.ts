import { convertNWCToMusicXML } from "../nwc2xml-lib/index.js";

/** Binary .nwc → MusicXML 문자열 (mrds nwc-viewer의 nwc2xml 파이프라인). */
export function nwcBufferToMusicXml(buffer: ArrayBuffer): string {
  return convertNWCToMusicXML(new Uint8Array(buffer));
}
