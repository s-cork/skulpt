import {
    buildIteratorClass,
    pyExc,
    pyCall,
    checkCallable,
    pyCallOrSuspend,
    chainOrSuspend,
    objectRichCompare,
} from "../../internal";
/**
 * 
 * @constructor
 * @extends {pyObject}
 * @param {*} callable
 * @param {pyObject} sentinel - if reached returns undefined
 * @private
 */
export var pyCallableIter = buildIteratorClass("callable_iterator", {
    constructor: function callable_iter (callable, sentinel) {
        if (!checkCallable(callable)) {
            throw new pyExc.TypeError("iter(v, w): v must be callable");
        }
        this.$callable = callable;
        this.$sentinel = sentinel;
        this.$flag = false;
    },
    iternext: function (canSuspend) {
        let ret;
        if (this.$flag === true) {
            // Iterator has already completed
            return undefined;
        }
        if (canSuspend) {
            ret = pyCallOrSuspend(this.$callable, []);
            return chainOrSuspend(ret, (r) => {
                if (objectRichCompare(r, this.$sentinel, "Eq", true)) {
                    this.$flag = true;
                    return undefined;
                } else {
                    return r;
                }
            });
        } else {
            ret = pyCall(this.$callable, []);
            if (objectRichCompare(ret, this.$sentinel, "Eq", false)) {
                this.$flag = true;
                return undefined;
            } else {
                return ret;
            }
        }
    },
    flags: { sk$acceptable_as_base_class: false },
});



