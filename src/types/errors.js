import {
    buildNativeClass,
    pyStr,
    pyTuple,
    pyDict,
    pyNone,
    typeName,
    genericGetAttr,
    genericGetSetDict,
    checkString,
    checkNoKwargs,
    objectRepr,
} from "../internal";

/*
 * The filename, line number, and column number of exceptions are
 * stored within the exception object.  Note that not all exceptions
 * clearly report the column number.  To customize the exception
 * message to use any/all of these fields, you can either modify
 * tp$str below to print the desired message, or use them in the
 * skulpt wrapper (i.e., runit) to present the exception message.
 */

/**
 * @constructor
 * @param {*=} args Typically called with a single string argument
 */
var BaseException = buildNativeClass("BaseException", {
    constructor: function BaseException(...args) {
        // internally args is either a string
        if (!(this instanceof BaseException)) {
            throw new TypeError("bad call to exception constructor use 'new'");
        }
        // for all internal calls only the first argument is included in args
        let arg = args[0];
        if (typeof arg === "string") {
            arg = new pyStr(arg);
        }
        this.args = new pyTuple(arg ? [arg] : []);
        this.traceback = [];
        this.$d = new pyDict();

        if (args.length >= 3) {
            // For errors occurring during normal execution, the line/col/etc
            // of the error are populated by each stack frame of the runtime code,
            // but we can seed it with the supplied parameters.
            this.traceback.push({
                lineno: args[2],
                filename: args[1] || "<unknown>",
            });
        }
    },
    slots: /**@lends {BaseException}*/ {
        tp$getattr: genericGetAttr,
        tp$doc: "Common base class for all exceptions",
        tp$new: function (args, kwargs) {
            if (!this.hp$type) {
                // then we have a builtin constructor so just return it as new this
                return new this.constructor();
            } else {
                const instance = new this.constructor();
                BaseException.call(instance);
                return instance;
            }
        },
        tp$init: function (args, kwargs) {
            checkNoKwargs(typeName(this), kwargs);
            this.args = new pyTuple(args); // reset args in __init__ method
            return pyNone;
        },
        $r: function () {
            let ret = this.tp$name;
            ret += "(" + this.args.v.map((x) => objectRepr(x)).join(", ") + ")";
            return new pyStr(ret);
        },
        tp$str: function () {
            if (this.args.v.length <= 1) {
                return new pyStr(this.args.v[0]);
            }
            return this.args.$r();
        },
    },
    getsets: /**@lends {BaseException}*/ {
        args: {
            $get: function () {
                return this.args;
            },
        },
        __dict__: genericGetSetDict,
    },
    proto: /**@lends {BaseException}*/ {
        toString: function () {
            let ret = this.tp$name;
            ret += ": " + this.tp$str().v;

            if (this.traceback.length !== 0) {
                ret += " on line " + this.traceback[0].lineno;
            } else {
                ret += " at <unknown>";
            }

            // if (this.args.v.length > 4) {
            //     ret += "\n" + this.args.v[4].v + "\n";
            //     for (let i = 0; i < this.args.v[3]; ++i) {
            //         ret += " ";
            //     }
            //     ret += "^\n";
            // }

            /*for (i = 0; i < this.traceback.length; i++) {
                ret += "\n  at " + this.traceback[i].filename + " line " + this.traceback[i].lineno;
                if ("colno" in this.traceback[i]) {
                    ret += " column " + this.traceback[i].colno;
                }
            }*/

            return ret;
        },
    },
});

/**
 * @constructor
 * @extends BaseException
 * @param {*=} args Typically called with a single string argument
 */
var Exception = buildNativeClass("Exception", {
    base: BaseException,
    constructor: function Exception(...args) {
        BaseException.apply(this, args);
    },
});

/**
 * @constructor
 * @extends Exception
 * @param {*=} args Typically called with a single string argument
 */
var AssertionError = buildNativeClass("AssertionError", {
    base: Exception,
    constructor: function AssertionError(...args) {
        Exception.apply(this, args);
    },
});

/**
 * @constructor
 * @extends Exception
 * @param {*=} args Typically called with a single string argument
 */
var AttributeError = buildNativeClass("AttributeError", {
    base: Exception,
    constructor: function AttributeError(...args) {
        Exception.apply(this, args);
    },
});
/**
 * @constructor
 * @extends Exception
 * @param {*=} args Typically called with a single string argument
 */
var ImportError = buildNativeClass("ImportError", {
    base: Exception,
    constructor: function ImportError(...args) {
        Exception.apply(this, args);
    },
});
/**
 * @constructor
 * @extends Exception
 * @param {*=} args Typically called with a single string argument
 */
var IndentationError = buildNativeClass("IndentationError", {
    base: Exception,
    constructor: function IndentationError(...args) {
        Exception.apply(this, args);
    },
});
/**
 * @constructor
 * @extends Exception
 * @param {*=} args Typically called with a single string argument
 */
var IndexError = buildNativeClass("IndexError", {
    base: Exception,
    constructor: function IndexError(...args) {
        Exception.apply(this, args);
    },
});

/**
 * @constructor
 * @extends Exception
 * @param {*=} args Typically called with a single string argument
 */
var LookupError = buildNativeClass("LookupError", {
    base: Exception,
    constructor: function LookupError(...args) {
        Exception.apply(this, args);
    },
});

/**
 * @constructor
 * @extends Exception
 * @param {*=} args Typically called with a single string argument
 */
var KeyError = buildNativeClass("KeyError", {
    base: Exception,
    constructor: function KeyError(...args) {
        Exception.apply(this, args);
    },
});
/**
 * @constructor
 * @extends Exception
 * @param {*=} args Typically called with a single string argument
 */
var NameError = buildNativeClass("NameError", {
    base: Exception,
    constructor: function NameError(...args) {
        Exception.apply(this, args);
    },
});
/**
 * @constructor
 * @extends Exception
 * @param {*=} args Typically called with a single string argument
 */
var UnboundLocalError = buildNativeClass("UnboundLocalError", {
    base: Exception,
    constructor: function UnboundLocalError(...args) {
        Exception.apply(this, args);
    },
});
/**
 * @constructor
 * @extends Exception
 * @param {*=} args Typically called with a single string argument
 */
var OverflowError = buildNativeClass("OverflowError", {
    base: Exception,
    constructor: function OverflowError(...args) {
        Exception.apply(this, args);
    },
});

/**
 * @constructor
 * @extends Exception
 * @param {*=} args
 */
var SyntaxError = buildNativeClass("SyntaxError", {
    base: Exception,
    constructor: function SyntaxError(...args) {
        Exception.apply(this, args);
    },
});
/**
 * @constructor
 * @extends Exception
 * @param {*=} args Typically called with a single string argument
 */
var RuntimeError = buildNativeClass("RuntimeError", {
    base: Exception,
    constructor: function RuntimeError(...args) {
        Exception.apply(this, args);
    },
});

/**
 * @constructor
 * @extends Exception
 * @param {*=} args Typically called with a single string argument
 */
var SuspensionError = buildNativeClass("SuspensionError", {
    base: Exception,
    constructor: function SuspensionError(...args) {
        Exception.apply(this, args);
    },
});

/**
 * @constructor
 * @extends BaseException
 * @param {*=} args Typically called with a single string argument
 */
var SystemExit = buildNativeClass("SystemExit", {
    base: BaseException,
    constructor: function SystemExit(...args) {
        BaseException.apply(this, args);
    },
});

/**
 * @constructor
 * @extends Exception
 * @param {*=} args Typically called with a single string argument
 */
var TypeError = buildNativeClass("TypeError", {
    base: Exception,
    constructor: function TypeError(...args) {
        Exception.apply(this, args);
    },
});
/**
 * @constructor
 * @extends Exception
 * @param {*=} args Typically called with a single string argument
 */
var ValueError = buildNativeClass("ValueError", {
    base: Exception,
    constructor: function ValueError(...args) {
        Exception.apply(this, args);
    },
});

/**
 * @constructor
 * @extends Exception
 * @param {*=} args Typically called with a single string argument
 */
var ZeroDivisionError = buildNativeClass("ZeroDivisionError", {
    base: Exception,
    constructor: function ZeroDivisionError(...args) {
        Exception.apply(this, args);
    },
});
/**
 * @constructor
 * @extends Exception
 * @param {*=} args Typically called with a single string argument
 */
var TimeLimitError = buildNativeClass("TimeLimitError", {
    base: Exception,
    constructor: function TimeLimitError(...args) {
        Exception.apply(this, args);
    },
});

/**
 * @constructor
 * @extends Exception
 * @param {*=} args Typically called with a single string argument
 */
var IOError = buildNativeClass("IOError", {
    base: Exception,
    constructor: function IOError(...args) {
        Exception.apply(this, args);
    },
});

/**
 * @constructor
 * @extends Exception
 * @param {*=} args Typically called with a single string argument
 */
var NotImplementedError = buildNativeClass("NotImplementedError", {
    base: Exception,
    constructor: function NotImplementedError(...args) {
        Exception.apply(this, args);
    },
});

/**
 * @constructor
 * @extends Exception
 * @param {*=} args Typically called with a single string argument
 */
var NegativePowerError = buildNativeClass("NegativePowerError", {
    base: Exception,
    constructor: function NegativePowerError(...args) {
        Exception.apply(this, args);
    },
});

/**
 * @constructor
 * @extends Exception
 * @param {*=} args
 */
var ExternalError = buildNativeClass("ExternalError", {
    base: Exception,
    constructor: function ExternalError(...args) {
        this.nativeError = args[0];
        if (!checkString(this.nativeError)) {
            args[0] = this.nativeError.toString();
            if (args[0].startsWith("RangeError: Maximum call")) {
                args[0] = "Maximum call stack size exceeded";
                return new RecursionError(...args);
            }
        }
        Exception.apply(this, args);
    },
});

/**
 * @constructor
 * @extends Exception
 * @param {*=} args Typically called with a single string argument
 */
var RecursionError = buildNativeClass("RecursionError", {
    base: Exception,
    constructor: function RecursionError(...args) {
        RuntimeError.apply(this, args);
    },
});

/**
 * @constructor
 * @extends Exception
 * @param {*=} args Typically called with a single string argument
 */
var OperationError = buildNativeClass("OperationError", {
    base: Exception,
    constructor: function OperationError(...args) {
        Exception.apply(this, args);
    },
});

/**
 * @constructor
 * @extends Exception
 * @param {*=} args Typically called with a single string argument
 */
var SystemError = buildNativeClass("SystemError", {
    base: Exception,
    constructor: function SystemError(...args) {
        Exception.apply(this, args);
    },
});

/**
 * @constructor
 * @extends Exception
 * @param {*=} args Typically called with a single string argument
 */
var UnicodeDecodeError = buildNativeClass("UnicodeDecodeError", {
    base: Exception,
    constructor: function UnicodeDecodeError(...args) {
        Exception.apply(this, args);
    },
});

/**
 * @constructor
 * @extends Exception
 * @param {*=} args
 */
var UnicodeEncodeError = buildNativeClass("UnicodeEncodeError", {
    base: Exception,
    constructor: function UnicodeEncodeError(...args) {
        Exception.apply(this, args);
    },
});

/**
 * @constructor
 * @extends Exception
 * @param {*=} args Typically called with a single string argument
 */
var StopIteration = buildNativeClass("StopIteration", {
    base: Exception,
    constructor: function StopIteration(...args) {
        Exception.apply(this, args);
    },
});

// TODO: Extract into sys.exc_info(). Work out how the heck
// to find out what exceptions are being processed by parent stack frames...
function getExcInfo(e) {
    const v = [e.ob$type || pyNone, e, pyNone];

    // TODO create a Traceback object for the third tuple element

    return new pyTuple(v);
}

export const pyExc = {
    BaseException: BaseException,
    Exception: Exception,
    AssertionError: AssertionError,
    AttributeError: AttributeError,
    ImportError: ImportError,
    IndentationError: IndentationError,
    IndexError: IndexError,
    LookupError: LookupError,
    KeyError: KeyError,
    NameError: NameError,
    UnboundLocalError: UnboundLocalError,
    OverflowError: OverflowError,
    SyntaxError: SyntaxError,
    RuntimeError: RuntimeError,
    SuspensionError: SuspensionError,
    SystemExit: SystemExit,
    TypeError: TypeError,
    ValueError: ValueError,
    ZeroDivisionError: ZeroDivisionError,
    TimeLimitError: TimeLimitError,
    IOError: IOError,
    NotImplementedError: NotImplementedError,
    NegativePowerError: NegativePowerError,
    ExternalError: ExternalError,
    RecursionError: RecursionError,
    OperationError: OperationError,
    SystemError: SystemError,
    UnicodeDecodeError: UnicodeDecodeError,
    UnicodeEncodeError: UnicodeEncodeError,
    StopIteration: StopIteration,
    getExcInfo: getExcInfo,
};
