import {
    pyObject,
    pyNone,
    pyNotImplemented,
    pyExc,
    pyTuple,
    pyInt,
    checkNone,
    checkArgsLen,
    checkNoKwargs,
    buildNativeClass,
    genericGetAttr,
    objectRepr,
    JSBI,
    asIndexSized,
    asIndexOrThrow,
} from "../internal";

/** @typedef {pyObject} */

/**
 * @constructor
 * @extends {pyObject}
 * @param {pyObject} start
 * @param {pyObject=} stop
 * @param {pyObject=} step
 */
export var pySlice = buildNativeClass("slice", {
    constructor: function slice(start, stop, step) {
        if (!(this instanceof pySlice)) {
            throw new TypeError("bad internal call to slice, use 'new'");
        }
        if (stop === undefined && step === undefined) {
            stop = start;
            start = pyNone;
        }
        if (stop === undefined) {
            stop = pyNone;
        }
        if (step === undefined) {
            step = pyNone;
        }
        this.start = start;
        this.stop = stop;
        this.step = step;
    },
    slots: /**@lends {pySlice.prototype} */ {
        tp$getattr: genericGetAttr,
        tp$doc: "slice(stop)\nslice(start, stop[, step])\n\nCreate a slice object.  This is used for extended slicing (e.g. a[0:10:2]).",
        tp$hash: pyNone,
        tp$new: function (args, kwargs) {
            checkNoKwargs("slice", kwargs);
            checkArgsLen("slice", args, 1, 3);
            return new pySlice(...args);
        },
        $r: function () {
            const a = objectRepr(this.start);
            const b = objectRepr(this.stop);
            const c = objectRepr(this.step);
            return new pyStr("slice(" + a + ", " + b + ", " + c + ")");
        },
        tp$richcompare: function (w, op) {
            // w not a slice - it's not subclassable so no need to use instanceof here
            if (w.ob$type !== pySlice) {
                return pyNotImplemented;
            }
            // This is how CPython does it
            const t1 = new pyTuple([this.start, this.stop, this.step]);
            const t2 = new pyTuple([w.start, w.stop, w.step]);
            return t1.tp$richcompare(t2, op);
        },
    },
    getsets: /**@lends {pySlice.prototype} */ {
        start: {
            $get: function () {
                return this.start;
            },
        },
        step: {
            $get: function () {
                return this.step;
            },
        },
        stop: {
            $get: function () {
                return this.stop;
            },
        },
    },
    methods: /**@lends {pySlice.prototype} */ {
        indices: {
            $meth: function indices(length) {
                length = asIndexSized(length, pyExc.OverflowError); // let's not support lengths larger than this.
                if (length < 0) {
                    throw new pyExc.TypeError("length should not be negative");
                }
                const { start, stop, step } = this.slice$indices(length);
                return new pyTuple([new pyInt(start), new pyInt(stop), new pyInt(step)]);
            },
            $doc:
                "S.indices(len) -> (start, stop, stride)\n\nAssuming a sequence of length len, calculate the start and stop\nindices, and the stride length of the extended slice described by\nS. Out of bounds indices are clipped in a manner consistent with the\nhandling of normal slices.",
            $textsig: null,
            $flags: { OneArg: true },
        },
    },
    proto: /**@lends {pySlice.prototype} */ {
        slice$as_indices(sized) {
            let start, stop, step;
            const msg = "slice indices must be integers or None or have an __index__ method";
            let getIndex;
            if (sized) {
                getIndex = (idx) => asIndexSized(idx, null, msg);
            } else {
                getIndex = (idx) => asIndexOrThrow(idx, msg);
            }
            if (checkNone(this.step)) {
                step = 1;
            } else {
                step = getIndex(this.step);
                if (step === 0) {
                    throw new pyExc.ValueError("slice step cannot be zero");
                }
            }
            if (checkNone(this.start)) {
                start = null;
            } else {
                start = getIndex(this.start);
            }
            if (checkNone(this.stop)) {
                stop = null;
            } else {
                stop = getIndex(this.stop);
            }
            return { start: start, stop: stop, step: step };
        },
        $wrt(length, start, stop, step, sized) {
            let negIdx;
            if (sized) {
                negIdx = (idx) => (JSBI.__isBigInt(idx) ? JSBI.add(idx, JSBI.BigInt(length)) : idx + length);
            } else {
                negIdx = (idx) => idx + length;
            }

            if (step > 0) {
                if (start === null) {
                    start = 0;
                } else if (start < 0) {
                    start = negIdx(start);
                    if (start < 0) {
                        start = 0;
                    }
                }
                if (stop === null) {
                    stop = length;
                } else if (stop > length) {
                    stop = length;
                } else if (stop < 0) {
                    stop = negIdx(stop);
                }
            } else {
                if (start === null) {
                    start = length - 1;
                } else if (start >= length) {
                    start = length - 1;
                } else if (start < 0) {
                    start = negIdx(start);
                }
                if (stop === null) {
                    stop = -1;
                } else if (stop < 0) {
                    stop = negIdx(stop);
                    if (stop < 0) {
                        stop = -1;
                    }
                }
            }

            return { start: start, stop: stop, step: step };
        },
        slice$indices: function (length, sized) {
            let { start, stop, step } = this.slice$as_indices(true, sized);
            return this.$wrt(length, start, stop, step, sized);
        },
        /**
         * used by objects like str, list, tuple that can return a slice
         * @param {number} len
         * @param {Function} f
         */
        sssiter$: function (len, f) {
            let { start, stop, step } = this.slice$indices(len, true);
            if (step > 0) {
                for (let i = start; i < stop; i += step) {
                    f(i);
                }
            } else {
                for (let i = start; i > stop; i += step) {
                    f(i);
                }
            }
        },
    },
    flags: {
        sk$acceptable_as_base_class: false,
    },
});

pySlice.$indices = function (pyObj, start, end) {
    const len = pyObj.sq$length();
    const msg = "slice indices must be integers or have an __index__ method";
    if (start === undefined || checkNone(start)) {
        start = 0;
    } else {
        start = asIndexSized(start, null, msg);
        if (start < 0) {
            start = start + len;
            if (start < 0) {
                start = 0;
            }
        }
    }

    if (end === undefined || checkNone(end)) {
        end = len;
    } else {
        end = asIndexSized(end, null, msg);
        if (end < 0) {
            end = end + len;
            if (end < 0) {
                end = 0;
            }
        } else if (end > len) {
            end = len;
        }
    }
    return { start: start, end: end };
};
