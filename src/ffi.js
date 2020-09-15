class pyWrapped {
    constructor(obj) {
        this.v = obj;
        this.$wrapped = true;
    }
    unWrap() {
        return this.v;
    }
}

/**
 * @namespace Sk.ffi
 *
 */
Sk.ffi = {
    remapToPy: remapToPy,
    remapToJs: remapToJs,
    toPy: remapToPy,
    toJs: remapToJs,

    isTrue: toBoolean,

    toBoolean: toBoolean,
    toString: toString,
    toNumber: toNumber,
    toArray: toArray,

    dictToHashMap: dictToHashMap,

    toPyDict: toPyDict,
    toPyFloat: toPyFloat,
    toPyInt: toPyInt,
    toPyNumber: toPyNumber,
    toPyString: toPyString,
    toPyList: toPyList,
    toPyTuple: toPyTuple,
    toPySet: toPySet,

    numberToPy: numberToPy,

    pyWrapped: pyWrapped,
    wrapPyObj: wrapPyObj,

};

/**
 * maps from Javascript Object/Array/string to Python dict/list/str.
 *
 * only works on basic objects that are being used as storage, doesn't handle
 * functions, etc.
 */
function remapToPy(obj) {
    if (obj === null || obj === undefined) {
        return Sk.builtin.none.none$;
    }

    if (obj.ob$type) {
        return obj;
    }

    const type = typeof obj;

    if (obj.length !== undefined) {
        if (type === "string") {
            return new Sk.builtin.str(obj);
        }
        if (JSBI.__isBigInt(obj)) {
            return new Sk.builtin.int_(JSBI.numberIfSafe(obj)); // JSBI polyfill uses arrays under the hood
        }
        if (Array.isArray(obj)) {
            return new Sk.builtin.list(obj.map((x) => remapToPy(x)));
        }
        if (obj instanceof Uint8Array) {
            return new Sk.builtin.bytes(obj);
        }
    }
    if (type === "object") {
        if (obj.$wrapped !== undefined) {
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
        return new Sk.builtin.bool(obj);
    }
    if (type === "function") {
        return new Sk.builtin.func(obj);
    }
    if (type === "bigint") {
        // we know BigInt is defined - let int take care of conversion here.
        new Sk.builtin.int_(obj.toString());
    }

    Sk.asserts.fail("unhandled remap type " + typeof obj);
}
Sk.exportSymbol("Sk.ffi.remapToPy", Sk.ffi.remapToPy);

/**
 * Maps from Python dict/list/str/number to Javascript Object/Array/string/number.
 *
 * If obj is a
 *
 * @param obj {Object}  Any Python object (except a function)
 *
 */
function remapToJs(obj, wrap) {
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
    if (obj instanceof Sk.builtin.dict) {
        return dictToHashMap(obj);
    }
    if (val instanceof Uint8Array) {
        return val;
    }
    return wrapPyObj(obj);
}
Sk.exportSymbol("Sk.ffi.remapToJs", Sk.ffi.remapToJs);

function toBoolean(obj) {
    // basically the logic for Sk.misceva.isTrue
    return obj != null && obj.nb$bool ? obj.nb$bool() : obj.sq$length ? obj.sq$length() !== 0 : Boolean(obj);
}

function toNumber(obj) {
    return Number(obj);
}
function toString(obj) {
    return String(obj);
}

function toArray(obj) {
    return Array.from(obj, (x) => remapToJs(x));
}

function dictToHashMap(dict) {
    const obj = {};
    dict.$items().forEach(([key, val]) => {
        obj[key] = remapToJs(val);
    });
    return obj;
}

function numberToPy(val) {
    if (Number.isInteger(val)) {
        if (Math.abs(val) < Number.MAX_SAFE_INTEGER) {
            return new Sk.builtin.int_(val);
        }
        return new Sk.builtin.int_(JSBI.BigInt(val));
    }
    return new Sk.builtin.float_(val);
}

const isInteger = /^-?\d+$/;

function toPyNumber(obj) {
    const type = typeof obj;
    if (type === "number") {
        return numberToPy(obj);
    }
    if (type === "string") {
        if (obj.match(isInteger)) {
            return new Sk.builtin.int_(obj);
        }
        return new Sk.builtin.float_(parseFloat(obj));
    }
    if (type === "bigint" || JSBI.__isBigInt(obj)) {
        return new Sk.builtin.int_(JSBI.numberIfSafe(obj));
    }
    return new Sk.builtin.float_(Number(obj));
}

function toPyFloat(num) {
    return new Sk.builtin.float_(Number(num));
}

function toPyString(obj) {
    return new Sk.builtin.str(obj);
}

function toPyList(obj) {
    return new Sk.builtin.list(Array.from(obj, (x) => remapToPy(x)));
}

function toPySet(obj) {
    return new Sk.builtin.set(Array.from(obj, (x) => remapToPy(x)));
}

function toPyTuple(obj) {
    return new Sk.builtin.tuple(Array.from(obj, (x) => remapToPy(x)));
}

function toPyInt(num) {
    if (typeof num === "number") {
        num = Math.trunc(num);
    } else if (JSBI.__isBigInt(num)) {
        return new Sk.builtin.int_(JSBI.numberIfSafe(num));
    } else {
        num = Math.trunc(parseInt(num, 10));
    }
    return Math.abs(num) < Number.MAX_SAFE_INTEGER ? new Sk.builtin.int_(num) : new Sk.builtin.int_(JSBI.BigInt(num));
}

function toPyDict(obj) {
    const arr = [];
    Object.entries(obj).forEach(([key, val]) => {
        arr.push(new Sk.builtin.str(key));
        arr.push(remapToPy(val));
    });
    return new Sk.builtin.dict(arr);
}

function wrapPyObj(obj) {
    return new pyWrapped(obj);
}

Sk.ffi.callback = function (fn) {
    if (fn === undefined) {
        return fn;
    }
    return function () {
        return Sk.misceval.apply(fn, undefined, undefined, undefined, Array.prototype.slice.call(arguments, 0));
    };
};
Sk.exportSymbol("Sk.ffi.callback", Sk.ffi.callback);

Sk.ffi.stdwrap = function (type, towrap) {
    var inst = new type();
    inst["v"] = towrap;
    return inst;
};
Sk.exportSymbol("Sk.ffi.stdwrap", Sk.ffi.stdwrap);

/**
 * for when the return type might be one of a variety of basic types.
 * number|string, etc.
 */
Sk.ffi.basicwrap = function (obj) {
    obj === obj.valueOf();
    const type = typeof obj;
    if (type === "number" || type === "boolean" || type === "string") {
        return obj;
    }
    Sk.asserts.fail("unexpected type for basicwrap");
};
Sk.exportSymbol("Sk.ffi.basicwrap", Sk.ffi.basicwrap);

Sk.ffi.unwrapo = function (obj) {
    if (obj === undefined) {
        return undefined;
    }
    return obj["v"];
};
Sk.exportSymbol("Sk.ffi.unwrapo", Sk.ffi.unwrapo);

Sk.ffi.unwrapn = function (obj) {
    if (obj === null) {
        return null;
    }
    return obj["v"];
};
Sk.exportSymbol("Sk.ffi.unwrapn", Sk.ffi.unwrapn);

