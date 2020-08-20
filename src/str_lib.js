export var replace = new Sk.builtin.func(function replace() {});

export var split = new Sk.builtin.func(function split() {});

export var rsplit = new Sk.builtin.func(function rsplit() {});

export var join = new Sk.builtin.func(function join() {});

export var capitalize = new Sk.builtin.func(function capitalize(self) {
    Sk.builtin.pyCheckArgsLen("capitalize", arguments.length, 1, 1);
    const orig = self.$jsstr();
    if (orig.length === 0) {
        return new self.sk$baseType();
    }
    let cap = orig.charAt(0).toUpperCase();
    for (i = 1; i < orig.length; i++) {
        cap += orig.charAt(i).toLowerCase();
    }
    return new self.sk$baseType(cap);
});

var title_reg = /[a-z][a-z]*/gi;

export var title = new Sk.builtin.func(function title(self) {
    Sk.builtin.pyCheckArgsLen("swapcase", arguments.length, 1, 1);
    const jsstr = self.$jsstr();
    const ret = jsstr.replace(title_reg, function (str) {
        return str[0].toUpperCase() + str.substr(1).toLowerCase();
    });
    return new self.sk$baseType(ret);
});

export var center = new Sk.builtin.func(function center() {});

export var count = new Sk.builtin.func(function count() {});

var tab_reg = /([^\r\n\t]*)\t/g;
export var expandtabs = new Sk.builtin.func(function expandtabs(self) {
    Sk.builtin.pyCheckArgsLen("swapcase", arguments.length, 1, 1);
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
    return new self.sk$baseType(expanded);
});

export var find = new Sk.builtin.func(function find() {});

export var partition = new Sk.builtin.func(function partition() {});

export var index = new Sk.builtin.func(function index() {});

export var ljust = new Sk.builtin.func(function ljust() {});

export var lower = new Sk.builtin.func(function lower(self) {
    Sk.builtin.pyCheckArgsLen("upper", arguments.length, 1, 1);
    return new self.sk$baseType(self.$jsstr().toLowerCase());
});

export var lstrip = new Sk.builtin.func(function lstrip() {});

export var rfind = new Sk.builtin.func(function rfind() {});

export var rindex = new Sk.builtin.func(function rindex() {});

export var rjust = new Sk.builtin.func(function rjust() {});

export var rstrip = new Sk.builtin.func(function rstrip() {});

export var rpartition = new Sk.builtin.func(function rpartition() {});

export var splitlines = new Sk.builtin.func(function splitlines() {});

export var strip = new Sk.builtin.func(function strip() {});

var lower_reg = /[a-z]/gi;
export var swapcase = new Sk.builtin.func(function swapcase(self) {
    Sk.builtin.pyCheckArgsLen("swapcase", arguments.length, 1, 1);
    const jsstr = self.$jsstr();
    const ret = jsstr.replace(lower_reg, function (c) {
        const lc = c.toLowerCase();
        return lc === c ? c.toUpperCase() : lc;
    });
    return new self.sk$baseType(ret);
});

export var translate = new Sk.builtin.func(function translate() {});

export var upper = new Sk.builtin.func(function upper(self) {
    Sk.builtin.pyCheckArgsLen("upper", arguments.length, 1, 1);
    return new self.sk$baseType(self.$jsstr().toUpperCase());
});

export var startswith = new Sk.builtin.func(function startswith() {});

export var endswith = new Sk.builtin.func(function endswith() {});

var ascii_reg = /^[\x00-\x7F]*$/;
export var isascii = new Sk.builtin.func(function isascii() {
    Sk.builtin.pyCheckArgsLen("isascii", arguments.length - 1, 0, 0);
    const jsstr = self.$jsstr();
    return new Sk.builtin.bool(ascii_reg.test(jsstr));
});

var islower_reg = /[a-z]/;
var isupper_reg = /[A-Z]/;
export var islower = new Sk.builtin.func(function islower(self) {
    Sk.builtin.pyCheckArgsLen("swapcase", arguments.length, 1, 1);
    const jsstr = self.$jsstr();
    return new Sk.builtin.bool(jsstr.length && islower_reg.test(jsstr) && !isupper_reg.test(jsstr));
});

export var isupper = new Sk.builtin.func(function isupper(self) {
    Sk.builtin.pyCheckArgsLen("swapcase", arguments.length, 1, 1);
    const jsstr = self.$jsstr();
    return new Sk.builtin.bool(jsstr.length && !islower_reg.test(jsstr) && isupper_reg.test(jsstr));
});

export var istitle = new Sk.builtin.func(function istitle(self) {
    // Comparing to str.title() seems the most intuitive thing, but it fails on "",
    // Other empty-ish strings with no change.
    Sk.builtin.pyCheckArgsLen("swapcase", arguments.length, 1, 1);
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
    Sk.builtin.pyCheckArgsLen("swapcase", arguments.length, 1, 1);
    return new Sk.builtin.bool(space_reg.test(self.$jsstr()));
});

var digit_reg = /^\d+$/;
export var isdigit = new Sk.builtin.func(function isdigit(self) {
    Sk.builtin.pyCheckArgsLen("swapcase", arguments.length, 1, 1);
    return new Sk.builtin.bool(digit_reg.test(self.$jsstr()));
});

var numeric_reg = /[^0-9]/;
export var isnumeric = new Sk.builtin.func(function isnumeric(self) {
    Sk.builtin.pyCheckArgsLen("swapcase", arguments.length, 1, 1);
    const jsstr = self.$jsstr();
    return new Sk.builtin.bool(jsstr.length && !numeric_reg.test(jsstr));
});

var alpha_reg = /[^a-zA-Z]/;
export var isalpha = new Sk.builtin.func(function isalpha(self) {
    Sk.builtin.pyCheckArgsLen("swapcase", arguments.length, 1, 1);
    const jsstr = self.$jsstr();
    return new Sk.builtin.bool(jsstr.length && !alpha_reg.test(jsstr));
});

var alnum_reg = /[^a-zA-Z0-9]/;
export var isalnum = new Sk.builtin.func(function isalnum(self) {
    Sk.builtin.pyCheckArgsLen("swapcase", arguments.length, 1, 1);
    const jsstr = self.$jsstr();
    return new Sk.builtin.bool(jsstr.length && !alnum_reg.test(jsstr));
});

export var isidentifier = new Sk.builtin.func(function isidentifier() {});

export var isprintable = new Sk.builtin.func(function isprintable() {});

export var zfill = new Sk.builtin.func(function zfill() {});

export var format = new Sk.builtin.func(function format() {});

export var format_map = new Sk.builtin.func(function format_map() {});

export var __format__ = new Sk.builtin.func(function __format__() {});

export var __sizeof__ = new Sk.builtin.func(function __sizeof__() {});

export var __getnewargs__ = new Sk.builtin.func(function __getnewargs__() {});
