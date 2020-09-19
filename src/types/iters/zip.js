import {
    buildIteratorClass,
    pyObject,
    pyTuple,
    pyExc,
    checkNoKwargs,
    chainOrSuspend,
    Break,
    iterArrayOrSuspend,
    retryOptionalSuspensionOrThrow,
    objectGetIter,
} from "../../internal";

/** @typedef {pyObject} */

/**
 * @constructor
 * @param {Array} JS Array of iterator objects
 * @extends pyObject
 */
export var pyZip = buildIteratorClass("zip", {
    constructor: function zip_(iters) {
        this.$iters = iters;
        if (iters.length === 0) {
            this.tp$iternext = () => undefined;
        }
    },
    iternext: function (canSuspend) {
        const tup = [];
        const ret = chainOrSuspend(
            iterArrayOrSuspend(this.$iters, (it) =>
                chainOrSuspend(it.tp$iternext(canSuspend), (i) => {
                    if (i === undefined) {
                        return new Break(true);
                    }
                    tup.push(i);
                })
            ),
            (endzip) => (endzip ? undefined : new pyTuple(tup))
        );
        return canSuspend ? ret : retryOptionalSuspensionOrThrow(ret);
    },
    slots: {
        tp$doc:
            "zip(iter1 [,iter2 [...]]) --> zip object\n\nReturn a zip object whose .__next__() method returns a tuple where\nthe i-th element comes from the i-th iterable argument.  The .__next__()\nmethod continues until the shortest iterable in the argument sequence\nis exhausted and then it raises StopIteration.",
        tp$new: function (args, kwargs) {
            if (this === pyZip.prototype) {
                checkNoKwargs("zip", kwargs);
            }
            const iters = [];
            for (let i = 0; i < args.length; i++) {
                try {
                    iters.push(objectGetIter(args[i]));
                } catch (e) {
                    if (e instanceof pyExc.TypeError) {
                        throw new pyExc.TypeError("zip argument #" + (i + 1) + " must support iteration");
                    } else {
                        throw e;
                    }
                }
            }
            if (this === pyZip.prototype) {
                return new pyZip(iters);
            } else {
                const instance = new this.constructor();
                pyZip.call(instance, iters);
                return instance;
            }
        },
    },
});
