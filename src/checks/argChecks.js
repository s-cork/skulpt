import {
    pyExc,
} from "../internal";



/**
 * @function
 * @param {string} func_name
 * @param {Array|undefined} kwargs
 * @throws {pyExc.TypeError}
 */
export function checkNoKwargs (func_name, kwargs) {
    if (kwargs && kwargs.length) {
        throw new pyExc.TypeError(func_name + "() takes no keyword arguments");
    }
};

/**
 * @function
 * @param {string} func_name
 * @param {Array} args
 * @param {Array|undefined=} kwargs
 *
 * @throws {pyExc.TypeError}
 */
export function checkNoArgs (func_name, args, kwargs) {
    const nargs = args.length + (kwargs ? kwargs.length : 0);
    if (nargs) {
        throw new pyExc.TypeError(func_name + "() takes no arguments (" + nargs + " given)");
    }
};

/**
 * @function
 * @param {string} func_name
 * @param {Array} args
 * @param {Array|undefined=} kwargs
 * @throws {pyExc.TypeError}
 */
export function checkOneArg (func_name, args, kwargs) {
    checkNoKwargs(func_name, kwargs);
    if (args.length !== 1) {
        throw new pyExc.TypeError(func_name + "() takes exactly one argument (" + args.length + " given)");
    }
};

/**
 * @function
 * @param {string} func_name
 * @param {Array} args
 * @param {number} minargs
 * @param {number=} [maxargs=Infinity]
 * @throws {pyExc.TypeError}
 *
 */
export function checkArgsLen (func_name, args, minargs, maxargs) {
    const nargs = args.length;
    let msg;
    if (maxargs === undefined) {
        maxargs = Infinity;
    }
    if (nargs < minargs || nargs > maxargs) {
        if (minargs === maxargs) {
            msg = func_name + "() takes exactly " + minargs + " arguments";
        } else if (nargs < minargs) {
            msg = func_name + "() takes at least " + minargs + " arguments";
        } else {
            msg = func_name + "() takes at most " + maxargs + " arguments";
        }
        msg += " (" + nargs + " given)";
        throw new pyExc.TypeError(msg);
    }
};



/**
 * Check arguments to Python functions to ensure the correct number of
 * arguments are passed.
 *
 * @param {string} name the name of the function
 * @param {Object} args the args passed to the function
 * @param {number} minargs the minimum number of allowable arguments
 * @param {number=} maxargs optional maximum number of allowable
 * arguments (default: Infinity)
 * @param {boolean=} kwargs optional true if kwargs, false otherwise
 * (default: false)
 * @param {boolean=} free optional true if free vars, false otherwise
 * (default: false)
 */
export function pyCheckArgs(name, args, minargs, maxargs, kwargs, free) {
    var nargs = args.length;
    var msg = "";

    if (maxargs === undefined) {
        maxargs = Infinity;
    }
    if (kwargs) {
        nargs -= 1;
    }
    if (free) {
        nargs -= 1;
    }
    if (nargs < minargs || nargs > maxargs) {
        if (minargs === maxargs) {
            msg = name + "() takes exactly " + minargs + " arguments";
        } else if (nargs < minargs) {
            msg = name + "() takes at least " + minargs + " arguments";
        } else if (minargs > 0) {
            msg = name + "() takes at most " + maxargs + " arguments";
        } else {
            msg = name + "() takes no arguments";
        }
        msg += " (" + nargs + " given)";
        throw new pyExc.TypeError(msg);
    }
};

/**
 * Check arguments to Python functions to ensure the correct number of
 * arguments are passed.
 *
 * @param {string} name the name of the function
 * @param {number} nargs the args passed to the function
 * @param {number} minargs the minimum number of allowable arguments
 * @param {number=} maxargs optional maximum number of allowable
 * arguments (default: Infinity)
 * @param {boolean=} kwargs optional true if kwargs, false otherwise
 * (default: false)
 * @param {boolean=} free optional true if free vars, false otherwise
 * (default: false)
 */
export function pyCheckArgsLen(name, nargs, minargs, maxargs, kwargs, free) {
    var msg = "";

    if (maxargs === undefined) {
        maxargs = Infinity;
    }
    if (kwargs) {
        nargs -= 1;
    }
    if (free) {
        nargs -= 1;
    }
    if (nargs < minargs || nargs > maxargs) {
        if (minargs === maxargs) {
            msg = name + "() takes exactly " + minargs + " arguments";
        } else if (nargs < minargs) {
            msg = name + "() takes at least " + minargs + " arguments";
        } else {
            msg = name + "() takes at most " + maxargs + " arguments";
        }
        msg += " (" + nargs + " given)";
        throw new pyExc.TypeError(msg);
    }
};


