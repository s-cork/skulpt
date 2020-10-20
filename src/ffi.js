/**
 * @namespace Sk.ffi
 *
 */
Sk.ffi = {
    remapToPy: toPy,
    remapToJs: toJs,
    toPy,
    toJs,

    isTrue,

    toJsString,
    toJsNumber,
    toJsArray,

    toJsHashMap,

    toPyDict,
    toPyFloat,
    toPyInt,
    toPyNumber,
    toPyStr,
    toPyList,
    toPyTuple,
    toPySet,

    numberToPy,
    proxy,
};

/**
 * maps from Javascript Object/Array/string to Python dict/list/str.
 *
 * only works on basic objects that are being used as storage, doesn't handle
 * functions, etc.
 */
function toPy(obj) {
    if (obj === null || obj === undefined) {
        return Sk.builtin.none.none$;
    }

    if (obj.sk$object) {
        return obj;
    }

    let constructor;
    const type = typeof obj;

    if (obj.length !== undefined) {
        if (type === "string") {
            return new Sk.builtin.str(obj);
        }
        if (Array.isArray(obj)) {
            if (JSBI.__isBigInt(obj)) {
                // JSBI polyfill uses arrays under the hood so check this first
                return new Sk.builtin.int_(JSBI.numberIfSafe(obj)); 
            }
            return new Sk.builtin.list(obj.map((x) => toPy(x)));
        }
        constructor = obj.constructor;
        if (constructor === Uint8Array) {
            return new Sk.builtin.bytes(obj);
        }
    }
    if (type === "object") {
        constructor = constructor || obj.constructor;
        if (constructor === Sk.misceval.Suspension) {
            return obj;
        }
        if (constructor === Object) {
            if (obj.next !== undefined) {
                // then we have an iterator
                return proxy(obj);
            }
            return toPyDict(obj);
        }
        if (constructor === undefined) {
            return toPyDict(obj);
        }
        if (constructor === Set) {
            return toPySet(obj);
        }
        if (constructor === Map) {
            const ret = new Sk.builtin.dict();
            obj.forEach((val, key) => {
                ret.mp$ass_subscript(toPy(key), toPy(val));
            });
            return ret;
        }
        return proxy(obj);
    }

    if (type === "number") {
        return numberToPy(obj);
    }
    if (type === "boolean") {
        return new Sk.builtin.bool(obj);
    }
    if (type === "function") {
        if (obj.prototype) {
            if (Object.getOwnPropertyNames(obj.prototype).length > 1) {
                // then we have a type object
                return proxy(obj);
            }
        }
        return new Sk.builtin.sk_method({
            $meth(args) {
                return toPy(obj(...args.map((x) => toJs(x))));
            },
            $name: obj.name,
            $flags: { FastCall: true, NoKwargs: true },
        });
    }
    if (type === "bigint") {
        // we know BigInt is defined - let int take care of conversion here.
        new Sk.builtin.int_(JSBI.numberIfSafe(obj));
    }

    return proxy(obj);
}

/**
 *
 * @param {*} obj
 */
function toJs(obj) {
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
        return val.map((x) => toJs(x));
    }
    if (val.sk$object) {
        if (obj instanceof Sk.builtin.dict) {
            return toJsHashMap(obj);
        }
        if (val.tp$call !== undefined) {
            const tp_name = val.tp$name;
            if (tp_name === "function" || tp_name === "method" || tp_name === "builtin_function_or_method") {
                return (...args) => {
                    const ret = Sk.misceval.chain(obj.tp$call(args.map((x) => toPy(x))), (res) => toJs(res));
                    return Sk.misceval.retryOptionalSuspensionOrThrow(ret);
                };
            }
        }
        if (obj instanceof Sk.builtin.set) {
            return new Set(toJsArray(obj));
        }
    }

    // no need to wrap this to javascript just send it raw
    return val;
}

function isTrue(obj) {
    // basically the logic for Sk.misceval.isTrue
    return obj != null && obj.nb$bool ? obj.nb$bool() : obj.sq$length ? obj.sq$length() !== 0 : Boolean(obj);
}

function toJsNumber(obj) {
    return Number(obj);
}
function toJsString(obj) {
    return String(obj);
}

function toJsArray(obj) {
    return Array.from(obj, (x) => toJs(x));
}

function toJsHashMap(dict) {
    const obj = {};
    dict.$items().forEach(([key, val]) => {
        obj[key.toString()] = toJs(val);
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

function toPyStr(obj) {
    return new Sk.builtin.str(obj);
}

function toPyList(obj) {
    return new Sk.builtin.list(Array.from(obj, (x) => toPy(x)));
}

function toPySet(obj) {
    return new Sk.builtin.set(Array.from(obj, (x) => toPy(x)));
}

function toPyTuple(obj) {
    return new Sk.builtin.tuple(Array.from(obj, (x) => toPy(x)));
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
    const ret = new Sk.builtin.dict();
    Object.entries(obj).forEach(([key, val]) => {
        ret.mp$ass_subscript(new Sk.builtin.str(key), toPy(val));
    });
    return ret;
}

function proxy(obj) {
    if (obj === undefined) {
        throw new Sk.builtin.TypeError("proxy requires an argument");
    }
    if (_proxied.has(obj)) {
        return _proxied.get(obj);
    }
    const ret = new JsProxy(obj);
    _proxied.set(obj, ret);
    return ret;
}

// cache the proxied objects in a weakmap
const _proxied = new WeakMap();

const JsProxy = Sk.abstr.buildNativeClass("Proxy", {
    constructor: function JsProxy(obj) {
        this.js$wrapped = obj;
        this.$dir = null;
        this.$module = null;
        this.$methods = {};

        if (obj.call !== undefined) {
            this.is$type = true;
            this.tp$name = obj.name || "<unkown>";
            this.tp$call = (args, kwargs) => {
                Sk.abstr.checkNoKwargs(this.tp$name, kwargs);
                return toPy(new obj(...args.map((x) => toJs(x))));
            };
        } else {
            this.is$type = false;
            this.tp$name = obj.constructor.name || "<unkown>";
        }

        if (obj.length !== undefined) {
            this.mp$subscript = this.idx$fn;
            this.sq$length = () => obj.length;
        }
        if (obj.next !== undefined) {
            this.tp$iternext = () => {
                const nxt = obj.next().value;
                return nxt && toPy(nxt);
            };
        }
        if (obj[Symbol.iterator] !== undefined) {
            this.tp$iter = () => {
                return proxy(obj[Symbol.iterator]());
            };
        }
    },
    slots: {
        tp$doc: "skulpt proxy for a js object",
        tp$getattr(pyName) {
            const jsName = pyName.toString();
            const attr = this.js$wrapped[jsName];
            if (typeof attr === "function") {
                const meth = this.$methods[jsName];
                if (meth !== undefined) {
                    return meth;
                }
                const bound = attr.bind(this.js$wrapped);
                const ret = new Sk.builtin.sk_method(
                    {
                        $meth(args) {
                            const ret = bound(...args.map((x) => toJs(x)));
                            if (ret instanceof Promise) {
                                const promise = ret.then((val) => toPy(val));
                                return Sk.misceval.promiseToSuspension(promise);
                            }
                            return toPy(ret);
                        },
                        $flags: { FastCall: true, NoKwargs: true },
                        $name: attr.name,
                    },
                    this
                );
                this.$methods[jsName] = ret;
                return ret;
            }
            if (attr !== undefined) {
                return toPy(attr);
            }
            const dir = this.mk$dir();
            if (dir.has(jsName)) {
                // do we actually have this property?
                return Sk.builtin.none.none$;
            }
            return Sk.generic.getAttr.call(this, pyName);
        },
        tp$setattr(pyName, value) {
            const jsName = pyName.toString();
            this.js$wrapped[jsName] = toJs(value);
        },
        $r() {
            if (this.is$type) {
                return new Sk.builtin.str("<class " + this.tp$name + " (Proxy)>");
            }
            return new Sk.builtin.str("<'" + this.tp$name + "' object (Proxy)>");
        },
        tp$as_sequence_or_mapping: true,
    },
    methods: {
        __dir__: {
            $meth() {
                const dir = this.mk$dir();
                return new Sk.builtin.list(Array.from(dir, (x) => new Sk.builtin.str(x)));
            },
            $flags: { NoArgs: true },
        },
    },
    getsets: {
        __class__: {
            $get() {
                return toPy(this.js$wrapped.constructor);
            },
            $set() {
                throw new Sk.builtin.TypeErrro("not writable");
            },
        },
        __name__: {
            $get() {
                return new Sk.builtin.str(this.tp$name);
            },
        },
        __module__: {
            $get() {
                return this.$module || Sk.builtin.none.none$;
            },
            $set(v) {
                this.$module = v;
            },
        },
    },
    proto: {
        valueOf() {
            return this.js$wrapped;
        },
        mk$dir() {
            if (this.$dir !== null) {
                return this.$dir;
            }
            const dir = this.$dir = new Set();
            // loop over enumerable properties
            for (let prop in this.js$wrapped) {
                if (prop.startsWith("_")) {
                    continue;
                }
                dir.add(prop);
            }
            return this.$dir;
        },
        idx$fn(i) {
            if (this.js$wrapped.length !== undefined) {
                const length = this.js$wrapped.length;
                i = Sk.misceval.asIndexSized(i);
                if (i < 0) {
                    i = i + length;
                }
                if (i < 0 || i >= length) {
                    throw new Sk.builtin.IndexError("out of range");
                }
                return toPy(this.js$wrapped[i]);
            }
            throw Sk.builtin.TypeError(this.tp$name + " proxy does not support indexing");
        },
    },
    flags: {
        sk$acceptable_as_base_class: false,
    },
});
