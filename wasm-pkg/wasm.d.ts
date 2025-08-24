/* tslint:disable */
/* eslint-disable */
export function init(): void;
export function greet(name: string): string;
export function generate_mnemonic(): string;
export function create_account(mnemonic: string, account_number: number, index: number): string;
export function create_p2p_connection(mnemonic: string, account_number: number, index: number): string;
export function sign_p2p_message(mnemonic: string, account_number: number, index: number, domain: string, blockchain_address: string, origin: string, message_content?: string | null): string;
export function create_simple_nonce(): string;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly init: () => void;
  readonly greet: (a: number, b: number) => [number, number];
  readonly generate_mnemonic: () => [number, number, number, number];
  readonly create_account: (a: number, b: number, c: number, d: number) => [number, number, number, number];
  readonly create_p2p_connection: (a: number, b: number, c: number, d: number) => [number, number, number, number];
  readonly sign_p2p_message: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number, k: number, l: number) => [number, number, number, number];
  readonly create_simple_nonce: () => [number, number, number, number];
  readonly __wbindgen_exn_store: (a: number) => void;
  readonly __externref_table_alloc: () => number;
  readonly __wbindgen_export_2: WebAssembly.Table;
  readonly __wbindgen_free: (a: number, b: number, c: number) => void;
  readonly __wbindgen_malloc: (a: number, b: number) => number;
  readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
  readonly __externref_table_dealloc: (a: number) => void;
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
