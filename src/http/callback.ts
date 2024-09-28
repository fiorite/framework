import { HttpContext } from './context';
import { VoidCallback } from '../core';

export type HttpCallback = (context: HttpContext, next: VoidCallback) => void;
