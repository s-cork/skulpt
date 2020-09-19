import { asserts, pyTrue, pyFalse, pyExc, pyNone, pyCall, checkNone, checkString, chainOrSuspend, pySeqIter } from "../internal";


/**
 * @description
 * Typically used withing error messages
 *
 * @example
 * throw new pyExc.TypeError("expected an 'int' (got '" + typeName(i) + "'");
 *
 * @param {*} obj
 * @returns {string} - returns the typeName of any pyObject or `<invaid type>` if a JS object was passed
 */
export function typeName (obj) {
    if (obj !== null && obj.tp$name !== undefined) {
        return obj.tp$name;
    }
    return "<invalid type>";
};


export function objectFormat (obj, format_spec) {
    const meth = objectLookupSpecial(obj, pyStr.$format); // inherited from object so guaranteed to exist
    const result = pyCall(meth, [format_spec]);
    if (!checkString(result)) {
        throw new pyExc.TypeError("__format__ must return a str, not " + typeName(result));
    }
    return result;
};


export function objectDelItem (o, key) {
    if (o.mp$ass_subscript) {
        return o.mp$ass_subscript(key);
    }
    throw new pyExc.TypeError("'" + typeName(o) + "' object does not support item deletion");
};

/**
 * 
 * @param {pyObject} o 
 * @param {pyObject} key 
 * @param {boolean=} canSuspend 
 */
export function objectGetItem (o, key, canSuspend) {
    if (o.mp$subscript) {
        return o.mp$subscript(key, canSuspend);
    }
    throw new pyExc.TypeError("'" + typeName(o) + "' does not support indexing");
};

/**
 * 
 * @param {pyObject} o 
 * @param {pyObject} key 
 * @param {pyObject=} v 
 * @param {boolean=} canSuspend 
 */
export function objectSetItem (o, key, v, canSuspend) {
    if (o.mp$ass_subscript) {
        return o.mp$ass_subscript(key, v, canSuspend);
    }
    throw new pyExc.TypeError("'" + typeName(o) + "' does not support item assignment");
};

/**
 * 
 * @param {pyObject} obj 
 * @param {pyStr} pyName 
 * @param {boolean=} canSuspend 
 */
export function objectGetAttr (obj, pyName, canSuspend) {
    // let the getattr and setattr's deal with reserved words - we don't want to pass a mangled pyName to tp$getattr!!
    const ret = obj.tp$getattr(pyName, canSuspend);
    if (ret === undefined) {
        throw new pyExc.AttributeError(obj.sk$attrError() + " has no attribute '" + pyName + "'");
    } else if (ret.$isSuspension) {
        return chainOrSuspend(ret, function (r) {
            if (r === undefined) {
                throw new pyExc.AttributeError(obj.sk$attrError() + " has no attribute '" + pyName + "'");
            }
            return r;
        });
    } else {
        return ret;
    }
};

export function objectSetAttr (obj, pyName, data, canSuspend) {
    return obj.tp$setattr(pyName, data, canSuspend);
};

export function objectDelAttr (obj, pyName, canSuspend) {
    return obj.tp$setattr(pyName, undefined, canSuspend);
};

export function objectIterNext (it, canSuspend) {
    return it.tp$iternext(canSuspend);
};

/**
 * @function
 *
 * @description
 * Get the iterator for a Python object  This iterator could be one of the following.
 * This is the preferred mechanism for consistently getting the correct iterator.  You should
 * not just use tp$iter because that could lead to incorrect behavior of a user created class.
 *
 * - `tp$iter`
 * - A user defined `__iter__` method
 * - A user defined `__getitem__` method
 *
 * @param {pyObject} obj
 *
 * @throws {pyExc.TypeError} If the object passed is not iterable
 * @returns {pyObject}
 */
export function objectGetIter (obj) {
    if (obj.tp$iter) {
        const iter = obj.tp$iter();
        if (iter.tp$iternext) {
            // only a valid iterator if there is a tp$iternext
            return iter;
        }
        throw new pyExc.TypeError("iter() returned non-iterator of type '" + typeName(iter) + "'");
    }
    if (obj.mp$subscript) {
        return new pySeqIter(obj);
    }

    throw new pyExc.TypeError("'" + typeName(obj) + "' object is not iterable");
};


/**
 * @description
 * Special method look up.
 * Checks whether the attribute is defined on object type's prototype
 *
 * @returns {undefined | Object} Return undefined if not found or the function
 *
 * @param {pyObject} obj
 * @param {pyStr} pyName
 */
export function objectLookupSpecial (obj, pyName) {
    let func = obj.ob$type && obj.ob$type.$typeLookup(pyName);
    if (func === undefined) {
        return;
    } else if (func.tp$descr_get !== undefined) {
        func = func.tp$descr_get(obj, obj.ob$type);
    }
    return func;
};

export function objectHash (obj) {
    if (checkNone(obj.tp$hash)) {
        throw new pyExc.TypeError("unhashable type: '" + typeName(obj) + "'");
    }
    return obj.tp$hash();
}

/**
 * Mark a class as unhashable and prevent its `__hash__` function from being called.
 * @param  {*} thisClass The class to mark as unhashable.
 * @return {undefined}
 */
export function markUnhashable (thisClass) {
    const proto = thisClass.prototype;
    proto.__hash__ = pyNone;
    proto.tp$hash = pyNone;
};



/**
 * @function
 * @description
 * calls the __repr__ of a pyObject or returns `<unknown>` if a JS object was passed
 * @param {*} obj
 * @returns {string}
 * 
 */
export function objectRepr (obj) {
    asserts.assert(obj !== undefined, "trying to repr undefined");
    if (obj !== null && obj.$r) {
        return obj.$r().toString();
    } else {
        try {
            // str goes through the common javascript cases or throws a TypeError;
            return new pyStr(obj).toString();
        } catch (e) {
            if (e instanceof pyExc.TypeError) {
                return "<unknown>";
            } else {
                throw e;
            }
        }
    }
};

export function objectLen(obj) {
    if (obj.sq$length) {
        return obj.sq$length();
    }
    throw new pyExc.TypeError("'" + typeName(obj) + "' has no __len__");
}



/**
 * @function
 * @description
 * Decides whether a pyObject is True or not
 * @returns {boolean}
 * @param {*} x 
 */
export function objectIsTrue (x) {
    // do the fast things first
    if (x === true || x === pyTrue) {
        return true;
    }
    if (x === false || x === pyFalse || x === null || x === undefined) {
        return false;
    }
    if (x.nb$bool) {
        return x.nb$bool(); // the slot wrapper takes care of converting to js Boolean
    }
    if (x.sq$length) {
        // the slot wrapper takes care of the error message and converting to js int
        return x.sq$length() !== 0;
    }
    return Boolean(x);
};