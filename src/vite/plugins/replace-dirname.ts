import { PluginOption } from 'vite';

export const replaceDirname = (): PluginOption => {
  return {
    name: 'replace-dirname',
    transform(code: string) {
      if (code.includes('__dirname')) {
        const replacement = `new URL(import.meta.url).pathname.split('/').slice(0,-1).join('/')`;
        return code.replaceAll(`__dirname`, replacement);
      }
      return code;
    },
  };
};
