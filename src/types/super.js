import {
    buildNativeClass,
    pyStr,
    pyNone,
    pyExc,
    pyCallOrSuspend,
    genericGetAttr,
    genericNew,
    checkNoKwargs,
    checkArgsLen,
    checkClass,
    typeName,
} from "../internal";

/**
 * @constructor
 * pySuper
 */
export var pySuper = buildNativeClass("super", {
    constructor: function super_(type, obj, obj_type) {
        // internally we never use this method
        // use pyCall(pySuper, [a_type, obj]);
        if (!(this instanceof pySuper)) {
            throw new TypeError("bad call to super, use 'new'");
        }
        this.type = type;
        this.obj = obj;
        this.obj_type = obj_type;
    },
    slots: {
        tp$doc:
            "super() -> same as super(__class__, <first argument>)\n" +
            "super(type) -> unbound super object\nsuper(type, obj) -> bound super object; requires isinstance(obj, type)\n" +
            "super(type, type2) -> bound super object; requires issubclass(type2, type)\n" +
            "Typical use to call a cooperative superclass method:\n" +
            "class C(B):\n    def meth(self, arg):\n        super().meth(arg)\nThis works for class methods too:\nclass C(B):\n    @classmethod\n    def cmeth(cls, arg):\n        super().cmeth(arg)\n",
        tp$new: genericNew,
        tp$init: function (args, kwargs) {
            checkNoKwargs("super", kwargs);
            checkArgsLen("super", args, 1, 2);
            const a_type = args[0];
            const other_self = args[1];
            if (!checkClass(a_type)) {
                throw new pyExc.TypeError("must be type, not " + typeName(a_type));
            }
            this.obj = other_self;
            this.type = a_type;
            if (this.obj != null) {
                this.obj_type = this.$supercheck(a_type, this.obj);
            }
            return pyNone;
        },
        $r: function () {
            if (this.obj) {
                return new pyStr("<super: <class '" + this.type.prototype.tp$name + "'>, <" + typeName(this.obj) + " object>>");
            }
            return new pyStr("<super: <class '" + this.type.prototype.tp$name + "'>, NULL>");
        },
        tp$getattr: function (pyName, canSuspend) {
            let starttype = this.obj_type;
            if (starttype == null) {
                return genericGetAttr.call(this, pyName, canSuspend);
            }
            const mro = starttype.prototype.tp$mro;
            const n = mro.length;
            /* We want __class__ to return the class of the super object
            (i.e. super, or a subclass), not the class of su->obj. */
            if (pyName === pyStr.$class) {
                return genericGetAttr.call(this, pyName, canSuspend);
            }
            /* No need to check the last one: it's gonna be skipped anyway.  */
            let i;
            for (i = 0; i + 1 < n; i++) {
                if (this.type === mro[i]) {
                    break;
                }
            }
            i++;
            if (i >= n) {
                return genericGetAttr.call(this, pyName, canSuspend);
            }
            const jsName = pyName.$mangled;

            let tmp, res;
            while (i < n) {
                tmp = mro[i].prototype;
                if (tmp.hasOwnProperty(jsName)) {
                    res = tmp[jsName];
                }

                if (res !== undefined) {
                    const f = res.tp$descr_get;
                    if (f !== undefined) {
                        /* Only pass 'obj' param if this is instance-mode super
                               (See SF ID #743627)  */
                        res = f.call(res, this.obj === starttype ? null : this.obj, starttype);
                    }
                    return res;
                }
                i++;
            }
        },
        tp$descr_get: function (obj, obtype) {
            if (obj === null || this.obj != null) {
                return this;
            }
            if (this.ob$type !== pySuper) {
                /* If su is an instance of a (strict) subclass of super,
                call its type */
                return pyCallOrSuspend(this.ob$type, [this.type, obj]);
            } else {
                /* Inline the common case */
                const obj_type = this.$supercheck(this.type, obj);
                return new pySuper(this.type, obj, obj_type);;
            }
        },
    },
    getsets: {
        __thisclass__: {
            $get: function () {
                return this.type;
            },
            $doc: "the class invoking super()",
        },
        __self__: {
            $get: function () {
                return this.obj || pyNone;
            },
            $doc: "the instance invoking super(); may be None",
        },
        __self_class__: {
            $get: function () {
                return this.obj_type || pyNone;
            },
            $doc: "the type of the instance invoking super(); may be None",
        },
    },
    proto: {
        $supercheck: function (type, obj) {
            /* Check that a super() call makes sense.  Return a type object.

            obj can be a class, or an instance of one:

            - If it is a class, it must be a subclass of 'type'.      This case is
                used for class methods; the return value is obj.

            - If it is an instance, it must be an instance of 'type'.  This is
                the normal case; the return value is obj.__class__.

            /* Check for first bullet above (special case) */
            if (checkClass(obj) && obj.$isSubType(type)) {
                return obj;
            }
            /* Normal case */
            if (obj.ob$type.$isSubType(type)) {
                return obj.ob$type;
            } else {
                /* Try the slow way */
                const class_attr = obj.tp$getattr(pyStr.$class);
                if (class_attr !== undefined && class_attr !== obj.ob$type && checkClass(class_attr)) {
                    if (class_attr.$isSubType(type)) {
                        return class_attr;
                    }
                }
            }
            throw new pyExc.TypeError("super(type, obj): obj must be an instance or subtype of type");
        },
    },
});
