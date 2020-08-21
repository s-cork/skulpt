import * as str_lib from "./str_lib.js";

Sk.builtin.interned = Object.create(null);

function getInterned (x) {
    return Sk.builtin.interned[x];
}

function setInterned (x, pyStr) {
    Sk.builtin.interned[x] = pyStr;
}

/**
 * @constructor
 * @param {*} x
 * @extends Sk.builtin.object
 */
Sk.builtin.str = function (x, encoding, errors) {
    var ret;

    if (x === undefined) {
        x = "";
    }

    if (encoding) {
        // only check args if we have more than 1
        Sk.builtin.pyCheckArgsLen("str", arguments.length, 0, Sk.__future__.python3 ? 3 : 1);
        
        if (!Sk.builtin.checkBytes(x)) {
            throw new TypeError("decoding " + Sk.abstr.typeName(x) + " is not supported");
        }
        return Sk.builtin.bytes.$decode(x, encoding, errors);
    }

    if (x instanceof Sk.builtin.str) {
        return x;
    }
    if (!(this instanceof Sk.builtin.str)) {
        return new Sk.builtin.str(x);
    }


    // convert to js string
    if (x === true) {
        ret = "True";
    } else if (x === false) {
        ret = "False";
    } else if ((x === null) || (x === Sk.builtin.none.none$)) {
        ret = "None";
    } else if (x instanceof Sk.builtin.bool) {
        if (x.v) {
            ret = "True";
        } else {
            ret = "False";
        }
    } else if (typeof x === "number") {
        ret = x.toString();
        if (ret === "Infinity") {
            ret = "inf";
        } else if (ret === "-Infinity") {
            ret = "-inf";
        }
    } else if (typeof x === "string") {
        ret = x;
    } else if (x.tp$str !== undefined) {
        ret = x.tp$str();
        if (!(ret instanceof Sk.builtin.str)) {
            throw new Sk.builtin.ValueError("__str__ didn't return a str");
        }
        return ret;
    } else {
        return Sk.misceval.objectRepr(x);
    }

    // interning required for strings in py
    const interned = getInterned(ret);
    if (interned !== undefined) {
        return interned;
    }

    this.__class__ = Sk.builtin.str;
    this.v = ret;
    setInterned(ret, this);
    this.$mangled = fixReserved(ret);
    return this;

};
Sk.exportSymbol("Sk.builtin.str", Sk.builtin.str);

Sk.abstr.setUpInheritance("str", Sk.builtin.str, Sk.builtin.seqtype);

// a flag for instances of subclasses of str
Sk.builtin.str.prototype.sk$builtinBase = Sk.builtin.str;

Sk.builtin.str.prototype.$hasAstralCodePoints = function() {
    // If a string has astral code points, we have to work
    // out where they are before we can do things like
    // slicing, computing length, etc.
    // We work this out when we need to.

    if (this.codepoints === null) {
        return false;
    } else if (this.codepoints !== undefined) {
        return true;
    }
    // Does this string contain astral code points? If so, we have to do things
    // the slow way.
    for (let i = 0; i < this.v.length; i++) {
        let cc = this.v.charCodeAt(i);
        if (cc >= 0xd800 && cc < 0xe000) {
            // Yep, it's a surrogate pair. Mark off the
            // indices of all the code points for O(1) seeking
            // later

            this.codepoints = [];
            for (let j = 0; j < this.v.length; j++) {
                this.codepoints.push(j);
                cc = this.v.charCodeAt(j);
                if (cc >= 0xd800 && cc < 0xdc00) {
                    // High surrogate. Skip next char
                    j++;
                }
            }
            return true;
        }
    }
    this.codepoints = null;
    return false;
};


Sk.builtin.str.prototype.$jsstr = function () {
    return this.v;
};

Sk.builtin.str.prototype.type$like = function (obj) {
    return obj instanceof Sk.builtin.str;
};
Sk.builtin.str.prototype.like$name = "str instance";

Sk.builtin.str.prototype.sub$name = "substring";

Sk.builtin.str.prototype.get$tgt = function (tgt) {
    if (tgt instanceof Sk.builtin.str) {
        return tgt.$jsstr();
    }
    throw new Sk.builtin.TypeError("a str instance is required not '" + Sk.abstr.typeName(tgt) + "'");
};

Sk.builtin.str.prototype.mp$subscript = function (index) {
    let len;
    if (Sk.misceval.isIndex(index)) {
        index = Sk.misceval.asIndex(index);
        len = this.sq$length();
        if (index < 0) {
            index = len + index;
        }
        if (index < 0 || index >= len) {
            throw new Sk.builtin.IndexError("string index out of range");
        }
        if (this.codepoints) {
            return new Sk.builtin.str(this.v.substring(this.codepoints[index], this.codepoints[index+1]));
        } else {
            return new Sk.builtin.str(this.v.charAt(index));
        }
    } else if (index instanceof Sk.builtin.slice) {
        let ret = "";
        len = this.sq$length();
        if (this.codepoints) {
            index.sssiter$(len, (i) => {
                ret += this.v.substring(this.codepoints[i], this.codepoints[i+1]);
            });
        } else {
            index.sssiter$(len, (i) => {
                ret += this.v.charAt(i);
            });
        };
        return new Sk.builtin.str(ret);
    } else {
        throw new Sk.builtin.TypeError("string indices must be integers, not " + Sk.abstr.typeName(index));
    }
};

Sk.builtin.str.prototype.sq$length = function () {
    return this.$hasAstralCodePoints() ? this.codepoints.length : this.v.length;
};

Sk.builtin.str.prototype.sq$concat = function (other) {
    var otypename;
    if (!other || !Sk.builtin.checkString(other)) {
        otypename = Sk.abstr.typeName(other);
        throw new Sk.builtin.TypeError("cannot concatenate 'str' and '" + otypename + "' objects");
    }
    return new Sk.builtin.str(this.v + other.v);
};
Sk.builtin.str.prototype.nb$add = Sk.builtin.str.prototype.sq$concat;
Sk.builtin.str.prototype.nb$inplace_add = Sk.builtin.str.prototype.sq$concat;
Sk.builtin.str.prototype.sq$repeat = function (n) {
    var i;
    var ret;

    if (!Sk.misceval.isIndex(n)) {
        throw new Sk.builtin.TypeError("can't multiply sequence by non-int of type '" + Sk.abstr.typeName(n) + "'");
    }

    n = Sk.misceval.asIndex(n);
    ret = "";
    for (i = 0; i < n; ++i) {
        ret += this.v;
    }
    return new Sk.builtin.str(ret);
};
Sk.builtin.str.prototype.nb$multiply = Sk.builtin.str.prototype.sq$repeat;
Sk.builtin.str.prototype.nb$inplace_multiply = Sk.builtin.str.prototype.sq$repeat;
Sk.builtin.str.prototype.sq$item = function () {
    Sk.asserts.fail();
};
Sk.builtin.str.prototype.sq$slice = function (i1, i2) {
    i1 = Sk.builtin.asnum$(i1);
    i2 = Sk.builtin.asnum$(i2);
    if (i1 < 0) {
        i1 = 0;
    }
    if (this.$hasAstralCodePoints()) {
        if (i1 >= this.codepoints.length) {
            return Sk.builtin.str.$emptystr;
        }
        return new Sk.builtin.str(this.v.substring(this.codepoints[i1], this.codepoints[i2]));
    } else {
        return new Sk.builtin.str(this.v.substring(i1, i2));
    }
};

Sk.builtin.str.prototype.sq$contains = function (ob) {
    if (!(ob instanceof Sk.builtin.str)) {
        throw new Sk.builtin.TypeError("TypeError: 'In <string> requires string as left operand");
    }
    return this.v.indexOf(ob.v) != -1;
};

Sk.builtin.str.prototype.__contains__ = new Sk.builtin.func(function(self, item) {
    Sk.builtin.pyCheckArgsLen("__contains__", arguments.length - 1, 1, 1);
    return new Sk.builtin.bool(self.v.indexOf(item.v) != -1);
});

Sk.builtin.str.prototype.__iter__ = new Sk.builtin.func(function (self) {
    return new Sk.builtin.str_iter_(self);
});

Sk.builtin.str.prototype.tp$iter = function () {
    return new Sk.builtin.str_iter_(this);
};

Sk.builtin.str.prototype["$r"] = function () {
    // single is preferred
    var ashex;
    var c;
    var cc;
    var i;
    var ret;
    var len;
    var quote = "'";
    //jshint ignore:start
    if (this.v.indexOf("'") !== -1 && this.v.indexOf('"') === -1) {
        quote = '"';
    }
    //jshint ignore:end
    len = this.v.length;
    ret = quote;
    for (i = 0; i < len; ++i) {
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
        } else if ((cc > 0xff && cc < 0xd800 || cc >= 0xe000) && !Sk.__future__.python3) {
            // BMP
            ret += "\\u" + ("000"+cc.toString(16)).slice(-4);
        } else if (cc >= 0xd800 && !Sk.__future__.python3) {
            // Surrogate pair stuff
            let val = this.v.codePointAt(i);
            i++;

            val = val.toString(16);
            let s = ("0000000"+val.toString(16));
            if (val.length > 4) {
                ret += "\\U" + s.slice(-8);
            } else {
                ret += "\\u" + s.slice(-4);
            }
        } else if (cc > 0xff && !Sk.__future__.python3) {
            // Invalid!
            ret += "\\ufffd";
        } else if (c < " " || cc >= 0x7f && !Sk.__future__.python3) {
            ashex = c.charCodeAt(0).toString(16);
            if (ashex.length < 2) {
                ashex = "0" + ashex;
            }
            ret += "\\x" + ashex;
        } else {
            ret += c;
        }
    }
    ret += quote;
    return new Sk.builtin.str(ret);
};



Sk.builtin.str.prototype["__format__"] = new Sk.builtin.func(function (self, format_spec) {
    var formatstr;
    Sk.builtin.pyCheckArgsLen("__format__", arguments.length, 2, 2);

    if (!Sk.builtin.checkString(format_spec)) {
        if (Sk.__future__.exceptions) {
            throw new Sk.builtin.TypeError("format() argument 2 must be str, not " + Sk.abstr.typeName(format_spec));
        } else {
            throw new Sk.builtin.TypeError("format expects arg 2 to be string or unicode, not " + Sk.abstr.typeName(format_spec));
        }
    } else {
        formatstr = Sk.ffi.remapToJs(format_spec);
        if (formatstr !== "" && formatstr !== "s") {
            throw new Sk.builtin.NotImplementedError("format spec is not yet implemented");
        }
    }

    return new Sk.builtin.str(self);
});




Sk.builtin.str.prototype["encode"] = new Sk.builtin.func(function (self, encoding, errors) {
    Sk.builtin.pyCheckArgsLen("encode", arguments.length, 1, 3);
    encoding = encoding || Sk.builtin.str.$utf8;
    Sk.builtin.pyCheckType("encoding", "string", Sk.builtin.checkString(encoding));
    encoding = encoding.v;
    if (errors !== undefined) {
        Sk.builtin.pyCheckType("errors", "string", Sk.builtin.checkString(errors));
        errors = errors.v;
    } else {
        errors = "strict";
    }
    const pyBytes = Sk.builtin.bytes.$strEncode(self, encoding, errors);
    return Sk.__future__.python3 ? pyBytes : new Sk.builtin.str(pyBytes.$jsstr());
});

Sk.builtin.str.$py2decode = new Sk.builtin.func(function (self, encoding, errors) {
    Sk.builtin.pyCheckArgsLen("decode", arguments.length, 1, 3);
    const pyBytes = new Sk.builtin.bytes(self.$jsstr());
    return Sk.builtin.bytes.$decode(pyBytes, encoding, errors);
});


Object.assign(Sk.builtin.str.prototype, str_lib);

/**
 * @constructor
 * @param {Object} obj
 */
Sk.builtin.str_iter_ = function (obj) {
    if (!(this instanceof Sk.builtin.str_iter_)) {
        return new Sk.builtin.str_iter_(obj);
    }
    this.$index = 0;
    this.$obj = obj.v.slice();
    this.tp$iter = () => this;
    if (obj.$hasAstralCodePoints()) {
        this.sq$length = obj.codepoints.length;
        this.$codepoints = obj.codepoints.slice();
        this.tp$iternext = function () {
            if (this.$index >= this.sq$length) {
                return undefined;
            }

            let r = new Sk.builtin.str(this.$obj.substring(this.$codepoints[this.$index], this.$codepoints[this.$index+1]));
            this.$index++;
            return r;
        };
    } else {
        this.sq$length = this.$obj.length;
        this.tp$iternext = function () {
            if (this.$index >= this.sq$length) {
                return undefined;
            }
            return new Sk.builtin.str(this.$obj.substr(this.$index++, 1));
        };
    }
    this.$r = function () {
        return new Sk.builtin.str("iterator");
    };
    return this;
};

Sk.abstr.setUpInheritance("iterator", Sk.builtin.str_iter_, Sk.builtin.object);

Sk.builtin.str_iter_.prototype.__class__ = Sk.builtin.str_iter_;

Sk.builtin.str_iter_.prototype.__iter__ = new Sk.builtin.func(function (self) {
    Sk.builtin.pyCheckArgsLen("__iter__", arguments.length, 0, 0, true, false);
    return self;
});

Sk.builtin.str_iter_.prototype.next$ = function (self) {
    var ret = self.tp$iternext();
    if (ret === undefined) {
        throw new Sk.builtin.StopIteration();
    }
    return ret;
};


var reservedWords_ = {
    "abstract": true,
    "as": true,
    "boolean": true,
    "break": true,
    "byte": true,
    "case": true,
    "catch": true,
    "char": true,
    "class": true,
    "continue": true,
    "const": true,
    "debugger": true,
    "default": true,
    "delete": true,
    "do": true,
    "double": true,
    "else": true,
    "enum": true,
    "export": true,
    "extends": true,
    "false": true,
    "final": true,
    "finally": true,
    "float": true,
    "for": true,
    "function": true,
    "goto": true,
    "if": true,
    "implements": true,
    "import": true,
    "in": true,
    "instanceof": true,
    "int": true,
    "interface": true,
    "is": true,
    "long": true,
    "namespace": true,
    "native": true,
    "new": true,
    "null": true,
    "package": true,
    "private": true,
    "protected": true,
    "public": true,
    "return": true,
    "short": true,
    "static": true,
    // "super": false,
    "switch": true,
    "synchronized": true,
    "this": true,
    "throw": true,
    "throws": true,
    "transient": true,
    "true": true,
    "try": true,
    "typeof": true,
    "use": true,
    "var": true,
    "void": true,
    "volatile": true,
    "while": true,
    "with": true,
    // reserved Names
    "__defineGetter__": true,
    "__defineSetter__": true,
    "apply": true,
    "arguments": true,
    "call": true,
    "caller": true, 
    "eval": true,
    "hasOwnProperty": true,
    "isPrototypeOf": true,
    "__lookupGetter__": true,
    "__lookupSetter__": true,
    "__noSuchMethod__": true,
    "propertyIsEnumerable": true,
    "prototype": true,
    "toSource": true,
    "toLocaleString": true,
    "toString": true,
    "unwatch": true,
    "valueOf": true,
    "watch": true,
    "length": true,
    "name": true,
};

Sk.builtin.str.reservedWords_ = reservedWords_;

function fixReserved(name) {
    if (reservedWords_[name] === undefined) {
        return name;
    }
    return name + "_$rw$";
}


