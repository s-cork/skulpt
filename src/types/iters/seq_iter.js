import {
    buildIteratorClass,
    pyExc,
    pyInt,
    tryCatchOrSuspend,
    retryOptionalSuspensionOrThrow,
    typeName, 
} from "../../internal";


/**
 * @constructor
 * @extends {pyObject}
 * @param {pyObject} seq
 * @private
 */
export var pySeqIter = buildIteratorClass("iterator", {
    constructor: function seq_iter (seq) {
        this.$index = 0;
        this.$seq = seq;
    },
    iternext: function (canSuspend) {
        let ret;
        ret = tryCatchOrSuspend(
            () => {
                return this.$seq.mp$subscript(new pyInt(this.$index++), canSuspend);
            },
            (e) => {
                if (e instanceof pyExc.IndexError || e instanceof pyExc.StopIteration) {
                    return undefined;
                } else {
                    throw e;
                }
            }
        );
        return canSuspend ? ret : retryOptionalSuspensionOrThrow(ret);
    },
    methods: {
        __length_hint__: {
            $flags: { NoArgs: true },
            $meth: function () {
                if (this.$seq.sq$length) {
                    // sq$length will an index
                    return this.$seq.sq$length() - this.$index;
                } else {
                    throw new pyExc.NotImplementedError(
                        "len is not implemented for " + typeName(this.$seq)
                    );
                }
            },
        },
    },
    flags: { sk$acceptable_as_base_class: false },
});



