import {
    buildNativeClass,
    buildIteratorClass,
    pyObject,
    pyNone,
    pyStr,
    pyExc,
    arrayFromIterable,
    pyCall,
    pySlice,
    pyFalse,
    pyInt,
    chainOrSuspend,
    iterForOrSuspend,
    genericNew,
    genericGetAttr,
    genericSeqCompare,
    genericIterNextWithArray,
    genericIterLengthHintWithArrayMethodDef,
    genericIterReverseLengthHintMethodDef,
    checkArgsLen,
    checkNoKwargs,
    checkIndex,
    checkIterable,
    checkInt,
    keywordArrayToNamedArgs,
    asIndexSized,
    objectRepr,
    objectRichCompare,
    objectIsTrue,
    objectGetIter,
    typeName,
    timSort,
} from "../internal";

/**@typedef {pyObject} */

/**
 * @constructor
 * @param {Array} L
 *
 * @extends {pyObject}
 */
export var pyList = buildNativeClass("list", {
    constructor: function list(L) {
        // this is an internal function and should be called with an array object
        if (L === undefined) {
            L = [];
        }
        if (!(Array.isArray(L) && this instanceof pyList)) {
            throw new TypeError("bad call to list, use 'new' with an Array");
        }
        this.v = L;
        this.in$repr = false;
    },
    slots: /** @lends {pyList.prototype}*/ {
        tp$getattr: genericGetAttr,
        tp$as_sequence_or_mapping: true,
        tp$hash: pyNone,
        tp$doc:
            "Built-in mutable sequence.\n\nIf no argument is given, the constructor creates a new empty list.\nThe argument must be an iterable if specified.",
        tp$new: genericNew,
        tp$init: function (args, kwargs) {
            // this will be an pyList.prototype or a sk$klass.prototype that inherits from pyList.prototype
            checkNoKwargs("list", kwargs);
            checkArgsLen("list", args, 0, 1);
            return chainOrSuspend(arrayFromIterable(args[0], true), (L) => {
                this.v = L;
                return pyNone;
            });
        },
        $r: function () {
            if (this.in$repr) {
                return new pyStr("[...]");
            }
            this.in$repr = true;
            const ret = this.v.map((x) => objectRepr(x));
            this.in$repr = false;
            return new pyStr("[" + ret.join(", ") + "]");
        },
        tp$richcompare: genericSeqCompare,
        tp$iter: function () {
            return new list_iter_(this);
        },

        // sequence and mapping slots
        sq$length: function () {
            return this.v.length;
        },
        sq$concat: function (other) {
            if (!(other instanceof pyList)) {
                throw new pyExc.TypeError("can only concatenate list to list");
            }
            return new pyList(this.v.concat(other.v));
        },
        sq$contains: function (item) {
            for (let it = this.tp$iter(), i = it.tp$iternext(); i !== undefined; i = it.tp$iternext()) {
                if (i === item || objectRichCompare(i, item, "Eq")) {
                    return true;
                }
            }
            return false;
        },
        sq$repeat: function (n) {
            if (!checkIndex(n)) {
                throw new pyExc.TypeError("can't multiply sequence by non-int of type '" + typeName(n) + "'");
            }
            n = asIndexSized(n, pyExc.OverflowError);
            if (n * this.v.length > Number.MAX_SAFE_INTEGER) {
                throw new pyExc.OverflowError();
            }
            const ret = [];
            for (let i = 0; i < n; i++) {
                for (let j = 0; j < this.v.length; j++) {
                    ret.push(this.v[j]);
                }
            }
            return new pyList(ret);
        },
        mp$subscript: function (index) {
            if (checkIndex(index)) {
                let i = asIndexSized(index, pyExc.IndexError);
                i = this.list$inRange(i, "list index out of range");
                return this.v[i];
            } else if (index instanceof pySlice) {
                const ret = [];
                index.sssiter$(this.v.length, (i) => {
                    ret.push(this.v[i]);
                });
                return new pyList(ret);
            }
            throw new pyExc.TypeError("list indices must be integers or slices, not " + typeName(index));
        },
        mp$ass_subscript: function (index, value) {
            if (value === undefined) {
                this.del$subscript(index);
            } else {
                this.ass$subscript(index, value);
            }
            return pyNone;
        },
        sq$inplace_concat: function (other) {
            if (other === this) {
                // prevent an infinite loop
                this.v.push(...this.v);
                return this;
            }
            return chainOrSuspend(
                iterForOrSuspend(objectGetIter(other), (i) => {
                    this.v.push(i);
                }),
                () => this
            );
        },
        sq$inplace_repeat: function (n) {
            if (!checkIndex(n)) {
                throw new pyExc.TypeError("can't multiply sequence by non-int of type '" + typeName(n) + "'");
            }
            n = asIndexSized(n, pyExc.OverflowError);
            const len = this.v.length;
            if (n <= 0) {
                this.v.length = 0;
            } else if (n * len > Number.MAX_SAFE_INTEGER) {
                throw new pyExc.OverflowError();
            }

            for (let i = 1; i < n; i++) {
                for (let j = 0; j < len; j++) {
                    this.v.push(this.v[j]);
                }
            }
            return this;
        },
    },
    methods: /** @lends {pyList.prototype}*/ {
        __reversed__: {
            $meth: function () {
                return new reverselist_iter_(this);
            },
            $flags: { NoArgs: true },
            $textsig: "($self, /)",
            $doc: "Return a reverse iterator over the list.",
        },
        clear: {
            $meth: function () {
                this.v.length = 0;
                return pyNone;
            },
            $flags: { NoArgs: true },
            $textsig: "($self, /)",
            $doc: "Remove all items from list.",
        },
        copy: {
            $meth: function () {
                return new pyList(this.v.slice(0));
            },
            $flags: { NoArgs: true },
            $textsig: "($self, /)",
            $doc: "Return a shallow copy of the list.",
        },
        append: {
            $meth: function (item) {
                this.v.push(item);
                return pyNone;
            },
            $flags: { OneArg: true },
            $textsig: "($self, object, /)",
            $doc: "Append object to the end of the list.",
        },
        insert: {
            $meth: function (i, x) {
                i = asIndexSized(i, pyExc.OverflowError);
                const { start } = pySlice.$indices(this, i);
                this.v.splice(start, 0, x);
                return pyNone;
            },
            $flags: { MinArgs: 2, MaxArgs: 2 },
            $textsig: "($self, index, object, /)",
            $doc: "Insert object before index.",
        },
        extend: {
            $meth: function (iterable) {
                if (iterable === this) {
                    // prevent an infinite loop
                    this.v.push(...this.v);
                    return pyNone;
                }
                return chainOrSuspend(
                    iterForOrSuspend(objectGetIter(iterable), (i) => {
                        this.v.push(i);
                    }),
                    () => pyNone
                );
            },
            $flags: { OneArg: true },
            $textsig: "($self, iterable, /)",
            $doc: "Extend list by appending elements from the iterable.",
        },
        pop: {
            $meth: function (i) {
                if (i === undefined) {
                    i = this.v.length - 1;
                } else {
                    i = asIndexSized(i, pyExc.OverflowError);
                }
                i = this.list$inRange(i, "pop index out of range");
                const res = this.v[i];
                this.v.splice(i, 1);
                return res;
            },
            $flags: { MinArgs: 0, MaxArgs: 1 },
            $textsig: "($self, index=-1, /)",
            $doc: "Remove and return item at index (default last).\n\nRaises IndexError if list is empty or index is out of range.",
        },
        remove: {
            $meth: function (item) {
                const i = this.list$indexOf(item);
                if (i === -1) {
                    throw new pyExc.ValueError("list.remove(x): x not in list");
                }
                this.v.splice(i, 1);
                return pyNone;
            },
            $flags: { OneArg: true },
            $textsig: "($self, value, /)",
            $doc: "Remove first occurrence of value.\n\nRaises ValueError if the value is not present.",
        },
        sort: {
            $meth: function (args, kwargs) {
                if (args.length) {
                    throw new pyExc.TypeError("sort() takes no positional arguments");
                }
                const [key, reverse] = keywordArrayToNamedArgs("sort", ["key", "reverse"], args, kwargs, [pyNone, pyFalse]);
                return this.list$sort(undefined, key, reverse);
            },
            $flags: { FastCall: true },
            $textsig: "($self, /, *, key=None, reverse=False)",
            $doc: "Stable sort *IN PLACE*.",
        },
        index: {
            $meth: function (value, start, stop) {
                if ((start !== undefined && !checkIndex(start)) || (stop !== undefined && !checkIndex(stop))) {
                    // unusually can't have None here so check this first...
                    throw new pyExc.TypeError("slice indices must be integers or have an __index__ method");
                }
                const i = this.list$indexOf(value, start, stop);
                if (i === -1) {
                    throw new pyExc.ValueError(objectRepr(value) + " is not in list");
                }
                return new pyInt(i);
            },
            $flags: { MinArgs: 1, MaxArgs: 3 },
            $textsig: "($self, value, start=0, stop=sys.maxsize, /)",
            $doc: "Return first index of value.\n\nRaises ValueError if the value is not present.",
        },
        count: {
            $meth: function (item) {
                let count = 0;
                const len = this.v.length;
                for (let i = 0; i < len; i++) {
                    if (this.v[i] === item || objectRichCompare(this.v[i], item, "Eq")) {
                        count += 1;
                    }
                }
                return new pyInt(count);
            },
            $flags: { OneArg: true },
            $textsig: "($self, value, /)",
            $doc: "Return number of occurrences of value.",
        },
        reverse: {
            $meth: function () {
                this.list$reverse();
                return pyNone;
            },
            $flags: { NoArgs: true },
            $textsig: "($self, /)",
            $doc: "Reverse *IN PLACE*.",
        },
    },
    proto: /** @lends {pyList.prototype}*/ {
        sk$asarray: function () {
            return this.v.slice(0);
        },
        list$inRange: function (i, msg) {
            if (i < 0) {
                i += this.v.length;
            }
            if (i >= 0 && i < this.v.length) {
                return i;
            }
            throw new pyExc.IndexError(msg);
        },
        list$indexOf: function (item, start, end) {
            ({ start, end } = pySlice.$indices(this, start, end));
            for (let i = start; i < end && i < this.v.length; i++) {
                if (this.v[i] === item || objectRichCompare(this.v[i], item, "Eq")) {
                    return i;
                }
            }
            return -1;
        },
        list$reverse: function () {
            this.v.reverse();
        },
        ass$subscript: function (index, value) {
            if (checkIndex(index)) {
                this.ass$index(index, value);
            } else if (index instanceof pySlice) {
                const { start, stop, step } = index.slice$indices(this.v.length, true);
                if (step === 1) {
                    this.ass$slice(start, stop, value);
                } else {
                    this.ass$ext_slice(index, value);
                }
            } else {
                throw new pyExc.TypeError("list indices must be integers or slices, not " + typeName(index));
            }
        },
        ass$index: function (index, value) {
            let i = asIndexSized(index, pyExc.IndexError);
            i = this.list$inRange(i, "list assignment index out of range");
            this.v[i] = value;
        },
        ass$slice: function (start, stop, iterable) {
            if (!checkIterable(iterable)) {
                throw new pyExc.TypeError("can only assign an iterable");
            }
            const vals = arrayFromIterable(iterable);
            this.v.splice(start, stop - start, ...vals);
        },
        ass$ext_slice: function (slice, iterable) {
            const indices = [];
            slice.sssiter$(this.v.length, (i) => {
                indices.push(i);
            });
            if (!checkIterable(iterable)) {
                throw new pyExc.TypeError("must assign iterable to extended slice");
            }
            const vals = arrayFromIterable(iterable);
            if (indices.length !== vals.length) {
                throw new pyExc.ValueError("attempt to assign sequence of size " + vals.length + " to extended slice of size " + indices.length);
            }
            for (let i = 0; i < indices.length; i++) {
                this.v.splice(indices[i], 1, vals[i]);
            }
        },
        del$subscript: function (index) {
            if (checkIndex(index)) {
                this.del$index(index);
            } else if (index instanceof pySlice) {
                const { start, stop, step } = index.slice$indices(this.v.length, true);
                if (step === 1) {
                    this.del$slice(start, stop);
                } else {
                    this.del$ext_slice(index, step > 0 ? 1 : 0);
                }
            } else {
                throw new pyExc.TypeError("list indices must be integers, not " + typeName(index));
            }
        },
        del$index: function (index) {
            let i = asIndexSized(index, pyExc.IndexError);
            i = this.list$inRange(i, "list assignment index out of range");
            this.v.splice(i, 1);
        },
        del$slice: function (start, stop) {
            this.v.splice(start, stop - start);
        },
        del$ext_slice: function (slice, offdir) {
            let dec = 0; // offset of removal for next index (because we'll have removed, but the iterator is giving orig indices)
            slice.sssiter$(this.v.length, (i) => {
                this.v.splice(i - dec, 1);
                dec += offdir;
            });
        },
        valueOf: function () {
            return this.v;
        },
    },
});

/**
 * @param {?=} cmp optional (not supported in py3)
 * @param {?=} key optional (keyword only argument in py3)
 * @param {?=} reverse optional (keyword only argument in py3)
 */
pyList.prototype.list$sort = function sort(cmp, key, reverse) {
    const has_key = key != null && key !== pyNone;
    const has_cmp = cmp != null && cmp !== pyNone;
    let rev, item;
    if (reverse === undefined) {
        rev = false;
    } else if (!checkInt(reverse)) {
        throw new pyExc.TypeError("an integer is required");
    } else {
        rev = objectIsTrue(reverse);
    }
    const timsort = new timSort(this);

    this.v = [];
    const zero = new pyInt(0);

    if (has_key) {
        if (has_cmp) {
            timsort.lt = function (a, b) {
                var res = pyCall(cmp, [a[0], b[0]]);
                return objectRichCompare(res, zero, "Lt");
            };
        } else {
            timsort.lt = function (a, b) {
                return objectRichCompare(a[0], b[0], "Lt");
            };
        }
        for (let i = 0; i < timsort.listlength; i++) {
            item = timsort.list.v[i];
            const keyvalue = pyCall(key, [item]);
            timsort.list.v[i] = [keyvalue, item];
        }
    } else if (has_cmp) {
        timsort.lt = function (a, b) {
            var res = pyCall(cmp, [a, b]);
            return objectRichCompare(res, zero, "Lt");
        };
    }

    if (rev) {
        timsort.list.list$reverse();
    }

    timsort.sort();

    if (rev) {
        timsort.list.list$reverse();
    }

    if (has_key) {
        for (let j = 0; j < timsort.listlength; j++) {
            item = timsort.list.v[j][1];
            timsort.list.v[j] = item;
        }
    }

    const mucked = this.sq$length() > 0;

    this.v = timsort.list.v;

    if (mucked) {
        throw new pyExc.ValueError("list modified during sort");
    }

    return pyNone;
};

pyList.py2$methods = {
    sort: {
        $name: "sort",
        $meth: function (args, kwargs) {
            const [cmp, key, reverse] = keywordArrayToNamedArgs("sort", ["cmp", "key", "reverse"], args, kwargs, [pyNone, pyNone, pyFalse]);
            return this.list$sort(cmp, key, reverse);
        },
        $flags: {
            FastCall: true, // named args might be better here but one of the args is pyFalse
            // and bool class does not exist yet. So use FastCall instead.
        },
        $textsig: "($self, cmp=None, key=None, reverse=False)",
        $doc: "Stable sort *IN PLACE*.",
    },
};

/**
 * @constructor
 * @extends {pyObject}
 * @param {pyList} lst
 * @private
 */
var list_iter_ = buildIteratorClass("list_iterator", {
    constructor: function list_iter_(lst) {
        this.$index = 0;
        this.$seq = lst.v;
    },
    iternext: genericIterNextWithArray,
    methods: {
        __length_hint__: genericIterLengthHintWithArrayMethodDef,
    },
    flags: { sk$acceptable_as_base_class: false },
});

/**
 * @constructor
 * @extends {pyObject}
 * @param {pyList} lst
 * @private
 */
var reverselist_iter_ = buildIteratorClass("list_reverseiterator", {
    constructor: function reverselist_iter_(lst) {
        this.$index = lst.v.length - 1;
        this.$seq = lst.v;
    },
    iternext: function () {
        const item = this.$seq[this.$index--];
        if (item === undefined) {
            this.tp$iternext = () => undefined;
            return undefined;
        }
        return item;
    },
    methods: {
        __length_hint__: genericIterReverseLengthHintMethodDef,
    },
    flags: { sk$acceptable_as_base_class: false },
});
