import {
    buildIteratorClass,
    pyObject,
    pyInt,
    pyStr,
    pyExc,
    pyCall,
    checkSequence,
    checkNoKwargs,
    checkArgsLen,
    tryCatchOrSuspend,
    retryOptionalSuspensionOrThrow,
    objectLookupSpecial,
    objectGetItem,
    typeName,
} from "../../internal";

/** @typedef {pyObject} */



/**
 * @constructor
 * @param {Object} seq
 * @extends pyObject
 */
export var pyReversed = buildIteratorClass("reversed", {
    constructor: function reversed(seq) {
        this.$idx = seq.sq$length() - 1;
        this.$seq = seq;
        return this;
    },
    iternext: function (canSuspend) {
        if (this.$idx < 0) {
            return undefined;
        }
        const ret = tryCatchOrSuspend(
            () => objectGetItem(this.$seq, new pyInt(this.$idx--), canSuspend),
            (e) => {
                if (e instanceof pyExc.IndexError) {
                    this.$idx = -1;
                    return undefined;
                } else {
                    throw e;
                }
            }
        );
        return canSuspend ? ret : retryOptionalSuspensionOrThrow(ret);
    },
    slots: {
        tp$doc: "Return a reverse iterator over the values of the given sequence.",
        tp$new: function (args, kwargs) {
            if (this === pyReversed.prototype) {
                checkNoKwargs("reversed", kwargs);
            }
            checkArgsLen("reversed", args, 1, 1);
            let seq = args[0];
            const special = objectLookupSpecial(seq, pyStr.$reversed);
            if (special !== undefined) {
                return pyCall(special, []);
            } else if (!checkSequence(seq) || objectLookupSpecial(seq, pyStr.$len) === undefined) {
                throw new pyExc.TypeError("'" + typeName(seq) + "' object is not a sequence");
            }
            if (this === pyReversed.prototype) {
                return new pyReversed(seq);
            } else {
                const instance = new this.constructor();
                pyReversed.call(instance, seq);
                return instance;
            }
        },
    },
    methods: {
        __length_hint__: {
            $meth: function __length_hint__() {
                return this.$idx >= 0 ? new pyInt(this.$idx) : new pyInt(0);
            },
            $flags: { NoArgs: true },
        },
    },
});


