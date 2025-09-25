/* tslint:disable */
/* eslint-disable */
export function parse_image(ext: string, bytes: Uint8Array): ParseImageResponse;
export function render_image(data: number[][], upscale: boolean): Uint8Array<ArrayBuffer>;
export function decode_dna(dna: string): number[][] | null;
export function encode_dna(data: number[][]): string;

export type ParseImageResponse = {
  status: "ok",
  data: number[][], 
} | {
  status: "unsupported_extension" | "decode_error" | "wrong_dimensions" | "wrong_palette"
}


export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly __wbg_parseimageresponse_free: (a: number, b: number) => void;
  readonly __wbg_get_parseimageresponse_status: (a: number) => [number, number];
  readonly __wbg_set_parseimageresponse_status: (a: number, b: number, c: number) => void;
  readonly __wbg_get_parseimageresponse_data: (a: number) => any;
  readonly __wbg_set_parseimageresponse_data: (a: number, b: any) => void;
  readonly parse_image: (a: number, b: number, c: any) => number;
  readonly render_image: (a: any, b: number) => any;
  readonly decode_dna: (a: number, b: number) => any;
  readonly encode_dna: (a: any) => [number, number];
  readonly __wbindgen_export_0: WebAssembly.Table;
  readonly __wbindgen_free: (a: number, b: number, c: number) => void;
  readonly __wbindgen_malloc: (a: number, b: number) => number;
  readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
  readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;
/**
* Instantiates the given `module`, which can either be bytes or
* a precompiled `WebAssembly.Module`.
*
* @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
*
* @returns {InitOutput}
*/
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
* If `module_or_path` is {RequestInfo} or {URL}, makes a request and
* for everything else, calls `WebAssembly.instantiate` directly.
*
* @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
*
* @returns {Promise<InitOutput>}
*/
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
