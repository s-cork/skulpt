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
    debugger
    this.$jstart = Sk.builtin.asnum$(start);
    this.$jstop = Sk.builtin.asnum$(stop);
    this.$jstep = Sk.builtin.asnum$(step);
    this.$start = start;
    this.$stop = stop;
    this.$step = step;

    this.$r = function () {
        var name = "range(" + this.$jstart + ", " + this.$jstop;
        if (this.$jstep != 1) {
            name += ", " + this.$jstep;
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
    const compare = {too_lo: this.$step.nb$isnegative() ? "ob$gt" : "ob$lt",
    too_hi: this.$step.nb$isnegative()? "ob$lt" : "ob$gt"}
    debugger;

    if (index instanceof Sk.builtin.slice) {
        [start, stop, step] = [index.start, index.stop, index.step];

        if (Sk.builtin.checkNone(start)) {
            start = this.$start;
        } else if (start.nb$isnegative()) {
            start = this.$stop.nb$add(this.$step.nb$multiply(start));
            if (start[compare.too_lo](this.$start).v) {
                start = this.$start;
            }
        } else {
            start = this.$start.nb$add(this.$step.nb$multiply(start));
            if (start[compare.too_hi](this.$stop).v) {
                start = this.$stop;
            }
        }

        if (Sk.builtin.checkNone(stop)) {
            stop = this.$stop;
        } else if (stop.nb$isnegative()) {
            stop = this.$stop.nb$add(this.$step.nb$multiply(stop));
            if (stop[compare.too_lo](this.$start).v) {
                stop = this.$start;
            } 
        } else {
            stop = this.$start.nb$add(this.$step.nb$multiply(stop));
            if (stop[compare.too_hi](this.$stop).v) {
                stop = this.$stop;
            }
        }

        if (Sk.builtin.checkNone(step)) {
            // Implied 1
            step = Sk.builtin.int_(1);
        }
        // Scale by range's current step
        step = step.nb$multiply(this.$step);
        return new Sk.builtin.range_(start, stop, step);
    };

    debugger;
    const max = this.$step.nb$ispositive() ? this.$stop : this.$start;
    const min = this.$step.nb$ispositive() ? this.$start : this.$stop;
    if (index.nb$isnegative()) {
        val = this.$stop.nb$add(index.nb$multiply(this.$step)); 
    } else {
        val = this.$start.nb$add(index.nb$multiply(this.$step)); 
    }
    if (val.ob$ge(min).v && val.ob$le(max).v) {
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
    const max = this.$step.nb$ispositive() ? this.$stop : this.$start;
    const min = this.$step.nb$ispositive() ? this.$start : this.$stop;
    debugger;
    let len = max.nb$subtract(min);

    if (len.nb$isnegative() || len.v === 0) {
        return new Sk.builtin.int_(0);
    }
    const abs_step = this.$step.nb$isnegative() ? this.$step.nb$negative() : this.$step;
    const remainder =  len.nb$remainder(abs_step);
    len = len.nb$floor_divide(abs_step);
    len = remainder.nb$nonzero() ? len.nb$add(Sk.builtin.int_(1)) : len;
    return len;
    
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
    let iter = new Sk.builtin.generator(_range_gen, undefined, [this.$start,this.$stop,this.$step]).tp$iter();
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
