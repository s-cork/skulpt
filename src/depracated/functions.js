/**
 * @deprecated
 * 
 * @param {*} a 
 */
Sk.builtin.asnum$ = function (a) {
    if (a === undefined) {
        return a;
    }
    if (a === null) {
        return a;
    }
    const val = a.valueOf();
    if (typeof val === "number") {
        return val;
    } else if (JSBI.__isBigInt(val)) {
        return val.toString();
    } else if (val === null) {
        return null;
    }
    return a;
};


/**
 * Return a Python number (either float or int) from a Javascript number.
 *
 * Javacsript function, returns Python object.
 *
 * @param  {number} a Javascript number to transform into Python number.
 * @return {(pyInt|pyFloat)} A Python number.
 */
Sk.builtin.assk$ = function (a) {
    if (a % 1 === 0) {
        return new pyInt(a);
    } else {
        return new pyFloat(a);
    }
};

Sk.builtin.asnum$nofloat = function (a) {
    if (a === undefined || a === null) {
        return a;
    }
    a = a.valueOf();
    if (typeof a === "number") {
        a = a < 0 ? Math.ceil(a) : Math.floor(a);
        if (Math.abs(a) < Number.MAX_SAFE_INTEGER) {
            return a.toString();
        } else if (Number.isFinite(a)) {
            return JSBI.BigInt(a).toString();
        }
        return undefined;
    } else if (JSBI.__isBigInt(a)) {
        return a.toString();
    } else if (a === null) {
        return null;
    } else {
        return undefined;
    }
};


/**
 * Call the super constructor of the provided class, with the object `self` as
 * the `this` value of that constructor. Any arguments passed to this function
 * after `self` will be passed as-is to the constructor.
 *
 * @param  {*} thisClass The subclass.
 * @param  {Object} self      The instance of the subclas.
 * @param  {...?} args Arguments to pass to the constructor.
 * @return {undefined}
 * @deprecated
 */
Sk.abstr.superConstructor = function (thisClass, self, args) {
    var argumentsForConstructor = Array.prototype.slice.call(arguments, 2);
    thisClass.prototype.tp$base.apply(self, argumentsForConstructor);
};
