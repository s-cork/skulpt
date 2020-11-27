/**
 * @namespace Sk.ffi
 *
 */
Sk.ffi = {
    remapToPy: toPy,
    remapToJs: toJs,
    toPy,
    toJs,
    toJSON,

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
 * 
 * could have options like python does
 * options.handleConstants
 * options.handleNumbers
 * options.functionHook
 */
function toPy(obj) {
    if (obj === null || obj === undefined) {
        return Sk.builtin.none.none$;
    }

    if (obj.sk$object) {
        return obj;
    } else if (obj.$isWrapped && obj.unwrap) {
        return obj.unwrap();
    }

    let constructor;
    const type = typeof obj;

    if (obj.length !== undefined) {
        if (type === "string") {
            return new Sk.builtin.str(obj);
        }
        if (Array.isArray(obj)) {
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
            return toPyDict(obj);
        }
        if (constructor === undefined) {
            // the result of Object.create(null)
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

        return proxy(obj, "object");
    }

    if (type === "number") {
        return numberToPy(obj);
    }
    if (type === "boolean") {
        return new Sk.builtin.bool(obj);
    }
    if (type === "bigint") {
        return new Sk.builtin.int_(JSBI.numberIfSafe(obj));
    }
    if (type === "function") {
        return proxy(obj, "function");
    }

    return proxy(obj, type);
}

/**
 * 
 * @param {*} obj 
 * @param {*} options 
 * 
 * This will handle any object and conver it to javascript
 * 
 * simple objects - str, int, float, bool, tuple, list, set, dict, bytes
 * are converted as you might expect
 * 
 * str - string
 * int - number or bigint (depending on the size)
 * float - number
 * bool - boolean
 * tuple/list - array
 * set - Set
 * dict - object literal
 * bytes - Uint8Array
 * 
 * dict - all keys are allowed - this may cause unexpected bevaiour for non str keys
 * {None: 'a', (1,): 'b', True: 'c', A(): 'd'} => {null: 'a', '1,': 'b', true: 'c', "<'A' object>": 'd'}
 * and on conversion back will convert all the keys to str objects
 * 
 * All js objects passed to this function will be returned
 * 
 * All other python objects are wrapped
 * wrapped objects have a truthy $isWrapped property and an unwrap method
 * (used to convert back toPy)
 * 
 * can override behaviours with hooks
 * 
 * options.dictHook - override the conversion to dict
 * options.setHook - override the conversion to set
 * options.wrapHook - override the default wrap behavior
 * options.objectHook - override the behaviour of a javascript object (of type object) that is about to be returned
 * 
 */
function toJs(obj, options) {
    if (obj === undefined || obj === null) {
        return obj;
    }
    const val = obj.valueOf();
    // for str/bool/int/float/tuple/list this returns the obvious: this.v;
    if (val === null) {
        return val;
    }
    if (typeof val !== "object") {
        // number, string, boolean, bigint, function
        return val;
    }
    if (Array.isArray(val)) {
        return val.map((x) => toJs(x, options));
    }
    options = options || {};
    if (val.sk$object) {
        if (obj instanceof Sk.builtin.dict) {
            if (options.dictHook) {
                return options.dictHook(obj);
            }
            return toJsHashMap(obj, options);
        }
        if (obj instanceof Sk.builtin.set) {
            if (options.setHook) {
                return options.setHook(obj);
            }
            return new Set(toJsArray(obj, options));
        }
        if (options.wrapHook !== undefined) {
            return options.wrapHook(obj);
        }
        if (obj.tp$call !== undefined) {
            const tp_name = obj.tp$name;
            if (tp_name === "function" || tp_name === "method" || tp_name === "builtin_function_or_method") {
                return WrappedFunction(obj);
            }
        }
        return new WrappedObject(obj);
    }

    if (options.objectHook) {
        // pass this val to the objectHook - might be a Uint8Array or some other js object that was proxied
        return options.objectHook(val);
    }
    // we don't have a python object so send the val
    return val;
}


/**
 * 
 * @param {*} obj 
 * @param {*} options 
 * 
 * toJSON will return a jsonable object
 * handles simple python objects - None, str, int, float, bool, list, tuple, dict
 * 
 * keys of dictionaries are only allowed to be - None, str, int, float, bool
 * 
 * to hooks available in options
 * options.dictHook - override the default dict to object literal bevaiour
 * options.unhandledHook - by default this function throws an error in the unhandled case
 * 
 */
function toJSON(obj, options) {
    if (obj === undefined || obj === null) {
        return obj;
    }
    const val = obj.valueOf();
    if (val === null) {
        return val;
    }
    const type = typeof val;
    if (type === "number" || type === "string" || type === "boolean") {
        return val;
    }
    if (Array.isArray(val)) {
        return val.map((x) => toJSON(x, options));
    }
    options = options || {};
    if (obj instanceof Sk.builtin.dict) {
        if (options.dictHook) {
            return options.dictHook(obj);
        } else {
            const ret = {};
            obj.$items().forEach(([k, v]) => {
                k = k.valueOf();
                const type = typeof k;
                if (type === "string" || type === "number" || type === "boolean" || k === null) {
                    ret[k] = toJSON(v, options);
                } else {
                    throw TypeError("unhandled key in conversion from dictionary - can only handle str, int, float, None, bool");
                }
            });
            return ret;
        }
    }
    if (options.unhandledHook) {
        return options.unhandledHook(obj);
    }
    throw new TypeError("unhandled remap " + Sk.abstr.typeName(obj));
}

function WrappedFunction(obj) {
    const wrapped = (...args) => Sk.misceval.chain(obj.tp$call(args.map((x) => toPy(x))), (res) => toJs(res));
    wrapped.v = obj;
    wrapped.unwrap = () => obj;
    wrapped.$isWrapped = true;
    return wrapped;
}

class WrappedObject {
    constructor(obj) {
        this.v = obj;
        this.$isWrapped = true;
    }
    unwrap() {
        return this.v;
    }
}

function isTrue(obj) {
    // basically the logic for Sk.misceval.isTrue - here for convenience
    return obj != null && obj.nb$bool ? obj.nb$bool() : obj.sq$length ? obj.sq$length() !== 0 : Boolean(obj);
}

function toJsNumber(obj) {
    return Number(obj);
}
function toJsString(obj) {
    return String(obj);
}

function toJsArray(obj, options) {
    return Array.from(obj, (x) => toJs(x, options));
}

function toJsHashMap(dict, options) {
    const obj = {};
    dict.$items().forEach(([key, val]) => {
        // if non str keys are sent to this function it may behave unexpectedly (but it won't fail)
        obj[key.valueOf()] = toJs(val, options);
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

/**
 * 
 * @param {*} obj 
 * 
 */
function toPyDict(obj) {
    const ret = new Sk.builtin.dict();
    Object.entries(obj).forEach(([key, val]) => {
        ret.mp$ass_subscript(new Sk.builtin.str(key), toPy(val));
    });
    return ret;
}

// any flag that is truthy will skip the toPy call
// use proxy if you want to proxy an arbirtrary js object
function proxy(obj, flag) {
    if (obj === null || obj === undefined) {
        return Sk.builtin.none.none$;
    }
    if (!flag) {
        // we were called without a flag so unless the constructor is Object then do a remap
        if (obj.constructor !== Object) {
            return toPy(obj);
        }
        flag = flag || "object";
    }
    const cached = _proxied.get(obj);
    if (cached) {
        if (flag.bound === cached.$bound) {
            return cached;
        }
    }    
    const ret = new JsProxy(obj, flag);
    _proxied.set(obj, ret);
    return ret;
}

// cache the proxied objects in a weakmap
const _proxied = new WeakMap();

const is_constructor = /^class|[^a-zA-Z_$]this[^a-zA-Z_$]/g;

const JsProxy = Sk.abstr.buildNativeClass("Proxy", {
    constructor: function JsProxy(obj, flag) {
        if (obj === undefined) {
            throw new Sk.builtin.TypeError("Proxy cannot be called from python");
        }
        this.js$wrapped = obj;
        this.$module = null;
        this.$methods = Object.create(null);
        this.in$repr = false;

        // determine the type and name of this proxy
        if (obj.call === Function.prototype.call) {
            this.is$type =
                obj.prototype && obj.prototype.constructor && Function.prototype.toString.call(obj).match(is_constructor) !== null;
            this.is$callable = true;
            this.$bound = (flag || {}).bound;
            this.tp$name = obj.name || "<native JS>";
        } else {
            this.is$type = false;
            this.is$callable = false;
            this.tp$name = obj.constructor.name || "<native JS>";
            if (this.tp$name === "Object") {
                this.tp$name = "objectproxy";
            }
        }
        // make slot functions lazy
        Object.defineProperties(this, this.memoized$slots);
    },
    slots: {
        tp$doc: "proxy for a javascript object",
        tp$getattr(pyName) {
            const jsName = pyName.toString();
            const attr = this.js$wrapped[jsName];
            if (typeof attr === "function") {
                const meth = this.$methods[jsName];
                if (meth !== undefined) {
                    return meth;
                }
                const ret = proxy(attr, {bound: this.js$wrapped});
                this.$methods[jsName] = ret;
                return ret;
            }
            if (attr !== undefined) {
                return proxy(attr);
            }
            if (jsName in this.js$wrapped) {
                // do we actually have this property?
                return Sk.builtin.none.none$;
            }
            return Sk.generic.getAttr.call(this, pyName);
        },
        tp$setattr(pyName, value) {
            const jsName = pyName.toString();
            if (value === undefined) {
                delete this.js$wrapped[jsName];
            } else {
                this.js$wrapped[jsName] = toJs(value);
            }
        },
        $r() {
            if (this.in$repr) {
                return new Sk.builtin.str("{...}");
            } else if (this.is$type && (this.$bound === undefined || this.$bound.constructor === Object)) {
                return new Sk.builtin.str("<class " + this.tp$name + " (proxy)>");
            } else if (this.$bound) {
                return new Sk.builtin.str("<bound method " + this.tp$name + " (proxy)>");
            } else if (this.is$callable) {
                return new Sk.builtin.str("<function " + this.tp$name + " (proxy)>");
            } else if (this.js$wrapped.constructor === Object) {
                this.in$repr = true;
                const ret = new Sk.builtin.str(
                    "objectproxy({" +
                        Object.entries(this.js$wrapped)
                            .map(([key, val]) => "'" + key + "': " + Sk.misceval.objectRepr(proxy(val)))
                            .join(", ") +
                        "})"
                );
                this.in$repr = false;
                return ret;
            }
            return new Sk.builtin.str("<'" + this.tp$name + "' object (proxy)>");
        },
        tp$as_sequence_or_mapping: true,
        mp$subscript(pyItem) {
            // todo should we account for -1
            return this.tp$getattr(pyItem);
        },
        mp$ass_subscript(pyItem, value) {
            return this.tp$setattr(pyItem, value);
        },
    },
    methods: {
        __dir__: {
            $meth() {
                const object_dir = Sk.misceval.callsimArray(Sk.builtin.object.prototype.__dir__, [this]).valueOf();
                return new Sk.builtin.list(object_dir.concat(Array.from(this.$dir, (x) => new Sk.builtin.str(x))));
            },
            $flags: { NoArgs: true },
        },
        __new__: {
            // this is effectively a static method
            $meth(js_proxy, ...args) {
                if (!js_proxy instanceof JsProxy) {
                    throw new Sk.builtin.TypeError("expected a proxy object as the first argument not " + Sk.abstr.typeName(js_proxy));
                }
                const js_wrapped = js_proxy.js$wrapped;
                if (!(js_wrapped.prototype && js_wrapped.prototype.constructor)) {
                    throw new Sk.builtin.TypeError("'" + js_proxy.tp$name + "' is not a constructor");
                }
                return proxy(new js_wrapped(...args.map((x) => toJs(x))));
            },
            $flags: { MinArgs: 1 },
        },
        __call__: {
            $meth(args) {
                if (this.js$wrapped.call === undefined) {
                    throw new Sk.builtin.TypeError("'" + this.tp$name + "' object is not callable");
                }
                return Sk.misceval.chain(
                    this.js$wrapped.call(this.$bound, ...args.map((x) => toJs(x))),
                    (res) => (res instanceof Promise ? Sk.misceval.promiseToSuspension(res) : res),
                    (res) => proxy(res)
                );
            },
            $flags: { FastCall: true, NoKwargs: true },
        },
        keys: {
            $meth() {
                return new Sk.builtin.list(Array.from(this.$dir, (x) => new Sk.builtin.str(x)));
            },
            $flags: { NoArgs: true },
        },
    },
    getsets: {
        __class__: {
            $get() {
                return proxy(this.js$wrapped.constructor);
            },
            $set() {
                throw new Sk.builtin.TypeError("not writable");
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
        // only get these if we need them
        memoized$slots: {
            $dir: {
                get() {
                    const dir = new Set();
                    // loop over enumerable properties
                    for (let prop in this.js$wrapped) {
                        dir.add(prop);
                    }
                    return dir;
                },
            },
            tp$iter: {
                get() {
                    if (this.js$wrapped[Symbol.iterator] !== undefined) {
                        delete this.tp$iter;
                        return (this.tp$iter = () => {
                            return proxy(this.js$wrapped[Symbol.iterator](), "object");
                        });
                    }
                    delete this.tp$iter;
                },
            },
            tp$iternext: {
                get() {
                    if (this.js$wrapped.next !== undefined) {
                        delete this.tp$iternext;
                        return (this.tp$iternext = () => {
                            const nxt = this.js$wrapped.next().value;
                            return nxt && proxy(nxt);
                        });
                    }
                    delete this.tp$iternext;
                },
            },
            sq$length: {
                get() {
                    if (this.js$wrapped.length !== undefined) {
                        delete this.sq$length;
                        return (this.sq$length = () => this.js$wrapped.length);
                    }
                    delete this.sq$length;
                },
            },
            tp$call: {
                get() {
                    if (this.is$callable) {
                        delete this.tp$call;
                        return (this.tp$call = (args, kwargs) => {
                            Sk.abstr.checkNoKwargs(this.tp$name, kwargs);
                            args = args.map((x) => toJs(x));
                            const bound = this.$bound;
                            if (this.is$type && (bound === undefined || bound === window || bound.constructor === Object)) {
                                return proxy(new this.js$wrapped(...args));
                            }
                            return Sk.misceval.chain(
                                this.js$wrapped.call(this.$bound, ...args),
                                (res) => (res instanceof Promise ? Sk.misceval.promiseToSuspension(res) : res),
                                (res) => proxy(res)
                            );
                        });
                    }
                    delete this.tp$call;
                },
            },
        },
    },
    flags: {
        sk$acceptable_as_base_class: false,
    },
});

// work in progress functions
