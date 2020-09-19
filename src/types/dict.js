import {
    buildNativeClass,
    buildIteratorClass,
    pyStr,
    pyExc,
    pyTuple,
    pySet,
    pyList,
    pyBool,
    pyInt,
    pyNone,
    pyObject,
    pyType,
    pyNotImplemented,
    arrayFromIterable,
    pyCallOrSuspend,
    chainOrSuspend,
    iterForOrSuspend,
    retryOptionalSuspensionOrThrow,
    checkArgsLen,
    checkIterable,
    checkAnySet,
    genericNew,
    genericGetAttr,
    genericIterLengthHintWithArrayMethodDef,
    objectRepr,
    objectRichCompare,
    objectLookupSpecial,
    objectGetIter,
    objectHash,
    typeName,
    sequenceContains,
} from "../internal";

/** @typedef {pyObject} */
/** @typedef {pyType|FunctionConstructor} */

/**
 * @constructor
 * @extends {pyObject}
 * @param {Array=} L A javascript array of key value pairs - All elements should be pyObjects
 *
 * @description
 * call with an array of key value pairs
 * Do not use this function to convert a JS object to a dict
 * Instead use {@link remapToPy}
 *
 *
 */
export var pyDict = buildNativeClass("dict", {
    constructor: function dict(L) {
        // calling new pyDict is an internal method that requires an array of key value pairs
        if (L === undefined) {
            L = [];
        }
        if (!(Array.isArray(L) && L.length % 2 === 0 && this instanceof pyDict)) {
            throw new TypeError("bad internal call to dict constructor, use 'new' with an array of keys, values");
        }

        this.size = 0;
        this.entries = Object.create(null);
        this.buckets = {};
        for (let i = 0; i < L.length; i += 2) {
            this.set$item(L[i], L[i + 1]);
        }
        this.in$repr = false;
        this.$version = 0; // change version number anytime the keys change
    },
    slots: /**@lends {pyDict.prototype}*/ {
        tp$getattr: genericGetAttr,
        tp$as_sequence_or_mapping: true,
        tp$as_number: true,
        tp$hash: pyNone,
        tp$doc:
            "dict() -> new empty dictionary\ndict(mapping) -> new dictionary initialized from a mapping object's\n    (key, value) pairs\ndict(iterable) -> new dictionary initialized as if via:\n    d = {}\n    for k, v in iterable:\n        d[k] = v\ndict(**kwargs) -> new dictionary initialized with the name=value pairs\n    in the keyword argument list.  For example:  dict(one=1, two=2)",
        $r: function () {
            if (this.in$repr) {
                // prevents recursively calling repr;
                return new pyStr("{...}");
            }
            this.in$repr = true;
            // iterate over the keys - we don't use the dict iterator or mp$subscript here
            const ret = this.$items().map(([key, val]) => objectRepr(key) + ": " + objectRepr(val));
            this.in$repr = false;
            return new pyStr("{" + ret.join(", ") + "}");
        },
        tp$new: genericNew,
        tp$init: function (args, kwargs) {
            return this.update$common(args, kwargs, "dict");
        },
        tp$iter: function () {
            return new dict_iter_(this);
        },
        tp$richcompare: function (other, op) {
            let res;
            if (!(other instanceof pyDict) || (op !== "Eq" && op !== "NotEq")) {
                return pyNotImplemented;
            }
            if (other === this) {
                res = true;
            } else if (this.size !== other.size) {
                res = false;
            } else {
                let otherv;
                res = this.$items().every(([key, val]) => {
                    otherv = other.mp$lookup(key);
                    return otherv !== undefined && (otherv === val || objectRichCompare(val, otherv, "Eq"));
                });
            }
            return op === "Eq" ? res : !res;
        },
        // as number slot
        nb$or: function (other) {
            if (!(other instanceof pyDict)) {
                return pyNotImplemented;
            }
            const dict = this.dict$copy();
            dict.dict$merge(other);
            return dict;
        },
        nb$reflected_or: function (other) {
            if (!(other instanceof pyDict)) {
                return pyNotImplemented;
            }
            // dict or is not commutative so must define reflected slot here.
            const dict = other.dict$copy();
            dict.dict$merge(this);
            return dict;
        },
        nb$inplace_or: function (other) {
            return chainOrSuspend(this.update$onearg(other), () => this);
        },
        // sequence or mapping slots
        sq$length: function () {
            return this.get$size();
        },
        sq$contains: function (ob) {
            return this.mp$lookup(ob) !== undefined;
        },
        mp$subscript: function (key, canSuspend) {
            const res = this.mp$lookup(key);
            if (res !== undefined) {
                // Found in dictionary
                return res;
            }
            let missing = objectLookupSpecial(this, pyStr.$missing);
            if (missing !== undefined) {
                const ret = pyCallOrSuspend(missing, [key]);
                return canSuspend ? ret : retryOptionalSuspensionOrThrow(ret);
            }
            throw new pyExc.KeyError(key);
        },
        mp$ass_subscript: function (key, value) {
            if (value === undefined) {
                const item = this.pop$item(key);
                if (item === undefined) {
                    throw new pyExc.KeyError(key);
                }
            } else {
                this.set$item(key, value);
            }
            return pyNone;
        },
    },
    methods: /**@lends {pyDict.prototype}*/ {
        __reversed__: {
            $meth: function () {
                return new dict_reverse_iter_(this);
            },
            $flags: { NoArgs: true },
            $textsig: null,
            $doc: "Return a reverse iterator over the dict keys.",
        },
        get: {
            $meth: function (key, d) {
                return this.mp$lookup(key) || d || pyNone;
            },
            $flags: { MinArgs: 1, MaxArgs: 2 },
            $textsig: "($self, key, default=None, /)",
            $doc: "Return the value for key if key is in the dictionary, else default.",
        },
        setdefault: {
            $meth: function (key, default_) {
                // logic could be simpler here but some tests dictate we can't do too many lookups
                let item;
                const hash = getHash(key);
                item = typeof hash === "string" ? this.entries[hash] : this.get$bucket_item(key, hash);
                if (item !== undefined) {
                    return item[1];
                }
                default_ = default_ || pyNone;
                if (typeof hash === "string") {
                    this.entries[hash] = [key, default_];
                } else {
                    this.set$bucket_item(key, default_, hash);
                }
                this.size++;
                this.$version++;
                return default_;
            },
            $flags: { MinArgs: 1, MaxArgs: 2 },
            $textsig: "($self, key, default=None, /)",
            $doc:
                "Insert key with a value of default if key is not in the dictionary.\n\nReturn the value for key if key is in the dictionary, else default.",
        },
        pop: {
            $meth: function (key, d) {
                const item = this.pop$item(key);
                if (item !== undefined) {
                    return item[1];
                }
                // Not found in dictionary
                if (d !== undefined) {
                    return d;
                }
                throw new pyExc.KeyError(key);
            },
            $flags: { MinArgs: 1, MaxArgs: 2 },
            $textsig: null,
            $doc:
                "D.pop(k[,d]) -> v, remove specified key and return the corresponding value.\nIf key is not found, d is returned if given, otherwise KeyError is raised",
        },
        popitem: {
            $meth: function () {
                // not particularly efficent but we get allkeys as an array to iter anyway
                const size = this.get$size();
                if (size === 0) {
                    throw new pyExc.KeyError("popitem(): dictionary is empty");
                }
                const [key, val] = this.$items()[size - 1];
                this.pop$item(key);
                return new pyTuple([key, val]);
            },
            $flags: { NoArgs: true },
            $textsig: null,
            $doc: "D.popitem() -> (k, v), remove and return some (key, value) pair as a\n2-tuple; but raise KeyError if D is empty.",
        },
        keys: {
            $meth: function () {
                return new dict_keys(this);
            },
            $flags: { NoArgs: true },
            $textsig: null,
            $doc: "D.keys() -> a set-like object providing a view on D's keys",
        },
        items: {
            $meth: function () {
                return new dict_items(this);
            },
            $flags: { NoArgs: true },
            $textsig: null,
            $doc: "D.items() -> a set-like object providing a view on D's items",
        },
        values: {
            $meth: function () {
                return new dict_values(this);
            },
            $flags: { NoArgs: true },
            $textsig: null,
            $doc: "D.values() -> an object providing a view on D's values",
        },
        update: {
            $meth: function (args, kwargs) {
                return this.update$common(args, kwargs, "update");
            },
            $flags: { FastCall: true },
            $textsig: null,
            $doc:
                "D.update([E, ]**F) -> None.  Update D from dict/iterable E and F.\nIf E is present and has a .keys() method, then does:  for k in E: D[k] = E[k]\nIf E is present and lacks a .keys() method, then does:  for k, v in E: D[k] = v\nIn either case, this is followed by: for k in F:  D[k] = F[k]",
        },
        clear: {
            $meth: function () {
                this.size = 0;
                this.$version++;
                this.entries = Object.create(null);
                this.buckets = {};
            },
            $flags: { NoArgs: true },
            $textsig: null,
            $doc: "D.clear() -> None.  Remove all items from D.",
        },
        copy: {
            $meth: function () {
                return this.dict$copy();
            },
            $flags: { NoArgs: true },
            $textsig: null,
            $doc: "D.copy() -> a shallow copy of D",
        },
    },
    classmethods: /**@lends {pyDict.prototype}*/ {
        fromkeys: {
            $meth: function fromkeys(seq, value) {
                value = value || pyNone;
                let dict = this === pyDict ? new this() : this.tp$call([], []);
                return chainOrSuspend(
                    dict,
                    (d) => {
                        dict = d;
                        return iterForOrSuspend(objectGetIter(seq), (key) => {
                            return dict.mp$ass_subscript(key, value, true);
                        });
                    },
                    () => dict
                );
            },
            $flags: { MinArgs: 1, MaxArgs: 2 },
            $textsig: "($type, iterable, value=None, /)",
            $doc: "Create a new dictionary with keys from iterable and values set to value.",
        },
    },
    proto: /**@lends {pyDict.prototype}*/ {
        get$size: function () {
            // can't be overridden by subclasses so we use this for the dict key iterator
            return this.size;
        },
        sk$asarray: function () {
            return Object.values(this.entries).map((item) => item[0]);
        },
        update$onearg: function (arg) {
            if (arg instanceof pyDict || objectLookupSpecial(arg, pyStr.$keys) !== undefined) {
                return this.dict$merge(arg);
            } else {
                return this.dict$merge_seq(arg);
            }
        },
        dict$copy: function () {
            const newCopy = new pyDict([]);
            newCopy.size = this.size;
            const entries = Object.entries(this.entries); // do it this way for mappingproxy
            for (let i in entries) {
                const key = entries[i][0];
                const item = entries[i][1];
                newCopy.entries[key] = [item[0], item[1]];
            }
            let bucket, this_bucket;
            for (let i in this.buckets) {
                this_bucket = this.buckets[i];
                newCopy.buckets[i] = bucket = [];
                for (let j = 0; j < this_bucket.length; j++) {
                    bucket.push(newCopy.entries["#" + i + "_" + j]);
                }
            }
            return newCopy;
        },
        $items: function () {
            return Object.values(this.entries);
        },
    },
});

var reg = /^[0-9!#_]/;

function getHash(key) {
    let key_hash = key.$savedKeyHash_;
    if (key_hash !== undefined) {
        return key_hash;
    } else if (key instanceof pyStr) {
        key_hash = String(key).replace(reg, "!$&"); // avoid numbers and clashes
        key.$savedKeyHash_ = key_hash;
        return key_hash;
    }
    key_hash = objectHash(key); // builtin.hash returns an int
    return key_hash;
}

/**
 * @private
 * @param {pyStr} pyName
 * @this {pyDict}
 */
pyDict.prototype.quick$lookup = function (pyName) {
    /**@type {string} */
    const key_hash = pyName.$savedKeyHash_;
    if (key_hash === undefined) {
        return;
    }
    const item = this.entries[key_hash];
    if (item !== undefined) {
        return item[1];
    }
    return;
};

/**
 * NB:
 * We could put the following methods on the proto in the above object literal
 * but they're quite long so we keep them below for readability
 * @ignore
 */

/**
 * @function
 * @param {pyObject} key - key to get item for
 * @param {string} hash_value - hash_value from the key
 *
 * @description
 * fast call - if we have a str then we can guarantee that it's in the bucket
 * so we compare strings quickly rather than reaching out to richcompareBool
 *
 * @return {pyObject|undefined} the item if found or undefined if not found
 * @private
 */
pyDict.prototype.get$bucket_item = function (key, hash_value) {
    const bucket = this.buckets[hash_value];
    if (bucket === undefined) {
        return;
    }
    let item;
    for (let i = 0; i < bucket.length; i++) {
        item = bucket[i];
        if (item === undefined) {
            continue;
        }
        if (item[0] === key || objectRichCompare(key, item[0], "Eq")) {
            return item;
        }
    }
    return;
};

/**
 * @function
 * @param {pyObject} key
 * @param {string} hash_value
 *
 * @return undefined if no key was found
 * or the item if the key was in the bucket
 * also removes the item from entries
 * @private
 */
pyDict.prototype.pop$bucket_item = function (key, hash_value) {
    const bucket = this.buckets[hash_value];
    let bucket_key, item;
    if (bucket === undefined) {
        return undefined;
    }
    for (let i = 0; i < bucket.length; i++) {
        item = bucket[i];
        if (item === undefined) {
            continue;
        }
        if (item[0] === key || objectRichCompare(key, item[0], "Eq")) {
            const key_hash = "#" + hash_value + "_" + i;
            delete this.entries[key_hash];
            bucket[i] = undefined;
            if (bucket.every((x) => x === undefined)) {
                delete this.buckets[hash_value];
            }
            return item;
        }
    }
    return;
};

/**
 * @function
 * @param {pyObject} key
 * @param {pyObject} value
 * @param {string} hash_value
 *
 * @description
 * given a key and a hash_value will find a free slot or append to the list of slots for a given hash_value
 * then will set the item in the entries and return the item
 * Note this should only be called and immediately preceded by assigning the value to the rhs
 *
 * @return { [pyObject, pyObject] }
 * @private
 */
pyDict.prototype.set$bucket_item = function (key, value, hash_value) {
    let key_hash,
        bucket = this.buckets[hash_value];
    const item = [key, value];
    if (bucket === undefined) {
        this.buckets[hash_value] = [item];
        key_hash = "#" + hash_value + "_" + 0;
    } else {
        // we might have a freeslot from deleting an item
        const free_slot_idx = bucket.indexOf(undefined);
        if (free_slot_idx !== -1) {
            key_hash = "#" + hash_value + "_" + free_slot_idx;
            bucket[free_slot_idx] = item;
        } else {
            key_hash = "#" + hash_value + "_" + bucket.length;
            bucket.push(item);
        }
    }
    this.entries[key_hash] = item;
};

/**
 * @function
 * @param {pyObject} key - want to check if the key is inside the dict
 *
 * @return undefined if no key was found
 * or the item[1] (value) if the key was found
 * @private
 */
pyDict.prototype.mp$lookup = function (key) {
    let item;
    const hash = getHash(key);
    if (typeof hash === "string") {
        item = this.entries[hash];
    } else {
        // then we have a base hash so this is non string;
        item = this.get$bucket_item(key, hash);
    }
    if (item !== undefined) {
        return item[1];
    }
    // Not found in dictionary
    return undefined;
};

/**
 * @function
 *
 * @param {pyDict} b or dictlike object (anything with a keys method)
 *
 * @description
 * this function mimics the cpython implementation, which is also the reason for the
 * almost similar code, this may be changed in future
 *
 * Note we don't use mp$ass_subscript since that slot might be overridden by a subclass
 * Instead we use this.set$item which is the dict implementation of mp$ass_subscript
 * @private
 */
pyDict.prototype.dict$merge = function (b) {
    // we don't use mp$ass_subscript incase a subclass overrides __setitem__ we just ignore that like Cpython does
    // so use this.set$item instead which can't be overridden by a subclass
    let keys;
    if (b.tp$iter === pyDict.prototype.tp$iter) {
        // fast way used
        keys = b.tp$iter();
        for (let key = keys.tp$iternext(); key !== undefined; key = keys.tp$iternext()) {
            const v = b.mp$subscript(key);
            this.set$item(key, v);
        }
    } else {
        // generic slower way for a subclass that has overriden the tp$iter method
        // or other mapping types like mapping proxy
        const keyfunc = objectLookupSpecial(b, pyStr.$keys);

        return chainOrSuspend(pyCallOrSuspend(keyfunc, []), (keys) =>
            iterForOrSuspend(objectGetIter(keys), (key) =>
                chainOrSuspend(b.mp$subscript(key, true), (v) => {
                    this.set$item(key, v);
                })
            )
        );
    }
};

/**
 * @function
 *
 * @param {Array} args
 * @param {Array} kwargs
 * @param {string} func_name for error messages
 *
 * @description
 *
 * update() accepts either another dictionary object or an iterable of key/value pairs (as tuples or other iterables of length two).
 * If keyword arguments are specified, the dictionary is then updated with those key/value pairs: d.update(red=1, blue=2).
 * https://hg.python.org/cpython/file/4ff865976bb9/Objects/dictobject.c
 *
 * this function is called by both __init__ and update
 * We check that there is only 1 arg
 *
 * if arg is a dict like object we call dict$merge (must have a keys attribute)
 * otherwise call dict$merge_seq
 *
 * finally put the kwargs in the dict.
 * @private
 *
 */
pyDict.prototype.update$common = function (args, kwargs, func_name) {
    checkArgsLen(func_name, args, 0, 1);
    const arg = args[0];
    let ret;
    if (arg !== undefined) {
        ret = this.update$onearg(arg);
    }
    return chainOrSuspend(ret, () => {
        if (kwargs) {
            for (let i = 0; i < kwargs.length; i += 2) {
                this.set$item(new pyStr(kwargs[i]), kwargs[i + 1]);
            }
        }
        return pyNone;
    });
};

/**
 * @function
 *
 * @param {pyObject} arg
 *
 * @description
 * iterate over a sequence like object
 * check the next value has length 2
 * and then set the key value pair in
 * @private
 *
 */
pyDict.prototype.dict$merge_seq = function (arg) {
    let idx = 0;
    return iterForOrSuspend(objectGetIter(arg), (i) => {
        if (!checkIterable(i)) {
            throw new pyExc.TypeError("cannot convert dictionary update sequence element #" + idx + " to a sequence");
        }
        const seq = arrayFromIterable(i);
        if (seq.length !== 2) {
            throw new pyExc.ValueError("dictionary update sequence element #" + idx + " has length " + seq.length + "; 2 is required");
        }
        this.set$item(seq[0], seq[1]);
        idx++;
    });
};

/**
 * @function
 *
 * @param {pyObject} key should be a python object
 * @param {pyObject} value
 *
 * @description
 * sets the item from a key, value
 * @private
 *
 */
pyDict.prototype.set$item = function (key, value) {
    const hash = getHash(key);
    let item;
    if (typeof hash === "string") {
        // we have a string so pass it to the dictionary
        item = this.entries[hash];
        if (item === undefined) {
            this.entries[hash] = [key, value];
            this.size++;
            this.$version++;
        } else {
            item[1] = value;
        }
    } else {
        item = this.get$bucket_item(key, hash);
        if (item === undefined) {
            this.set$bucket_item(key, value, hash);
            this.size++;
            this.$version++;
        } else {
            item[1] = value;
        }
    }
};

/**
 * @function
 *
 * @param {pyObject} key
 *
 * @description
 * deletes an item in the dictionary
 * @private
 *
 */
pyDict.prototype.pop$item = function (key) {
    const hash = getHash(key);
    let item;
    if (typeof hash === "string") {
        item = this.entries[hash];
        delete this.entries[hash];
    } else {
        item = this.pop$bucket_item(key, hash);
    }
    if (item !== undefined) {
        this.size--;
        this.$version++;
        return item;
    }
    // Not found in dictionary
    return undefined;
};

function as_set(self) {
    return new pySet(arrayFromIterable(self));
}
function checkAnyView(view) {
    return view instanceof dict_keys || view instanceof dict_items;
}
function all_contained_in(self, other) {
    for (let it = objectGetIter(self), i = it.tp$iternext(); i !== undefined; i = it.tp$iternext()) {
        if (!sequenceContains(other, i)) {
            return false;
        }
    }
    return true;
}

// compile shared slots
const dict_view_slots = {
    tp$getattr: genericGetAttr,
    tp$as_number: true,
    tp$as_sequence_or_mapping: true,
    tp$hash: pyNone,
    $r: function () {
        if (this.in$repr) {
            // prevent recursively calling oneself
            return new pyStr("...");
        }
        this.in$repr = true;
        let ret = arrayFromIterable(this);
        ret = ret.map((x) => objectRepr(x));
        this.in$repr = false;
        return new pyStr(typeName(this) + "([" + ret.join(", ") + "])");
    },
    tp$richcompare: function (other, op) {
        if (!(checkAnySet(other) || checkAnyView(other))) {
            return pyNotImplemented;
        }
        const len_self = this.sq$length();
        const len_other = other.sq$length();
        switch (op) {
            case "NotEq":
            case "Eq":
                let res;
                if (this === other) {
                    res = true;
                } else if (len_self === len_other) {
                    res = all_contained_in(this, other);
                }
                return op === "NotEq" ? !res : res;
            case "Lt":
                return len_self < len_other && all_contained_in(this, other);
            case "LtE":
                return len_self <= len_other && all_contained_in(this, other);
            case "Gt":
                return len_self > len_other && all_contained_in(other, this);
            case "GtE":
                return len_self >= len_other && all_contained_in(other, this);
        }
    },
    nb$subtract: function (other) {
        const set = as_set(this);
        return set.difference.$meth.call(set, other);
    },
    nb$and: function (other) {
        const set = as_set(this);
        return set.intersection.$meth.call(set, other);
    },
    nb$or: function (other) {
        const set = as_set(this);
        return set.union.$meth.call(set, other);
    },
    nb$xor: function (other) {
        const set = as_set(this);
        return set.symmetric_difference.$meth.call(set, other);
    },
    sq$length: function () {
        return this.dict.get$size();
    },
};

function buildDictView(typename, slots, reverse_method) {
    const options = {
        constructor: function dict_view(dict) {
            if (arguments.length !== 1) {
                throw new pyExc.TypeError("cannot create '" + typeName(this) + "' instances");
            }
            this.dict = dict;
            this.in$repr = false;
        },
    };
    options.slots = Object.assign(slots, dict_view_slots);
    options.methods = {
        isdisjoint: {
            $meth: function (other) {
                const set = as_set(this);
                return set.isdisjoint.$meth.call(set, other);
            },
            $flags: { OneArg: true },
            $textsig: null,
            $doc: "Return True if the view and the given iterable have a null intersection.",
        },
        __reversed__: {
            $meth: reverse_method,
            $flags: { NoArgs: true },
            $textsig: null,
            $doc: "Return a reverse iterator over the dict keys.",
        },
    };
    options.flags = {
        sk$acceptable_as_base: false,
    };
    if (typename === "dict_values") {
        // dict_values doesn't have number or richcompare slots
        delete options.slots.tp$as_number;
        delete options.slots.tp$richcompare;
    }
    return buildNativeClass(typename, options);
}

var dict_keys = buildDictView(
    "dict_keys",
    {
        sq$contains: function (key) {
            return this.dict.mp$lookup(key) !== undefined;
        },
        tp$iter: function () {
            return new dict_iter_(this.dict);
        },
    },
    function __reverse__() {
        return new dict_reverse_iter_(this.dict);
    }
);

var dict_values = buildDictView(
    "dict_values",
    {
        tp$iter: function () {
            return new dict_valueiter_(this.dict);
        },
    },
    function __reverse__() {
        return new dict_reverse_valueiter_(this.dict);
    }
);

var dict_items = buildDictView(
    "dict_items",
    {
        sq$contains: function (item) {
            if (!(item instanceof pyTuple && item.sq$length() === 2)) {
                return false;
            }
            const key = item.mp$subscript(new pyInt(0));
            const value = item.mp$subscript(new pyInt(1));
            const found = this.dict.mp$lookup(key);
            if (found === undefined) {
                return false;
            }
            return found === value || objectRichCompare(found, value, "Eq");
        },
        tp$iter: function () {
            return new dict_itemiter_(this.dict);
        },
    },
    function __reverse__() {
        return new dict_reverse_itemiter_(this.dict);
    }
);

/**
 * @param {string} typename
 * @param {Function} iternext
 * @param {Function=} constructor
 */
function buildDictIterClass(typename, iternext, reversed) {
    return buildIteratorClass(typename, {
        constructor: function dict_iter_constructor(dict) {
            this.$index = 0;
            this.$orig = dict;
            this.tp$iternext = () => {
                // only set up the array on the first iteration
                this.$seq = dict.$items();
                this.$version = dict.$version;
                if (reversed) {
                    this.$seq = this.$seq.reverse();
                }
                delete this.tp$iternext;
                return this.tp$iternext();
            };
        },
        iternext: iternext,
        methods: {
            __length_hint__: genericIterLengthHintWithArrayMethodDef,
        },
        flags: { sk$acceptable_as_base_class: false },
        proto: { next$item: itemIterNextCheckSize },
    });
}

function itemIterNextCheckSize() {
    if (this.$version !== this.$orig.$version) {
        if (this.$len !== this.$orig.get$size()) {
            throw new pyExc.RuntimeError("dict changed size during iteration");
        }
        throw new pyExc.RuntimeError("dictionary keys changed during iteration");
    }
    return this.$seq[this.$index++];
}

/**
 * @constructor
 * @param {pyDict} dict
 */
var dict_iter_ = buildDictIterClass("dict_keyiterator", function () {
    const item = this.next$item();
    return item && item[0];
});

/**
 * @constructor
 * @param {pyDict} dict
 */
var dict_itemiter_ = buildDictIterClass("dict_itemiterator", function () {
    const item = this.next$item();
    return item && new pyTuple([item[0], item[1]]);
});

/**
 * @constructor
 * @param {pyDict} dict
 */
var dict_valueiter_ = buildDictIterClass("dict_valueiterator", function () {
    const item = this.next$item();
    return item && item[1];
});

var dict_reverse_iter_ = buildDictIterClass("dict_reversekeyiterator", dict_iter_.prototype.tp$iternext, true);
var dict_reverse_itemiter_ = buildDictIterClass("dict_reverseitemiterator", dict_itemiter_.prototype.tp$iternext, true);
var dict_reverse_valueiter_ = buildDictIterClass("dict_reversevalueiterator", dict_valueiter_.prototype.tp$iternext, true);

/**
 * Py2 methods
 * @private
 */
pyDict.py2$methods = {
    has_key: {
        $name: "has_key",
        $flags: { OneArg: true },
        $meth: function (k) {
            return new pyBool(this.sq$contains(k));
        },
        $doc: "D.has_key(k) -> True if D has a key k, else False",
    },
    keys: {
        $name: "keys",
        $meth: function () {
            return new pyList(this.sk$asarray());
        },
        $flags: { NoArgs: true },
        $textsig: null,
        $doc: "D.keys() -> a set-like object providing a view on D's keys",
    },
    items: {
        $name: "items",
        $meth: function () {
            return new pyList(this.$items().map(([key, val]) => new pyTuple([key, val])));
        },
        $flags: { NoArgs: true },
        $textsig: null,
        $doc: "D.items() -> a set-like object providing a view on D's items",
    },
    values: {
        $name: "values",
        $meth: function () {
            return new pyList(this.$items().map(([_, val]) => val));
        },
        $flags: { NoArgs: true },
        $textsig: null,
        $doc: "D.values() -> an object providing a view on D's values",
    },
};
