



Sk.misceval.softspace_ = false;
Sk.misceval.print_ = function (x) {
    var s;

    function isspace(c) {
        return c === "\n" || c === "\t" || c === "\r";
    }

    if (Sk.misceval.softspace_) {
        if (x !== "\n") {
            Sk.output(" ");
        }
        Sk.misceval.softspace_ = false;
    }

    s = new Sk.builtin.str(x);

    return Sk.misceval.chain(
        Sk.importModule("sys", false, true),
        function (sys) {
            return Sk.misceval.apply(sys["$d"]["stdout"]["write"], undefined, undefined, undefined, [sys["$d"]["stdout"], s]);
        },
        function () {
            if (s.v.length === 0 || !isspace(s.v[s.v.length - 1]) || s.v[s.v.length - 1] === " ") {
                Sk.misceval.softspace_ = true;
            }
        }
    );
};
Sk.exportSymbol("Sk.misceval.print_", Sk.misceval.print_);