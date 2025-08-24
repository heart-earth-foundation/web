/* tslint:disable */
/* eslint-disable */
export const memory: WebAssembly.Memory;
export const init: () => void;
export const greet: (a: number, b: number) => [number, number];
export const generate_mnemonic: () => [number, number, number, number];
export const create_account: (a: number, b: number, c: number, d: number) => [number, number, number, number];
export const create_p2p_connection: (a: number, b: number, c: number, d: number) => [number, number, number, number];
export const sign_p2p_message: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number, k: number, l: number) => [number, number, number, number];
export const create_simple_nonce: () => [number, number, number, number];
export const derive_x25519_key_from_account: (a: number, b: number, c: number, d: number) => [number, number, number, number];
export const compute_shared_secret: (a: number, b: number, c: number, d: number, e: number, f: number) => [number, number, number, number];
export const encrypt_message_for_channel: (a: number, b: number, c: number, d: number, e: number, f: number) => [number, number, number, number];
export const decrypt_message_for_channel: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number) => [number, number, number, number];
export const __wbindgen_exn_store: (a: number) => void;
export const __externref_table_alloc: () => number;
export const __wbindgen_export_2: WebAssembly.Table;
export const __wbindgen_free: (a: number, b: number, c: number) => void;
export const __wbindgen_malloc: (a: number, b: number) => number;
export const __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
export const __externref_table_dealloc: (a: number) => void;
export const __wbindgen_start: () => void;
