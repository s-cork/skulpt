import {
    buildNativeClass,
    pyInt,
    pyStr,
    pyExc,
    pyNone,
    pyLong,
    pyBool,
    pyTuple,
    pyNotImplemented,
    checkNoKwargs,
    checkArgsLen,
    checkNone,
    checkFloat,
    checkNumber,
    checkString,
    asIndexSized,
    genericGetAttr,
    objectRepr,
    mkNumber__format__,
} from "../internal";

/** @typedef {pyObject} */
const hashMap = {};

/**
 * @constructor
 * @extends {pyObject}
 *
 * @param {number} x only be called with a JS number
 *
 * @return {pyFloat} Python float
 */
export var pyFloat = buildNativeClass("float", {
    constructor: function float_ (x) {
        if (!(this instanceof pyFloat)) {
            throw new TypeError("bad call to float use 'new'");
        }
        if (typeof x === "number") {
            this.v = x;
        } else if (typeof x === "string") {
            // be careful with converting a string as it could result in infinity
            this.v = parseFloat(x);
        } else if (x === undefined) {
            this.v = 0.0;
        } else if (x.nb$float_) {
            this.v = x.nb$float_().v;
        } else {
            throw new TypeError("bad argument to float constructor use 'new'");
        }
    },
    slots: /**@lends {pyFloat.prototype} */{
        tp$gettattr: genericGetAttr,
        tp$as_number: true,
        tp$doc: "Convert a string or number to a floating point number, if possible.",
        tp$hash: function () {
            let hash = hashMap[this.v];
            if (hash !== undefined) {
                return hash;
            }
            hash = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER - Number.MAX_SAFE_INTEGER / 2);
            hashMap[this.v] = hash;
            return hash;
        },
        $r: function () {
            return new pyStr(this.str$(10, true));
        },
        tp$new: function (args, kwargs) {
            checkNoKwargs("float", kwargs);
            checkArgsLen("float", args, 0, 1);
            const arg = args[0];
            let x;
            // is args always an empty list?
            if (arg === undefined) {
                x = new pyFloat(0.0);
            } else if (arg.nb$float_) {
                x = arg.nb$float_();
            } else if (checkString(arg)) {
                x = _str_to_float(arg.v);
            }
            if (x === undefined) {
                throw new pyExc.TypeError("float() argument must be a string or a number");
            }
            if (this === pyFloat.prototype) {
                return x;
            } else {
                const instance = new this.constructor();
                instance.v = x.v;
                return instance;
            }
        },

        // number slots
        nb$int_: function () {
            let v = this.v;
            if (v < 0) {
                v = Math.ceil(v);
            } else {
                v = Math.floor(v);
            }
            if (!Number.isInteger(v)) {
                throw new pyExc.ValueError("cannot convert float " + objectRepr(this) + " to integer");
            }
            if (pyInt.withinThreshold(v)) {
                return new pyInt(v);
            } else {
                return new pyInt(JSBI.BigInt(v));
            }
        },
        nb$float_: cloneSelf,
        nb$lng: function () {
            return new pyLong(this.nb$int_().v);
        },
        nb$add: numberSlot((v, w) => new pyFloat(v + w)),
        
        nb$subtract: numberSlot((v, w) => new pyFloat(v - w)),
        nb$reflected_subtract: numberSlot((v, w) => new pyFloat(w - v)),
        
        nb$multiply: numberSlot((v, w) => new pyFloat(v * w)),
        
        nb$divide: numberSlot(divide),
        nb$reflected_divide: numberSlot((v, w) => divide(w, v)),
        
        nb$floor_divide: numberSlot(floordivide),
        nb$reflected_floor_divide: numberSlot((v, w) => floordivide(w, v)),

        nb$remainder: numberSlot(remainder),
        nb$reflected_remainder: numberSlot((v, w) => remainder(w, v)),
        
        nb$divmod: numberSlot((v, w) => new pyTuple([floordivide(v, w), remainder(v, w)])),
        nb$reflected_divmod: numberSlot((v, w) => new pyTuple([floordivide(w, v), remainder(w, v)])),
        
        nb$power: ternarySlot(power),
        nb$reflected_power: ternarySlot((v, w) => power(w, v)),
        
        nb$abs: function () {
            return new pyFloat(Math.abs(this.v));
        },
        nb$negative: function () {
            return new pyFloat(-this.v);
        },
        nb$positive: function () {
            return new pyFloat(this.v);
        },
        nb$bool: function () {
            return this.v !== 0;
        },
        nb$isnegative: function () {
            return this.v < 0;
        },
        nb$ispositive: function () {
            return this.v >= 0;
        },
        ob$eq: numberSlot((v, w) => v == w),
        ob$ne: numberSlot((v, w) => v != w),
        ob$gt: numberSlot((v, w) => v > w),
        ob$ge: numberSlot((v, w) => v >= w),
        ob$lt: numberSlot((v, w) => v < w),
        ob$le: numberSlot((v, w) => v <= w),
    },
    getsets:  /**@lends {pyFloat.prototype} */{
        real: {
            $get: cloneSelf,
            $doc: "the real part of a complex number",
        },
        imag: {
            $get: function () {
                return new pyFloat(0.0);
            },
            $doc: "the imaginary part of a complex number",
        },
    },
    methods:  /**@lends {pyFloat.prototype} */{
        conjugate: {
            $meth: cloneSelf,
            $flags: { NoArgs: true },
            $textsig: "($self, /)",
            $doc: "Return self, the complex conjugate of any float.",
        },
        __trunc__: {
            $meth: function () {
                return this.nb$int_();
            },
            $flags: { NoArgs: true },
            $textsig: "($self, /)",
            $doc: "Return the Integral closest to x between 0 and x.",
        },
        __round__: {
            $meth: function (ndigits) {
                return this.round$(ndigits);
            },
            $flags: { MinArgs: 0, MaxArgs: 1 },
            $textsig: "($self, ndigits=None, /)",
            $doc: "Return the Integral closest to x, rounding half toward even.\n\nWhen an argument is passed, work like built-in round(x, ndigits).",
        },
        // as_integer_ratio: {
        //     $meth: methods.as_integer_ratio,
        //     $flags: { NoArgs: true },
        //     $textsig: "($self, /)",
        //     $doc:
        //         "Return integer ratio.\n\nReturn a pair of integers, whose ratio is exactly equal to the original float\nand with a positive denominator.\n\nRaise OverflowError on infinities and a ValueError on NaNs.\n\n>>> (10.0).as_integer_ratio()\n(10, 1)\n>>> (0.0).as_integer_ratio()\n(0, 1)\n>>> (-.25).as_integer_ratio()\n(-1, 4)",
        // },
        // hex: {
        //     $meth: methods.hex,
        //     $flags: { NoArgs: true },
        //     $textsig: "($self, /)",
        //     $doc:
        //         "Return a hexadecimal representation of a floating-point number.\n\n>>> (-0.1).hex()\n'-0x1.999999999999ap-4'\n>>> 3.14159.hex()\n'0x1.921f9f01b866ep+1'",
        // },
        is_integer: {
            $meth: function () {
                return new pyBool(Number.isInteger(this.v));
            },
            $flags: { NoArgs: true },
            $textsig: "($self, /)",
            $doc: "Return True if the float is an integer.",
        },
        __getnewargs__: {
            $meth: function () {
                return new pyTuple([this]);
            },
            $flags: { NoArgs: true },
            $textsig: "($self, /)",
            $doc: pyNone,
        },
        __format__: {
            $meth: mkNumber__format__(true),
            $flags: { OneArg: true },
            $textsig: "($self, format_spec, /)",
            $doc: pyNone,
        },
    },
    proto: {
        valueOf: function () {
            return this.v;
        }
    }
});

function _str_to_float(str) {
    let ret;
    if (str.match(/^-inf$/i)) {
        ret = -Infinity;
    } else if (str.match(/^[+]?inf$/i)) {
        ret = Infinity;
    } else if (str.match(/^[-+]?nan$/i)) {
        ret = NaN;
    } else if (!isNaN(str)) {
        ret = parseFloat(str);
        if (isNaN(ret)) {
            ret = undefined;
        }
    } 
    if (ret === undefined) {
        throw new pyExc.ValueError("could not convert string to float: " + objectRepr(new pyStr(str)));
    }
    return new pyFloat(ret);
}

function cloneSelf() {
    return new pyFloat(this.v);
}

/**
 * Checks for float subtypes, though skulpt does not allow to
 * extend them for now.
 *
 * Javascript function, returns Javascript object.
 * @param {Object} op The object to check as subtype.
 * @return {boolean} true if op is a subtype of pyFloat, false otherwise
 */
pyFloat.PyFloat_Check = function (op) {
    if (op === undefined) {
        return false;
    }
    // this is a little bit hacky
    // ToDo: subclassable builtins do not require this
    if (checkNumber(op)) {
        return true;
    }
    if (checkFloat(op)) {
        return true;
    }
    if (op.ob$type.$isSubType(pyFloat)) {
        return true;
    }
    return false;
};


/**
 * Returns this instance's value as a string formatted using fixed-point notation.
 *
 * Javascript function, returns Javascript object.
 *
 * @param  {Object|number} x The numer of digits to appear after the decimal point.
 * @return {string}   The string representation of this instance's value.
 */
pyFloat.prototype.toFixed = function (x) {
    return this.v.toFixed(Number(x));
};

function numberSlot(f) {
    return function (other) {
        const v = this.v;
        let w = other.v;
        if (typeof w === "number") {
            // pass
        } else if (JSBI.__isBigInt(w)) {
            w = fromBigIntToNumberOrOverflow(w);
        } else {
            return pyNotImplemented;
        }
        return f(v, w);
    };
}

function ternarySlot(f) {
    const binSlot = numberSlot(f);
    return function (other, z) {
        if (z !== undefined && !checkNone(z)) {
            throw new pyExc.TypeError("pow() 3rd argument not allowed unless all arguments are integers");
        }
        return binSlot.call(this, other);
    };
}

function divide(v, w) {
    if (w === 0) {
        throw new pyExc.ZeroDivisionError("integer division or modulo by zero");
    }
    if (v === Infinity) {
        if (w === Infinity || v === -Infinity) {
            return new pyFloat(NaN);
        } else if (w < 0) {
            return new pyFloat(-Infinity);
        } else {
            return new pyFloat(Infinity);
        }
    }
    if (v === -Infinity) {
        if (w === Infinity || v === -Infinity) {
            return new pyFloat(NaN);
        } else if (w < 0) {
            return new pyFloat(Infinity);
        } else {
            return new pyFloat(-Infinity);
        }
    }
    return new pyFloat(v / w);
}

function floordivide(v, w) {
    if (v === Infinity || v === -Infinity) {
        return new pyFloat(NaN);
    }
    if (w === 0) {
        throw new pyExc.ZeroDivisionError("integer division or modulo by zero");
    }

    if (w === Infinity) {
        if (v < 0) {
            return new pyFloat(-1);
        } else {
            return new pyFloat(0);
        }
    }
    if (w === -Infinity) {
        if (v < 0 || v !== 0) {
            return new pyFloat(0);
        } else {
            return new pyFloat(-1);
        }
    }
    return new pyFloat(Math.floor(v / w));
}

function remainder(v, w) {
    if (w === 0) {
        throw new pyExc.ZeroDivisionError("integer division or modulo by zero");
    }
    if (v === 0) {
        return new pyFloat(0);
    }
    if (w === Infinity) {
        if (v === Infinity || this.v === -Infinity) {
            return new pyFloat(NaN);
        } else if (v > 0) {
            return new pyFloat(v);
        } else {
            return new pyFloat(Infinity);
        }
    }

    //  Javacript logic on negatives doesn't work for Python... do this instead
    let tmp = v % w;

    if (v < 0) {
        if (w > 0 && tmp < 0) {
            tmp = tmp + w;
        }
    } else {
        if (w < 0 && tmp !== 0) {
            tmp = tmp + w;
        }
    }
    if (tmp === 0) {
        if (w < 0) {
            tmp = -0.0; // otherwise the sign gets lost by javascript modulo
        } else if (Infinity / tmp === -Infinity) {
            tmp = 0.0;
        }
    }
    return new pyFloat(tmp);
}

function power(v, w) {
    if (v < 0 && w % 1 !== 0) {
        throw new pyExc.ValueError("negative number cannot be raised to a fractional power");
    }
    if (v === 0 && w < 0) {
        throw new pyExc.ZeroDivisionError("0.0 cannot be raised to a negative power");
    }

    const result = Math.pow(v, w);

    if (Math.abs(result) === Infinity && Math.abs(v) !== Infinity && Math.abs(w) !== Infinity) {
        throw new pyExc.OverflowError("Numerical result out of range");
    }
    return new pyFloat(result);
}

/**
 * Round this instance to a given number of digits, or zero if omitted.
 *
 * Implements `__round__` dunder method.
 *
 * Javascript function, returns Python object.
 *
 * @param  {pyObject=} ndigits The number of digits after the decimal point to which to round.
 * @return {pyFloat|pyInt} The rounded float.
 * 
 */
pyFloat.prototype.round$ = function (ndigits) {
    var result, multiplier, number, num10, rounded, bankRound, ndigs;
    if (ndigits === undefined) {
        ndigs = 0;
    } else {
        ndigs = asIndexSized(ndigits);
    }
    number = Number(this);

    if (Sk.__future__.bankers_rounding) {
        num10 = number * Math.pow(10, ndigs);
        rounded = Math.round(num10);
        bankRound = (num10 > 0 ? num10 : -num10) % 1 === 0.5 ? (0 === rounded % 2 ? rounded : rounded - 1) : rounded;
        result = bankRound / Math.pow(10, ndigs);
        if (ndigits === undefined) {
            return new pyInt(result);
        } else {
            return new pyFloat(result);
        }
    } else {
        multiplier = Math.pow(10, ndigs);
        result = Math.round(number * multiplier) / multiplier;

        return new pyFloat(result);
    }
};

/**
 * Convert this instance's value to a Javascript string.
 *
 * Javascript function, returns Javascript object.
 *
 * @param {number} base The base of the value.
 * @param {boolean} sign true if the value should be signed, false otherwise.
 * @return {string} The Javascript string representation of this instance.
 */
pyFloat.prototype.str$ = function (base, sign) {
    var post;
    var pre;
    var idx;
    var tmp;
    var work;

    if (isNaN(this.v)) {
        return "nan";
    }

    if (sign === undefined) {
        sign = true;
    }

    if (this.v == Infinity) {
        return "inf";
    }
    if (this.v == -Infinity && sign) {
        return "-inf";
    }
    if (this.v == -Infinity && !sign) {
        return "inf";
    }

    work = sign ? this.v : Math.abs(this.v);

    if (base === undefined || base === 10) {
        if (Sk.__future__.python3) {
            tmp = work.toPrecision(16);
        } else {
            tmp = work.toPrecision(12);
        }

        // transform fractions with 4 or more leading zeroes into exponents
        idx = tmp.indexOf(".");
        pre = work.toString().slice(0, idx);
        post = work.toString().slice(idx);

        if (pre.match(/^-?0$/) && post.slice(1).match(/^0{4,}/)) {
            if (tmp.length < 12) {
                tmp = work.toExponential();
            } else {
                tmp = work.toExponential(11);
            }
        }

        if (tmp.indexOf("e") < 0 && tmp.indexOf(".") >= 0) {
            while (tmp.charAt(tmp.length - 1) == "0") {
                tmp = tmp.substring(0, tmp.length - 1);
            }
            if (tmp.charAt(tmp.length - 1) == ".") {
                tmp = tmp + "0";
            }
        }

        tmp = tmp.replace(new RegExp("\\.0+e"), "e", "i");
        // make exponent two digits instead of one (ie e+09 not e+9)
        tmp = tmp.replace(/(e[-+])([1-9])$/, "$10$2");
        // remove trailing zeroes before the exponent
        tmp = tmp.replace(/0+(e.*)/, "$1");
    } else {
        tmp = work.toString(base);
    }

    // restore negative zero sign
    if (this.v === 0 && 1 / this.v === -Infinity) {
        tmp = "-" + tmp;
    }

    if (tmp.indexOf(".") < 0 && tmp.indexOf("E") < 0 && tmp.indexOf("e") < 0) {
        tmp = tmp + ".0";
    }

    return tmp;
};


pyFloat.py2$methods = {};

function fromBigIntToNumberOrOverflow(big) {
    const x = parseFloat(JSBI.toNumber(big));
    if (x == Infinity || x == -Infinity) {
        //trying to convert a large js string to a float
        throw new pyExc.OverflowError("int too large to convert to float");
    }
    return x;
}
