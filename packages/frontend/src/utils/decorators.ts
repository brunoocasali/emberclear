import { tracked } from '@glimmer/tracking';

// https://tc39.github.io/proposal-decorators/#sec-elementdescriptor-specification-type
// interface ElementDescriptor {
//   descriptor: PropertyDescriptor;
//   initializer?: () => any; // unknown
//   key: string;
//   kind: 'method' | 'field' | 'initializer';
//   placement: 'own' | 'prototype' | 'static';
//   finisher?: (klass: any) => any;
// }

// interface MethodDecorator {
//   descriptor: PropertyDescriptor;
//   key: string;
//   kind: 'method' | 'field' | 'initializer';
//   placement: 'own' | 'prototype' | 'static';
// }
//

export function inLocalStorage<T = boolean, Target = Record<string, any>>(
  target: Target,
  propertyKey: keyof Target,
  // descriptor is undefined for properties
  // it's only available on methods and such
  descriptor?: any
): void /* TS says the return value is ignored... idk if I believe it */ {
  const targetName = target.constructor.name;
  const { get: oldGet, set: oldSet } = tracked(target, propertyKey, descriptor);

  const newDescriptor = {
    confgurable: true,
    enumerable: true,
    get: function(): T {
      const key = `${targetName}-${propertyKey}`;
      const initialValue = oldGet!.call(this);
      const lsValue = localStorage.getItem(key);
      const json = (lsValue && JSON.parse(lsValue)) || { value: initialValue };

      return json.value;
    },
    set: function(value: T) {
      const key = `${targetName}-${propertyKey}`;
      const lsValue = JSON.stringify({ value });

      localStorage.setItem(key, lsValue);

      // this is required to dirty the change tracking system
      oldSet!.call(this, value);
    },
  };

  return newDescriptor as any;
}
