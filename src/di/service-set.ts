import { ServiceType } from './service-type';
import { emptyCallback, SetWithInnerKey, ValueCallback, VoidCallback } from '../core';
import { ServiceDescriptor2 } from './descriptor2';

interface ServiceSetEvents {
  readonly add: ValueCallback<ServiceDescriptor2>,
  readonly delete: ValueCallback<ServiceDescriptor2>,
  readonly clear: VoidCallback,
}

export class ServiceSet extends SetWithInnerKey<ServiceDescriptor2, ServiceType> {
  get [Symbol.toStringTag](): string {
    return 'ServiceSet';
  }

  private readonly _eventListeners: ServiceSetEvents;

  // private readonly _behavioralMap = new Map<Type, ServiceBehavior>();

  constructor(
    descriptors: Iterable<ServiceDescriptor2> = [],
    eventListeners: Partial<{
      readonly add: ValueCallback<ServiceDescriptor2>,
      readonly delete: ValueCallback<ServiceDescriptor2>,
      readonly clear: VoidCallback,
    }> = {},
    // behavioralMap: Iterable<[Type, ServiceBehavior]> = DecoratorRecorder.classSearch(BehaveLike)
    //   .map(d => [d.path[0] as Type, d.payload]),
  ) {
    const getServiceType = (def: ServiceDescriptor2) => def.type;
    super(getServiceType);
    Array.from(descriptors).forEach(descriptor => super.add(descriptor));
    this._eventListeners = {
      add: eventListeners.add || emptyCallback as any,
      delete: eventListeners.delete || emptyCallback as any,
      clear: eventListeners.clear || emptyCallback,
    };
    // this._behavioralMap = new Map(behavioralMap);
  }

  override has(value: ServiceDescriptor2 | ServiceType): boolean {
    return value instanceof ServiceDescriptor2 ? super.has(value) : this._innerMap.has(value);
  }

  get(type: ServiceType): ServiceDescriptor2 | undefined {
    return this._innerMap.get(type);
  }

  replaceInherited(with1: ServiceDescriptor2): void {
    if (with1.inheritedBehavior) {
      throw new Error('unable to replace with inherited');
    }

    const actual = this._innerMap.get(with1.type)!;

    if (!actual || (!actual.inheritedBehavior && actual.behavior !== with1.behavior)) { // todo: refactor perhaps
      throw new Error('service set does not contain inherited service: ' + ServiceType.toString(with1.type));
    }

    this._innerMap.set(with1.type, with1);
  }

  override add(value: ServiceDescriptor2): this {
    super.add(value);
    this._eventListeners.add(value);
    return this;
  }

  override clear() {
    super.clear();
    this._eventListeners.clear();
  }

  override delete(value: ServiceDescriptor2): boolean {
    const result = super.delete(value);
    if (result) {
      this._eventListeners.delete(value);
    }
    return result;
  }
}
