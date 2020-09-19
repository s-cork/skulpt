import {
    buildNativeClass,
    pyStr,
    pyObject,
    pyExc,
    pyList,
    pyNone,
    pyMappingProxy,
    pyCallOrSuspend,
    arrayFromIterable,
    checkString,
    checkNone,
    checkMapping,
    retryOptionalSuspensionOrThrow,
    keywordArrayToNamedArgs,
    genericSetAttr,
    genericNew,
    objectRepr,
} from "../internal";

/**@typedef {pyObject} */

/**
 * @constructor
 * @extends {pyObject}
 */
export var pyModule = buildNativeClass("module", {
    constructor: function module_() {
        this.$d = {}; // set this now - we could subclass from Module so override sk$klass $d object
    },
    slots: {
        tp$doc: "Create a module object.\n\nThe name must be a string; the optional doc argument can have any type.",
        tp$getattr(pyName, canSuspend) {
            const jsMangled = pyName.$mangled;
            const ret = this.$d[jsMangled];
            if (ret !== undefined) {
                return ret;
            }
            // technically this is the wrong way round but its seems performance wise better
            // to just return the module elements before checking for descriptors
            const descr = this.ob$type.$typeLookup(pyName);
            if (descr !== undefined) {
                const f = descr.tp$descr_get;
                if (f) {
                    return f.call(descr, this, this.ob$type, canSuspend);
                }
                return descr;
            }
            // ok we've failed to find anything check if there is __getattr__ defined as per pep 562
            const getattr = this.$d.__getattr__;
            if (getattr !== undefined) {
                const res = pyCallOrSuspend(getattr, [pyName]);
                return canSuspend ? res : retryOptionalSuspensionOrThrow(res);
            }
        },
        tp$setattr: genericSetAttr,
        tp$new: genericNew,
        tp$init(args, kwargs) {
            const [name, doc] = keywordArrayToNamedArgs("module", ["name", "doc"], args, kwargs, [pyNone]);
            pyCheckType("module", "string", checkString(name));
            this.init$dict(name, doc);
            return pyNone;
        },
        $r() {
            let name = this.get$name();
            if (name !== undefined) {
                const module_reprf = this.get$mod_reprf();
                if (module_reprf !== undefined) {
                    return pyCallOrSuspend(module_reprf, [this]);
                }
            }
            name = name === undefined ? "'?'" : name;
            let extra = this.from$file();
            extra = extra === undefined ? this.empty_or$loader() : extra;
            return new pyStr("<module " + name + extra + ">");
        },
    },
    getsets: {
        __dict__: {
            $get () {
                // modules in skulpt have a $d as a js object so just return it as a mapping proxy;
                // TODO we should really have a dict object
                return new pyMappingProxy(this.$d);
            },
        },
    },
    methods: {
        __dir__: {
            $meth() {
                // could be cleaner but this is inline with cpython's version
                const dict = this.tp$getattr(pyStr.$dict);
                if (!checkMapping(dict)) {
                    throw new pyExc.TypeError("__dict__ is not a dictionary");
                }
                const dirfunc = dict.mp$lookup(pyStr.$dir);
                if (dirfunc !== undefined) {
                    return pyCallOrSuspend(dirfunc, []);
                } else {
                    return new pyList(arrayFromIterable(dict));
                }
            },
            $flags: { NoArgs: true },
            $doc: "__dir__() -> list\nspecialized dir() implementation",
        },
    },
    proto: {
        init$dict(name, doc) {
            this.$d.__name__ = name;
            this.$d.__doc__ = doc;
            this.$d.__package__ = pyNone;
            this.$d.__spec__ = pyNone;
            this.$d.__loader__ = pyNone;
        },
        sk$attrError() {
            const name = this.get$name();
            return name === undefined ? "module" : "module " + name;
        },
        get$name() {
            const name = this.tp$getattr(pyStr.$name);
            return name && objectRepr(name);
        },
        from$file() {
            const file = this.tp$getattr(pyStr.$file);
            return file && " from " + objectRepr(file);
        },
        empty_or$loader() {
            if (this.$js && this.$js.includes("$builtinmodule")) {
                return " (built-in)";
            }
            const loader = this.tp$getattr(pyStr.$loader);
            return loader === undefined || checkNone(loader) ? "" : " (" + objectRepr(loader) + ")";
        },
        get$mod_reprf() {
            const loader = this.tp$getattr(pyStr.$loader);
            return loader && loader.tp$getattr(this.str$mod_repr);
        },
        str$mod_repr: new pyStr("module_repr"),
    },
});
