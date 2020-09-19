import {buildIteratorClass, retryOptionalSuspensionOrThrow} from "../../internal";
/**
 * 
 * @constructor
 * 
 * @param {Function} fn
 * @param {boolean=} [handlesOwnSuspensions=false] - Does it handle its own suspension?
 * 
 * @description
 * Create a generic Python iterator that repeatedly calls a given JS function
 * until it returns 'undefined'. This function is useful for user defined Native classes
 * 
 * @example
 * // some immutable tuple like class where the v property is an array
 * MyClass.prototype.tp$iter = function() {
 *   let i = 0;
 *   const len = this.v.length;
 *   return new pyIterator(() => i >= len ? this.v[i++] : undefined);
 * }
 * @extends {pyObject}
 * 
 */
export var pyIterator = buildIteratorClass("iterator", {
    constructor : function iterator (fn, handlesOwnSuspensions) {
        this.tp$iternext = handlesOwnSuspensions ? fn : function (canSuspend) {
            let x = fn();
            if (canSuspend || !x.$isSuspension) {
                return x;
            } else {
                return retryOptionalSuspensionOrThrow(x);
            }
        };
    }, 
    iternext: function (canSuspend) { /* keep slot __next__ happy */
        return this.tp$iternext(canSuspend);
    },
    flags: { sk$acceptable_as_base_class: false },
});
