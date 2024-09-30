interface RadixNode<T> {
  readonly path: string;
  readonly payload?: T;
  readonly set: boolean;
  readonly children: readonly RadixNode<T>[];
}

const emptyNode = () => ({ path: '', set: false, children: [] });

export interface RadixWalkResult<T> {
  readonly path: string;
  readonly payload: T;
  readonly fullMatch: boolean;
}

export class RadixMap<T> implements Map<string, T> {
  get [Symbol.toStringTag](): string {
    return 'RadixMap';
  }

  private _node: RadixNode<T>;
  private _size = 0;

  get size(): number {
    return this._size;
  }

  constructor() {
    this._node = emptyNode();
  }

  set(path: string, payload: T): this {
    let node = this._node;
    main: while (node) {
      path = path.substring(node.path.length);
      if (!path.length) {
        Object.assign(node, { payload, assigned: true });
        return this;
      }

      const children = node.children.filter(x => x.path[0] === path[0]);
      for (const child of children) {
        const min = Math.min(child.path.length, path.length);
        let pointer = 0;

        while (pointer < min && path[pointer] === child.path[pointer]) {
          pointer++;
        }

        if (pointer >= child.path.length) { // enter the child node
          node = child;
          continue main;
        }

        if (pointer >= path.length) {
          Object.assign(child, { path: child.path.substring(path.length), }); // change child's #path
          (node.children as RadixNode<T>[]).splice(node.children.indexOf(child), 1); // remove child from current node

          const intermediate: RadixNode<T> = { path, payload, set: true, children: [child] }; // add child to a new node
          (node.children as RadixNode<T>[]).push(intermediate); // add intermediate to the node
          return this;
        }

        if (pointer > 0) {
          Object.assign(child, { path: child.path.substring(pointer), }); // change child's #path
          (node.children as RadixNode<T>[]).splice(node.children.indexOf(child), 1); // remove child from current node

          const intermediate: RadixNode<T> = { path: path.substring(0, pointer), set: false, children: [child] }; // add child to a new node
          (node.children as RadixNode<T>[]).push(intermediate); // add intermediate to the node
          continue main;
        }
      }

      (node.children as RadixNode<T>[]).push({ path, payload, set: true, children: [], });
      this._size++;
    }
    return this;
  }

  delete(path: string): boolean {
    throw new Error('Method not implemented.');
  }

  forEach(callbackfn: (value: T, key: string, map: Map<string, T>) => void, thisArg?: any): void {
    throw new Error('Method not implemented.');
  }

  get(key: string): T | undefined {
    let node = this._node;
    let pointer = node.path.length;

    while (node) {
      if (key.length === pointer) {
        return node.payload;
      }

      const index = node.children.findIndex(child => {
        return key[pointer] === child.path[0] &&
          key.indexOf(child.path, pointer) === pointer;
      });

      if (index > -1) {
        node = node.children[index];
        pointer += node.path.length;
      }
    }

    return;
  }

  has(key: string): boolean {
    let node = this._node;
    let pointer = node.path.length;

    while (node) {
      if (key.length === pointer) {
        return true;
      }

      const index = node.children.findIndex(child => {
        return key[pointer] === child.path[0] &&
          key.indexOf(child.path, pointer) === pointer;
      });

      if (index > -1) {
        node = node.children[index];
        pointer += node.path.length;
      }
    }

    return false;
  }

  walk(key: string): readonly RadixWalkResult<T>[] {
    const result: RadixWalkResult<T>[] = [];

    let node = this._node;
    let pointer = node.path.length;

    while (node) {
      if (key.length === pointer) {
        if (node.set) {
          result.push({ path: key, fullMatch: true, payload: node.payload! });
        }
        break;
      }

      const index = node.children.findIndex(child => {
        return key[pointer] === child.path[0] &&
          key.indexOf(child.path, pointer) === pointer;
      });

      if (index > -1) {
        node = node.children[index];
        pointer += node.path.length;

        if (key.length !== pointer && node.set) {
          result.push({ path: key, fullMatch: false, payload: node.payload! });
        }
      }
    }
    return result;
  }

  clear(): void {
    this._node = emptyNode();
    this._size = 0;
  }

  entries(): IterableIterator<[string, T]> {
    throw new Error('Method not implemented.');
  }

  keys(): IterableIterator<string> {
    throw new Error('Method not implemented.');
  }

  values(): IterableIterator<T> {
    throw new Error('Method not implemented.');
  }

  [Symbol.iterator](): IterableIterator<[string, T]> {
    throw new Error('Method not implemented.');
  }
}
