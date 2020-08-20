export function richCompare(other, op) {
    if (!this.type$like(other)) {
        return Sk.builtin.NotImplemented.NotImplemented$;
    }
    switch (op) {
        case "Lt":
            return this.$jsstr() < other.$jsstr();
        case "LtE":
            return this.$jsstr() <= other.$jsstr();
        case "Eq":
            return this.$jsstr() === other.$jsstr();
        case "NotEq":
            return this.$jsstr() !== other.$jsstr();
        case "Gt":
            return this.$jsstr() > other.$jsstr();
        case "GtE":
            return this.$jsstr() >= other.$jsstr();
    }
}

export var replace = new Sk.builtin.func(function replace(self, oldS, newS, count) {
    Sk.builtin.pyCheckArgsLen("replace", arguments.length, 3, 4);
    if (!self.type$like(oldS)) {
        throw new Sk.builtin.TypeError(self.like$name + " is required not '" + Sk.abstr.typeName(oldS) + "'");
    }
    if (!self.type$like(newS)) {
        throw new Sk.builtin.TypeError(self.like$name + " is required not '" + Sk.abstr.typeName(newS) + "'");
    }
    count = count || -1;
    if (!Sk.misceval.isIndex(count)) {
        throw new Sk.builtin.TypeError("'" + Sk.abstr.typeName(count) + "' object cannot be interpreted as an integer");
    }
    count = Sk.misceval.asIndex(count);
    oldS = oldS.$jsstr();
    newS = newS.$jsstr();
    const jsstr = self.$jsstr();

    const patt = new RegExp(re_escape_(oldS), "g");

    if (count < 0) {
        return new self.sk$builtinBase(jsstr.replace(patt, newS));
    }

    let c = 0;
    return new self.sk$builtinBase(
        jsstr.replace(patt, function replacer(match) {
            c++;
            if (c <= count) {
                return newS;
            }
            return match;
        })
    );
});

var leading_whitespace = /[\s\xa0]+/g;
var special_chars = /([.*+?=|\\\/()\[\]\{\}^$])/g;

function mkSplit (funcname, isReversed) {
    return function (self, sep, maxsplits) {
        Sk.builtin.pyCheckArgsLen(funcname, arguments.length, 1, 3);
        if (maxsplits === undefined) {
            maxsplits = -1;
        } else if (!Sk.misceval.isIndex(maxsplits)) {
            throw new Sk.builtin.TypeError("'" + Sk.abstr.typeName(maxsplits) + "' object cannot be interpreted as an integer");
        } else {
            maxsplits = Sk.misceval.asIndex(maxsplits);
        }

        if (sep === undefined || Sk.builtin.checkNone(sep)) {
            sep = null;
        } else if (self.type$like(sep)) {
            sep = sep.$jsstr();
            if (sep === "") {
                throw new Sk.builtin.ValueError("empty separator");
            }
        } else {
            throw new Sk.builtin.TypeError("a " + self.like$name + " is required not, " + Sk.abstr.typeName(sep));
        }

        let regex = leading_whitespace;
        let jsstr = self.$jsstr();
        if (sep === null) {
            // Remove leading whitespace
            jsstr = jsstr.replace(regex, "");
        } else {
            // Escape special characters in null so we can use a regexp
            const s = sep.replace(special_chars, "\\$1");
            regex = new RegExp(s, "g");
        }

        // This is almost identical to re.split,
        // except how the regexp is constructed
        const result = [];
        let index = 0;
        let splits = 0;
        let match;
        while ((match = regex.exec(jsstr)) != null && splits > maxsplits) {
            if (match.index === regex.lastIndex) {
                // empty match
                break;
            }
            result.push(new self.sk$builtinBase(jsstr.substring(index, match.index)));
            index = regex.lastIndex;
            splits += 1;
        }
        jsstr = jsstr.substring(index);
        if (sep !== null || jsstr.length > 0) {
            result.push(new self.sk.sk$builtinBase(jsstr));
        }

        return new Sk.builtin.list(result);
    };
}

export var split = new Sk.builtin.func(mkSplit("split", false));

// export var rsplit = new Sk.builtin.func(function rsplit() {});

export var join = new Sk.builtin.func(function join(self, seq) {
    Sk.builtin.pyCheckArgsLen("join", arguments.length, 2, 2);
    const arrOfStrs = [];
    for (let it = Sk.abstr.iter(seq), i = it.tp$iternext(); i !== undefined; i = it.tp$iternext()) {
        if (!self.type$like(i)) {
            throw new Sk.builtin.TypeError(
                "TypeError: sequence item " + arrOfStrs.length + ": expected " + self.like$name + ", " + Sk.abstr.typeName(i) + " found"
            );
        }
        arrOfStrs.push(i.$jsstr());
    }
    return new self.sk$builtinBase(arrOfStrs.join(self.$jsstr()));
});

export var capitalize = new Sk.builtin.func(function capitalize(self) {
    Sk.builtin.pyCheckArgsLen("capitalize", arguments.length, 1, 1);
    const orig = self.$jsstr();
    if (orig.length === 0) {
        return new self.sk$builtinBase();
    }
    let cap = orig.charAt(0).toUpperCase();
    for (let i = 1; i < orig.length; i++) {
        cap += orig.charAt(i).toLowerCase();
    }
    return new self.sk$builtinBase(cap);
});

var title_reg = /[a-z][a-z]*/gi;
export var title = new Sk.builtin.func(function title(self) {
    Sk.builtin.pyCheckArgsLen("title", arguments.length, 1, 1);
    const jsstr = self.$jsstr();
    const ret = jsstr.replace(title_reg, function (str) {
        return str[0].toUpperCase() + str.substr(1).toLowerCase();
    });
    return new self.sk$builtinBase(ret);
});

function indices(self, start, end) {
    const len = self.sq$length();
    if (start === undefined || Sk.builtin.checkNone(start)) {
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

    if (self.codepoints) {
        start = self.codepoints[start];
        end = self.codepoints[end];
        start = start === undefined ? self.v.length : start;
        end = end === undefined ? self.v.length : end;
    }

    return {
        start: start,
        end: end,
    };
}

var normal_reg = /[-[\]{}()*+?.,\\^$|#\s]/g;
export var count = new Sk.builtin.func(function count(self, pat, start, end) {
    Sk.builtin.pyCheckArgsLen("count", arguments.length, 2, 4);

    pat = self.get$tgt(pat);
    ({ start, end } = indices(self, start, end));

    if (end < start) {
        return new Sk.builtin.int_(0);
    }

    const normaltext = pat.replace(normal_reg, "\\$&");
    const m = new RegExp(normaltext, "g");
    const slice = self.$jsstr().slice(self.codepoints ? self.codepoints[start] : start, self.codepoints ? self.codepoints[end] : end);
    const ctl = slice.match(m);
    if (!ctl) {
        return new Sk.builtin.int_(0);
    } else {
        return new Sk.builtin.int_(ctl.length);
    }
});

var tab_reg = /([^\r\n\t]*)\t/g;
export var expandtabs = new Sk.builtin.func(function expandtabs(self, tabsize) {
    Sk.builtin.pyCheckArgsLen("expandtabs", arguments.length, 1, 2);
    if (tabsize === undefined) {
        tabsize = 8;
    } else if (Sk.builtin.checkInt(tabsize)) {
        tabsize = Sk.builtin.asnum$(tabsize);
    } else {
        throw new Sk.builtin.TypeError("integer argument expected, got " + Sk.abstr.typeName(tabsize));
    }
    let spaces = new Array(tabsize + 1).join(" ");
    const expanded = self.$jsstr().replace(tab_reg, function (a, b) {
        return b + spaces.slice(b.length % tabsize);
    });
    return new self.sk$builtinBase(expanded);
});

function mkFind(isReversed) {
    return function (tgt, start, end) {
        tgt = this.get$tgt(tgt);

        ({ start, end } = indices(this, start, end));

        // This guard makes sure we don't, eg, look for self.codepoints[-1]
        if (end < start) {
            return -1;
        }

        // ...do the search..
        const jsstr = this.$jsstr();
        end -= tgt.length;
        let jsidx = isReversed ? jsstr.lastIndexOf(tgt, end) : jsstr.indexOf(tgt, start);
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

export var find$left = mkFind(false);
export var find$right = mkFind(true);

export var find = new Sk.builtin.func(function (self, tgt, start, end) {
    Sk.builtin.pyCheckArgsLen("index", arguments.length - 1, 1, 3);
    return new Sk.builtin.int_(self.find$left(tgt, start, end));
});

export var rfind = new Sk.builtin.func(function (self, tgt, start, end) {
    Sk.builtin.pyCheckArgsLen("index", arguments.length - 1, 1, 3);
    return new Sk.builtin.int_(self.find$right(tgt, start, end));
});

export var index = new Sk.builtin.func(function index(self, tgt, start, end) {
    Sk.builtin.pyCheckArgsLen("index", arguments.length - 1, 1, 3);

    const val = self.find$left(tgt, start, end);
    if (val === -1) {
        throw new Sk.builtin.ValueError(self.sub$name + " not found");
    } else {
        return Sk.builtin.int_(val);
    }
});

export var rindex = new Sk.builtin.func(function rindex(self, tgt, start, end) {
    Sk.builtin.pyCheckArgsLen("index", arguments.length - 1, 1, 3);

    const val = self.find$right(tgt, start, end);
    if (val === -1) {
        throw new Sk.builtin.ValueError(self.sub$name + " not found");
    } else {
        return Sk.builtin.int_(val);
    }
});

function mkPartition(funcname, isReversed) {
    return function (self, sep) {
        Sk.builtin.pyCheckArgsLen(funcname, arguments.length, 2, 2);
        if (!self.type$like(sep)) {
            throw new Sk.builtin.TypeError("a " + self.like$name + " is required not, " + Sk.abstr.typeName(sep));
        }

        const sepStr = sep.$jsstr();
        const jsstr = self.$jsstr();
        let pos;
        if (isReversed) {
            pos = jsstr.lastIndexOf(sepStr);
            if (pos < 0) {
                return new Sk.builtin.tuple([new self.sk$builtinBase(), new self.sk$builtinBase(), self]);
            }
        } else {
            pos = jsstr.indexOf(sepStr);
            if (pos < 0) {
                return new Sk.builtin.tuple([self, new self.sk$builtinBase(), new self.sk$builtinBase()]);
            }
        }

        return new Sk.builtin.tuple([
            new self.sk$builtinBase(jsstr.substring(0, pos)),
            sep,
            new self.sk$builtinBase(jsstr.substring(pos + sepStr.length)),
        ]);
    };
}

export var partition = new Sk.builtin.func(mkPartition("partition", false));
export var rpartition = new Sk.builtin.func(mkPartition("rpartition", true));

function mkJust(funcname, isRight, isCenter) {
    return function strJustify(self, len, fillchar) {
        Sk.builtin.pyCheckArgsLen(funcname, arguments.length - 1, 1, 2);
        if (!Sk.misceval.isIndex(len)) {
            throw new Sk.builtin.TypeError("'" + Sk.abstr.typeName(len) + "' object cannot be interpreted as an integer");
        }
        len = Sk.misceval.asIndex(len);
        if (fillchar === undefined) {
            fillchar = " ";
        } else if (!(fillchar instanceof self.sk$builtinBase) || fillchar.sq$length() !== 1) {
            throw new Sk.builtin.TypeError("the fill character must be a " + self.like$name + " of length 1");
        } else {
            fillchar = fillchar.$jsstr();
        }

        let mylen = self.sq$length();
        let newstr;
        if (mylen >= len) {
            return self;
        } else if (isCenter) {
            newstr = fillchar.repeat(Math.floor((len - mylen) / 2));
            newstr = newstr + self.$jsstr() + newstr;

            if ((len - mylen) % 2) {
                newstr += fillchar;
            }

            return new self.sk$builtinBase(newstr);
        } else {
            newstr = fillchar.repeat(len - mylen);
            return new self.sk$builtinBase(isRight ? newstr + self.$jsstr() : self.$jsstr() + newstr);
        }
    };
}

export var ljust = new Sk.builtin.func(mkJust("ljust", false, false));
export var center = new Sk.builtin.func(mkJust("center", false, true));
export var rjust = new Sk.builtin.func(mkJust("rjust", true, false));

export var lower = new Sk.builtin.func(function lower(self) {
    Sk.builtin.pyCheckArgsLen("lower", arguments.length, 1, 1);
    return new self.sk$builtinBase(self.$jsstr().toLowerCase());
});

// export var splitlines = new Sk.builtin.func(function splitlines() {});


function re_escape_(s) {
    var c;
    var i;
    var ret = [];
    var re = /^[A-Za-z0-9]+$/;
    for (i = 0; i < s.length; ++i) {
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
};

function mkStrip(funcname, pat, regf) {
    return function (self, chars) {
        Sk.builtin.pyCheckArgsLen(funcname, arguments.length, 1, 2);
        let pattern;
        if (chars === undefined || Sk.builtin.checkNone(chars)) {
            pattern = pat;
        } else if (chars instanceof self.sk$builtinBase) {
            const regex = re_escape_(chars.$jsstr());
            pattern = new RegExp(regf(regex), "g");
        } else {
            const typeName = self.sk$builtinBase.prototype.tp$name;
            throw new Sk.builtin.TypeError("strip arg must be None or " + typeName);
        }
        return new self.sk$builtinBase(self.$jsstr().replace(pattern, ""));
    };
}

export var strip = new Sk.builtin.func(mkStrip("strip", /^\s+|\s+$/g, (regex) => "^[" + regex + "]+|[" + regex + "]+$"));
export var lstrip = new Sk.builtin.func(mkStrip("lstrip", /^\s+/g, (regex) => "^[" + regex + "]+"));
export var rstrip = new Sk.builtin.func(mkStrip("rstrip", /\s+$/g, (regex) => "[" + regex + "]+$"));

var lower_reg = /[a-z]/gi;
export var swapcase = new Sk.builtin.func(function swapcase(self) {
    Sk.builtin.pyCheckArgsLen("swapcase", arguments.length, 1, 1);
    const jsstr = self.$jsstr();
    const ret = jsstr.replace(lower_reg, function (c) {
        const lc = c.toLowerCase();
        return lc === c ? c.toUpperCase() : lc;
    });
    return new self.sk$builtinBase(ret);
});

export var maketrans = new Sk.builtin.func(function maketrans() {
    throw new Sk.builtin.NotImplementedError("maketrans() method not implemented in Skulpt");
});

export var translate = new Sk.builtin.func(function translate() {
    throw new Sk.builtin.NotImplementedError("translate() method not implemented in Skulpt");
});

export var upper = new Sk.builtin.func(function upper(self) {
    Sk.builtin.pyCheckArgsLen("upper", arguments.length, 1, 1);
    return new self.sk$builtinBase(self.$jsstr().toUpperCase());
});

function mkStartEndswith(funcname, checkIdx) {
    return function (self, tgt, start, end) {
        Sk.builtin.pyCheckArgsLen(funcname, arguments.length - 1, 1, 3);
        const theType = self.sk$builtinBase;
        if (!(tgt instanceof theType) && !(tgt instanceof Sk.builtin.tuple)) {
            const typeName = theType.prototype.tp$name;
            throw new Sk.builtin.TypeError(
                funcname + " first arg must be " + typeName + " or a tuple of " + typeName + ", not " + Sk.abstr.typeName(tgt)
            );
        }

        ({ start, end } = indices(self, start, end));

        if (start > end) {
            return Sk.builtin.bool.false$;
        }

        let substr = self.$jsstr().slice(start, end);

        if (tgt instanceof Sk.builtin.tuple) {
            for (let it = Sk.abstr.iter(tgt), i = it.tp$iternext(); i !== undefined; i = it.tp$iternext()) {
                if (!(i instanceof theType)) {
                    throw new Sk.builtin.TypeError("tuple for " + funcname + " must only contain str, not " + Sk.abstr.typeName(i));
                }
                if (checkIdx(substr, i.$jsstr())) {
                    return Sk.builtin.bool.true$;
                }
            }
            return Sk.builtin.bool.false$;
        }
        return new Sk.builtin.bool(checkIdx(substr, tgt.$jsstr()));
    };
}
export var startswith = new Sk.builtin.func(mkStartEndswith("startswith", (substr, i) => substr.indexOf(i) === 0));

export var endswith = new Sk.builtin.func(mkStartEndswith("endswith", (substr, i) => substr.indexOf(i, substr.length - i.length) !== -1));

var ascii_reg = /^[\x00-\x7F]*$/;
export var isascii = new Sk.builtin.func(function isascii(self) {
    Sk.builtin.pyCheckArgsLen("isascii", arguments.length - 1, 0, 0);
    const jsstr = self.$jsstr();
    return new Sk.builtin.bool(ascii_reg.test(jsstr));
});

var islower_reg = /[a-z]/;
var isupper_reg = /[A-Z]/;
export var islower = new Sk.builtin.func(function islower(self) {
    Sk.builtin.pyCheckArgsLen("islower", arguments.length, 1, 1);
    const jsstr = self.$jsstr();
    return new Sk.builtin.bool(jsstr.length && islower_reg.test(jsstr) && !isupper_reg.test(jsstr));
});

export var isupper = new Sk.builtin.func(function isupper(self) {
    Sk.builtin.pyCheckArgsLen("isupper", arguments.length, 1, 1);
    const jsstr = self.$jsstr();
    return new Sk.builtin.bool(jsstr.length && !islower_reg.test(jsstr) && isupper_reg.test(jsstr));
});

export var istitle = new Sk.builtin.func(function istitle(self) {
    // Comparing to str.title() seems the most intuitive thing, but it fails on "",
    // Other empty-ish strings with no change.
    Sk.builtin.pyCheckArgsLen("istitle", arguments.length, 1, 1);
    const input = self.$jsstr();
    let cased = false;
    let previous_is_cased = false;
    let ch;
    for (let pos = 0; pos < input.length; pos++) {
        ch = input.charAt(pos);
        if (!islower_reg.test(ch) && isupper_reg.test(ch)) {
            if (previous_is_cased) {
                return new Sk.builtin.bool(false);
            }
            previous_is_cased = true;
            cased = true;
        } else if (islower_reg.test(ch) && !isupper_reg.test(ch)) {
            if (!previous_is_cased) {
                return new Sk.builtin.bool(false);
            }
            cased = true;
        } else {
            previous_is_cased = false;
        }
    }
    return new Sk.builtin.bool(cased);
});

var space_reg = /^\s+$/;
export var isspace = new Sk.builtin.func(function isspace(self) {
    Sk.builtin.pyCheckArgsLen("isspace", arguments.length, 1, 1);
    return new Sk.builtin.bool(space_reg.test(self.$jsstr()));
});

var digit_reg = /^\d+$/;
export var isdigit = new Sk.builtin.func(function isdigit(self) {
    Sk.builtin.pyCheckArgsLen("isdigit", arguments.length, 1, 1);
    return new Sk.builtin.bool(digit_reg.test(self.$jsstr()));
});

var numeric_reg = /[^0-9]/;
export var isnumeric = new Sk.builtin.func(function isnumeric(self) {
    Sk.builtin.pyCheckArgsLen("isnumeric", arguments.length, 1, 1);
    const jsstr = self.$jsstr();
    return new Sk.builtin.bool(jsstr.length && !numeric_reg.test(jsstr));
});

var alpha_reg = /[^a-zA-Z]/;
export var isalpha = new Sk.builtin.func(function isalpha(self) {
    Sk.builtin.pyCheckArgsLen("isalpha", arguments.length, 1, 1);
    const jsstr = self.$jsstr();
    return new Sk.builtin.bool(jsstr.length && !alpha_reg.test(jsstr));
});

var alnum_reg = /[^a-zA-Z0-9]/;
export var isalnum = new Sk.builtin.func(function isalnum(self) {
    Sk.builtin.pyCheckArgsLen("isalnum", arguments.length, 1, 1);
    const jsstr = self.$jsstr();
    return new Sk.builtin.bool(jsstr.length && !alnum_reg.test(jsstr));
});

export var zfill = new Sk.builtin.func(function zfill(self, len) {
    Sk.builtin.pyCheckArgsLen("zfill", arguments.length, 2, 2);
    if (!Sk.misceval.isIndex(len)) {
        throw new Sk.builtin.TypeError("'" + Sk.abstr.typeName(len) + "' object cannot be interpreted as an integer");
    }
    len = Sk.misceval.asIndex(len);
    const jsstr = self.$jsstr();
    let pad = "";
    // figure out how many zeroes are needed to make the proper length
    const zeroes = len - jsstr.length;
    // offset by 1 if there is a +/- at the beginning of the string
    const offset = jsstr[0] === "+" || jsstr[0] === "-" ? 1 : 0;
    for (var i = 0; i < zeroes; i++) {
        pad += "0";
    }
    // combine the string and the zeroes
    const ret = jsstr.substr(0, offset) + pad + jsstr.substr(offset);
    return new self.sk$builtinBase(ret);
});

// export var __format__ = new Sk.builtin.func(function __format__() {});

export function mod(rhs) {
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
    const strBytesConstructor = this.sk$builtinBase;
    // distinguish between bytes and str

    if (rhs.constructor !== Sk.builtin.tuple && (rhs.mp$subscript === undefined || rhs.constructor === strBytesConstructor)) {
        rhs = new Sk.builtin.tuple([rhs]);
    }
    // general approach is to use a regex that matches the format above, and
    // do an re.sub with a function as replacement to make the subs.

    //           1 2222222222222222   33333333   444444444   5555555555555  66666  777777777777777777
    regex = /%(\([a-zA-Z0-9]+\))?([#0 +\-]+)?(\*|[0-9]+)?(\.(\*|[0-9]+))?[hlL]?([diouxXeEfFgGcrsb%])/g;
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

        fieldWidth = Sk.builtin.asnum$(fieldWidth);
        precision = Sk.builtin.asnum$(precision);

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
            base = Sk.builtin.asnum$(base);
            neg = false;
            didSign = false;
            if (typeof n === "number") {
                if (n < 0) {
                    n = -n;
                    neg = true;
                }
                r = n.toString(base);
            } else if (n instanceof Sk.builtin.float_) {
                r = n.str$(base, false);
                if (r.length > 2 && r.substr(-2) === ".0") {
                    r = r.substr(0, r.length - 2);
                }
                neg = n.nb$isnegative();
            } else if (n instanceof Sk.builtin.int_) {
                r = n.str$(base, false);
                neg = n.nb$isnegative();
            } else if (n instanceof Sk.builtin.lng) {
                r = n.str$(base, false);
                neg = n.nb$isnegative();
            }

            Sk.asserts.assert(r !== undefined, "unhandled number format");

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
        if (rhs.constructor === Sk.builtin.tuple) {
            value = rhs.v[i];
        } else if (rhs.mp$subscript !== undefined && mappingKey !== undefined) {
            mk = mappingKey.substring(1, mappingKey.length - 1);
            //print("mk",mk);
            value = rhs.mp$subscript(new strBytesConstructor(mk));
        } else if (rhs.constructor === Sk.builtin.dict || rhs.constructor === Sk.builtin.list) {
            // new case where only one argument is provided
            value = rhs;
        } else {
            throw new Sk.builtin.AttributeError(rhs.tp$name + " instance has no attribute 'mp$subscript'");
        }
        base = 10;
        if (conversionType === "d" || conversionType === "i") {
            let tmpData = formatNumber(value, base);
            if (tmpData[1] === undefined) {
                throw new Sk.builtin.TypeError("%" + conversionType + " format: a number is required, not " + Sk.abstr.typeName(value));
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
            convValue = Sk.builtin.asnum$(value);
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
            if (Sk.builtin.checkFloat(value)) {
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
            } else if (value instanceof Sk.builtin.int_) {
                return String.fromCharCode(value.v);
            } else if (value instanceof Sk.builtin.float_) {
                return String.fromCharCode(value.v);
            } else if (value instanceof Sk.builtin.lng) {
                return String.fromCharCode(value.str$(10, false)[0]);
            } else if (value.constructor === Sk.builtin.str) {
                return value.v.substr(0, 1);
            } else {
                throw new Sk.builtin.TypeError("an integer is required");
            }
        } else if (conversionType === "r") {
            r = Sk.builtin.repr(value);
            if (precision) {
                return r.v.substr(0, precision);
            }
            return r.v;
        } else if (conversionType === "s" && strBytesConstructor === Sk.builtin.str) {
            r = new Sk.builtin.str(value);
            r = r.$jsstr();
            if (precision) {
                return r.substr(0, precision);
            }
            if (fieldWidth) {
                r = handleWidth([" ", r]);
            }
            return r;
        } else if (conversionType === "b" || conversionType === "s") {
            if (strBytesConstructor === Sk.builtin.str) {
                throw new Sk.builtin.ValueError("unsupported format character 'b'");
            }
            let func;
            if (!(value instanceof Sk.builtin.bytes) && (func = Sk.abstr.lookupSpecial(value, Sk.builtin.str.$bytes)) === undefined) {
                throw new Sk.builtin.TypeError(
                    "%b requires a bytes-like object, or an object that implements __bytes__, not '" + Sk.abstr.typeName(value) + "'"
                );
            }
            if (func !== undefined) {
                value = new Sk.builtin.bytes(value);
                // raises the appropriate error message if __bytes__ does not return bytes
            }
            r = value.$jsstr();
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
    ret = this.$jsstr().replace(regex, replFunc);
    return new strBytesConstructor(ret);
}
