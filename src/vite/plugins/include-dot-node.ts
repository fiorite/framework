import { PluginOption } from 'vite';
import path from 'path';
import fs from 'node:fs';

export const includeDotNode = (): PluginOption => {
  const files: string[] = [];
  return {
    name: 'include-dot-node',
    transform(_: unknown, id: string) {
      if (id.endsWith('.node')) {
        files.push(id);
        return 'import module from \'node:module\';\nexport default module.createRequire(import.meta.url)(\'' + id + '\');\n';
      }
      return;
    },
    load: (id: string) => id.endsWith('.node') ? '' : null,
    generateBundle(options: any): void {
      for (const file of files) {
        const output = path.resolve(options.dir + '/' + path.basename(file));
        fs.mkdirSync(path.dirname(output), {recursive: true});
        fs.writeFileSync(output, fs.readFileSync(file));
      }
    },
  };
};
