export enum JsPlatform {
  Browser = 'browser',
  NodeJs = 'nodejs',
}

export const currentJsPlatform = typeof window === 'undefined' ? JsPlatform.NodeJs : JsPlatform.Browser;
