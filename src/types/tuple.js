import {
    buildNativeClass,
    buildIteratorClass,
    pyObject,
    pyStr,
    pyInt,
    arrayFromIterable,
    pyExc,
    pySlice,
    typeName,
    objectRepr,
    objectHash,
    objectRichCompare,
    checkNoKwargs,
    checkArgsLen,
    checkIndex,
    genericIterLengthHintWithArrayMethodDef,
    genericIterNextWithArray,
    genericSeqCompare,
    genericGetAttr,
    asIndexSized,
    chainOrSuspend,
} from "../internal";

/** @typedef {pyObject} */

/**
 * @constructor
 * @param {Array} L
 * @extends {pyObject}
 */
export var pyTuple = buildNativeClass("tuple", {
    constructor: function tuple(L) {
        if (L === undefined) {
            L = [];
        }
        if (!(Array.isArray(L) && this instanceof pyTuple)) {
            throw TypeError("bad call to tuple, use 'new' with an Array");
        }
        this.v = L;
        this.in$repr = false;
    },
    slots: /**@lends {pyTuple.prototype}*/ {
        tp$getattr: genericGetAttr,
        tp$as_sequence_or_mapping: true,
        tp$doc:
            "Built-in immutable sequence.\n\nIf no argument is given, the constructor returns an empty tuple.\nIf iterable is specified the tuple is initialized from iterable's items.\n\nIf the argument is a tuple, the return value is the same object.",
        $r() {
            if (this.in$repr) {
                return new pyStr("(...)");
            }
            this.in$repr = true;
            let ret = this.v.map((x) => objectRepr(x));
            this.in$repr = false;
            ret = ret.join(", ");
            if (this.v.length === 1) {
                ret += ",";
            }
            return new pyStr("(" + ret + ")");
        },
        /**
         * @param {Array} args
         * @param {Array=} kwargs
         * @ignore
         */
        tp$new: function (args, kwargs) {
            // this = pyTuple.prototype or a prototype that inherits from pyTuple.prototype
            if (this !== pyTuple.prototype) {
                return this.$subtype_new(args, kwargs);
            }
            checkNoKwargs("tuple", kwargs);
            checkArgsLen("tuple", args, 0, 1);
            const arg = args[0];
            if (arg === undefined) {
                return new pyTuple([]);
            }
            if (arg.constructor === pyTuple) {
                return arg;
            }
            return chainOrSuspend(arrayFromIterable(arg, true), (L) => new pyTuple(L));
        },
        tp$hash: function () {
            // the numbers and order are taken from Cpython
            let y,
                x = 0x345678,
                mult = 1000003;
            const len = this.v.length;
            for (let i = 0; i < len; ++i) {
                y = objectHash(this.v[i]).v;
                if (y === -1) {
                    return new pyInt(-1);
                }
                x = (x ^ y) * mult;
                mult += 82520 + len + len;
            }
            x += 97531;
            if (x === -1) {
                x = -2;
            }
            return new pyInt(x | 0);
        },
        tp$richcompare: genericSeqCompare,
        tp$iter: function () {
            return new tuple_iter_(this);
        },

        // sequence and mapping slots
        mp$subscript: function (index) {
            if (checkIndex(index)) {
                let i = asIndexSized(index, pyExc.IndexError);
                if (i < 0) {
                    i = this.v.length + i;
                }
                if (i < 0 || i >= this.v.length) {
                    throw new pyExc.IndexError("tuple index out of range");
                }
                return this.v[i];
            } else if (index instanceof pySlice) {
                const ret = [];
                index.sssiter$(this.v.length, (i) => {
                    ret.push(this.v[i]);
                });
                return new pyTuple(ret);
            }
            throw new pyExc.TypeError("tuple indices must be integers or slices, not " + typeName(index));
        },
        sq$length: function () {
            return this.v.length;
        },
        sq$repeat: function (n) {
            n = asIndexSized(n, pyExc.OverflowError);
            if (n === 1 && this.constructor === pyTuple) {
                return this;
            }
            const ret = [];
            for (let i = 0; i < n; i++) {
                this.v.forEach((x) => {
                    ret.push(x);
                });
            }
            return new pyTuple(ret);
        },
        sq$concat: function (other) {
            if (!(other instanceof pyTuple)) {
                throw new pyExc.TypeError("can only concatenate tuple (not '" + typeName(other) + "') to tuple");
            }
            return new pyTuple(this.v.concat(other.v));
        },
        sq$contains: function (ob) {
            for (let it = this.tp$iter(), i = it.tp$iternext(); i !== undefined; i = it.tp$iternext()) {
                if (i === ob || objectRichCompare(i, ob, "Eq")) {
                    return true;
                }
            }
            return false;
        },
    },
    proto: /**@lends {pyTuple.prototype}*/ {
        $subtype_new: function (args, kwargs) {
            const instance = new this.constructor();
            // pass the args but ignore the kwargs for subtyping - these might be handled by the subtypes init method
            const tuple = pyTuple.prototype.tp$new(args);
            instance.v = tuple.v;
            return instance;
        },
        sk$asarray: function () {
            return this.v.slice(0);
        },
        valueOf: function () {
            return this.v;
        },
    },
    methods: /**@lends {pyTuple.prototype}*/ {
        __getnewargs__: {
            $meth: function () {
                return new pyTuple(this.v.slice(0));
            },
            $flags: { NoArgs: true },
            $textsig: "($self, /)",
            $doc: null,
        },
        index: /**@lends {pyTuple.prototype}*/ {
            $meth: function (item, start, end) {
                if ((start !== undefined && !checkIndex(start)) || (end !== undefined && !checkIndex(end))) {
                    // unusually can't have None here so check this first...
                    throw new pyExc.TypeError("slice indices must be integers or have an __index__ method");
                }
                ({ start, end } = pySlice.$indices(this, start, end));
                const self = this.v;
                for (let i = start; i < end; i++) {
                    if (self[i] === item || objectRichCompare(self[i], item, "Eq")) {
                        return new pyInt(i);
                    }
                }
                throw new pyExc.ValueError("tuple.index(x): x not in tuple");
            },
            $flags: { MinArgs: 1, MaxArgs: 3 },
            $textsig: "($self, value, start=0, stop=sys.maxsize, /)",
            $doc: "Return first index of value.\n\nRaises ValueError if the value is not present.",
        },
        count: {
            $meth: function (item) {
                const len = this.v.length;
                const obj = this.v;
                let count = 0;
                for (let i = 0; i < len; ++i) {
                    if (obj[i] === item || objectRichCompare(obj[i], item, "Eq")) {
                        count += 1;
                    }
                }
                return new pyInt(count);
            },
            $flags: { OneArg: true },
            $textsig: "($self, value, /)",
            $doc: "Return number of occurrences of value.",
        },
    },
});

/**
 * @constructor
 * @extends {pyObject}
 * @param {pyTuple} tuple
 * @private
 */
var tuple_iter_ = buildIteratorClass("tuple_iterator", {
    constructor: function tuple_iter_(tuple) {
        this.$index = 0;
        this.$seq = tuple.sk$asarray();
    },
    iternext: genericIterNextWithArray,
    methods: {
        __length_hint__: genericIterLengthHintWithArrayMethodDef,
    },
    flags: { sk$acceptable_as_base_class: false },
});
