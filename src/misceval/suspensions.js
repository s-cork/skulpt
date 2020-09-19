import { pyExc, pyObject } from "../internal";

/**
 * 
 * @description
 * Various function protocols that include suspension aware options
 * As well as handling some common pyObject operations to Javascript
 *
 */

/** @typedef {pyObject}*/

/*
  Suspension object format:
  {resume: function() {...}, // the continuation - returns either another suspension or the return value
   data: <copied down from innermost level>,
   optional: <if true, can be resumed immediately (eg debug stops)>,
   child: <Suspension, or null if we are the innermost level>,
   $blk: <>, $loc: <>, $gbl: <>, $exc: <>, $err: <>, [$cell: <>],
  }
*/

/**
 * @constructor
 * @description
 * Hi kids lets make a suspension...
 *
 
 */
export class Suspension {

    constructor(resume, child, data) {
        this.$isSuspension = true;
        if (resume !== undefined && child !== undefined) {
            this.resume = () => resume(child.resume());
        }
        this.child = child;
        this.optional = child !== undefined && child.optional;
        if (data === undefined && child !== undefined) {
            this.data = child.data;
        } else {
            this.data = data;
        }
    }
}


/**
 * @description
 * Well this seems pretty obvious by the name what it should do..
 *
 * @param {Suspension} susp
 * @param {string=} message
 */
export function retryOptionalSuspensionOrThrow (susp, message) {
    while (susp instanceof Suspension) {
        if (!susp.optional) {
            throw new pyExc.SuspensionError(message || "Cannot call a function that blocks or suspends here");
        }
        susp = susp.resume();
    }
    return susp;
};



/**
 * Chain together a set of functions, each of which might return a value or
 * an Suspension. Each function is called with the return value of
 * the preceding function, but does not see any suspensions. If a function suspends,
 * chainOrSuspend() returns a suspension that will resume the chain once an actual
 * return value is available.
 *
 * The idea is to allow a Promise-like chaining of possibly-suspending steps without
 * repeating boilerplate suspend-and-resume code.
 *
 * For example, imagine we call chainOrSuspend(x, f).
 *  - If x is a value, we return f(x).
 *  - If x is a suspension, we suspend. We will suspend and resume until we get a
 *    return value, and then we will return f(<resumed-value).
 * This can be expanded to an arbitrary number of functions
 * (eg chainOrSuspend(x, f, g), which is equivalent to chain(chain(x, f), g).)
 * @template T
 * @param {T}              initialValue
 * @param {...function(T)} chainedFns
 */
export function chainOrSuspend(initialValue, chainedFns) {
    // We try to minimse overhead when nothing suspends (the common case)
    var i = 1,
        value = initialValue,
        j,
        fs;

    while (true) {
        if (i == arguments.length) {
            return value;
        }
        if (value && value.$isSuspension) {
            break;
        } // oops, slow case
        value = arguments[i](value);
        i++;
    }

    // Okay, we've suspended at least once, so we're taking the slow(er) path.

    // Copy our remaining arguments into an array (inline, because passing
    // "arguments" out of a function kills the V8 optimiser).
    // (discussion: https://github.com/skulpt/skulpt/pull/552)
    fs = new Array(arguments.length - i);

    for (j = 0; j < arguments.length - i; j++) {
        fs[j] = arguments[i + j];
    }

    j = 0;

    return (function nextStep(r) {
        while (j < fs.length) {
            if (r instanceof Suspension) {
                return new Suspension(nextStep, r);
            }

            r = fs[j](r);
            j++;
        }

        return r;
    })(value);
};

/**
 * Catch any exceptions thrown by a function, or by resuming any suspension it
 * returns.
 *
 *     var result = tryCatchOrSuspend(asyncFunc, function(err) {
 *       console.log(err);
 *     });
 *
 * Because exceptions are returned asynchronously aswell you can't catch them
 * with a try/catch. That's what this function is for.
 */
export function tryCatchOrSuspend (tryFn, catchFn) {
    var r;

    try {
        r = tryFn();
    } catch (e) {
        return catchFn(e);
    }

    if (r instanceof Suspension) {
        var susp = new Suspension(undefined, r);
        susp.resume = function () {
            return tryCatchOrSuspend(r.resume, catchFn);
        };
        return susp;
    } else {
        return r;
    }
};



/**
 * Do the boilerplate suspension stuff.
 */
export function promiseToSuspension(promise) {
    var suspension = new Suspension();

    suspension.resume = function () {
        if (suspension.data["error"]) {
            throw suspension.data["error"];
        }

        return suspension.data["result"];
    };

    suspension.data = {
        type: "Sk.promise",
        promise: promise,
    };

    return suspension;
};

