require("fastestsmallesttextencoderdecoder");
import * as str_lib from "./str_lib.js";

// Mapping from supported valid encodings to normalized encoding name
const supportedEncodings = {
    "utf": "utf-8",
    "utf8": "utf-8",
    "utf-8": "utf-8",
    "ascii": "ascii"
};

function normalizeEncoding(encoding) {
    const normalized = encoding.replace(/\s+/g, "").toLowerCase();
    const supported = supportedEncodings[normalized];
    if (supported === undefined) {
        return encoding;
    } else {
        return supported;
    }
}
const Encoder = new TextEncoder();
const Decoder = new TextDecoder();

// Stop gap until Uint8Array.from (or new Uint8Array(iterable)) gets wider support
// This only handles the simple case used in this file
function Uint8ArrayFromArray(source) {
    if (Uint8Array.from) {
        return Uint8Array.from(source);
    }

    const uarr = new Uint8Array(source.length);

    for (let idx = 0; idx < source.length; idx++) {
        uarr[idx] = source[idx];
    }

    return uarr;
}

/**
 * @constructor
 * @param {*} source Using constructor with new should be a js object
 * @param {Sk.builtin.str=} encoding Only called from python
 * @param {Sk.builtin.str=} errors Only called from python
 * @return {Sk.builtin.bytes}
 * @extends {Sk.builtin.object}
 */
Sk.builtin.bytes = function (source, encoding, errors) {
    if (!(this instanceof Sk.builtin.bytes)) {
        // called from python
        return newBytesFromPy(...arguments);
    }

    // deal with internal calls
    if (source === undefined) {
        this.v = new Uint8Array();
    } else if (source instanceof Uint8Array) {
        this.v = source;
    } else if (Array.isArray(source)) {
        Sk.asserts.assert(source.every((x) => x >= 0 && x < 256), "bad internal call to bytes with array");
        this.v = Uint8ArrayFromArray(source);
    } else if (typeof source === "string") {
        // fast path must be binary string https://developer.mozilla.org/en-US/docs/Web/API/DOMString/Binary
        // i.e. the reverse of this.$jsstr();
        let cc;
        const arr = [];
        for (let i in source) {
            cc = source.charCodeAt(i);
            if (cc > 0xff) {
                throw new Sk.builtin.UnicodeDecodeError("invalid string (possibly contains a unicode character)");
            }
            arr.push(cc);
        }
        this.v = Uint8ArrayFromArray(arr);
    } else if (typeof source === "number") {
        this.v = new Uint8Array(source);
    } else {
        // fall through case for subclassing called by Sk.abstr.superConstructor
        const ret = Sk.misceval.chain(newBytesFromPy(...arguments), (pyBytes) => {
            this.v = pyBytes.v;
            return this;
        });
        // Sk.abstr.superConstructor is not suspension aware
        return Sk.misceval.retryOptionalSuspensionOrThrow(ret);
    }
};

Sk.abstr.setUpInheritance("bytes", Sk.builtin.bytes, Sk.builtin.seqtype);

Sk.builtin.bytes.prototype.__class__ = Sk.builtin.bytes;

Sk.builtin.bytes.prototype.sk$builtinBase = Sk.builtin.bytes;

function strEncode(pyStr, encoding, errors) {
    const source = pyStr.$jsstr();
    encoding = normalizeEncoding(encoding);
    if (!(errors === "strict" || errors === "ignore" || errors === "replace")) {
        throw new Sk.builtin.NotImplementedError("'" + errors + "' error handling not implemented in Skulpt");
    }
    let uint8;
    if (encoding === "ascii") {
        uint8 = encodeAscii(source, errors);
    } else if (encoding === "utf-8") {
        uint8 = Encoder.encode(source);
    } else {
        throw new Sk.builtin.LookupError("unknown encoding: " + encoding);
    }
    return new Sk.builtin.bytes(uint8);
}

Sk.builtin.bytes.$strEncode = strEncode;

function encodeAscii(source, errors) {
    const data = [];
    for (let i in source) {
        const val = source.charCodeAt(i);
        if (val < 0 || val > 127) {
            if (errors === "strict") {
                const hexval = makehexform(val);
                throw new Sk.builtin.UnicodeEncodeError("'ascii' codec can't encode character '" + hexval + "' in position " + i + ": ordinal not in range(128)");
            } else if (errors === "replace") {
                data.push(63); // "?"
            }
        } else {
            data.push(val);
        }
    }
    return Uint8ArrayFromArray(data);
}

function newBytesFromPy(pySource, encoding, errors) {
    Sk.builtin.pyCheckArgsLen("bytes", arguments.length, 0, 3);
    let source;
    let dunderBytes;
    if (arguments.length > 1) {
        // either encoding is a py object or errors is a py object - currently kwargs not supported
        // will fail if encoding is not a string || errors is not a string || pySource is not a string
        // check the types of encoding and errors
        if (!Sk.builtin.checkString(encoding)) {
            throw new Sk.builtin.TypeError("bytes() argument 2 must be str not " + Sk.abstr.typeName(encoding));
        }
        if (errors !== undefined && !Sk.builtin.checkString(errors)) {
            throw new Sk.builtin.TypeError("bytes() argument 3 must be str not " + Sk.abstr.typeName(encoding));
        }
        if (!Sk.builtin.checkString(pySource)) {
            // think ahead for kwarg support
            throw new Sk.builtin.TypeError((encoding !== undefined ? "encoding" : "errors") + " without a string argument");
        }
    }

    if (pySource === undefined) {
        return new Sk.builtin.bytes();
    } else if (Sk.builtin.checkString(pySource)) {
        if (encoding === undefined) {
            throw new Sk.builtin.TypeError("string argument without an encoding");
        }
        errors = errors === undefined ? "strict" : errors.$jsstr();
        encoding = encoding.$jsstr();
        return strEncode(pySource, encoding, errors);
    } else if (Sk.builtin.checkInt(pySource)) {
        source = Sk.builtin.asnum$(pySource);
        if (source < 0) {
            throw new Sk.builtin.ValueError("negative count");
        } else if (source > Number.MAX_SAFE_INTEGER) {
            throw new Sk.builtin.OverflowError("cannot fit 'int' into an index-sized integer");
        } 
        return new Sk.builtin.bytes(source);
    } else if (Sk.builtin.checkBytes(pySource)) {
        return new Sk.builtin.bytes(pySource.v);
    } else if ((dunderBytes = Sk.abstr.lookupSpecial(pySource, Sk.builtin.str.$bytes)) != null) {
        const ret = Sk.misceval.callsimOrSuspendArray(dunderBytes, [pySource]);
        return Sk.misceval.chain(ret, (bytesSource) => {
            if (!Sk.builtin.checkBytes(bytesSource)) {
                throw new Sk.builtin.TypeError("__bytes__ returned non-bytes (type " + Sk.abstr.typeName(bytesSource) + ")");
            }
            return bytesSource;
        });
    } else if (Sk.builtin.checkIterable(pySource)) {
        source = [];
        const r = Sk.misceval.iterFor(Sk.abstr.iter(pySource), (byte) => {
            if (!Sk.misceval.isIndex(byte)) {
                throw new Sk.builtin.TypeError("'" + Sk.abstr.typeName(byte) + "' object cannot be interpreted as an integer");
            };
            const n = Sk.misceval.asIndex(byte);
            if (n < 0 || n > 255) {
                throw new Sk.builtin.ValueError("bytes must be in range(0, 256)");
            }
            source.push(n);
        });
        return Sk.misceval.chain(r, () => new Sk.builtin.bytes(source));
    }
    let msg = "";
    if (pySource.sk$object === undefined) {
        msg += ", if calling constructor with a javascript object use 'new'";
    }
    throw new Sk.builtin.TypeError("cannot convert '" + Sk.abstr.typeName(pySource) + "' object into bytes" + msg);
}

function makehexform(num) {
    var leading;
    if (num <= 255) {
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
};

Sk.builtin.bytes.prototype.$jsstr = function () {
    // returns binary string - https://developer.mozilla.org/en-US/docs/Web/API/DOMString/Binary
    let ret = "";
    for (let i = 0; i < this.v.byteLength; i++) {
        ret += String.fromCharCode(this.v[i]);
    }
    return ret;
};

Sk.builtin.bytes.prototype.type$like = function (obj) {
    return obj instanceof Sk.builtin.bytes;
};

Sk.builtin.bytes.prototype.like$name = "a bytes-like object";

Sk.builtin.bytes.prototype.sub$name = "subsection";

Sk.builtin.bytes.prototype.get$tgt = function(tgt) {
    if (tgt instanceof Sk.builtin.bytes) {
        return tgt.$jsstr();
    }
    if (!Sk.misceval.isIndex(tgt)) {
        throw new Sk.builtin.TypeError("argument should be integer or bytes-like object, not " + Sk.abstr.typeName(tgt));
    }
    tgt = Sk.misceval.asIndex(tgt);
    if (tgt < 0 || tgt > 0xff) {
        throw new Sk.builtin.ValueError("bytes must be in range(0, 256)");
    }
    return String.fromCharCode(parseInt(tgt, 10));
};

Sk.builtin.bytes.prototype.tp$hash = function () {
    return Sk.builtin.hash(new Sk.builtin.str(this.$jsstr()));
};

Sk.builtin.bytes.prototype["$r"] = function () {
    let num;
    let quote = "'";
    const hasdbl = this.v.indexOf(34) !== -1;
    let ret = "";

    for (let i = 0; i < this.v.byteLength; i++) {
        num = this.v[i];
        if ((num < 9) || (num > 10 && num < 13) || (num > 13 && num < 32) || (num > 126)) {
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
    return new Sk.builtin.str(ret);
};

Sk.builtin.bytes.prototype.mp$subscript = function (index) {
    if (Sk.misceval.isIndex(index)) {
        let i = Sk.misceval.asIndex(index);
        if (i !== undefined) {
            if (i < 0) {
                i = this.v.byteLength + i;
            }
            if (i < 0 || i >= this.v.byteLength) {
                throw new Sk.builtin.IndexError("index out of range");
            }
            return new Sk.builtin.int_(this.v[i]);
        }
    } else if (index instanceof Sk.builtin.slice) {
        const ret = [];
        index.sssiter$(this.v.byteLength, (i) => {
            ret.push(this.v[i]);
        });
        return new Sk.builtin.bytes(ret);
    }

    throw new Sk.builtin.TypeError("byte indices must be integers, not " + Sk.abstr.typeName(index));
};

Sk.builtin.bytes.prototype.tp$richcompare = str_lib.richCompare;

Sk.builtin.bytes.prototype.sq$length = function () {
    return this.v.byteLength;
};

Sk.builtin.bytes.prototype.sq$concat = function (other) {
    var i;
    var lis;
    if (!(other instanceof Sk.builtin.bytes)) {
        throw new Sk.builtin.TypeError("can't concat " + Sk.abstr.typeName(other) + " to bytes");
    }
    lis = [];
    for (i = 0; i < this.v.byteLength; i++) {
        lis.push(this.v[i]);
    }
    for (i = 0; i < other.v.byteLength; i++) {
        lis.push(other.v[i]);
    }
    return new Sk.builtin.bytes(lis);
};
Sk.builtin.bytes.prototype.nb$add = Sk.builtin.bytes.prototype.sq$concat;
Sk.builtin.bytes.prototype.nb$inplace_add = Sk.builtin.bytes.prototype.sq$concat;

Sk.builtin.bytes.prototype.sq$repeat = function (n) {
    var i;
    var j;
    var ret;
    if (!(n instanceof Sk.builtin.int_)) {
        throw new Sk.builtin.TypeError("can't multiply sequence by non-int of type '" + Sk.abstr.typeName(n) + "'");
    }
    ret = [];
    for (j = 0; j < n.v; j++) {
        for (i = 0; i < this.v.byteLength; i++) {
            ret.push(this.v[i]);
        }
    }
    return new Sk.builtin.bytes(ret);
};
Sk.builtin.bytes.prototype.nb$multiply = Sk.builtin.bytes.prototype.sq$repeat;
Sk.builtin.bytes.prototype.nb$inplace_multiply = Sk.builtin.bytes.prototype.sq$repeat;

Sk.builtin.bytes.prototype.sq$contains = function (item) {
    if (Sk.builtin.checkInt(item)) {
        const val = Sk.builtin.asnum$(item);
        if (val < 0 || val > 255) {
            throw new Sk.builtin.ValueError("byte must be in range(0, 256)");
        }

        return this.v.indexOf(val) !== -1;
    } else if (!(item instanceof Sk.builtin.bytes)) {
        throw new Sk.builtin.TypeError("a bytes-like object is required, not " + Sk.abstr.typeName(item));
    }

    if (item.v.byteLength === 0) {
        return true;
    } else if (item.v.byteLength === 1) {
        return this.v.indexOf(item.v[0]) !== -1;
    } else {
        // Currently can't test for array/subarray equality with typed arrays
        let start = 0;
        while (start < this.v.byteLength) {
            const idx = this.v.indexOf(item.v[0], start);
            if (idx === -1) {
                break;
            }

            let match = true;
            for (let j = 0; j < item.v.byteLength; j++) {
                if (this.v[idx + j] !== item.v[j]) {
                    match = false;
                    break;
                }
            }

            if (match) {
                return true;
            }
            start = idx + 1;
        }
    }

    return false;
};

Sk.builtin.bytes.prototype.nb$remainder = str_lib.mod;

Sk.builtin.bytes.$decode = function (self, encoding, errors) {
    var i;
    var val;
    var final;
    Sk.builtin.pyCheckArgsLen("decode", arguments.length - 1, 0, 2);

    if (encoding === undefined) {
        encoding = "utf-8";
    } else if (!(encoding instanceof Sk.builtin.str)) {
        throw new Sk.builtin.TypeError("decode() argument 1 must be str, not " + Sk.abstr.typeName(encoding));
    } else {
        encoding = encoding.v;
    }
    encoding = normalizeEncoding(encoding);

    if (errors === undefined) {
        errors = "strict";
    } else if (!(errors instanceof Sk.builtin.str)) {
        throw new Sk.builtin.TypeError("decode() argument 2 must be str, not " + Sk.abstr.typeName(errors));
    } else {
        errors = errors.v;
    }

    if (!(errors === "strict" || errors === "ignore" || errors === "replace")) {
        throw new Sk.builtin.NotImplementedError("'" + errors + "' error handling not implemented in Skulpt");
    }

    if (!(encoding === "ascii" || encoding === "utf-8")) {
        throw new Sk.builtin.LookupError("unknown encoding: " + encoding.v);
    }

    if (encoding === "ascii") {
        final = "";
        for (i = 0; i < self.v.byteLength; i++) {
            val = self.v[i];
            if (val > 127) {
                if (errors === "strict") {
                    val = val.toString(16);
                    throw new Sk.builtin.UnicodeDecodeError("'ascii' codec can't decode byte 0x" + val + " in position " + i.toString() + ": ordinal not in range(128)");
                } else if (errors === "replace") {
                    final += String.fromCharCode(65533);
                }
            } else {
                final += String.fromCharCode(val);
            }
        }
    } else {
        const string = Decoder.decode(self.v);
        if (errors === "replace") {
            return new Sk.builtin.str(string);
        }
        final = "";
        for (i in string) {
            if (string[i].charCodeAt(0) === 65533) {
                if (errors === "strict") {
                    val = self.v[i];
                    val = val.toString(16);
                    throw new Sk.builtin.UnicodeDecodeError("'utf-8' codec can't decode byte 0x" + val + " in position " + i.toString() + ": invalid start byte");
                }
            } else {
                final += string[i];
            }
        }
    }
    return new Sk.builtin.str(final);
};

Sk.builtin.bytes.prototype["decode"] = new Sk.builtin.func(Sk.builtin.bytes.$decode);

Sk.builtin.bytes.prototype["fromhex"] = new Sk.builtin.func(function (string) {
    var final;
    var checkhex;
    var val1;
    var i;
    var char;
    var checkspace;
    Sk.builtin.pyCheckArgsLen("fromhex", arguments.length, 1, 1);

    if (!(string instanceof Sk.builtin.str)) {
        throw new Sk.builtin.TypeError("fromhex() argument must be str, not " + Sk.abstr.typeName(string));
    }

    final = [];
    checkhex = function (val) {
        if ("0123456789abcdefABCDEF".includes(val)) {
            return true;
        }
        return false;
    };

    checkspace = function (val) {
        var code;
        code = val.charCodeAt(0);
        if (code === 9 || code === 10 || code === 11 || code === 12 || code === 13 || code === 32 || code === 133) {
            return true;
        } else {
            return false;
        }
    };
    i = 0;
    while (i < string.v.length) {
        char = string.v.charAt(i);
        if (checkhex(char)) {
            if (i + 1 < string.v.length) {
                if (checkhex(string.v.charAt(i+1))) {
                    val1 = string.v.slice(i, i + 2);
                    val1 = parseInt(val1, 16);
                    final.push(val1);
                    i += 2;
                } else {
                    throw new Sk.builtin.ValueError("non-hexadecimal number found in fromhex() arg at position " + (i+1).toString());
                }
            } else {
                throw new Sk.builtin.ValueError("non-hexadecimal number found in fromhex() arg at position " + (i).toString());
            }
        } else if (checkspace(char)) {
            i++;
        } else {
            throw new Sk.builtin.ValueError("non-hexadecimal number found in fromhex() arg at position " + (i).toString());
        }
    }

    return new Sk.builtin.bytes(final);
});

Sk.builtin.bytes.prototype["hex"] = new Sk.builtin.func(function (self) {
    var final;
    var val;
    var i;
    Sk.builtin.pyCheckArgsLen("hex", arguments.length - 1, 0, 0);
    final = "";
    for (i = 0; i < self.v.byteLength; i++) {
        val = self.v[i];
        val = val.toString(16);
        if (val.length === 1) {
            val = "0" + val;
        }
        final += val;
    }
    return new Sk.builtin.str(final);
});

function indices(self, start, end) {
    const len = self.v.byteLength;
    if (start === undefined || start === Sk.builtin.none.none$) {
        start = 0;
    } else if (!Sk.misceval.isIndex(start)) {
        throw new Sk.builtin.TypeError("slice indices must be integers or None or have an __index__ method");
    } else {
        start = Sk.misceval.asIndex(start);
        start = start >= 0 ? start : len + start;
        if (start < 0) {
            start = 0;
        }
    }
    if (end === undefined || Sk.builtin.checkNone(end)) {
        end = len;
    } else if (!Sk.misceval.isIndex(end)) {
        throw new Sk.builtin.TypeError("slice indices must be integers or None or have an __index__ method");
    } else {
        end = Sk.misceval.asIndex(end);
        end = end >= 0 ? end : len + end;
        if (end < 0) {
            end = 0;
        } else if (end > len) {
            end = len;
        }
    }
    return {
        start: start,
        end: end
    };
}

Sk.builtin.bytes.prototype["count"] = str_lib.count;

Sk.builtin.bytes.prototype["endswith"] = str_lib.endswith;


Sk.builtin.bytes.prototype.find$left = str_lib.find$left;

Sk.builtin.bytes.prototype.find$right = str_lib.find$right;

Sk.builtin.bytes.prototype["find"] = str_lib.find;

Sk.builtin.bytes.prototype["index"] = str_lib.index;

Sk.builtin.bytes.prototype["join"] = str_lib.join;

Sk.builtin.bytes.prototype["maketrans"] = str_lib.maketrans;

Sk.builtin.bytes.prototype["partition"] = str_lib.partition;

Sk.builtin.bytes.prototype["replace"] = str_lib.replace;

Sk.builtin.bytes.prototype["rfind"] = str_lib.rfind;

Sk.builtin.bytes.prototype["rindex"] = str_lib.rindex;

Sk.builtin.bytes.prototype["rpartition"] = str_lib.rpartition;

Sk.builtin.bytes.prototype["startswith"] = str_lib.startswith;

Sk.builtin.bytes.prototype["translate"] = str_lib.translate;

Sk.builtin.bytes.prototype["center"] = str_lib.center;

Sk.builtin.bytes.prototype["ljust"] = str_lib.ljust;

Sk.builtin.bytes.prototype["lstrip"] = str_lib.lstrip;

Sk.builtin.bytes.prototype["rjust"] = str_lib.rjust;

Sk.builtin.bytes.prototype["rsplit"] = new Sk.builtin.func(function (self, sep, maxsplits) {
    Sk.builtin.pyCheckArgsLen("rsplit", arguments.length, 1, 3);
    if ((sep === undefined) || (sep === Sk.builtin.none.none$)) {
        sep = null;
    }
    if ((sep !== null) && !(sep instanceof Sk.builtin.bytes)) {
        throw new Sk.builtin.TypeError("expected bytes");
    }
    if ((sep !== null) && sep.v.byteLength == 0) {
        throw new Sk.builtin.ValueError("empty separator");
    }
    if ((maxsplits !== undefined) && !Sk.builtin.checkInt(maxsplits)) {
        throw new Sk.builtin.TypeError("an integer is required");
    }

    if (maxsplits === undefined) {
        maxsplits = -1;
    } else {
        maxsplits = Sk.builtin.asnum$(maxsplits);
    }

    let result = [];
    let splits = 0;

    if (sep) {
        let index = self.v.byteLength;
        while (index >= 0) {
            let next = self.find$right(sep, 0, index);
            if (next === -1) {
                break;
            }
            result.push(new Sk.builtin.bytes(self.v.subarray(next + sep.v.byteLength, index)));
            index = next;
            splits++;
            if (maxsplits > -1 && splits >= maxsplits) {
                break;
            }
        }
        result.push(new Sk.builtin.bytes(self.v.subarray(0, index)));
    } else {
        let i = self.v.byteLength - 1;
        let index;
        while (maxsplits === -1 || splits < maxsplits) {
            while (i >= 0 && isspace(self.v[i])) {
                i--;
            }
            if (i < 0) {
                break;
            }
            index = i + 1;
            i--;
            while (i >= 0 && !isspace(self.v[i])) {
                i--;
            }
            result.push(new Sk.builtin.bytes(self.v.subarray(i + 1, index)));
            splits++;
        }

        if (i >= 0) {
            while (i >= 0 && isspace(self.v[i])) {
                i--;
            }
            if (i >= 0) {
                result.push(new Sk.builtin.bytes(self.v.subarray(0, i + 1)));
            }
        }
    }

    return new Sk.builtin.list(result.reverse());
});

Sk.builtin.bytes.prototype["rstrip"] = str_lib.rstrip;

function isspace(val) {
    return ((val >= 9 && val <= 13) || val === 32);
};

Sk.builtin.bytes.prototype["split"] = str_lib.split;

Sk.builtin.bytes.prototype["strip"] = str_lib.strip;

Sk.builtin.bytes.prototype["capitalize"] = str_lib.capitalize;

Sk.builtin.bytes.prototype["expandtabs"] = str_lib.expandtabs;

Sk.builtin.bytes.prototype["isalnum"] = str_lib.isalnum;

Sk.builtin.bytes.prototype["isalpha"] = str_lib.isalpha;

Sk.builtin.bytes.prototype["isascii"] = str_lib.isascii;

Sk.builtin.bytes.prototype["isdigit"] = str_lib.isdigit;

Sk.builtin.bytes.prototype["islower"] = str_lib.islower;

Sk.builtin.bytes.prototype["isspace"] = str_lib.isspace;

Sk.builtin.bytes.prototype["istitle"] = str_lib.istitle;

Sk.builtin.bytes.prototype["isupper"] = str_lib.isupper;

Sk.builtin.bytes.prototype["lower"] = str_lib.lower;

Sk.builtin.bytes.prototype["splitlines"] = new Sk.builtin.func(function (self, keepends) {
    Sk.builtin.pyCheckArgsLen("splitlines", arguments.length, 1, 2);

    if ((keepends !== undefined) && !Sk.builtin.checkBool(keepends)) {
        throw new Sk.builtin.TypeError("boolean argument expected, got " + Sk.abstr.typeName(keepends));
    }
    if (keepends === undefined) {
        keepends = false;
    } else {
        keepends = keepends.v;
    }

    let final = [];
    let sol = 0;
    let eol;
    let i = 0;

    while (i < self.v.byteLength) {
        const val = self.v[i];

        if (val === 13) {  // \r
            let rn = false;
            if ((i < self.v.byteLength - 1) && (self.v[i + 1] === 10)) {
                rn = true;
            }

            if (keepends) {
                eol = rn ? i + 2 : i + 1;
            } else {
                eol = i;
            }

            final.push(new Sk.builtin.bytes(self.v.subarray(sol, eol)));

            sol = rn ? i + 2 : i + 1;
            i = sol;
        } else if (val === 10) {  // \n
            if (keepends) {
                eol = i + 1;
            } else {
                eol = i;
            }

            final.push(new Sk.builtin.bytes(self.v.subarray(sol, eol)));

            sol = i + 1;
            i = sol;
        } else {
            i++;
        }
    }

    if (sol < self.v.byteLength) {
        final.push(new Sk.builtin.bytes(self.v.subarray(sol, self.v.byteLength)));
    }

    return new Sk.builtin.list(final);
});

Sk.builtin.bytes.prototype["swapcase"] = str_lib.swapcase;

Sk.builtin.bytes.prototype["title"] = str_lib.title;

Sk.builtin.bytes.prototype["upper"] = str_lib.upper;

Sk.builtin.bytes.prototype["zfill"] = str_lib.zfill;

Sk.builtin.bytes.prototype["__iter__"] = new Sk.builtin.func(function (self) {
    Sk.builtin.pyCheckArgsLen("__iter__", arguments.length, 0, 0, true, false);
    return new Sk.builtin.bytes_iter_(self);
});

Sk.builtin.bytes.prototype.tp$iter = function () {
    return new Sk.builtin.bytes_iter_(this);
};

/**
 * @constructor
 * @param {Object} bts
 */
Sk.builtin.bytes_iter_ = function (bts) {
    if (!(this instanceof Sk.builtin.bytes_iter_)) {
        return new Sk.builtin.bytes_iter_(bts);
    }
    this.$index = 0;
    this.sq$length = bts.v.byteLength;
    this.tp$iter = () => this;
    this.tp$iternext = function () {
        if (this.$index >= this.sq$length) {
            return undefined;
        }
        return new Sk.builtin.int_(bts.v[this.$index++]);
    };
    this.$r = function () {
        return new Sk.builtin.str("bytesiterator");
    };
    return this;
};

Sk.abstr.setUpInheritance("bytesiterator", Sk.builtin.bytes_iter_, Sk.builtin.object);

Sk.builtin.bytes_iter_.prototype.__class__ = Sk.builtin.bytes_iter_;

Sk.builtin.bytes_iter_.prototype.__iter__ = new Sk.builtin.func(function (self) {
    return self;
});

Sk.builtin.bytes_iter_.prototype.next$ = function (self) {
    var ret = self.tp$iternext();
    if (ret === undefined) {
        throw new Sk.builtin.StopIteration();
    }
    return ret;
};

Sk.exportSymbol("Sk.builtin.bytes", Sk.builtin.bytes);
