import {pyExc, unfixReserved} from "../internal";

/**
 * @function
 * @description 
 * Get a python object from a given namespace
 * @param {string} name
 * @param {Object=} other generally globals
 * @example
 * loadname("foo", Sk.globals);
 */
export function loadname (name, other) {
    const v = other[name];
    if (v !== undefined) {
        return v;
    }
    const bi = Sk.builtins[name];
    if (bi !== undefined) {
        return bi;
    }
    throw new pyExc.NameError("name '" + unfixReserved(name) + "' is not defined");
};


