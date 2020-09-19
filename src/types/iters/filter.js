import {
    buildIteratorClass,
    pyObject,
    checkNone,
    chainOrSuspend,
    pyCallOrSuspend,
    Break,
    iterForOrSuspend,
    retryOptionalSuspensionOrThrow,
    keywordArrayToNamedArgs,
    objectGetIter,
    objectIsTrue,
} from "../../internal";

/** @typedef {pyObject} */

/**
 * @constructor
 * @param {pyObject} func
 * @param {pyObject} iterable
 * @extends pyObject
 */
export var pyFilter = buildIteratorClass("filter", {
    constructor: function filter_(func, iterable) {
        this.$func = func;
        this.$iterable = iterable;
    },
    iternext: function (canSuspend) {
        // iterate over iterable until we pass the predicate
        // this.chcek$filter either returns the item or undefined
        const ret = iterForOrSuspend(this.$iterable, (i) => chainOrSuspend(this.check$filter(i), (i) => (i ? new Break(i) : undefined)));
        return canSuspend ? ret : retryOptionalSuspensionOrThrow(ret);
    },
    slots: {
        tp$doc:
            "Return an iterator yielding those items of iterable for which function(item)\nis true. If function is None, return the items that are true.",
        tp$new: function (args, kwargs) {
            let [func, iterable] = keywordArrayToNamedArgs("filter", ["predicate", "iterable"], args, kwargs, []);
            func = checkNone(func) ? null : func;
            iterable = objectGetIter(iterable);
            // in theory you could subclass
            if (this === pyFilter.prototype) {
                return new pyFilter(func, iterable);
            } else {
                const instance = new this.constructor();
                pyFilter.call(instance, func, iterable);
                return instance;
            }
        },
    },
    proto: {
        check$filter: function (item) {
            let res;
            if (this.$func === null) {
                res = item;
            } else {
                res = pyCallOrSuspend(this.$func, [item]);
            }
            return chainOrSuspend(res, (ret) => (objectIsTrue(ret) ? item : undefined));
        },
    },
});
