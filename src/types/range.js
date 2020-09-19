import {
    JSBI,
    buildNativeClass,
    buildIteratorClass,
    checkIndex,
    checkArgsLen,
    checkNoKwargs,
    pyStr,
    pySlice,
    pyList,
    pyInt,
    pyNotImplemented,
    pyExc,
    typeName,
    objectRichCompare,
    objectRepr,
    asIndexOrThrow,
    asIndexSized,
    asIndex,
    genericGetAttr,
    genericIterLengthHintWithArrayMethodDef,
    genericIterReverseLengthHintMethodDef,
} from "../internal";

/**
 * @constructor
 * @param {number} start
 * @param {number} stop
 * @param {number} step
 * @param {Array<pyInt>=} lst
 */
export var pyRange = buildNativeClass("range", {
    constructor: function range(start, stop, step, lst) {
        if (!(this instanceof pyRange)) {
            throw new TypeError("bad internal call to range, use 'new'");
        }
        if (lst === undefined) {
            return rangeFromPy(start, stop, step);
        }
        this.start = start;
        this.stop = stop;
        this.step = step;
        this.v = lst;
    },
    slots: {
        tp$getattr: genericGetAttr,
        tp$as_sequence_or_mapping: true,
        tp$doc:
            "range(stop) -> range object\nrange(start, stop[, step]) -> range object\n\nReturn an object that produces a sequence of integers from start (inclusive)\nto stop (exclusive) by step.  range(i, j) produces i, i+1, i+2, ..., j-1.\nstart defaults to 0, and stop is omitted!  range(4) produces 0, 1, 2, 3.\nThese are exactly the valid indices for a list of 4 elements.\nWhen step is given, it specifies the increment (or decrement).",
        tp$new: function (args, kwargs) {
            checkNoKwargs("range", kwargs);
            checkArgsLen("range", args, 1, 3);
            return rangeFromPy(...args);
        },
        $r: function () {
            let repr = "range(" + this.start + ", " + this.stop;
            if (this.step != 1) {
                repr += ", " + this.step;
            }
            repr += ")";
            return new pyStr(repr);
        },
        tp$richcompare: function (w, op) {
            if ((op !== "Eq" && op !== "NotEq") || w.ob$type !== pyRange) {
                return pyNotImplemented;
            }
            w = new pyList(w.v);
            return new pyList(this.v).tp$richcompare(w, op);
        },
        tp$iter: function () {
            return new range_iter_(this);
        },
        nb$bool: function () {
            return this.v.length !== 0;
        },
        // sequence and mapping slots
        sq$contains: function (item) {
            const lst = this.v;
            for (let i = 0; i < lst.length; i++) {
                if (objectRichCompare(item, lst[i], "Eq")) {
                    return true;
                }
            }
            return false;
        },
        sq$length: function () {
            return this.v.length;
        },
        mp$subscript: function (index) {
            if (checkIndex(index)) {
                let i = asIndexSized(index);
                if (i < 0) {
                    i = this.v.length + i;
                }
                if (i < 0 || i >= this.v.length) {
                    throw new pyExc.IndexError("range object index out of range");
                }
                return this.v[i];
            } else if (index.constructor === pySlice) {
                const ret = [];
                const lst = this.v;
                index.sssiter$(lst.length, (i) => {
                    ret.push(lst[i]);
                });
                let { start, stop, step } = index.slice$indices(lst.length, true);
                start = asIndex(lst[start]) || this.start;
                stop = asIndex(lst[stop]) || this.stop;
                if (typeof this.step === "number") {
                    step = step * this.step;
                } else {
                    step = JSBI.multiply(this.step, JSBI.BigInt(step));
                }
                return new pyRange(start, stop, step, ret);
            }
            throw new pyExc.TypeError("range indices must be integers or slices, not " + typeName(index));
        },
    },
    getsets: {
        start: {
            $get: function () {
                return new pyInt(this.start);
            },
        },
        step: {
            $get: function () {
                return new pyInt(this.step);
            },
        },
        stop: {
            $get: function () {
                return new pyInt(this.stop);
            },
        },
    },
    methods: {
        __reversed__: {
            $meth: function () {
                return new reverserange_iter_(this);
            },
            $flags: { NoArgs: true },
            $textsig: null,
            $doc: "Return a reverse iterator.",
        },
        // __reduce__: {
        //     $meth: methods.__reduce__,
        //     $flags:{},
        //     $textsig: null,
        //     $doc: "" },
        count: {
            $meth: function (item) {
                let count = 0;
                for (let i = 0; i < this.v.length; i++) {
                    if (objectRichCompare(item, this.v[i], "Eq")) {
                        count++;
                    }
                }
                return new pyInt(count);
            },
            $flags: { OneArg: true },
            $textsig: null,
            $doc: "rangeobject.count(value) -> integer -- return number of occurrences of value",
        },
        index: {
            $meth: function (item) {
                for (let i = 0; i < this.v.length; i++) {
                    if (objectRichCompare(item, this.v[i], "Eq")) {
                        return new pyInt(i);
                    }
                }
                throw new pyExc.ValueError(objectRepr(item) + "is not in range");
            },
            $flags: { OneArg: true },
            $textsig: null,
            $doc: "rangeobject.index(value, [start, [stop]]) -> integer -- return index of value.\nRaise ValueError if the value is not present.",
        },
    },
    proto: {
        sk$asarray: function () {
            return this.v.slice(0);
        },
    },
    flags: {
        sk$acceptable_as_base_class: false,
    },
});

function rangeFromPy(start, stop, step) {
    start = start === undefined ? start : asIndexOrThrow(start);
    stop = stop === undefined ? stop : asIndexOrThrow(stop);
    step = step === undefined ? step : asIndexOrThrow(step);
    if (stop === undefined && step === undefined) {
        stop = start;
        start = 0;
        step = 1;
    } else if (step === undefined) {
        step = 1;
    } else if (step === 0) {
        throw new pyExc.ValueError("range() step argument must not be zero");
    }
    const ret = [];
    if (typeof start === "number" && typeof stop === "number" && typeof step === "number") {
        if (step > 0) {
            for (let i = start; i < stop; i += step) {
                ret.push(new pyInt(i));
            }
        } else {
            for (let i = start; i > stop; i += step) {
                ret.push(new pyInt(i));
            }
        }
    } else {
        // This is going to be slow
        let i;
        start = i = JSBI.BigInt(start);
        step = JSBI.BigInt(step);
        stop = JSBI.BigInt(stop);
        if (JSBI.greaterThan(step, JSBI.__ZERO)) {
            while (JSBI.lessThan(i, stop)) {
                ret.push(new pyInt(JSBI.numberIfSafe(i)));
                i = JSBI.add(i, step);
            }
        } else {
            while (JSBI.greaterThan(i, stop)) {
                ret.push(new pyInt(JSBI.numberIfSafe(i)));
                i = JSBI.add(i, step);
            }
        }
        start = JSBI.numberIfSafe(start);
        step = JSBI.numberIfSafe(step);
        stop = JSBI.numberIfSafe(stop);
    }
    return new pyRange(start, stop, step, ret);
}

var range_iter_ = buildIteratorClass("range_iterator", {
    constructor: function range_iter_(range_obj) {
        this.$index = 0;
        this.$seq = range_obj.v;
    },
    iternext: function () {
        return this.$seq[this.$index++];
        // we could check that the index is not outside of range
        // but it will still return undefined so no need?
    },
    methods: {
        __length_hint__: genericIterLengthHintWithArrayMethodDef,
    },
    flags: { sk$acceptable_as_base_class: false },
});

var reverserange_iter_ = buildIteratorClass("range_reverseiterator", {
    constructor: function rangereverse_iter(range_obj) {
        this.$seq = range_obj.v;
        this.$index = this.$seq.length - 1;
    },
    iternext: function () {
        return this.$seq[this.$index--];
    },
    methods: {
        __length_hint__: genericIterReverseLengthHintMethodDef,
    },
    flags: { sk$acceptable_as_base_class: false },
});

/**
 *
 * @description
 * Python 2 implementations of range and xrange
 *
 * @param {*} start
 * @param {*} stop
 * @param {*} step
 * @ignore
 */
export function py2range(start, stop, step) {
    const ret = rangeFromPy(start, stop, step);
    return new pyList(ret.v);
}
export let py2xrange = py2range;
