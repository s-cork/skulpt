import { pyInt, pyStr, objectIsTrue, buildNativeClass, checkNoKwargs, checkArgsLen } from "../internal";

/**
 * @constructor
 * pyBool
 *
 * @description
 * Constructor for Python bool. Also used for builtin bool() function.
 *
 * Where possible, do not create a new instance but use the constants
 * pyBool.true$ or pyBool.false$. These are defined in src/constant.js
 *
 * @extends {pyInt}
 *
 * @param  {(Object|number|boolean)} x Value to evaluate as true or false
 * @return {pyBool} pyBool.true$ if x is true, pyBool.false$ otherwise
 */
export var pyBool = buildNativeClass("bool", {
    constructor: function pyBool(x) {
        return objectIsTrue(x) ? pyTrue : pyFalse;
    },
    base: pyInt,
    slots: {
        tp$doc:
            "bool(x) -> bool\n\nReturns True when the argument x is true, False otherwise.\nThe builtins True and False are the only two instances of the class bool.\nThe class bool is a subclass of the class int, and cannot be subclassed.",
        tp$new(args, kwargs) {
            checkNoKwargs("bool", kwargs);
            checkArgsLen("bool", args, 0, 1);
            return objectIsTrue(args[0]) ? pyTrue : pyFalse;
        },
        $r() {
            return this.v ? this.str$True : this.str$False;
        },
        tp$as_number: true,
        nb$and(other) {
            if (other === pyTrue || other === pyFalse) {
                return this.v & other.v ? pyTrue : pyFalse;
            }
            return pyInt.prototype.nb$and.call(this, other);
        },
        nb$or(other) {
            if (other === pyTrue || other === pyFalse) {
                return this.v | other.v ? pyTrue : pyFalse;
            }
            return pyInt.prototype.nb$or.call(this, other);
        },
        nb$xor(other) {
            if (other === pyTrue || other === pyFalse) {
                return this.v ^ other.v ? pyTrue : pyFalse;
            }
            return pyInt.prototype.nb$xor.call(this, other);
        },
    },
    methods: {
        __format__: {
            $meth() {
                return this.$r();
            },
            $flags: { OneArg: true },
        },
    },
    flags: {
        sk$acceptable_as_base_class: false,
    },
    proto: {
        str$False: new pyStr("False"),
        str$True: new pyStr("True"),
        valueOf() {
            return Boolean(this.v);
        },
    },
});

/**
 * Python bool True constant.
 * @constant
 */
export const pyTrue = /** @constant */ (Object.create(pyBool.prototype, {
    v: { value: 1, enumerable: true },
}));

/**
 * Python bool False constant.
 * @constant
 */
export const pyFalse = /**@constant*/ (Object.create(pyBool.prototype, {
    v: { value: 0, enumerable: true },
}));
