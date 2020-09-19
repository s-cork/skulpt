
import { asserts, buildNativeClass, pyTuple, pyExc, pyNone, pyStr, pyInt, checkOneArg, objectGetIter, objectRepr } from "../internal";



export function make_structseq(module, name, fields, doc) {
    const nm = module + "." + name;
    const flds = [];
    const docs = [];
    for (let key in fields) {
        flds.push(key);
        docs.push(fields[key]);
    }

    const getsets = {};
    for (let i = 0; i < flds.length; i++) {
        getsets[flds[i]] = {
            $get: function () { return this.v[i]; },
            $doc: docs[i]
        };
    }

    /**
     * @constructor
     * @extends pyTuple
     * @param {!Array<Object>|Object} arg
     */
    var structSeq = buildNativeClass(nm, {
        constructor: function structseq_constructor(v) {
            asserts.assert((Array.isArray(v) || v === undefined) && this instanceof structseq);
            pyTuple.call(this, v);
        },
        base: pyTuple,
        slots: {
            tp$new: function (args, kwargs) {
                checkOneArg(nm, args, kwargs);
                const v = [];
                const arg = args[0];
                for (let it = objectGetIter(arg), i = it.tp$iternext(); i !== undefined; i = it.tp$iternext()) {
                    v.push(i);
                }
                if (v.length != flds.length) {
                    throw new pyExc.TypeError(nm + "() takes a " + flds.length + "-sequence (" + v.length + "-sequence given)");
                }
                return new structseq(v);
            },
            tp$doc: doc ? doc : pyNone,
            $r: function () {
                var ret;
                var i;
                var bits;
                if (this.v.length === 0) {
                    return new pyStr(nm + "()");
                }
                bits = [];
                for (i = 0; i < this.v.length; ++i) {
                    bits[i] = flds[i] + "=" + objectRepr(this.v[i]);
                }
                ret = bits.join(", ");
                if (this.v.length === 1) {
                    ret += ",";
                }
                return new pyStr(nm + "(" + ret + ")");
            },

        },
        methods: {
            __reduce__: {
                $meth: function () {
                    throw new pyExc.NotImplementedError("__reduce__ is not implemented");
                },
                $flags: { NoArgs: true }
            }
        },
        getsets: getsets,
        proto: {
            num_sequence_fields: new pyInt(flds.length)
        }
    });
    return structSeq;
};

