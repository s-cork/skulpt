import {
    setUpInheritance,
    asserts,
    pyDict,
    pyStr,
    pyExc,
    pyObject,
    pyList,
    pyNone,
    pyGetSetDescr,
    pyFunc,
    pyMappingProxy,
    pyTuple,
    pyStaticMethod,
    chainOrSuspend,
    genericGetSetDict,
    checkString,
    checkClass,
    checkDataDescr,
    typeName,
    dunderToSkulpt,
    dunderSlots,
    reservedWords_,
    unfixReserved,
} from "../internal";

/**
 * @constructor
 * @extends {pyObject}
 * @description
 * this should never be called as a constructor
 * instead use {@link buildNativeClass} or
 * {@link buildClass}
 *
 */
export var pyType = function type(obj) {
    if (this instanceof pyType) {
        asserts.assert(false, "calling 'new' pyType is not safe");
    }
    return obj.ob$type;
};
/** @typedef {pyType|Function} */ var typeObject;

Object.defineProperties(
    pyType.prototype,
    /**@lends {pyType.prototype}*/ {
        call: { value: Function.prototype.call },
        apply: { value: Function.prototype.apply },
        ob$type: { value: pyType, writable: true },
        tp$name: { value: "type", writable: true },
        sk$type: { value: true },
    }
);

pyType.prototype.tp$doc = "type(object_or_name, bases, dict)\ntype(object) -> the object's type\ntype(name, bases, dict) -> a new type";

/**
 * @this {typeObject | pyType}
 */
pyType.prototype.tp$call = function (args, kwargs) {
    if (this === pyType) {
        // check the args are 1 - only interested in the 1 argument form if
        // if the nargs and nkeywords != 1 or 3 and zero raise an error
        if (args.length === 1 && (kwargs === undefined || !kwargs.length)) {
            return args[0].ob$type;
        } else if (args.length !== 3) {
            throw new pyExc.TypeError("type() takes 1 or 3 arguments");
        }
    }
    let obj,
        self = this;

    obj = this.prototype.tp$new(args, kwargs);

    if (obj.$isSuspension) {
        return chainOrSuspend(
            obj,
            function (o) {
                obj = o;
                if (!obj.ob$type.$isSubType(self)) {
                    // don't initialize an obj if it's type is not a subtype of this!
                    // typically obj$obtype === self so this check is fast
                    return;
                }
                return obj.tp$init(args, kwargs);
            },
            () => obj
        );
    } else if (!obj.ob$type.$isSubType(self)) {
        return obj;
    } else {
        const res = obj.tp$init(args, kwargs);
        asserts.assert(res !== undefined, "should return None in init method for " + obj.tp$name);
        if (res.$isSuspension) {
            return chainOrSuspend(res, () => obj);
        }
        return obj;
    }
};

pyType.prototype.tp$new = function (args, kwargs) {
    // currently skulpt does not support metatypes...
    // metatype.prototype = this
    if (args.length !== 3) {
        if (args.length === 1 && (kwargs === undefined || !kwargs.length)) {
            return args[0].ob$type;
        }
        throw new pyExc.TypeError("type() takes 1 or 3 arguments");
    }

    let $name, bases, dict;
    $name = args[0];
    bases = args[1];
    dict = args[2];
    // first check that we only have 3 args and they're of the correct type
    // argument dict must be of type dict
    if (dict.tp$name !== "dict") {
        throw new pyExc.TypeError("type() argument 3 must be dict, not " + typeName(dict));
    }
    // checks if name must be string
    if (!checkString($name)) {
        throw new pyExc.TypeError("type() argument 1 must be str, not " + typeName($name));
    }
    $name = $name.toString();
    // argument bases must be of type tuple
    if (bases.tp$name !== "tuple") {
        throw new pyExc.TypeError("type() argument 2 must be tuple, not " + typeName(bases));
    }

    /**
     * @type {!typeObject}
     */
    const klass = function () {
        // klass is essentially a function that gives its instances a dict
        // if we support slots then we might need to have two versions of this
        this.$d = new pyDict();
    };

    // this function tries to match Cpython - the best base is not always bases[0]
    // we require a best bases for checks in __new__ as well as future support for slots
    const best_base = pyType.$best_base(bases.v);

    // get the metaclass from kwargs
    // todo this is not really the right way to do it... but serves as proof of concept
    // let metaclass;
    // if (kwargs) {
    //     const meta_idx = kwargs.indexOf("metaclass");
    //     if (meta_idx >= 0) {
    //         metaclass = kwargs[meta_idx + 1];
    //         kwargs.splice(meta_idx, 2);
    //     }
    // }

    setUpInheritance($name, klass, best_base, this.constructor);

    klass.prototype.tp$bases = bases.v;
    klass.prototype.tp$mro = klass.$buildMRO();

    // some properties of klass objects and instances
    klass.prototype.hp$type = true;
    klass.sk$klass = true;

    // set some defaults which can be overridden by the dict object
    klass.prototype.__module__ = Sk.globals["__name__"];
    klass.prototype.__doc__ = pyNone;

    // set __dict__ if not already on the prototype
    /**@todo __slots__ */
    if (klass.$typeLookup(pyStr.$dict) === undefined) {
        klass.prototype.__dict__ = new pyGetSetDescr(klass, subtype_dict_getset_description);
    }

    // copy properties from dict into klass.prototype
    dict.$items().forEach(([key, val]) => {
        klass.prototype[key.$mangled] = val;
    });
    // make __new__ a static method
    if (klass.prototype.hasOwnProperty("__new__")) {
        const newf = klass.prototype.__new__;
        if (newf instanceof pyFunc) {
            klass.prototype.__new__ = new pyStaticMethod(newf);
        }
    }
    klass.$allocateSlots();

    if (klass.prototype.sk$prototypical) {
        klass.$typeLookup = function (pyName) {
            var jsName = pyName.$mangled;
            return this.prototype[jsName];
        };
    } else {
        klass.$typeLookup = function (pyName) {
            var jsName = pyName.$mangled;
            const mro = this.prototype.tp$mro;
            for (let i = 0; i < mro.length; ++i) {
                const base_proto = mro[i].prototype;
                if (base_proto.hasOwnProperty(jsName)) {
                    return base_proto[jsName];
                }
            }
            return undefined;
        };
    }

    return klass;
};

Object.defineProperties(
    pyType.prototype,
    /**@lends {pyType.prototype}*/ {
        call: { value: Function.prototype.call },
        apply: { value: Function.prototype.apply },
        ob$type: { value: pyType, writable: true },
        tp$name: { value: "type", writable: true },
        sk$type: { value: true },
        sk$attrError: {
            value: function () {
                return "type object '" + this.prototype.tp$name + "'";
            },
            writable: true,
        },
    }
);

/**
 * @param {Array} args
 * @param {Array=} kwargs
 */
pyType.prototype.tp$init = function (args, kwargs) {
    if (args && args.length == 1 && kwargs && kwargs.length) {
        throw new pyExc.TypeError("type.__init__() takes no keyword arguments");
    } else if (args.length != 3 && args.length != 1) {
        throw new pyExc.TypeError("type.__init__() takes 1 or 3 arguments");
    }
    // according to Cpython we just call the object init method here
    return pyObject.prototype.tp$init.call(this, []);
};

pyType.prototype.$r = function () {
    let mod = this.prototype.__module__;
    let cname = "";
    let ctype = "class";
    if (mod && checkString(mod)) {
        cname = mod.v + ".";
    } else {
        mod = null;
    }
    // if (!mod && !this.sk$klass && !Sk.__future__.class_repr) {
    //     ctype = "type";
    // }
    return new pyStr("<" + ctype + " '" + cname + this.prototype.tp$name + "'>");
};
pyType.prototype.tp$getattr = function (pyName, canSuspend) {
    // first check that the pyName is indeed a string
    let res;
    const metatype = this.ob$type;
    // now check whether there is a descriptor on the metatype
    const meta_attribute = metatype.$typeLookup(pyName);

    let meta_get;
    if (meta_attribute !== undefined) {
        meta_get = meta_attribute.tp$descr_get;
        if (meta_get !== undefined && checkDataDescr(meta_attribute)) {
            res = meta_get.call(meta_attribute, this, metatype, canSuspend);
            return res;
        }
    }
    const attribute = this.$typeLookup(pyName);

    if (attribute !== undefined) {
        const local_get = attribute.tp$descr_get;
        if (local_get !== undefined) {
            // null indicates that the descriptor was on the target object itself or a buss
            res = local_get.call(attribute, null, this, canSuspend);
            return res;
        }
        return attribute;
    }
    // attribute was not found so use the meta_get if any
    if (meta_get !== undefined) {
        res = meta_get.call(meta_attribute, this, metatype, canSuspend);
        return res;
    }

    if (meta_attribute !== undefined) {
        return meta_attribute;
    }
    return;
};

pyType.prototype.tp$setattr = function (pyName, value, canSuspend) {
    if (!this.sk$klass) {
        if (value !== undefined) {
            throw new pyExc.TypeError("can't set attributes of built-in/extension type '" + this.prototype.tp$name + "'");
        } else {
            throw new pyExc.TypeError("can't delete attributes on type object '" + this.prototype.tp$name + "'");
        }
    }
    // meta types must follow single inheritance - we could change this and do
    const descr = this.ob$type.$typeLookup(pyName);

    // if it's a data descriptor then call it
    if (descr !== undefined) {
        const f = descr.tp$descr_set;
        if (f) {
            return f.call(descr, this, value, canSuspend);
        }
    }
    // for delattr
    const jsName = pyName.$mangled;

    if (value === undefined) {
        const proto = this.prototype;
        if (!proto.hasOwnProperty(jsName)) {
            throw new pyExcAttributeError("type object '" + this.prototype.tp$name + "' has no attribute '" + pyName.toString() + "'");
        } else {
            delete proto[jsName];
            // delete the slot_func
            // TODO what about slot funcs that are dual slots...
            const slot_name = dunderToSkulpt[jsName];
            if (slot_name !== undefined) {
                delete this.prototype[slot_name];
                if (!proto.sk$prototypical) {
                    this.$allocateGetterSlot(jsName);
                    // if this was a slot func and we are not prototypical
                    // allocate a getter slot in it's place
                }
            }
            return;
        }
    }
    this.prototype[jsName] = value;
    if (jsName in dunderToSkulpt) {
        this.$allocateSlot(jsName, value);
    }
};

pyType.prototype.$typeLookup = function (pyName) {
    const proto = this.prototype;
    const jsName = pyName.$mangled;
    if (proto.sk$prototypical === true) {
        return proto[jsName];
    }
    const mro = proto.tp$mro;

    for (let i = 0; i < mro.length; ++i) {
        const base_proto = mro[i].prototype;
        if (base_proto.hasOwnProperty(jsName)) {
            return base_proto[jsName];
        }
    }
    return undefined;
};

pyType.prototype.$mroMerge_ = function (seqs) {
    this.prototype.sk$prototypical = true; // assume true to start with
    let seq, i, j;
    const res = [];
    for (;;) {
        for (i = 0; i < seqs.length; ++i) {
            seq = seqs[i];
            if (seq.length !== 0) {
                break;
            }
        }
        if (i === seqs.length) {
            // all empty
            return res;
        }
        const cands = [];
        for (i = 0; i < seqs.length; ++i) {
            seq = seqs[i];
            if (seq.length !== 0) {
                const cand = seq[0];

                /* eslint-disable */
                OUTER: for (j = 0; j < seqs.length; ++j) {
                    const sseq = seqs[j];
                    for (let k = 1; k < sseq.length; ++k) {
                        if (sseq[k] === cand) {
                            break OUTER;
                        }
                    }
                }
                /* eslint-enable */

                // cand is not in any sequences' tail -> constraint-free
                if (j === seqs.length) {
                    cands.push(cand);
                }
            }
        }

        if (cands.length === 0) {
            throw new pyExc.TypeError("Inconsistent precedences in type hierarchy");
        }

        const next = cands[0];

        // check prototypical mro
        if (res.length && this.prototype.sk$prototypical) {
            let prevs_prototype = Object.getPrototypeOf(res[res.length - 1].prototype);
            if (prevs_prototype !== next.prototype) {
                this.prototype.sk$prototypical = false;
            }
        }

        // append next to result and remove from sequences
        res.push(next);

        for (i = 0; i < seqs.length; ++i) {
            seq = seqs[i];
            if (seq.length > 0 && seq[0] === next) {
                seq.splice(0, 1);
            }
        }
    }
};

/*
 * C3 MRO (aka CPL) linearization. Figures out which order to search through
 * base classes to determine what should override what. C3 does the "right
 * thing", and it's what Python has used since 2.3.
 *
 * Kind of complicated to explain, but not really that complicated in
 * implementation. Explanations:
 *
 * http://people.csail.mit.edu/jrb/goo/manual.43/goomanual_55.html
 * http://www.python.org/download/releases/2.3/mro/
 * http://192.220.96.201/dylan/linearization-oopsla96.html
 *
 * This implementation is based on a post by Samuele Pedroni on python-dev
 * (http://mail.python.org/pipermail/python-dev/2002-October/029176.html) when
 * discussing its addition to Python.
 */
pyType.prototype.$buildMRO = function () {
    // MERGE(klass + mro(bases) + bases)
    const all = [[this]];
    const kbases = this.prototype.tp$bases;

    for (let i = 0; i < kbases.length; ++i) {
        all.push([...kbases[i].prototype.tp$mro]);
    }

    const bases = [];
    for (let i = 0; i < kbases.length; ++i) {
        bases.push(kbases[i]);
    }
    all.push(bases);

    return this.$mroMerge_(all);
};

pyType.prototype.$isSubType = function (other) {
    return this === other || this.prototype instanceof other || (!this.prototype.sk$prototypical && this.prototype.tp$mro.includes(other));
};

pyType.prototype.$allocateSlots = function () {
    // only allocate certain slots
    const proto = { ...this.prototype };
    for (let dunder in proto) {
        if (dunder in dunderSlots) {
            const dunderFunc = proto[dunder];
            this.$allocateSlot(dunder, dunderFunc);
        }
    }
    if (!proto.sk$prototypical) {
        // we allocate getter slots on non-prototypical klasses that walk the MRO
        // and who don't have the dunder already declared
        for (let dunder in dunderSlots) {
            if (!proto.hasOwnProperty(dunder)) {
                this.$allocateGetterSlot(dunder);
            }
        }
    }
};

pyType.prototype.$allocateSlot = function (dunder, dunderFunc) {
    const slot_def = dunderSlots[dunder];
    const slot_name = slot_def.$slot_name;
    const proto = this.prototype;
    if (proto.hasOwnProperty(slot_name)) {
        delete proto[slot_name]; // required in order to override the multiple inheritance getter slots
    }
    proto[slot_name] = slot_def.$slot_func(dunderFunc);
};

pyType.prototype.$allocateGetterSlot = function (dunder) {
    const slot_name = dunderSlots[dunder].$slot_name;
    const proto = this.prototype;
    if (proto.hasOwnProperty(slot_name)) {
        return; // double slots can be problematic
    }
    Object.defineProperty(proto, slot_name, {
        configurable: true,
        get() {
            const mro = proto.tp$mro;
            for (let i = 1; i < mro.length; i++) {
                const base_proto = mro[i].prototype;
                const property = Object.getOwnPropertyDescriptor(base_proto, slot_name);
                if (property !== undefined && property.value) {
                    return property.value;
                }
            }
        },
    });
};

pyType.prototype.tp$getsets = {
    __base__: {
        $get: function () {
            return this.prototype.tp$base || pyNone;
        },
    },
    __bases__: {
        $get: function () {
            if (this.sk$tuple_bases === undefined) {
                this.sk$tuple_bases = new pyTuple(this.prototype.tp$bases);
                // make sure we always return the same tuple
            }
            return this.sk$tuple_bases;
        },
    },
    __mro__: {
        $get: function () {
            if (this.sk$tuple_mro === undefined) {
                this.sk$tuple_mro = new pyTuple(this.prototype.tp$mro);
                // make sure we always return the same tuple
            }
            return this.sk$tuple_mro;
        },
    },
    __dict__: {
        $get: function () {
            return new pyMappingProxy(this.prototype);
        },
    },
    __doc__: {
        $get: function () {
            const doc = this.$typeLookup(pyStr.$doc);
            if (doc) {
                if (doc.tp$descr_get !== undefined) {
                    return doc.tp$descr_get(null, this);
                }
                return this.prototype.__doc__;
            }
        },
        $set: function (value) {
            check_special_type_attr(this, value, pyStr.$doc);
            this.prototype.__doc__ = value;
        },
    },
    __name__: {
        $get: function () {
            return new pyStr(this.prototype.tp$name);
        },
        $set: function (value) {
            check_special_type_attr(this, value, pyStr.$name);
            if (!checkString(value)) {
                throw new pyExc.TypeError("can only assign string to " + this.prototype.tp$name + ".__name__, not '" + typeName(value) + "'");
            }
            this.prototype.tp$name = value.toString();
        },
    },
    __module__: {
        $get: function () {
            let mod = this.prototype.__module__;
            if (mod && !(mod.ob$type === pyGetSetDescr)) {
                return mod;
            }
            return new pyStr("builtins");
        },
        $set: function (value) {
            // they can set the module to whatever they like
            check_special_type_attr(this, value, pyStr.$module);
            this.prototype.__module__ = value;
        },
    },
};

pyType.prototype.tp$methods = /**@lends {pyType.prototype}*/ {
    mro: {
        $meth: function () {
            return new pyList(this.$buildMRO());
        },
        $flags: { NoArgs: true },
    },
    __dir__: {
        $meth: function __dir__() {
            const seen = new Set();
            const dir = [];
            function push_or_continue(attr) {
                if (attr in reservedWords_) {
                    return;
                }
                attr = unfixReserved(attr);
                if (attr.indexOf("$") !== -1) {
                    return;
                }
                if (!seen.has(attr)) {
                    seen.add(attr);
                    dir.push(new pyStr(attr));
                }
            }
            if (this.prototype.sk$prototypical) {
                for (let attr in this.prototype) {
                    push_or_continue(attr);
                }
            } else {
                const mro = this.prototype.tp$mro;
                for (let i = 0; i < mro.length; i++) {
                    const attrs = Object.getOwnPropertyNames(mro[i].prototype);
                    for (let j = 0; j < attrs.length; j++) {
                        push_or_continue(attrs[j]);
                    }
                }
            }
            return new pyList(dir);
        },
        $flags: { NoArgs: true },
        $doc: "Specialized __dir__ implementation for types.",
    },
};

// we could move this to the prototype but this is called before the klass constructor inheritance is set
// this function is used to determine the class constructor inheritance.
pyType.$best_base = function (bases) {
    if (bases.length === 0) {
        bases.push(pyObject);
    }
    function solid_base(type) {
        // if we support slots we would need to change this function - for now it just checks for the builtin.
        if (type.sk$klass === undefined) {
            return type;
        }
        return solid_base(type.prototype.tp$base);
    }

    let base, winner, candidate, base_i;
    for (let i = 0; i < bases.length; i++) {
        base_i = bases[i];
        if (!checkClass(base_i)) {
            throw new pyExc.TypeError("bases must be 'type' objects");
        } else if (base_i.sk$acceptable_as_base_class === false) {
            throw new pyExc.TypeError("type '" + base_i.prototype.tp$name + "' is not an acceptable base type");
        }
        candidate = solid_base(base_i); // basically the builtin I think
        if (winner === undefined) {
            winner = candidate;
            base = base_i;
        } else if (winner.$isSubType(candidate)) {
            // carry on
        } else if (candidate.$isSubType(winner)) {
            winner = candidate;
            base = base_i;
        } else {
            throw new pyExc.TypeError("multiple bases have instance layout conflicts");
        }
    }
    return base;
};

// similar to generic.getSetDict but have to check if there is a builtin __dict__ descriptor that we should use first!
const subtype_dict_getset_description = {
    $get: function () {
        const dict_descr = get_dict_descr_of_builtn_base(this.ob$type);
        if (dict_descr !== undefined) {
            return dict_descr.tp$descr_get(this, this.ob$type);
        }
        return genericGetSetDict.$get.call(this);
    },
    $set: function (value) {
        const dict_descr = get_dict_descr_of_builtn_base(this.ob$type);
        if (dict_descr !== undefined) {
            return dict_descr.tp$descr_set(this, value);
        }
        return genericGetSetDict.$set.call(this, value);
    },
    $doc: "dictionary for instance variables (if defined)",
    $name: "__dict__",
};

function get_dict_descr_of_builtn_base(type) {
    while (type.prototype.tp$base !== undefined) {
        if (type.sk$klass === undefined) {
            if (type.prototype.hasOwnProperty("__dict__")) {
                const descr = type.prototype.__dict__;
                return checkDataDescr(descr) ? descr : undefined;
            }
        }
        type = type.prototype.tp$base;
    }
}

function check_special_type_attr(type, value, pyName) {
    if (type.sk$klass === undefined) {
        throw new pyExc.TypeError("can't set " + type.prototype.tp$name + "." + pyName);
    }
    if (value === undefined) {
        throw new pyExc.TypeError("can't delete " + type.prototype.tp$name + "." + pyName);
    }
}
