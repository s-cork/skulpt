import {
    asserts,
    pyStr,
    pyObject,
    pyDict,
    pyType,
    pyNone,
    pyGetSetDescr,
    pyWrapperDescr,
    pyMethodDescr,
    pyClassMethodDescr,
    pyBuiltinFuncOrMethod,
    genericSelfIter,
    genericGetAttr,
    genericNew,
    genericNewMethodDef,
    dunderSlots,
    subSlots,
    sequenceAndMappingSlots,
    reflectedNumberSlots,


} from "../internal";

/**
 * @description
 * Set up inheritance between two Python classes. This allows only for single
 * inheritance -- multiple inheritance is not supported by Javascript.
 * multiple inheritance is dealt with by tp$getattr implementations
 *
 * Javascript's inheritance is prototypal. This means that properties must
 * be defined on the superclass' prototype in order for subclasses to inherit
 * them.
 *
 * ```
 * Sk.superclass.myProperty                 # will NOT be inherited
 * Sk.superclass.prototype.myProperty       # will be inherited
 * ```
 *
 * In order for a class to be subclassable, it must (directly or indirectly)
 * inherit from pyObject so that it will be properly initialized in
 * {@link Sk.doOneTimeInitialization} (in src/import.js). Further, all Python
 * builtins should inherit from pyObject.
 *
 * @param {string} childName The Python name of the child (subclass).
 * @param {!typeObject} child     The subclass.
 * @param {typeObject=} [parent=pyObject]    The base of child.
 * @param {typeObject=} [metaclass=pyType]
 *
 * @returns {!typeObject}
 *
 */
export function setUpInheritance(childName, child, parent, metaclass) {
    metaclass = metaclass || pyType;
    parent = parent || pyObject;
    Object.setPrototypeOf(child, metaclass.prototype);
    Object.setPrototypeOf(child.prototype, parent.prototype);

    // child.prototype = Object.create(parent.prototype);
    Object.defineProperties(child.prototype, {
        constructor: { value: child, writable: true },
        ob$type: { value: child, writable: true },
        tp$name: { value: childName, writable: true },
        tp$base: { value: parent, writable: true },
    });

    return child;
}

/**
 * This function is called in {@link Sk.doOneTimeInitialization}
 * and {@link buildNativeClass}
 *
 * @param  {!typeObject} child
 *
 */
export function setUpBuiltinMro(child) {
    let parent = child.prototype.tp$base || undefined;
    const bases = parent === undefined ? [] : [parent];
    if (parent === pyObject || parent === undefined) {
        child.sk$baseClass = true;
        Object.defineProperties(child.prototype, {
            sk$builtinBase: { value: child, writable: true },
        });
    }
    const mro = [child];
    for (let base = parent; base !== undefined; base = base.prototype.tp$base) {
        if (!base.sk$abstract) {
            mro.push(base);
        }
    }
    // internally we keep the mro and bases as array objects
    // the wrapper descripor returns the tuple of the array
    Object.defineProperties(child.prototype, {
        sk$prototypical: { value: true, writable: true },
        tp$mro: { value: mro, writable: true },
        tp$bases: { value: bases, writable: true },
    });
}
/**
 *
 * @param {!typeObject} klass
 * @param {Object=} getsets
 */
export function setUpGetSets(klass, getsets) {
    getsets = getsets || klass.prototype.tp$getsets || {};
    for (let getset_name in getsets) {
        const gsd = getsets[getset_name];
        gsd.$name = getset_name;
        klass.prototype[getset_name] = new pyGetSetDescr(klass, gsd);
    }
    // we check this later in onetimeInitialization
    // it also means that you can create more getsets and then allocate them later
    Object.defineProperty(klass.prototype, "tp$getsets", {
        value: null,
        writable: true,
        enumerable: false,
    });
}

/**
 *
 * @param {typeObject} klass
 * @param {Object=} methods
 */
export function setUpMethods(klass, methods) {
    methods = methods || klass.prototype.tp$methods || {};
    for (let method_name in methods) {
        const method_def = methods[method_name];
        method_def.$name = method_name;
        klass.prototype[method_name] = new pyMethodDescr(klass, method_def);
    }
    Object.defineProperty(klass.prototype, "tp$methods", {
        value: null,
        writable: true,
        enumerable: false,
    });
}

/**
 *
 * @param {typeObject} klass
 * @param {Object=} methods
 */
export function setUpClassMethods(klass, methods) {
    methods = methods || {};
    for (let method_name in methods) {
        const method_def = methods[method_name];
        method_def.$name = method_name;
        klass.prototype[method_name] = new pyClassMethodDescr(klass, method_def);
    }
}

/**
 *
 * @param {typeObject} klass
 * @param {Object=} slots
 */
export function setUpSlots(klass, slots) {
    const proto = klass.prototype;
    const op2shortcut = {
        Eq: "ob$eq",
        NotEq: "ob$ne",
        Gt: "ob$gt",
        GtE: "ob$ge",
        Lt: "ob$lt",
        LtE: "ob$le",
    };
    if (slots === undefined) {
        // make a shallow copy so that we don't accidently consider parent slots
        // maybe better to use .hasOwnProperty but this allows for more code reuse
        slots = { ...klass.prototype };
    }

    if (slots.tp$new === genericNew) {
        slots.tp$new = genericNew(klass);
    }

    for (let slot_name in slots) {
        Object.defineProperty(proto, slot_name, {
            value: slots[slot_name],
            writable: true,
            enumerable: false,
        });
    }

    // set up richcompare skulpt slots
    if (slots.tp$richcompare !== undefined) {
        for (let op in op2shortcut) {
            const shortcut = op2shortcut[op];
            slots[shortcut] =
                slots[shortcut] ||
                function (other) {
                    return this.tp$richcompare(other, op);
                };
            Object.defineProperty(proto, shortcut, {
                value: slots[shortcut],
                writable: true,
                enumerable: false,
            });
        }
    }

    if (slots.tp$new !== undefined) {
        proto.__new__ = new pyBuiltinFuncOrMethod(genericNewMethodDef, klass);
        Object.defineProperty(proto, "sk$staticNew", { value: klass, writable: true });
    }

    function wrap_func(klass, dunder_name, wrapped_func) {
        const slot_def = dunderSlots[dunder_name];
        // we do this here because in the generic.wrapperCall methods the wrapped_func
        // the wrapped func should have a $name property and a $flags property (for minArgs)
        klass.prototype[dunder_name] = new pyWrapperDescr(klass, slot_def, wrapped_func);
    }
    function set_up_slot(slot_name, slots, klass, slot_mapping) {
        const wrapped_func = slots[slot_name];
        // some slots get multpile dunders
        const dunder_name = slot_mapping[slot_name];
        if (typeof dunder_name === "string") {
            wrap_func(klass, dunder_name, wrapped_func);
        } else {
            for (let i = 0; i < dunder_name.length; i++) {
                wrap_func(klass, dunder_name[i], wrapped_func);
            }
        }
    }

    // main slots
    const main_slots = subSlots.main_slots;
    for (let slot_name in main_slots) {
        if (slots[slot_name] !== undefined) {
            set_up_slot(slot_name, slots, klass, main_slots);
        }
    }

    // __hash__
    const hash = slots.tp$hash;
    if (hash == pyNone) {
        klass.prototype.__hash__ = hash;
    } else if (hash !== undefined) {
        wrap_func(klass, "__hash__", hash);
    }

    // as_number_slots
    const number_slots = subSlots.number_slots;
    const reflected_slots = reflectedNumberSlots;
    if (slots.tp$as_number !== undefined) {
        for (let slot_name in reflected_slots) {
            if (slots[slot_name] !== undefined) {
                const reflect_name = reflected_slots[slot_name].reflected;
                const reflected_slot = slots[reflect_name];
                if (reflected_slot !== undefined) {
                    if (reflected_slot === null) {
                        delete slots[reflect_name]; // e.g. Counter doesn't want reflected slots
                    }
                    continue;
                }
                const slot = reflected_slots[slot_name].slot;
                if (slot == null) {
                    // then the reflected slot is the same as non reflected slot - like nb$add
                    (slots[reflect_name] = slots[slot_name]),
                    Object.defineProperty(proto, reflect_name, {
                        value: slots[slot_name],
                        writable: true,
                        enumerable: false,
                    });
                } else {
                    (slots[reflect_name] = slot),
                    Object.defineProperty(proto, reflect_name, {
                        value: slot,
                        writable: true,
                        enumerable: false,
                    });
                }
            }
        }
        for (let slot_name in number_slots) {
            if (slots[slot_name] !== undefined) {
                set_up_slot(slot_name, slots, klass, number_slots);
            }
        }
    }

    // as_sequence_or_mapping slots
    const sequence_and_mapping_slots = subSlots.sequence_and_mapping_slots;
    if (slots.tp$as_sequence_or_mapping !== undefined) {
        for (let slot_name in sequenceAndMappingSlots) {
            if (slots[slot_name] !== undefined) {
                const equiv_slots = sequenceAndMappingSlots[slot_name];
                for (let i = 0; i < equiv_slots.length; i++) {
                    const equiv_slot = equiv_slots[i];
                    slots[equiv_slot] = slots[slot_name];
                    Object.defineProperty(proto, equiv_slot, {
                        value: slots[slot_name],
                        writable: true,
                        enumerable: false,
                    });
                }
            }
        }
        for (let slot_name in sequence_and_mapping_slots) {
            if (slots[slot_name] !== undefined) {
                set_up_slot(slot_name, slots, klass, sequence_and_mapping_slots);
            }
        }
    }
    // a flag to check during doOneTimeInitialization
    Object.defineProperty(proto, "sk$slots", {
        value: null,
        writeable: true,
    });
}

/**
 * @function
 * @param {string} typename
 * @param {Object} options An object literal that provides the functionality of the typobject
 *
 *
 * @description
 * this can be called to create a native typeobj
 * options include
 * ```
 * - base: default to {@link pyObject}
 * - meta: default to {@link pyType}
 *
 * - slots: skulpt slot functions that will be allocated slot wrappers
 * - methods: method objects `{$meth: Function, $flags: callmethod, $doc: string, $textsic: string|null}`,
 * - getsets: getset objects `{$get: Function, $set: Function, $doc: string}`,
 * - classmethods: classmethod objects `{$meth: Function, $flags: callmethod, $doc: string, $textsic: string|null}`,
 *
 * - flags: Object allocated directly onto class like `klass.sk$acceptable_as_base_class`
 * - proto: Object allocated onto the prototype useful for private methods
 * ```
 * See most builtin type objects for examples
 *
 * @returns {FunctionConstructor}
 */
export function buildNativeClass(typename, options) {
    options = options || {};
    /**@type {typeObject} */
    let typeobject;
    if (!options.hasOwnProperty("constructor")) {
        typeobject = function klass() {
            this.$d = new pyDict();
        };
    } else {
        typeobject = options.constructor;
    }
    let mod;
    if (typename.includes(".")) {
        // you should define the module like "collections.defaultdict" for static classes
        const mod_typename = typename.split(".");
        typename = mod_typename.pop();
        mod = mod_typename.join(".");
    }
    const meta = options.meta || undefined;

    setUpInheritance(typename, typeobject, options.base, meta);

    // would need to change this for multiple inheritance.
    setUpBuiltinMro(typeobject);

    if (options.slots !== undefined) {
        // only setUpSlotWrappers if slots defined;
        setUpSlots(typeobject, /**@lends {typeobject.prototype} */ options.slots);
    }

    setUpMethods(typeobject, options.methods || {});
    setUpGetSets(typeobject, options.getsets || {});
    setUpClassMethods(typeobject, options.classmethods || {});

    if (mod !== undefined) {
        typeobject.prototype.__module__ = new pyStr(mod);
    }
    const type_proto = typeobject.prototype;
    const proto = options.proto || {};
    for (let p in proto) {
        Object.defineProperty(type_proto, p, {
            value: proto[p],
            writable: true,
            enumerable: !(p.includes("$") || p in Object.prototype), // only make these private in these cases
        });
    }
    const flags = options.flags || {};
    for (let f in flags) {
        typeobject[f] = flags[f];
    }

    if (typeobject.prototype.hasOwnProperty("tp$iter")) {
        typeobject.prototype[Symbol.iterator] = function () {
            return this.tp$iter()[Symbol.iterator]();
        };
    }

    // str might not have been created yet
    if (pyStr !== undefined && typeobject.prototype.hasOwnProperty("tp$doc") && !typeobject.prototype.hasOwnProperty("__doc__")) {
        const docstr = typeobject.prototype.tp$doc || null;
        if (typeof docstr === "string") {
            typeobject.prototype.__doc__ = new pyStr(docstr);
        } else {
            typeobject.prototype.__doc__ = pyNone;
        }
    }
    return typeobject;
}

/**
* @function
* 
* @param {string} typename e.g. "itertools.chain"
* @param {Object} iterator minimum options `{constructor: function, iternext: function}`
*
* @description
* effectively a wrapper for easily defining an iterator
* `tp$iter` slot is added and returns self
*
* define a constructor in the usual way
*
* define `tp$iternext` using iternext in the object literal
* mostly as a convenience
* you can also define `tp$iternext` in the slots which will take priority
*
* the main benefit of this helper function is to reduce some repetitive code for defining an iterator class
*
* If you want a generic iterator see {@link Sk.miscival.iterator}
*
* 
* @example
* Sk.builtin.tuple_iter_ = buildIteratorClass("tuple_iterator", {
  constructor: function tuple_iter_(tuple) {
      this.$index = 0;
      this.$seq = tuple.sk$asarray();
  },
  iternext: function () {
      if (this.$index >= this.$seq.length) {
          return undefined;
      }
      return this.$seq[this.$index++];
  }
});
* 
* @returns {FunctionConstructor}
*/
export function buildIteratorClass(typename, iterator) {
    asserts.assert(iterator.hasOwnProperty("constructor"), "must provide a constructor");
    iterator.slots = iterator.slots || {};
    iterator.slots.tp$iter = genericSelfIter;
    iterator.slots.tp$iternext = iterator.slots.tp$iternext || iterator.iternext;
    iterator.slots.tp$getattr = iterator.slots.tp$getattr || genericGetAttr;
    let ret = buildNativeClass(typename, iterator);
    built$iterators.push(ret);

    ret.prototype[Symbol.iterator] = function () {
        return {
            next: () => {
                const nxt = this.tp$iternext();
                if (nxt === undefined) {
                    return { done: true };
                }
                return { value: nxt, done: false };
            },
        };
    };
    return ret;
}

export const built$iterators = [];

export function setUpModuleMethods(module_name, module, method_defs) {
    for (let method_name in method_defs) {
        const method_def = method_defs[method_name];
        method_def.$name = method_def.$name || method_name;
        module[method_name] = new pyBuiltinFuncOrMethod(method_def, undefined, module_name);
    }
}
