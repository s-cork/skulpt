require("fastestsmallesttextencoderdecoder");

import {
    asserts,
    buildNativeClass,
    buildIteratorClass,
    pyExc,
    pyStr,
    pyInt,
    pyNone,
    pyNotImplemented,
    pyTuple,
    pySlice,
    pyTrue,
    pyFalse,
    pyList,
    checkIndex,
    checkString,
    checkBytes,
    checkIterable,
    checkNone,
    chainOrSuspend,
    pyCallOrSuspend,
    iterForOrSuspend,
    asIndexSized,
    asIndexOrThrow,
    objectLookupSpecial,
    objectGetIter,
    objectIsTrue,
    typeName,
    keywordArrayToNamedArgs,
    genericIterLengthHintWithArrayMethodDef,
    genericGetAttr,
    opAllowsEquality,
} from "../internal";

// Mapping from supported valid encodings to normalized encoding name
const supportedEncodings = {
    utf: "utf-8",
    utf8: "utf-8",
    utf_8: "utf-8",
    ascii: "ascii",
};

var space_reg = /\s+/g;
var underscore_hyphen_reg = /[_-]+/g;
function normalizeEncoding(encoding) {
    const normalized = encoding.replace(space_reg, "").replace(underscore_hyphen_reg, "_").toLowerCase();
    const supported = supportedEncodings[normalized];
    if (supported === undefined) {
        return encoding;
    } else {
        return supported;
    }
}
const Encoder = new TextEncoder();
const Decoder = new TextDecoder();

/**
 * @constructor
 * @param {undefined|Uint8Array|Array|number|string} source Using constructor with new should be a js object
 * @return {pyBytes}
 * @extends {pyObject}
 */
export var pyBytes = buildNativeClass("bytes", {
    constructor: function bytes(source) {
        if (!(this instanceof pyBytes)) {
            throw new TypeError("bytes is a constructor use 'new'");
        }
        // deal with internal calls
        if (source === undefined) {
            this.v = new Uint8Array();
        } else if (source instanceof Uint8Array) {
            this.v = source;
        } else if (Array.isArray(source)) {
            asserts.assert(
                source.every((x) => x >= 0 && x <= 0xff),
                "bad internal call to bytes with array"
            );
            this.v = new Uint8Array(source);
        } else if (typeof source === "string") {
            // fast path must be binary string https://developer.mozilla.org/en-US/docs/Web/API/DOMString/Binary
            // i.e. the reverse of this.$jsstr();
            let cc;
            const uint8 = new Uint8Array(source.length);
            for (let i in source) {
                cc = source.charCodeAt(i);
                if (cc > 0xff) {
                    throw new pyExc.UnicodeDecodeError("invalid string at index " + i + " (possibly contains a unicode character)");
                }
                uint8[i] = cc;
            }
            this.v = uint8;
        } else if (typeof source === "number") {
            this.v = new Uint8Array(source);
        } else {
            throw new pyExc.TypeError("bad argument to bytes constructor");
        }
    },
    slots: /**@lends {pyBytes.prototype} */ {
        tp$getattr: genericGetAttr,
        tp$doc:
            "bytes(iterable_of_ints) -> bytes\nbytes(string, encoding[, errors]) -> bytes\nbytes(bytes_or_buffer) -> immutable copy of bytes_or_buffer\nbytes(int) -> bytes object of size given by the parameter initialized with null bytes\nbytes() -> empty bytes object\n\nConstruct an immutable array of bytes from:\n  - an iterable yielding integers in range(256)\n  - a text string encoded using the specified encoding\n  - any object implementing the buffer API.\n  - an integer",
        tp$new: function (args, kwargs) {
            if (this !== pyBytes.prototype) {
                return this.$subtype_new(args, kwargs);
            }
            kwargs = kwargs || [];
            let source, pySource, dunderBytes, encoding, errors;
            if (args.length <= 1 && +kwargs.length === 0) {
                pySource = args[0];
            } else {
                [pySource, encoding, errors] = keywordArrayToNamedArgs("bytes", [null, "pySource", "errors"], args, kwargs);
                ({ encoding, errors } = checkGetEncodingErrors("bytes", encoding, errors));
                if (!checkString(pySource)) {
                    throw new pyExc.TypeError("encoding or errors without a string argument");
                }
                return strEncode(pySource, encoding, errors);
            }

            if (pySource === undefined) {
                return new pyBytes();
            } else if ((dunderBytes = objectLookupSpecial(pySource, pyStr.$bytes)) !== undefined) {
                const ret = pyCallOrSuspend(dunderBytes, []);
                return chainOrSuspend(ret, (bytesSource) => {
                    if (!checkBytes(bytesSource)) {
                        throw new pyExc.TypeError("__bytes__ returned non-bytes (type " + typeName(bytesSource) + ")");
                    }
                    return bytesSource;
                });
            } else if (checkIndex(pySource)) {
                source = asIndexSized(pySource, pyExc.OverflowError);
                if (source < 0) {
                    throw new pyExc.ValueError("negative count");
                }
                return new pyBytes(source);
            } else if (checkBytes(pySource)) {
                return new pyBytes(pySource.v);
            } else if (checkString(pySource)) {
                throw new pyExc.TypeError("string argument without an encoding");
            } else if (checkIterable(pySource)) {
                let source = [];
                let r = iterForOrSuspend(objectGetIter(pySource), (byte) => {
                    const n = asIndexSized(byte);
                    if (n < 0 || n > 255) {
                        throw new pyExc.ValueError("bytes must be in range(0, 256)");
                    }
                    source.push(n);
                });
                return chainOrSupsend(r, () => new pyBytes(source));
            }
            throw new pyExc.TypeError("cannot convert '" + typeName(source) + "' object into bytes");
        },
        $r: function () {
            let num;
            let quote = "'";
            const hasdbl = this.v.indexOf(34) !== -1;
            let ret = "";

            for (let i = 0; i < this.v.length; i++) {
                num = this.v[i];
                if (num < 9 || (num > 10 && num < 13) || (num > 13 && num < 32) || num > 126) {
                    ret += makehexform(num);
                } else if (num === 9 || num === 10 || num === 13 || num === 39 || num === 92) {
                    switch (num) {
                        case 9:
                            ret += "\\t";
                            break;
                        case 10:
                            ret += "\\n";
                            break;
                        case 13:
                            ret += "\\r";
                            break;
                        case 39:
                            if (hasdbl) {
                                ret += "\\'";
                            } else {
                                ret += "'";
                                quote = '"';
                            }
                            break;
                        case 92:
                            ret += "\\\\";
                            break;
                    }
                } else {
                    ret += String.fromCharCode(num);
                }
            }
            ret = "b" + quote + ret + quote;
            return new pyStr(ret);
        },
        tp$str: function () {
            return this.$r();
        },
        tp$iter: function () {
            return new bytes_iter_(this);
        },
        tp$richcompare: function (other, op) {
            if (this === other && opAllowsEquality(op)) {
                return true;
            } else if (!(other instanceof pyBytes)) {
                return pyNotImplemented;
            }
            const v = this.v;
            const w = other.v;
            if (v.length !== w.length && (op === "Eq" || op === "NotEq")) {
                /* Shortcut: if the lengths differ, the bytes differ */
                return op === "Eq" ? false : true;
            }
            let i;
            const min_len = Math.min(v.length, w.length);
            for (i = 0; i < min_len; i++) {
                if (v[i] !== w[i]) {
                    break; // we've found a different element
                }
            }
            switch (op) {
                case "Lt":
                    return (i === min_len && v.length < w.length) || v[i] < w[i];
                case "LtE":
                    return (i === min_len && v.length <= w.length) || v[i] <= w[i];
                case "Eq":
                    return i === min_len;
                case "NotEq":
                    return i < min_len;
                case "Gt":
                    return (i === min_len && v.length > w.length) || v[i] > w[i];
                case "GtE":
                    return (i === min_len && v.length >= w.length) || v[i] >= w[i];
            }
        },
        tp$hash: function () {
            return new pyStr(this.$jsstr()).tp$hash();
        },
        tp$as_sequence_or_mapping: true,
        mp$subscript: function (index) {
            if (checkIndex(index)) {
                let i = asIndexSized(index, pyExc.IndexError);
                if (i !== undefined) {
                    if (i < 0) {
                        i = this.v.length + i;
                    }
                    if (i < 0 || i >= this.v.length) {
                        throw new pyExc.IndexError("index out of range");
                    }
                    return new pyInt(this.v[i]);
                }
            } else if (index instanceof pySlice) {
                const ret = [];
                index.sssiter$(this.v.length, (i) => {
                    ret.push(this.v[i]);
                });
                return new pyBytes(new Uint8Array(ret));
            }
            throw new pyExc.TypeError("byte indices must be integers or slices, not " + typeName(index));
        },
        sq$length: function () {
            return this.v.length;
        },
        sq$concat: function (other) {
            if (!(other instanceof pyBytes)) {
                throw new pyExc.TypeError("can't concat " + typeName(other) + " to bytes");
            }
            const ret = new Uint8Array(this.v.length + other.v.length);
            let i;
            for (i = 0; i < this.v.length; i++) {
                ret[i] = this.v[i];
            }
            for (let j = 0; j < other.v.length; j++, i++) {
                ret[i] = other.v[j];
            }
            return new pyBytes(ret);
        },
        sq$repeat: function (n) {
            if (!checkIndex(n)) {
                throw new pyExc.TypeError("can't multiply sequence by non-int of type '" + typeName(n) + "'");
            }
            n = asIndexSized(n, pyExc.OverflowError);
            const len = n * this.v.length;
            if (len > Number.MAX_SAFE_INTEGER) {
                throw new pyExc.OverflowError();
            } else if (n <= 0) {
                return new pyBytes();
            }
            const ret = new Uint8Array(len);
            let j = 0;
            while (j < len) {
                for (let i = 0; i < this.v.length; i++) {
                    ret[j++] = this.v[i];
                }
            }
            return new pyBytes(ret);
        },
        sq$contains: function (tgt) {
            return this.find$left(tgt) !== -1;
        },
        // tp$as_number: true,
        // nb$remainder: strBytesRemainder,
    },
    proto: {
        $jsstr: function () {
            // returns binary string - not bidirectional for non ascii characters - use with caution
            // i.e. new pyBytes(x.$jsstr()).v  may be different to x.v;
            let ret = "";
            for (let i = 0; i < this.v.length; i++) {
                ret += String.fromCharCode(this.v[i]);
            }
            return ret;
        },
        get$tgt: function (tgt) {
            if (tgt instanceof pyBytes) {
                return tgt.v;
            }
            tgt = asIndexOrThrow(tgt, "argument should be integer or bytes-like object, not {tp$name}");
            if (tgt < 0 || tgt > 0xff) {
                throw new pyExc.ValueError("bytes must be in range(0, 256)");
            }
            return tgt;
        },
        get$raw: function (tgt) {
            if (tgt instanceof pyBytes) {
                return tgt.v;
            }
            throw new pyExc.TypeError("a bytes-like object is required, not '" + typeName(tgt) + "'");
        },
        get$splitArgs: checkSepMaxSplit,
        find$left: mkFind(false),
        find$right: mkFind(true),
        find$subleft: function findSubLeft(uint8, start, end) {
            end = end - uint8.length + 1;
            let i = start;
            while (i < end) {
                if (uint8.every((val, j) => val === this.v[i + j])) {
                    return i;
                }
                i++;
            }
            return -1;
        },
        find$subright: function (uint8, start, end) {
            let i = end - uint8.length;
            while (i >= start) {
                if (uint8.every((val, j) => val === this.v[i + j])) {
                    return i;
                }
                i--;
            }
            return -1;
        },
        $subtype_new: function (args, kwargs) {
            const instance = new this.constructor();
            // we call bytes new method with all the args and kwargs
            const bytes_instance = pyBytes.prototype.tp$new(args, kwargs);
            instance.v = bytes_instance.v;
            return instance;
        },
        valueOf: function () {
            return this.v;
        },
        sk$asarray: function () {
            const ret = [];
            this.v.forEach((x) => {
                ret.push(new pyInt(x));
            });
            return ret;
        },
    },
    flags: {
        str$encode: strEncode,
        $decode: bytesDecode,
        check$encodeArgs: checkGetEncodingErrors,
    },
    methods: {
        __getnewargs__: {
            $meth: function () {
                return new pyTuple(new pyBytes(this.v));
            },
            $flags: { NoArgs: true },
            $textsig: null,
            $doc: null,
        },
        capitalize: {
            $meth: function () {
                const len = this.v.length;
                if (len === 0) {
                    return new pyBytes(this.v);
                }
                const final = new Uint8Array(len);
                let val = this.v[0];
                final[0] = islower(val) ? val - 32 : val;
                for (let i = 1; i < len; i++) {
                    val = this.v[i];
                    final[i] = isupper(val) ? val + 32 : val;
                }
                return new pyBytes(final);
            },
            $flags: { NoArgs: true },
            $textsig: null,
            $doc: "B.capitalize() -> copy of B\n\nReturn a copy of B with only its first character capitalized (ASCII)\nand the rest lower-cased.",
        },
        center: {
            $meth: mkJust("center", false, true),
            $flags: { MinArgs: 1, MaxArgs: 2 },
            $textsig: null,
            $doc:
                "B.center(width[, fillchar]) -> copy of B\n\nReturn B centered in a string of length width.  Padding is\ndone using the specified fill character (default is a space).",
        },
        count: {
            $meth: function (tgt, start, end) {
                tgt = this.get$tgt(tgt);
                ({ start, end } = pySlice.$indices(this, start, end));
                let count = 0;
                if (typeof tgt === "number") {
                    for (let i = start; i < end; i++) {
                        if (this.v[i] === tgt) {
                            count++;
                        }
                    }
                } else {
                    const upto = end - tgt.length + 1;
                    for (let i = start; i < upto; i++) {
                        if (tgt.every((val, j) => val === this.v[i + j])) {
                            count++;
                            i += tgt.length - 1;
                        }
                    }
                }
                return new pyInt(count);
            },
            $flags: { MinArgs: 1, MaxArgs: 3 },
            $textsig: null,
            $doc:
                "B.count(sub[, start[, end]]) -> int\n\nReturn the number of non-overlapping occurrences of subsection sub in\nbytes B[start:end].  Optional arguments start and end are interpreted\nas in slice notation.",
        },
        decode: {
            $meth: bytesDecode,
            $flags: { NamedArgs: ["encoding", "errors"] },
            $textsig: "($self, /, encoding='utf-8', errors='strict')",
            $doc:
                "Decode the bytes using the codec registered for encoding.\n\n  encoding\n    The encoding with which to decode the bytes.\n  errors\n    The error handling scheme to use for the handling of decoding errors.\n    The default is 'strict' meaning that decoding errors raise a\n    UnicodeDecodeError. Other possible values are 'ignore' and 'replace'\n    as well as any other name registered with codecs.register_error that\n    can handle UnicodeDecodeErrors.",
        },
        endswith: {
            $meth: mkStartsEndsWith("endswith", (subarray, tgt) => {
                const start = subarray.length - tgt.length;
                return start >= 0 && tgt.every((val, i) => val === subarray[start + i]);
            }),
            $flags: { MinArgs: 1, MaxArgs: 3 },
            $textsig: null,
            $doc:
                "B.endswith(suffix[, start[, end]]) -> bool\n\nReturn True if B ends with the specified suffix, False otherwise.\nWith optional start, test B beginning at that position.\nWith optional end, stop comparing B at that position.\nsuffix can also be a tuple of bytes to try.",
        },
        expandtabs: {
            $meth: function (tabsize) {
                tabsize = asIndexSized(tabsize, pyExc.OverflowError, "an integer is required (got type {tp$nam})");
                const final = [];
                let linepos = 0;
                for (let i = 0; i < this.v.length; i++) {
                    const val = this.v[i];
                    if (val === 9) {
                        const inc = tabsize - (linepos % tabsize);
                        final.push(...new Array(inc).fill(32));
                        linepos += inc;
                    } else if (val === 10 || val === 13) {
                        final.push(val);
                        linepos = 0;
                    } else {
                        final.push(val);
                        linepos++;
                    }
                }
                return new pyBytes(new Uint8Array(final));
            },
            $flags: { NamedArgs: ["tabsize"], Defaults: [8] },
            $textsig: null,
            $doc:
                "B.expandtabs(tabsize=8) -> copy of B\n\nReturn a copy of B where all tab characters are expanded using spaces.\nIf tabsize is not given, a tab size of 8 characters is assumed.",
        },
        find: {
            $meth: function find(tgt, start, end) {
                return new pyInt(this.find$left(tgt, start, end));
            },
            $flags: { MinArgs: 1, MaxArgs: 3 },
            $textsig: null,
            $doc:
                "B.find(sub[, start[, end]]) -> int\n\nReturn the lowest index in B where subsection sub is found,\nsuch that sub is contained within B[start,end].  Optional\narguments start and end are interpreted as in slice notation.\n\nReturn -1 on failure.",
        },
        hex: {
            $meth: function () {
                let final = "";
                for (let i = 0; i < this.v.length; i++) {
                    final += this.v[i].toString(16).padStart(2, "0");
                }
                return new pyStr(final);
            },
            $flags: { NoArgs: true },
            $textsig: null,
            $doc: "B.hex() -> string\n\nCreate a string of hexadecimal numbers from a bytes object.\nExample: b'\\xb9\\x01\\xef'.hex() -> 'b901ef'.",
        },
        index: {
            $meth: function index(tgt, start, end) {
                const val = this.find$left(tgt, start, end);
                if (val === -1) {
                    throw new pyExc.ValueError("subsection not found");
                } else {
                    return new pyInt(val);
                }
            },
            $flags: { MinArgs: 1, MaxArgs: 3 },
            $textsig: null,
            $doc:
                "B.index(sub[, start[, end]]) -> int\n\nReturn the lowest index in B where subsection sub is found,\nsuch that sub is contained within B[start,end].  Optional\narguments start and end are interpreted as in slice notation.\n\nRaises ValueError when the subsection is not found.",
        },
        isalnum: {
            $meth: mkIsAll((val) => isdigit(val) || islower(val) || isupper(val)),
            $flags: { NoArgs: true },
            $textsig: null,
            $doc:
                "B.isalnum() -> bool\n\nReturn True if all characters in B are alphanumeric\nand there is at least one character in B, False otherwise.",
        },
        isalpha: {
            $meth: mkIsAll((val) => (val >= 65 && val <= 90) || (val >= 97 && val <= 122)),
            $flags: { NoArgs: true },
            $textsig: null,
            $doc:
                "B.isalpha() -> bool\n\nReturn True if all characters in B are alphabetic\nand there is at least one character in B, False otherwise.",
        },
        isascii: {
            $meth: mkIsAll((val) => val >= 0 && val <= 0x7f, true),
            $flags: { NoArgs: true },
            $textsig: null,
            $doc: "B.isascii() -> bool\n\nReturn True if B is empty or all characters in B are ASCII,\nFalse otherwise.",
        },
        isdigit: {
            $meth: mkIsAll(isdigit),
            $flags: { NoArgs: true },
            $textsig: null,
            $doc: "B.isdigit() -> bool\n\nReturn True if all characters in B are digits\nand there is at least one character in B, False otherwise.",
        },
        islower: {
            $meth: makeIsUpperLower(islower, isupper),
            $flags: { NoArgs: true },
            $textsig: null,
            $doc:
                "B.islower() -> bool\n\nReturn True if all cased characters in B are lowercase and there is\nat least one cased character in B, False otherwise.",
        },
        isspace: {
            $meth: mkIsAll(isspace),
            $flags: { NoArgs: true },
            $textsig: null,
            $doc:
                "B.isspace() -> bool\n\nReturn True if all characters in B are whitespace\nand there is at least one character in B, False otherwise.",
        },
        istitle: {
            $meth: function istitle() {
                let inword = false;
                let cased = false;
                for (let i = 0; i < this.v.length; i++) {
                    const val = this.v[i];
                    if (isupper(val)) {
                        if (inword) {
                            return pyFalse;
                        }
                        inword = true;
                        cased = true;
                    } else if (islower(val)) {
                        if (!inword) {
                            return pyFalse;
                        }
                        cased = true;
                    } else {
                        inword = false;
                    }
                }
                return cased ? pyTrue : pyFalse;
            },
            $flags: { NoArgs: true },
            $textsig: null,
            $doc:
                "B.istitle() -> bool\n\nReturn True if B is a titlecased string and there is at least one\ncharacter in B, i.e. uppercase characters may only follow uncased\ncharacters and lowercase characters only cased ones. Return False\notherwise.",
        },
        isupper: {
            $meth: makeIsUpperLower(isupper, islower),
            $flags: { NoArgs: true },
            $textsig: null,
            $doc:
                "B.isupper() -> bool\n\nReturn True if all cased characters in B are uppercase and there is\nat least one cased character in B, False otherwise.",
        },
        join: {
            $meth: function (iterable) {
                const final = [];
                let i = 0;
                return chainOrSupsend(
                    iterForOrSuspend(objectGetIter(iterable), (item) => {
                        if (!(item instanceof pyBytes)) {
                            throw new pyExc.TypeError("sequence item " + i + ": expected a bytes-like object, " + typeName(item) + " found");
                        }
                        i++;
                        if (final.length) {
                            final.push(...this.v);
                        }
                        final.push(...item.v);
                    }),
                    () => new pyBytes(new Uint8Array(final))
                );
            },
            $flags: { OneArg: true },
            $textsig: "($self, iterable_of_bytes, /)",
            $doc:
                "Concatenate any number of bytes objects.\n\nThe bytes whose method is called is inserted in between each pair.\n\nThe result is returned as a new bytes object.\n\nExample: b'.'.join([b'ab', b'pq', b'rs']) -> b'ab.pq.rs'.",
        },
        ljust: {
            $meth: mkJust("ljust", false, false),
            $flags: { MinArgs: 1, MaxArgs: 2 },
            $textsig: null,
            $doc:
                "B.ljust(width[, fillchar]) -> copy of B\n\nReturn B left justified in a string of length width. Padding is\ndone using the specified fill character (default is a space).",
        },
        lower: {
            $meth: mkCaseSwitch((val) => (isupper(val) ? val + 32 : val)),
            $flags: { NoArgs: true },
            $textsig: null,
            $doc: "B.lower() -> copy of B\n\nReturn a copy of B with all ASCII characters converted to lowercase.",
        },
        lstrip: {
            $meth: mkStrip(true, false),
            $flags: { MinArgs: 0, MaxArgs: 1 },
            $textsig: "($self, bytes=None, /)",
            $doc: "Strip leading bytes contained in the argument.\n\nIf the argument is omitted or None, strip leading  ASCII whitespace.",
        },
        partition: {
            $meth: mkPartition(false),
            $flags: { OneArg: true },
            $textsig: "($self, sep, /)",
            $doc:
                "Partition the bytes into three parts using the given separator.\n\nThis will search for the separator sep in the bytes. If the separator is found,\nreturns a 3-tuple containing the part before the separator, the separator\nitself, and the part after it.\n\nIf the separator is not found, returns a 3-tuple containing the original bytes\nobject and two empty bytes objects.",
        },
        replace: {
            $meth: function (oldB, newB, count) {
                oldB = this.get$raw(oldB);
                newB = this.get$raw(newB);
                count = count === undefined ? -1 : asIndexSized(count, pyExc.OverflowError);
                count = count < 0 ? Infinity : count;
                const final = [];
                let found = 0,
                    i = 0;
                while (i < this.v.length && found < count) {
                    const next = this.find$subleft(oldB, i, this.v.length);
                    if (next === -1) {
                        break;
                    }
                    for (let j = i; j < next; j++) {
                        final.push(this.v[j]);
                    }
                    final.push(...newB);
                    i = next + oldB.length;
                    found++;
                }
                for (i; i < this.v.length; i++) {
                    final.push(this.v[i]);
                }
                return new pyBytes(new Uint8Array(final));
            },
            $flags: { MinArgs: 2, MaxArgs: 3 },
            $textsig: "($self, old, new, count=-1, /)",
            $doc:
                "Return a copy with all occurrences of substring old replaced by new.\n\n  count\n    Maximum number of occurrences to replace.\n    -1 (the default value) means replace all occurrences.\n\nIf the optional argument count is given, only the first count occurrences are\nreplaced.",
        },
        rfind: {
            $meth: function (tgt, start, end) {
                return new pyInt(this.find$right(tgt, start, end));
            },
            $flags: { MinArgs: 1, MaxArgs: 3 },
            $textsig: null,
            $doc:
                "B.rfind(sub[, start[, end]]) -> int\n\nReturn the highest index in B where subsection sub is found,\nsuch that sub is contained within B[start,end].  Optional\narguments start and end are interpreted as in slice notation.\n\nReturn -1 on failure.",
        },
        rindex: {
            $meth: function rindex(tgt, start, end) {
                const val = this.find$right(tgt, start, end);
                if (val === -1) {
                    throw new pyExc.ValueError("subsection not found");
                } else {
                    return new pyInt(val);
                }
            },
            $flags: { MinArgs: 1, MaxArgs: 3 },
            $textsig: null,
            $doc:
                "B.rindex(sub[, start[, end]]) -> int\n\nReturn the highest index in B where subsection sub is found,\nsuch that sub is contained within B[start,end].  Optional\narguments start and end are interpreted as in slice notation.\n\nRaise ValueError when the subsection is not found.",
        },
        rjust: {
            $meth: mkJust("rjust", true, false),
            $flags: { MinArgs: 1, MaxArgs: 2 },
            $textsig: null,
            $doc:
                "B.rjust(width[, fillchar]) -> copy of B\n\nReturn B right justified in a string of length width. Padding is\ndone using the specified fill character (default is a space)",
        },
        rpartition: {
            $meth: mkPartition(true),
            $flags: { OneArg: true },
            $textsig: "($self, sep, /)",
            $doc:
                "Partition the bytes into three parts using the given separator.\n\nThis will search for the separator sep in the bytes, starting at the end. If\nthe separator is found, returns a 3-tuple containing the part before the\nseparator, the separator itself, and the part after it.\n\nIf the separator is not found, returns a 3-tuple containing two empty bytes\nobjects and the original bytes object.",
        },
        rsplit: {
            $meth: function rSplit(sep, maxsplit) {
                ({ sep, maxsplit } = this.get$splitArgs(sep, maxsplit));

                const result = [];
                let splits = 0,
                    i = this.v.length;

                if (sep !== null) {
                    while (i >= 0 && splits < maxsplit) {
                        const next = this.find$subright(sep, 0, i);
                        if (next === -1) {
                            break;
                        }
                        result.push(new pyBytes(this.v.subarray(next + sep.length, i)));
                        i = next;
                        splits++;
                    }
                    result.push(new pyBytes(this.v.subarray(0, i)));
                } else {
                    i--;
                    while (splits < maxsplit) {
                        while (isspace(this.v[i])) {
                            i--;
                        }
                        if (i < 0) {
                            break;
                        }
                        const index = i + 1;
                        i--;
                        while (i >= 0 && !isspace(this.v[i])) {
                            i--;
                        }
                        result.push(new pyBytes(this.v.subarray(i + 1, index)));
                        splits++;
                    }
                    if (i >= 0) {
                        while (isspace(this.v[i])) {
                            i--;
                        }
                        if (i >= 0) {
                            result.push(new pyBytes(this.v.subarray(0, i + 1)));
                        }
                    }
                }
                return new pyList(result.reverse());
            },
            $flags: { NamedArgs: ["sep", "maxsplit"], Defaults: [pyNone, -1] },
            $textsig: "($self, /, sep=None, maxsplit=-1)",
            $doc:
                "Return a list of the sections in the bytes, using sep as the delimiter.\n\n  sep\n    The delimiter according which to split the bytes.\n    None (the default value) means split on ASCII whitespace characters\n    (space, tab, return, newline, formfeed, vertical tab).\n  maxsplit\n    Maximum number of splits to do.\n    -1 (the default value) means no limit.\n\nSplitting is done starting at the end of the bytes and working to the front.",
        },
        rstrip: {
            $meth: mkStrip(false, true),
            $flags: { MinArgs: 0, MaxArgs: 1 },
            $textsig: "($self, bytes=None, /)",
            $doc: "Strip trailing bytes contained in the argument.\n\nIf the argument is omitted or None, strip trailing ASCII whitespace.",
        },
        split: {
            $meth: function Split(sep, maxsplit) {
                ({ sep, maxsplit } = this.get$splitArgs(sep, maxsplit));

                const result = [];
                const mylen = this.v.length;
                let splits = 0,
                    i = 0;

                if (sep !== null) {
                    while (i < mylen && splits < maxsplit) {
                        const next = this.find$subleft(sep, i, mylen);
                        if (next === -1) {
                            break;
                        }
                        result.push(new pyBytes(this.v.subarray(i, next)));
                        i = next + sep.length;
                        splits++;
                    }
                    result.push(new pyBytes(this.v.subarray(i, mylen)));
                } else {
                    while (splits < maxsplit) {
                        while (isspace(this.v[i])) {
                            i++;
                        }
                        if (i === mylen) {
                            break;
                        }
                        const index = i;
                        i++;
                        while (i < mylen && !isspace(this.v[i])) {
                            i++;
                        }
                        result.push(new pyBytes(this.v.subarray(index, i)));
                        splits++;
                    }
                    if (i < mylen) {
                        while (isspace(this.v[i])) {
                            i++;
                        }
                        if (i < mylen) {
                            result.push(new pyBytes(this.v.subarray(i, mylen)));
                        }
                    }
                }
                return new pyList(result);
            },
            $flags: { NamedArgs: ["sep", "maxsplit"], Defaults: [pyNone, -1] },
            $textsig: "($self, /, sep=None, maxsplit=-1)",
            $doc:
                "Return a list of the sections in the bytes, using sep as the delimiter.\n\n  sep\n    The delimiter according which to split the bytes.\n    None (the default value) means split on ASCII whitespace characters\n    (space, tab, return, newline, formfeed, vertical tab).\n  maxsplit\n    Maximum number of splits to do.\n    -1 (the default value) means no limit.",
        },
        splitlines: {
            $meth: function (keepends) {
                keepends = objectIsTrue(keepends);
                const final = [];
                let sol = 0;
                let eol;
                let i = 0;
                const len = this.v.length;
                while (i < len) {
                    const val = this.v[i];
                    if (val === 13) {
                        // \r
                        const rn = this.v[i + 1] === 10; // \r\n
                        if (keepends) {
                            eol = rn ? i + 2 : i + 1;
                        } else {
                            eol = i;
                        }
                        final.push(new pyBytes(this.v.subarray(sol, eol)));
                        i = sol = rn ? i + 2 : i + 1;
                    } else if (val === 10) {
                        // \n
                        eol = keepends ? i + 1 : i;
                        final.push(new pyBytes(this.v.subarray(sol, eol)));
                        i = sol = i + 1;
                    } else {
                        i++;
                    }
                }
                if (sol < len) {
                    final.push(new pyBytes(this.v.subarray(sol, len)));
                }
                return new pyList(final);
            },
            $flags: { NamedArgs: ["keepends"], Defaults: [false] },
            $textsig: "($self, /, keepends=False)",
            $doc:
                "Return a list of the lines in the bytes, breaking at line boundaries.\n\nLine breaks are not included in the resulting list unless keepends is given and\ntrue.",
        },
        startswith: {
            $meth: mkStartsEndsWith("startswith", (subarray, tgt) => tgt.length <= subarray.length && tgt.every((val, i) => val === subarray[i])),
            $flags: { MinArgs: 1, MaxArgs: 3 },
            $textsig: null,
            $doc:
                "B.startswith(prefix[, start[, end]]) -> bool\n\nReturn True if B starts with the specified prefix, False otherwise.\nWith optional start, test B beginning at that position.\nWith optional end, stop comparing B at that position.\nprefix can also be a tuple of bytes to try.",
        },
        strip: {
            $meth: mkStrip(true, true),
            $flags: { MinArgs: 0, MaxArgs: 1 },
            $textsig: "($self, bytes=None, /)",
            $doc:
                "Strip leading and trailing bytes contained in the argument.\n\nIf the argument is omitted or None, strip leading and trailing ASCII whitespace.",
        },
        swapcase: {
            $meth: mkCaseSwitch((val) => (isupper(val) ? val + 32 : islower(val) ? val - 32 : val)),
            $flags: { NoArgs: true },
            $textsig: null,
            $doc: "B.swapcase() -> copy of B\n\nReturn a copy of B with uppercase ASCII characters converted\nto lowercase ASCII and vice versa.",
        },
        title: {
            $meth: function () {
                const len = this.v.length;
                const final = new Uint8Array(len);
                let inword = false;
                for (let i = 0; i < len; i++) {
                    const val = this.v[i];
                    if (isupper(val)) {
                        final[i] = inword ? val + 32 : val;
                        inword = true;
                    } else if (islower(val)) {
                        final[i] = inword ? val : val - 32;
                        inword = true;
                    } else {
                        final[i] = val;
                        inword = false;
                    }
                }
                return new pyBytes(final);
            },
            $flags: { NoArgs: true },
            $textsig: null,
            $doc:
                "B.title() -> copy of B\n\nReturn a titlecased version of B, i.e. ASCII words start with uppercase\ncharacters, all remaining cased characters have lowercase.",
        },
        // translate: {
        //     $meth: function () {
        //         throw new pyExc.NotImplementedError("translate() bytes method not implemented in Skulpt");
        //     },
        //     $flags: { NoArgs: true },
        //     $textsig: "($self, table, /, delete=b'')",
        //     $doc:
        //         "Return a copy with each character mapped by the given translation table.\n\n  table\n    Translation table, which must be a bytes object of length 256.\n\nAll characters occurring in the optional argument delete are removed.\nThe remaining characters are mapped through the given translation table.",
        // },
        upper: {
            $meth: mkCaseSwitch((val) => (islower(val) ? val - 32 : val)),
            $flags: { NoArgs: true },
            $textsig: null,
            $doc: "B.upper() -> copy of B\n\nReturn a copy of B with all ASCII characters converted to uppercase.",
        },
        zfill: {
            $meth: function (width) {
                width = asIndexSized(width, pyExc.IndexError);
                const fill_len = width - this.v.length;
                if (fill_len <= 0) {
                    return new pyBytes(this.v);
                }
                const final = new Uint8Array(width);
                let i = 0,
                    j;
                if (this.v[0] === 43 || this.v[0] === 45) {
                    final[0] = this.v[0];
                    i++;
                }
                final.fill(48, i, i + fill_len);
                for (j = i, i = i + fill_len; i < width; i++, j++) {
                    final[i] = this.v[j];
                }
                return new pyBytes(final);
            },
            $flags: { OneArg: true },
            $textsig: null,
            $doc:
                "B.zfill(width) -> copy of B\n\nPad a numeric string B with zeros on the left, to fill a field\nof the specified width.  B is never truncated.",
        },
    },
    classmethods: {
        fromhex: {
            $meth: function fromhex(string) {
                if (!checkString(string)) {
                    throw new pyExc.TypeError("fromhex() argument must be str, not " + typeName(string));
                }
                string = String(string);
                const spaces = /\s+/g;
                const ishex = /^[abcdefABCDEF0123456789]{2}$/;
                const final = [];
                let index = 0;
                function pushOrThrow(upto) {
                    for (let i = index; i < upto; i += 2) {
                        let s = string.substr(i, 2);
                        if (!ishex.test(s)) {
                            throw new pyExc.ValueError("non-hexadecimal number found in fromhex() arg at position " + (i + 1));
                        }
                        final.push(parseInt(s, 16));
                    }
                }
                let match;
                while ((match = spaces.exec(string)) !== null) {
                    pushOrThrow(match.index);
                    index = spaces.lastIndex;
                }
                pushOrThrow(string.length);
                return new this(final);
            },
            $flags: { OneArg: true },
            $textsig: "($type, string, /)",
            $doc:
                "Create a bytes object from a string of hexadecimal numbers.\n\nSpaces between two numbers are accepted.\nExample: bytes.fromhex('B9 01EF') -> b'\\\\xb9\\\\x01\\\\xef'.",
        },
    },
});

function checkGetEncodingErrors(funcname, encoding, errors) {
    // check the types of encoding and errors
    if (encoding === undefined) {
        encoding = "utf-8";
    } else if (!checkString(encoding)) {
        throw new pyExc.TypeError(funcname + "() argument " + ("bytesstr".includes(funcname) ? 2 : 1) + " must be str not " + typeName(encoding));
    } else {
        encoding = encoding.$jsstr();
    }
    if (errors === undefined) {
        errors = "strict";
    } else if (!checkString(errors)) {
        throw new pyExc.TypeError(funcname + "() argument " + ("bytesstr".includes(funcname) ? 3 : 2) + " must be str not " + typeName(errors));
    } else {
        errors = errors.$jsstr();
    }
    return { encoding: encoding, errors: errors };
}

function strEncode(pyStr, encoding, errors) {
    const source = pyStr.$jsstr();
    encoding = normalizeEncoding(encoding);
    if (!(errors === "strict" || errors === "ignore" || errors === "replace")) {
        throw new pyExc.NotImplementedError("'" + errors + "' error handling not implemented in Skulpt");
    }
    let uint8;
    if (encoding === "ascii") {
        uint8 = encodeAscii(source, errors);
    } else if (encoding === "utf-8") {
        uint8 = Encoder.encode(source);
    } else {
        throw new pyExc.LookupError("unknown encoding: " + encoding);
    }
    return new pyBytes(uint8);
}

function encodeAscii(source, errors) {
    const data = [];
    for (let i in source) {
        const val = source.charCodeAt(i);
        if (val > 0x7f) {
            if (errors === "strict") {
                const hexval = makehexform(val);
                throw new pyExc.UnicodeEncodeError(
                    "'ascii' codec can't encode character '" + hexval + "' in position " + i + ": ordinal not in range(128)"
                );
            } else if (errors === "replace") {
                data.push(63); // "?"
            }
        } else {
            data.push(val);
        }
    }
    return new Uint8Array(data);
}

function makehexform(num) {
    var leading;
    if (num <= 265) {
        leading = "\\x";
    } else {
        leading = "\\u";
    }
    num = num.toString(16);
    if (num.length === 3) {
        num = num.slice(1, 3);
    }
    if (num.length === 1) {
        num = leading + "0" + num;
    } else {
        num = leading + num;
    }
    return num;
}

function decodeAscii(source, errors) {
    let final = "";
    for (let i = 0; i < source.length; i++) {
        const val = source[i];
        if (val > 0x7f) {
            if (errors === "strict") {
                throw new pyExc.UnicodeDecodeError(
                    "'ascii' codec can't decode byte 0x" + val.toString(16) + " in position " + i + ": ordinal not in range(128)"
                );
            } else if (errors === "replace") {
                final += String.fromCharCode(65533);
            }
        } else {
            final += String.fromCharCode(val);
        }
    }
    return final;
}

function decodeUtf(source, errors) {
    const string = Decoder.decode(source);
    if (errors === "replace") {
        return string;
    } else if (errors === "strict") {
        const i = string.indexOf("�");
        if (i === -1) {
            return string;
        }
        throw new pyExc.UnicodeDecodeError(
            "'utf-8' codec can't decode byte 0x" + source[i].toString(16) + " in position " + i + ": invalid start byte"
        );
    }
    return string.replace(/�/g, "");
}

function bytesDecode(encoding, errors) {
    ({ encoding, errors } = checkGetEncodingErrors("decode", encoding, errors));
    encoding = normalizeEncoding(encoding);

    if (!(errors === "strict" || errors === "ignore" || errors === "replace")) {
        throw new pyExc.NotImplementedError("'" + errors + "' error handling not implemented in Skulpt");
    }

    let jsstr;
    if (encoding === "ascii") {
        jsstr = decodeAscii(this.v, errors);
    } else if (encoding === "utf-8") {
        jsstr = decodeUtf(this.v, errors);
    } else {
        throw new pyExc.LookupError("unknown encoding: " + encoding);
    }
    return new pyStr(jsstr);
}

function mkStartsEndsWith(funcname, is_match) {
    return function (prefix, start, end) {
        if (!(prefix instanceof pyBytes || prefix instanceof pyTuple)) {
            throw new pyExc.TypeError(funcname + " first arg must be bytes or a tuple of bytes, not " + typeName(prefix));
        }
        ({ start, end } = pySlice.$indices(this, start, end));
        if (end < start) {
            return pyFalse;
        }
        const slice = this.v.subarray(start, end);

        if (prefix instanceof pyTuple) {
            for (let iter = objectGetIter(prefix), item = iter.tp$iternext(); item !== undefined; item = iter.tp$iternext()) {
                item = this.get$raw(item);
                if (is_match(slice, item)) {
                    return pyTrue;
                }
            }
            return pyFalse;
        } else {
            return is_match(slice, prefix.v) ? pyTrue : pyFalse;
        }
    };
}

function mkFind(isReversed) {
    return function find(tgt, start, end) {
        tgt = this.get$tgt(tgt);
        ({ start, end } = pySlice.$indices(this, start, end));
        if (end < start) {
            return -1;
        }
        let idx;
        if (typeof tgt === "number") {
            idx = isReversed ? this.v.lastIndexOf(tgt, end - 1) : this.v.indexOf(tgt, start);
            return idx >= start && idx < end ? idx : -1;
        }
        if (isReversed) {
            return this.find$subright(tgt, start, end);
        } else {
            return this.find$subleft(tgt, start, end);
        }
    };
}

function mkPartition(isReversed) {
    return function partition(sep) {
        sep = this.get$raw(sep);
        let pos;
        if (isReversed) {
            pos = this.find$subright(sep, 0, this.v.length);
            if (pos < 0) {
                return new pyTuple([new pyBytes(), new pyBytes(), this]);
            }
        } else {
            pos = this.find$subleft(sep, 0, this.v.length);
            if (pos < 0) {
                return new pyTuple([this, new pyBytes(), new pyBytes()]);
            }
        }
        return new pyTuple([new pyBytes(this.v.subarray(0, pos)), new pyBytes(sep), new pyBytes(this.v.subarray(pos + sep.length))]);
    };
}

function mkStrip(isLeft, isRight) {
    return function stripBytes(chars) {
        let strip_chrs;
        if (chars === undefined || chars === pyNone) {
            // default is to remove ASCII whitespace
            strip_chrs = new Uint8Array([9, 10, 11, 12, 13, 32, 133]);
        } else {
            strip_chrs = this.get$raw(chars);
        }
        let start = 0,
            end = this.v.length;
        if (isLeft) {
            while (start < end && strip_chrs.includes(this.v[start])) {
                start++;
            }
        }
        if (isRight) {
            while (end > start && strip_chrs.includes(this.v[end - 1])) {
                end--;
            }
        }
        const final = new Uint8Array(end - start);
        for (let i = 0; i < final.length; i++) {
            final[i] = this.v[i + start];
        }
        return new pyBytes(final);
    };
}

function mkJust(funcname, isRight, isCenter) {
    return function justify(width, fillbyte) {
        if (fillbyte === undefined) {
            fillbyte = 32;
        } else if (!(fillbyte instanceof pyBytes) || fillbyte.v.length != 1) {
            throw new pyExc.TypeError(funcname + "() argument 2 must be a byte string of length 1, not " + typeName(fillbyte));
        } else {
            fillbyte = fillbyte.v[0];
        }
        const mylen = this.v.length;
        width = asIndexSized(width, pyExc.IndexError);
        if (width <= mylen) {
            return new pyBytes(this.v);
        }
        const final = new Uint8Array(width);
        let fill1, fill2;
        if (isCenter) {
            fill1 = Math.floor((width - mylen) / 2);
            fill2 = (width - mylen) % 2 ? fill1 + 1 : fill1;
        } else if (isRight) {
            fill1 = width - mylen;
            fill2 = 0;
        } else {
            fill1 = 0;
            fill2 = width - mylen;
        }
        final.fill(fillbyte, 0, fill1);
        for (let i = 0; i < mylen; i++) {
            final[i + fill1] = this.v[i];
        }
        final.fill(fillbyte, width - fill2);
        return new pyBytes(final);
    };
}

function isspace(val) {
    return (val >= 9 && val <= 13) || val === 32;
}
function islower(val) {
    return val >= 97 && val <= 122;
}
function isupper(val) {
    return val >= 65 && val <= 90;
}
function isdigit(val) {
    return val >= 48 && val <= 57;
}

function checkSepMaxSplit(sep, maxsplit) {
    maxsplit = asIndexSized(maxsplit, pyExc.OverflowError);
    maxsplit = maxsplit < 0 ? Infinity : maxsplit;

    sep = checkNone(sep) ? null : this.get$raw(sep);
    if (sep !== null && !sep.length) {
        throw new pyExc.ValueError("empty separator");
    }
    return { sep: sep, maxsplit: maxsplit };
}

function mkIsAll(passTest, passesZero) {
    return function isAll() {
        if (this.v.length === 0) {
            return passesZero ? pyTrue : pyFalse;
        }
        return this.v.every((val) => passTest(val)) ? pyTrue : pyFalse;
    };
}

function makeIsUpperLower(passTest, failTest) {
    return function () {
        let flag = false;
        for (let i = 0; i < this.v.length; i++) {
            if (failTest(this.v[i])) {
                return pyFalse;
            }
            if (!flag && passTest(this.v[i])) {
                flag = true;
            }
        }
        return flag ? pyTrue : pyFalse;
    };
}

function mkCaseSwitch(switchCase) {
    return function lowerUpperSwapCase() {
        const final = new Uint8Array(this.v.length);
        for (let i = 0; i < this.v.length; i++) {
            final[i] = switchCase(this.v[i]);
        }
        return new pyBytes(final);
    };
}

/**
 * @constructor
 * @param {pyBytes} bytes
 */
var bytes_iter_ = buildIteratorClass("bytes_iterator", {
    constructor: function bytes_iter_(bytes) {
        this.$index = 0;
        this.$seq = bytes.v;
    },
    iternext: function () {
        const next = this.$seq[this.$index++];
        if (next === undefined) {
            return undefined;
        }
        return new pyInt(next);
    },
    methods: {
        __length_hint__: genericIterLengthHintWithArrayMethodDef,
    },
    flags: { sk$acceptable_as_base_class: false },
});
