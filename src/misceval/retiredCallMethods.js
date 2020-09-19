
/**
 *
 * Notes on necessity for 'call()':
 *
 * Classes are callable in python to create an instance of the class. If
 * we're calling "C()" we cannot tell at the call site whether we're
 * calling a standard function, or instantiating a class.
 *
 * JS does not support user-level callables. So, we can't use the normal
 * prototype hierarchy to make the class inherit from a 'class' type
 * where the various tp$getattr, etc. methods would live.
 *
 * Instead, we must copy all the methods from the prototype of our class
 * type onto every instance of the class constructor function object.
 * That way, both "C()" and "C.tp$getattr(...)" can still work. This is
 * of course quite expensive.
 *
 * The alternative would be to indirect all calls (whether classes or
 * regular functions) through something like C.$call(...). In the case
 * of class construction, $call could then call the constructor after
 * munging arguments to pass them on. This would impose a penalty on
 * regular function calls unfortunately, as they would have to do the
 * same thing.
 *
 * Note that the same problem exists for function objects too (a "def"
 * creates a function object that also has properties). It just happens
 * that attributes on classes in python are much more useful and common
 * that the attributes on functions.
 *
 * Also note, that for full python compatibility we have to do the $call
 * method because any python object could have a __call__ method which
 * makes the python object callable too. So, unless we were to make
 * *all* objects simply (function(){...}) and use the dict to create
 * hierarchy, there would be no way to call that python user function. I
 * think I'm prepared to sacrifice __call__ support, or only support it
 * post-ECMA5 or something.
 *
 * Is using (function(){...}) as the only object type too crazy?
 * Probably. Better or worse than having two levels of function
 * invocation for every function call?
 *
 * For a class `C' with instance `inst' we have the following cases:
 *
 * 1. C.attr
 *
 * 2. C.staticmeth()
 *
 * 3. x = C.staticmeth; x()
 *
 * 4. inst = C()
 *
 * 5. inst.attr
 *
 * 6. inst.meth()
 *
 * 7. x = inst.meth; x()
 *
 * 8. inst(), where C defines a __call__
 *
 * Because in general these are accomplished by a helper function
 * (tp$getattr/setattr/slice/ass_slice/etc.) it seems appropriate to add
 * a call that generally just calls through, but sometimes handles the
 * unusual cases. Once ECMA-5 is more broadly supported we can revisit
 * and hopefully optimize.
 *
 * @param {Object} func the thing to call
 * @param {Object=} kwdict **kwargs
 * @param {Object=} varargseq **args
 * @param {Object=} kws keyword args or undef
 * @param {...*} args stuff to pass it
 *
 *
 * @todo I think all the above is out of date.
 * @ignore
 */
Sk.misceval.call = function (func, kwdict, varargseq, kws, args) {
    args = Array.prototype.slice.call(arguments, 4);
    // todo; possibly inline apply to avoid extra stack frame creation
    return Sk.misceval.apply(func, kwdict, varargseq, kws, args);
};


/**
 * @param {?Object} suspensionHandlers
 * @param {Object} func the thing to call
 * @param {Object=} kwdict **kwargs
 * @param {Object=} varargseq **args
 * @param {Object=} kws keyword args or undef
 * @param {...*} args stuff to pass it
 *
 *
 * @todo I think all the above is out of date.
 */

Sk.misceval.callAsync = function (suspensionHandlers, func, kwdict, varargseq, kws, args) {
    args = Array.prototype.slice.call(arguments, 5);
    // todo; possibly inline apply to avoid extra stack frame creation
    return Sk.misceval.applyAsync(suspensionHandlers, func, kwdict, varargseq, kws, args);
};


Sk.misceval.callOrSuspend = function (func, kwdict, varargseq, kws, args) {
    args = Array.prototype.slice.call(arguments, 4);
    // todo; possibly inline apply to avoid extra stack frame creation
    return Sk.misceval.applyOrSuspend(func, kwdict, varargseq, kws, args);
};
Sk.exportSymbol("Sk.misceval.callOrSuspend", Sk.misceval.callOrSuspend);

/**
 * @param {Object} func the thing to call
 * @param {...*} args stuff to pass it
 * @ignore
 */
Sk.misceval.callsim = function (func, args) {
    args = Array.prototype.slice.call(arguments, 1);
    return Sk.misceval.apply(func, undefined, undefined, undefined, args);
};
Sk.exportSymbol("Sk.misceval.callsim", Sk.misceval.callsim);

/**
 * @param {Object=} func the thing to call
 * @param {Array=} args an array of arguments to pass to the func
 * @param {Array=} kws an array of string/pyObject pairs to pass to the func as kwargs
 * 
 * @description
 * Call a pyObject - if the object is not callable will throw a TypeError
 * Requires args to be a Javascript array.
 * kws should be an array of string/pyObject pairs as key/values
 */
Sk.misceval.callsimArray = function (func, args, kws) {
    var argarray = args ? args : [];
    return Sk.misceval.apply(func, undefined, undefined, kws, argarray);
};
Sk.exportSymbol("Sk.misceval.callsimArray", Sk.misceval.callsimArray);

/**
 * @param {?Object} suspensionHandlers any custom suspension handlers
 * @param {Object} func the thing to call
 * @param {...*} args stuff to pass it
 */
Sk.misceval.callsimAsync = function (suspensionHandlers, func, args) {
    args = Array.prototype.slice.call(arguments, 2);
    return Sk.misceval.applyAsync(suspensionHandlers, func, undefined, undefined, undefined, args);
};
Sk.exportSymbol("Sk.misceval.callsimAsync", Sk.misceval.callsimAsync);

/**
 * @param {Object} func the thing to call
 * @param {...*} args stuff to pass it
 * @deprecated
 * @ignore
 */
Sk.misceval.callsimOrSuspend = function (func, args) {
    args = Array.prototype.slice.call(arguments, 1);
    return Sk.misceval.applyOrSuspend(func, undefined, undefined, undefined, args);
};
Sk.exportSymbol("Sk.misceval.callsimOrSuspend", Sk.misceval.callsimOrSuspend);

/**
 * @description
 * Does the same thing as callsimOrSuspend without expensive call to
 * Array.slice.  Requires args+kws to be Javascript arrays. 
 * The preferred method for calling a pyObject. 
 * 
 * @param {Object=} func the thing to call
 * @param {Array=} args an array of arguments to pass to the func
 * @param {Array=} kws an array of keyword arguments to pass to the func
 *
 */
Sk.misceval.callsimOrSuspendArray = function (func, args, kws) {
    if (!args) {
        args = [];
    }
    if (func.tp$call) {
        return func.tp$call(args, kws);
    } else {
        // Slow path handles things like calling native JS fns
        // (perhaps we should stop supporting that), and weird
        // detection of the __call__ method (everything should use tp$call)
        return Sk.misceval.applyOrSuspend(func, undefined, undefined, kws, args);
    }
};


/**
 * same as Sk.misceval.call except args is an actual array, rather than
 * varargs.
 * @deprecated
 * @ignore
 */
Sk.misceval.applyOrSuspend = function (func, kwdict, varargseq, kws, args) {
    var fcall;
    var it, i;

    if (func == null || func === Sk.builtin.none.none$) {
        throw new Sk.builtin.TypeError("'" + Sk.abstr.typeName(func) + "' object is not callable");
    }

    if (typeof func === "function" && func.tp$call === undefined) {
        func = new Sk.builtin.func(func);
    }

    fcall = func.tp$call;
    if (fcall !== undefined) {
        if (varargseq) {
            for (it = varargseq.tp$iter(), i = it.tp$iternext(); i !== undefined; i = it.tp$iternext()) {
                args.push(i);
            }
        }

        if (kwdict) {
            for (it = Sk.abstr.iter(kwdict), i = it.tp$iternext(); i !== undefined; i = it.tp$iternext()) {
                if (!Sk.builtin.checkString(i)) {
                    throw new Sk.builtin.TypeError("Function keywords must be strings");
                }
                kws.push(i.v);
                kws.push(Sk.abstr.objectGetItem(kwdict, i, false));
            }
        }
        return fcall.call(func, args, kws, kwdict);
    }

    // todo; can we push this into a tp$call somewhere so there's
    // not redundant checks everywhere for all of these __x__ ones?
    fcall = func.__call__;
    if (fcall !== undefined) {
        // func is actually the object here because we got __call__
        // from it. todo; should probably use descr_get here
        args.unshift(func);
        return Sk.misceval.apply(fcall, kwdict, varargseq, kws, args);
    }

    throw new Sk.builtin.TypeError("'" + Sk.abstr.typeName(func) + "' object is not callable");
};
Sk.exportSymbol("Sk.misceval.applyOrSuspend", Sk.misceval.applyOrSuspend);


/**
 * Wrap Sk.misceval.applyOrSuspend, but throw an error if we suspend
 * @ignore
 */
Sk.misceval.apply = function (func, kwdict, varargseq, kws, args) {
    var r = Sk.misceval.applyOrSuspend(func, kwdict, varargseq, kws, args);
    if (r instanceof Suspension) {
        return Sk.misceval.retryOptionalSuspensionOrThrow(r);
    } else {
        return r;
    }
};
Sk.exportSymbol("Sk.misceval.apply", Sk.misceval.apply);


Sk.misceval.applyAsync = function (suspHandlers, func, kwdict, varargseq, kws, args) {
    return Sk.misceval.asyncToPromise(function () {
        return Sk.misceval.applyOrSuspend(func, kwdict, varargseq, kws, args);
    }, suspHandlers);
};
Sk.exportSymbol("Sk.misceval.applyAsync", Sk.misceval.applyAsync);