import { MaybePromiseLike, VoidCallback } from '../core';

export type ScriptFunction = (() => MaybePromiseLike<unknown>) | ((done: VoidCallback) => unknown);

const _lateScripts: ScriptFunction[] = [];

export const lateScripts: readonly ScriptFunction[] = _lateScripts;

export function runScript(callback: ScriptFunction): void {
  _lateScripts.push(callback);
}
