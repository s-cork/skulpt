import {
    buildNativeClass,
    pyStr,
    pyExc,
    pyNotImplemented,
    checkCallable,
    checkNone,
    typeName,
    objectHash,
    objectLookupSpecial,
    objectRichCompare,
    objectRepr
} from "../internal";

/**
 * @constructor
 *
 * @param {pyFunc} func
 * @param {pyObject} self
 *
 */
export var pyMethod = buildNativeClass("method", {
    constructor: function method(func, self) {
        if (!this instanceof pyMethod) {
            throw new TypeError("bad call to method constructor, use 'new'");
        }
        this.im_func = func;
        this.im_self = self;
    },
    slots: {
        $r: function () {
            const def_name = "?";
            let name = this.im_func.tp$getattr(pyStr.$qualname) || this.im_func.tp$getattr(pyStr.$name);
            name = (name && name.v) || def_name;
            return new pyStr("<bound method " + name + " of " + objectRepr(this.im_self) + ">");
        },
        tp$hash: function () {
            const selfhash = objectHash(this.im_self);
            const funchash = objectHash(this.im_func);
            return selfhash + funchash;
        },
        tp$call: function (args, kwargs) {
            if (this.im_func.tp$call === undefined) {
                throw new pyExc.TypeError("'" + typeName(this.im_func) + "' is not callable");
            }
            return this.im_func.tp$call([this.im_self, ...args], kwargs);
        },
        tp$new: function (args, kwargs) {
            objectcheckNoKwargs("method", kwargs);
            objectcheckArgsLen("method", args, 2, 2);
            const func = args[0];
            const self = args[1];
            if (!checkCallable(func)) {
                throw new pyExc.TypeError("first argument must be callable");
            }
            if (checkNone(self)) {
                throw new pyExc.TypeError("self must not be None");
            }
            return new pyMethod(func, self);
        },
        tp$richcompare: function (other, op) {
            if ((op != "Eq" && op != "NotEq") || !(other instanceof pyMethod)) {
                return pyNotImplemented;
            }
            let eq;
            try {
                eq = objectRichCompare(this.im_self, other.im_self, "Eq", false) && this.im_func == other.im_func;
            } catch (x) {
                eq = false;
            }
            if (op == "Eq") {
                return eq;
            } else {
                return !eq;
            }
        },
        tp$descr_get: function (obj, obtype) {
            return this;
        },
        tp$getattr: function (pyName, canSuspend) {
            const descr = objectLookupSpecial(this, pyName);
            if (descr !== undefined) {
                return descr;
            }
            return this.im_func.tp$getattr(pyName, canSuspend);
        },
    },
    getsets: {
        __func__: {
            $get: function () {
                return this.im_func;
            },
        },
        __self__: {
            $get: function () {
                return this.im_self;
            },
        },
        __doc__: {
            $get: function () {
                return this.im_func.tp$getattr(pyStr.$doc);
            },
        },
    },
    flags: { sk$suitable_as_base_class: false },
});
