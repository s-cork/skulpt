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
 * hooks.funcHook
 * hooks.dictHook
 */
function toPy(obj, hooks) {
    if (obj === null || obj === undefined) {
        return Sk.builtin.none.none$;
    }

    if (obj.sk$object) {
        return obj;
    } else if (obj.$isPyWrapped && obj.unwrap) {
        // wrap protocol
        return obj.unwrap();
    }

    const type = typeof obj;
    hooks = hooks || {};

    if (type === "string") {
        return new Sk.builtin.str(obj);
    } else if (type === "number") {
        return numberToPy(obj);
    } else if (type === "boolean") {
        return new Sk.builtin.bool(obj);
    } else if (type === "function") {
        // should the defualt behaviour be to proxy or new Sk.builtin.func?
        // old remap used to do an Sk.builtin.func
        return hooks.funcHook ? hooks.funcHook(obj) : proxy(obj);
    } else if (JSBI.__isBigInt(obj)) {
        // might be type === "bigint" if bigint native or an array like object for older browsers
        return new Sk.builtin.int_(JSBI.numberIfSafe(obj));
    } else if (Array.isArray(obj)) {
        return new Sk.builtin.list(obj.map((x) => toPy(x, hooks)));
    } else if (type === "object") {
        const constructor = obj.constructor;
        if (constructor === Object || constructor === undefined /* Object.create(null) */) {
            return hooks.dictHook ? hooks.dictHook(obj) : toPyDict(obj, hooks);
        } else if (constructor === Uint8Array) {
            return new Sk.builtin.bytes(obj);
        } else if (constructor === Set) {
            return toPySet(obj, hooks);
        } else if (constructor === Map) {
            const ret = new Sk.builtin.dict();
            obj.forEach((val, key) => {
                ret.mp$ass_subscript(toPy(key, hooks), toPy(val, hooks));
            });
            return ret;
        } else if (constructor === Sk.misceval.Suspension) {
            return obj;
        } else {
            // all objects get proxied - previously they were converted to dictionaries
            // can override this behaviour with a proxy hook
            return hooks.proxyHook ? hooks.proxyHook(obj) : proxy(obj);
        }
    } else if (hooks.unhandledHook) {
        // there aren't very many types left
        // could be a symbol (unlikely)
        return hooks.unhandledHook(obj);
    }
    Sk.asserts.fail("unhandled remap case of type " + type);
}

/**
 *
 * @param {*} obj
 * @param {*} hooks
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
 * wrapped objects have a truthy $isPyWrapped property and an unwrap method
 * (used to convert back toPy)
 *
 * can override behaviours with hooks
 *
 * hooks.dictHook(pydict) - override the default behaviour from dict to object literal
 * hooks.setHook(pyset) - override the default behaviour from set to Set
 * hooks.unhandledHook(pyobj) - python objects that arent simple (str, None, bool, list, set, tuple, int, float) will return undefined - override this behaveiour here
 *
 * hooks.arrayHook(arr, pyobj) - override the array behaviour resulting from a tuple or list (get the internal array of python objects as the first argument)
 * hooks.numberHook(num, pyobj) - override the number return for float, int
 * hooks.bigintHoot(bigint, pyobj) - override the return of a bigint for large python integers (this might be polyfilled in older browsers)
 * hooks.objectHook(obj, pyobj) - override the behaviour of a javascript object (of type object) that is about to be returned
 * hooks.funcHook(func, pyobj) - override the behvaiour of javascript function that is about to be returned
 */
function toJs(obj, hooks) {
    if (obj === undefined || obj === null) {
        return obj;
    }
    const val = obj.valueOf();
    // for str/bool/int/float/tuple/list this returns the obvious: this.v;
    // can override valueOf for skulpt objects that you want to send back and forth between python/js
    if (val === null) {
        return val;
    }

    const type = typeof val;
    hooks = hooks || {};

    if (type === "string" || type === "boolean") {
        return val;
    } else if (type === "number") {
        return hooks.numberHook ? hooks.numberHook(val, obj) : val;
        // pass the number and the original obj (float or int (or number))
    } else if (JSBI.__isBigInt(val)) {
        // either it's a native bigint or polyfilled as an array like object
        // pass the bigint (or polyfilled bigint) and the original obj (int) to the hook function
        // or return the the bigint
        return hooks.bigintHook ? hooks.bigintHook(val, obj) : val;
    } else if (Array.isArray(val)) {
        return hooks.arrayHook ? hooks.arrayHook(val, obj) : val.map((x) => toJs(x, hooks));
        // pass the array and the original obj (tuple or list (or Array))
    } else if (val.sk$object) {
        // python objects are either of type object or function
        // so check if they're python objects now
        // these python object didn't override valueOf()
        if (obj instanceof Sk.builtin.dict) {
            return hooks.dictHook ? hooks.dictHook(obj) : toJsHashMap(obj, hooks);
        } else if (obj instanceof Sk.builtin.set) {
            return hooks.setHook ? hooks.setHook(obj) : new Set(toJsArray(obj, hooks));
        } else {
            // a wrap protocol would set $isPyWrapped = true, and an unwrap function to be called in toPy
            return hooks.unhandledHook ? hooks.unhandledHook(obj) : undefined;
        }
        // fall through to unhandled hook - or return undefined
    } else if (type === "object") {
        return hooks.objectHook ? hooks.objectHook(val, obj) : val;
        // might be a Uint8Array or some other js object that was proxied
        // pass this val, obj to the objectHook if defined
        // if no hook function just return the val which is not a python object
    } else if (type === "function") {
        // likely the result of a proxied function
        // if no hook function just return the val which is not a python object
        return hooks.funcHook ? hooks.funcHook(val, obj) : val;
    }

    // we really shouldn't get here - what's left - type symbol?
    Sk.asserts.fail("unhandled type " + type);
}

/**
 *
 * @param {*} obj
 * @param {*} hooks
 *
 * toJSON will return a jsonable object
 * expects only python objects
 * handles simple python objects - None, str, int, float, bool, list, tuple, dict
 *
 * keys of dictionaries are only allowed to be - None, str, int, float, bool
 *
 * the following hooks are available
 * 
 * hooks.dictHook - override the default dict to object literal bevaiour
 * hooks.unhandledHook(obj) - by default this function throws an error in the unhandled case
 * hooks.bigintHook(bigint, pyObj) - by default bigints will fail - can also catch this case in unhandledHook
 * hooks.numberhook(num, pyObj) - can hoandle constans like NaN or difference between ints and floats
 * hooks.arrayHook(arr, pyObj)
 */
function toJSON(obj, hooks) {
    hooks = hooks || {};
    const fail = (obj) => {
        throw new TypeError("unhandled remap " + Sk.abstr.typeName(obj));
    };
    hooks.unhandledHook = hooks.unhandledHook || fail;
    hooks.funcHook = hooks.objectHook = (val, obj) => hooks.unhandledHook(obj);
    hooks.bigintHook = hooks.bigintHook || hooks.unhandledHook;
    if (!hooks.dictHook) {
        hooks.dictHook = (d) => {
            const ret = {};
            d.$items().forEach(([k, v]) => {
                k = k.valueOf();
                const type = typeof k;
                if (type === "string" || type === "number" || type === "boolean" || k === null) {
                    ret[k] = toJs(v, hooks);
                } else {
                    throw TypeError("unhandled key in conversion from dictionary - can only handle str, int, float, None, bool");
                }
            });
            return ret;
        };
    }
    return toJs(obj, hooks);
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

function toJsArray(obj, hooks) {
    return Array.from(obj, (x) => toJs(x, hooks));
}

function toJsHashMap(dict, hooks) {
    const obj = {};
    dict.$items().forEach(([key, val]) => {
        // if non str keys are sent to this function it may behave unexpectedly (but it won't fail)
        obj[key.valueOf()] = toJs(val, hooks);
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
    if (JSBI.__isBigInt(obj)) {
        // either type is bigint or using the bigint polyfill
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

function toPyList(obj, hooks) {
    return new Sk.builtin.list(Array.from(obj, (x) => toPy(x, hooks)));
}

function toPySet(obj, hooks) {
    return new Sk.builtin.set(Array.from(obj, (x) => toPy(x, hooks)));
}

function toPyTuple(obj, hooks) {
    return new Sk.builtin.tuple(Array.from(obj, (x) => toPy(x, hooks)));
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

function toPyDict(obj, hooks) {
    const ret = new Sk.builtin.dict();
    Object.entries(obj).forEach(([key, val]) => {
        ret.mp$ass_subscript(new Sk.builtin.str(key), toPy(val, hooks));
    });
    return ret;
}

// cache the proxied objects in a weakmap
const _proxied = new WeakMap();

// use proxy if you want to proxy an arbirtrary js object
// the only flags currently used is {bound: some_js_object}
function proxy(obj, flags) {
    if (obj === null || obj === undefined) {
        return Sk.builtin.none.none$;
    }
    const type = typeof obj;
    if (type !== "object" && type !== "function") {
        return toPy(obj); // don't proxy strings, numbers, bigints
    }
    flags = flags || {};
    const cached = _proxied.get(obj);
    if (cached) {
        if (flags.bound === cached.$bound) {
            return cached;
        }
        if (!flags.name) {
            flags.name = cached.$name;
        }
    }
    const ret = new JsProxy(obj, flags);
    _proxied.set(obj, ret);
    return ret;
}

const is_constructor = /^class|[^a-zA-Z_$]this[^a-zA-Z_$]/g;

const pyHooks = { dictHook: (obj) => proxy(obj) };
const jsHooks = {
    unhandledHook: (obj) => {
        if (obj.tp$call) {
            const wrapped = (...args) => Sk.misceval.chain(obj.tp$call(args.map((x) => toPy(x, pyHooks))), (res) => toJs(res, jsHooks));
            wrapped.v = obj;
            wrapped.unwrap = () => obj;
            wrapped.$isPyWrapped = true;
            return wrapped;
        }
        return { v: obj, $isPyWrapped: true, unwrap: () => obj };
    },
};
// we customize the dictHook and the funcHook here - we want to keep object literals as proxied objects when remapping to Py
// and we want funcs to be proxied

const JsProxy = Sk.abstr.buildNativeClass("Proxy", {
    constructor: function JsProxy(obj, flags) {
        if (obj === undefined) {
            throw new Sk.builtin.TypeError("Proxy cannot be called from python");
        }
        this.js$wrapped = obj;
        this.$module = null;
        this.$methods = Object.create(null);
        this.in$repr = false;

        flags = flags || {};

        // determine the type and name of this proxy
        if (typeof obj === "function") {
            const bound = (this.$bound = flags.bound);
            this.is$type =
                obj.prototype &&
                obj.prototype.constructor &&
                (bound === undefined || bound === window || bound.constructor === Object) &&
                Function.prototype.toString.call(obj).match(is_constructor) !== null;
            this.is$callable = true;
            this.$name = flags.name || obj.name || "<native JS>";
            if (this.$name.length <= 2) {
                this.$name = "<(" + this.$name + ") native JS>"; // better this than a single letter minified name
            }
            this.tp$name = this.is$type ? "proxyclass" : this.$bound ? "proxymethod" : "proxyfunction";
        } else {
            this.is$type = false;
            this.is$callable = false;
            this.tp$name = flags.name || (obj.constructor && obj.constructor.name) || "proxyobject";
            if (this.tp$name === "Object") {
                this.tp$name = "proxyobject";
            } else if (this.tp$name.length <= 2) {
                // we might have a better name in the cache so check there...
                this.tp$name = proxy(obj.constructor).$name;
            }
            this.$name = this.tp$name;
        }
        // make slot functions lazy
        Object.defineProperties(this, this.memoized$slots);
    },
    slots: {
        tp$doc: "proxy for a javascript object",
        tp$hash: Sk.builtin.none.none$, // unhashable
        tp$getattr(pyName) {
            return this.$lookup(pyName) || Sk.generic.getAttr.call(this, pyName);
        },
        tp$setattr(pyName, value) {
            const jsName = pyName.toString();
            if (value === undefined) {
                delete this.js$wrapped[jsName];
            } else {
                this.js$wrapped[jsName] = toJs(value, jsHooks);
            }
        },
        $r() {
            if (this.is$callable) {
                if (this.is$type || !this.$bound) {
                    return new Sk.builtin.str("<" + this.tp$name + " '" + this.$name + "'>");
                }
                const boundRepr = Sk.misceval.objectRepr(proxy(this.$bound));
                return new Sk.builtin.str("<bound " + this.tp$name + " '" + this.$name + "' of " + boundRepr + ">");
            } else if (this.js$wrapped.constructor === Object) {
                if (this.in$repr) {
                    return new Sk.builtin.str("{...}");
                }
                this.in$repr = true;
                const ret = new Sk.builtin.str(
                    "proxyobject({" +
                        Object.entries(this.js$wrapped)
                            .map(([key, val]) => "'" + key + "': " + Sk.misceval.objectRepr(toPy(val, pyHooks)))
                            .join(", ") +
                        "})"
                );
                this.in$repr = false;
                return ret;
            }
            const object = this.tp$name === "proxyobject" ? "object" : "proxyobject";
            return new Sk.builtin.str("<" + this.tp$name + " " + object + ">");
        },
        tp$as_sequence_or_mapping: true,
        mp$subscript(pyItem) {
            // todo should we account for -1 i.e. array like subscripts
            const ret = this.$lookup(pyItem);
            if (ret === undefined) {
                throw new Sk.builtin.LookupError(pyItem);
            }
            return ret;
        },
        mp$ass_subscript(pyItem, value) {
            return this.tp$setattr(pyItem, value);
        },
        sq$contains(item) {
            return toJs(item) in this.js$wrapped;
        },
        ob$eq(other) {
            return this.js$wrapped === other.js$wrapped;
        },
        ob$ne(other) {
            return this.js$wrapped !== other.js$wrapped;
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
                return js_proxy.$new(args);
            },
            $flags: { MinArgs: 1 },
        },
        __call__: {
            $meth(args, kwargs) {
                if (this.js$wrapped.call === undefined) {
                    throw new Sk.builtin.TypeError("'" + this.tp$name + "' object is not callable");
                }
                return this.$call(args, kwargs);
            },
            $flags: { FastCall: true },
        },
        keys: {
            $meth() {
                return new Sk.builtin.list(Object.keys(this.js$wrapped).map((x) => new Sk.builtin.str(x)));
            },
            $flags: { NoArgs: true },
        },
        get: {
            $meth(pyName, _default) {
                return this.$lookup(pyName) || _default || Sk.builtin.none.none$;
            },
            $flags: { MinArgs: 1, MaxArgs: 2 },
        },
    },
    getsets: {
        __class__: {
            $get() {
                return toPy(this.js$wrapped.constructor, pyHooks);
            },
            $set() {
                throw new Sk.builtin.TypeError("not writable");
            },
        },
        __name__: {
            $get() {
                return new Sk.builtin.str(this.$name);
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
        $new(args, kwargs) {
            Sk.abstr.checkNoKwargs("__new__", kwargs);
            return toPy(new this.js$wrapped(...args.map((x) => toJs(x, jsHooks))), {
                dictHook: (obj) => proxy(obj),
                proxyHook: (obj) => proxy(obj, { name: this.$name }),
            });
        },
        $call(args, kwargs) {
            Sk.abstr.checkNoKwargs("__call__", kwargs);
            return Sk.misceval.chain(
                this.js$wrapped.apply(
                    this.$bound,
                    args.map((x) => toJs(x, jsHooks))
                ),
                (res) => (res instanceof Promise ? Sk.misceval.promiseToSuspension(res) : res),
                (res) => toPy(res, pyHooks)
            );
        },
        $lookup(pyName) {
            const jsName = pyName.toString();
            const attr = this.js$wrapped[jsName];
            if (attr !== undefined) {
                // here we override the funcHook to pass the bound object
                return toPy(attr, { dictHook: (obj) => proxy(obj), funcHook: (obj) => proxy(obj, { bound: this.js$wrapped, name: jsName }) });
            } else if (jsName in this.js$wrapped) {
                // do we actually have this property?
                return Sk.builtin.none.none$;
            }
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
                    delete this.tp$iter;
                    if (this.js$wrapped[Symbol.iterator] !== undefined) {
                        return (this.tp$iter = () => {
                            return proxy(this.js$wrapped[Symbol.iterator]());
                        });
                    }
                },
            },
            tp$iternext: {
                get() {
                    delete this.tp$iternext;
                    if (this.js$wrapped.next !== undefined) {
                        return (this.tp$iternext = () => {
                            const nxt = this.js$wrapped.next().value;
                            return nxt && toPy(nxt, pyHooks);
                        });
                    }
                },
            },
            sq$length: {
                get() {
                    delete this.sq$length;
                    if (!this.is$callable && this.js$wrapped.length !== undefined) {
                        return (this.sq$length = () => this.js$wrapped.length);
                    }
                },
            },
            tp$call: {
                get() {
                    delete this.tp$call;
                    if (this.is$callable) {
                        return (this.tp$call = this.is$type ? this.$new : this.$call);
                    }
                },
            },
        },
    },
    flags: {
        sk$acceptable_as_base_class: false,
    },
});
