import {
    buildIteratorClass,
    pyObject,
    pyInt,
    chainOrSuspend,
    retryOptionalSuspensionOrThrow,
    keywordArrayToNamedArgs,
    asIndexOrThrow,
    objectGetIter,
} from "../../internal";

/** @typedef {pyObject} */

/**
 * @constructor
 * @param {pyObject} iterable
 * @param {number|string=} start
 * @extends pyObject
 */
export var pyEnumerate = buildIteratorClass("enumerate", {
    constructor: function enumerate(iterable, start) {
        if (!(this instanceof pyEnumerate)) {
            throw TypeError("Failed to construct 'enumerate': Please use the 'new' operator");
        }
        this.$iterable = iterable;
        this.$index = start;
        return this;
    },
    iternext: function (canSuspend) {
        const ret = chainOrSuspend(this.$iterable.tp$iternext(canSuspend), (i) => {
            if (i === undefined) {
                return undefined;
            }
            return new pyTule([new pyInt(this.$index++), i]);
        });
        return canSuspend ? ret : retryOptionalSuspensionOrThrow(ret);
    },
    slots: {
        tp$doc:
            "Return an enumerate object.\n\n  iterable\n    an object supporting iteration\n\nThe enumerate object yields pairs containing a count (from start, which\ndefaults to zero) and a value yielded by the iterable argument.\n\nenumerate is useful for obtaining an indexed list:\n    (0, seq[0]), (1, seq[1]), (2, seq[2]), ...",
        tp$new: function (args, kwargs) {
            let [iterable, start] = keywordArrayToNamedArgs("enumerate", ["iterable", "start"], args, kwargs, [new pyInt(0)]);
            iterable = objectGetIter(iterable);
            start = asIndexOrThrow(start);
            if (this === pyEnumerate.prototype) {
                return new pyEnumerate(iterable, start);
            } else {
                const instance = new this.constructor();
                pyEnumerate.call(instance, iterable, start);
                return instance;
            }
        },
    },
});
