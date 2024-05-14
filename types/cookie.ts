import { Response } from 'express';

export interface CookieResponse extends Response {
  cookie: (name: string, value: any, options?: any) => this;
}
