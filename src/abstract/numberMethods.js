
import {
    pyTrue,
    pyFalse,
    pyNotImplemented,
    objectIsTrue,
    pyExc,
    typeName,
} from "../internal";
/**
 * @function
 * @description
 * Perform a binary operation with any pyObjects that support the operation
 * @param {pyObject} v
 * @param {pyObject} w
 * @param {string} op - `Add`, `Sub`, `Mult`, `Divide`, ...
 *
 * @throws {pyExc.TypeError}
 */
export function numberBinOp(v, w, op) {
    return binary_op_(v, w, op) || binop_type_error(v, w, op);
};

/**
 * @function
 * @description
 * Perform an inplace operation with any pyObjects that support the operation
 * @param {pyObject} v
 * @param {pyObject} w
 * @param {string} op - `Add`, `Sub`, `Mult`, `Divide`, ...
 *
 * @throws {pyExc.TypeError}
 */
export function numberInplaceBinOp(v, w, op) {
    return binary_iop_(v, w, op) || biniop_type_error(v, w, op);
};

/**
 * @function
 * @description
 * Perform a unary operation with any pyObjects that support the operation
 * @param {pyObject} v
 * @param {string} op - `UAdd`, `USub`
 *
 * @throws {pyExc.TypeError}
 */
export function numberUnaryOp(v, op) {
    if (op === "Not") {
        return objectIsTrue(v) ? pyFalse : pyTrue;
    }
    return unary_op_(v, op) || unop_type_error(v, op);
};



const binop_name_to_symbol = {
    Add: "+",
    Sub: "-",
    Mult: "*",
    MatMult: "@",
    Div: "/",
    FloorDiv: "//",
    Mod: "%",
    DivMod: "divmod()",
    Pow: "** or pow()",
    LShift: "<<",
    RShift: ">>",
    BitAnd: "&",
    BitXor: "^",
    BitOr: "|",
};

function binop_type_error(v, w, name) {
    const vtypename = typeName(v);
    const wtypename = typeName(w);
    throw new pyExc.TypeError("unsupported operand type(s) for " + binop_name_to_symbol[name] + ": '" + vtypename + "' and '" + wtypename + "'");
}

function biniop_type_error(v, w, name) {
    const vtypename = typeName(v);
    const wtypename = typeName(w);
    throw new pyExc.TypeError(
        "unsupported operand type(s) for " + binop_name_to_symbol[name] + "=: '" + vtypename + "' and '" + wtypename + "'"
    );
}

const uop_name_to_symbol = {
    UAdd: "+",
    USub: "-",
    Invert: "~",
};
function unop_type_error(v, name) {
    var vtypename = typeName(v);
    throw new pyExc.TypeError("bad operand type for unary " + uop_name_to_symbol[name] + ": '" + vtypename + "'");
}

/**
 * lookup and return the LHS object slot function method.  This could be either a builtin slot function or a dunder method defined by the user.
 *
 * @param obj
 * @param name
 *
 * @returns {Function|undefined}
 *
 * @private
 */
function boNameToSlotFuncLhs_(obj, name) {
    switch (name) {
        case "Add":
            return obj.nb$add;
        case "Sub":
            return obj.nb$subtract;
        case "Mult":
            return obj.nb$multiply;
        case "MatMult":
            return obj.nb$matrix_multiply;
        case "Div":
            return obj.nb$divide;
        case "FloorDiv":
            return obj.nb$floor_divide;
        case "Mod":
            return obj.nb$remainder;
        case "DivMod":
            return obj.nb$divmod;
        case "Pow":
            return obj.nb$power;
        case "LShift":
            return obj.nb$lshift;
        case "RShift":
            return obj.nb$rshift;
        case "BitAnd":
            return obj.nb$and;
        case "BitXor":
            return obj.nb$xor;
        case "BitOr":
            return obj.nb$or;
    }
}

function boNameToSlotFuncRhs_(obj, name) {
    switch (name) {
        case "Add":
            return obj.nb$reflected_add;
        case "Sub":
            return obj.nb$reflected_subtract;
        case "Mult":
            return obj.nb$reflected_multiply;
        case "MatMult":
            return obj.nb$reflected_matrix_multiply;
        case "Div":
            return obj.nb$reflected_divide;
        case "FloorDiv":
            return obj.nb$reflected_floor_divide;
        case "Mod":
            return obj.nb$reflected_remainder;
        case "DivMod":
            return obj.nb$reflected_divmod;
        case "Pow":
            return obj.nb$reflected_power;
        case "LShift":
            return obj.nb$reflected_lshift;
        case "RShift":
            return obj.nb$reflected_rshift;
        case "BitAnd":
            return obj.nb$reflected_and;
        case "BitXor":
            return obj.nb$reflected_xor;
        case "BitOr":
            return obj.nb$reflected_or;
    }
}

function iboNameToSlotFunc_(obj, name) {
    switch (name) {
        case "Add":
            return obj.nb$inplace_add;
        case "Sub":
            return obj.nb$inplace_subtract;
        case "Mult":
            return obj.nb$inplace_multiply;
        case "MatMult":
            return obj.nb$inplace_matrix_multiply;
        case "Div":
            return obj.nb$inplace_divide;
        case "FloorDiv":
            return obj.nb$inplace_floor_divide;
        case "Mod":
            return obj.nb$inplace_remainder;
        case "Pow":
            return obj.nb$inplace_power;
        case "LShift":
            return obj.nb$inplace_lshift;
        case "RShift":
            return obj.nb$inplace_rshift;
        case "BitAnd":
            return obj.nb$inplace_and;
        case "BitOr":
            return obj.nb$inplace_or;
        case "BitXor":
            return obj.nb$inplace_xor;
    }
}

function uoNameToSlotFunc_(obj, name) {
    switch (name) {
        case "USub":
            return obj.nb$negative;
        case "UAdd":
            return obj.nb$positive;
        case "Invert":
            return obj.nb$invert;
    }
}

function binary_op_(v, w, opname) {
    // All Python inheritance is now enforced with Javascript inheritance
    // (see setUpInheritance). This checks if w's type is a strict
    // subclass of v's type
    const w_type = w.constructor;
    const v_type = v.constructor;
    const w_is_subclass = w_type !== v_type && w_type.sk$baseClass === undefined && w instanceof v_type;

    // From the Python 2.7 docs:
    //
    // "If the right operand’s type is a subclass of the left operand’s type and
    // that subclass provides the reflected method for the operation, this
    // method will be called before the left operand’s non-reflected method.
    // This behavior allows subclasses to override their ancestors’ operations."
    //
    // -- https://docs.python.org/2/reference/datamodel.html#index-92

    let wop;
    let ret;
    if (w_is_subclass) {
        wop = boNameToSlotFuncRhs_(w, opname);
        // only use the reflected slot if it has actually be overridden
        if (wop !== undefined && wop !== boNameToSlotFuncRhs_(v, opname)) {
            ret = wop.call(w, v);
            if (ret !== pyNotImplemented) {
                return ret;
            }
        }
    }

    const vop = boNameToSlotFuncLhs_(v, opname);
    if (vop !== undefined) {
        ret = vop.call(v, w);
        if (ret !== pyNotImplemented) {
            return ret;
        }
    }
    // Don't retry RHS if failed above
    if (!w_is_subclass) {
        wop = boNameToSlotFuncRhs_(w, opname);
        if (wop !== undefined) {
            ret = wop.call(w, v);
            if (ret !== pyNotImplemented) {
                return ret;
            }
        }
    }
}

function binary_iop_(v, w, opname) {
    const vop = iboNameToSlotFunc_(v, opname);
    if (vop !== undefined) {
        const ret = vop.call(v, w);
        if (ret !== pyNotImplemented) {
            return ret;
        }
    }
    // If there wasn't an in-place operation, fall back to the binop
    return binary_op_(v, w, opname);
}

function unary_op_(v, opname) {
    const vop = uoNameToSlotFunc_(v, opname);
    if (vop !== undefined) {
        return vop.call(v);
    }
}


// export function numberAdd (a, b) {
//     if (a.nb$add) {
//         return a.nb$add(b);
//     }
//     const atypename = typeName(a);
//     const btypename = typeName(b);
//     throw new Sk.builtin.TypeError("unsupported operand type(s) for +: '" + atypename + "' and '" + btypename + "'");
// };

// // in Python 2.6, this behaviour seems to be defined for numbers and bools (converts bool to int)
// export function numberNegative (obj) {
//     if (obj.nb$negative) {
//         return obj.nb$negative();
//     }
//     throw new Sk.builtin.TypeError("bad operand type for unary -: '" + Sk.abstr.typeName(obj) + "'");
// };

// export function numberPositive (obj) {
//     if (obj.nb$positive) {
//         return obj.nb$positive();
//     }
//     throw new Sk.builtin.TypeError("bad operand type for unary +: '" + Sk.abstr.typeName(obj) + "'");
// };