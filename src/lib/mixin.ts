/**
 * Copyright (c) 2025 Kiril Strezikozin
 *
 * SPDX-License-Identifier: MIT
 *
 * You may not use this file except in compliance with the MIT license terms.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

/* eslint-disable-next-line @typescript-eslint/no-empty-object-type */
type Class<T = {}> = new (...args: any[]) => T;

/**
 * Returns a new class that inherits from `base` and has instance properties
 * from `mixin` class added to its prototype to achieve mixin-style inheritance.
 *
 * Static side of the retuned type is identical to the one of `base` class,
 * and is not combined with the static side of `mixin` class.
 *
 * You can access the base class using `super`,
 * and the mix-in class using protected and static `mixin` property.
 *
 * @param base Base class to extend the returned derived class from.
 * @param mixin Mixin class to mix-in properties from.
 * @param [overwrite=false] Set to true to let `mixin` class overwrite
 * properties on the returned derived class upon name collisions with `base`.
 * False to skip copying such properties from `mixin`.
 */
export function Mixin<
  TMixin extends Class,
  TBase extends Class
>(mixin: TMixin, base: TBase, overwrite: boolean = false) {
  const derived = class extends base {
    /** The closest mix-in class applied using `Mixin(...)`. */
    protected static readonly mixin = mixin;
  };

  Object.getOwnPropertyNames(mixin.prototype).forEach((name) => {
    if (
      name !== "constructor"
      && (overwrite || !Object.hasOwn(base.prototype, name))
    ) {
      Object.defineProperty(
        derived.prototype,
        name,
        Object.getOwnPropertyDescriptor(mixin.prototype, name)!
      );
    }
  });

  return derived as (
    new (...args: any[]) => InstanceType<TBase> & InstanceType<TMixin>
  ) & typeof derived;
}