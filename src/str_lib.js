export function title() {
    const jsstr = this.$jsstr();
    const ret = jsstr.replace(/[a-z][a-z]*/gi, function (str) {
        return str[0].toUpperCase() + str.substr(1).toLowerCase();
    });
    return this.$fromBinaryString(ret);
}

export function isalpha() {
    const jsstr = this.$jsstr();
    return new Sk.builtin.bool(jsstr.length && !/[^a-zA-Z]/.test(jsstr));
}

export function isalnum() {
    const jsstr = this.$jsstr();
    return new Sk.builtin.bool(jsstr.length && !/[^a-zA-Z0-9]/.test(jsstr));
}

export function isdigit() {
    return new Sk.builtin.bool(/^\d+$/.test(this.$jsstr()));
}

export function islower() {
    const jsstr = this.$jsstr();
    return new Sk.builtin.bool(jsstr.length && /[a-z]/.test(jsstr) && !/[A-Z]/.test(jsstr));
}

export function isspace() {
    return new Sk.builtin.bool( /^\s+$/.test(this.$jsstr()));
}

export function isupper() {
    const jsstr = this.$jsstr();
    return new Sk.builtin.bool(jsstr.length && !/[a-z]/.test(jsstr) && /[A-Z]/.test(jsstr));
}

export function istitle() {
    // Comparing to str.title() seems the most intuitive thing, but it fails on "",
    // Other empty-ish strings with no change.
    const input = this.$jsstr();
    let cased = false;
    let previous_is_cased = false;
    let ch;
    for (let pos = 0; pos < input.length; pos++) {
        ch = input.charAt(pos);
        if (!/[a-z]/.test(ch) && /[A-Z]/.test(ch)) {
            if (previous_is_cased) {
                return new Sk.builtin.bool(false);
            }
            previous_is_cased = true;
            cased = true;
        } else if (/[a-z]/.test(ch) && !/[A-Z]/.test(ch)) {
            if (!previous_is_cased) {
                return new Sk.builtin.bool(false);
            }
            cased = true;
        } else {
            previous_is_cased = false;
        }
    }
    return new Sk.builtin.bool(cased);
}

export function isnumeric() {
    const jsstr = this.$jsstr();
    return new Sk.builtin.bool(jsstr.length && !/[^0-9]/.test(jsstr));
}

export function swapcase() {
    const jsstr = this.$jsstr();
    const ret = jsstr.replace(/[a-z]/gi, function (c) {
        const lc = c.toLowerCase();
        return lc === c ? c.toUpperCase() : lc;
    });
    return this.$fromBinaryString(ret);
}

export function expandtabs(tabsize) {
    if (tabsize === undefined) {
        tabsize = 8;
    } else if (Sk.builtin.checkInt(tabsize)) {
        tabsize = Sk.builtin.asnum$(tabsize);
    } else {
        throw new Sk.builtin.TypeError("integer argument expected, got " + Sk.abstr.typeName(tabsize));
    }
    let spaces = new Array(tabsize + 1).join(" ");
    const expanded = this.$jsstr().replace(/([^\r\n\t]*)\t/g, function (a, b) {
        return b + spaces.slice(b.length % tabsize);
    });
    return this.$fromBinaryString(expanded);
}


