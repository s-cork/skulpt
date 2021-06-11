function $builtinmodule(name) {
    const collections = {};
    // keyword.iskeyword and itertools.chain are required for collections
    const importModule = (name) => Sk.importModule(name, false, true);

    return Sk.misceval.chain(
        importModule("keyword"),
        (keyword_mod) => {
            collections._iskeyword = keyword_mod.$d.iskeyword;
            return importModule("itertools");
        },
        (itertools_mod) => {
            collections._chain = itertools_mod.$d.chain;
            collections._starmap = itertools_mod.$d.starmap;
            collections._repeat = itertools_mod.$d.repeat;
            return importModule("operator");
        },
        (operator) => {
            collections._itemgetter = operator.$d.itemgetter;
        },
        () => collections_mod(collections)
    );
}

function collections_mod(collections) {

    const {
        abtr: {
            typeName,
            buildIteratorClass,
            buildNativeClass,
            iter: getIter,
            checkArgsLen,
            numberBinOp,
            numberInplaceBinOp,
            copyKeywordsToNamedArgs,
            gattr: getAttr,
        },
        misceval: {
            callsimArray: pyCall,
            callsimOrSuspendArray: pyCallOrSuspend,
            objectRepr,
            iterFor,
            richCompareBool,
            asIndexOrThrow,
            isTrue,
            asIndexSized,
            opAllowsEquality,
            arrayFromIterable,
        },
        builtin: {
            dict: pyDict,
            str: pyStr,
            list: pyList,
            tuple: pyTuple,
            int_: pyInt,
            bool: { true$, pyTrue, false$: pyFalse },
            none: { none$, pyNone },
            map_: pyMap,
            func: pyFunc,
            property: pyProperty,
            classmethod: pyClassMethod,
            NotImplemented: { NotImplemented$: pyNotImplemented },
            checkNone,
            checkCallable,
            checkMapping,
            checkString,
            KeyError,
            TypeError,
            NotImplementedError,
            OverflowError,
            ValueError,
            IndexError,
        },
        ffi: { remapToPy: toPy },
        generic: {
            getSetDict: genericGetSetDict,
            new: genericNew,
            getAttr: genericGetAttr,
            iterReverseLengthHintMethodDef,
        }
    } = Sk;



    collections.__all__ = toPy([
        "deque",
        "defaultdict",
        "namedtuple",
        // 'UserDict',
        // 'UserList',
        // 'UserString',
        "Counter",
        "OrderedDict",
        // 'ChainMap'
    ]);

    // defaultdict object
    collections.defaultdict = buildNativeClass("collections.defaultdict", {
        constructor: function defaultdict(default_factory, L) {
            this.default_factory = default_factory;
            pyDict.call(this, L);
        },
        base: pyDict,
        methods: {
            copy: {
                $meth() {
                    return this.$copy();
                },
                $flags: { NoArgs: true },
            },
            __copy__: {
                $meth() {
                    return this.$copy();
                },
                $flags: { NoArgs: true },
            },
            __missing__: {
                $meth(key) {
                    if (checkNone(this.default_factory)) {
                        throw new KeyError(objectRepr(key));
                    } else {
                        const ret = pyCall(this.default_factory, []);
                        this.mp$ass_subscript(key, ret);
                        return ret;
                    }
                },
                $flags: { OneArg: true },
            },
        },
        getsets: {
            default_factory: {
                $get() {
                    return this.default_factory;
                },
                $set(value) {
                    value = value || pyNone;
                    this.default_factory = value;
                },
            },
        },
        slots: {
            tp$doc:
                "defaultdict(default_factory[, ...]) --> dict with default factory\n\nThe default factory is called without arguments to produce\na new value when a key is not present, in __getitem__ only.\nA defaultdict compares equal to a dict with the same items.\nAll remaining arguments are treated the same as if they were\npassed to the dict constructor, including keyword arguments.\n",
            tp$init(args, kwargs) {
                const default_ = args.shift();
                if (default_ === undefined) {
                    this.default_factory = pyNone;
                } else if (!checkCallable(default_) && !checkNone(default_)) {
                    throw new TypeError("first argument must be callable");
                } else {
                    this.default_factory = default_;
                }
                return pyDict.prototype.tp$init.call(this, args, kwargs);
            },
            $r() {
                const def_str = objectRepr(this.default_factory);
                const dict_str = pyDict.prototype.$r.call(this).v;
                return new pyStr("defaultdict(" + def_str + ", " + dict_str + ")");
            },
        },
        proto: {
            $copy() {
                const L = [];
                // this won't suspend
                iterFor(getIter(this), (k) => {
                    L.push(k);
                    L.push(this.mp$subscript(k));
                });
                return new collections.defaultdict(this.default_factory, L);
            },
        },
    });

    collections.Counter = buildNativeClass("Counter", {
        constructor: function Counter() {
            this.$d = new pyDict();
            pyDict.apply(this);
        },
        base: pyDict,
        methods: {
            elements: {
                $flags: { NoArgs: true },
                $meth() {
                    // this is how Cpython does it
                    const from_iterable = collections._chain.tp$getattr(new pyStr("from_iterable"));
                    const starmap = collections._starmap;
                    const repeat = collections._repeat;
                    const tp_call = pyCall;
                    return tp_call(from_iterable, [tp_call(starmap, [repeat, tp_call(this.tp$getattr(this.str$items))])]);
                },
            },
            most_common: {
                $flags: { NamedArgs: ["n"], Defaults: [pyNone] },
                $meth(n) {
                    const length = this.sq$length();
                    if (checkNone(n)) {
                        n = length;
                    } else {
                        n = asIndexOrThrow(n);
                        n = n > length ? length : n < 0 ? 0 : n;
                    }
                    const most_common_elem = this.$items().sort((a, b) => {
                        if (richCompareBool(a[1], b[1], "Lt")) {
                            return 1;
                        } else if (richCompareBool(a[1], b[1], "Gt")) {
                            return -1;
                        } else {
                            return 0;
                        }
                    });

                    return new pyList(most_common_elem.slice(0, n).map((x) => new pyTuple(x)));
                },
            },
            update: {
                $flags: { FastCall: true },
                $meth(args, kwargs) {
                    checkArgsLen("update", args, 0, 1);
                    return this.counter$update(args, kwargs);
                },
            },
            subtract: {
                $flags: { FastCall: true },
                $meth(args, kwargs) {
                    checkArgsLen("subtract", args, 0, 1);
                    const other = args[0];
                    if (other !== undefined) {
                        if (other instanceof pyDict) {
                            for (let iter = getIter(other), k = iter.tp$iternext(); k !== undefined; k = iter.tp$iternext()) {
                                const count = this.mp$subscript(k);
                                this.mp$ass_subscript(k, numberBinOp(count, other.mp$subscript(k), "Sub"));
                            }
                        } else {
                            for (let iter = getIter(other), k = iter.tp$iternext(); k !== undefined; k = iter.tp$iternext()) {
                                const count = this.mp$subscript(k);
                                this.mp$ass_subscript(k, numberBinOp(count, this.$one, "Sub"));
                            }
                        }
                    }

                    kwargs = kwargs || [];
                    for (let i = 0; i < kwargs.length; i += 2) {
                        const k = new pyStr(kwargs[i]);
                        const count = this.mp$subscript(k);
                        this.mp$ass_subscript(k, numberBinOp(count, kwargs[i + 1], "Sub"));
                    }
                    return pyNone;
                },
            },
            __missing__: {
                $meth(key) {
                    return this.$zero;
                },
                $flags: { OneArg: true },
            },
            copy: {
                $meth() {
                    return pyCall(collections.Counter, [this]);
                },
                $flags: { NoArgs: true },
            },
        },
        getsets: {
            __dict__: genericGetSetDict,
        },
        slots: {
            tp$doc:
                "Dict subclass for counting hashable items.  Sometimes called a bag\n    or multiset.  Elements are stored as dictionary keys and their counts\n    are stored as dictionary values.\n\n    >>> c = Counter('abcdeabcdabcaba')  # count elements from a string\n\n    >>> c.most_common(3)                # three most common elements\n    [('a', 5), ('b', 4), ('c', 3)]\n    >>> sorted(c)                       # list all unique elements\n    ['a', 'b', 'c', 'd', 'e']\n    >>> ''.join(sorted(c.elements()))   # list elements with repetitions\n    'aaaaabbbbcccdde'\n    >>> sum(c.values())                 # total of all counts\n    15\n\n    >>> c['a']                          # count of letter 'a'\n    5\n    >>> for elem in 'shazam':           # update counts from an iterable\n    ...     c[elem] += 1                # by adding 1 to each element's count\n    >>> c['a']                          # now there are seven 'a'\n    7\n    >>> del c['b']                      # remove all 'b'\n    >>> c['b']                          # now there are zero 'b'\n    0\n\n    >>> d = Counter('simsalabim')       # make another counter\n    >>> c.update(d)                     # add in the second counter\n    >>> c['a']                          # now there are nine 'a'\n    9\n\n    >>> c.clear()                       # empty the counter\n    >>> c\n    Counter()\n\n    Note:  If a count is set to zero or reduced to zero, it will remain\n    in the counter until the entry is deleted or the counter is cleared:\n\n    >>> c = Counter('aaabbc')\n    >>> c['b'] -= 2                     # reduce the count of 'b' by two\n    >>> c.most_common()                 # 'b' is still in, but its count is zero\n    [('a', 3), ('c', 1), ('b', 0)]\n\n",
            tp$init(args, kwargs) {
                checkArgsLen(this.tpjs_name, args, 0, 1);
                return this.counter$update(args, kwargs);
            },
            $r() {
                /**@todo this should be ordered by count */
                const dict_str = this.size > 0 ? pyDict.prototype.$r.call(this).v : "";
                return new pyStr(typeName(this) + "(" + dict_str + ")");
            },
            tp$as_sequence_or_mapping: true,
            mp$ass_subscript(key, value) {
                if (value === undefined) {
                    return this.mp$lookup(key) && pyDict.prototype.mp$ass_subscript.call(this, key, value);
                }
                return pyDict.prototype.mp$ass_subscript.call(this, key, value);
            },
            tp$as_number: true,
            nb$positive: counterNumberSlot(function (result) {
                this.$items().forEach(([elem, count]) => {
                    if (richCompareBool(count, this.$zero, "Gt")) {
                        result.mp$ass_subscript(elem, count);
                    }
                });
            }),
            nb$negative: counterNumberSlot(function (result) {
                this.$items().forEach(([elem, count]) => {
                    if (richCompareBool(count, this.$zero, "Lt")) {
                        result.mp$ass_subscript(elem, numberBinOp(this.$zero, count, "Sub"));
                    }
                });
            }),
            nb$subtract: counterNumberSlot(function (result, other) {
                this.$items().forEach(([elem, count]) => {
                    const newcount = numberBinOp(count, other.mp$subscript(elem), "Sub");
                    if (richCompareBool(newcount, this.$zero, "Gt")) {
                        result.mp$ass_subscript(elem, newcount);
                    }
                });
                other.$items().forEach(([elem, count]) => {
                    if (this.mp$lookup(elem) === undefined && richCompareBool(count, this.$zero, "Lt")) {
                        result.mp$ass_subscript(elem, numberBinOp(this.$zero, count, "Sub"));
                    }
                });
            }),
            nb$add: counterNumberSlot(function (result, other) {
                this.$items().forEach(([elem, count]) => {
                    const newcount = numberBinOp(count, other.mp$subscript(elem), "Add");
                    if (richCompareBool(newcount, this.$zero, "Gt")) {
                        result.mp$ass_subscript(elem, newcount);
                    }
                });
                other.$items().forEach(([elem, count]) => {
                    if (this.mp$lookup(elem) === undefined && richCompareBool(count, this.$zero, "Gt")) {
                        result.mp$ass_subscript(elem, count);
                    }
                });
            }),
            nb$inplace_add: counterInplaceSlot("+", function (other) {
                other.$items().forEach(([elem, count]) => {
                    const newcount = numberInplaceBinOp(this.mp$subscript(elem), count, "Add");
                    this.mp$ass_subscript(elem, newcount);
                });
            }),
            nb$inplace_subtract: counterInplaceSlot("-", function (other) {
                other.$items().forEach(([elem, count]) => {
                    const newcount = numberInplaceBinOp(this.mp$subscript(elem), count, "Sub");
                    this.mp$ass_subscript(elem, newcount);
                });
            }),
            nb$or: counterNumberSlot(function (result, other) {
                this.$items().forEach(([elem, count]) => {
                    const other_count = other.mp$subscript(elem);
                    const newcount = richCompareBool(count, other_count, "Lt") ? other_count : count;
                    if (richCompareBool(newcount, this.$zero, "Gt")) {
                        result.mp$ass_subscript(elem, newcount);
                    }
                });
                other.$items().forEach(([elem, count]) => {
                    if (this.mp$lookup(elem) === undefined && richCompareBool(count, this.$zero, "Gt")) {
                        result.mp$ass_subscript(elem, count);
                    }
                });
            }),
            nb$and: counterNumberSlot(function (result, other) {
                this.$items().forEach(([elem, count]) => {
                    const other_count = other.mp$subscript(elem);
                    const newcount = richCompareBool(count, other_count, "Lt") ? count : other_count;
                    if (richCompareBool(newcount, this.$zero, "Gt")) {
                        result.mp$ass_subscript(elem, newcount);
                    }
                });
            }),
            nb$inplace_and: counterInplaceSlot("&", function (other) {
                this.$items().forEach(([elem, count]) => {
                    const other_count = other.mp$subscript(elem);
                    if (richCompareBool(other_count, count, "Lt")) {
                        this.mp$ass_subscript(elem, other_count);
                    }
                });
            }),
            nb$inplace_or: counterInplaceSlot("|", function (other) {
                other.$items().forEach(([elem, other_count]) => {
                    if (richCompareBool(other_count, this.mp$subscript(elem), "Gt")) {
                        this.mp$ass_subscript(elem, other_count);
                    }
                });
            }),
            nb$reflected_and: null, // Counter doesn't have reflected slots
            nb$reflected_or: null,
            nb$reflected_add: null,
            nb$reflected_subtract: null,
        },
        proto: {
            keep$positive() {
                this.$items().forEach(([elem, count]) => {
                    if (richCompareBool(count, this.$zero, "LtE")) {
                        this.mp$ass_subscript(elem); // delete the element
                    }
                });
                return this;
            },
            $zero: new pyInt(0),
            $one: new pyInt(1),
            str$items: new pyStr("items"),
            counter$update(args, kwargs) {
                const iterable = args[0];
                if (iterable !== undefined) {
                    if (checkMapping(iterable)) {
                        if (!this.sq$length()) {
                            // reach out to dict update function
                            this.update$common(args, undefined, "update");
                        } else {
                            for (let iter = getIter(iterable), k = iter.tp$iternext(); k !== undefined; k = iter.tp$iternext()) {
                                const count = this.mp$subscript(k);
                                this.mp$ass_subscript(k, numberBinOp(count, iterable.mp$subscript(k), "Add"));
                            }
                        }
                    } else {
                        for (let iter = getIter(iterable), k = iter.tp$iternext(); k !== undefined; k = iter.tp$iternext()) {
                            const count = this.mp$subscript(k);
                            this.mp$ass_subscript(k, numberBinOp(count, this.$one, "Add"));
                        }
                    }
                }
                if (kwargs && kwargs.length) {
                    if (!this.sq$length()) {
                        // reach out to dict update function
                        this.update$common([], kwargs, "update");
                    } else {
                        for (let i = 0; i < kwargs.length; i += 2) {
                            const k = new pyStr(kwargs[i]);
                            const count = this.mp$subscript(k);
                            this.mp$ass_subscript(k, numberBinOp(count, kwargs[i + 1], "Add"));
                        }
                    }
                }

                return pyNone;
            },
        },
        classmethods: {
            fromkeys: {
                $meth: function fromkeys() {
                    throw new NotImplementedError("Counter.fromkeys() is undefined.  Use Counter(iterable) instead.");
                },
                $flags: { MinArgs: 1, MaxArgs: 2 },
            },
        },
    });

    function counterNumberSlot(f) {
        return function (other) {
            if (other !== undefined && !(other instanceof collections.Counter)) {
                return pyNotImplemented;
            }
            const result = new collections.Counter();
            f.call(this, result, other);
            return result;
        };
    }
    function counterInplaceSlot(symbol, f) {
        return function (other) {
            // can add anything with items defined but just support dict instances...
            if (!(other instanceof pyDict)) {
                throw new TypeError("Counter " + symbol + "= " + typeName(other) + " is not supported");
            }
            f.call(this, other);
            return this.keep$positive();
        };
    }

    collections.OrderedDict = buildNativeClass("collections.OrderedDict", {
        constructor: function OrderedDict() {
            pyDict.call(this);
        },
        base: pyDict,
        slots: {
            tp$doc: "Dictionary that remembers insertion order",
            $r() {
                if (this.in$repr) {
                    return new pyStr("...");
                }
                this.in$repr = true;
                let pairs = this.$items().map(
                    ([key, val]) => `(${objectRepr(key)}, ${objectRepr(val)})`
                );
                if (pairs.length === 0) {
                    pairs = "";
                } else {
                    pairs = "[" + pairs.join(", ") + "]";
                }
                this.in$repr = false;
                return new pyStr(typeName(this) + "(" + pairs + ")");
            },
            tp$richcompare(other, op) {
                if (op !== "Eq" && op !== "Ne") {
                    return pyNotImplemented;
                } else if (!(other instanceof collections.OrderedDict)) {
                    return pyDict.prototype.tp$richcompare.call(this, other, op);
                }
                const ret = op == "Eq" ? true : false;
                const l = this.size;
                if (l !== other.size) {
                    return !ret;
                }
                const oitems = other.$items();
                const items = this.$items();
                for (let i = 0; i < l; i++) {
                    const item = items[i];
                    const oitem = oitems[i];
                    const k = item[0];
                    const otherk = oitem[0];
                    if (k !== otherk && !isTrue(richCompareBool(k, otherk, "Eq"))) {
                        return !ret;
                    }
                    const v = item[1];
                    const otherv = oitem[1];
                    if (v !== otherv && !isTrue(richCompareBool(v, otherv, "Eq"))) {
                        return !ret;
                    }
                }
                return ret;
            },
        },
        methods: {
            popitem: {
                $flags: { NamedArgs: ["last"], Defaults: [pyTrue] },
                $meth(last) {
                    const size = this.get$size();
                    if (size === 0) {
                        throw new KeyError("dictionary is empty");
                    }
                    const [key, val] = this.$items()[isTrue(last) ? size - 1 : 0];
                    this.pop$item(key);
                    return new pyTuple([key, val]);
                },
            },
            move_to_end: {
                $flags: { NamedArgs: ["key", "last"], Defaults: [pyTrue] },
                $meth(key, last) {
                    let foundhash;
                    for (let keyhash in this.entries) {
                        const orderedkey = this.entries[keyhash][0];
                        if (orderedkey === key || richCompareBool(orderedkey, key, "Eq")) {
                            foundhash = keyhash;
                            break;
                        }
                    }
                    if (foundhash === undefined) {
                        throw new KeyError(key);
                    }

                    const item = this.entries[foundhash];
                    delete this.entries[foundhash];
                    if (isTrue(last)) {
                        this.entries[foundhash] = item;
                    } else {
                        this.entries = { [foundhash]: item, ...this.entries };
                    }
                    return pyNone;
                },
            },
        },
    });


    collections.deque = buildNativeClass("collections.deque", {
        constructor: function deque(D, maxlen, head, tail, mask) {
            this.head = head || 0;
            this.tail = tail || 0;
            this.mask = mask || 1;
            this.maxlen = maxlen;
            this.v = D || new Array(2);
        },
        slots: {
            tp$doc: "deque([iterable[, maxlen]]) --> deque object\n\nA list-like sequence optimized for data accesses near its endpoints.",
            tp$hash: pyNone,
            tp$new: genericNew,
            tp$init(args, kwargs) {
                let [iterable, maxlen] = copyKeywordsToNamedArgs("deque", ["iterable", "maxlen"], args, kwargs);
                if (maxlen !== undefined && !checkNone(maxlen)) {
                    maxlen = asIndexSized(maxlen, OverflowError, "an integer is required");
                    if (maxlen < 0) {
                        throw new ValueError("maxlen must be non-negative");
                    } else {
                        this.maxlen = maxlen;
                    }
                }
                this.$clear();
                if (iterable !== undefined) {
                    this.$extend(iterable);
                }
            },
            tp$getattr: genericGetAttr,

            tp$richcompare(w, op) {
                if (this === w && opAllowsEquality(op)) {
                    return true;
                }
                // w not a deque
                if (!(w instanceof collections.deque)) {
                    return pyNotImplemented;
                }
                const wd = w;
                const v = this.v;
                w = w.v;
                const vl = (this.tail - this.head) & this.mask;
                const wl = (wd.tail - wd.head) & wd.mask;
                let k,
                    i = Math.max(vl, wl);
                if (vl === wl) {
                    for (i = 0; i < vl && i < wl; ++i) {
                        k = richCompareBool(v[(this.head + i) & this.mask], w[(wd.head + i) & wd.mask], "Eq");
                        if (!k) {
                            break;
                        }
                    }
                }
                if (i >= vl || i >= wl) {
                    // no more items to compare, compare sizes
                    switch (op) {
                        case "Lt":
                            return vl < wl;
                        case "LtE":
                            return vl <= wl;
                        case "Eq":
                            return vl === wl;
                        case "NotEq":
                            return vl !== wl;
                        case "Gt":
                            return vl > wl;
                        case "GtE":
                            return vl >= wl;
                    }
                }

                // we have an item that's different
                // shortcuts for eq/not
                if (op === "Eq") {
                    return false;
                }
                if (op === "NotEq") {
                    return true;
                }
                // or, compare the differing element using the proper operator
                return richCompareBool(v[(this.head + i) & this.mask], w[(wd.head + i) & wd.mask], op);
            },
            tp$iter() {
                return new deque_iter_(this);
            },

            $r() {
                // represetation: deque(['a','b','c'][,maxlen=n])
                const ret = [];
                const size = (this.tail - this.head) & this.mask;
                if (this.$entered_repr) {
                    return new pyStr("[...]");
                }
                this.$entered_repr = true;
                for (let i = 0; i < size; i++) {
                    ret.push(objectRepr(this.v[(this.head + i) & this.mask]));
                }
                const name = typeName(this);
                if (this.maxlen !== undefined) {
                    return new pyStr(name + "([" + ret.filter(Boolean).join(", ") + "], maxlen=" + this.maxlen + ")");
                }
                this.$entered_repr = undefined;
                return new pyStr(name + "([" + ret.filter(Boolean).join(", ") + "])");
            },
            tp$as_number: true,
            nb$bool() {
                return 0 !== ((this.tail - this.head) & this.mask);
            },

            tp$as_sequence_or_mapping: true,
            sq$contains(item) {
                for (let it = this.tp$iter(), i = it.tp$iternext(); i !== undefined; i = it.tp$iternext()) {
                    if (richCompareBool(i, item, "Eq")) {
                        return true;
                    }
                }
                return false;
            },
            sq$concat(other) {
                // check type
                if (!(other instanceof collections.deque)) {
                    throw new TypeError("can only concatenate deque (not '" + typeName(other) + "') to deque");
                }
                // TODO this can't be the right constructor
                const new_deque = this.$copy();
                for (let iter = other.tp$iter(), k = iter.tp$iternext(); k !== undefined; k = iter.tp$iternext()) {
                    new_deque.$push(k);
                }
                return new_deque;
            },
            sq$length() {
                return (this.tail - this.head) & this.mask;
            },
            sq$repeat(n) {
                n = asIndexOrThrow(n, "can't multiply sequence by non-int of type '{tp$name}'");
                const size = (this.tail - this.head) & this.mask;
                const new_deque = this.$copy();
                let pos;
                if (n <= 0) {
                    new_deque.$clear();
                }
                for (let i = 1; i < n; i++) {
                    for (let j = 0; j < size; j++) {
                        pos = (this.head + j) & this.mask;
                        new_deque.$push(this.v[pos]);
                    }
                }
                return new_deque;
            },
            mp$subscript(index) {
                index = asIndexOrThrow(index);
                const size = (this.tail - this.head) & this.mask;
                if (index >= size || index < -size) {
                    throw new IndexError("deque index out of range");
                }
                const pos = ((index >= 0 ? this.head : this.tail) + index) & this.mask;
                return this.v[pos];
            },
            mp$ass_subscript(index, val) {
                index = asIndexOrThrow(index);
                const size = (this.tail - this.head) & this.mask;
                if (index >= size || index < -size) {
                    throw new IndexError("deque index out of range");
                }
                if (val === undefined) {
                    this.del$item(index);
                } else {
                    this.set$item(index, val);
                }
            },
            nb$inplace_add(other) {
                this.maxlen = undefined;
                for (let it = getIter(other), i = it.tp$iternext(); i !== undefined; i = it.tp$iternext()) {
                    this.$push(i);
                }
                return this;
            },
            nb$inplace_multiply(n) {
                n = asIndexSized(n, OverflowError, "can't multiply sequence by non-int of type '{tp$name}'");
                if (n <= 0) {
                    this.$clear();
                }
                const tmp = this.$copy();
                const size = (this.tail - this.head) & this.mask;
                for (let i = 1; i < n; i++) {
                    for (let j = 0; j < size; j++) {
                        const pos = (this.head + j) & this.mask;
                        tmp.$push(this.v[pos]);
                    }
                }
                this.v = tmp.v;
                this.head = tmp.head;
                this.tail = tmp.tail;
                this.mask = tmp.mask;
                return this;
            },
        },

        methods: {
            append: {
                $meth(value) {
                    this.$push(value);
                    return pyNone;
                },
                $flags: { OneArg: true },
                $textsig: null,
                $doc: "Add an element to the right side of the deque.",
            },
            appendleft: {
                $meth(value) {
                    this.$pushLeft(value);
                    return pyNone;
                },
                $flags: { OneArg: true },
                $textsig: null,
                $doc: "Add an element to the left side of the deque.",
            },
            clear: {
                $meth() {
                    this.$clear();
                    return pyNone;
                },
                $flags: { NoArgs: true },
                $textsig: null,
                $doc: "Remove all elements from the deque.",
            },
            __copy__: {
                $meth() {
                    return this.$copy();
                },
                $flags: { NoArgs: true },
                $textsig: null,
                $doc: "Return a shallow copy of a deque.",
            },
            copy: {
                $meth() {
                    return this.$copy();
                },
                $flags: { NoArgs: true },
                $textsig: null,
                $doc: "Return a shallow copy of a deque.",
            },
            count: {
                $meth(x) {
                    const size = (this.tail - this.head) & this.mask;
                    let count = 0;
                    for (let i = 0; i < size; i++) {
                        if (richCompareBool(this.v[(this.head + i) & this.mask], x, "Eq")) {
                            count++;
                        }
                    }
                    return new pyInt(count);
                },
                $flags: { OneArg: true },
                $textsig: null,
                $doc: "D.count(value) -> integer -- return number of occurrences of value",
            },
            extend: {
                $meth(iterable) {
                    this.$extend(iterable);
                    return pyNone;
                },
                $flags: { OneArg: true },
                $textsig: null,
                $doc: "Extend the right side of the deque with elements from the iterable",
            },
            extendleft: {
                $meth(iterable) {
                    for (let it = getIter(iterable), i = it.tp$iternext(); i !== undefined; i = it.tp$iternext()) {
                        this.$pushLeft(i);
                    }
                    return pyNone;
                },
                $flags: { OneArg: true },
                $textsig: null,
                $doc: "Extend the left side of the deque with elements from the iterable",
            },
            index: {
                $meth(x, start, stop) {
                    const i = this.$index(x, start, stop);
                    if (i !== undefined) {
                        return new pyInt(i);
                    }
                    throw new ValueError(objectRepr(x) + " is not in deque");
                },
                $flags: { MinArgs: 1, MaxArgs: 3 },
                $textsig: null,
                $doc: "D.index(value, [start, [stop]]) -> integer -- return first index of value.\nRaises ValueError if the value is not present.",
            },
            insert: {
                $meth(index, value) {
                    index = asIndexOrThrow(index, "integer argument expected, got {tp$name}");
                    const size = (this.tail - this.head) & this.mask;
                    if (this.maxlen !== undefined && size >= this.maxlen) {
                        throw new IndexError("deque already at its maximum size");
                    }
                    if (index > size) {
                        index = size;
                    }
                    if (index <= -size) {
                        index = 0;
                    }

                    const pos = ((index >= 0 ? this.head : this.tail) + index) & this.mask;

                    let cur = this.tail;
                    this.tail = (this.tail + 1) & this.mask;

                    while (cur !== pos) {
                        const prev = (cur - 1) & this.mask;
                        this.v[cur] = this.v[prev];
                        cur = prev;
                    }
                    this.v[pos] = value;
                    if (this.head === this.tail) {
                        this.$resize(this.v.length, this.v.length << 1);
                    }
                    return pyNone;
                },
                $flags: { MinArgs: 2, MaxArgs: 2 },
                $textsig: null,
                $doc: "D.insert(index, object) -- insert object before index",
            },
            pop: {
                $meth() {
                    return this.$pop();
                },
                $flags: { NoArgs: true },
                $textsig: null,
                $doc: "Remove and return the rightmost element.",
            },
            popleft: {
                $meth() {
                    return this.$popLeft();
                },
                $flags: { NoArgs: true },
                $textsig: null,
                $doc: "Remove and return the leftmost element.",
            },
            // __reduce__: {
            //     $meth: methods.__reduce__,
            //     $flags: {},
            //     $textsig: null,
            //     $doc: "Return state information for pickling.",
            // },
            remove: {
                $meth(value) {
                    const index = this.$index(value);
                    if (index === undefined) {
                        throw new ValueError(objectRepr(value) + " is not in deque");
                    }
                    const pos = (this.head + index) & this.mask;
                    let cur = pos;
                    while (cur !== this.tail) {
                        const next = (cur + 1) & this.mask;
                        this.v[cur] = this.v[next];
                        cur = next;
                    }

                    this.tail = (this.tail - 1) & this.mask;
                    var size = (this.tail - this.head) & this.mask;
                    if (size < this.mask >>> 1) {
                        this.$resize(size, this.v.length >>> 1);
                    }
                },
                $flags: { OneArg: true },
                $textsig: null,
                $doc: "D.remove(value) -- remove first occurrence of value.",
            },
            __reversed__: {
                $meth() {
                    return new _deque_reverse_iterator_iter_(this);
                },
                $flags: { NoArgs: true },
                $textsig: null,
                $doc: "D.__reversed__() -- return a reverse iterator over the deque",
            },
            reverse: {
                $meth() {
                    const head = this.head;
                    const tail = this.tail;
                    const mask = this.mask;
                    const size = (this.tail - this.head) & this.mask;
                    for (let i = 0; i < ~~(size / 2); i++) {
                        const a = (tail - i - 1) & mask;
                        const b = (head + i) & mask;
                        const temp = this.v[a];
                        this.v[a] = this.v[b];
                        this.v[b] = temp;
                    }
                    return pyNone;
                },
                $flags: { NoArgs: true },
                $textsig: null,
                $doc: "D.reverse() -- reverse *IN PLACE*",
            },
            rotate: {
                $meth(n) {
                    if (n === undefined) {
                        n = 1;
                    } else {
                        n = asIndexSized(n, OverflowError);
                    }
                    const head = this.head;
                    const tail = this.tail;

                    if (n === 0 || head === tail) {
                        return this;
                    }
                    this.head = (head - n) & this.mask;
                    this.tail = (tail - n) & this.mask;
                    if (n > 0) {
                        for (let i = 1; i <= n; i++) {
                            const a = (head - i) & this.mask;
                            const b = (tail - i) & this.mask;
                            this.v[a] = this.v[b];
                            this.v[b] = undefined;
                        }
                    } else {
                        for (let i = 0; i > n; i--) {
                            const a = (tail - i) & this.mask;
                            const b = (head - i) & this.mask;
                            this.v[a] = this.v[b];
                            this.v[b] = undefined;
                        }
                    }
                    return pyNone;
                },
                $flags: { MinArgs: 0, MaxArgs: 1 },
                $textsig: null,
                $doc: "Rotate the deque n steps to the right (default n=1).  If n is negative, rotates left.",
            },
        },
        getsets: {
            maxlen: {
                $get() {
                    return this.maxlen === undefined ? pyNone : new pyInt(this.maxlen);
                },
                $doc: "maximum size of a deque or None if unbounded",
            },
        },
        proto: {
            $clear() {
                this.head = 0;
                this.tail = 0;
                this.mask = 1;
                this.v = new Array(2);
            },
            $copy() {
                return new collections.deque(this.v.slice(0), this.maxlen, this.head, this.tail, this.mask);
            },
            $extend(iterable) {
                for (let it = getIter(iterable), i = it.tp$iternext(); i !== undefined; i = it.tp$iternext()) {
                    this.$push(i);
                }
            },
            set$item(index, val) {
                const pos = ((index >= 0 ? this.head : this.tail) + index) & this.mask;
                this.v[pos] = val;
            },
            del$item(index) {
                const pos = ((index >= 0 ? this.head : this.tail) + index) & this.mask;
                let cur = pos;
                // Shift items backward 1 to erase position.
                while (cur !== this.tail) {
                    const next = (cur + 1) & this.mask;
                    this.v[cur] = this.v[next];
                    cur = next;
                }
                // Decrease tail position by 1.
                const size = (this.tail - this.head) & this.mask;
                this.tail = (this.tail - 1) & this.mask;
                if (size < this.mask >>> 1) {
                    this.$resize(size, this.v.length >>> 1);
                }
            },
            $push(value) {
                this.v[this.tail] = value;
                this.tail = (this.tail + 1) & this.mask;
                if (this.head === this.tail) {
                    this.$resize(this.v.length, this.v.length << 1);
                }

                const size = (this.tail - this.head) & this.mask;
                if (this.maxlen !== undefined && size > this.maxlen) {
                    this.$popLeft();
                }
                return this;
            },
            $pushLeft(value) {
                this.head = (this.head - 1) & this.mask;
                this.v[this.head] = value;
                if (this.head === this.tail) {
                    this.$resize(this.v.length, this.v.length << 1);
                }

                const size = (this.tail - this.head) & this.mask;
                if (this.maxlen !== undefined && size > this.maxlen) {
                    this.$pop();
                }
                return this;
            },
            $pop() {
                if (this.head === this.tail) {
                    throw new IndexError("pop from an empty deque");
                }
                this.tail = (this.tail - 1) & this.mask;
                const value = this.v[this.tail];
                this.v[this.tail] = undefined;
                const size = (this.tail - this.head) & this.mask;
                if (size < this.mask >>> 1) {
                    this.$resize(size, this.v.length >>> 1);
                }
                return value;
            },
            $popLeft() {
                if (this.head === this.tail) {
                    throw new IndexError("pop from an empty deque");
                }
                const value = this.v[this.head];
                this.v[this.head] = undefined;
                this.head = (this.head + 1) & this.mask;
                const size = (this.tail - this.head) & this.mask;
                if (size < this.mask >>> 1) {
                    this.$resize(size, this.v.length >>> 1);
                }
                return value;
            },
            $resize(size, length) {
                const head = this.head;
                const mask = this.mask;
                this.head = 0;
                this.tail = size;
                this.mask = length - 1;
                // Optimize resize when list is already sorted.
                if (head === 0) {
                    this.v.length = length;
                    return;
                }
                const sorted = new Array(length);
                for (let i = 0; i < size; i++) {
                    sorted[i] = this.v[(head + i) & mask];
                }
                this.v = sorted;
            },
            $index(x, start, stop) {
                const size = (this.tail - this.head) & this.mask;
                start = start === undefined ? 0 : asIndexOrThrow(start);
                stop = stop === undefined ? size : asIndexOrThrow(stop);

                const head = this.head;
                const mask = this.mask;
                const list = this.v;

                const offset = start >= 0 ? start : start < -size ? 0 : size + start;
                stop = stop >= 0 ? stop : stop < -size ? 0 : size + stop;
                for (let i = offset; i < stop; i++) {
                    if (list[(head + i) & mask] === x) {
                        return i;
                    }
                }
            },
            sk$asarray() {
                const ret = [];
                const size = (this.tail - this.head) & this.mask;
                for (let i = 0; i < size; ++i) {
                    const pos = (this.head + i) & this.mask;
                    ret.push(this.v[pos]);
                }
                return ret;
            },
        },
    });

    const deque_iter_ = buildIteratorClass("_collections._deque_iterator", {
        constructor: function _deque_iterator(dq) {
            this.$index = 0;
            this.dq = dq.v;
            this.$length = (dq.tail - dq.head) & dq.mask;
            this.$head = dq.head;
            this.$tail = dq.tail;
            this.$mask = dq.mask;
        },
        iternext() {
            if (this.$index >= this.$length) {
                return undefined;
            }
            const pos = ((this.$index >= 0 ? this.$head : this.$tail) + this.$index) & this.$mask;
            this.$index++;
            return this.dq[pos];
        },
        methods: {
            __length_hint__: {
                $meth: function __length_hint__() {
                    return new pyInt(this.$length - this.$index);
                },
                $flags: { NoArgs: true },
            },
        },
    });

    const _deque_reverse_iterator_iter_ = buildIteratorClass("_collections._deque_reverse_iterator", {
        constructor: function _deque_reverse_iterator(dq) {
            this.$index = ((dq.tail - dq.head) & dq.mask) - 1;
            this.dq = dq.v;
            this.$head = dq.head;
            this.$mask = dq.mask;
        },
        iternext() {
            if (this.$index < 0) {
                return undefined;
            }
            const pos = (this.$head + this.$index) & this.$mask;
            this.$index--;
            return this.dq[pos];
        },
        methods: {
            __length_hint__: iterReverseLengthHintMethodDef,
        },
    });

    // deque end

    // regex tests for name and fields
    const startsw = new RegExp(/^[0-9].*/);
    const startsw2 = new RegExp(/^[0-9_].*/);
    const alnum = new RegExp(/^\w*$/);
    const comma = /,/g;
    const spaces = /\s+/;

    function namedtuple(name, fields, rename, defaults, module) {
        name = name.tp$str();
        if (isTrue(pyCall(collections._iskeyword, [name]))) {
            throw new ValueError("Type names and field names cannot be a keyword: '" + objectRepr(name) + "'");
        }
        const js_name = name.$jsstr();
        if (startsw.test(js_name) || !alnum.test(js_name) || !js_name) {
            throw new ValueError("Type names and field names must be valid identifiers: '" + js_name + "'");
        }

        let flds, field_names;
        // fields could be a string or an iterable of strings
        if (checkString(fields)) {
            flds = fields.$jsstr().replace(comma, " ").split(spaces);
            if (flds.length == 1 && flds[0] === "") {
                flds = [];
            }
            field_names = flds.map((x) => new pyStr(x));
        } else {
            flds = [];
            field_names = [];
            for (let iter = getIter(fields), i = iter.tp$iternext(); i !== undefined; i = iter.tp$iternext()) {
                i = i.tp$str();
                field_names.push(i);
                flds.push(i.$jsstr());
            }
        }

        // rename fields
        let seen = new Set();
        if (isTrue(rename)) {
            for (let i = 0; i < flds.length; i++) {
                if (
                    isTrue(pyCall(collections._iskeyword, [field_names[i]])) ||
                    startsw2.test(flds[i]) ||
                    !alnum.test(flds[i]) ||
                    !flds[i] ||
                    seen.has(flds[i])
                ) {
                    flds[i] = "_" + i;
                    field_names[i] = new pyStr("_" + i);
                }
                seen.add(flds[i]);
            }
        } else {
            // check the field names
            for (let i = 0; i < flds.length; i++) {
                if (isTrue(pyCall(collections._iskeyword, [field_names[i]]))) {
                    throw new ValueError("Type names and field names cannot be a keyword: '" + flds[i] + "'");
                } else if (startsw2.test(flds[i])) {
                    throw new ValueError("Field names cannot start with an underscore: '" + flds[i] + "'");
                } else if (!alnum.test(flds[i]) || !flds[i]) {
                    throw new ValueError("Type names and field names must be valid identifiers: '" + flds[i] + "'");
                } else if (seen.has(flds[i])) {
                    throw new ValueError("Encountered duplicate field name: '" + flds[i] + "'");
                }
                seen.add(flds[i]);
            }
        }
        const _field_names = new pyTuple(field_names);

        // create array of default values
        const dflts_dict = [];
        let dflts = [];
        if (!checkNone(defaults)) {
            dflts = arrayFromIterable(defaults);
            if (dflts.length > flds.length) {
                throw new TypeError("Got more default values than field names");
            }
            for (let j = 0, i = field_names.length - dflts.length; i < field_names.length; j++, i++) {
                dflts_dict.push(field_names[i]);
                dflts_dict.push(dflts[j]);
            }
        }
        // _field_defaults
        const _field_defaults = new pyDict(dflts_dict);

        // _make
        function _make(_cls, iterable) {
            return _cls.prototype.tp$new(arrayFromIterable(iterable));
        }
        _make.co_varnames = ["_cls", "iterable"];

        // _asdict
        function _asdict(self) {
            const asdict = [];
            for (let i = 0; i < self._fields.v.length; i++) {
                asdict.push(self._fields.v[i]);
                asdict.push(self.v[i]);
            }
            return new pyDict(asdict);
        }
        _asdict.co_varnames = ["self"];

        // _replace
        function _replace(kwargs, _self) {
            // this is the call signature from skulpt kwargs is a list of pyObjects
            kwargs = new pyDict(kwargs);
            // this is the way Cpython does it.
            const pop = kwargs.tp$getattr(new pyStr("pop"));
            // in the unlikely event that someone calls _replace with _self that isn't a named tuple
            // throw an error if _make doesn't exist
            const _make = getAttr(_self, new pyStr("_make"));
            const call = pyCall;
            const res = call(_make, [call(pyMap, [pop, _field_names, _self])]);
            if (kwargs.sq$length()) {
                const keys = kwargs.sk$asarray();
                throw new ValueError("Got unexpectd field names: [" + keys.map((x) => "'" + x.$jsstr() + "'") + "]");
            }
            return res;
        }
        _replace.co_kwargs = 1;
        _replace.co_varnames = ["_self"];

        // create property getters for each field
        const getters = {};
        for (let i = 0; i < flds.length; i++) {
            getters[field_names[i].$mangled] = new pyProperty(
                new collections._itemgetter([new pyInt(i)]),
                undefined,
                undefined,
                new pyStr("Alias for field number " + i)
            );
        }

        // build namedtuple class
        return buildNativeClass(js_name, {
            constructor: function NamedTuple() {},
            base: pyTuple,
            slots: {
                tp$doc: js_name + "(" + flds.join(", ") + ")",
                tp$new(args, kwargs) {
                    args = copyKeywordsToNamedArgs("__new__", flds, args, kwargs, dflts);
                    const named_tuple_instance = new this.constructor();
                    pyTuple.call(named_tuple_instance, args);
                    return named_tuple_instance;
                },
                $r() {
                    const bits = this.v.map((x, i) => flds[i] + "=" + objectRepr(x));
                    return new pyStr(typeName(this) + "(" + bits.join(", ") + ")");
                },
            },
            proto: Object.assign(
                {
                    __module__: checkNone(module) ? Sk.globals["__name__"] : module,
                    __slots__: new pyTuple(),
                    _fields: _field_names,
                    _field_defaults: _field_defaults,
                    _make: new pyClassMethod(new pyFunc(_make)),
                    _asdict: new pyFunc(_asdict),
                    _replace: new pyFunc(_replace),
                },
                getters
            ),
        });
    }

    namedtuple.co_argcount = 2;
    namedtuple.co_kwonlyargcount = 3;
    namedtuple.$kwdefs = [pyFalse, pyNone, pyNone];
    namedtuple.co_varnames = ["typename", "field_names", "rename", "defaults", "module"];

    collections.namedtuple = new pyFunc(namedtuple);

    return collections;
}
