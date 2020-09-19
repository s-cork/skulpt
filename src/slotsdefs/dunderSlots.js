import {
    checkString,
    checkNone,
    checkBool,
    checkFloat,
    checkInt,
    checkNoArgs,
    checkOneArg,
    checkNoKwargs,
    checkArgsLen,
    pyNone,
    pyBool,
    pyInt,
    pyStr,
    pyNotImplemented,
    pyExc,
    pyWrapperDescr,
    pyCall,
    pyCallOrSuspend,
    chainOrSuspend,
    tryCatchOrSuspend,
    retryOptionalSuspensionOrThrow,
    asIndexOrThrow,
    typeName,
    objectIsTrue,
} from "../internal";


/**
 * @description
 * Wrappers and slot functions
 *
 * A wrapper function wrapper a slot defined on the prototype of a builtin type object
 * typically a a slot wrapper will be called with a self argument and args and kwargs
 *
 * self becomes this in when the slot wrapper is called
 * the slot wrapper_descriptor object takes care of checking that self is an instance of the type object
 * @param {*} self
 * @param {Array} args
 * @param {Array=} kwargs
 * @ignore
 */
export function wrapperCallNoArgs(self, args, kwargs) {
    // this = the wrapped function
    checkNoArgs(this.$name, args, kwargs);
    const res = this.call(self);
    if (res === undefined) {
        return pyNone;
    }
    return res;
}
/**
 * @param {*} self
 * @param {Array} args
 * @param {Array=} kwargs
 * @ignore
 */
function wrapperFastCall(self, args, kwargs) {
    // this = the wrapped function
    const res = this.call(self, args, kwargs);
    if (res === undefined) {
        return pyNone;
    }
    return res;
}

/**
 * @param {*} self
 * @param {Array} args
 * @param {Array=} kwargs
 * @ignore
 */
export function wrapperCallOneArg(self, args, kwargs) {
    // this = the wrapped function
    checkOneArg(this.$name, args, kwargs);
    const res = this.call(self, args[0]);
    if (res === undefined) {
        return pyNone;
    }
    return res;
}

/**
 * @param {*} self
 * @param {!Array} args
 * @param {Array=} kwargs
 * @ignore
 */
function wrapperCallTernary(self, args, kwargs) {
    // this = the wrapped function
    // only used for __pow__
    checkNoKwargs(this.$name, kwargs);
    checkArgsLen(this.$name, args, 1, 2);
    const res = this.call(self, ...args);
    if (res === undefined) {
        return pyNone;
    }
    return res;
}
/**
 * @param {*} self
 * @param {Array} args
 * @param {Array=} kwargs
 * @ignore
 */
function wrapperSet(self, args, kwargs) {
    checkNoKwargs(this.$name, kwargs);
    checkArgsLen(this.$name, args, 2, 2);
    this.call(self, args[0], args[1]);
    return pyNone;
}

/**
 * @param {*} self
 * @param {Array} args
 * @param {Array=} kwargs
 * @ignore
 */
function wrapperRichCompare(self, args, kwargs) {
    const res = wrapperCallOneArg.call(this, self, args, kwargs);
    if (res === pyNotImplemented) {
        return res;
    }
    return new pyBool(res);
}

function wrapperCallBack(wrapper, callback) {
    return function (self, args, kwargs) {
        const res = wrapper.call(this, self, args, kwargs);
        return callback(res);
    }
}

/**
 * @description
 * Slot functions are wrappers around an pyFunc
 * if skulpt calls tp$init on a type object the slotFunc will call the pyFunc
 *
 * with most slots we take the approach that we know which dunderFunc will be called
 * However some slots currently double up
 * e.g. mp$ass_subscript is called by both __setitem__ and __delitem__
 * for these dual slots we need to do a typelookup
 *
 * __getattr__ is another complicated case and the algorithm largely follows Cpython's algorithm
 * @ignore
 */
function slotFuncNoArgs(dunderFunc) {
    return function () {
        const func = dunderFunc.tp$descr_get ? dunderFunc.tp$descr_get(this) : dunderFunc;
        return pyCall(func, []);
    };
}

/**
 * @param {string} dunderName
 * @param {Function} checkFunc
 * @param {string} checkMsg
 * @param {Function=} f
 * @ignore
 */
export function slotFuncNoArgsWithCheck(dunderName, checkFunc, checkMsg, f) {
    return function (dunderFunc) {
        return function () {
            const func = dunderFunc.tp$descr_get ? dunderFunc.tp$descr_get(this) : dunderFunc;
            let res = pyCall(func, []);
            if (!checkFunc(res)) {
                throw new pyExc.TypeError(dunderName + " should return " + checkMsg + " (returned " + typeName(res) + ")");
            }
            // f is might be a function that changes the result to a js object like for nb$bool which returns a Boolean
            if (f !== undefined) {
                return f(res);
            }
            return res;
        };
    };
}

export function slotFuncOneArg(dunderFunc) {
    return function (value) {
        const func = dunderFunc.tp$descr_get ? dunderFunc.tp$descr_get(this) : dunderFunc;
        return pyCall(func, [value]);
    };
}

function slotFuncGetAttribute(pyName, canSuspend) {
    let func = this.ob$type.$typeLookup(pyStr.$getattribute);
    let res;
    if (func instanceof pyWrapperDescr) {
        return func.d$wrapped.call(this, pyName, canSuspend);
    }
    if (func.tp$descr_get) {
        func = func.tp$descr_get(this);
    }
    if (canSuspend) {
        res = pyCallOrSuspend(func, [pyName]);
    } else {
        res = pyCall(func, [pyName]);
    }
    return res;
}

function slotFuncFastCall(dunderFunc) {
    return function (args, kwargs) {
        const func = dunderFunc.tp$descr_get ? dunderFunc.tp$descr_get(this) : dunderFunc;
        return pyCallOrSuspend(func, args, kwargs);
    };
}

/**
 * this is currently a bit of a hack
 * in attempting to maintain dual slots like mp$ass_subscript for assigning and deleting
 * this function has to do a type lookup... since it doesn't know in advance if it is being asked to set or delete
 * @ignore
 */
function slotFuncSetDelete(set_name, del_name, error_msg) {
    return function (dunderFunc) {
        return function (pyObject, value, canSuspend) {
            let res, dunderName;
            if (value === undefined) {
                dunderName = del_name;
                error_msg = null;
            } else {
                dunderName = set_name;
            }
            // do a type lookup and a wrapped function directly
            let func = this.ob$type.$typeLookup(new pyStr(dunderName));
            if (func instanceof pyWrapperDescr) {
                return func.d$wrapped.call(this, pyObject, value);
            }
            if (func.tp$descr_get) {
                func = func.tp$descr_get(this);
            }
            const call_version = canSuspend ? pyCallOrSuspend : pyCall;
            if (func !== undefined) {
                res = value === undefined ? call_version(func, [pyObject]) : call_version(func, [pyObject, value]);
            } else if (error_msg) {
                throw new pyExc.TypeError("'" + typeName(this) + "' object " + error_msg);
            } else {
                throw new pyExc.AttributeError(dunderName);
            }
            return res;
        };
    };
}

/**
 * @namespace
 *
 * @description
 * If you want to build a skulpt native class you need to understand slots
 * Each dunder method in python is matched to a slot in skulpt {@link dunderToSkulpt} which is closely aligned to a Cpython slot
 *
 * Plenty examples exist in {@link  Sk.builtin}
 *
 * If a user builds a `nativeClass` using {@link buildNativeClass } they define slots as javascript function
 * Dunder Methods will be created as `slot_wrappers`
 *
 * If a user defines a class in Python or using {@link buildClass}
 * Dunder Functions should be defined and slot funcs will be added
 *
 * Below is information about each slot function, should you decide to build a native class
 *
 * For mappings of slots to dunders see source code for {@link dunderToSkulpt} or [subSlots]{@link dunderSlots.subSlots}
 *
 */
export const dunderSlots = Object.create(null);

/**
 *
 * @memberof dunderSlots
 * @member tp$doc
 * @implements __doc__
 * @suppress {checkTypes}
 * @type {string}
 */

/**
 * @memberof dunderSlots
 * @method tp$init
 * @implements __init__
 * @suppress {checkTypes}
 * @param {Array} args
 * @param {Array=} kwargs
 * @returns {pyNone}
 */
dunderSlots.__init__ = {
    $name: "__init__",
    $slot_name: "tp$init",
    $slot_func: function (dunderFunc) {
        return function tp$init(args, kwargs) {
            const func = dunderFunc.tp$descr_get ? dunderFunc.tp$descr_get(this) : dunderFunc;
            let ret = pyCallOrSuspend(func, args, kwargs);
            return chainOrSuspend(ret, (r) => {
                if (!checkNone(r) && r !== undefined) {
                    throw new pyExc.TypeError("__init__() should return None, not " + typeName(r));
                } else {
                    return r;
                }
            });
        };
    },
    $wrapper: function (self, args, kwargs) {
        // this = the wrapped function
        this.call(self, args, kwargs);
        return pyNone;
    },
    $textsig: "($self, /, *args, **kwargs)",
    $flags: { FastCall: true },
    $doc: "Initialize self.  See help(type(self)) for accurate signature.",
};

/**
 * @memberof dunderSlots
 * @method tp$new
 * @implements __new__
 * @suppress {checkTypes}
 * @returns {pyObject}
 * @param {Array} args
 * @param {Array=} kwargs
 * @description
 * {@link Sk.generic.new} {@link Sk.generic.newMethodDef} are related implementations of `tp$mew` and `__new__`
 * unusually `this = typeobject.prototype` since it is typically called like `typeobj.prototype.tp$new` and must
 * be taken into when writing an implementation of `tp$new`
 */
dunderSlots.__new__ = {
    $name: "__new__",
    $slot_name: "tp$new",
    $slot_func: function (dunderFunc) {
        const tp$new = function (args, kwargs) {
            let func = dunderFunc;
            if (dunderFunc.tp$descr_get) {
                func = dunderFunc.tp$descr_get(null, this.constructor);
            } // weird behaviour ignore staticmethods bascically
            return pyCallOrSuspend(func, [this.constructor, ...args], kwargs);
        };
        tp$new.sk$static_new = false; // this is a flag used in the __new__ algorithm
        return tp$new;
    },
    $wrapper: null, // handled separately since it's not a slot wrapper but an sk_method
    $textsig: "($self, /, *args, **kwargs)",
    $flags: { FastCall: true },
    $doc: "Create and return a new object.",
};

/**
 * @memberof dunderSlots
 * @method tp$call
 * @implements __call__
 * @suppress {checkTypes}
 * @param {Array} args
 * @param {Array=} kwargs
 *
 */
dunderSlots.__call__ = {
    $name: "__call__",
    $slot_name: "tp$call",
    $slot_func: slotFuncFastCall,
    $wrapper: function __call__(self, args, kwargs) {
        // function fast call objects override the prototype.tp$call
        // so use self.tp$call instead of this.call(self)
        const res = self.tp$call(args, kwargs);
        if (res === undefined) {
            return pyNone;
        }
        return res;
    }
    ,
    $textsig: "($self, /, *args, **kwargs)",
    $flags: { FastCall: true },
    $doc: "Call self as a function.",
};

/**
 * @memberof dunderSlots
 * @method $r
 * @implements __repr__
 * @suppress {checkTypes}
 * @returns {pyStr}
 */
dunderSlots.__repr__ = {
    $name: "__repr__",
    $slot_name: "$r",
    $slot_func: slotFuncNoArgsWithCheck("__repr__", checkString, "str"),
    $wrapper: wrapperCallNoArgs,
    $textsig: "($self, /)",
    $flags: { NoArgs: true },
    $doc: "Return repr(self).",
};

/**
 * @memberof dunderSlots
 * @method tp$str
 * @implements `__str__`
 * @suppress {checkTypes}
 * @returns {pyStr}
 */
dunderSlots.__str__ = {
    $name: "__str__",
    $slot_name: "tp$str",
    $slot_func: slotFuncNoArgsWithCheck("__str__", checkString, "str"),
    $wrapper: wrapperCallNoArgs,
    $textsig: "($self, /)",
    $flags: { NoArgs: true },
    $doc: "Return str(self).",
};

/**
 * @memberof dunderSlots
 * @method tp$hash
 * @implements __hash__
 * @suppress {checkTypes}
 * @returns {pyInt}
 * @description
 * To be unhashable set this slot to {@link pyNone} or call {@link markUnhashable}
 */
dunderSlots.__hash__ = {
    $name: "__hash__",
    $slot_name: "tp$hash",
    $slot_func: slotFuncNoArgsWithCheck("__hash__", checkInt, "int", (int) => typeof int.v === "number" ? int : int.tp$hash()),
    $wrapper: wrapperCallBack(wrapperCallNoArgs, (res) => new pyInt(res)),
    $textsig: "($self, /)",
    $flags: { NoArgs: true },
    $doc: "Return hash(self).",
};

// getters/setters/deletters

/**
 * @memberof dunderSlots
 * @method tp$getattr
 * @implements __getattribute__
 * @suppress {checkTypes}
 *
 * @param {pyStr} pyName
 * @param {boolean=} canSuspend
 *
 * @returns {pyObject|undefined}
 * @description
 * This slot will also be given to a pyObject which defines `__getattr__`
 */
dunderSlots.__getattribute__ = {
    $name: "__getattribute__",
    $slot_name: "tp$getattr",
    $slot_func: function (dunderFunc) {
        return function tp$getattr(pyName, canSuspend) {
            let getattrFn = this.ob$type.$typeLookup(pyStr.$getattr);
            if (getattrFn === undefined) {
                // we don't support dynamically created __getattr__ but hey...
                this.constructor.prototype.tp$getattr = slotFuncGetAttribute;
                return slotFuncGetAttribute.call(this, pyName, canSuspend);
            }
            let getattributeFn = this.ob$type.$typeLookup(pyStr.$getattribute);

            let r = chainOrSuspend(
                tryCatchOrSuspend(
                    () => {
                        if (getattributeFn instanceof pyWrapperDescr) {
                            return getattributeFn.d$wrapped.call(this, pyName, canSuspend);
                        } else {
                            if (getattributeFn.tp$descr_get) {
                                getattributeFn = getattributeFn.tp$descr_get(this);
                            }
                            return pyCallOrSuspend(getattributeFn, [pyName]);
                        }
                    },
                    function (e) {
                        if (e instanceof pyExc.AttributeError) {
                            return undefined;
                        } else {
                            throw e;
                        }
                    }
                ),
                (val) =>
                    tryCatchOrSuspend(
                        () => {
                            if (val !== undefined) {
                                return val;
                            }
                            if (getattrFn.tp$descr_get) {
                                getattrFn = getattrFn.tp$descr_get(this);
                            }
                            return pyCallOrSuspend(getattrFn, [pyName]);
                        },
                        function (e) {
                            if (e instanceof pyExc.AttributeError) {
                                return undefined;
                            } else {
                                throw e;
                            }
                        }
                    )
            );
            return canSuspend ? r : retryOptionalSuspensionOrThrow(r);
        };
    },
    $wrapper: function (self, args, kwargs) {
        // this = the wrapped function
        checkOneArg(this.$name, args, kwargs);
        const pyName = args[0];
        if (!checkString(pyName)) {
            throw new pyExc.TypeError("attribute name must be string, not '" + typeName(pyName) + "'");
        }
        const res = this.call(self, pyName);
        if (res === undefined) {
            throw new pyExc.AttributeError(typeName(self) + " has no attribute " + pyName);
        }
        return res;
    },
    $textsig: "($self, name, /)",
    $flags: { OneArg: true },
    $doc: "Return getattr(self, name).",
};

dunderSlots.__getattr__ = {
    $name: "__getattr__",
    $slot_name: "tp$getattr",
    $slot_func: dunderSlots.__getattribute__.$slot_func,
    $wrapper: null,
    $textsig: "($self, name, /)",
    $flags: { OneArg: true },
    $doc: "Return getattr(self, name).",
};


/* Helper to check for object.__setattr__ or __delattr__ applied to a type.
   This is called the Carlo Verre hack after its discoverer. */
function hackcheck(obj, func) {
    let type = obj.ob$type;
    while (type && type.sk$klass !== undefined) {
        type = type.prototype.tp$base;
    }
    if (type && type.prototype.tp$setattr !== func) {
        throw new pyExc.TypeError("can't apply this " + func.$name + " to " + typeName(obj) + " object");
    }
}

/**
 * @suppress {checkTypes}
 * @memberof dunderSlots
 * @method tp$setattr
 * @implements __setattr__
 * @param {pyStr} pyName
 * @param {pyObject|undefined} value undefined indicates the attribute is to be deleted
 * @param {boolean=} canSuspend
 * @description
 * `tp$setattr` is responsible for throwing its own exceptions. It also implements __delattr__
 */
dunderSlots.__setattr__ = {
    $name: "__setattr__",
    $slot_name: "tp$setattr",
    $slot_func: slotFuncSetDelete("__setattr__", "__delattr__"),
    // not need for an error message setattr is always defined on object
    $wrapper: function(self, args, kwargs) {
        checkNoKwargs(this.$name, kwargs);
        checkArgsLen(this.$name, args, 2, 2);
        hackcheck(self, this);
        this.call(self, args[0], args[1]);
        return pyNone; 
    },
    $textsig: "($self, name, value, /)",
    $flags: { MinArgs: 2, MaxArgs: 2 },
    $doc: "Implement setattr(self, name, value).",
};

dunderSlots.__delattr__ = {
    $name: "__delattr__",
    $slot_name: "tp$setattr",
    $slot_func: dunderSlots.__setattr__.$slot_func,
    $wrapper: function(self, args, kwargs) {
        checkOneArg(this.$name, args, kwargs);
        hackcheck(self, this);
        this.call(self, args[0]);
        return pyNone;
    },
    $textsig: "($self, name, /)",
    $flags: { OneArg: true },
    $doc: "Implement delattr(self, name).",
};

/**
 * @memberof dunderSlots
 * @method tp$descr_get
 * @implements __get__
 * @suppress {checkTypes}
 * @param {pyObject} obj
 * @param {typeObject=} obtype
 * @param {boolean=} canSuspend
 */
dunderSlots.__get__ = {
    $name: "__get__",
    $slot_name: "tp$descr_get",
    $slot_func: function (dunderFunc) {
        return function tp$descr_get(obj, obtype, canSuspend) {
            const call_version = canSuspend ? pyCallOrSuspend : pyCall;
            if (obj === null) {
                obj = pyNone;
            }
            if (obtype == null) {
                obtype = pyNone;
            }
            const func = dunderFunc.tp$descr_get ? dunderFunc.tp$descr_get(this) :  dunderFunc;
            return call_version(func, [obj, obtype]);
        };
    },
    $wrapper: function (self, args, kwargs) {
        checkNoKwargs(this.$name, kwargs);
        checkArgsLen(this.$name, args, 1, 2);
        let obj = args[0];
        let obtype = args[1];
        if (obj === pyNone) {
            obj = null;
        }
        if (obtype === pyNone) {
            obtype = null;
        }
        if (obtype === null && obj === null) {
            throw new pyExc.TypeError("__get__(None, None) is invalid");
        }
        return this.call(self, obj, obtype);
    },
    $textsig: "($self, instance, owner, /)",
    $flags: { MinArgs: 2, MaxArgs: 2 },
    $doc: "Return an attribute of instance, which is of type owner.",
};
/**
 * @memberof dunderSlots
 * @method tp$descr_set
 * @implements __set__
 * @suppress {checkTypes}
 * @param {pyObject} obj
 * @param {pyObject|undefined} value undefined will signals __delete__
 * @param {boolean=} canSuspend
 * @description
 * Also implements __delete__
 */
dunderSlots.__set__ = {
    $name: "__set__",
    $slot_name: "tp$descr_set",
    $slot_func: slotFuncSetDelete("__set__", "__delete__"),
    $wrapper: wrapperSet,
    $textsig: "($self, instance, value, /)",
    $flags: { MinArgs: 2, MaxArgs: 2 },
    $doc: "Set an attribute of instance to value.",
};

dunderSlots.__delete__ = {
    $name: "__delete__",
    $slot_name: "tp$descr_set",
    $slot_func: dunderSlots.__set__.$slot_func,
    $wrapper: wrapperCallOneArg,
    $textsig: "($self, instance, /)",
    $flags: { OneArg: true },
    $doc: "Delete an attribute of instance.",
};

/**
 * @memberof dunderSlots
 * @method tp$richcompare
 * @implements __eq__
 * @suppress {checkTypes}
 * @param {pyObject} other
 * @param {string} opname "Eq", "NotEq", "Lt", "LtE", "Gt", "GtE"
 * @returns {boolean}
 * @description
 * __eq__/__ne__/__lt__/__le__/__gt__/__ge__
 * Either define tp$richcompare or any of the `ob$*` slots
 * If `tp$richcompare` is defined then the `nativeClass` will get wrapper functions into each `ob$*` slot
 */

/**
 * @memberof dunderSlots
 * @method ob$eq
 * @implements __eq__
 * @suppress {checkTypes}
 * @returns {boolean}
 */
dunderSlots.__eq__ = {
    $name: "__eq__",
    $slot_name: "ob$eq",
    $slot_func: slotFuncOneArg,
    $wrapper: wrapperRichCompare,
    $textsig: "($self, value, /)",
    $flags: { OneArg: true },
    $doc: "Return self==value.",
};

/**
 * @memberof dunderSlots
 * @method ob$ge
 * @implements __ge__
 * @suppress {checkTypes}
 * @returns {boolean}
 */
dunderSlots.__ge__ = {
    $name: "__ge__",
    $slot_name: "ob$ge",
    $slot_func: slotFuncOneArg,
    $wrapper: wrapperRichCompare,
    $textsig: "($self, value, /)",
    $flags: { OneArg: true },
    $doc: "Return self>=value.",
};
/**
 * @memberof dunderSlots
 * @method ob$gt
 * @implements __gt__
 * @suppress {checkTypes}
 * @returns {boolean}
 */
dunderSlots.__gt__ = {
    $name: "__gt__",
    $slot_name: "ob$gt",
    $slot_func: slotFuncOneArg,
    $wrapper: wrapperRichCompare,
    $textsig: "($self, value, /)",
    $flags: { OneArg: true },
    $doc: "Return self>value.",
};
/**
 * @memberof dunderSlots
 * @method ob$le
 * @implements __le__
 * @suppress {checkTypes}
 * @returns {boolean}
 */
dunderSlots.__le__ = {
    $name: "__le__",
    $slot_name: "ob$le",
    $slot_func: slotFuncOneArg,
    $wrapper: wrapperRichCompare,
    $textsig: "($self, value, /)",
    $flags: { OneArg: true },
    $doc: "Return self<=value.",
};
/**
 * @memberof dunderSlots
 * @method ob$lt
 * @implements __lt__
 * @suppress {checkTypes}
 * @returns {boolean}
 */
dunderSlots.__lt__ = {
    $name: "__lt__",
    $slot_name: "ob$lt",
    $slot_func: slotFuncOneArg,
    $wrapper: wrapperRichCompare,
    $textsig: "($self, value, /)",
    $flags: { OneArg: true },
    $doc: "Return self<value.",
};
/**
 * @memberof dunderSlots
 * @method ob$ne
 * @implements __ne__
 * @suppress {checkTypes}
 * @returns {boolean}
 */
dunderSlots.__ne__ = {
    $name: "__ne__",
    $slot_name: "ob$ne",
    $slot_func: slotFuncOneArg,
    $wrapper: wrapperRichCompare,
    $textsig: "($self, value, /)",
    $flags: { OneArg: true },
    $doc: "Return self!=value.",
};

// iters

/**
 * @memberof dunderSlots
 * @method tp$iter
 * @implements __iter__
 * @suppress {checkTypes}
 * @returns {pyObject} must have a valid `tp$iternext` slot
 * See {@link buildIteratorClass} and {@link pyIterator}
 */
dunderSlots.__iter__ = {
    $name: "__iter__",
    $slot_name: "tp$iter",
    $slot_func: slotFuncNoArgs,
    $wrapper: wrapperCallNoArgs,
    $textsig: "($self, /)",
    $flags: { NoArgs: true },
    $doc: "Implement iter(self).",
};

/**
 * @memberof dunderSlots
 * @method tp$iternext
 * @param {boolean=} canSuspend
 * @implements __next__
 * @suppress {checkTypes}
 * @returns {pyObject|undefined} Do not raise a StopIteration error instead return undefined
 */
dunderSlots.__next__ = {
    $name: "__next__",
    $slot_name: "tp$iternext",
    $slot_func: function (dunderFunc) {
        return function tp$iternext(canSuspend) {
            const func = dunderFunc.tp$descr_get ? dunderFunc.tp$descr_get(this) :  dunderFunc;
            const ret = tryCatchOrSuspend(
                () => pyCallOrSuspend(func, []),
                (e) => {
                    if (e instanceof pyExc.StopIteration) {
                        return undefined;
                    } else {
                        throw e;
                    }
                }
            );
            return canSuspend ? ret : retryOptionalSuspensionOrThrow(ret);
        };
    },
    /**
     *
     * @param {*} self
     * @param {Array} args
     * @param {Array|undefined=} kwargs
     */
    $wrapper: function (self, args, kwargs) {
        // this = the wrapped function
        checkNoArgs(this.$name, args, kwargs);
        // the first tp$iternext is sometimes different from the prototype.tp$iternext
        // so instead of this.call(self) use self.tp$iternext
        return chainOrSuspend(self.tp$iternext(true), (res) => {
            if (res === undefined) {
                throw new pyExc.StopIteration();
            }
            return res;
        });
    },
    $textsig: "($self, /)",
    $flags: { NoArgs: true },
    $doc: "Implement next(self).",
};

// sequence and mapping
/**
 * @memberof dunderSlots
 * @member tp$as_sequence_or_mapping
 * @type {boolean}
 * @description
 * set `tp$as_sequence_or_mapping` to `true` in order for for {@link buildNativeClass}
 * to acquire appropriate `slot_wrappers` for the slots
 * - [sq$length]{@link dunderSlots.sq$length}
 * - [sq$concat]{@link dunderSlots.sq$concat}
 * - [sq$contains]{@link dunderSlots.sq$contains}
 * - [sq$repeat]{@link dunderSlots.sq$repeat}
 * - [mp$subscript]{@link dunderSlots.mp$subscript}
 * - [mp$ass_subscript]{@link dunderSlots.mp$ass_subscript}
 */

/**
 * @memberof dunderSlots
 * @method sq$concat
 * @implements __add__
 * @suppress {checkTypes}
 * @description defining `sq$concat` along with {@link dunderSlots.tp$as_sequence_or_mapping} will gain the slot
 * `__add__`.
 * note that this slot will be equivalent to the [nb$add]{@link dunderSlots.nb$add} slot
 */

/**
 * @memberof dunderSlots
 * @method sq$repeat
 * @implements __mul__/__rmul__
 * @suppress {checkTypes}
 * @description defining `sq$repeat` along with {@link dunderSlots.tp$as_sequence_or_mapping} will gain the slots
 * `__mul__` and `__rmul__`
 * note that this slot will be equivalent to the [nb$multiply]{@link dunderSlots.nb$multiply} slot
 */

/**
 * @memberof dunderSlots
 * @method sq$length
 * @param {boolean=} canSuspend
 * @implements __len__
 * @suppress {checkTypes}
 * @returns {number}
 */
dunderSlots.__len__ = {
    $name: "__len__",
    $slot_name: "sq$length",
    $slot_func: function (dunderFunc) {
        return function sq$length(canSuspend) {
            let res;
            const func = dunderFunc.tp$descr_get ? dunderFunc.tp$descr_get(this) :  dunderFunc;
            if (canSuspend) {
                res = pyCallOrSuspend(func, []);
                return chainOrSuspend(res, (r) => {
                    return asIndexOrThrow(r);
                });
            } else {
                res = pyCall(func, []);
                return asIndexOrThrow(res);
            }
        };
    },
    $wrapper: function __len__(self, args, kwargs) {
        checkNoArgs("__len__", args, kwargs);
        return new pyInt(self.sq$length());
    },
    $flags: { NoArgs: true },
    $textsig: "($self, /)",
    $doc: "Return len(self).",
};

/**
 * @suppress {checkTypes}
 * @memberof dunderSlots
 * @method sq$contains
 *
 * @param {pyObject} key
 * @param {boolean=} canSuspend
 *
 * @implements __contains__
 * @returns {boolean}
 */
dunderSlots.__contains__ = {
    $name: "__contains__",
    $slot_name: "sq$contains",
    $slot_func: function (dunderFunc) {
        return function sq$contains(key, canSuspend) {
            const func = dunderFunc.tp$descr_get ? dunderFunc.tp$descr_get(this) :  dunderFunc;
            let res = pyCallOrSuspend(func, [key]);
            res = chainOrSuspend(res, (r) => objectIsTrue(r));
            if (res.$isSuspension) {
                return canSuspend ? res : retryOptionalSuspensionOrThrow(res);
            }
            return res;
        };
    },
    $wrapper: function __contains__(self, args, kwargs) {
        checkOneArg("__contains__", args, kwargs);
        return new pyBool(this.call(self, args[0], true));
    },
    $textsig: "($self, key, /)",
    $flags: { OneArg: true },
    $doc: "Return key in self.",
};

/**
 * @memberof dunderSlots
 * @method mp$subscript
 * @param {pyObject} key - might be a pyStr, pyInt or pySlice
 * @param {boolean=} canSuspend
 * @implements __getitem__
 * @suppress {checkTypes}
 * @returns {pyObject}
 * @throws {pyExc.TypeError}
 */
dunderSlots.__getitem__ = {
    $name: "__getitem__",
    $slot_name: "mp$subscript",
    $slot_func: function (dunderFunc) {
        return function mp$subscript(key, canSuspend) {
            const func = dunderFunc.tp$descr_get ? dunderFunc.tp$descr_get(this) :  dunderFunc;
            const call_version = canSuspend ? pyCallOrSuspend : pyCall;
            return call_version(func, [key]);
        };
    },
    $wrapper: wrapperCallOneArg,
    $textsig: "($self, key, /)",
    $flags: { OneArg: true },
    $doc: "Return self[key].",
};

/**
 * @memberof dunderSlots
 * @method mp$ass_subscript
 * @param {pyObject} item - might be a pyStr, pyInt or pySlice
 * @param {pyObject|undefined} value - undefined indicates the item should be deleted
 * @param {boolean=} canSuspend
 * @implements __setitem__
 * @suppress {checkTypes}
 * @returns {pyObject}
 * @throws {pyExc.TypeError}
 * @description
 * Also implements __delitem__
 */
dunderSlots.__setitem__ = {
    $name: "__setitem__",
    $slot_name: "mp$ass_subscript",
    $slot_func: slotFuncSetDelete("__setitem__", "__delitem__", "does not support item assignment"),
    $wrapper: wrapperSet,
    $textsig: "($self, key, value, /)",
    $flags: { MinArgs: 2, MaxArgs: 2 },
    $doc: "Set self[key] to value.",
};

dunderSlots.__delitem__ = {
    $name: "__delitem__",
    $slot_name: "mp$ass_subscript",
    $slot_func: dunderSlots.__setitem__.$slot_func,
    $wrapper: wrapperCallOneArg,
    $textsig: "($self, key, /)",
    $flags: { OneArg: true },
    $doc: "Delete self[key].",
};

// number slots
/**
 * @memberof dunderSlots
 * @member tp$as_number
 * @type {boolean}
 * @description
 * set `tp$as_number` to `true` in order for for {@link buildNativeClass}
 * to acquire appropriate `slot_wrappers` for number slots
 * You can find an exhaustive list in the source code {@link dunderSlots}
 *
 * Examples:
 * - [nb$add]{@link dunderSlots.nb$add}
 * - [nb$int_]{@link dunderSlots.nb$int_}
 * - [nb$divide]{@link dunderSlots.nb$divide} - note we do not use `nb$true_divide`
 * - [nb$bool]{@link dunderSlots.nb$bool} - should return a js boolean
 *
 * You need not define `nb$reflected_*` slots unless your implementation is different from the default implementation
 * Similarly `nb$inplace_` need not be defined unless the implementation is different from the usual slot.
 *
 */

/**
 * @memberof dunderSlots
 * @method nb$add
 * @implements __add__
 * @suppress {checkTypes}
 * @description
 * the reflected slot will be defined if not set
 *
 */
dunderSlots.__add__ = {
    $name: "__add__",
    $slot_name: "nb$add",
    $slot_func: slotFuncOneArg,
    $wrapper: wrapperCallOneArg,
    $textsig: "($self, value, /)",
    $flags: { OneArg: true },
    $doc: "Return self+value.",
};
/**
 * @memberof dunderSlots
 * @method nb$relfceted_add
 * @implements __radd__
 * @suppress {checkTypes}
 * @description
 * the reflected slot will be defined if not set
 *
 */
dunderSlots.__radd__ = {
    $name: "__radd__",
    $slot_name: "nb$reflected_add",
    $slot_func: slotFuncOneArg,
    $wrapper: wrapperCallOneArg,
    $textsig: "($self, value, /)",
    $flags: { OneArg: true },
    $doc: "Return value+self.",
};
/**
 * @memberof dunderSlots
 * @method nb$inplace_add
 * @implements __iadd__
 * @suppress {checkTypes}
 * @description
 * Only define this if your implementation is different from `nb$add`
 *
 */
dunderSlots.__iadd__ = {
    $name: "__iadd__",
    $slot_name: "nb$inplace_add",
    $slot_func: slotFuncOneArg,
    $wrapper: wrapperCallOneArg,
    $textsig: "($self, value, /)",
    $flags: { OneArg: true },
    $doc: "Implement self+=value.",
};
/**
 * @memberof dunderSlots
 * @method nb$subtract
 * @implements __sub__
 * @suppress {checkTypes}
 *
 */
dunderSlots.__sub__ = {
    $name: "__sub__",
    $slot_name: "nb$subtract",
    $slot_func: slotFuncOneArg,
    $wrapper: wrapperCallOneArg,
    $textsig: "($self, value, /)",
    $flags: { OneArg: true },
    $doc: "Return self-value.",
};
/**
 * @memberof dunderSlots
 * @method nb$reflected_subtract
 * @implements __rsub__
 * @suppress {checkTypes}
 */
dunderSlots.__rsub__ = {
    $name: "__rsub__",
    $slot_name: "nb$reflected_subtract",
    $slot_func: slotFuncOneArg,
    $wrapper: wrapperCallOneArg,
    $textsig: "($self, value, /)",
    $flags: { OneArg: true },
    $doc: "Return value-self.",
};
/**
 * @memberof dunderSlots
 * @method nb$inplace_multiply
 * @implements __imul__
 * @suppress {checkTypes}
 */
dunderSlots.__imul__ = {
    $name: "__imul__",
    $slot_name: "nb$inplace_multiply",
    $slot_func: slotFuncOneArg,
    $wrapper: wrapperCallOneArg,
    $textsig: "($self, value, /)",
    $flags: { OneArg: true },
    $doc: "Implement self*=value.",
};
/**
 * @memberof dunderSlots
 * @method nb$multiply
 * @implements __mul__
 * @suppress {checkTypes}
 */
dunderSlots.__mul__ = {
    $name: "__mul__",
    $slot_name: "nb$multiply",
    $slot_func: slotFuncOneArg,
    $wrapper: wrapperCallOneArg,
    $textsig: "($self, value, /)",
    $flags: { OneArg: true },
    $doc: "Return self*value.",
};
/**
 * @memberof dunderSlots
 * @method nb$reflected_multiply
 * @implements __rmul__
 * @suppress {checkTypes}
 */
dunderSlots.__rmul__ = {
    $name: "__rmul__",
    $slot_name: "nb$reflected_multiply",
    $slot_func: slotFuncOneArg,
    $wrapper: wrapperCallOneArg,
    $textsig: "($self, value, /)",
    $flags: { OneArg: true },
    $doc: "Return value*self.",
};
/**
 * @memberof dunderSlots
 * @method nb$inplace_subtract
 * @implements __isub__
 * @suppress {checkTypes}
 */
dunderSlots.__isub__ = {
    $name: "__isub__",
    $slot_name: "nb$inplace_subtract",
    $slot_func: slotFuncOneArg,
    $wrapper: wrapperCallOneArg,
    $textsig: "($self, value, /)",
    $flags: { OneArg: true },
    $doc: "Implement self-=value.",
};
/**
 * @memberof dunderSlots
 * @method nb$remainder
 * @implements __mod__
 * @suppress {checkTypes}
 */
dunderSlots.__mod__ = {
    $name: "__mod__",
    $slot_name: "nb$remainder",
    $slot_func: slotFuncOneArg,
    $wrapper: wrapperCallOneArg,
    $textsig: "($self, value, /)",
    $flags: { OneArg: true },
    $doc: "Return self%value.",
};
/**
 * @memberof dunderSlots
 * @method nb$reflected_remainder
 * @implements __rmod__
 * @suppress {checkTypes}
 */
dunderSlots.__rmod__ = {
    $name: "__rmod__",
    $slot_name: "nb$reflected_remainder",
    $slot_func: slotFuncOneArg,
    $wrapper: wrapperCallOneArg,
    $textsig: "($self, value, /)",
    $flags: { OneArg: true },
    $doc: "Return value%self.",
};
/**
 * @memberof dunderSlots
 * @method nb$inplace_remainder
 * @implements __imod__
 * @suppress {checkTypes}
 */
dunderSlots.__imod__ = {
    $name: "__imod__",
    $slot_name: "nb$inplace_remainder",
    $slot_func: slotFuncOneArg,
    $wrapper: wrapperCallOneArg,
    $textsig: "($self, value, /)",
    $flags: { OneArg: true },
    $doc: "Implement value%=self.",
};
/**
 * @memberof dunderSlots
 * @method nb$divmod
 * @implements __divmod__
 * @suppress {checkTypes}
 */
dunderSlots.__divmod__ = {
    $name: "__divmod__",
    $slot_name: "nb$divmod",
    $slot_func: slotFuncOneArg,
    $wrapper: wrapperCallOneArg,
    $textsig: "($self, value, /)",
    $flags: { OneArg: true },
    $doc: "Return divmod(self, value).",
};
/**
 * @memberof dunderSlots
 * @method nb$reflected_divmod
 * @implements __rdivmod__
 * @suppress {checkTypes}
 */
dunderSlots.__rdivmod__ = {
    $name: "__rdivmod__",
    $slot_name: "nb$reflected_divmod",
    $slot_func: slotFuncOneArg,
    $wrapper: wrapperCallOneArg,
    $textsig: "($self, value, /)",
    $flags: { OneArg: true },
    $doc: "Return divmod(value, self)",
};
/**
 * @memberof dunderSlots
 * @method nb$positive
 * @implements __pos__
 * @suppress {checkTypes}
 */
dunderSlots.__pos__ = {
    $name: "__pos__",
    $slot_name: "nb$positive",
    $slot_func: slotFuncNoArgs,
    $wrapper: wrapperCallNoArgs,
    $textsig: "($self, /)",
    $flags: { NoArgs: true },
    $doc: "+self",
};
/**
 * @memberof dunderSlots
 * @method nb$negative
 * @implements __neg__
 * @suppress {checkTypes}
 */
dunderSlots.__neg__ = {
    $name: "__neg__",
    $slot_name: "nb$negative",
    $slot_func: slotFuncNoArgs,
    $wrapper: wrapperCallNoArgs,
    $textsig: "($self, /)",
    $flags: { NoArgs: true },
    $doc: "-self",
};
/**
 * @memberof dunderSlots
 * @method nb$abs
 * @implements __abs__
 * @suppress {checkTypes}
 */
dunderSlots.__abs__ = {
    $name: "__abs__",
    $slot_name: "nb$abs",
    $slot_func: slotFuncNoArgs,
    $wrapper: wrapperCallNoArgs,
    $textsig: "($self, /)",
    $flags: { NoArgs: true },
    $doc: "abs(self)",
};
/**
 * @memberof dunderSlots
 * @method nb$bool
 * @implements __bool__
 * @suppress {checkTypes}
 * @returns {boolean}
 */
dunderSlots.__bool__ = {
    $name: "__bool__",
    $slot_name: "nb$bool",
    $slot_func: slotFuncNoArgsWithCheck("__bool__", checkBool, "bool", (res) => res.v !== 0),
    $wrapper: function __bool__(self, args, kwargs) {
        // this = the wrapped function
        checkNoArgs(this.$name, args, kwargs);
        return new pyBool(this.call(self));
    },
    $textsig: "($self, /)",
    $flags: { NoArgs: true },
    $doc: "self != 0",
};
/**
 * @memberof dunderSlots
 * @method nb$invert
 * @implements __invert__
 * @suppress {checkTypes}
 */
dunderSlots.__invert__ = {
    $name: "__invert__",
    $slot_name: "nb$invert",
    $slot_func: slotFuncNoArgs,
    $wrapper: wrapperCallNoArgs,
    $textsig: "($self, /)",
    $flags: { NoArgs: true },
    $doc: "~self",
};
/**
 * @memberof dunderSlots
 * @method nb$lshift
 * @implements __lshift__
 * @suppress {checkTypes}
 */
dunderSlots.__lshift__ = {
    $name: "__lshift__",
    $slot_name: "nb$lshift",
    $slot_func: slotFuncOneArg,
    $wrapper: wrapperCallOneArg,
    $textsig: "($self, value, /)",
    $flags: { OneArg: true },
    $doc: "Return self<<value.",
};
/**
 * @memberof dunderSlots
 * @method nb$reflected_lshift
 * @implements __rlshift__
 * @suppress {checkTypes}
 */
dunderSlots.__rlshift__ = {
    $name: "__rlshift__",
    $slot_name: "nb$reflected_lshift",
    $slot_func: slotFuncOneArg,
    $wrapper: wrapperCallOneArg,
    $textsig: "($self, value, /)",
    $flags: { OneArg: true },
    $doc: "Return value<<self.",
};
/**
 * @memberof dunderSlots
 * @method nb$rshift
 * @implements __rshift__
 * @suppress {checkTypes}
 */
dunderSlots.__rshift__ = {
    $name: "__rshift__",
    $slot_name: "nb$rshift",
    $slot_func: slotFuncOneArg,
    $wrapper: wrapperCallOneArg,
    $textsig: "($self, value, /)",
    $flags: { OneArg: true },
    $doc: "Return self>>value.",
};
/**
 * @memberof dunderSlots
 * @method nb$reflected_rshift
 * @implements __rrshift__
 * @suppress {checkTypes}
 */
dunderSlots.__rrshift__ = {
    $name: "__rrshift__",
    $slot_name: "nb$reflected_rshift",
    $slot_func: slotFuncOneArg,
    $wrapper: wrapperCallOneArg,
    $textsig: "($self, value, /)",
    $flags: { OneArg: true },
    $doc: "Return value>>self.",
};
/**
 * @memberof dunderSlots
 * @method nb$inplace_lshift
 * @implements __ilshift__
 * @suppress {checkTypes}
 */
dunderSlots.__ilshift__ = {
    $name: "__ilshift__",
    $slot_name: "nb$inplace_lshift",
    $slot_func: slotFuncOneArg,
    $wrapper: wrapperCallOneArg,
    $textsig: "($self, value, /)",
    $flags: { OneArg: true },
    $doc: "Implement self<<=value.",
};
/**
 * @memberof dunderSlots
 * @method nb$inplace_rshift
 * @implements __irshift__
 * @suppress {checkTypes}
 */
dunderSlots.__irshift__ = {
    $name: "__irshift__",
    $slot_name: "nb$inplace_rshift",
    $slot_func: slotFuncOneArg,
    $wrapper: wrapperCallOneArg,
    $textsig: "($self, value, /)",
    $flags: { OneArg: true },
    $doc: "Implement self=>>value.",
};
/**
 * @memberof dunderSlots
 * @method nb$and
 * @implements __and__
 * @suppress {checkTypes}
 */
dunderSlots.__and__ = {
    $name: "__and__",
    $slot_name: "nb$and",
    $slot_func: slotFuncOneArg,
    $wrapper: wrapperCallOneArg,
    $textsig: "($self, value, /)",
    $flags: { OneArg: true },
    $doc: "Return self&value.",
};
/**
 * @memberof dunderSlots
 * @method nb$reflected_and
 * @implements __rand__
 * @suppress {checkTypes}
 */
dunderSlots.__rand__ = {
    $name: "__rand__",
    $slot_name: "nb$refelcted_and",
    $slot_func: slotFuncOneArg,
    $wrapper: wrapperCallOneArg,
    $textsig: "($self, value, /)",
    $flags: { OneArg: true },
    $doc: "Return value&self.",
};
/**
 * @memberof dunderSlots
 * @method nb$inplace_and
 * @implements __iand__
 * @suppress {checkTypes}
 */
dunderSlots.__iand__ = {
    $name: "__iand__",
    $slot_name: "nb$and",
    $slot_func: slotFuncOneArg,
    $wrapper: wrapperCallOneArg,
    $textsig: "($self, value, /)",
    $flags: { OneArg: true },
    $doc: "Implement self&=value.",
};
/**
 * @memberof dunderSlots
 * @method nb$xor
 * @implements __xor__
 * @suppress {checkTypes}
 */
dunderSlots.__xor__ = {
    $name: "__xor__",
    $slot_name: "nb$xor",
    $slot_func: slotFuncOneArg,
    $wrapper: wrapperCallOneArg,
    $textsig: "($self, value, /)",
    $flags: { OneArg: true },
    $doc: "Return self^value.",
};
/**
 * @memberof dunderSlots
 * @method nb$reflected_xor
 * @implements __rxor__
 * @suppress {checkTypes}
 */
dunderSlots.__rxor__ = {
    $name: "__rxor__",
    $slot_name: "nb$reflected_xor",
    $slot_func: slotFuncOneArg,
    $wrapper: wrapperCallOneArg,
    $textsig: "($self, value, /)",
    $flags: { OneArg: true },
    $doc: "Return value^self.",
};
/**
 * @memberof dunderSlots
 * @method nb$inplace_xor
 * @implements __ixor__
 * @suppress {checkTypes}
 */
dunderSlots.__ixor__ = {
    $name: "__ixor__",
    $slot_name: "nb$inplace_xor",
    $slot_func: slotFuncOneArg,
    $wrapper: wrapperCallOneArg,
    $textsig: "($self, value, /)",
    $flags: { OneArg: true },
    $doc: "Implement self^=value.",
};
/**
 * @memberof dunderSlots
 * @method nb$or
 * @implements __or__
 * @suppress {checkTypes}
 */
dunderSlots.__or__ = {
    $name: "__or__",
    $slot_name: "nb$or",
    $slot_func: slotFuncOneArg,
    $wrapper: wrapperCallOneArg,
    $textsig: "($self, value, /)",
    $flags: { OneArg: true },
    $doc: "Return self|value.",
};
/**
 * @memberof dunderSlots
 * @method nb$reflected_or
 * @implements __ror__
 * @suppress {checkTypes}
 */
dunderSlots.__ror__ = {
    $name: "__ror__",
    $slot_name: "nb$reflected_or",
    $slot_func: slotFuncOneArg,
    $wrapper: wrapperCallOneArg,
    $textsig: "($self, value, /)",
    $flags: { OneArg: true },
    $doc: "Return value|self.",
};
/**
 * @memberof dunderSlots
 * @method nb$reflected_ior
 * @implements __ior__
 * @suppress {checkTypes}
 */
dunderSlots.__ior__ = {
    $name: "__ior__",
    $slot_name: "nb$inplace_or",
    $slot_func: slotFuncOneArg,
    $wrapper: wrapperCallOneArg,
    $textsig: "($self, value, /)",
    $flags: { OneArg: true },
    $doc: "Implement self|=value.",
};
/**
 * @memberof dunderSlots
 * @method nb$int_
 * @implements __int__
 * @suppress {checkTypes}
 */
dunderSlots.__int__ = {
    $name: "__int__",
    $slot_name: "nb$int_",
    $slot_func: slotFuncNoArgsWithCheck("__int__", checkInt, "int"),
    $wrapper: wrapperCallNoArgs,
    $textsig: "($self, /)",
    $flags: { NoArgs: true },
    $doc: "int(self)",
};
/**
 * @memberof dunderSlots
 * @method nb$float_
 * @implements __float__
 * @suppress {checkTypes}
 */
dunderSlots.__float__ = {
    $name: "__float__",
    $slot_name: "nb$float_",
    $slot_func: slotFuncNoArgsWithCheck("__float__", checkFloat, "float"),
    $wrapper: wrapperCallNoArgs,
    $textsig: "($self, /)",
    $flags: { NoArgs: true },
    $doc: "float(self)",
};
/**
 * @memberof dunderSlots
 * @method nb$floor_divide
 * @implements __floordiv__
 * @suppress {checkTypes}
 */
dunderSlots.__floordiv__ = {
    $name: "__floordiv__",
    $slot_name: "nb$floor_divide",
    $slot_func: slotFuncOneArg,
    $wrapper: wrapperCallOneArg,
    $textsig: "($self, value, /)",
    $flags: { OneArg: true },
    $doc: "Return self//value.",
};
/**
 * @memberof dunderSlots
 * @method nb$reflected_floor_divide
 * @implements __rfloordiv__
 * @suppress {checkTypes}
 */
dunderSlots.__rfloordiv__ = {
    $name: "__rfloordiv__",
    $slot_name: "nb$reflected_floor_divide",
    $slot_func: slotFuncOneArg,
    $wrapper: wrapperCallOneArg,
    $textsig: "($self, value, /)",
    $flags: { OneArg: true },
    $doc: "Return value//self.",
};
/**
 * @memberof dunderSlots
 * @method nb$inplace_floor_divide
 * @implements __ifloordiv__
 * @suppress {checkTypes}
 */
dunderSlots.__ifloordiv__ = {
    $name: "__ifloordiv__",
    $slot_name: "nb$inplace_floor_divide",
    $slot_func: slotFuncOneArg,
    $wrapper: wrapperCallOneArg,
    $textsig: "($self, value, /)",
    $flags: { OneArg: true },
    $doc: "Implement self//=value.",
};
/**
 * @memberof dunderSlots
 * @method nb$divide
 * @implements __truediv__
 * @suppress {checkTypes}
 */
dunderSlots.__truediv__ = {
    $name: "__truediv__",
    $slot_name: "nb$divide",
    $slot_func: slotFuncOneArg,
    $wrapper: wrapperCallOneArg,
    $textsig: "($self, value, /)",
    $flags: { OneArg: true },
    $doc: "Return self/value.",
};
/**
 * @memberof dunderSlots
 * @method nb$reflected_divide
 * @implements __rtruediv__
 * @suppress {checkTypes}
 */
dunderSlots.__rtruediv__ = {
    $name: "__rtruediv__",
    $slot_name: "nb$reflected_divide",
    $slot_func: slotFuncOneArg,
    $wrapper: wrapperCallOneArg,
    $textsig: "($self, value, /)",
    $flags: { OneArg: true },
    $doc: "Return value/self.",
};
/**
 * @memberof dunderSlots
 * @method nb$inplace_divide
 * @implements __itruediv__
 * @suppress {checkTypes}
 */
dunderSlots.__itruediv__ = {
    $name: "__itruediv__",
    $slot_name: "nb$inplace_divide",
    $slot_func: slotFuncOneArg,
    $wrapper: wrapperCallOneArg,
    $textsig: "($self, value, /)",
    $flags: { OneArg: true },
    $doc: "Implement self/=value.",
};
/**
 * @memberof dunderSlots
 * @method nb$index
 * @implements __index__
 * @suppress {checkTypes}
 */
dunderSlots.__index__ = {
    $name: "__index__",
    $slot_name: "nb$index",
    $slot_func: slotFuncNoArgsWithCheck("__index__", checkInt, "int", (idx) => idx.v),
    $wrapper: wrapperCallBack(wrapperCallNoArgs, (res) => new pyInt(res)),
    $textsig: "($self, /)",
    $flags: { NoArgs: true },
    $doc: "Return self converted to an integer, if self is suitable for use as an index into a list.",
};
/**
 * @memberof dunderSlots
 * @method nb$power
 * @implements __pow__
 * @suppress {checkTypes}
 */
dunderSlots.__pow__ = {
    $name: "__pow__",
    $slot_name: "nb$power",
    $slot_func: function (dunderFunc) {
        return function (value, mod) {
            const func = dunderFunc.tp$descr_get ? dunderFunc.tp$descr_get(this) :  dunderFunc;
            if (mod == undefined) {
                return pyCall(func, [value]);
            } else {
                return pyCall(func, [value, mod]);
            }
        };
    },
    $wrapper: wrapperCallTernary,
    $textsig: "($self, value, mod=None, /)",
    $flags: { MinArgs: 1, MaxArgs: 2 },
    $doc: "Return pow(self, value, mod).",
};
/**
 * @memberof dunderSlots
 * @method nb$reflected_power
 * @implements __rpow__
 * @suppress {checkTypes}
 */
dunderSlots.__rpow__ = {
    $name: "__rpow__",
    $slot_name: "nb$reflected_power",
    $slot_func: dunderSlots.__pow__.$slot_func,
    $wrapper: wrapperCallTernary,
    $textsig: "($self, value, mod=None, /)",
    $flags: { MinArgs: 1, MaxArgs: 2 },
    $doc: "Return pow(value, self, mod).",
};
/**
 * @memberof dunderSlots
 * @method nb$inplace_power
 * @implements __ipow__
 * @suppress {checkTypes}
 */
dunderSlots.__ipow__ = {
    $name: "__ipow__",
    $slot_name: "nb$inplace_power",
    $slot_func: dunderSlots.__pow__.$slot_func,
    $wrapper: wrapperCallTernary,
    $textsig: "($self, value, mod=None, /)",
    $flags: { MinArgs: 1, MaxArgs: 2 },
    $doc: "Implement **=",
};
/**
 * @memberof dunderSlots
 * @method nb$matrix_multiply
 * @implements __matmul__
 * @suppress {checkTypes}
 */
dunderSlots.__matmul__ = {
    $name: "__matmul__",
    $slot_name: "nb$matrix_multiply",
    $slot_func: slotFuncOneArg,
    $wrapper: wrapperCallOneArg,
    $textsig: "($self, value, /)",
    $flags: { OneArg: true },
    $doc: "Return self@value.",
};
/**
 * @memberof dunderSlots
 * @method nb$reflected_matrix_multiply
 * @implements __rmatmul__
 * @suppress {checkTypes}
 */
dunderSlots.__rmatmul__ = {
    $name: "__rmatmul__",
    $slot_name: "nb$reflected_matrix_multiply",
    $slot_func: slotFuncOneArg,
    $wrapper: wrapperCallOneArg,
    $textsig: "($self, value, /)",
    $flags: { OneArg: true },
    $doc: "Return value@self.",
};
/**
 * @memberof dunderSlots
 * @method nb$inplace_matrix_multiply
 * @implements __imatmul__
 * @suppress {checkTypes}
 */
dunderSlots.__imatmul__ = {
    $name: "__imatmul__",
    $slot_name: "nb$inplace_matrix_multiply",
    $slot_func: slotFuncOneArg,
    $wrapper: wrapperCallOneArg,
    $textsig: "($self, value, /)",
    $flags: { OneArg: true },
    $doc: "Implement self@=value.",
};

// py2 ONLY slots
dunderSlots.__long__ = {
    $name: "__long__",
    $slot_name: "nb$lng",
    $slot_func: slotFuncNoArgsWithCheck("__long__", checkInt, "int"),
    $wrapper: wrapperCallNoArgs,
    $textsig: "($self, /)",
    $flags: { NoArgs: true },
    $doc: "int(self)",
};


