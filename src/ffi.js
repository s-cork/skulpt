
import { JSBI, pyNone, pyStr, pyBool, pyList, pyTuple, pySet, pyDict, pyInt, pyFloat, pyFunc, pyBytes, asserts } from "./internal";

/**
 * 
 * @param {*} obj 
 */
export function remapToPy(obj) {
    if (obj === null || obj === undefined) {
        return pyNone;
    }

    if (obj.ob$type) {
        return obj;
    }

    const type = typeof obj;
    if (obj.length !== undefined) {
        if (type === "string") {
            return new pyStr(obj);
        }
        if (JSBI.__isBigInt(obj)) {
            return new pyInt(JSBI.numberIfSafe(obj)); // JSBI polyfill uses arrays under the hood
        }
        if (Array.isArray(obj)) {
            return new pyList(obj.map((x) => remapToPy(x)));
        }
        if (obj.byteLength !== undefined && obj instanceof Uint8Array) {
            return new pyBytes(obj);
        }
    }
    if (type === "object") {
        if (obj.$isWrapped !== undefined) {
            return obj.unWrap();
        }
        if (obj.$isSuspension !== undefined) {
            return obj;
        }
        return toPyDict(obj);
    }
    
    if (type === "number") {
        return numberToPy(obj);
    }
    if (type === "boolean") {
        return new pyBool(obj);
    }
    if (type === "function") {
        return new pyFunc(obj);
    }
    if (type === "bigint") {
        // we know BigInt is defined - let int take care of conversion here.
        new pyInt(obj.toString());
    }

    asserts.fail("unhandled remap type " + typeof obj);
}
export let toPy = remapToPy;

/**
 * Maps from Python dict/list/str/number to Javascript Object/Array/string/number.
 *
 * If obj is a
 *
 * @param obj {Object}  Any Python object (except a function)
 *
 */
export function remapToJs(obj, wrap) {
    if (obj === undefined || obj === null) {
        return obj;
    }
    const val = obj.valueOf();
    // for str/bool/int/float/tuple/list this returns the obvious: this.v;
    if (val === null) {
        return val;
    }
    if (typeof val !== "object") {
        return val;
    }
    if (Array.isArray(val)) {
        return val.map((x) => remapToJs(x));
    }
    if (obj instanceof pyDict) {
        return toJsHashMap(obj);
    }
    if (obj.byteLength !== undefined && val instanceof Uint8Array) {
        return val;
    }
    return wrapPyObj(obj);
}

export let toJs = remapToJs;


export function toJsBool(obj) {
    // basically the logic for Sk.misceva.isTrue
    return obj != null && obj.nb$bool ? obj.nb$bool() : obj.sq$length ? obj.sq$length() !== 0 : Boolean(obj);
}
export let isTrue = toJsBool;

export function toJsNumber(obj) {
    return Number(obj);
}

export function toJsString(obj) {
    return String(obj);
}

export function toJsArray(obj) {
    return Array.from(obj, (x) => remapToJs(x));
}

export function toJsHashMap(dict) {
    const obj = {};
    dict.$items().forEach(([key, val]) => {
        obj[key] = remapToJs(val);
    });
    return obj;
}

export function numberToPy(val) {
    if (Number.isInteger(val)) {
        if (Math.abs(val) < Number.MAX_SAFE_INTEGER) {
            return new pyInt(val);
        }
        return new pyInt(JSBI.BigInt(val));
    }
    return new pyInt(val);
}

const isInteger = /^-?\d+$/;

export function toPyNumber(obj) {
    const type = typeof obj;
    if (type === "number") {
        return numberToPy(obj);
    }
    if (type === "string") {
        if (obj.match(isInteger)) {
            return new pyInt(obj);
        }
        return new pyFloat(parseFloat(obj));
    }
    if (type === "bigint" || JSBI.__isBigInt(obj)) {
        return new pyInt(JSBI.numberIfSafe(obj));
    }
    return new pyFloat(Number(obj));
}

export function toPyFloat(num) {
    return new pyFloat(Number(num));
}

export function toPyStr(obj) {
    return new pyStr(obj);
}

export function toPyList(obj) {
    return new pyList(Array.from(obj, (x) => remapToPy(x)));
}

export function toPySet(obj) {
    return new pySet(Array.from(obj, (x) => remapToPy(x)));
}

export function toPyTuple(obj) {
    return new pyTuple(Array.from(obj, (x) => remapToPy(x)));
}

export function toPyInt(num) {
    if (typeof num === "number") {
        num = Math.trunc(num);
    } else if (JSBI.__isBigInt(num)) {
        return new pyInt(JSBI.numberIfSafe(num));
    } else {
        num = Math.trunc(parseInt(num, 10));
    }
    return Math.abs(num) < Number.MAX_SAFE_INTEGER ? new pyInt(num) : new pyInt(JSBI.BigInt(num));
}

export function toPyDict(obj) {
    const arr = [];
    for (let key in obj) {
        arr.push(new pyStr(key));
        arr.push(remapToPy(obj[key]));
    }
    return new pyDict(arr);
}

export class pyWrapped {
    constructor(obj) {
        this.v = obj;
        this.$isWrapped = true;
    }
    unWrap() {
        return this.v;
    }
}

export function wrapPyObj(obj) {
    return new pyWrapped(obj);
}


export const ffi = {
    remapToPy: remapToPy,
    remapToJs: remapToJs,
    toPy: toPy,
    toJs: toJs,

    toPyDict: toPyDict,
    toPyFloat: toPyFloat,
    toPyInt: toPyInt,
    toPyNumber: toPyNumber,
    toPyStr: toPyStr,
    toPyList: toPyList,
    toPyTuple: toPyTuple,
    toPySet: toPySet,

    numberToPy: numberToPy,

    pyWrapped: pyWrapped,
    wrapPyObj: wrapPyObj,

};


