import {
    buildNativeClass,
    pyDict,
    pyStr,
    pyExc,
    pyNone,
    pyCall,
    genericGetAttr,
    checkNoKwargs,
    checkOneArg,
    checkMapping,
    objectRichCompare,
    objectRepr,
    numberBinOp,
    typeName,
    unfixReserved,
} from "../internal";

/**
 *
 * @constructor
 *
 * @param {Object} d
 *
 * @description
 * This should be called with the prototype of a type object
 * It returns a mapping proxy
 * useful for when we do typeobject.__dict__
 * or module.__dict__ since a module $d is an object literal
 *
 * Internally this should be called with an object literal
 * from python this can be called with a dict instance (or @todo other mapping type)
 *
 * For internal object literals we create a dict object whose internal representation of
 * this.entries is created on the fly (when requested)
 *
 * We could potentially memoise the entries for static objects (builtin types @todo)
 * The problem with memoising for all type objects is that the mappingproxy
 * is a live view of the mapping rather than a static copy
 *
 * ```python
 * >>> x = A.__dict__
 * >>> A.foo = 'bar'
 * >>> x['foo']
 * 'bar'
 * ```
 *
 */
export var pyMappingProxy = buildNativeClass("mappingproxy", {
    constructor: function mappingproxy(d) {
        if (!(this instanceof pyMappingProxy)) {
            throw new TypeError("bad call to mappingproxy, use 'new'");
        }
        this.mapping = new pyDict([]);
        if (d !== undefined) {
            // internal call so d is an object literal
            // adust this.mapping.entries to be a custom getter
            // allowing support for dynamic object literals
            customEntriesGetter(this.mapping, d);
        }
    },
    slots: {
        tp$getattr: genericGetAttr,
        tp$as_sequence_or_mapping: true,
        tp$hash: pyNone,
        tp$new(args, kwargs) {
            checkNoKwargs("mappingproxy", kwargs);
            checkOneArg("mappingproxy", args, kwargs);
            const mapping = args[0];
            if (!checkMapping(mapping)) {
                throw new pyExc.TypeError("mappingproxy() argument must be a mapping, not " + typeName(mapping));
            }
            const mp = new pyMappingProxy();
            mp.mapping = mapping;
            return mp;
        },
        tp$richcompare(other, op) {
            return objectRichCompare(this.mapping, other, op);
        },
        tp$str() {
            return this.mapping.tp$str();
        },
        $r() {
            return new pyStr("mappingproxy(" + objectRepr(this.mapping) + ")");
        },
        mp$subscript(key, canSuspend) {
            return this.mapping.mp$subscript(key, canSuspend);
        },
        sq$contains(key) {
            return this.mapping.sq$contains(key);
        },
        sq$length() {
            return this.mapping.sq$length();
        },
        tp$iter() {
            return this.mapping.tp$iter();
        },
        tp$as_number: true,
        nb$or(other) {
            if (other instanceof pyMappingProxy) {
                other = other.mapping;
            }
            return numberBinOp(this.mapping, other, "BitOr");
        },
        nb$reflected_or(other) {
            if (other instanceof pyMappingProxy) {
                other = other.mapping;
            }
            return numberBinOp(other, this.mapping, "BitOr");
        },
        nb$inplace_or(other) {
            throw new pyExc.TypeError("'|=' is not supported by " + typeName(this) + "; use '|' instead");
        },
    },
    methods: {
        get: {
            $meth(args, kwargs) {
                return pyCall(this.mapping.tp$getattr(this.str$get), args, kwargs);
            },
            $flags: { FastCall: true },
            $textsig: null,
            $doc: "D.get(k[,d]) -> D[k] if k in D, else d.  d defaults to None.",
        },
        keys: {
            $meth() {
                return pyCall(this.mapping.tp$getattr(this.str$keys), []);
            },
            $flags: { NoArgs: true },
            $textsig: null,
            $doc: "D.keys() -> a set-like object providing a view on D's keys",
        },
        items: {
            $meth() {
                return pyCall(this.mapping.tp$getattr(this.str$items), []);
            },
            $flags: { NoArgs: true },
            $textsig: null,
            $doc: "D.items() -> a set-like object providing a view on D's items",
        },
        values: {
            $meth() {
                return pyCall(this.mapping.tp$getattr(this.str$values), []);
            },
            $flags: { NoArgs: true },
            $textsig: null,
            $doc: "D.values() -> a set-like object providing a view on D's values",
        },
        copy: {
            $meth() {
                return pyCall(this.mapping.tp$getattr(this.str$copy), []);
            },
            $flags: { NoArgs: true },
            $textsig: null,
            $doc: "D.copy() -> a shallow copy of D",
        },
    },
    proto: {
        str$get: new pyStr("get"),
        str$copy: new pyStr("copy"),
        str$keys: new pyStr("keys"),
        str$items: new pyStr("items"),
        str$values: new pyStr("values"),
        mp$lookup(key) {
            return this.mapping.mp$lookup(key);
        },
    },
    flags: {
        sk$acceptable_as_base_class: false,
    },
});

var reg = /^[0-9!#_]/; // use the reg expression from dict.js

function customEntriesGetter(mapping, d) {
    Object.defineProperties(mapping, {
        entries: {
            get: () => {
                const entries = Object.create(null);
                const keys = Object.keys(d);
                for (let i = 0; i < keys.length; i++) {
                    const key = keys[i];
                    const k = unfixReserved(key);
                    if (!k.includes("$")) {
                        entries[k.replace(reg, "!$&")] = [new pyStr(k), d[key]];
                    }
                }
                return entries;
            },
            configurable: true,
        },
        size: {
            get: () => {
                return Object.keys(d)
                    .map((k) => unfixReserved(k))
                    .filter((k) => !k.includes("$")).length;
            },
            configurable: true,
        },
    });
}
