import {
    buildNativeClass,
    buildIteratorClass,
    pyDict,
    pyNotImplemented,
    pyNone,
    pyStr,
    pyCall,
    arrayFromIterable,
    pyExc,
    checkAnySet,
    checkNoKwargs,
    checkArgsLen,
    chainOrSuspend,
    iterArrayOrSuspend,
    iterForOrSuspend,
    Break,
    genericNew,
    genericGetAttr,
    genericIterNextWithArrayCheckSize,
    genericIterLengthHintWithArrayMethodDef,
    typeName,
    objectRepr,
    objectIsTrue,
    objectGetIter,
    objectHash,
} from "../internal";

const set_private_ = {};

/**
 *
 * @constructor
 * @param {Array} S
 *
 * @description
 * internally call new pySet with an array of python objects
 */
export var pySet = buildNativeClass("set", {
    constructor: function set(S) {
        if (S === undefined) {
            S = [];
        }
        if (!(Array.isArray(S) && this instanceof pySet)) {
            throw new TypeError("Bad call to set - must be called with an Array and 'new'");
        }
        const L = [];
        S.forEach((x) => {
            L.push(x);
            L.push(true);
        });
        this.v = new pyDict(L);
        this.in$repr = false;
    },
    slots: /**@lends {pySet.prototype}*/ {
        tp$getattr: genericGetAttr,
        tp$as_number: true,
        tp$as_sequence_or_mapping: true,
        tp$hash: pyNone,
        tp$doc: "set() -> new empty set object\nset(iterable) -> new set object\n\nBuild an unordered collection of unique elements.",
        tp$init: function (args, kwargs) {
            checkNoKwargs("set", kwargs);
            checkArgsLen("set", args, 0, 1);
            this.set$clear();
            const iterable = args[0];
            return chainOrSuspend(iterable && this.set$update(iterable), () => pyNone);
        },
        tp$new: genericNew,
        $r: function () {
            if (this.in$repr) {
                return new pyStr(typeName(this) + "(...)");
            }
            this.in$repr = true;
            const ret = this.sk$asarray().map((x) => objectRepr(x));
            this.in$repr = false;
            if (Sk.__future__.python3) {
                if (ret.length === 0) {
                    return new pyStr(typeName(this) + "()");
                } else if (this.ob$type !== pySet) {
                    // then we are a subclass of set
                    return new pyStr(typeName(this) + "({" + ret.join(", ") + "})");
                } else {
                    return new pyStr("{" + ret.join(", ") + "}");
                }
            } else {
                return new pyStr(typeName(this) + "([" + ret.join(", ") + "])");
            }
        },
        tp$iter: function () {
            return new set_iter_(this);
        },
        tp$richcompare: function (other, op) {
            if (!checkAnySet(other)) {
                return pyNotImplemented;
            }
            switch (op) {
                case "NotEq":
                case "Eq":
                    let res;
                    if (this === other) {
                        res = true;
                    } else if (this.get$size() !== other.get$size()) {
                        res = false;
                    } else {
                        res = objectIsTrue(this.set$issubset(other));
                    }
                    return op === "Eq" ? res : !res;
                case "LtE":
                    return this === other || objectIsTrue(this.set$issubset(other));
                case "GtE":
                    return this === other || objectIsTrue(other.set$issubset(this));
                case "Lt":
                    return this.get$size() < other.get$size() && objectIsTrue(this.set$issubset(other));
                case "Gt":
                    return this.get$size() > other.get$size() && objectIsTrue(other.set$issubset(this));
            }
        },
        // number slots
        nb$subtract: numberSlot(function (other) {
            return this.difference.$meth.call(this, other);
        }),
        nb$and: numberSlot(function (other) {
            return this.intersection.$meth.call(this, other);
        }),
        nb$or: numberSlot(function (other) {
            return this.union.$meth.call(this, other);
        }),
        nb$xor: numberSlot(function (other) {
            return this.symmetric_difference.$meth.call(this, other);
        }),
        nb$inplace_subtract: numberSlot(function (other) {
            if (other === this) {
                other = other.set$copy();
            }
            return chainOrSuspend(this.difference_update.$meth.call(this, other), () => this);
        }),
        nb$inplace_and: numberSlot(function (other) {
            return chainOrSuspend(this.intersection_update.$meth.call(this, other), () => this);
        }),
        nb$inplace_or: numberSlot(function (other) {
            return chainOrSuspend(this.update.$meth.call(this, other), () => this);
        }),
        nb$inplace_xor: numberSlot(function (other) {
            if (other === this) {
                other = other.set$copy();
            }
            return chainOrSuspend(this.symmetric_difference_update.$meth.call(this, other), () => this);
        }),
        // sequence or mapping slots
        sq$length: function () {
            return this.get$size();
        },
        sq$contains: function (entry) {
            entry = entry_or_hashable_set(entry);
            return this.v.sq$contains(entry);
        },
    },
    methods: /**@lends {pySet.prototype}*/ {
        add: {
            $meth: function (item) {
                this.set$add(item);
                return pyNone;
            },
            $flags: { OneArg: true },
            $textsig: null,
            $doc: "Add an element to a set.\n\nThis has no effect if the element is already present.",
        },
        clear: {
            $meth: function () {
                this.set$clear();
                return pyNone;
            },
            $flags: { NoArgs: true },
            $textsig: null,
            $doc: "Remove all elements from this set.",
        },
        copy: {
            $meth: function () {
                return this.set$copy();
            },
            $flags: { NoArgs: true },
            $textsig: null,
            $doc: "Return a shallow copy of a set.",
        },
        discard: {
            $meth: function (entry) {
                entry = entry_or_hashable_set(entry);
                this.set$discard(entry);
                return pyNone;
            },
            $flags: { OneArg: true },
            $textsig: null,
            $doc: "Remove an element from a set if it is a member.\n\nIf the element is not a member, do nothing.",
        },
        difference: {
            $meth: function (...args) {
                const result = this.set$copy();
                return chainOrSuspend(
                    iterArrayOrSuspend(args, (arg) => result.set$difference_update(arg)),
                    () => result
                );
            },
            $flags: { MinArgs: 0 },
            $textsig: null,
            $doc: "Return the difference of two or more sets as a new set.\n\n(i.e. all elements that are in this set but not the others.)",
        },
        difference_update: {
            $meth: function (...args) {
                return chainOrSuspend(
                    iterArrayOrSuspend(args, (arg) => this.set$difference_update(arg)),
                    () => pyNone
                );
            },
            $flags: { MinArgs: 0 },
            $textsig: null,
            $doc: "Remove all elements of another set from this set.",
        },
        intersection: {
            $meth: function (...args) {
                return this.set$intersection_multi(...args);
            },
            $flags: { MinArgs: 0 },
            $textsig: null,
            $doc: "Return the intersection of two sets as a new set.\n\n(i.e. all elements that are in both sets.)",
        },
        intersection_update: {
            $meth: function (...args) {
                return chainOrSuspend(this.set$intersection_multi(...args), (res) => {
                    this.swap$bodies(res);
                    return pyNone;
                });
            },
            $flags: { MinArgs: 0 },
            $textsig: null,
            $doc: "Update a set with the intersection of itself and another.",
        },
        isdisjoint: {
            $meth: function (other) {
                // requires all items in this to not be in other
                return chainOrSuspend(
                    iterForOrSuspend(objectGetIter(other), (i) => {
                        if (this.sq$contains(i)) {
                            return new Break(pyFalse);
                        }
                    }),
                    (res) => res || pyTrue
                );
            },
            $flags: { OneArg: true },
            $textsig: null,
            $doc: "Return True if two sets have a null intersection.",
        },
        issubset: {
            $meth: function (other) {
                if (!checkAnySet(other)) {
                    other = this.set$make_basetype(other);
                }
                return chainOrSuspend(other, (other_set) => this.set$issubset(other_set));
            },
            $flags: { OneArg: true },
            $textsig: null,
            $doc: "Report whether another set contains this set.",
        },
        issuperset: {
            $meth: function (other) {
                if (!checkAnySet(other)) {
                    other = this.set$make_basetype(other);
                }
                return chainOrSuspend(other, (other_set) => other_set.set$issubset(this));
            },
            $flags: { OneArg: true },
            $textsig: null,
            $doc: "Report whether this set contains another set.",
        },
        pop: {
            $meth: function () {
                if (this.get$size() === 0) {
                    throw new pyExc.KeyError("pop from an empty set");
                }
                const item = pyCall(this.v.popitem, [this.v]);
                return item.v[0];
            },
            $flags: { NoArgs: true },
            $textsig: null,
            $doc: "Remove and return an arbitrary set element.\nRaises KeyError if the set is empty.",
        },
        // __reduce__: {
        //     $meth: methods.$__reduce__,
        //     $flags:{},
        //     $textsig: null,
        //     $doc: "Return state information for pickling." },
        remove: {
            $meth: function (entry) {
                const tmp = entry_or_hashable_set(entry);
                if (this.v.mp$lookup(tmp)) {
                    return this.v.mp$ass_subscript(tmp);
                }
                throw new pyExc.KeyError(entry);
            },
            $flags: { OneArg: true },
            $textsig: null,
            $doc: "Remove an element from a set; it must be a member.\n\nIf the element is not a member, raise a KeyError.",
        },
        // __sizeof__: {
        //     $meth: methods.$__sizeof__,
        //     $flags:{},
        //     $textsig: null,
        //     $doc: "S.__sizeof__() -> size of S in memory, in bytes" },
        symmetric_difference: {
            $meth: function (other) {
                let other_set;
                return chainOrSuspend(
                    this.set$make_basetype(other),
                    (os) => {
                        other_set = os;
                        return other_set.set$symmetric_diff_update(this);
                    },
                    () => other_set
                );
            },
            $flags: { OneArg: true },
            $textsig: null,
            $doc: "Return the symmetric difference of two sets as a new set.\n\n(i.e. all elements that are in exactly one of the sets.)",
        },
        symmetric_difference_update: {
            $meth: function (other) {
                if (!checkAnySet(other)) {
                    other = this.set$make_basetype(other);
                }
                return chainOrSuspend(
                    other,
                    (other_set) => this.set$symmetric_diff_update(other_set),
                    () => pyNone
                );
            },
            $flags: { OneArg: true },
            $textsig: null,
            $doc: "Update a set with the symmetric difference of itself and another.",
        },
        union: {
            $meth: function (...args) {
                const result = this.set$copy();
                return chainOrSuspend(
                    iterArrayOrSuspend(args, (arg) => result.set$update(arg)),
                    () => result
                );
            },
            $flags: { MinArgs: 0 },
            $textsig: null,
            $doc: "Return the union of sets as a new set.\n\n(i.e. all elements that are in either set.)",
        },
        update: {
            $meth: function (...args) {
                return chainOrSuspend(
                    iterArrayOrSuspend(args, (arg) => this.set$update(arg)),
                    () => pyNone
                );
            },
            $flags: { MinArgs: 0 },
            $textsig: null,
            $doc: "Update a set with the union of itself and others.",
        },
    },
    proto: /**@lends {pySet.prototype}*/ Object.assign(set_private_, {
        sk$asarray: function () {
            return this.v.sk$asarray();
        },
        get$size: function () {
            // this method cannot be overriden by subclasses
            return this.v.sq$length();
        },
        set$add: function (entry) {
            this.v.mp$ass_subscript(entry, true);
        },
        set$make_basetype: function (other) {
            return chainOrSuspend(arrayFromIterable(other, true), (S) => new this.sk$builtinBase(S));
        },
        set$discard: function (entry) {
            return this.v.pop$item(entry);
        },
        set$clear: function () {
            this.v = new pyDict([]);
        },
        set$copy: function () {
            const setCopy = new this.sk$builtinBase();
            setCopy.v = this.v.dict$copy();
            return setCopy;
        },
        set$difference_update: function (other) {
            return iterForOrSuspend(objectGetIter(other), (entry) => {
                this.set$discard(entry);
            });
        },
        set$intersection: function (other) {
            const res = new this.sk$builtinBase();
            return chainOrSuspend(
                iterForOrSuspend(objectGetIter(other), (entry) => {
                    if (this.sq$contains(entry)) {
                        res.set$add(entry);
                    }
                }),
                () => res
            );
        },
        set$intersection_multi: function (...args) {
            if (!args.length) {
                return this.set$copy();
            }
            let result = this;
            return chainOrSuspend(
                iterArrayOrSuspend(args, (arg) => {
                    return chainOrSuspend(result.set$intersection(arg), (res) => {
                        result = res;
                    });
                }),
                () => result
            );
        },
        set$issubset: function (other_set) {
            const thisLength = this.get$size();
            const otherLength = other_set.get$size();
            if (thisLength > otherLength) {
                // every item in this set can't be in other if it's shorter!
                return pyFalse;
            }
            for (let it = this.tp$iter(), i = it.tp$iternext(); i !== undefined; i = it.tp$iternext()) {
                if (!other_set.sq$contains(i)) {
                    return pyFalse;
                }
            }
            return pyTrue;
        },
        set$symmetric_diff_update: function (other) {
            return iterForOrSuspend(objectGetIter(other), (entry) => {
                const discarded = this.set$discard(entry);
                if (discarded === undefined) {
                    this.set$add(entry);
                }
            });
        },
        set$update: function (other) {
            return iterForOrSuspend(objectGetIter(other), (entry) => {
                this.set$add(entry);
            });
        },
        swap$bodies: function (other) {
            this.v = other.v;
        },
    }),
});

const set_proto = pySet.prototype;
/**
 * @constructor
 * @param {Array.<Object>} S
 */
export var pyFrozenSet = buildNativeClass("frozenset", {
    constructor: function frozenset(S) {
        // takes in an array of py objects
        if (S === undefined) {
            S = [];
        }
        if (!(Array.isArray(S) && this instanceof pyFrozenSet)) {
            throw new TypeError("bad call to frozen set - must be called with an Array and 'new'");
        }
        const L = [];
        for (let i = 0; i < S.length; i++) {
            L.push(S[i]);
            L.push(true);
        }
        this.v = new pyDict(L);
        this.in$repr = false;
    },
    slots: /**@lends {pyFrozenSet.prototype}*/ {
        tp$getattr: genericGetAttr,
        tp$as_number: true,
        tp$as_sequence_or_mapping: true,
        tp$doc:
            "frozenset() -> empty frozenset object\nfrozenset(iterable) -> frozenset object\n\nBuild an immutable unordered collection of unique elements.",
        tp$hash: function () {
            // numbers taken from Cpython 2.7 hash function
            let hash = 1927868237;
            const entries = this.sk$asarray();
            hash *= entries.length + 1;
            for (let i = 0; i < entries.length; i++) {
                const h = objectHash(entries[i]);
                hash ^= (h ^ (h << 16) ^ 89869747) * 3644798167;
            }
            hash = hash * 69069 + 907133923;
            return hash;
        },
        /**
         * @param {Array} args
         * @param {Array=} kwargs
         * @ignore
         */
        tp$new: function (args, kwargs) {
            if (this !== pyFrozenSet.prototype) {
                return this.$subtype_new(args, kwargs);
            }
            checkNoKwargs("frozenset", kwargs);
            checkArgsLen("frozenset", args, 0, 1);
            const arg = args[0];
            if (arg !== undefined && arg.ob$type === pyFrozenSet) {
                return arg;
            }
            return chainOrSuspend(arrayFromIterable(arg, true), (S) => {
                if (!S.length) {
                    // in cpython frozenset() on an empty set returns the same object
                    return $emptyFrozenSet;
                }
                return new pyFrozenSet(S);
            });
        },
        $r: set_proto.$r,
        tp$iter: set_proto.tp$iter,
        tp$richcompare: set_proto.tp$richcompare,
        // number slots
        nb$subtract: set_proto.nb$subtract,
        nb$and: set_proto.nb$and,
        nb$or: set_proto.nb$or,
        nb$xor: set_proto.nb$xor,
        // as mapping
        sq$length: set_proto.sq$length,
        sq$contains: set_proto.sq$contains,
    },
    methods: /**@lends {pyFrozenSet.prototype}*/ {
        copy: Object.assign({}, set_proto.copy.d$def, {
            $meth: function () {
                return this.constructor === this.sk$builtinBase ? this : new pyFrozenSet(this.sk$asarray());
            },
        }),
        difference: set_proto.difference.d$def,
        intersection: set_proto.intersection.d$def,
        isdisjoint: set_proto.isdisjoint.d$def,
        issubset: set_proto.issubset.d$def,
        issuperset: set_proto.issuperset.d$def,
        // __reduce__: set_proto.__reduce__,
        // __sizeof__: set_proto.__sizeof__,
        symmetric_difference: set_proto.symmetric_difference.d$def,
        union: set_proto.union.d$def,
    },
    proto: /**@lends {pyFrozenSet.prototype}*/ Object.assign(
        {
            $subtype_new: function (args, kwargs) {
                const instance = new this.constructor();
                // pass the args but ignore the kwargs for subtyping
                return chainOrSuspend(pyFrozenSet.prototype.tp$new(args), (frozenset) => {
                    instance.v = frozenset.v;
                    return instance;
                });
            },
        },
        set_private_
    ),
});

const $emptyFrozenSet = Object.create(pyFrozenSet.prototype, {
    v: { value: new pyDict([]), enumerable: true },
    in$repr: { value: false, enumerable: true },
});

function numberSlot(f) {
    return function (other) {
        if (!checkAnySet(other)) {
            return pyNotImplemented;
        }
        return f.call(this, other);
    };
}

function entry_or_hashable_set(entry) {
    if (entry instanceof pySet && entry.tp$hash === pyNone) {
        // cpython nuance
        entry = new pyFrozenSet(arrayFromIterable(entry));
    }
    return entry;
}

/**
 * @constructor
 * @extends {pyObject}
 * @param {pySet|pyFrozenSet} set or frozenset
 * @private
 */
var set_iter_ = buildIteratorClass("set_iterator", {
    constructor: function set_iter_(set) {
        this.$index = 0;
        this.$seq = set.sk$asarray();
        this.$orig = set;
    },
    iternext: genericIterNextWithArrayCheckSize,
    methods: {
        __length_hint__: genericIterLengthHintWithArrayMethodDef,
    },
    flags: { sk$acceptable_as_base_class: false },
});
