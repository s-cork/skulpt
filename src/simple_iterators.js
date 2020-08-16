/**
 * 
 * @constructor
 * @extends {Sk.builtin.object}
 * @param {Sk.builtin.func} callable
 * @param {Sk.builtin.object} sentinel - if reached returns undefined
 * @private
 */
Sk.builtin.callable_iter_ = Sk.abstr.buildIteratorClass("callable_iterator", {
    constructor: function callable_iter(callable, sentinel) {
        if (!Sk.builtin.checkCallable(callable)) {
            throw new Sk.builtin.TypeError("iter(v, w): v must be callable");
        }
        this.$callable = callable;
        this.$sentinel = sentinel;
        this.$flag = false;
    },
    iternext: function (canSuspend) {
        if (this.$flag) {
            // Iterator has already completed
            return undefined;
        }
        const ret = Sk.misceval.chain(Sk.misceval.callsimOrSuspendArray(this.$callable, []), (res) => {
            if (Sk.misceval.richCompareBool(res, this.$sentinel, "Eq")) {
                this.$flag = true;
                return undefined;
            }
            return res;
        });
        return canSuspend ? ret : Sk.misceval.retryOptionalSuspensionOrThrow(ret);
    },
});


/**
 * @constructor
 * @extends {Sk.builtin.object}
 * @param {Sk.builtin.object} seq
 * @private
 */
Sk.builtin.seq_iter_ = Sk.abstr.buildIteratorClass("iterator", {
    constructor: function seq_iter(seq, getitem) {
        this.$index = 0;
        this.$seq = seq;
        this.$getitem = getitem;
    },
    iternext: function (canSuspend) {
        const ret = Sk.misceval.tryCatch(
            () => {
                return Sk.misceval.callsimOrSuspendArray(this.$getitem, [this.$seq, new Sk.builtin.int_(this.$index++)]);
            },
            (e) => {
                if (e instanceof Sk.builtin.IndexError || e instanceof Sk.builtin.StopIteration) {
                    return undefined;
                } else {
                    throw e;
                }
            }
        );
        return canSuspend ? ret : Sk.misceval.retryOptionalSuspensionOrThrow(ret);
    },
});