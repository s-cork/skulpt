

Sk.builtin.filter = function filter(fun, iterable) {
    var result;
    var iter, item;
    var retval;
    var ret;
    var add;
    var ctor;
    Sk.builtin.pyCheckArgsLen("filter", arguments.length, 2, 2);
    if (!checkIterable(iterable)) {
        throw new pyExc.TypeError("'" + typeName(iterable) + "' object is not iterable");
    }
    ctor = function () {
        return [];
    };
    add = function (iter, item) {
        iter.push(item);
        return iter;
    };
    ret = function (iter) {
        return new pyList(iter);
    };

    if (iterable.ob$type === pyStr) {
        ctor = function () {
            return new pyStr("");
        };
        add = function (iter, item) {
            return iter.sq$concat(item);
        };
        ret = function (iter) {
            return iter;
        };
    } else if (iterable.ob$type === Sk.builtin.tuple) {
        ret = function (iter) {
            return new pyTuple(iter);
        };
    }

    retval = ctor();

    for (iter = objectGetIter(iterable), item = iter.tp$iternext(); item !== undefined; item = iter.tp$iternext()) {
        if (fun === pyNone) {
            result = new Sk.builtin.bool(item);
        } else {
            result = pyCall(fun, [item]);
        }

        if (objectIsTrue(result)) {
            retval = add(retval, item);
        }
    }

    return ret(retval);
};



Sk.builtin.map = function map(fun, seq) {
    var retval = [];
    var next;
    var nones;
    var args;
    var argnum;
    var i;
    var iterables;
    var combined;
    Sk.builtin.pyCheckArgsLen("map", arguments.length, 2);

    if (arguments.length > 2) {
        // Pack sequences into one list of Javascript Arrays

        combined = [];
        iterables = Array.prototype.slice.apply(arguments).slice(1);
        for (i = 0; i < iterables.length; i++) {
            if (!checkIterable(iterables[i])) {
                argnum = parseInt(i, 10) + 2;
                throw new pyExc.TypeError("argument " + argnum + " to map() must support iteration");
            }
            iterables[i] = objectGetIter(iterables[i]);
        }

        while (true) {
            args = [];
            nones = 0;
            for (i = 0; i < iterables.length; i++) {
                next = iterables[i].tp$iternext();
                if (next === undefined) {
                    args.push(pyNone);
                    nones++;
                } else {
                    args.push(next);
                }
            }
            if (nones !== iterables.length) {
                combined.push(args);
            } else {
                // All iterables are done
                break;
            }
        }
        seq = new pyList(combined);
    }

    if (!checkIterable(seq)) {
        throw new pyExc.TypeError("'" + typeName(seq) + "' object is not iterable");
    }

    return chainOrSuspend(
        iterForOrSuspend(objectGetIter(seq), function (item) {
            if (fun === pyNone) {
                if (item instanceof Array) {
                    // With None function and multiple sequences,
                    // map should return a list of tuples
                    item = new pyTuple(item);
                }
                retval.push(item);
            } else {
                if (!(item instanceof Array)) {
                    // If there was only one iterable, convert to Javascript
                    // Array for call to apply.
                    item = [item];
                }

                return chainOrSuspend(pyCallOrSuspend(fun, item), function (result) {
                    retval.push(result);
                });
            }
        }),
        function () {
            return new pyList(retval);
        }
    );
};



Sk.builtin.zip = function zip() {
    var el;
    var tup;
    var done;
    var res;
    var i;
    var iters;
    if (arguments.length === 0) {
        return new pyList([]);
    }

    iters = [];
    for (i = 0; i < arguments.length; i++) {
        if (checkIterable(arguments[i])) {
            iters.push(objectGetIter(arguments[i]));
        } else {
            throw new pyExc.TypeError("argument " + i + " must support iteration");
        }
    }
    res = [];
    done = false;
    while (!done) {
        tup = [];
        for (i = 0; i < arguments.length; i++) {
            el = iters[i].tp$iternext();
            if (el === undefined) {
                done = true;
                break;
            }
            tup.push(el);
        }
        if (!done) {
            res.push(new pyTuple(tup));
        }
    }
    return new pyList(res);
};
