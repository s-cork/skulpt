/**
 *
 *
 * @member Sk.dunderToSkulpt
 *
 * Maps Python dunder names to the Skulpt Javascript function names that
 * implement them.
 *
 * Note: __add__, __mul__, and __rmul__ can be used for either numeric or
 * sequence types. Here, they default to the numeric versions (i.e. nb$add,
 * nb$multiply, and nb$reflected_multiply). This works because Sk.abstr.numberBinOp
 * checks for the numeric shortcuts and not the sequence shortcuts when computing
 * a binary operation.
 *
 * Because many of these functions are used in contexts in which Skulpt does not
 * [yet] handle suspensions, the assumption is that they must not suspend. However,
 * some of these built-in functions are acquiring "canSuspend" arguments to signal
 * where this is not the case. These need to be spliced out of the argument list before
 * it is passed to python. Array values in this map contain [dunderName, argumentIdx],
 * where argumentIdx specifies the index of the "canSuspend" boolean argument.
 *
 * @description
 * A mapping of dunder names to skulpt slots
 *
 * @type {Object}
 */
export const dunderToSkulpt = {
    __repr__: "$r",
    __str__: "tp$str",
    __init__: "tp$init",
    __new__: "tp$new",
    __hash__: "tp$hash",
    __call__: "tp$call",
    __iter__: "tp$iter",
    __next__: "tp$iternext",

    __eq__: "ob$eq",
    __ne__: "ob$ne",
    __lt__: "ob$lt",
    __le__: "ob$le",
    __gt__: "ob$gt",
    __ge__: "ob$ge",

    __abs__: "nb$abs",
    __neg__: "nb$negative",
    __pos__: "nb$positive",
    __int__: "nb$int_",
    __float__: "nb$float_",

    __add__: "nb$add",
    __radd__: "nb$reflected_add",
    __iadd__: "nb$inplace_add",
    __sub__: "nb$subtract",
    __rsub__: "nb$reflected_subtract",
    __isub__: "nb$inplace_subtract",
    __mul__: "nb$multiply",
    __rmul__: "nb$reflected_multiply",
    __imul__: "nb$inplace_multiply",
    __truediv__: "nb$divide",
    __rtruediv__: "nb$reflected_divide",
    __itruediv__: "nb$inplace_divide",
    __floordiv__: "nb$floor_divide",
    __rfloordiv__: "nb$reflected_floor_divide",
    __ifloordiv__: "nb$inplace_floor_divide",
    __invert__: "nb$invert",
    __mod__: "nb$remainder",
    __rmod__: "nb$reflected_remainder",
    __imod__: "nb$inplace_remainder",
    __divmod__: "nb$divmod",
    __rdivmod__: "nb$reflected_divmod", //no inplace divmod
    __pow__: "nb$power",
    __rpow__: "nb$reflected_power",
    __ipow__: "nb$inplace_power",

    __bool__: "nb$bool",
    // py2 only
    __long__: "nb$lng",

    __lshift__: "nb$lshift",
    __rlshift__: "nb$reflected_lshift",
    __ilshift__: "nb$inplace_lshift",
    __rshift__: "nb$rshift",
    __rrshift__: "nb$reflected_rshift",
    __irshift__: "nb$inplace_rshift",

    __and__: "nb$and",
    __rand__: "nb$reflected_and",
    __iand__: "nb$inplace_and",
    __or__: "nb$or",
    __ror__: "nb$reflected_or",
    __ior__: "nb$inplace_or",
    __xor__: "nb$xor",
    __rxor__: "nb$reflected_xor",
    __ixor__: "nb$inplace_xor",

    __matmul__: "nb$matrix_multiply",
    __rmatmul__: "nb$reflected_matrix_multiply",
    __imatmul__: "nb$inplace_matrix_multiply",

    __get__: "tp$descr_get",
    __set__: "tp$descr_set",
    __delete__: "tp$descr_set",

    __getattribute__: "tp$getattr",
    __getattr__: "tp$getattr",
    __setattr__: "tp$setattr",
    __delattr__: "tp$setattr",

    __len__: "sq$length",
    __contains__: "sq$contains",
    __getitem__: "mp$subscript",
    __setitem__: "mp$ass_subscript",
    __delitem__: "mp$ass_subscript",
};
