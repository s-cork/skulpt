import {
    buildNativeClass,
    pyStr,
    pyNone,
    pyFunc,
    pyNotImplemented,
    checkNoKwargs,
    checkOneArg,
    checkNoArgs,
    checkArgsLen,
    keywordArrayToNamedArgs,
    genericGetAttr,
    sysModules,
    typeName,
} from "../internal";

/**
 * @constructor
 * pyBuiltinFuncOrMethod
 *
 * @description
 * this constructor is used by all builtin functions or methods
 * the tp$call method is defined based on the flags
 *
 * A good way to determine the flags is to look at the textsignature of a function
 * or find the equivalent function in CPython and map the flags to skulpt flags
 * flags: {
 * NoArgs: true, raises exception if there are args or kwargs (METH_NOARGS)
 * OneArg: true, raises exception if there is more than one Arg (METH_O)
 *
 * MinArgs: int (also assumes noKwargs)
 * MaxArgs: int optional (used in conjuntiontion with MinArgs)
 *
 * NamedArgs: Array e.g. [null, null, "name1", "name2"]
 *            use null for posonly args
 *            ensures that the total number of args (including kwargs) equals the named args
 *            the call sig will check the kwarg names are valid
 *            the call sig applies Defaults (if set) to any named args
 * Defaults: Array (used in conjunction with NamedArgs, can use [undefined] see dict.pop for use case)
 *
 * FastCall && NoKwargs: true, check NoKewords and pass args the function will handle these (METH_FASTCALL)
 * FastCall: pass args, kwargs - the function will handle this (METH_FASTCALL || KEYWORDS)
 *
 * if no flags are set then the tp$call = function.prototype.tp$call
 *
 * @param {Object} method_def
 * @param {*} self
 * @param {string=} module
 */
export var pyBuiltinFuncOrMethod = buildNativeClass("builtin_function_or_method", {
    constructor: function builtin_function_or_method(method_def, self, module) {
        // here we set this.$meth binding it's call signature to self
        this.$meth = method_def.$meth.bind(self);
        this.$doc = method_def.$doc;
        this.$self = self;
        this.$module = module ? new pyStr(module) : pyNone;
        this.$name = method_def.$name || method_def.$meth.name || "<native JS>";
        this.m$def = method_def;

        // useful to set the $textsig to determine the correct flags
        this.$textsig = method_def.$textsig;

        // override the default tp$call method if there is a valid flag
        const flags = method_def.$flags || {};
        this.$flags = flags;

        if (flags.FastCall && flags.NoKwargs) {
            this.tp$call = this.$fastCallNoKwargs;
        } else if (flags.FastCall) {
            this.tp$call = this.$meth;
        } else if (flags.NoArgs) {
            this.tp$call = this.$callNoArgs;
        } else if (flags.OneArg) {
            this.tp$call = this.$callOneArg;
        } else if (flags.NamedArgs) {
            this.tp$call = this.$callNamedArgs;
        } else if (flags.MinArgs !== undefined) {
            this.tp$call = this.$callMinArgs;
        } else {
            this.func_code = this.$meth;
            this.tp$call = this.$defaultCallMethod;
        }
    },
    proto: {
        $fastCallNoKwargs(args, kwargs) {
            checkNoKwargs(this.$name, kwargs);
            return this.$meth(args);
        },
        $callNoArgs(args, kwargs) {
            checkNoArgs(this.$name, args, kwargs);
            return this.$meth();
        },
        $callOneArg(args, kwargs) {
            checkOneArg(this.$name, args, kwargs);
            return this.$meth(args[0]);
        },
        $callNamedArgs(args, kwargs) {
            args = keywordArrayToNamedArgs(this.$name, this.$flags.NamedArgs, args, kwargs, this.$flags.Defaults);
            return this.$meth(...args);
        },
        $callMinArgs(args, kwargs) {
            checkNoKwargs(this.$name, kwargs);
            checkArgsLen(this.$name, args, this.$flags.MinArgs, this.$flags.MaxArgs);
            return this.$meth(...args);
        },
        $defaultCallMethod(args, kwargs) {
            // default implementation for all currently created functions that have yet to be be converted
            // and don't utilise flagged calls
            if (this.$self !== undefined) {
                return pyFunc.prototype.tp$call.call(this, [this.$self, ...args], kwargs);
            }
            return pyFunc.prototype.tp$call.call(this, args, kwargs);
        },
        $memoiseFlags: pyFunc.prototype.$memoiseFlags,
        $resolveArgs: pyFunc.prototype.$resolveArgs,
    },
    flags: { sk$acceptable_as_base_class: false },
    slots: {
        tp$getattr: genericGetAttr,
        $r() {
            if (this.$self === undefined) {
                return new pyStr("<built-in function " + this.$name + ">");
            }
            return new pyStr("<built-in method " + this.$name + " of " + typeName(this.$self) + " object>");
        },
        tp$call(args, kwargs) {
            return this.tp$call(args, kwargs);
        },
        tp$richcompare(other, op) {
            if ((op !== "Eq" && op !== "NotEq") || !(other instanceof pyBuiltinFuncOrMethod)) {
                return pyNotImplemented;
            }
            let eq = this.$self === other.$self && this.m$def.$meth === other.m$def.$meth;
            return op === "Eq" ? eq : !eq;
        },
    },
    getsets: {
        __module__: {
            $get() {
                return this.$module;
            },
            $set(value) {
                value = value || pyNone;
                this.$module = value;
            },
        },
        __doc__: {
            $get() {
                return this.$doc ? new pyStr(this.$doc) : pyNone;
            },
        },
        __name__: {
            $get() {
                return new pyStr(this.$name);
            },
        },
        __text_signature__: {
            $get() {
                return new pyStr(this.$textsig);
            },
        },
        __self__: {
            $get() {
                // self might be a module object - which means it was created inside a module before the module existed
                // so look the name up in sysmodules
                return this.$self || sysModules.mp$lookup(this.$module) || pyNone;
            },
        },
    },
});
