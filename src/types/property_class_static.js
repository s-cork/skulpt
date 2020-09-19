import {
    pyNone,
    pyStr,
    pyFunc,
    pyExc,
    pyDict,
    pyMethod,
    pyCallOrSuspend,
    keywordArrayToNamedArgs,
    genericNew,
    genericGetAttr,
    genericGetSetDict,
    checkNone,
    checkNoKwargs,
    checkOneArg,
    typeName,
    buildNativeClass,
} from "../internal";

/**
 * @constructor
 * @param {pyFunc} fget
 * @param {pyFunc} fset
 * @param {pyFunc} fdel
 * @param {pyStr} doc
 */
export var pyProperty = buildNativeClass("property", {
    constructor: function property(fget, fset, fdel, doc) {
        // this can be uses as an internal function
        // typically these properties will be set in the init method
        if (!this instanceof pyProperty) {
            throw TypeError("bad internal call to property - use 'new'");
        }
        this.prop$get = fget || pyNone;
        this.prop$set = fset || pyNone;
        this.prop$del = fdel || pyNone;
        this.prop$doc = doc || (fget && fget.$doc) || pyNone;
    },
    slots: {
        tp$getattr: genericGetAttr,
        tp$new: genericNew,
        tp$init(args, kwargs) {
            args = keywordArrayToNamedArgs("property", ["fget", "fset", "fdel", "doc"], args, kwargs, new Array(4).fill(pyNone));

            this.prop$get = args[0];
            this.prop$set = args[1];
            this.prop$del = args[2];
            if (checkNone(args[3])) {
                if (!checkNone(args[0])) {
                    this.prop$doc = args[0].$doc || args[3];
                }
            } else {
                this.prop$doc = args[3];
            }
            return pyNone;
        },
        tp$doc:
            "Property attribute.\n\n  fget\n    function to be used for getting an attribute value\n  fset\n    function to be used for setting an attribute value\n  fdel\n    function to be used for del'ing an attribute\n  doc\n    docstring\n\nTypical use is to define a managed attribute x:\n\nclass C(object):\n    def getx(self): return self._x\n    def setx(self, value): self._x = value\n    def delx(self): del self._x\n    x = property(getx, setx, delx, 'I'm the 'x' property.')\n\nDecorators make defining new properties or modifying existing ones easy:\n\nclass C(object):\n    @property\n    def x(self):\n        'I am the 'x' property.'\n        return self._x\n    @x.setter\n    def x(self, value):\n        self._x = value\n    @x.deleter\n    def x(self):\n        del self._x",
        tp$descr_get(obj, type) {
            if (obj === null) {
                return this;
            }
            if (this.prop$get === undefined) {
                throw new pyExc.AttributeError("unreadable attribute");
            }
            return pyCallOrSuspend(this.prop$get, [obj]);
        },
        tp$descr_set(obj, value) {
            let func;
            if (value == null) {
                func = this.prop$del;
            } else {
                func = this.prop$set;
            }
            if (checkNone(func)) {
                const msg = value == null ? "delete" : "set";
                throw new pyExc.AttributeError("can't " + msg + " attribute");
            }
            if (!func.tp$call) {
                throw new pyExc.TypeError("'" + typeName(func) + "' is not callable");
            }

            if (value == null) {
                return func.tp$call([obj]);
            } else {
                return func.tp$call([obj, value]);
            }
        },
    },
    methods: {
        getter: {
            $meth(fget) {
                return new pyProperty(fget, this.prop$set, this.prop$del, this.prop$doc);
            },
            $flags: { OneArg: true },
        },
        setter: {
            $meth(fset) {
                return new pyProperty(this.prop$get, fset, this.prop$del, this.prop$doc);
            },
            $flags: { OneArg: true },
        },
        deleter: {
            $meth(fdel) {
                return new pyProperty(this.prop$get, this.prop$set, fdel, this.prop$doc);
            },
            $flags: { OneArg: true },
        },
    },
    getsets: {
        fget: {
            $get() {
                return this.prop$get;
            },
        },
        fset: {
            $get() {
                return this.prop$set;
            },
        },
        fdel: {
            $get() {
                return this.prop$del;
            },
        },
        __doc__: {
            $get() {
                return this.prop$doc;
            },
            $set(value) {
                value = value || pyNone;
                this.prop$doc = value;
            },
        },
    },
});

/**
 * @constructor
 * @param {pyFunc} callable
 */

export var pyClassMethod = buildNativeClass("classmethod", {
    constructor: function classmethod(callable) {
        // this can be used as an internal function
        // typically callable will be set in the init method if being called by python
        if (!this instanceof pyClassMethod) {
            throw TypeError("bad call internal call to classmethod - use 'new'");
        }
        this.cm$callable = callable;
        this.$d = new pyDict();
    },
    slots: {
        tp$getattr: genericGetAttr,
        tp$new: genericNew,
        tp$init(args, kwargs) {
            checkNoKwargs("classmethod", kwargs);
            checkOneArg("classmethod", args);
            this.cm$callable = args[0];
            return pyNone;
        },
        tp$doc:
            "classmethod(function) -> method\n\nConvert a function to be a class method.\n\nA class method receives the class as implicit first argument,\njust like an instance method receives the instance.\nTo declare a class method, use this idiom:\n\n  class C:\n      @classmethod\n      def f(cls, arg1, arg2, ...):\n          ...\n\nIt can be called either on the class (e.g. C.f()) or on an instance\n(e.g. C().f()).  The instance is ignored except for its class.\nIf a class method is called for a derived class, the derived class\nobject is passed as the implied first argument.\n\nClass methods are different than C++ or Java static methods.\nIf you want those, see the staticmethod builtin.",
        tp$descr_get(obj, type) {
            if (this.cm$callable === undefined) {
                throw new pyExc.RuntimeError("uninitialized classmethod object");
            }
            if (type === undefined) {
                type = obj.ob$type;
            }
            const f = this.cm$callable.tp$descr_get;
            if (f) {
                return f.call(this.cm$callable, type);
            }
            return new pyMethod(this.cm$callable, type);
        },
    },
    getsets: {
        __func__: {
            $get() {
                return this.cm$callable;
            },
        },
        __dict__: genericGetSetDict,
    },
});

/**
 * @constructor
 * @param {pyFunc} callable
 */
export var pyStaticMethod = buildNativeClass("staticmethod", {
    constructor: function staticmethod(callable) {
        // this can be used as an internal function
        // typically callable will be set in the init method if being called by python
        if (!this instanceof pyStaticMethod) {
            throw TypeError("bad call internal call to staticmethod - use 'new'");
        }
        this.sm$callable = callable;
        this.$d = new pyDict();
    },
    slots: {
        tp$getattr: genericGetAttr,
        tp$new: genericNew,
        tp$init(args, kwargs) {
            checkNoKwargs("staticmethod", kwargs);
            checkOneArg("staticmethod", args);
            this.sm$callable = args[0];
            return pyNone;
        },
        tp$doc:
            "staticmethod(function) -> method\n\nConvert a function to be a static method.\n\nA static method does not receive an implicit first argument.\nTo declare a static method, use this idiom:\n\n     class C:\n         @staticmethod\n         def f(arg1, arg2, ...):\n             ...\n\nIt can be called either on the class (e.g. C.f()) or on an instance\n(e.g. C().f()).  The instance is ignored except for its class.\n\nStatic methods in Python are similar to those found in Java or C++.\nFor a more advanced concept, see the classmethod builtin.",
        tp$descr_get(obj, type) {
            if (this.sm$callable === undefined) {
                throw new pyExc.RuntimeError("uninitialized staticmethod object");
            }
            return this.sm$callable;
        },
    },
    getsets: {
        __func__: {
            $get() {
                return this.sm$callable;
            },
        },
        __dict__: genericGetSetDict,
    },
});
