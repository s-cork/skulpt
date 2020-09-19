import {
    pyStr,
    pyBytes,
    pyFloat,
    pyInt,
    pyTrue,
    pyFalse,
    pyType,
    pyDict,
    pyNone,
    pySet,
    pyComplex,
    pyFrozenSet,
    pyExc,
    JSBI,
    objectLookupSpecial,
} from "../internal";
import { numberToPy } from "../ffi";

/**
 * Check type of argument to Python functions.
 *
 * @param {string} name the name of the argument
 * @param {string} exptype string of the expected type name
 * @param {boolean} check truthy if type check passes, falsy otherwise
 */
export function pyCheckType(name, exptype, check) {
    if (!check) {
        throw new pyExc.TypeError(name + " must be a " + exptype);
    }
}

/**
 * @function
 * @param {*} arg
 *
 * @description
 * Does the arg have a valid `__getitem__` method?
 */
export function checkSequence(arg) {
    return arg != null && arg.mp$subscript !== undefined;
}

/**
 * @description
 * Use this to test whether or not a Python object is iterable.  You should **not** rely
 * on the presence of tp$iter on the object as a good test, as it could be a user defined
 * class with `__iter__` defined or ``__getitem__``  This tests for all of those cases
 *
 * Note in most cases it will be more pragmatic to simply call {@link objectGetIter} which will
 * throw the appropriate error if the pyObject is not iterable.
 *
 * @param arg {Object}   A Python object
 * @returns {boolean} true if the object is iterable
 */
export function checkIterable(arg) {
    if (arg === undefined) {
        return false;
    }
    if (arg.tp$iter) {
        const iter = arg.tp$iter();
        return iter.tp$iternext !== undefined;
    }
    return arg.mp$subscript !== undefined;
}

/**
 * @function
 * @param {*} obj
 */
export function checkCallable(obj) {
    // takes care of builtin functions and methods, builtins
    return obj != null && obj.tp$call !== undefined;
}

/**
 * @function
 * @description
 * Is the object an instance of {@link pyInt} or {@link pyFloat}
 *
 * @param {*} arg
 */
export function checkNumber(arg) {
    if (arg === null || arg === undefined) {
        return false;
    }
    const val = arg.valueOf();
    return typeof val === "number" || JSBI.__isBigInt(val);
}

/**
 * @description
 * Is the arg an instance of {@link pyComplex}
 */
export function checkComplex(arg) {
    return arg instanceof pyComplex;
}

/**
 * @description
 * Supports both JS Number and pyObject
 * @param {*} arg
 */
export function checkInt(arg) {
    return arg instanceof pyInt || (typeof arg === "number" && Number.isInteger(arg));
}

/**
 * @description
 * Is the arg an instance of {@link pyFloat}
 * @param {*} arg
 */
export function checkFloat(arg) {
    return arg instanceof pyFloat;
}

/**
 * @description
 * Is the arg an instance of {@link pyStr}
 * @param {*} arg
 */
export function checkString(arg) {
    return arg instanceof pyStr;
}

/**
 * @description
 * Is the arg an instance of {@link pyBytes}
 * @param {*} arg
 */
export function checkBytes(arg) {
    return arg instanceof pyBytes;
}

/**
 * Is the arg an instance of {@link pyType}
 * @param {*} arg
 */
export function checkClass(arg) {
    return arg instanceof pyType;
}

/**
 * @description
 * Is the arg an instance of {@link pyBool}
 * @param {*} arg
 */
export function checkBool(arg) {
    return arg === pyTrue || arg === pyFalse;
}

export function checkNone(arg) {
    return arg === pyNone;
}

/**
 * @description
 * Is the arg callable?
 * @param {*} arg
 */
export function checkFunction(arg) {
    return arg != null && arg.tp$call !== undefined;
}

export function checkDataDescr(arg) {
    return arg != null && arg.tp$descr_set !== undefined;
}

/**
 * @description
 * Is the arg ain instance of {@link pySet} or {@link pyFrozenSet}
 * @param {*} arg
 */
export function checkAnySet(arg) {
    return arg instanceof pySet || arg instanceof pyFrozenSet;
}

export function checkMapping(arg) {
    return arg instanceof pyDict || (arg != null && arg.mp$subscript !== undefined && objectLookupSpecial(arg, pyStr.$keys) !== undefined);
}

export function checkIndex(arg) {
    return arg !== null && arg !== undefined && (arg.nb$index !== undefined || (typeof arg === "number" && Number.isInteger(arg)));
}
