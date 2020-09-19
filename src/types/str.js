import {
    asserts,
    buildNativeClass,
    buildIteratorClass,
    pyObject,
    pyList,
    pyBool,
    pyDict,
    pyMappingProxy,
    pyTuple,
    genericGetAttr,
    genericIterLengthHintWithArrayMethodDef,
    pyExc,
    pyInt,
    pyFloat,
    pyLong,
    pyNone,
    pySlice,
    pyNotImplemented,
    pyMethodDescr,
    typeName,
    pyBytes,
    keywordArrayToNamedArgs,
    objectGetIter,
    objectIsTrue,
    objectRepr,
    chainOrSuspend,
    iterForOrSuspend,
    checkIndex,
    checkInt,
    checkFloat,
    checkNone,
    checkBytes,
    asIndexSized,
    format,
    formatString,
} from "../internal";

var interned = Object.create(null); // avoid name conflicts with Object.prototype

function getInterned(x) {
    return interned[x];
}

function setInterned(x, pyStr) {
    interned[x] = pyStr;
}

/**
 * @constructor
 * @param {*} x
 * @extends pyObject
 */
export var pyStr = buildNativeClass("str", {
    constructor: function str(x) {
        // new pyStr is an internal function called with a JS value x
        // occasionally called with a python object and returns tp$str() or $r();
        if (!(this instanceof pyStr)) {
            throw new TypeError("bad call to str - use 'new'");
        }
        let ret;
        if (typeof x === "string") {
            ret = x;
        } else if (x === undefined) {
            ret = "";
        } else if (x === null) {
            ret = "None";
        } else if (x.tp$str !== undefined) {
            // then we're a python object - all objects inherit from object which has tp$str
            return x.tp$str();
        } else if (typeof x === "number") {
            ret = Number.isFinite(x) ? String(x) : String(x).replace("Infinity", "inf").replace("NaN", "nan");
        } else {
            throw new pyExc.TypeError("could not convert object of type '" + typeName(x) + "' to str");
        }

        const interned = getInterned(ret);
        // interning required for strings in py
        if (interned !== undefined) {
            return interned;
        } else {
            setInterned(ret, this);
        }

        this.$mangled = fixReserved(ret);
        // used by dict key hash function $savedKeyHash
        this.$savedKeyHash_ = undefined;
        this.v = ret;
    },
    slots: /**@lends {pyStr.prototype} */ {
        tp$getattr: genericGetAttr,
        tp$as_sequence_or_mapping: true,
        tp$doc:
            "str(object='') -> str\nstr(bytes_or_buffer[, encoding[, errors]]) -> str\n\nCreate a new string object from the given object. If encoding or\nerrors is specified, then the object must expose a data buffer\nthat will be decoded using the given encoding and error handler.\nOtherwise, returns the result of object.__str__() (if defined)\nor repr(object).\nencoding defaults to sys.getdefaultencoding().\nerrors defaults to 'strict'.",
        tp$new: function (args, kwargs) {
            kwargs = kwargs || [];
            if (this !== pyStr.prototype) {
                return this.$subtype_new(args, kwargs);
            }
            if (args.length <= 1 && !kwargs.length) {
                return new pyStr(args[0]);
            } else if (!Sk.__future__.python3) {
                throw new pyExc.TypeError("str takes at most one argument (" + (args.length + kwargs.length) + " given)");
            } else {
                const [x, encoding, errors] = keywordArrayToNamedArgs("str", ["object", "encoding", "errors"], args, kwargs);
                if (x === undefined || (encoding === undefined && errors === undefined)) {
                    return new pyStr(x);
                }
                // check the types of encoding and errors
                pyBytes.check$encodeArgs("str", encoding, errors);
                if (!checkBytes(x)) {
                    throw new pyExc.TypeError("decoding to str: need a bytes-like object, " + typeName(x) + " found");
                }
                return pyBytes.$decode.call(x, encoding, errors);
            }
        },
        $r: function () {
            // single is preferred
            let quote = "'";
            if (this.v.indexOf("'") !== -1 && this.v.indexOf('"') === -1) {
                quote = '"';
            }
            //jshint ignore:end
            const len = this.v.length;
            let c,
                cc,
                ret = quote;
            for (let i = 0; i < len; i++) {
                c = this.v.charAt(i);
                cc = this.v.charCodeAt(i);
                if (c === quote || c === "\\") {
                    ret += "\\" + c;
                } else if (c === "\t") {
                    ret += "\\t";
                } else if (c === "\n") {
                    ret += "\\n";
                } else if (c === "\r") {
                    ret += "\\r";
                } else if (((cc > 0xff && cc < 0xd800) || cc >= 0xe000) && !Sk.__future__.python3) {
                    // BMP
                    ret += "\\u" + ("000" + cc.toString(16)).slice(-4);
                } else if (cc >= 0xd800 && !Sk.__future__.python3) {
                    // Surrogate pair stuff
                    let val = this.v.codePointAt(i);
                    i++;

                    val = val.toString(16);
                    let s = "0000000" + val.toString(16);
                    if (val.length > 4) {
                        ret += "\\U" + s.slice(-8);
                    } else {
                        ret += "\\u" + s.slice(-4);
                    }
                } else if (cc > 0xff && !Sk.__future__.python3) {
                    // Invalid!
                    ret += "\\ufffd";
                } else if (c < " " || (cc >= 0x7f && !Sk.__future__.python3)) {
                    let ashex = c.charCodeAt(0).toString(16);
                    if (ashex.length < 2) {
                        ashex = "0" + ashex;
                    }
                    ret += "\\x" + ashex;
                } else {
                    ret += c;
                }
            }
            ret += quote;
            return new pyStr(ret);
        },
        tp$str: function () {
            if (this.constructor === pyStr) {
                return this;
            } else {
                return new pyStr(this.v);
            }
        },
        tp$iter: function () {
            return new str_iter_(this);
        },
        tp$richcompare: function (other, op) {
            if (!(other instanceof pyStr)) {
                return pyNotImplemented;
            }
            switch (op) {
                case "Lt":
                    return this.v < other.v;
                case "LtE":
                    return this.v <= other.v;
                case "Eq":
                    return this.v === other.v;
                case "NotEq":
                    return this.v !== other.v;
                case "Gt":
                    return this.v > other.v;
                case "GtE":
                    return this.v >= other.v;
            }
        },
        mp$subscript: function (index) {
            let len;
            if (checkIndex(index)) {
                index = asIndexSized(index, pyExc.OverflowError);
                len = this.sq$length();
                if (index < 0) {
                    index = index + len;
                }
                if (index < 0 || index >= len) {
                    throw new pyExc.IndexError("string index out of range");
                }
                if (this.codepoints) {
                    return new pyStr(this.v.substring(this.codepoints[index], this.codepoints[index + 1]));
                } else {
                    return new pyStr(this.v.charAt(index));
                }
            } else if (index instanceof pySlice) {
                let ret = "";
                len = this.sq$length();
                if (this.codepoints) {
                    index.sssiter$(len, (i) => {
                        ret += this.v.substring(this.codepoints[i], this.codepoints[i + 1]);
                    });
                } else {
                    index.sssiter$(len, (i) => {
                        ret += this.v.charAt(i);
                    });
                }
                return new pyStr(ret);
            }
            throw new pyExc.TypeError("string indices must be integers, not " + typeName(index));
        },
        sq$length: function () {
            return this.$hasAstralCodePoints() ? this.codepoints.length : this.v.length;
        },
        sq$concat: function (other) {
            if (!(other instanceof pyStr)) {
                throw new pyExc.TypeError("cannot concatenate 'str' and '" + typeName(other) + "' objects");
            }
            return new pyStr(this.v + other.v);
        },
        sq$repeat: function (n) {
            if (!checkIndex(n)) {
                throw new pyExc.TypeError("can't multiply sequence by non-int of type '" + typeName(n) + "'");
            }
            n = asIndexSized(n, pyExc.OverflowError);
            if (n * this.v.length > Number.MAX_SAFE_INTEGER) {
                throw new pyExc.OverflowError();
            }
            let ret = "";
            for (let i = 0; i < n; i++) {
                ret += this.v;
            }
            return new pyStr(ret);
        },
        sq$contains: function (ob) {
            if (!(ob instanceof pyStr)) {
                throw new pyExc.TypeError("'in <string>' requires string as left operand not " + typeName(ob));
            }
            return this.v.indexOf(ob.v) !== -1;
        },
        tp$as_number: true,
        nb$remainder: strBytesRemainder,
    },
    proto: /**@lends {pyStr.prototype} */ {
        $subtype_new: function (args, kwargs) {
            const instance = new this.constructor();
            // we call str new method with all the args and kwargs
            const str_instance = pyStr.prototype.tp$new(args, kwargs);
            instance.v = str_instance.v;
            return instance;
        },
        $jsstr: function () {
            return this.v;
        },
        $hasAstralCodePoints: function () {
            // If a string has astral code points, we have to work out where they are before
            // we can do things like slicing, computing length, etc. We work this out when we need to.
            if (this.codepoints === null) {
                return false;
            } else if (this.codepoints !== undefined) {
                return true;
            }
            // Does this string contain astral code points? If so, we have to do things the slow way.
            for (let i = 0; i < this.v.length; i++) {
                let cc = this.v.charCodeAt(i);
                if (cc >= 0xd800 && cc < 0xe000) {
                    // Yep, it's a surrogate pair. Mark off the
                    // indices of all the code points for O(1) seeking later
                    this.codepoints = [];
                    for (let j = 0; j < this.v.length; j++) {
                        this.codepoints.push(j);
                        cc = this.v.charCodeAt(j);
                        if (cc >= 0xd800 && cc < 0xdc00) {
                            j++; // High surrogate. Skip next char
                        }
                    }
                    return true;
                }
            }
            this.codepoints = null;
            return false;
        },
        sk$asarray: function () {
            const ret = [];
            if (this.$hasAstralCodePoints()) {
                const codepoints = this.codepoints;
                for (let i = 0; i < codepoints.length; i++) {
                    ret.push(new pyStr(this.v.substring(codepoints[i], codepoints[i + 1])));
                }
            } else {
                for (let i = 0; i < this.v.length; i++) {
                    ret.push(new pyStr(this.v[i]));
                }
            }
            return ret;
        },
        find$left: mkFind(false),
        find$right: mkFind(true),
        get$tgt: function (tgt) {
            if (tgt instanceof pyStr) {
                return tgt.v;
            }
            throw new pyExc.TypeError("a str instance is required not '" + typeName(tgt) + "'");
        },
        toString: function () {
            return this.v;
        },
        valueOf: function () {
            return this.v;
        },
    },
    methods: /**@lends {pyStr.prototype} */ {
        encode: {
            $meth: function encode(encoding, errors) {
                ({ encoding, errors } = pyBytes.check$encodeArgs("encode", encoding, errors));
                const bytes = pyBytes.str$encode(this, encoding, errors);
                return Sk.__future__.python3 ? bytes : new pyStr(bytes.$jsstr());
            },
            $flags: { NamedArgs: ["encoding", "errors"] },
            $textsig: "($self, /, encoding='utf-8', errors='strict')",
            $doc:
                "Encode the string using the codec registered for encoding.\n\n  encoding\n    The encoding in which to encode the string.\n  errors\n    The error handling scheme to use for encoding errors.\n    The default is 'strict' meaning that encoding errors raise a\n    UnicodeEncodeError.  Other possible values are 'ignore', 'replace' and\n    'xmlcharrefreplace' as well as any other name registered with\n    codecs.register_error that can handle UnicodeEncodeErrors.",
        },
        replace: {
            $meth: function (oldS, newS, count) {
                oldS = this.get$tgt(oldS);
                newS = this.get$tgt(newS);
                count = count === undefined ? -1 : asIndexSized(count, pyExc.OverflowError);
                const patt = new RegExp(re_escape_(oldS), "g");
                if (count < 0) {
                    return new pyStr(this.v.replace(patt, newS));
                }
                let c = 0;
                const ret = this.v.replace(patt, (match) => (c++ < count ? newS : match));
                return new pyStr(ret);
            },
            $flags: { MinArgs: 2, MaxArgs: 3 },
            $textsig: "($self, old, new, count=-1, /)",
            $doc:
                "Return a copy with all occurrences of substring old replaced by new.\n\n  count\n    Maximum number of occurrences to replace.\n    -1 (the default value) means replace all occurrences.\n\nIf the optional argument count is given, only the first count occurrences are\nreplaced.",
        },
        split: {
            $meth: function split(sep, maxsplit) {
                maxsplit = asIndexSized(maxsplit, pyExc.OverflowError);
                const codepoints = splitPoints(this, sep, maxsplit);
                const ret = [];
                for (let i = 0; i < codepoints.length; i++) {
                    ret.push(new pyStr(this.v.substring(codepoints[i], codepoints[++i])));
                }
                return new pyList(ret);
            },
            $flags: { NamedArgs: ["sep", "maxsplit"], Defaults: [pyNone, -1] },
            $textsig: "($self, /, sep=None, maxsplit=-1)",
            $doc:
                "Return a list of the words in the string, using sep as the delimiter string.\n\n  sep\n    The delimiter according which to split the string.\n    None (the default value) means split according to any whitespace,\n    and discard empty strings from the result.\n  maxsplit\n    Maximum number of splits to do.\n    -1 (the default value) means no limit.",
        },
        rsplit: {
            $meth: function rsplit(sep, maxsplit) {
                // do a full split and then slice the string accordingly;
                maxsplit = asIndexSized(maxsplit, pyExc.OverflowError);
                const codepoints = splitPoints(this, sep, -1);
                let from = maxsplit < 0 ? 0 : (codepoints.length / 2 - maxsplit) * 2;
                const ret = [];
                if (from <= 0) {
                    from = 0;
                } else {
                    ret.push(new pyStr(this.v.slice(0, codepoints[from - 1])));
                }
                for (let i = from; i < codepoints.length; i++) {
                    ret.push(new pyStr(this.v.substring(codepoints[i], codepoints[++i])));
                }
                return new pyList(ret);
            },
            $flags: { NamedArgs: ["sep", "maxsplit"], Defaults: [pyNone, -1] },
            $textsig: "($self, /, sep=None, maxsplit=-1)",
            $doc:
                "Return a list of the words in the string, using sep as the delimiter string.\n\n  sep\n    The delimiter according which to split the string.\n    None (the default value) means split according to any whitespace,\n    and discard empty strings from the result.\n  maxsplit\n    Maximum number of splits to do.\n    -1 (the default value) means no limit.\n\nSplits are done starting at the end of the string and working to the front.",
        },
        join: {
            $meth: function (seq) {
                const arrOfStrs = [];
                return chainOrSuspend(
                    iterForOrSuspend(objectGetIter(seq), (i) => {
                        if (!(i instanceof pyStr)) {
                            throw new pyExc.TypeError("sequence item " + arrOfStrs.length + ": expected str, " + typeName(i) + " found");
                        }
                        arrOfStrs.push(i.v);
                    }),
                    () => new pyStr(arrOfStrs.join(this.v))
                );
            },
            $flags: { OneArg: true },
            $textsig: "($self, iterable, /)",
            $doc:
                "Concatenate any number of strings.\n\nThe string whose method is called is inserted in between each given string.\nThe result is returned as a new string.\n\nExample: '.'.join(['ab', 'pq', 'rs']) -> 'ab.pq.rs'",
        },
        capitalize: {
            $meth: function capitalize() {
                return new pyStr(this.v.charAt(0).toUpperCase() + this.v.slice(1).toLowerCase());
            },
            $flags: { NoArgs: true },
            $textsig: "($self, /)",
            $doc:
                "Return a capitalized version of the string.\n\nMore specifically, make the first character have upper case and the rest lower\ncase.",
        },
        // casefold: {
        //     $meth: methods.casefold,
        //     $flags: { NoArgs: true },
        //     $textsig: "($self, /)",
        //     $doc: "Return a version of the string suitable for caseless comparisons.",
        // },
        title: {
            $meth: function title() {
                const ret = this.v.replace(/[a-z][a-z]*/gi, (str) => str[0].toUpperCase() + str.substr(1).toLowerCase());
                return new pyStr(ret);
            },
            $flags: { NoArgs: true },
            $textsig: "($self, /)",
            $doc:
                "Return a version of the string where each word is titlecased.\n\nMore specifically, words start with uppercased characters and all remaining\ncased characters have lower case.",
        },
        center: {
            $meth: mkJust(false, true),
            $flags: { MinArgs: 1, MaxArgs: 2 },
            $textsig: "($self, width, fillchar=' ', /)",
            $doc: "Return a centered string of length width.\n\nPadding is done using the specified fill character (default is a space).",
        },
        count: {
            $meth: function count(pat, start, end) {
                pat = this.get$tgt(pat);
                ({ start, end } = indices(this, start, end));
                if (end < start) {
                    return new pyInt(0);
                }
                const normaltext = pat.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
                const m = new RegExp(normaltext, "g");
                const slice = this.v.slice(start, end);
                const ctl = slice.match(m);
                if (!ctl) {
                    return new pyInt(0);
                } else {
                    return new pyInt(ctl.length);
                }
            },
            $flags: { MinArgs: 1, MaxArgs: 3 },
            $textsig: null,
            $doc:
                "S.count(sub[, start[, end]]) -> int\n\nReturn the number of non-overlapping occurrences of substring sub in\nstring S[start:end].  Optional arguments start and end are\ninterpreted as in slice notation.",
        },
        expandtabs: {
            $meth: function expandtabs(tabsize) {
                if (checkInt(tabsize)) {
                    tabsize = Number(tabsize);
                } else {
                    throw new pyExc.TypeError("an integer is required, got type" + typeName(tabsize));
                }
                const spaces = new Array(tabsize + 1).join(" ");
                const expanded = this.v.replace(/([^\r\n\t]*)\t/g, (a, b) => b + spaces.slice(b.length % tabsize));
                return new pyStr(expanded);
            },
            $flags: { NamedArgs: ["tabsize"], Defaults: [8] },
            $textsig: "($self, /, tabsize=8)",
            $doc:
                "Return a copy where all tab characters are expanded using spaces.\n\nIf tabsize is not given, a tab size of 8 characters is assumed.",
        },
        find: {
            $meth: function find(tgt, start, end) {
                return new pyInt(this.find$left(tgt, start, end));
            },
            $flags: { MinArgs: 1, MaxArgs: 3 },
            $textsig: null,
            $doc:
                "S.find(sub[, start[, end]]) -> int\n\nReturn the lowest index in S where substring sub is found,\nsuch that sub is contained within S[start:end].  Optional\narguments start and end are interpreted as in slice notation.\n\nReturn -1 on failure.",
        },
        partition: {
            $meth: mkPartition(false),
            $flags: { OneArg: true },
            $textsig: "($self, sep, /)",
            $doc:
                "Partition the string into three parts using the given separator.\n\nThis will search for the separator in the string.  If the separator is found,\nreturns a 3-tuple containing the part before the separator, the separator\nitself, and the part after it.\n\nIf the separator is not found, returns a 3-tuple containing the original string\nand two empty strings.",
        },
        index: {
            $meth: function index(tgt, start, end) {
                const val = this.find$left(tgt, start, end);
                if (val === -1) {
                    throw new pyExc.ValueError("substring not found");
                } else {
                    return new pyInt(val);
                }
            },
            $flags: { MinArgs: 1, MaxArgs: 3 },
            $textsig: null,
            $doc:
                "S.index(sub[, start[, end]]) -> int\n\nReturn the lowest index in S where substring sub is found, \nsuch that sub is contained within S[start:end].  Optional\narguments start and end are interpreted as in slice notation.\n\nRaises ValueError when the substring is not found.",
        },
        ljust: {
            $meth: mkJust(false, false),
            $flags: { MinArgs: 1, MaxArgs: 2 },
            $textsig: "($self, width, fillchar=' ', /)",
            $doc: "Return a left-justified string of length width.\n\nPadding is done using the specified fill character (default is a space).",
        },
        lower: {
            $meth: function () {
                return new pyStr(this.v.toLowerCase());
            },
            $flags: { NoArgs: true },
            $textsig: "($self, /)",
            $doc: "Return a copy of the string converted to lowercase.",
        },
        lstrip: {
            $meth: mkStrip(/^\s+/g, (regex) => "^[" + regex + "]+"),
            $flags: { MinArgs: 0, MaxArgs: 1 },
            $textsig: "($self, chars=None, /)",
            $doc:
                "Return a copy of the string with leading whitespace removed.\n\nIf chars is given and not None, remove characters in chars instead.",
        },
        rfind: {
            $meth: function (tgt, start, end) {
                return new pyInt(this.find$right(tgt, start, end));
            },
            $flags: { MinArgs: 1, MaxArgs: 3 },
            $textsig: null,
            $doc:
                "S.rfind(sub[, start[, end]]) -> int\n\nReturn the highest index in S where substring sub is found,\nsuch that sub is contained within S[start:end].  Optional\narguments start and end are interpreted as in slice notation.\n\nReturn -1 on failure.",
        },
        rindex: {
            $meth: function rindex(tgt, start, end) {
                const val = this.find$right(tgt, start, end);
                if (val === -1) {
                    throw new pyExc.ValueError("substring not found");
                } else {
                    return new pyInt(val);
                }
            },
            $flags: { MinArgs: 1, MaxArgs: 3 },
            $textsig: null,
            $doc:
                "S.rindex(sub[, start[, end]]) -> int\n\nReturn the highest index in S where substring sub is found,\nsuch that sub is contained within S[start:end].  Optional\narguments start and end are interpreted as in slice notation.\n\nRaises ValueError when the substring is not found.",
        },
        rjust: {
            $meth: mkJust(true, false),
            $flags: { MinArgs: 1, MaxArgs: 2 },
            $textsig: "($self, width, fillchar=' ', /)",
            $doc: "Return a right-justified string of length width.\n\nPadding is done using the specified fill character (default is a space).",
        },
        rstrip: {
            $meth: mkStrip(/\s+$/g, (regex) => "[" + regex + "]+$"),
            $flags: { MinArgs: 0, MaxArgs: 1 },
            $textsig: "($self, chars=None, /)",
            $doc:
                "Return a copy of the string with trailing whitespace removed.\n\nIf chars is given and not None, remove characters in chars instead.",
        },
        rpartition: {
            $meth: mkPartition(true),
            $flags: { OneArg: true },
            $textsig: "($self, sep, /)",
            $doc:
                "Partition the string into three parts using the given separator.\n\nThis will search for the separator in the string, starting at the end. If\nthe separator is found, returns a 3-tuple containing the part before the\nseparator, the separator itself, and the part after it.\n\nIf the separator is not found, returns a 3-tuple containing two empty strings\nand the original string.",
        },
        splitlines: {
            $meth: function splitlines(keepends) {
                keepends = objectIsTrue(keepends);
                const data = this.v;
                const final = [];
                const len = data.length;
                let slice,
                    ch,
                    eol,
                    sol = 0;
                for (let i = 0; i < len; i++) {
                    ch = data.charAt(i);
                    if (data.charAt(i + 1) === "\n" && ch === "\r") {
                        eol = i + 2;
                        slice = data.slice(sol, eol);
                        if (!keepends) {
                            slice = slice.replace(/(\r|\n)/g, "");
                        }
                        final.push(new pyStr(slice));
                        sol = eol;
                    } else if ((ch === "\n" && data.charAt(i - 1) !== "\r") || ch === "\r") {
                        eol = i + 1;
                        slice = data.slice(sol, eol);
                        if (!keepends) {
                            slice = slice.replace(/(\r|\n)/g, "");
                        }
                        final.push(new pyStr(slice));
                        sol = eol;
                    }
                }
                if (sol < len) {
                    eol = len;
                    slice = data.slice(sol, eol);
                    if (!keepends) {
                        slice = slice.replace(/(\r|\n)/g, "");
                    }
                    final.push(new pyStr(slice));
                }
                return new pyList(final);
            },
            $flags: { NamedArgs: ["keepends"], Defaults: [false] },
            $textsig: "($self, /, keepends=False)",
            $doc:
                "Return a list of the lines in the string, breaking at line boundaries.\n\nLine breaks are not included in the resulting list unless keepends is given and\ntrue.",
        },
        strip: {
            $meth: mkStrip(/^\s+|\s+$/g, (regex) => "^[" + regex + "]+|[" + regex + "]+$"),
            $flags: { MinArgs: 0, MaxArgs: 1 },
            $textsig: "($self, chars=None, /)",
            $doc:
                "Return a copy of the string with leading and trailing whitespace remove.\n\nIf chars is given and not None, remove characters in chars instead.",
        },
        swapcase: {
            $meth: function () {
                const ret = this.v.replace(/[a-z]/gi, (c) => {
                    const lc = c.toLowerCase();
                    return lc === c ? c.toUpperCase() : lc;
                });
                return new pyStr(ret);
            },
            $flags: { NoArgs: true },
            $textsig: "($self, /)",
            $doc: "Convert uppercase characters to lowercase and lowercase characters to uppercase.",
        },
        // translate: {
        //     $meth: methods.translate,
        //     $flags: {},
        //     $textsig: "($self, table, /)",
        //     $doc:
        //         "Replace each character in the string using the given translation table.\n\n  table\n    Translation table, which must be a mapping of Unicode ordinals to\n    Unicode ordinals, strings, or None.\n\nThe table must implement lookup/indexing via __getitem__, for instance a\ndictionary or list.  If this operation raises LookupError, the character is\nleft untouched.  Characters mapped to None are deleted.",
        // },
        upper: {
            $meth: function () {
                return new pyStr(this.v.toUpperCase());
            },
            $flags: { NoArgs: true },
            $textsig: "($self, /)",
            $doc: "Return a copy of the string converted to uppercase.",
        },
        startswith: {
            $meth: mkStartsEndswith("startswith", (substr, i) => substr.indexOf(i) === 0),
            $flags: { MinArgs: 1, MaxArgs: 3 },
            $textsig: null,
            $doc:
                "S.startswith(prefix[, start[, end]]) -> bool\n\nReturn True if S starts with the specified prefix, False otherwise.\nWith optional start, test S beginning at that position.\nWith optional end, stop comparing S at that position.\nprefix can also be a tuple of strings to try.",
        },
        endswith: {
            $meth: mkStartsEndswith("endswith", (substr, i) => substr.indexOf(i, substr.length - i.length) !== -1),
            $flags: { MinArgs: 1, MaxArgs: 3 },
            $textsig: null,
            $doc:
                "S.endswith(suffix[, start[, end]]) -> bool\n\nReturn True if S ends with the specified suffix, False otherwise.\nWith optional start, test S beginning at that position.\nWith optional end, stop comparing S at that position.\nsuffix can also be a tuple of strings to try.",
        },
        isascii: {
            $meth: function () {
                return new pyBool(/^[\x00-\x7F]*$/.test(this.v));
            },
            $flags: { NoArgs: true },
            $textsig: "($self, /)",
            $doc:
                "Return True if all characters in the string are ASCII, False otherwise.\n\nASCII characters have code points in the range U+0000-U+007F.\nEmpty string is ASCII too.",
        },
        islower: {
            $meth: function islower() {
                return new pyBool(this.v.length && /[a-z]/.test(this.v) && !/[A-Z]/.test(this.v));
            },
            $flags: { NoArgs: true },
            $textsig: "($self, /)",
            $doc:
                "Return True if the string is a lowercase string, False otherwise.\n\nA string is lowercase if all cased characters in the string are lowercase and\nthere is at least one cased character in the string.",
        },
        isupper: {
            $meth: function islower() {
                return new pyBool(this.v.length && !/[a-z]/.test(this.v) && /[A-Z]/.test(this.v));
            },
            $flags: { NoArgs: true },
            $textsig: "($self, /)",
            $doc:
                "Return True if the string is an uppercase string, False otherwise.\n\nA string is uppercase if all cased characters in the string are uppercase and\nthere is at least one cased character in the string.",
        },
        istitle: {
            $meth: function istitle() {
                // Comparing to str.title() seems the most intuitive thing, but it fails on "",
                // Other empty-ish strings with no change.
                const input = this.v;
                let cased = false;
                let previous_is_cased = false;
                let ch;
                for (let pos = 0; pos < input.length; pos++) {
                    ch = input.charAt(pos);
                    if (!/[a-z]/.test(ch) && /[A-Z]/.test(ch)) {
                        if (previous_is_cased) {
                            return pyBool.false$;
                        }
                        previous_is_cased = true;
                        cased = true;
                    } else if (/[a-z]/.test(ch) && !/[A-Z]/.test(ch)) {
                        if (!previous_is_cased) {
                            return pyBool.false$;
                        }
                        cased = true;
                    } else {
                        previous_is_cased = false;
                    }
                }
                return new pyBool(cased);
            },
            $flags: { NoArgs: true },
            $textsig: "($self, /)",
            $doc:
                "Return True if the string is a title-cased string, False otherwise.\n\nIn a title-cased string, upper- and title-case characters may only\nfollow uncased characters and lowercase characters only cased ones.",
        },
        isspace: {
            $meth: function isspace() {
                return new pyBool(/^\s+$/.test(this.v));
            },
            $flags: { NoArgs: true },
            $textsig: "($self, /)",
            $doc:
                "Return True if the string is a whitespace string, False otherwise.\n\nA string is whitespace if all characters in the string are whitespace and there\nis at least one character in the string.",
        },
        // isdecimal: {
        //     $meth: methods.isdecimal,
        //     $flags: { NoArgs: true },
        //     $textsig: "($self, /)",
        //     $doc:
        //         "Return True if the string is a decimal string, False otherwise.\n\nA string is a decimal string if all characters in the string are decimal and\nthere is at least one character in the string.",
        // },
        isdigit: {
            $meth: function isdigit() {
                return new pyBool(/^\d+$/.test(this.v));
            },
            $flags: { NoArgs: true },
            $textsig: "($self, /)",
            $doc:
                "Return True if the string is a digit string, False otherwise.\n\nA string is a digit string if all characters in the string are digits and there\nis at least one character in the string.",
        },
        isnumeric: {
            $meth: function isnumeric() {
                return new pyBool(this.v.length && !/[^0-9]/.test(this.v));
            },
            $flags: { NoArgs: true },
            $textsig: "($self, /)",
            $doc:
                "Return True if the string is a numeric string, False otherwise.\n\nA string is numeric if all characters in the string are numeric and there is at\nleast one character in the string.",
        },
        isalpha: {
            $meth: function isalpha() {
                return new pyBool(this.v.length && !/[^a-zA-Z]/.test(this.v));
            },
            $flags: { NoArgs: true },
            $textsig: "($self, /)",
            $doc:
                "Return True if the string is an alphabetic string, False otherwise.\n\nA string is alphabetic if all characters in the string are alphabetic and there\nis at least one character in the string.",
        },
        isalnum: {
            $meth: function isalnum() {
                return new pyBool(this.v.length && !/[^a-zA-Z0-9]/.test(this.v));
            },
            $flags: { NoArgs: true },
            $textsig: "($self, /)",
            $doc:
                "Return True if the string is an alpha-numeric string, False otherwise.\n\nA string is alpha-numeric if all characters in the string are alpha-numeric and\nthere is at least one character in the string.",
        },
        // isidentifier: {
        //     $meth: methods.isidentifier,
        //     $flags: {},
        //     $textsig: "($self, /)",
        //     $doc:
        //         'Return True if the string is a valid Python identifier, False otherwise.\n\nUse keyword.iskeyword() to test for reserved identifiers such as "def" and\n"class".',
        // },
        // isprintable: {
        //     $meth: methods.isprintable,
        //     $flags: {},
        //     $textsig: "($self, /)",
        //     $doc:
        //         "Return True if the string is printable, False otherwise.\n\nA string is printable if all of its characters are considered printable in\nrepr() or if it is empty.",
        // },
        zfill: {
            $meth: function zfill(len) {
                len = asIndexSized(len, pyExc.OverflowError);
                let pad = "";
                // figure out how many zeroes are needed to make the proper length
                const zeroes = len - this.v.length; // techinally this should sq$length ?
                // offset by 1 if there is a +/- at the beginning of the string
                const offset = this.v[0] === "+" || this.v[0] === "-" ? 1 : 0;
                for (let i = 0; i < zeroes; i++) {
                    pad += "0";
                }
                // combine the string and the zeroes
                return new pyStr(this.v.substr(0, offset) + pad + this.v.substr(offset));
            },
            $flags: { OneArg: true },
            $textsig: "($self, width, /)",
            $doc: "Pad a numeric string with zeros on the left, to fill a field of the given width.\n\nThe string is never truncated.",
        },
        format: {
            $meth: format,
            $flags: { FastCall: true },
            $textsig: null,
            $doc:
                "S.format(*args, **kwargs) -> str\n\nReturn a formatted version of S, using substitutions from args and kwargs.\nThe substitutions are identified by braces ('{' and '}').",
        },
        // format_map: {
        //     $meth: methods.format_map,
        //     $flags: {},
        //     $textsig: null,
        //     $doc:
        //         "S.format_map(mapping) -> str\n\nReturn a formatted version of S, using substitutions from mapping.\nThe substitutions are identified by braces ('{' and '}').",
        // },
        __format__: {
            $meth: formatString,
            $flags: { OneArg: true },
            $textsig: "($self, format_spec, /)",
            $doc: "Return a formatted version of the string as described by format_spec.",
        },
        // __sizeof__: {
        //     $meth: methods.__sizeof__,
        //     $flags: {},
        //     $textsig: "($self, /)",
        //     $doc: "Return the size of the string in memory, in bytes.",
        // },
        __getnewargs__: {
            $meth: function () {
                return new pyTuple(new pyStr(this.v));
            },
            $flags: { NoArgs: true },
            $textsig: null,
            $doc: null,
        },
    },
});

var re = /^[A-Za-z0-9]+$/;
function re_escape_(s) {
    let c;
    const ret = [];
    for (let i = 0; i < s.length; i++) {
        c = s.charAt(i);
        if (re.test(c)) {
            ret.push(c);
        } else {
            if (c === "\\000") {
                ret.push("\\000");
            } else {
                ret.push("\\" + c);
            }
        }
    }
    return ret.join("");
}

// methods
var special_chars = /([.*+?=|\\\/()\[\]\{\}^$])/g;
var leading_whitespace = /^[\s\xa0]+/;

function splitPoints(self, sep, maxsplit) {
    sep = checkNone(sep) ? null : self.get$tgt(sep);
    if (sep !== null && !sep.length) {
        throw new pyExc.ValueError("empty separator");
    }
    let jsstr = self.v;
    let offset = 0;
    let regex;
    if (sep === null) {
        // Remove leading whitespace
        regex = /[\s\xa0]+/g;
        const len = jsstr.length;
        jsstr = jsstr.replace(leading_whitespace, "");
        offset = len - jsstr.length;
    } else {
        // Escape special characters in null so we can use a regexp
        const s = sep.replace(special_chars, "\\$1");
        regex = new RegExp(s, "g");
    }
    // This is almost identical to re.split,
    // except how the regexp is constructed
    const pairs = [];
    let index = 0;
    let splits = 0;
    let match;
    maxsplit = maxsplit < 0 ? Infinity : maxsplit;
    while ((match = regex.exec(jsstr)) != null && splits < maxsplit) {
        if (match.index === regex.lastIndex) {
            // empty match
            break;
        }
        pairs.push(index + offset);
        pairs.push(match.index + offset);
        index = regex.lastIndex;
        splits += 1;
    }
    if (sep !== null || jsstr.length - index) {
        pairs.push(index + offset);
        pairs.push(jsstr.length + offset);
    }
    return pairs;
}

function mkStrip(pat, regf) {
    return function strip(chars) {
        let pattern;
        if (chars === undefined || checkNone(chars)) {
            pattern = pat;
        } else if (chars instanceof pyStr) {
            const regex = re_escape_(chars.v);
            pattern = new RegExp(regf(regex), "g");
        } else {
            throw new pyExc.TypeError("strip arg must be None or str");
        }
        return new pyStr(this.v.replace(pattern, ""));
    };
}

function mkPartition(isReversed) {
    return function partition(sep) {
        const sepStr = this.get$tgt(sep);
        const jsstr = this.v;
        let pos;
        if (isReversed) {
            pos = jsstr.lastIndexOf(sepStr);
            if (pos < 0) {
                return new pyTuple([new pyStr(""), new pyStr(""), new pyStr(jsstr)]);
            }
        } else {
            pos = jsstr.indexOf(sepStr);
            if (pos < 0) {
                return new pyTuple([new pyStr(jsstr), new pyStr(""), new pyStr("")]);
            }
        }

        return new pyTuple([new pyStr(jsstr.substring(0, pos)), new pyStr(sepStr), new pyStr(jsstr.substring(pos + sepStr.length))]);
    };
}

function mkJust(isRight, isCenter) {
    return function strJustify(len, fillchar) {
        len = asIndexSized(len, pyExc.OverflowError);
        if (fillchar === undefined) {
            fillchar = " ";
        } else if (!(fillchar instanceof pyStr) || fillchar.sq$length() !== 1) {
            throw new pyExc.TypeError("the fill character must be a str of length 1");
        } else {
            fillchar = fillchar.v;
        }

        const mylen = this.sq$length();
        let newstr;
        if (mylen >= len) {
            return new pyStr(this.v);
        } else if (isCenter) {
            newstr = fillchar.repeat(Math.floor((len - mylen) / 2));
            newstr = newstr + this.v + newstr;

            if ((len - mylen) % 2) {
                newstr += fillchar;
            }

            return new pyStr(newstr);
        } else {
            newstr = fillchar.repeat(len - mylen);
            return new pyStr(isRight ? newstr + this.v : this.v + newstr);
        }
    };
}

function indices(self, start, end) {
    ({ start, end } = pySlice.$indices(self, start, end));
    if (self.$hasAstralCodePoints()) {
        const tmp = self.codepoints[start];
        start = tmp === undefined ? start + self.v.length - self.codepoints.length : tmp;
        end = self.codepoints[end];
        end = end === undefined ? self.v.length : end;
    }
    return {
        start: start,
        end: end,
    };
}

function mkFind(isReversed) {
    return function (tgt, start, end) {
        tgt = this.get$tgt(tgt);

        ({ start, end } = indices(this, start, end));
        if (end < start) {
            return -1;
        }
        // ...do the search..
        end -= tgt.length;
        let jsidx = isReversed ? this.v.lastIndexOf(tgt, end) : this.v.indexOf(tgt, start);
        jsidx = jsidx >= start && jsidx <= end ? jsidx : -1;

        let idx;
        if (this.codepoints) {
            // ...and now convert them back
            const len = this.sq$length();
            idx = -1;
            for (let i = 0; i < len; i++) {
                if (jsidx == this.codepoints[i]) {
                    idx = i;
                }
            }
        } else {
            // No astral codepoints, no conversion required
            idx = jsidx;
        }
        return idx;
    };
}

function mkStartsEndswith(funcname, is_match) {
    return function (tgt, start, end) {
        if (!(tgt instanceof pyStr) && !(tgt instanceof pyTuple)) {
            throw new pyExc.TypeError(funcname + " first arg must be str or a tuple of str, not " + typeName(tgt));
        }

        ({ start, end } = indices(this, start, end));

        if (start > end) {
            return pyBool.false$;
        }

        const substr = this.v.slice(start, end);

        if (tgt instanceof pyTuple) {
            for (let it = objectGetIter(tgt), i = it.tp$iternext(); i !== undefined; i = it.tp$iternext()) {
                if (!(i instanceof pyStr)) {
                    throw new pyExc.TypeError("tuple for " + funcname + " must only contain str, not " + typeName(i));
                }
                if (is_match(substr, i.v)) {
                    return pyBool.true$;
                }
            }
            return pyBool.false$;
        }
        return new pyBool(is_match(substr, tgt.v));
    };
}

pyStr.$py2decode = new pyMethodDescr(pyStr, {
    $name: "decode",
    $meth: function (encoding, errors) {
        const bytes = new pyBytes(this.v);
        return pyBytes.$decode.call(bytes, encoding, errors);
    },
    $flags: { NamedArgs: ["encoding", "errors"] },
});

function strBytesRemainder(rhs) {
    // % format op. rhs can be a value, a tuple, or something with __getitem__ (dict)

    // From http://docs.python.org/library/stdtypes.html#string-formatting the
    // format looks like:
    // 1. The '%' character, which marks the start of the specifier.
    // 2. Mapping key (optional), consisting of a parenthesised sequence of characters (for example, (somename)).
    // 3. Conversion flags (optional), which affect the result of some conversion types.
    // 4. Minimum field width (optional). If specified as an '*' (asterisk), the actual width is read from the next
    // element of the tuple in values, and the object to convert comes after the minimum field width and optional
    // precision. 5. Precision (optional), given as a '.' (dot) followed by the precision. If specified as '*' (an
    // asterisk), the actual width is read from the next element of the tuple in values, and the value to convert comes
    // after the precision. 6. Length modifier (optional). 7. Conversion type.  length modifier is ignored

    var ret;
    var replFunc;
    var index;
    var regex;
    var val;

    if (rhs.constructor !== pyTuple && !(rhs instanceof pyDict || rhs instanceof pyMappingProxy)) {
        rhs = new pyTuple([rhs]);
    }
    // general approach is to use a regex that matches the format above, and
    // do an re.sub with a function as replacement to make the subs.

    //           1 2222222222222222   33333333   444444444   5555555555555  66666  777777777777777777
    regex = /%(\([a-zA-Z0-9]+\))?([#0 +\-]+)?(\*|[0-9]+)?(\.(\*|[0-9]+))?[hlL]?([diouxXeEfFgGcrs%])/g;
    index = 0;
    replFunc = function (substring, mappingKey, conversionFlags, fieldWidth, precision, precbody, conversionType) {
        var result;
        var convName;
        var convValue;
        var base;
        var r;
        var mk;
        var value;
        var handleWidth;
        var formatNumber;
        var alternateForm;
        var precedeWithSign;
        var blankBeforePositive;
        var leftAdjust;
        var zeroPad;
        var i;

        fieldWidth = Number(fieldWidth);
        precision = Number(precision);

        if ((mappingKey === undefined || mappingKey === "") && conversionType != "%") {
            i = index++;
        } // ff passes '' not undef for some reason

        if (precision === "") {
            // ff passes '' here aswell causing problems with G,g, etc.
            precision = undefined;
        }

        zeroPad = false;
        leftAdjust = false;
        blankBeforePositive = false;
        precedeWithSign = false;
        alternateForm = false;
        if (conversionFlags) {
            if (conversionFlags.indexOf("-") !== -1) {
                leftAdjust = true;
            } else if (conversionFlags.indexOf("0") !== -1) {
                zeroPad = true;
            }

            if (conversionFlags.indexOf("+") !== -1) {
                precedeWithSign = true;
            } else if (conversionFlags.indexOf(" ") !== -1) {
                blankBeforePositive = true;
            }

            alternateForm = conversionFlags.indexOf("#") !== -1;
        }

        if (precision) {
            precision = parseInt(precision.substr(1), 10);
        }

        formatNumber = function (n, base) {
            var precZeroPadded;
            var prefix;
            var didSign;
            var neg;
            var r;
            var j;
            base = Number(base);
            neg = false;
            didSign = false;
            if (typeof n === "number") {
                if (n < 0) {
                    n = -n;
                    neg = true;
                }
                r = n.toString(base);
            } else if (n instanceof pyFloat) {
                r = n.str$(base, false);
                if (r.length > 2 && r.substr(-2) === ".0") {
                    r = r.substr(0, r.length - 2);
                }
                neg = n.nb$isnegative();
            } else if (n instanceof pyInt) {
                r = n.str$(base, false);
                neg = n.nb$isnegative();
            } else if (n instanceof pyLong) {
                r = n.str$(base, false);
                neg = n.nb$isnegative();
            }

            asserts.assert(r !== undefined, "unhandled number format");

            precZeroPadded = false;

            if (precision) {
                //print("r.length",r.length,"precision",precision);
                for (j = r.length; j < precision; ++j) {
                    r = "0" + r;
                    precZeroPadded = true;
                }
            }

            prefix = "";

            if (neg) {
                prefix = "-";
            } else if (precedeWithSign) {
                prefix = "+" + prefix;
            } else if (blankBeforePositive) {
                prefix = " " + prefix;
            }

            if (alternateForm) {
                if (base === 16) {
                    prefix += "0x";
                } else if (base === 8 && !precZeroPadded && r !== "0") {
                    prefix += "0";
                }
            }

            return [prefix, r];
        };

        handleWidth = function (args) {
            var totLen;
            var prefix = args[0];
            var r = args[1];
            var j;

            if (fieldWidth) {
                fieldWidth = parseInt(fieldWidth, 10);
                totLen = r.length + prefix.length;
                if (zeroPad) {
                    for (j = totLen; j < fieldWidth; ++j) {
                        r = "0" + r;
                    }
                } else if (leftAdjust) {
                    for (j = totLen; j < fieldWidth; ++j) {
                        r = r + " ";
                    }
                    if (Sk.__future__.python3) {
                        r += prefix;
                        prefix = "";
                    }
                } else {
                    for (j = totLen; j < fieldWidth; ++j) {
                        prefix = " " + prefix;
                    }
                }
            }
            return prefix + r;
        };
        //print("Rhs:",rhs, "ctor", rhs.constructor);
        if (rhs.constructor === pyTuple) {
            value = rhs.v[i];
        } else if (rhs.mp$subscript !== undefined && mappingKey !== undefined) {
            mk = mappingKey.substring(1, mappingKey.length - 1);
            //print("mk",mk);
            value = rhs.mp$subscript(new pyStr(mk));
        } else if (rhs.constructor === pyDict || rhs.constructor === pyList) {
            // new case where only one argument is provided
            value = rhs;
        } else {
            throw new pyExc.AttributeError(rhs.tp$name + " instance has no attribute 'mp$subscript'");
        }
        base = 10;
        if (conversionType === "d" || conversionType === "i") {
            let tmpData = formatNumber(value, base);
            if (tmpData[1] === undefined) {
                throw new pyExc.TypeError("%" + conversionType + " format: a number is required, not " + typeName(value));
            }
            let r = tmpData[1];
            tmpData[1] = r.indexOf(".") !== -1 ? parseInt(r, 10).toString() : r;
            return handleWidth(tmpData);
        } else if (conversionType === "o") {
            return handleWidth(formatNumber(value, 8));
        } else if (conversionType === "x") {
            return handleWidth(formatNumber(value, 16));
        } else if (conversionType === "X") {
            return handleWidth(formatNumber(value, 16)).toUpperCase();
        } else if (
            conversionType === "f" ||
            conversionType === "F" ||
            conversionType === "e" ||
            conversionType === "E" ||
            conversionType === "g" ||
            conversionType === "G"
        ) {
            convValue = Number(value);
            if (typeof convValue === "string") {
                convValue = Number(convValue);
            }
            if (convValue === Infinity) {
                return "inf";
            }
            if (convValue === -Infinity) {
                return "-inf";
            }
            if (isNaN(convValue)) {
                return "nan";
            }
            convName = ["toExponential", "toFixed", "toPrecision"]["efg".indexOf(conversionType.toLowerCase())];
            if (precision === undefined || precision === "") {
                if (conversionType === "e" || conversionType === "E") {
                    precision = 6;
                } else if (conversionType === "f" || conversionType === "F") {
                    if (Sk.__future__.python3) {
                        precision = 6;
                    } else {
                        precision = 7;
                    }
                }
            }
            result = convValue[convName](precision); // possible loose of negative zero sign

            // apply sign to negative zeros, floats only!
            if (checkFloat(value)) {
                if (convValue === 0 && 1 / convValue === -Infinity) {
                    result = "-" + result; // add sign for zero
                }
            }
            if (Sk.__future__.python3) {
                if (result.length >= 7 && result.slice(0, 6) == "0.0000") {
                    val = parseFloat(result);
                    result = val.toExponential();
                }
                if (result.charAt(result.length - 2) == "-") {
                    result = result.slice(0, result.length - 1) + "0" + result.charAt(result.length - 1);
                }
            }
            if ("EFG".indexOf(conversionType) !== -1) {
                result = result.toUpperCase();
            }
            return handleWidth(["", result]);
        } else if (conversionType === "c") {
            if (typeof value === "number") {
                return String.fromCharCode(value);
            } else if (value instanceof pyInt) {
                return String.fromCharCode(value.v);
            } else if (value instanceof pyFloat) {
                return String.fromCharCode(value.v);
            } else if (value instanceof pyLong) {
                return String.fromCharCode(value.str$(10, false)[0]);
            } else if (value.constructor === pyStr) {
                return value.v.substr(0, 1);
            } else {
                throw new pyExc.TypeError("an integer is required");
            }
        } else if (conversionType === "r") {
            r = objectRepr(value);
            if (precision) {
                return r.substr(0, precision);
            }
            return r;
        } else if (conversionType === "s") {
            r = new pyStr(value);
            r = r.$jsstr();
            if (precision) {
                return r.substr(0, precision);
            }
            if (fieldWidth) {
                r = handleWidth([" ", r]);
            }
            return r;
        } else if (conversionType === "%") {
            return "%";
        }
    };
    ret = this.v.replace(regex, replFunc);
    return new pyStr(ret);
}

/**
 * @constructor
 * @param {Object} obj
 */
var str_iter_ = buildIteratorClass("str_iterator", {
    constructor: function str_iter_(str) {
        this.$index = 0;
        if (str.$hasAstralCodePoints()) {
            this.$seq = str.codepoints;
            this.tp$iternext = () => {
                const i = this.$seq[this.$index];
                if (i === undefined) {
                    return undefined;
                }
                return new pyStr(str.v.substring(i, this.$seq[++this.$index]));
            };
        }
        this.$seq = str.v;
        this.tp$iternext = () => {
            const ch = this.$seq[this.$index++];
            if (ch === undefined) {
                return undefined;
            }
            return new pyStr(ch);
        };
    },
    iternext: function () {
        return this.tp$iternext();
    },
    methods: {
        __length_hint__: genericIterLengthHintWithArrayMethodDef,
    },
    flags: { sk$acceptable_as_base_class: false },
});

export const reservedWords_ = {
    abstract: true,
    as: true,
    boolean: true,
    break: true,
    byte: true,
    case: true,
    catch: true,
    char: true,
    class: true,
    continue: true,
    const: true,
    debugger: true,
    default: true,
    delete: true,
    do: true,
    double: true,
    else: true,
    enum: true,
    export: true,
    extends: true,
    false: true,
    final: true,
    finally: true,
    float: true,
    for: true,
    function: true,
    goto: true,
    if: true,
    implements: true,
    import: true,
    in: true,
    instanceof: true,
    int: true,
    interface: true,
    is: true,
    long: true,
    namespace: true,
    native: true,
    new: true,
    null: true,
    package: true,
    private: true,
    protected: true,
    public: true,
    return: true,
    short: true,
    static: true,
    super: true,
    switch: true,
    synchronized: true,
    this: true,
    throw: true,
    throws: true,
    transient: true,
    true: true,
    try: true,
    typeof: true,
    use: true,
    var: true,
    void: true,
    volatile: true,
    while: true,
    with: true,
    // reserved Names
    constructor: true,
    __defineGetter__: true,
    __defineSetter__: true,
    apply: true,
    arguments: true,
    call: true,
    caller: true,
    eval: true,
    hasOwnProperty: true,
    isPrototypeOf: true,
    __lookupGetter__: true,
    __lookupSetter__: true,
    __noSuchMethod__: true,
    propertyIsEnumerable: true,
    prototype: true,
    toSource: true,
    toLocaleString: true,
    toString: true,
    unwatch: true,
    valueOf: true,
    watch: true,
    length: true,
    name: true,
};

export function fixReserved(name) {
    if (reservedWords_[name] === undefined) {
        return name;
    }
    return name + "_$rw$";
}

export function unfixReserved () {};

pyStr.reservedWords_ = reservedWords_;
