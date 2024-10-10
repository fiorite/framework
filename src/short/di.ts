// import { addFactory, addType, addValue, ServiceAddFeature } from '../app';
// import { ServiceBehavior, ServiceFactoryWithReturnFunction, ServiceType } from '../di';
// import { Type, ValueCallback } from '../core';
// import { HttpContext } from '../http';
//
// export function add(value: object): ServiceAddFeature;
// export function add<T>(type: ServiceType<T>, value: T): ServiceAddFeature;
// export function add(...args: unknown[]): ServiceAddFeature {
//   return (addValue as Function)(...args);
// }
//
// export function type<T>(type: Type<T>, behavior?: ServiceBehavior): ServiceAddFeature;
// export function type<T>(type: ServiceType<T>, actual: Type<T>, behavior?: ServiceBehavior): ServiceAddFeature;
// export function type(...args: unknown[]): ServiceAddFeature {
//   return (addType as Function)(...args);
// }
//
// export function factory<T>(
//   type: ServiceType<T>,
//   factory: ServiceFactoryWithReturnFunction<T>,
//   dependencies: ServiceType[] = [],
//   behavior?: ServiceBehavior,
// ): ServiceAddFeature {
//   return addFactory(type, factory, dependencies, behavior);
// }
//
// /**
//  * todo: use instead of global in ../di
//  * @param context
//  * @param type
//  */
// function provide<T>(context: HttpContext, type: ServiceType<T>): T;
// function provide<T>(context: HttpContext, type: ServiceType<T>, callback: ValueCallback<T>): void;
// function provide<T>(type: ServiceType<T>): T;
// function provide<T>(type: ServiceType<T>, callback: ValueCallback<T>): void;
// function provide(...args: unknown[]): unknown {
//   if (args[0] instanceof HttpContext) {
//     const type = args[1] as ServiceType;
//     return args[2] ? args[0].provide!(type, args[2] as ValueCallback<unknown>) : args[0].provide!(type);
//   }
//
//   throw new Error('not implemented fully');
// }
