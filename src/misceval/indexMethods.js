import { JSBI, pyInt, pyExc, typeName } from "../internal";

export function asIndex(index) {
    if (index === null || index === undefined) {
        return;
    } else if (index.constructor === pyInt) {
        // the common case;
        return index.v;
    } else if (index.nb$index) {
        return index.nb$index(); // this slot will check the return value is an int.
    } else if (typeof index === "number" && Number.isInteger(index)) {
        return index;
    }
}

/**
 * @function
 *
 * @param {pyObject|number} index - typically an {@link pyInt} legacy code might use a js number
 * @param {string=} msg - an optional message when throwing the TypeError
 * @throws {pyExc.TypeError}
 *
 * @description
 * requires a pyObject - returns a string or integer depending on the size.
 * throws a TypeError that the object cannot be interpreted as an index
 * can provide a custom message
 * include {tp$name} in the custom message which will be replaced by the typeName of the object
 *
 * - converts the `pyInt`
 * - if the number is too large to be safe returns a string
 * @returns {number|string}
 */
export function asIndexOrThrow(index, msg) {
    const i = asIndex(index);
    if (i !== undefined) {
        return i;
    }
    msg = msg || "'{tp$name}' object cannot be interpreted as an integer";
    msg = msg.replace("{tp$name}", typeName(index));
    throw new pyExc.TypeError(msg);
}

export function asIndexSized(index, Err, msg) {
    const i = asIndexOrThrow(index, msg);
    if (typeof i === "number") {
        return i; // integer v property will by a javascript number if it is index sized
    }
    if (Err == null) {
        return JSBI.lessThan(i, JSBI.__ZERO) ? -Number.MAX_SAFE_INTEGER : Number.MAX_SAFE_INTEGER;
    }
    throw new Err("cannot fit '" + typeName(index) + "' into an index-sized integer");
}
