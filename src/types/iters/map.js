import {
    buildIteratorClass,
    pyObject,
    checkNoKwargs,
    checkArgsLen,
    chainOrSuspend,
    pyCallOrSuspend,
    Break,
    iterArrayOrSuspend,
    retryOptionalSuspensionOrThrow,
    objectGetIter,
} from "../../internal";

/** @typedef {pyObject} */

/**
 * @constructor
 * @param {pyObject} func must be callable
 * @param {Array} array of iterators
 * @extends pyObject
 */
export var pyMap = buildIteratorClass("map", {
    constructor: function map_(func, iters) {
        this.$func = func;
        this.$iters = iters;
    },
    iternext: function (canSuspend) {
        const args = [];
        const ret = chainOrSuspend(
            iterArrayOrSuspend(this.$iters, (it) =>
                chainOrSuspend(it.tp$iternext(canSuspend), (i) => {
                    if (i === undefined) {
                        return new Break(true);
                    }
                    args.push(i);
                })
            ),
            (endmap) => (endmap ? undefined : pyCallOrSuspend(this.$func, args))
        );
        return canSuspend ? ret : retryOptionalSuspensionOrThrow(ret);
    },
    slots: {
        tp$doc:
            "map(func, *iterables) --> map object\n\nMake an iterator that computes the function using arguments from\neach of the iterables.  Stops when the shortest iterable is exhausted.",
        tp$new: function (args, kwargs) {
            if (this === pyMap.prototype) {
                checkNoKwargs("map", kwargs);
            }
            checkArgsLen("map", args, 2);
            const func = args[0];
            const iters = [];
            for (let i = 1; i < args.length; i++) {
                iters.push(objectGetIter(args[i]));
            }
            if (this === pyMap.prototype) {
                return new pyMap(func, iters);
            } else {
                const instance = new this.constructor();
                pyMap.call(instance, func, iters);
                return instance;
            }
        },
    },
});
