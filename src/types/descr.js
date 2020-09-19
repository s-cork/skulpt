import {
    buildNativeClass,
    setUpGetSets,
    setUpMethods,
    setUpSlots,
    genericGetAttr,
    pyExc,
    pyStr,
    pyNone,
    pyNotImplemented,
    pyFunc,
    pyType,
    pyBuiltinFuncOrMethod,
    pyObject,
    typeName,
    checkNoArgs,
    checkOneArg,
    checkArgsLen,
    checkNoKwargs,
    keywordArrayToNamedArgs,
} from "../internal";

/** @typedef {pyType|Function|Object} */
/** @typedef {pyObject} */
/** @constructor @extends {pyObject} */ var descr_object = new Function(); // keep closure compiler happy

/**
 * @function
 * @param {string} type_name
 * @param {string|undefined} repr_name
 * @param {Function} descr_constructor
 * 
 * @return {FunctionConstructor}
 */
function buildDescriptor(type_name, repr_name, descr_constructor) {
    return buildNativeClass(type_name, {
        constructor: descr_constructor,
        flags: { sk$acceptable_as_base_class: false },
        // we can't use slots/methods/getsets yet since they're not defined!
        proto: /**@lends {descr_object.prototype}*/ {
            d$repr_name: repr_name || type_name,
            d$check: descriptorCheck,
            d$set_check: descriptorSetCheck,
            $r: descriptorRepr,
            tp$getsets: descriptorGetsets,
            tp$getattr: genericGetAttr,
        },
    });
}

function descriptorCheck(obj) {
    if (obj == null) {
        return this;
    } else if (!obj.ob$type.$isSubType(this.d$type)) {
        throw new pyExc.TypeError(
            "descriptor '" + this.d$name + "' requires a '" + this.d$type.prototype.tp$name + "' object but received a '" + typeName(obj) + "' object"
        );
    }
    return;
}

function descriptorSetCheck(obj) {
    if (!obj.ob$type.$isSubType(this.d$type)) {
        throw new pyExc.TypeError(
            "descriptor '" + this.d$name + "' requires a '" + this.d$type.prototype.tp$name + "' object but received a '" + typeName(obj) + "' object"
        );
    }
}

function descriptorRepr() {
    return new pyStr("<" + this.d$repr_name + " '" + this.d$name + "' of '" + this.d$type.prototype.tp$name + "' objects>");
}

const descriptorGetsets = {
    __doc__: {
        $get: function () {
            return this.d$def.$doc ? new pyStr(this.d$def.$doc) : pyNone;
        },
    },
    __objclass__: {
        $get: function () {
            return this.d$type;
        },
    },
    __name__: {
        $get: function () {
            return new pyStr(this.d$name);
        },
    },
};

/**
 * @constructor
 * @param {pyType} type_obj
 * @param {Object} gsd
 * @extends {descr_object}
 */
export function pyGetSetDescr(typeobj, d_base) {
    this.d$def = d_base;
    this.$get = d_base.$get;
    this.$set = d_base.$set;
    this.d$type = typeobj;
    this.d$name = d_base.$name;
}
buildDescriptor("getset_descriptor", undefined, pyGetSetDescr);
Object.assign(pyGetSetDescr.prototype, {
    tp$descr_get(obj, type) {
        let ret;
        if ((ret = this.d$check(obj))) {
            return ret;
        }
        if (this.$get !== undefined) {
            return this.$get.call(obj);
        }
        throw new pyExc.AttributeError("getset_descriptor '" + this.d$name + "' of '" + this.d$type.prototype.tp$name + "' objects is not readable");
    },
    tp$descr_set(obj, value) {
        this.d$set_check(obj);

        if (this.$set !== undefined) {
            return this.$set.call(obj, value);
        }
        throw new pyExc.AttributeError("attribute '" + this.d$name + "' of '" + this.d$type.prototype.tp$name + "' objects is readonly");
    },
});

/**
 * @constructor
 * @param {pyType} type_obj
 * @param {Object} method
 * @extends {descr_object}
 */
export function pyMethodDescr(typeobj, method_def) {
    this.d$def = method_def;
    this.$meth = method_def.$meth; //useful for internal fast calls
    this.d$type = typeobj;
    this.d$name = method_def.$name || "<native JS>";
    const flags = method_def.$flags || {};
    this.$flags = flags;
    if (flags.FastCall && flags.NoKwargs) {
        this.tp$call = this.$methodFastCallNoKwargs;
    } else if (flags.FastCall) {
        this.tp$call = this.$methodFastCall;
    } else if (flags.NoArgs) {
        this.tp$call = this.$methodCallNoArgs;
    } else if (flags.OneArg) {
        this.tp$call = this.$methodCallOneArg;
    } else if (flags.NamedArgs) {
        this.tp$call = this.$methodCallNamedArgs;
    } else if (flags.MinArgs !== undefined) {
        this.tp$call = this.$methodCallMinArgs;
    } else {
        // for legacy methods that haven't defined flags yet
        this.func_code = method_def.$meth;
        this.tp$call = this.$defaultCall;
        this.$memoiseFlags = pyFunc.prototype.$memoiseFlags;
        this.$resolveArgs = pyFunc.prototype.$resolveArgs;
    }
}
buildDescriptor("method_descriptor", "method", pyMethodDescr);
Object.assign(pyMethodDescr.prototype, {
    tp$call(args, kwargs) {
        return this.tp$call(args, kwargs);
    },
    $methodFastCall(args, kwargs) {
        const self = args.shift();
        this.m$checkself(self);
        return this.$meth.call(self, args, kwargs);
    },
    $methodFastCallNoKwargs(args, kwargs) {
        const self = args.shift();
        this.m$checkself(self);
        checkNoKwargs(this.d$name, kwargs);
        return this.$meth.call(self, args);
    },
    $methodCallNoArgs(args, kwargs) {
        const self = args.shift();
        this.m$checkself(self);
        checkNoArgs(this.d$name, args, kwargs);
        return this.$meth.call(self);
    },
    $methodCallOneArg(args, kwargs) {
        const self = args.shift();
        this.m$checkself(self);
        checkOneArg(this.d$name, args, kwargs);
        return this.$meth.call(self, args[0]);
    },
    $methodCallNamedArgs(args, kwargs) {
        const self = args.shift();
        this.m$checkself(self);
        args = keywordArrayToNamedArgs(this.d$name, this.$flags.NamedArgs, args, kwargs, this.$flags.Defaults);
        return this.$meth.call(self, ...args);
    },
    $methodCallMinArgs(args, kwargs) {
        const self = args.shift();
        this.m$checkself(self);
        checkNoKwargs(this.d$name, kwargs);
        checkArgsLen(this.d$name, args, this.$flags.MinArgs, this.$flags.MaxArgs);
        return this.$meth.call(self, ...args);
    },
    $defaultCall(args, kwargs) {
        this.m$checkself(args[0]);
        return pyFunc.prototype.tp$call.call(this, args, kwargs);
    },
    m$checkself(self) {
        if (self === undefined) {
            throw new pyExc.TypeError("descriptor '" + this.d$name + "' of '" + this.d$type.prototype.tp$name + "' object needs an argument");
        }
        this.d$check(self);
    },
    tp$descr_get(obj, type) {
        let ret;
        if ((ret = this.d$check(obj))) {
            return ret;
        }
        return new pyBuiltinFuncOrMethod(this.d$def, obj);
    },
});

pyMethodDescr.prototype.tp$getsets.__text_signature__ = {
    $get: function () {
        return this.d$def.$textsig ? new pyStr(this.d$def.$textsig) : pyNone;
    },
};

/**
 * @constructor
 * @extends {descr_object}
 *
 * @param {pyType} type_obj
 * @param {Object} wrapper_base
 * @param {Function} wrapped
 */
export function pyWrapperDescr(typeobj, slot_def, wrapped) {
    this.d$def = slot_def;
    this.d$type = typeobj;
    this.d$name = wrapped.$name = slot_def.$name;
    this.d$wrapped = wrapped;
}
buildDescriptor("wrapper_descriptor", "slot wrapper", pyWrapperDescr);

Object.assign(pyWrapperDescr.prototype, {
    tp$call(args, kwargs) {
        // make sure the first argument is acceptable as self
        if (args.length < 1) {
            throw new pyExc.TypeError("descriptor '" + this.d$name + "' of '" + this.d$type.prototype.tp$name + "' object needs an argument");
        }
        const self = args.shift();
        if (!self.ob$type.$isSubType(this.d$type)) {
            throw new pyExc.TypeError(
                "descriptor '" + this.d$name + "' requires a '" + this.d$type.prototype.tp$name + "' object but received a '" + typeName(self) + "'"
            );
        }
        return this.raw$call(self, args, kwargs);
    },
    raw$call(self, args, kwargs) {
        // the base might have some flags I guess... see cpython version in descr.c
        this.d$wrapped.$name = this.d$name; // hack since some slots use the same function (__setattr__, __delattr__)
        return this.d$def.$wrapper.call(this.d$wrapped, self, args, kwargs);
    },
    tp$descr_get(obj, type) {
        let ret;
        if ((ret = this.d$check(obj))) {
            return ret;
        }
        return new pyMethodWrapper(this, obj);
    },
});

/**
 * @constructor
 * @extends {descr_object}
 * @param {pyWrapperDescr} type_obj
 * @param wrapper_base
 */
export function pyMethodWrapper(wrapper_descr, self) {
    this.m$descr = wrapper_descr;
    this.m$self = self;
    this.d$def = wrapper_descr.d$def;
    this.d$name = wrapper_descr.d$name;
    this.d$type = wrapper_descr.d$type;
}
buildDescriptor("method_wrapper", undefined, pyMethodWrapper);
Object.assign(pyMethodWrapper.prototype, {
    tp$call(args, kwargs) {
        return this.m$descr.raw$call(this.m$self, args, kwargs);
    },

    tp$richcompare(other, op) {
        if ((op !== "Eq" && op !== "NotEq") || !(other instanceof pyMethodWrapper)) {
            return pyNotImplemented;
        }
        let eq = this.m$self === other.m$self && this.m$descr === other.m$descr;
        return op === "Eq" ? eq : !eq;
    },

    $r() {
        return new pyStr("<method-wrapper '" + this.d$name + "' of " + typeName(this.m$self) + " object>");
    },
});

pyMethodWrapper.prototype.tp$getsets.__self__ = {
    $get() {
        return this.m$self;
    },
};

/**
 *
 * @constructor
 * @extends {descr_object}
 * @param {pyType} typeobj
 * @param {Object} method_def
 *
 * @description
 * This is for classmethods in Native Js Classes, not for "f = classmethod(f)" in Python
 * See dict.fromkeys for a native example
 *
 */
export function pyClassMethodDescr(typeobj, method_def) {
    this.d$def = method_def;
    this.$meth = method_def.$meth; //useful for internal fast calls
    this.d$type = typeobj;
    this.d$name = method_def.$name || "<native JS>";
}
buildDescriptor("classmethod_descriptor", "method", pyClassMethodDescr);
Object.assign(pyClassMethodDescr.prototype, {
    tp$call(args, kwargs) {
        if (args.length < 1) {
            throw new pyExc.TypeError("descriptor '" + this.d$name + "' of '" + this.d$type.prototype.tp$name + "' object needs an argument");
        }
        const self = args.shift();
        const bound = this.tp$descr_get(null, self);
        return bound.tp$call(args, kwargs);
    },

    /**
     * @param {*} obj
     * @param {*} type
     * @param {boolean=} canSuspend
     */
    tp$descr_get(obj, type, canSuspend) {
        if (type === undefined) {
            if (obj !== null) {
                type = type || obj.ob$type;
            } else {
                throw new pyExc.TypeError(
                    "descriptor '" + this.d$name + "' for type '" + this.d$type.prototype.tp$name + "' needs an object or a type"
                );
            }
        }
        if (type.ob$type !== pyType) {
            throw new pyExc.TypeError(
                "descriptor '" +
                    this.d$name +
                    "' for type '" +
                    this.d$type.prototype.tp$name +
                    "' needs a type not a '" +
                    typeName(type) +
                    "' as arg 2"
            );
        }

        if (!type.$isSubType(this.d$type)) {
            throw new pyExc.TypeError(
                "descriptor '" +
                    this.d$name +
                    "' requires a '" +
                    this.d$type.prototype.tp$name +
                    "' object but received a '" +
                    typeName(type) +
                    "' object"
            );
        }
        return new pyBuiltinFuncOrMethod(this.d$def, type);
    },
});
pyClassMethodDescr.prototype.tp$getsets.__text_signature__ = pyMethodDescr.prototype.tp$getsets.__text_signature__;

// // initialize these classes now that they exist do OneTime initialization only takes care of builtinsdict these are in builtins
// [pyMethodDescr, pyGetSetDescr, pyWrapperDescr, pyMethodWrapper, pyClassMethodDescr].forEach((cls) => {
//     setUpSlots(cls);
//     setUpMethods(cls);
//     setUpGetSets(cls);
// });
