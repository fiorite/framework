import { ServiceDescriptor } from './service-descriptor';
import { ServiceType } from './service-type';
import { BehaveLike } from './decorators';
import { ServiceBehavior } from './service-behavior';
import { DecoratorRecorder, emptyCallback, SetWithInnerKey, Type, ValueCallback, VoidCallback } from '../core';

interface ServiceSetEvents {
  readonly add: ValueCallback<ServiceDescriptor>,
  readonly delete: ValueCallback<ServiceDescriptor>,
  readonly clear: VoidCallback,
}

export class ServiceSet extends SetWithInnerKey<ServiceDescriptor, ServiceType> {
  get [Symbol.toStringTag](): string {
    return 'ServiceSet';
  }

  private readonly _eventListeners: ServiceSetEvents;
  private readonly _behavioralMap = new Map<Type, ServiceBehavior>();

  constructor(
    descriptors: Iterable<ServiceDescriptor> = [],
    eventListeners: Partial<{
      readonly add: ValueCallback<ServiceDescriptor>,
      readonly delete: ValueCallback<ServiceDescriptor>,
      readonly clear: VoidCallback,
    }> = {},
    behavioralMap: Iterable<[Type, ServiceBehavior]> = DecoratorRecorder.classSearch(BehaveLike)
      .map(d => [d.path[0] as Type, d.payload]),
  ) {
    const getServiceType = (def: ServiceDescriptor) => def.type;
    super(getServiceType);
    Array.from(descriptors).forEach(descriptor => super.add(descriptor));
    this._eventListeners = {
      add: eventListeners.add || emptyCallback as any,
      delete: eventListeners.delete || emptyCallback as any,
      clear: eventListeners.clear || emptyCallback,
    };
    this._behavioralMap = new Map(behavioralMap);
  }

  containsType(type: ServiceType): boolean {
    return this._innerMap.has(type);
  }

  findDescriptor(type: ServiceType): ServiceDescriptor | undefined {
    return this._innerMap.get(type);
  }

  replaceInherited(with1: ServiceDescriptor): void {
    if (with1.inherited) {
      throw new Error('unable to replace with inherited');
    }

    const actual = this._innerMap.get(with1.type)!;

    if (!actual || !actual.inherited) {
      throw new Error('service set does not contain inherited service: ' + ServiceType.toString(with1.type));
    }

    this._innerMap.set(with1.type, with1);
  }

  override add(value: ServiceDescriptor): this {
    super.add(value);
    this._eventListeners.add(value);
    return this;
  }

  override clear() {
    super.clear();
    this._eventListeners.clear();
  }

  override delete(value: ServiceDescriptor): boolean {
    const result = super.delete(value);
    if (result) {
      this._eventListeners.delete(value);
    }
    return result;
  }
}
