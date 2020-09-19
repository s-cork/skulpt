import {
    pyExc,
    pyStr,
    pyInt,
    pyFloat,
    pyFile,
    pyCall,
    pyLong,
    pyTrue,
    pyList,
    pyFalse,
    pyTuple,
    pyNone,
    pyDict,
    pyCallableIter,
    arrayFromIterable,
    Break,
    iterForOrSuspend,
    chainOrSuspend,
    tryCatchOrSuspend,
    pyCallOrSuspend,
    keywordArrayToNamedArgs,
    checkString,
    checkBytes,
    checkNumber,
    checkNone,
    checkIndex,
    checkCallable,
    checkIterable,
    checkClass,
    checkFloat,
    checkInt,
    checkComplex,
    asIndex,
    objectGetIter,
    objectFormat,
    objectIsTrue,
    objectIterNext,
    objectLookupSpecial,
    objectRichCompare,
    objectRepr,
    typeName,
    numberBinOp,
    remapToPy,
    unfixReserved,
    print,
} from "./internal";

var input = raw_input;

export const builtinFuncs = {
    print,
    abs,
    round,
    len,
    min,
    max,
    any,
    all,
    sum,
    ord,
    chr,
    unichr,
    hex,
    oct,
    bin,
    dir,
    repr,
    ascii,
    open,
    isinstance,
    hash,
    getattr,
    setattr,
    hasattr,
    input,
    raw_input,
    jseval,
    eval_,
    reduce,
    pow,
    quit,
    issubclass,
    globals,
    locals,
    id,
    bytearray,
    iter,
    callable,
    delattr,
    apply_,
    vars,
    next_,
    memoryview,
    help,
    execfile,
    format,
    buffer_,
    reload,
    intern,
    divmod,
    coerce,
    sorted,
};

function round(number, ndigits) {
    if (number === undefined) {
        throw new pyExc.TypeError("a float is required");
    }
    if (!Sk.__future__.dunder_round) {
        if (!checkNumber(number)) {
            throw new pyExc.TypeError("a float is required");
        }
        if (number.round$) {
            return number.round$(ndigits);
        } else {
            throw new pyExc.AttributeError(typeName(number) + " instance has no attribute '__float__'");
        }
    }

    if (ndigits !== undefined && !checkNone(ndigits) && !checkIndex(ndigits)) {
        throw new pyExc.TypeError("'" + typeName(ndigits) + "' object cannot be interpreted as an index");
    }

    // try calling internal magic method
    const special = objectLookupSpecial(number, pyStr.$round);
    if (special !== undefined) {
        // method on builtin, provide this arg
        if (ndigits !== undefined) {
            return pyCall(special, [ndigits]);
        } else {
            return pyCall(special, []);
        }
    } else {
        throw new pyExc.TypeError("a float is required");
    }
}

/**
 *
 * @param {pyObject} iterable
 * @param {*=} cmp
 * @param {*=} key
 * @param {*=} reverse
 */
export function sorted(iterable, cmp, key, reverse) {
    const lst = arrayFromIterable(iterable, true);
    return chainOrSuspend(lst, (L) => {
        L = new pyList(L);
        L.list$sort(cmp, key, reverse);
        return L;
    });
};

function len(item) {
    // checking will happen in slot wrapper
    let res;
    if (item.sq$length) {
        res = item.sq$length(true);
    } else {
        throw new pyExc.TypeError("object of type '" + typeName(item) + "' has no len()");
    }
    return chainOrSuspend(res, (r) => {
        return new pyInt(r);
    });
}

function min(args, kwargs) {
    let iter;
    const nargs = args.length;
    if (!nargs) {
        throw new pyExc.TypeError("min expected 1 argument, got 0");
    }
    const [$default, key] = keywordArrayToNamedArgs("min", ["default", "key"], [], kwargs, [null, pyNone]);

    // if args is not a single iterable then default should not be included as a kwarg
    if (nargs > 1 && $default !== null) {
        throw new pyExc.TypeError("Cannot specify a default for min() with multiple positional arguments");
    }

    if (nargs == 1) {
        iter = objectGetIter(args[0]);
    } else {
        iter = objectGetIter(new pyTuple(args));
    }

    if (!checkNone(key) && !checkCallable(key)) {
        throw new pyExc.TypeError("'" + typeName(key) + "' object is not callable");
    }

    let lowest;
    return chainOrSuspend(
        objectIterNext(iter, true),
        (i) => {
            lowest = i;
            if (lowest === undefined) {
                return;
            }
            if (checkNone(key)) {
                return iterForOrSuspend(iter, (i) => {
                    if (objectRichCompare(i, lowest, "Lt")) {
                        lowest = i;
                    }
                });
            } else {
                return chainOrSuspend(pyCallOrSuspend(key, [lowest]), (lowest_compare) =>
                    iterForOrSuspend(iter, (i) =>
                        chainOrSuspend(pyCallOrSuspend(key, [i]), (i_compare) => {
                            if (objectRichCompare(i_compare, lowest_compare, "Lt")) {
                                lowest = i;
                                lowest_compare = i_compare;
                            }
                        })
                    )
                );
            }
        },
        () => {
            if (lowest === undefined) {
                if ($default === null) {
                    throw new pyExc.ValueError("min() arg is an empty sequence");
                } else {
                    lowest = $default;
                }
            }
            return lowest;
        }
    );
}

function max(args, kwargs) {
    let iter;
    const nargs = args.length;

    if (!nargs) {
        throw new pyExc.TypeError("max expected 1 argument, got 0");
    }
    const [$default, key] = keywordArrayToNamedArgs("min", ["default", "key"], [], kwargs, [null, pyNone]);

    // if args is not a single iterable then default should not be included as a kwarg
    if (nargs > 1 && $default !== null) {
        throw new pyExc.TypeError("Cannot specify a default for max() with multiple positional arguments");
    }

    if (nargs === 1) {
        iter = objectGetIter(args[0]);
    } else {
        iter = objectGetIter(new pyTuple(args));
    }

    if (!checkNone(key) && !checkCallable(key)) {
        throw new pyExc.TypeError("'" + typeName(key) + "' object is not callable");
    }
    let highest;
    return chainOrSuspend(
        objectIterNext(true),
        (i) => {
            highest = i;
            if (highest === undefined) {
                return;
            }
            if (checkNone(key)) {
                return iterForOrSuspend(iter, (i) => {
                    if (objectRichCompare(i, highest, "Gt")) {
                        highest = i;
                    }
                });
            } else {
                return chainOrSuspend(pyCallOrSuspend(key, [highest]), (highest_compare) =>
                    iterForOrSuspend(iter, (i) =>
                        chainOrSuspend(pyCallOrSuspend(key, [i]), (i_compare) => {
                            if (objectRichCompare(i_compare, highest_compare, "Gt")) {
                                highest = i;
                                highest_compare = i_compare;
                            }
                        })
                    )
                );
            }
        },
        () => {
            if (highest === undefined) {
                if ($default === null) {
                    throw new pyExc.ValueError("min() arg is an empty sequence");
                } else {
                    highest = $default;
                }
            }
            return highest;
        }
    );
}

function any(iter) {
    return chainOrSuspend(
        iterForOrSuspend(objectGetIter(iter), function (i) {
            if (objectIsTrue(i)) {
                return new Break(pyTrue);
            }
        }),
        (brValue) => brValue || pyFalse
    );
}

function all(iter) {
    return chainOrSuspend(
        iterForOrSuspend(objectGetIter(iter), function (i) {
            if (!objectIsTrue(i)) {
                return new Break(pyFalse);
            }
        }),
        (brValue) => brValue || pyTrue
    );
}

function sum(iter, start) {
    var tot;
    // follows the order of CPython checks
    const it = objectGetIter(iter);
    if (start === undefined) {
        tot = new pyInt(0);
    } else if (checkString(start)) {
        throw new pyExc.TypeError("sum() can't sum strings [use ''.join(seq) instead]");
    } else {
        tot = start;
    }

    function fastSumInt() {
        return iterForOrSuspend(it, (i) => {
            if (i.constructor === pyInt) {
                tot = tot.nb$add(i);
            } else if (i.constructor === pyFloat) {
                tot = tot.nb$float_().nb$add(i);
                return new Break("float");
            } else {
                tot = numberBinOp(tot, i, "Add");
                return new Break("slow");
            }
        });
    }

    function fastSumFloat() {
        return iterForOrSuspend(it, (i) => {
            if (i.constructor === pyFloat || i.constructor === pyInt) {
                tot = tot.nb$add(i);
            } else {
                tot = numberBinOp(tot, i, "Add");
                return new Break("slow");
            }
        });
    }

    function slowSum() {
        return iterForOrSuspend(it, (i) => {
            tot = numberBinOp(tot, i, "Add");
        });
    }

    let sumType;
    if (start === undefined || start.constructor === pyInt) {
        sumType = fastSumInt();
    } else if (start.constructor === pyFloat) {
        sumType = "float";
    } else {
        sumType = "slow";
    }

    return chainOrSuspend(
        sumType,
        (sumType) => {
            if (sumType === "float") {
                return fastSumFloat();
            }
            return sumType;
        },
        (sumType) => {
            if (sumType === "slow") {
                return slowSum();
            }
        },
        () => tot
    );
}

function abs(x) {
    if (x.nb$abs) {
        return x.nb$abs();
    }
    throw new TypeError("bad operand type for abs(): '" + typeName(x) + "'");
}

// fabs belongs in the math module but has been a Skulpt builtin since 41665a97d (2012).
// Left in for backwards compatibility for now
function fabs(x) {
    return builtinFuncs.abs(x);
}

function ord(x) {
    if (checkString(x)) {
        if (x.v.length !== 1 && x.sq$length() !== 1) {
            // ^^ avoid the astral check unless necessary ^^
            throw new pyExc.TypeError("ord() expected a character, but string of length " + x.v.length + " found");
        }
        return new pyInt(x.v.codePointAt(0));
    } else if (checkBytes(x)) {
        if (x.sq$length() !== 1) {
            throw new pyExc.TypeError("ord() expected a character, but string of length " + x.v.length + " found");
        }
        return new pyInt(x.v[0]);
    }
    throw new pyExc.TypeError("ord() expected a string of length 1, but " + typeName(x) + " found");
}

function chr(x) {
    if (!checkInt(x)) {
        throw new pyExc.TypeError("an integer is required");
    }
    x = Number(x);
    if (Sk.__future__.python3) {
        if (x < 0 || x >= 0x110000) {
            throw new pyExc.ValueError("chr() arg not in range(0x110000)");
        }
    } else {
        if (x < 0 || x >= 256) {
            throw new pyExc.ValueError("chr() arg not in range(256)");
        }
    }

    return new pyStr(String.fromCodePoint(x));
}

function unichr(x) {
    if (!checkInt(x)) {
        throw new pyExc.TypeError("an integer is required");
    }

    try {
        return new pyStr(String.fromCodePoint(Number(x)));
    } catch (err) {
        if (err instanceof RangeError) {
            throw new pyExc.ValueError(err.message);
        }
        throw err;
    }
}

/**
 * This is a helper function and we already know that x is an int or has an nb$index slot
 */
function int2str_(x, radix, prefix) {
    const v = asIndex(x);
    let str = v.toString(radix);
    if (v < 0) {
        str = "-" + prefix + str.slice(1);
    } else {
        str = prefix + str;
    }
    if (radix !== 2 && !Sk.__future__.python3 && (x instanceof pyLong || JSBI.__isBigInt(v))) {
        str += "L";
    }
    return new pyStr(str);
}

function hex(x) {
    if (!checkIndex(x)) {
        throw new pyExc.TypeError("hex() argument can't be converted to hex");
    }
    return int2str_(x, 16, "0x");
}

function oct(x) {
    if (!checkIndex(x)) {
        throw new pyExc.TypeError("oct() argument can't be converted to hex");
    }
    if (Sk.__future__.octal_number_literal) {
        return int2str_(x, 8, "0o");
    } else {
        return int2str_(x, 8, "0");
    }
}

function bin(x) {
    if (!checkIndex(x)) {
        throw new pyExc.TypeError("'" + typeName(x) + "' object can't be interpreted as an index");
    }
    return int2str_(x, 2, "0b");
}

function dir(obj) {
    if (obj !== undefined) {
        const obj_dir_func = objectLookupSpecial(obj, pyStr.$dir);
        return chainOrSuspend(pyCallOrSuspend(obj_dir_func, []), (dir) => builtinFuncs.sorted(dir));
        // now iter through the keys and check they are all stings
    }
    // then we want all the objects in the global scope
    //todo
    throw new pyExc.NotImplementedError("skulpt does not yet support dir with no args");
}

function repr(x) {
    return x.$r();
}

function ascii(x) {
    return chainOrSuspend(x.$r(), (r) => {
        let ret;
        let i;
        // Fast path
        for (i = 0; i < r.v.length; i++) {
            if (r.v.charCodeAt(i) >= 0x7f) {
                ret = r.v.substr(0, i);
                break;
            }
        }
        if (!ret) {
            return r;
        }
        for (; i < r.v.length; i++) {
            let c = r.v.charAt(i);
            let cc = r.v.charCodeAt(i);

            if (cc > 0x7f && cc <= 0xff) {
                let ashex = cc.toString(16);
                if (ashex.length < 2) {
                    ashex = "0" + ashex;
                }
                ret += "\\x" + ashex;
            } else if ((cc > 0x7f && cc < 0xd800) || cc >= 0xe000) {
                // BMP
                ret += "\\u" + ("000" + cc.toString(16)).slice(-4);
            } else if (cc >= 0xd800) {
                // Surrogate pair stuff
                let val = r.v.codePointAt(i);
                i++;

                val = val.toString(16);
                let s = "0000000" + val.toString(16);
                if (val.length > 4) {
                    ret += "\\U" + s.slice(-8);
                } else {
                    ret += "\\u" + s.slice(-4);
                }
            } else {
                ret += c;
            }
        }
        return new pyStr(ret);
    });
}

function open(filename, mode, bufsize) {
    if (mode === undefined) {
        mode = new pyStr("r");
    }

    if (/\+/.test(mode.v)) {
        throw "todo; haven't implemented read/write mode";
    } else if ((mode.v === "w" || mode.v === "wb" || mode.v === "a" || mode.v === "ab") && !Sk.nonreadopen) {
        throw "todo; haven't implemented non-read opens";
    }

    return new pyFile(filename, mode, bufsize);
}

function isinstance(obj, type) {
    if (!checkClass(type) && !(type instanceof pyTuple)) {
        throw new pyExc.TypeError("isinstance() arg 2 must be a class, type, or tuple of classes and types");
    }

    // Fast path
    const act_type = obj.ob$type;
    if (act_type === type) {
        return pyTrue;
    }
    if (!(type instanceof pyTuple)) {
        // attempt 1
        if (act_type.$isSubType(type)) {
            return pyTrue;
        }
        // fail so check if we have overriden __class__
        const maybe_type = obj.tp$getattr(pyStr.$class);
        if (maybe_type == act_type) {
            return pyFalse;
        } else if (checkClass(maybe_type) && maybe_type.$isSubType(type)) {
            return pyTrue;
        }
        return pyFalse;
    }
    // Handle tuple type argument
    for (let i = 0; i < type.v.length; ++i) {
        if (objectIsTrue(builtinFuncs.isinstance(obj, type.v[i]))) {
            return pyTrue;
        }
    }
    return pyFalse;
}

function hash(obj) {
    return new pyInt(objectHash(obj));
}

function getattr(obj, pyName, default_) {
    if (!checkString(pyName)) {
        throw new pyExc.TypeError("attribute name must be string");
    }
    const res = tryCatchOrSuspend(
        () => obj.tp$getattr(pyName, true),
        (e) => {
            if (e instanceof pyExc.AttributeError) {
                return undefined;
            } else {
                throw e;
            }
        }
    );
    return chainOrSuspend(res, (r) => {
        if (r === undefined) {
            if (default_ !== undefined) {
                return default_;
            }
            throw new pyExc.AttributeError(obj.sk$attrError() + " has no attribute " + objectRepr(pyName));
        }
        return r;
    });
}

function setattr(obj, pyName, value) {
    // cannot set or del attr from builtin type
    if (!checkString(pyName)) {
        throw new pyExc.TypeError("attribute name must be string");
    }
    return chainOrSuspend(obj.tp$setattr(pyName, value, true), () => {
        return pyNone;
    });
}

function raw_input(prompt) {
    var lprompt = prompt ? prompt : "";

    return chainOrSuspend(importModule("sys", false, true), function (sys) {
        if (Sk.inputfunTakesPrompt) {
            return pyFile.$readline(sys["$d"]["stdin"], null, lprompt);
        } else {
            return chainOrSuspend(
                undefined,
                function () {
                    return pyCallOrSuspend(sys["$d"]["stdout"]["write"], [sys["$d"]["stdout"], new pyStr(lprompt)]);
                },
                function () {
                    return pyCallOrSuspend(sys["$d"]["stdin"]["readline"], [sys["$d"]["stdin"]]);
                }
            );
        }
    });
}


function jseval(evalcode) {
    const result = Sk.global.eval(evalcode.toString());
    return remapToPy(result);
}

function eval_() {
    throw new pyExc.NotImplementedError("eval is not yet implemented");
}

function reduce(fun, seq, initializer) {
    var item;
    var accum_value;
    var iter;
    if (!checkIterable(seq)) {
        throw new pyExc.TypeError("'" + typeName(seq) + "' object is not iterable");
    }

    iter = objectGetIter(seq);
    if (initializer === undefined) {
        initializer = iter.tp$iternext();
        if (initializer === undefined) {
            throw new pyExc.TypeError("reduce() of empty sequence with no initial value");
        }
    }
    accum_value = initializer;
    for (item = iter.tp$iternext(); item !== undefined; item = iter.tp$iternext()) {
        accum_value = pyCall(fun, [accum_value, item]);
    }

    return accum_value;
}

function hasattr(obj, pyName) {
    if (!checkString(pyName)) {
        throw new pyExc.TypeError("hasattr(): attribute name must be string");
    }
    const res = tryCatchOrSuspend(
        () => obj.tp$getattr(pyName, true),
        (e) => {
            if (e instanceof pyExc.AttributeError) {
                return undefined;
            } else {
                throw e;
            }
        }
    );
    return chainOrSuspend(res, (val) => (val === undefined ? pyFalse : pyTrue));
}

function pow(v, w, z) {
    // skulpt does support ternary slots
    if (z === undefined || checkNone(z)) {
        return numberBinOp(v, w, "Pow");
    }
    // only support a third argument if they're all the integers.
    if (!(checkInt(v) && checkInt(w) && checkInt(z))) {
        if (checkFloat(v) || checkComplex(v)) {
            return v.nb$power(w, z); // these slots for float and complex throw the correct errors
        }
        throw new pyExc.TypeError("unsupported operand type(s) for ** or pow(): '" + typeName(v) + "', '" + typeName(w) + "', '" + typeName(z) + "'");
    }
    return v.nb$power(w, z);
}

function quit(msg) {
    var s = msg.toString();
    throw new pyExc.SystemExit(s);
}

function issubclass(c1, c2) {
    if (!checkClass(c1)) {
        throw new pyExc.TypeError("issubclass() arg 1 must be a class");
    }
    let c2_isClass = checkClass(c2);
    if (!c2_isClass && !(c2 instanceof pyTuple)) {
        throw new pyExc.TypeError("issubclass() arg 2 must be a class or tuple of classes");
    }
    if (c2_isClass) {
        return c1.$isSubType(c2) ? pyTrue : pyFalse;
    }
    // Handle tuple type argument
    for (let i = 0; i < c2.v.length; ++i) {
        if (objectIsTrue(builtinFuncs.issubclass(c1, c2.v[i]))) {
            return pyTrue;
        }
    }
    return pyFalse;
}

function globals() {
    var ret = new pyDict([]);
    Object.entries(Sk.globals).forEach(([global, value]) => {
        ret.mp$ass_subscript(new pyStr(unfixReserved(global)), value);
    });
    return ret;
}

function divmod(a, b) {
    return numberBinOp(a, b, "DivMod");
}

/**
 * Convert a value to a “formatted” representation, as controlled by format_spec. The interpretation of format_spec
 * will depend on the type of the value argument, however there is a standard formatting syntax that is used by most
 * built-in types: Format Specification Mini-Language.
 */
function format(obj, format_spec) {
    if (format_spec === undefined) {
        format_spec = pyStr.$emptystr;
    }
    return objectFormat(obj, format_spec);
}

var $id = 0;
const idMap = new Map();

function id(obj) {
    let _id = idMap.get(obj);
    if (_id !== undefined) {
        return new pyInt(_id);
    }
    idMap.set(obj, ++$id);
    return new pyInt($id);
}

function bytearray() {
    throw new pyExc.NotImplementedError("bytearray is not yet implemented");
}

function callable(obj) {
    return checkCallable(obj) ? pyTrue : pyFalse;
}

function delattr(obj, attr) {
    return builtinFuncs.setattr(obj, attr, undefined);
}

function execfile() {
    throw new pyExc.NotImplementedError("execfile is not yet implemented");
}

function help() {
    throw new pyExc.NotImplementedError("help is not yet implemented");
}

function iter(obj, sentinel) {
    if (arguments.length === 1) {
        return objectGetIter(obj);
    } else {
        return objectGetIter(new pyCallableIter(obj, sentinel));
    }
}

function locals() {
    throw new pyExc.NotImplementedError("locals is not yet implemented");
}
function memoryview() {
    throw new pyExc.NotImplementedError("memoryview is not yet implemented");
}

function next_(iter, default_) {
    var nxt;
    if (!iter.tp$iternext) {
        throw new pyExc.TypeError("'" + typeName(iter) + "' object is not an iterator");
    }
    nxt = iter.tp$iternext();
    if (nxt === undefined) {
        if (default_) {
            return default_;
        }
        throw new pyExc.StopIteration();
    }
    return nxt;
}

function reload() {
    throw new pyExc.NotImplementedError("reload is not yet implemented");
}
function vars() {
    throw new pyExc.NotImplementedError("vars is not yet implemented");
}

function apply_() {
    throw new pyExc.NotImplementedError("apply is not yet implemented");
}
function buffer_() {
    throw new pyExc.NotImplementedError("buffer is not yet implemented");
}
function coerce() {
    throw new pyExc.NotImplementedError("coerce is not yet implemented");
}
function intern() {
    throw new pyExc.NotImplementedError("intern is not yet implemented");
}

/*
 builtinFuncs.iles = {};
function read(x) {
 if (builtinFuncs.iles === undefined || builtinFuncs.iles["files"][x] === undefined)
 throw "File not found: '" + x + "'";
 return builtinFuncs.iles["files"][x];
 };
 builtinFuncs.iles = undefined;
 */
