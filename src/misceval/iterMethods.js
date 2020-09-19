import { Suspension, chainOrSuspend, asserts, objectGetIter, retryOptionalSuspensionOrThrow } from "../internal";

/**
 * @constructor
 * @description
 * Hi kids lets make a suspension...
 *
 * @param {function(?)=} resume A function to be called on resume. child is resumed first and its return value is passed to this function.
 * @param {Object=} child A child suspension. 'optional' will be copied from here if supplied.
 * @param {Object=} data Data attached to this suspension. Will be copied from child if not supplied.
 */
export class Break {
    constructor(brValue) {
        this.brValue = brValue;
    }
}

/**
 * @function
 * @description
 * Perform a suspension-aware for-each on an iterator, without
 * blowing up the stack.
 * forFn() is called for each element in the iterator, with two
 * arguments: the current element and the previous return value
 * of forFn() (or initialValue on the first call). In this way,
 * iterFor() can be used as a simple for loop, or alternatively
 * as a 'reduce' operation. The return value of the final call to
 * forFn() will be the return value of iterFor() (after all
 * suspensions are resumed, that is; if the iterator is empty then
 * initialValue will be returned.)
 *
 * The iteration can be terminated early, by returning
 * an instance of Break. If an argument is given to
 * the Break() constructor, that value will be
 * returned from iterFor(). It is therefore possible to use
 * iterFor() on infinite iterators.
 *
 * @param {*} iter
 * @param {function(pyObject,*=)} forFn
 * @param {*=} initialValue
 */
export function iterForOrSuspend(iter, forFn, initialValue) {
    var prevValue = initialValue;

    function breakOrIterNext(r) {
        prevValue = r;
        return r instanceof Break ? r : iter.tp$iternext(true);
    }

    return (function nextStep(i) {
        while (i !== undefined) {
            if (i instanceof Suspension) {
                return new Suspension(nextStep, i);
            }

            if (i === Break || i instanceof Break) {
                return i.brValue;
            }

            i = chainOrSuspend(forFn(i, prevValue), breakOrIterNext);
        }
        return prevValue;
    })(iter.tp$iternext(true));
}

/**
 * @function
 * @description
 *
 * As per iterFor but with an array rather than a python iterable
 * Useful for iterating over args where doing so could result in a suspension
 *
 * @param {Array} args
 * @param {function(pyObject,*=)} forFn
 * @param {*=} initialValue
 */
export function iterArrayOrSuspend(args, forFn, initialValue) {
    asserts.assert(Array.isArray(args), "iterArrayOrSuspend requires an array");
    let i = 0;
    return iterForOrSuspend({ tp$iternext: () => args[i++] }, forFn, initialValue);
}

/**
 * @function
 *
 * @description
 * Convert a Python iterable into a javascript array
 *
 * @param {pyObject} iterable
 * @param {boolean=} canSuspend - Can this function suspend
 *
 * @returns {!Array}
 */
export function arrayFromIterable(iterable, canSuspend) {
    if (iterable === undefined) {
        return [];
    }
    if (iterable.hp$type === undefined && iterable.sk$asarray !== undefined) {
        // use sk$asarray only if we're a builtin
        return iterable.sk$asarray();
    }
    const L = [];
    const ret = chainOrSuspend(
        iterForOrSuspend(objectGetIter(iterable), (i) => {
            L.push(i);
        }),
        () => L
    );
    return canSuspend ? ret : retryOptionalSuspensionOrThrow(ret);
}
