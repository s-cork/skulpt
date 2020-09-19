import {
    pyExc,
    pyDict,
    pyStr,
    checkString,
    chainOrSuspend,
    pyCallOrSuspend,
    iterForOrSuspend,
    objectLookupSpecial,
    objectGetIter,
    remapToPy,
} from "../internal";


/**
 *
 * @function
 * @description
 * A helper function used by native js functions whose call method is FastCall i.e. the args and kwargs are provided as Array objects.
 *
 * @param {string} func_name - used for error messages
 * @param {Array<null|string>} varnames - Argument names to map to. For position only arguments use null
 * @param {Array} args - typically provided by the `tp$call` method
 * @param {Array|undefined} kwargs - typically provided the `tp$call` method
 * @param {Array=} defaults
 * @throws {pyExc.TypeError}
 *
 * @example
 * // base is a possible keyword argument for int_ and x is a position only argument
 * pyInt.prototype.tp$new = function(args, kwargs) {
 *     args = keywordArrayToNamedArgs("int", [null, "base"], args, kwargs, [
 *         new pyInt(0),
 *         pyNone,
 *     ]);
 * }
 */
export function keywordArrayToNamedArgs(func_name, varnames, args, kwargs, defaults) {
    // args is an array, kwargs is an array or undefined
    kwargs = kwargs || [];

    const nargs = args.length + kwargs.length / 2;
    if (nargs > varnames.length) {
        throw new pyExc.TypeError(func_name + "() expected at most " + varnames.length + " arguments (" + nargs + " given)");
    }
    if (!kwargs.length && defaults === undefined) {
        // no defaults supplied
        return args;
    } else if (nargs === varnames.length && !kwargs.length) {
        // position only arguments match
        return args;
    } else if (nargs === 0 && varnames.length === (defaults && defaults.length)) {
        // a fast case - no args so just return the defaults
        return defaults;
    }
    args = args.slice(0); // make a copy of args

    for (let i = 0; i < kwargs.length; i += 2) {
        const name = kwargs[i]; // JS string
        const value = kwargs[i + 1]; // Python value
        const idx = varnames.indexOf(name);

        if (idx >= 0) {
            if (args[idx] !== undefined) {
                throw new pyExc.TypeError(func_name + "() got multiple values for argument '" + name + "'");
            }
            args[idx] = value;
        } else {
            throw new pyExc.TypeError(func_name + "() got an unexpected keyword argument '" + name + "'");
        }
    }
    if (defaults) {
        const nargs = varnames.length;
        for (let i = nargs - 1; i >= 0; i--) {
            if (args[i] === undefined) {
                args[i] = defaults[defaults.length - 1 - (nargs - 1 - i)];
            }
        }
        const missing = varnames.filter((x, i) => args[i] === undefined);
        if (missing.length) {
            throw new pyExc.TypeError(func_name + "() missing " + missing.length + " required positional arguments: " + missing.join(", "));
        }
    }

    return args;
};


// Unpack mapping into a JS array of alternating keys/values, possibly suspending
// Skulpt uses a slightly grungy format for keyword args
// into misceval.apply() and friends (alternating JS strings and Python values).
// We should probably migrate that interface to using Python strings
// at some point, but in the meantime we have this function to
// unpack keyword dictionaries into our special format
export function keywordArrayFromMapping(jsArray, pyMapping, pyCodeObject) {
    if (pyMapping instanceof pyDict) {
        pyMapping.$items().forEach(([key, val]) => {
            if (!checkString(key)) {
                throw new pyExc.TypeError((pyCodeObject.$qualname ? pyCodeObject.$qualname + "() " : "") + "keywords must be strings");
            } 
            jsArray.push(key.toString());
            jsArray.push(val);
        });
        return;
    }

    const keyf = objectLookupSpecial(pyMapping, pyStr.$keys);
    if (keyf === undefined) {
        throw new pyExc.TypeError("Object is not a mapping");
    }
    return chainOrSuspend(pyCallOrSuspend(keyf), (keys) =>
        iterForOrSuspend(objectGetIter(keys), (key) => {
            if (!checkString(key)) {
                throw new pyExc.TypeError((pyCodeObject.$qualname ? pyCodeObject.$qualname + "() " : "") + "keywords must be strings");
            }
            return chainOrSuspend(pyMapping.mp$subscript(key, true), (val) => {
                jsArray.push(key.toString());
                jsArray.push(val);
            });
        })
    );
};


export function keywordArrayToDict(kwargs) {
    for (let i = 0; i < kwargs.length; i+=2) {
        kwargs[i] = new pyStr(kwargs[i]);
    }
    return new pyDict(kwargs);
}

export function keywordArrayFromHashMap(hashmap, remap) {
    let arr = Object.entries(hashmap);
    if (remap) {
        arr = arr.map(([key, val]) => [key, remapToPy(val)]);
    }
    return arr.flat();
}