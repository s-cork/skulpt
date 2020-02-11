/**
 * @constructor
 * @param {number} start
 * @param {number} stop
 * @param {number} step
 */

var _range_gen = function ($gen) {
    const start = $gen.gi$locals.start;
    const step = $gen.gi$locals.step;
    const stop = $gen.gi$locals.stop;
    const compare = step.nb$ispositive() ? Sk.misceval.isTrue(start.ob$lt(stop)) : Sk.misceval.isTrue(start.ob$gt(stop));
    if (compare) {
        try {
            return [ /*resume*/ , /*ret*/ start];
        } finally {
            $gen.gi$locals.start = start.nb$add(step);
        }
    }
    return [ /*resume*/ , /*ret*/ ];
};
_range_gen.co_varnames = ["start", "stop", "step"];


Sk.builtin.range_ = function (start, stop, step) {
    if (!(this instanceof Sk.builtin.range_)) {
        return new Sk.builtin.range_(start, stop, step);
    }
    this.$pystart = typeof start === "number" ? Sk.builtin.int_(start) : Sk.builtin.lng(start);
    this.$pystop = typeof stop === "number" ? Sk.builtin.int_(stop) : Sk.builtin.lng(stop);
    this.$pystep = typeof step === "number" ? Sk.builtin.int_(step) : Sk.builtin.lng(step);
    debugger
    // this.v = new Sk.builtin.generator(_range_gen, undefined, [pystart, pystop, pystep]);
    this.$start = start;
    this.$stop = stop;
    this.$step = step;


    this.$r = function () {
        var name = "range(" + this.$start + ", " + this.$stop;
        if (this.$step != 1) {
            name += ", " + this.$step;
        }
        name += ")";
        return new Sk.builtin.str(name);
    };
    return this;
};

Sk.abstr.setUpInheritance("range", Sk.builtin.range_, Sk.builtin.object);

Sk.builtin.range_.prototype.__class__ = Sk.builtin.range_;

Sk.builtin.range_.prototype.mp$subscript = function (index) {
    let start, stop, step;
    debugger;
    if (index instanceof Sk.builtin.slice) {
        if (Sk.builtin.checkNone(index.start)) {
            start = this.$start;
        } else if (index.start.v < this.$start) {
            start = this.$start;
        } else {
            start = this.$start + Sk.misceval.asIndex(index.start) * this.$step;
            if (start > this.$stop) {
                start = this.$stop;
            }
        }
        debugger;
        if (Sk.builtin.checkNone(index.stop)) {
            stop = this.$stop;
        } else if (Sk.misceval.asIndex(index.stop) > this.$stop) {
            stop = this.$stop;
        } else {
            stop = this.$start + Sk.misceval.asIndex(index.stop) * this.$step;
            if (stop < this.$start) {
                start = this.$start;
            }
        }

        if (Sk.builtin.checkNone(index.step)) {
            // Implied 1
            step = 1;
        } else {
            step = Sk.misceval.asIndex(index.step);
        }
        // Scale by range's current step
        step = step * this.$step;

        pystart = typeof start === "number" ? Sk.builtin.int_(start) : Sk.builtin.lng(start);
        pystop = typeof stop === "number" ? Sk.builtin.int_(stop) : Sk.builtin.lng(stop);
        pystep = typeof step === "number" ? Sk.builtin.int_(step) : Sk.builtin.lng(step);

        return new Sk.builtin.range_(start, stop, step);
    }
    const max = this.$step > 0 ? this.$stop : this.$start;
    const min = this.$step > 0 ? this.$start : this.$stop;
    index = Sk.misceval.asIndex(index);
    if (index >= 0) {
        val = this.$start + index * this.$step; 
    } else {
        val = this.$stop + index * this.$step; 
    }
    if (val >= min && val <= max) {
        return val;
    }
    else { throw new Sk.builtin.IndexError("range object index out of range")}
};

Sk.builtin.range_.prototype.__getitem__ = new Sk.builtin.func(function (self, index) {
    return Sk.builtin.range_.prototype.mp$subscript.call(self, index);
});

Sk.builtin.range_.prototype.sq$contains = function (item) {
    debugger
    const max = this.$step > 0 ? this.$stop - 1 : this.$start;
    const min = this.$step > 0 ? this.$start : this.$stop + 1;
    item = Sk.builtin.asnum$(item);
    if (!Number.isInteger(item)){
        return Sk.builtin.bool.false$;
    }
    
    return Sk.builtin.bool(Number.isInteger((item - this.$start)/this.$step) && item <= max && item >= min);
};

Sk.builtin.range_.prototype.sq$length = function () {
    const max = this.$step > 0 ? this.$stop : this.$start;
    const min = this.$step > 0 ? this.$start : this.$stop;
    debugger;
    if (typeof max === "number" && typeof min === "number") {
        let len = max - min;
    if (len <= 0) {
        return new Sk.builtin.int_(0);
    }
    len = Math.ceil(len / Math.abs(this.$step))
    return new Sk.builtin.int_(len)
    }
    else {
        throw new Sk.builtin.OverflowError("too large for now")
    }
    
};

// Sk.builtin.range_.prototype.tp$richcompare = function (w, op) {
//     if (this.$as_list instanceof Sk.builtin.generator) {
//         this.$as_list = Sk.builtin.list(this.$as_list);
//     };
//     if (w.__class__ == Sk.builtin.range_) {
//         if (w.$as_list instanceof Sk.builtin.generator) {
//             w.$as_list = Sk.builtin.list(w.$as_list);
//         };
//         w = w.$as_list;
//     }
//     return this.$as_list.tp$richcompare(w, op);
// };

Sk.builtin.range_.prototype.tp$iter = function () {
    // Hijack the generator iterator - must create a new instance of a genearator here
    debugger
    let iter = new Sk.builtin.generator(_range_gen, undefined, [this.$pystart,this.$pystop,this.$pystep]).tp$iter();
    iter.$r = function () {
        return new Sk.builtin.str("<rangeiterator>");
    };
    debugger
    return iter;
};

Sk.builtin.range_.prototype.__iter__ = new Sk.builtin.func(function (self) {
    Sk.builtin.pyCheckArgsLen("__iter__", arguments.length, 1, 1);
    return self.tp$iter();
});

Sk.builtin.range_.prototype.__contains__ = new Sk.builtin.func(function (self, item) {
    Sk.builtin.pyCheckArgsLen("__contains__", arguments.length, 2, 2);
    return new Sk.builtin.bool(self.sq$contains(item));
});

// Sk.builtin.range_.prototype["index"] = new Sk.builtin.func(function (self, item, start, stop) {
//     Sk.builtin.pyCheckArgsLen("index", arguments.length, 2, 4);
//     if (self.$as_list instanceof Sk.builtin.generator) {
//         self.$as_list = Sk.builtin.list(self.$as_list);
//     };
//     return Sk.misceval.callsimArray(self.$as_list.index, [self.$as_list, item, start, stop]);
// });

// Sk.builtin.range_.prototype["count"] = new Sk.builtin.func(function (self, item) {
//     Sk.builtin.pyCheckArgsLen("count", arguments.length, 2, 2);
//     if (self.$as_list instanceof Sk.builtin.generator) {
//         self.$as_list = Sk.builtin.list(self.$as_list);
//     };
//     return Sk.misceval.callsimArray(self.$as_list.count, [self.$as_list, item]);
// });
