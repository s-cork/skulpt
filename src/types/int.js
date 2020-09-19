import {
    JSBI,
    buildNativeClass,
    pyStr,
    pyFloat,
    pyTuple,
    pyNone,
    pyNotImplemented,
    pyExc,
    pyCall,
    genericGetAttr,
    checkInt,
    checkIndex,
    asIndexOrThrow,
    asIndex,
    keywordArrayToNamedArgs,
    typeName,
    objectLookupSpecial,
    mkNumber__format__,
} from "../internal";

/**
 *
 * @constructor
 * @extends {pyObject}
 * @description
 * Function should only be called with a JS number|BigInt|String
 * If the number is a string then the size will be checked to determined whether it should be a number or BigInt
 * It assumed that a number passed it is within `Number.MaxSafeInteger`
 * Similarly if a BigInt is passed it is assumed that this is larger than `Number.MaxSafeInteger`
 * Internal code like `float.nb$int_` checks the resulting JS instance before calling `new pyInt`
 *
 * @param  {number|JSBI|string=} x
 *
 */
export var pyInt = buildNativeClass("int", {
    constructor: function int_(x) {
        if (!(this instanceof pyInt)) {
            throw new TypeError("bad internal call to int constructor - use 'new'");
        }
        let v;
        if (typeof x === "number" || JSBI.__isBigInt(x)) {
            v = x;
        } else if (typeof x === "string") {
            v = stringToNumberOrBig(x);
        } else if (x === undefined) {
            v = 0;
        } else {
            throw new TypeError("bad argument to int constructor");
        }
        this.v = v;
    },
    slots: /** @lends {pyInt.prototype}*/ {
        tp$as_number: true,
        tp$doc:
            "int(x=0) -> integer\nint(x, base=10) -> integer\n\nConvert a number or string to an integer, or return 0 if no arguments\nare given.  If x is a number, return x.__int__().  For floating point\nnumbers, this truncates towards zero.\n\nIf x is not a number or if base is given, then x must be a string,\nbytes, or bytearray instance representing an integer literal in the\ngiven base.  The literal can be preceded by '+' or '-' and be surrounded\nby whitespace.  The base defaults to 10.  Valid bases are 0 and 2-36.\nBase 0 means to interpret the base from the string as an integer literal.\n>>> int('0b100', base=0)\n4",
        $r: function () {
            return new pyStr(this.v.toString());
        },
        tp$hash: numberUnarySlot(
            (v) => v,
            (v) => JSBI.toNumber(JSBI.remainder(v, JSBI.__MAX_SAFE))
        ),
        tp$new: function (args, kwargs) {
            let x, base;
            if (args.length + (kwargs ? kwargs.length : 0) === 1) {
                x = args[0];
                base = pyNone;
            } else {
                args = keywordArrayToNamedArgs("int", [null, "base"], args, kwargs, [new pyInt(0), pyNone]);
                x = args[0];
                base = args[1];
            }
            x = getInt(x, base);

            if (this === pyInt.prototype) {
                return x;
            } else {
                const instance = new this.constructor();
                instance.v = x.v;
                return instance;
            }
        },
        tp$getattr: genericGetAttr,
        ob$eq: compareSlot((v, w) => v == w, JSBI.equal),
        ob$ne: compareSlot((v, w) => v != w, JSBI.notEqual),
        ob$gt: compareSlot((v, w) => v > w, JSBI.greaterThan),
        ob$ge: compareSlot((v, w) => v >= w, JSBI.greaterThanOrEqual),
        ob$lt: compareSlot((v, w) => v < w, JSBI.lessThan),
        ob$le: compareSlot((v, w) => v <= w, JSBI.lessThanOrEqual),

        nb$int_: cloneSelf,
        nb$index: function () {
            return this.v;
        },
        nb$float_: function () {
            const v = this.v;
            if (typeof v === "number") {
                return new pyFloat(v);
            } else {
                const x = parseFloat(JSBI.toNumber(v));
                if (x === Infinity || x === -Infinity) {
                    throw new pyExc.OverflowError("int too large to convert to float");
                }
                return new pyFloat(x);
            }
        },
        nb$isnegative: function () {
            const v = this.v;
            return typeof v === "number" ? v < 0 : JSBI.lessThan(v, JSBI.__ZERO);
        },
        nb$ispositive: function () {
            const v = this.v;
            return typeof v === "number" ? v < 0 : JSBI.greaterThanOrEqual(v, JSBI.__ZERO);
        },
        nb$bool: function () {
            return this.v !== 0; // should be fine not to check BigInt here
        },

        nb$positive: cloneSelf,

        nb$negative: numberUnarySlot((v) => -v, JSBI.unaryMinus),

        nb$add: numberSlot(
            (v, w) => v + w,
            (v, w) => JSBI.numberIfSafe(JSBI.add(v, w))
        ),
        nb$subtract: numberSlot(
            (v, w) => v - w,
            (v, w) => JSBI.numberIfSafe(JSBI.subtract(v, w))
        ),
        nb$multiply: numberSlot((v, w) => v * w, JSBI.multiply),
        nb$divide: function (other) {
            if (Sk.__future__.division) {
                return this.nb$float_().nb$divide(other);
            }
            return this.nb$floor_divide(other);
        },
        nb$floor_divide: numberDivisionSlot((v, w) => Math.floor(v / w), JSBI.divide),
        nb$remainder: numberDivisionSlot((v, w) => v - Math.floor(v / w) * w, JSBI.remainder),
        nb$divmod: function (other) {
            const floor = this.nb$floor_divide(other);
            const remainder = this.nb$remainder(other);
            if (floor === pyNotImplemented || remainder === pyNotImplemented) {
                return pyNotImplemented;
            }
            return new pyTuple([floor, remainder]);
        },
        nb$and: numberBitSlot((v, w) => v & w, JSBI.bitwiseAnd),
        nb$or: numberBitSlot((v, w) => v | w, JSBI.bitwiseOr),
        nb$xor: numberBitSlot((v, w) => v ^ w, JSBI.bitwiseXor),

        nb$abs: numberUnarySlot(Math.abs, (v) => (JSBI.lessThan(v, JSBI.__ZERO) ? JSBI.unaryMinus(v) : v)),

        nb$lshift: numberShiftSlot((v, w) => {
            if (w < 53) {
                const tmp = v * 2 * shiftconsts[w];
                if (numberOrStringWithinThreshold(tmp)) {
                    return tmp;
                }
                return;
            }
        }, JSBI.leftShift),
        nb$rshift: numberShiftSlot(
            (v, w) => {
                const tmp = v >> w;
                if (v > 0 && tmp < 0) {
                    return tmp & (Math.pow(2, 32 - w) - 1);
                }
                return tmp;
            },
            (v, w) => JSBI.numberIfSafe(JSBI.signedRightShift(v, w))
        ),

        nb$invert: numberUnarySlot((v) => ~v, JSBI.bitwiseNot),
        nb$power: function (other, mod) {
            let ret;
            if (other instanceof pyInt && (mod === undefined || mod instanceof pyInt)) {
                let v = this.v;
                let w = other.v;
                if (typeof v === "number" && typeof w === "number") {
                    const power = Math.pow(this.v, other.v);
                    if (numberOrStringWithinThreshold(power)) {
                        ret = w < 0 ? new pyFloat(power) : new pyInt(power);
                    }
                }
                if (ret === undefined) {
                    v = bigUp(v);
                    w = bigUp(w);
                    ret = new pyInt(JSBI.exponentiate(v, w));
                }
                if (mod !== undefined) {
                    if (other.nb$isnegative()) {
                        throw new pyExc.ValueError("pow() 2nd argument cannot be negative when 3rd argument specified");
                    } else if (mod.v === 0) {
                        throw new pyExc.ValueError("pow() 3rd argument cannot be 0");
                    }
                    return ret.nb$remainder(mod);
                } else {
                    return ret;
                }
            }
            return pyNotImplemented;
        },
        nb$lng: function () {
            return new pyLong(this.v);
        },
    },
    getsets: /** @lends {pyInt.prototype}*/ {
        real: {
            $get: cloneSelf,
            $doc: "the real part of a complex number",
        },
        imag: {
            $get: function () {
                return new pyInt(0);
            },
            $doc: "the imaginary part of a complex number",
        },
    },
    methods: /** @lends {pyInt.prototype}*/ {
        conjugate: {
            $meth: cloneSelf,
            $flags: { NoArgs: true },
            $textsig: null,
            $doc: "Returns self, the complex conjugate of any int.",
        },
        bit_length: {
            $meth: function () {
                return new pyInt(Sk.builtin.bin(this).sq$length() - 2);
            },
            $flags: { NoArgs: true },
            $textsig: "($self, /)",
            $doc: "Number of bits necessary to represent self in binary.\n\n>>> bin(37)\n'0b100101'\n>>> (37).bit_length()\n6",
        },
        to_bytes: {
            $meth: function () {
                throw new pyExc.NotImplementedError("Not yet implemented in Skulpt");
            },
            $flags: { FastCall: true },
            $textsig: "($self, /, length, byteorder, *, signed=False)",
            $doc:
                "Return an array of bytes representing an integer.\n\n  length\n    Length of bytes object to use.  An OverflowError is raised if the\n    integer is not representable with the given number of bytes.\n  byteorder\n    The byte order used to represent the integer.  If byteorder is 'big',\n    the most significant byte is at the beginning of the byte array.  If\n    byteorder is 'little', the most significant byte is at the end of the\n    byte array.  To request the native byte order of the host system, use\n    `sys.byteorder' as the byte order value.\n  signed\n    Determines whether two's complement is used to represent the integer.\n    If signed is False and a negative integer is given, an OverflowError\n    is raised.",
        },
        __trunc__: {
            $meth: cloneSelf,
            $flags: { NoArgs: true },
            $textsig: null,
            $doc: "Truncating an Integral returns itself.",
        },
        __floor__: {
            $meth: cloneSelf,
            $flags: { NoArgs: true },
            $textsig: null,
            $doc: "Flooring an Integral returns itself.",
        },
        __ceil__: {
            $meth: cloneSelf,
            $flags: { NoArgs: true },
            $textsig: null,
            $doc: "Ceiling of an Integral returns itself.",
        },
        __round__: {
            $meth: function (ndigits) {
                return this.round$(ndigits);
            },
            $flags: { MinArgs: 0, MaxArgs: 1 },
            $textsig: null,
            $doc: "Rounding an Integral returns itself.\nRounding with an ndigits argument also returns an integer.",
        },
        __getnewargs__: {
            $meth: function () {
                return new pyTuple([new pyInt(this.v)]);
            },
            $flags: { NoArgs: true },
            $textsig: "($self, /)",
            $doc: pyNone,
        },
        __format__: {
            $meth: mkNumber__format__(false),
            $flags: { OneArg: true },
            $textsig: "($self, format_spec, /)",
            $doc: pyNone,
        },
    },
    proto: /** @lends {pyInt.prototype}*/ {
        str$: function (base, sign) {
            let tmp;
            if (base === undefined || base === 10) {
                tmp = this.v.toString();
            } else {
                tmp = this.v.toString(base);
            }
            if (sign || sign === undefined) {
                return tmp;
            } else if (tmp[0] === "-") {
                tmp = tmp.substring(1);
            }
            return tmp;
        },
        round$: function (ndigits) {
            if (ndigits !== undefined && !checkIndex(ndigits)) {
                throw new pyExc.TypeError("'" + typeName(ndigits) + "' object cannot be interpreted as an index");
            }
            if (ndigits === undefined) {
                ndigits = 0;
            } else {
                ndigits = asIndex(ndigits);
            }
            const v = this.v;
            const multiplier = Math.pow(10, -ndigits);
            let tmp;
            if (ndigits > 0) {
                return new pyInt(v);
            }
            if (typeof v === "number" && Sk.__future__.bankers_rounding) {
                const num10 = v / multiplier;
                const rounded = Math.round(num10);
                const bankRound = (num10 > 0 ? num10 : -num10) % 1 === 0.5 ? (0 === rounded % 2 ? rounded : rounded - 1) : rounded;
                const result = bankRound * multiplier;
                return new pyInt(result);
            } else if (typeof v === "number") {
                return new pyInt(Math.round(v / multiplier) * multiplier);
            } else {
                const BigMultiplier = JSBI.BigInt(multiplier * 10);
                const ten = JSBI.BigInt(10);
                tmp = JSBI.divide(v, BigMultiplier);
                const undecided = JSBI.divide(tmp, ten);
                const pt5 = JSBI.subtract(tmp, JSBI.multiply(ten, undecided));
                if (JSBI.toNumber(pt5) < 5) {
                    tmp = JSBI.multiply(JSBI.multiply(undecided, ten), BigMultiplier);
                } else {
                    JSBI.multiply(JSBI.multiply(JSBI.add(undecided, JSBI.BigInt(1), ten), BigMultiplier));
                }
                return new pyInt(tmp);
            }
        },
        valueOf: function () {
            return this.v;
        },
    },
});

/**
 * A function that will return either a number or a BigInt
 *
 * There are two functions passed to this slot the quick function where both int values are number
 * and the JSBI.BigInt version of the same function
 * The fall through case where one or both of the int values is a bigint
 * @ignore
 *
 * @private
 *
 * @param {Function} number_func
 * @param {Function} bigint_func
 */
function numberSlot(number_func, bigint_func) {
    /**
     * @this {pyInt}
     *
     * @param {pyInt|pyObject} other
     * @return {pyInt|pyNotImplemented}
     */
    function doNumberSlot(other) {
        if (other instanceof pyInt) {
            /**@type {number|JSBI} */
            let v = this.v;
            /**@type {number|JSBI} */
            let w = other.v;
            if (typeof v === "number" && typeof w === "number") {
                const res = number_func(v, w);
                if (numberOrStringWithinThreshold(res)) {
                    return new pyInt(res);
                }
            }
            v = bigUp(v);
            w = bigUp(w);
            return new pyInt(bigint_func(v, w));
        }
        return pyNotImplemented;
    }
    return doNumberSlot;
}

function compareSlot(number_func, bigint_func) {
    return function (other) {
        if (other instanceof pyInt) {
            let v = this.v;
            let w = other.v;
            if (typeof v === "number" && typeof w === "number") {
                return number_func(v, w);
            }
            v = bigUp(v);
            w = bigUp(w);
            return bigint_func(v, w);
        }
        return pyNotImplemented;
    };
}

/**
 *
 * @param {function(number): number} number_func
 * @param {function(JSBI): JSBI} bigint_func
 * @ignore
 *
 */
function numberUnarySlot(number_func, bigint_func) {
    /**
     * @this {pyInt}
     * @return {pyInt}
     */
    function doUnarySlot() {
        const v = this.v;
        if (typeof v === "number") {
            return new pyInt(number_func(v));
        }
        return new pyInt(bigint_func(v));
    }
    return doUnarySlot;
}

function cloneSelf() {
    return new pyInt(this.v);
}

function numberDivisionSlot(number_func, bigint_func) {
    return function (other) {
        if (other instanceof pyInt) {
            let v = this.v;
            let w = other.v;
            if (w === 0) {
                throw new pyExc.ZeroDivisionError("integer division or modulo by zero");
            }
            if (typeof v === "number" && typeof w === "number") {
                // it's integer division so no need to check if the number got bigger!
                return new pyInt(number_func(v, w));
            }
            v = bigUp(v);
            w = bigUp(w);
            return new pyInt(JSBI.numberIfSafe(bigint_func(v, w)));
        }
        return pyNotImplemented;
    };
}

function numberShiftSlot(number_func, bigint_func) {
    return function (other) {
        if (other instanceof pyInt) {
            let v = this.v;
            let w = other.v;
            if (v === 0) {
                return new pyInt(this.v);
            }
            if (typeof w === "number") {
                if (w < 0) {
                    throw new pyExc.ValueError("negative shift count");
                }
                if (typeof v === "number") {
                    const tmp = number_func(v, w);
                    if (tmp !== undefined) {
                        return new pyInt(tmp);
                    }
                }
                w = JSBI.BigInt(w);
            } else if (JSBI.lessThan(JSBI.BigInt(0))) {
                throw new pyExc.ValueError("negative shift count");
            }
            v = bigUp(v);
            return new pyInt(bigint_func(v, w)); // con't convert if safe for leftshift
        }
        return pyNotImplemented;
    };
}

function numberBitSlot(number_func, bigint_func) {
    return function (other) {
        if (other instanceof pyInt) {
            let v = this.v;
            let w = other.v;
            if (typeof v === "number" && typeof w === "number") {
                let tmp = number_func(v, w);
                if (tmp < 0) {
                    tmp = tmp + 4294967296; // convert back to unsigned
                }
                return new pyInt(tmp);
            }
            v = bigUp(v);
            w = bigUp(w);
            return new pyInt(JSBI.numberIfSafe(bigint_func(v, w)));
        }
        return pyNotImplemented;
    };
}

/**
 * Takes a JavaScript string and returns a number using the parser and negater
 *  functions (for int/long right now)
 * @param  {string} s       Javascript string to convert to a number.
 * @param  {number|string=} base    The base of the number.
 */
export function stringToNumber(s, base) {
    var origs = s,
        neg = false,
        i,
        ch,
        val;
    // strip whitespace from ends
    // s = s.trim();
    s = s.replace(/^\s+|\s+$/g, "");

    // check for minus sign
    if (s.charAt(0) === "-") {
        neg = true;
        s = s.substring(1);
    }

    // check for plus sign
    if (s.charAt(0) === "+") {
        s = s.substring(1);
    }

    if (base === null || base === undefined) {
        base = 10;
    } // default radix is 10, not dwim
    if (base < 2 || base > 36) {
        if (base !== 0) {
            throw new pyExc.ValueError("int() base must be >= 2 and <= 36");
        }
    }
    if (typeof base === "string") {
        base = Number(base); // keep closure happy for parseInt
    }

    if (s.substring(0, 2).toLowerCase() === "0x") {
        if (base === 16 || base === 0) {
            s = s.substring(2);
            base = 16;
        } else if (base < 34) {
            throw new pyExc.ValueError("invalid literal for int() with base " + base + ": '" + origs + "'");
        }
    } else if (s.substring(0, 2).toLowerCase() === "0b") {
        if (base === 2 || base === 0) {
            s = s.substring(2);
            base = 2;
        } else if (base < 12) {
            throw new pyExc.ValueError("invalid literal for int() with base " + base + ": '" + origs + "'");
        }
    } else if (s.substring(0, 2).toLowerCase() === "0o") {
        if (base === 8 || base === 0) {
            s = s.substring(2);
            base = 8;
        } else if (base < 25) {
            throw new pyExc.ValueError("invalid literal for int() with base " + base + ": '" + origs + "'");
        }
    } else if (s.charAt(0) === "0") {
        if (s === "0") {
            return 0;
        }
        if (base === 8 || base === 0) {
            base = 8;
        }
    }

    if (base === 0) {
        base = 10;
    }

    if (s.length === 0) {
        throw new pyExc.ValueError("invalid literal for int() with base " + base + ": '" + origs + "'");
    }

    // check all characters are valid
    for (i = 0; i < s.length; i = i + 1) {
        ch = s.charCodeAt(i);
        val = base;
        if (ch >= 48 && ch <= 57) {
            // 0-9
            val = ch - 48;
        } else if (ch >= 65 && ch <= 90) {
            // A-Z
            val = ch - 65 + 10;
        } else if (ch >= 97 && ch <= 122) {
            // a-z
            val = ch - 97 + 10;
        }

        if (val >= base) {
            throw new pyExc.ValueError("invalid literal for int() with base " + base + ": '" + origs + "'");
        }
    }

    if (neg) {
        s = "-" + s;
    }
    val = parseInt(s, base);
    if (numberOrStringWithinThreshold(val)) {
        return val; // will convert our string to a number
    }
    return fromStrToBigWithBase(s, base);
}

pyInt.py2$methods = {};

/**
 *
 * @param {string} s
 * @param {number=} base
 */
export function longFromStr(s, base) {
    if (Sk.__future__.python3) {
        return new pyInt(stringToNumberOrBig(s));
    } else {
        const num = stringToNumber(s, base);
        return new pyLong(num);
    }
}

function numberOrStringWithinThreshold(v) {
    return v <= Number.MAX_SAFE_INTEGER && v >= -Number.MAX_SAFE_INTEGER;
}

pyInt.withinThreshold = numberOrStringWithinThreshold;

function stringToNumberOrBig(s) {
    if (s <= Number.MAX_SAFE_INTEGER && s >= -Number.MAX_SAFE_INTEGER) {
        return +s;
    }
    return JSBI.BigInt(s);
}

pyInt.stringToNumberOrBig = stringToNumberOrBig;
function bigUp(v) {
    if (typeof v === "number") {
        return JSBI.BigInt(v);
    }
    return v;
}

function getInt(x, base) {
    let func, res;
    // if base is not of type int, try calling .__index__
    if (base !== pyNone) {
        base = asIndexOrThrow(base);
    } else {
        base = null;
    }

    if (x instanceof pyStr) {
        if (base === null) {
            base = 10;
        }
        return new pyInt(stringToNumber(x.v, base));
    } else if (base !== null) {
        throw new pyExc.TypeError("int() can't convert non-string with explicit base");
    } else if (x.nb$int_) {
        return x.nb$int_();
    }

    if ((func = objectLookupSpecial(x, pyStr.$trunc))) {
        res = pyCall(func, []);
        // check return type of magic methods
        if (!checkInt(res)) {
            throw new pyExc.TypeError(pyStr.$trunc + " returned non-Integral (type " + typeName(x) + ")");
        }
        return new pyInt(res.v);
    }

    throw new pyExc.TypeError("int() argument must be a string, a bytes-like object or a number, not '" + typeName(x) + "'");
}

/**
 *
 * We don't need to check the string has valid digits since str2number did that for us
 * @param {*} s
 * @param {*} base
 * @ignore
 */
function fromStrToBigWithBase(s, base) {
    let neg = false;
    if (s[0] === "-") {
        neg = true;
        s = s.substring(1);
    }
    base = JSBI.BigInt(base);
    let power = JSBI.BigInt(1);
    let num = JSBI.BigInt(0);
    let toadd, val;
    for (let i = s.length - 1; i >= 0; i--) {
        val = s.charCodeAt(i);
        if (val >= 48 && val <= 57) {
            // 0-9
            val = val - 48;
        } else if (val >= 65 && val <= 90) {
            // A-Z
            val = val - 65 + 10;
        } else if (val >= 97 && val <= 122) {
            // a-z
            val = val - 97 + 10;
        }
        toadd = JSBI.multiply(JSBI.BigInt(val), power);
        num = JSBI.add(num, toadd);
        power = JSBI.multiply(power, base);
    }
    if (neg) {
        num = JSBI.multiply(num, JSBI.BigInt(-1));
    }
    return num;
}

const shiftconsts = [
    0.5,
    1,
    2,
    4,
    8,
    16,
    32,
    64,
    128,
    256,
    512,
    1024,
    2048,
    4096,
    8192,
    16384,
    32768,
    65536,
    131072,
    262144,
    524288,
    1048576,
    2097152,
    4194304,
    8388608,
    16777216,
    33554432,
    67108864,
    134217728,
    268435456,
    536870912,
    1073741824,
    2147483648,
    4294967296,
    8589934592,
    17179869184,
    34359738368,
    68719476736,
    137438953472,
    274877906944,
    549755813888,
    1099511627776,
    2199023255552,
    4398046511104,
    8796093022208,
    17592186044416,
    35184372088832,
    70368744177664,
    140737488355328,
    281474976710656,
    562949953421312,
    1125899906842624,
    2251799813685248,
    4503599627370496,
    9007199254740992,
];

/**
 * @constructor
 *
 * @description
 * This is only for backward compatibility with py2.
 * We take the approach of using a trivial subclass with int and overriding a few methods
 *
 * @param {number|string|JSBI} x
 * @extends {pyInt}
 * @ignore
 */
export var pyLong = buildNativeClass("long", {
    base: pyInt, // not technically correct but makes backward compatibility easy
    constructor: function lng(x) {
        pyInt.call(this, x);
    },
    slots: /** @lends {pyLong.prototype} */ {
        $r: function () {
            return new pyStr(this.v.toString() + "L");
        },
        tp$as_number: true,
        nb$negative: function () {
            return new pyLong(pyInt.prototype.nb$negative.call(this).v);
        },
        nb$positive: function () {
            return new pyLong(pyInt.prototype.nb$positive.call(this).v);
        },
    },
});
