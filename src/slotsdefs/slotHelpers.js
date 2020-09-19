/**
 * @memberof Sk.slots
 * @member subSlots
 * @description
 * See the source code for a full list of slots split into apprpriate categories
 */
export const subSlots = {
    main_slots: {
        // nb we handle tp$new differently
        // tp_slots
        tp$init: "__init__",
        tp$call: "__call__",
        $r: "__repr__",
        // tp$hash: "__hash__", // do tp$hash separately since it could be None
        tp$str: "__str__",

        // getattribute, setattr, delattr
        tp$getattr: "__getattribute__",
        tp$setattr: ["__setattr__", "__delattr__"],

        // tp$richcompare
        ob$eq: "__eq__",
        ob$ne: "__ne__",
        ob$lt: "__lt__",
        ob$le: "__le__",
        ob$gt: "__gt__",
        ob$ge: "__ge__",

        // getters and setters
        tp$descr_get: "__get__",
        tp$descr_set: ["__set__", "__delete__"],

        // iter
        tp$iter: "__iter__",
        tp$iternext: "__next__",
    },

    number_slots: {
        nb$abs: "__abs__",
        nb$negative: "__neg__",
        nb$positive: "__pos__",
        nb$int_: "__int__",
        nb$lng: "__long__",
        nb$float_: "__float__",
        nb$add: "__add__",
        nb$reflected_add: "__radd__",
        nb$inplace_add: "__iadd__",
        nb$subtract: "__sub__",
        nb$reflected_subtract: "__rsub__",
        nb$inplace_subtract: "__isub__",
        nb$multiply: "__mul__",
        nb$reflected_multiply: "__rmul__",
        nb$inplace_multiply: "__imul__",
        nb$floor_divide: "__floordiv__",
        nb$reflected_floor_divide: "__rfloordiv__",
        nb$inplace_floor_divide: "__ifloordiv__",
        nb$invert: "__invert__",
        nb$remainder: "__mod__",
        nb$reflected_remainder: "__rmod__",
        nb$inplace_remainder: "__imod__",
        nb$divmod: "__divmod__",
        nb$reflected_divmod: "__rdivmod__",
        nb$power: "__pow__",
        nb$reflected_power: "__rpow__",
        nb$inplace_power: "__ipow__",
        nb$divide: "__truediv__", // TODO: think about py2 vs py3 truediv vs div
        nb$reflected_divide: "__rtruediv__",
        nb$inplace_divide: "__itruediv__",

        nb$bool: "__bool__",

        nb$and: "__and__",
        nb$reflected_and: "__rand__",
        nb$inplace_and: "__iand__",
        nb$or: "__or__",
        nb$reflected_or: "__ror__",
        nb$inplace_or: "__ior__",
        nb$xor: "__xor__",
        nb$reflected_xor: "__rxor__",
        nb$inplace_xor: "__ixor__",

        nb$lshift: "__lshift__",
        nb$reflected_lshift: "__rlshift__",
        nb$rshift: "__rshift__",
        nb$reflected_rshift: "__rrshift__",
        nb$inplace_lshift: "__ilshift__",
        nb$inplace_rshift: "__irshift__",

        nb$matrix_multiply: "__matmul__",
        nb$reflected_matrix_multiply: "__rmatmul__",
        nb$inplace_matrix_multiply: "__imatmul__",
    },

    sequence_and_mapping_slots: {
        // sequence and mapping slots
        sq$length: "__len__",
        sq$contains: "__contains__",
        mp$subscript: "__getitem__",
        mp$ass_subscript: ["__setitem__", "__delitem__"],
        nb$add: "__add__",
        nb$multiply: "__mul__",
        nb$reflected_multiply: "__rmul__",
        nb$inplace_add: "__iadd__",
        nb$inplace_multiply: "__imul__",
    },
};

export const reflectedNumberSlots = {
    nb$add: { reflected: "nb$reflected_add" },
    nb$subtract: {
        reflected: "nb$reflected_subtract",
        slot: function (other) {
            if (other instanceof this.constructor) {
                return other.nb$subtract(this);
            }
            return Sk.builtin.NotImplemented.NotImplemented$;
        },
    },
    nb$multiply: { reflected: "nb$reflected_multiply" },
    nb$divide: {
        reflected: "nb$reflected_divide",
        slot: function (other) {
            if (other instanceof this.constructor) {
                return other.nb$divide(this);
            }
            return Sk.builtin.NotImplemented.NotImplemented$;
        },
    },
    nb$floor_divide: {
        reflected: "nb$reflected_floor_divide",
        slot: function (other) {
            if (other instanceof this.constructor) {
                return other.nb$floor_divide(this);
            }
            return Sk.builtin.NotImplemented.NotImplemented$;
        },
    },
    nb$remainder: {
        reflected: "nb$reflected_remainder",
        slot: function (other) {
            if (other instanceof this.constructor) {
                return other.nb$remainder(this);
            }
            return Sk.builtin.NotImplemented.NotImplemented$;
        },
    },
    nb$divmod: {
        reflected: "nb$reflected_divmod",
        slot: function (other) {
            if (other instanceof this.constructor) {
                return other.nb$divmod(this);
            }
            return Sk.builtin.NotImplemented.NotImplemented$;
        },
    },
    nb$power: {
        reflected: "nb$reflected_power",
        slot: function (other, mod) {
            if (other instanceof this.constructor) {
                return other.nb$power(this, mod);
            }
            return Sk.builtin.NotImplemented.NotImplemented$;
        },
    },
    nb$and: { reflected: "nb$reflected_and" },
    nb$or: { reflected: "nb$reflected_or" },
    nb$xor: { reflected: "nb$reflected_xor" },
    nb$lshift: {
        reflected: "nb$reflected_lshift",
        slot: function (other) {
            if (other instanceof this.constructor) {
                return other.nb$lshift(this);
            }
            return Sk.builtin.NotImplemented.NotImplemented$;
        },
    },
    nb$rshift: {
        reflected: "nb$reflected_rshift",
        slot: function (other) {
            if (other instanceof this.constructor) {
                return other.nb$rshift(this);
            }
            return Sk.builtin.NotImplemented.NotImplemented$;
        },
    },
    nb$matrix_multiply: {
        reflected: "nb$reflexted_matrix_multiply",
        slot: function (other) {
            if (other instanceof this.constructor) {
                return other.nb$matrix_multiply(this);
            }
            return Sk.builtin.NotImplemented.NotImplemented$;
        },
    },
};


export const sequenceAndMappingSlots = {
    sq$concat: ["nb$add"],
    sq$repeat: ["nb$multiply", "nb$reflected_multiply"],
    mp$length: ["sq$length"],
    sq$inplace_repeat: ["nb$inplace_multiply"],
    sq$inplace_concat: ["nb$inplace_add"],
};