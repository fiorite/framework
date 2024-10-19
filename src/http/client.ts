import { request } from 'http';
import { HttpContext } from './context';
import { ValueCallback } from '../core';

export class HttpClient {
  request(url: string | URL, callback: ValueCallback<HttpContext>): void {
    const req = request(url, res => {

      res

    });
  }
}
