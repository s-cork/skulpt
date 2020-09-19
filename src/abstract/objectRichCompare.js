import {
    asserts,
    pyNone,
    pyDict,
    pyInt,
    pyBool,
    pyNotImplemented,
    pyFloat,
    pyTuple,
    pyStr,
    checkInt,
    sysPython3,
    sequenceContains,
    chainOrSuspend,
    pyCall,
    objectIsTrue,
} from "../internal";

export function opAllowsEquality(op) {
    switch (op) {
        case "LtE":
        case "Eq":
        case "GtE":
            return true;
    }
    return false;
}

/**
 * @function
 *
 * @param {pyObject} v
 * @param {pyObject} w
 * @param {string} op - `Eq`, `NotEq`, `Lt`, `LtE`, `Gt`, `GtE`, `Is`, `IsNot`, `In_`, `NotIn`
 * @param {boolean=} canSuspend
 *
 * @returns {boolean}
 *
 * @todo This implementation overrides the return value from a user defined dunder method since it returns a boolean
 * whereas Python will return the user defined return value.
 *
 * @throws {pyExc.TypeError}
 */
export function objectRichCompare(v, w, op, canSuspend) {
    // v and w must be Python objects. will return Javascript true or false for internal use only
    // if you want to return a value from richCompareBool to Python you must wrap as pyBool first
    asserts.assert(v.sk$object && w.sk$object, "JS object passed to richCompareBool");
    var ret, swapped_shortcut, shortcut;

    const v_type = v.ob$type;
    const w_type = w.ob$type;
    const w_is_subclass = w_type !== v_type && w_type.sk$baseClass === undefined && w_type.$isSubType(v_type);

    // Python 2 has specific rules when comparing two different builtin types
    // currently, this code will execute even if the objects are not builtin types
    // but will fall through and not return anything in this section

    // handle identity and membership comparisons
    if (op === "Is" || op === "IsNot") {
        if (v_type === w_type) {
            if (v === w) {
                ret = true;
            } else if (v.ob$is) {
                ret = v.ob$is(w);
            }
        } else {
            ret = false;
        }
        return op === "Is" ? ret : !ret;
    }

    if (op === "In") {
        return sequenceContains(v, w, canSuspend);
    }
    if (op === "NotIn") {
        return chainOrSuspend(sequenceContains(w, v, canSuspend), (x) => !x);
    }

    // Call Javascript shortcut method if exists for either object
    if (!sysPython3 && v_type !== w_type && (op === "GtE" || op === "Gt" || op === "LtE" || op === "Lt")) {
        ret = python2builtinTypes(v, w, v_type, w_type, op);
        if (ret !== undefined) {
            return ret;
        }
    }

    shortcut = op2shortcut[op];
    // similar rules apply as with binops - prioritize the reflected ops of subtypes
    if (w_is_subclass) {
        swapped_shortcut = op2shortcut[swappedOp_[op]];
        if (w[swapped_shortcut] !== v[swapped_shortcut] && (ret = w[swapped_shortcut](v)) !== pyNotImplemented) {
            return objectIsTrue(ret);
        }
    }
    if ((ret = v[shortcut](w)) !== pyNotImplemented) {
        return objectIsTrue(ret);
        // techincally this is not correct along with the compile code
        // richcompare slots could return any pyObject ToDo - would require changing compile code
    }

    if (!w_is_subclass) {
        swapped_shortcut = op2shortcut[swappedOp_[op]];
        if ((ret = w[swapped_shortcut](v)) !== pyNotImplemented) {
            return objectIsTrue(ret);
        }
    }

    if (!sysPython3) {
        ret = python2__cmp__(v, w);
        if (ret !== undefined) {
            return ret;
        }
    }

    // handle equality comparisons for any remaining objects
    if (op === "Eq") {
        return v === w;
    }
    if (op === "NotEq") {
        return v !== w;
    }

    const vname = typeName(v);
    const wname = typeName(w);
    throw new pyExc.TypeError("'" + opSymbols[op] + "' not supported between instances of '" + vname + "' and '" + wname + "'");
    //throw new pyExc.ValueError("don't know how to compare '" + vname + "' and '" + wname + "'");
}

/**
 * for reversed comparison: Gt -> Lt, etc.
 * @ignore
 */
const swappedOp_ = {
    Eq: "Eq",
    NotEq: "NotEq",
    Lt: "Gt",
    LtE: "GtE",
    Gt: "Lt",
    GtE: "LtE",
};

const opSymbols = {
    Eq: "==",
    NotEq: "!=",
    Lt: "<",
    LtE: "<=",
    Gt: ">",
    GtE: ">=",
    Is: "is",
    IsNot: "is not",
    In_: "in",
    NotIn: "not in",
};

const op2shortcut = {
    Eq: "ob$eq",
    NotEq: "ob$ne",
    Gt: "ob$gt",
    GtE: "ob$ge",
    Lt: "ob$lt",
    LtE: "ob$le",
};

function python2builtinTypes(v, w, v_type, w_type, op) {
    // note: sets are omitted here because they can only be compared to other sets
    const numeric_types = [pyFloat, pyInt, pyLong, pyBool];
    const sequence_types = [pyDict, pyList, pyStr, pyTuple];

    const v_num_type = numeric_types.indexOf(v_type);
    const v_seq_type = sequence_types.indexOf(v_type);
    const w_num_type = numeric_types.indexOf(w_type);
    const w_seq_type = sequence_types.indexOf(w_type);

    // NoneTypes are considered less than any other type in Python
    // note: this only handles comparing NoneType with any non-NoneType.
    // Comparing NoneType with NoneType is handled further down.
    if (v === pyNone) {
        switch (op) {
            case "Lt":
                return true;
            case "LtE":
                return true;
            case "Gt":
                return false;
            case "GtE":
                return false;
        }
    }

    if (w === pyNone) {
        switch (op) {
            case "Lt":
                return false;
            case "LtE":
                return false;
            case "Gt":
                return true;
            case "GtE":
                return true;
        }
    }

    // numeric types are always considered smaller than sequence types in Python
    if (v_num_type !== -1 && w_seq_type !== -1) {
        switch (op) {
            case "Lt":
                return true;
            case "LtE":
                return true;
            case "Gt":
                return false;
            case "GtE":
                return false;
        }
    }

    if (v_seq_type !== -1 && w_num_type !== -1) {
        switch (op) {
            case "Lt":
                return false;
            case "LtE":
                return false;
            case "Gt":
                return true;
            case "GtE":
                return true;
        }
    }

    // in Python, different sequence types are ordered alphabetically
    // by name so that dict < list < str < tuple
    if (v_seq_type !== -1 && w_seq_type !== -1) {
        switch (op) {
            case "Lt":
                return v_seq_type < w_seq_type;
            case "LtE":
                return v_seq_type <= w_seq_type;
            case "Gt":
                return v_seq_type > w_seq_type;
            case "GtE":
                return v_seq_type >= w_seq_type;
        }
    }
}

function python2__cmp__(v, w) {
    const vcmp = objectLookupSpecial(v, pyStr.$cmp);
    if (vcmp) {
        try {
            ret = pyCall(vcmp, [w]);
            if (checkInt(ret)) {
                ret = Number(ret);
                if (op === "Eq") {
                    return ret === 0;
                } else if (op === "NotEq") {
                    return ret !== 0;
                } else if (op === "Lt") {
                    return ret < 0;
                } else if (op === "Gt") {
                    return ret > 0;
                } else if (op === "LtE") {
                    return ret <= 0;
                } else if (op === "GtE") {
                    return ret >= 0;
                }
            }

            if (ret !== pyNotImplemented) {
                throw new pyExc.TypeError("comparison did not return an int");
            }
        } catch (e) {
            throw new pyExc.TypeError("comparison did not return an int");
        }
    }
    const wcmp = objectLookupSpecial(w, pyStr.$cmp);
    if (wcmp) {
        // note, flipped on return value and call
        try {
            ret = pyCall(wcmp, [v]);
            if (checkInt(ret)) {
                ret = Number(ret);
                if (op === "Eq") {
                    return ret === 0;
                } else if (op === "NotEq") {
                    return ret !== 0;
                } else if (op === "Lt") {
                    return ret > 0;
                } else if (op === "Gt") {
                    return ret < 0;
                } else if (op === "LtE") {
                    return ret >= 0;
                } else if (op === "GtE") {
                    return ret <= 0;
                }
            }

            if (ret !== pyNotImplemented) {
                throw new pyExc.TypeError("comparison did not return an int");
            }
        } catch (e) {
            throw new pyExc.TypeError("comparison did not return an int");
        }
    }
    // handle special cases for comparing None with None or Bool with Bool
    if (v === pyNone && w === pyNone) {
        // Javascript happens to return the same values when comparing null
        // with null or true/false with true/false as Python does when
        // comparing None with None or True/False with True/False

        if (op === "Eq") {
            return v.v === w.v;
        }
        if (op === "NotEq") {
            return v.v !== w.v;
        }
        if (op === "Gt") {
            return v.v > w.v;
        }
        if (op === "GtE") {
            return v.v >= w.v;
        }
        if (op === "Lt") {
            return v.v < w.v;
        }
        if (op === "LtE") {
            return v.v <= w.v;
        }
    }
}
