/**
 * @param {pyObject} seq
 * @param {pyObject} ob
 * @param {boolean=} canSuspend
 * 
 */
export function sequenceContains (seq, ob, canSuspend) {
    if (seq.sq$contains) {
        return seq.sq$contains(ob, canSuspend);
    }
    const r = Sk.misceval.iterFor(
        Sk.abstr.iter(seq),
        function (i) {
            if (i === ob || Sk.misceval.richCompareBool(i, ob, "Eq")) {
                return new Sk.misceval.Break(true);
            } else {
                return false;
            }
        },
        false
    );
    return canSuspend ? r : Sk.misceval.retryOptionalSuspensionOrThrow(r);
};

export function sequenceConcat (seq1, seq2) {
    if (seq1.sq$concat) {
        return seq1.sq$concat(seq2);
    }
    throw new Sk.builtin.TypeError("'" + Sk.abstr.typeName(seq1) + "' object can't be concatenated");
};

/**
 * @param {pyObject} seq 
 * @param {pyObject} ob 
 */
export function sequenceGetIndexOf (seq, ob) {
    if (seq.index) {
        return Sk.misceval.callsimArray(seq.index, [seq, ob]);
    }
    let index = 0;
    for (let it = Sk.abstr.iter(seq), i = it.tp$iternext(); i !== undefined; i = it.tp$iternext()) {
        if (Sk.misceval.richCompareBool(ob, i, "Eq")) {
            return new Sk.builtin.int_(index);
        }
        index += 1;
    }
    throw new Sk.builtin.ValueError("sequence.index(x): x not in sequence");
};

/**
 * @param {pyObject} seq 
 * @param {pyObject} ob 
 */
export function sequenceGetCountOf (seq, ob) {
    if (seq.count) {
        return Sk.misceval.callsimArray(seq.count, [seq, ob]);
    }
    let count = 0;
    for (let it = Sk.abstr.iter(seq), i = it.tp$iternext(); i !== undefined; i = it.tp$iternext()) {
        if (Sk.misceval.richCompareBool(ob, i, "Eq")) {
            count += 1;
        }
    }
    return new Sk.builtin.int_(count);
};

export function sequenceGetItem (seq, i, canSuspend) {
    if (typeof i === "number") {
        i = new Sk.builtin.int_(i);
    }
    return Sk.abstr.objectGetItem(seq, i, canSuspend);
};

export function sequenceSetItem (seq, i, x, canSuspend) {
    if (typeof i === "number") {
        i = new Sk.builtin.int_(i);
    }
    return Sk.abstr.objectSetItem(seq, i, x, canSuspend);
};

export function sequenceDelItem (seq, i) {
    return Sk.abstr.objectDelItem(seq, i);
};

export function sequenceGetSlice (seq, i1, i2) {
    return Sk.abstr.objectGetItem(seq, new Sk.builtin.slice(i1, i2));
};

export function sequenceDelSlice (seq, i1, i2) {
    return Sk.abstr.objectDelItem(seq, new Sk.builtin.slice(i1, i2));
};

export function sequenceSetSlice (seq, i1, i2, x) {
    return Sk.abstr.objectSetItem(seq, new Sk.builtin.slice(i1, i2));
};

// seq - Python object to unpack
// n   - JavaScript number of items to unpack
export function sequenceUnpack (seq, n) {
    const res = [];
    const it = Sk.abstr.iter(seq);
    let i;
    for (i = it.tp$iternext(); i !== undefined && res.length < n; i = it.tp$iternext()) {
        res.push(i);
    }
    if (res.length < n) {
        throw new Sk.builtin.ValueError("need more than " + res.length + " values to unpack");
    }
    if (i !== undefined) {
        throw new Sk.builtin.ValueError("too many values to unpack");
    }
    // Return Javascript array of items
    return res;
};
