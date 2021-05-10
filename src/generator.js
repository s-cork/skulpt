/**
 * @constructor
 * @param {Function} code javascript code object for the function
 * @param {Object} globals where this function was defined
 * @param {Object} args arguments to the original call (stored into locals for
 * the generator to reenter)
 * @param {Object=} closure dict of free variables
 * @param {Object=} closure2 another dict of free variables that will be
 * merged into 'closure'. there's 2 to simplify generated code (one is $free,
 * the other is $cell)
 *
 * co_varnames and co_name come from generated code, must access as dict.
 */
Sk.builtin.generator = Sk.abstr.buildIteratorClass("generator", {
    constructor: function generator(func, name, qualname) {
        if (!(this instanceof Sk.builtin.generator)) {
            throw new TypeError("bad internal call to generator, use 'new'");
        }
        this.func_code = func.func_code.bind(this);
        this.func_globals = func.func_globals;
        this.func_closure = func.func_closure;
        this.gi$loc = {};
        debugger;

        this.$name = name;
        this.$qualname = qualname;
        this.$value;
        const base_susp = new Sk.misceval.Suspension();
        const data = {
            type: "gen",
            send: Sk.builtin.none.none$,
            throw: null,
        };
        base_susp.resume = () => {
            if (data.throw) {
                debugger;
                if (this.gi$yieldfrom) {
                    // delegate
                    if (this.gi$yieldfrom.susp$data) {
                        this.gi$yieldfrom.susp$data.throw = data.throw;
                    } else {
                        const _throw = this.gi$yieldfrom.tp$getattr(new Sk.builtin.str('throw'));
                        if (_throw !== undefined) {
                            Sk.misceval.callsimArray(_throw, [data.throw.ob$type, data.throw]);
                        }                        
                        throw data.throw;
                    }
                } else {
                    throw data.throw;
                }
            } else if (data.close) {
                if (this.gi$yieldfrom) {
                    // delegate
                    if (this.gi$yieldfrom.susp$data) {
                        this.gi$yieldfrom.susp$data.close = data.close;
                    } else {
                        const _close = this.gi$yieldfrom.tp$getattr(new Sk.builtin.str('close'));
                        if (_close !== undefined) {
                            Sk.misceval.callsimArray(_close);
                        }                        
                        throw data.close
                    }
                } else {
                    throw data.close;
                }

            }
            return data.send;
        };
        base_susp.data = data;
        this.base$susp = base_susp;
        this.susp$data = data;
        this.curr$susp = new Sk.misceval.Suspension(() => this.func_code(this, this.func_closure), base_susp);
        this.gi$running = false;
        this.gi$yieldfrom = null;
        this.gi$closed = false;
    },
    slots: {
        $r() {
            return new Sk.builtin.str("<generator object " + this.$name + ">");
        },
    },
    iternext(canSuspend, yielded) {
        let ret;
        // const self = this;
        if (this.gi$running) {
            throw new Sk.builtin.ValueError("generator already executing");
        } else if (this.gi$closed) {
            this.$value = undefined;
            return undefined;
        }

        this.gi$running = true;
        yielded || (yielded = Sk.builtin.none.none$);
        this.susp$data.send = yielded;

        const nxt = Sk.misceval.tryCatch(
            () =>
                Sk.misceval.chain(this.curr$susp.resume(), (ret) => {
                    Sk.asserts.assert(ret !== undefined);
                    this.gi$running = false;
                    if (Array.isArray(ret)) {
                        this.curr$susp = ret[0];
                        return ret[1];
                    } else {
                        this.$value = ret;
                        this.gi$closed = true;
                        return undefined;
                    }
                }),
            (e) => {
                this.gi$running = false;
                this.gi$closed = true;
                this.gi$yieldfrom = null;
                if (e instanceof Sk.builtin.StopIteration) {
                    // the user wrote this function and so could easily throw a StopIteration
                    this.$value = e.$value;
                    return undefined;
                }
                throw e;
            }
        );

        return canSuspend ? nxt : Sk.misceval.retryOptionalSuspensionOrThrow(nxt);

        return (function finishIteration(ret) {
            Sk.asserts.assert(ret !== undefined);
            if (Array.isArray(ret)) {
                debugger;
                self.$susp = ret[0];
                ret = ret[1];
            } else if (!ret.is$Suspenesion) {
                self.$value = ret;
                ret = undefined;
            } else if (canSuspend) {
                return new Sk.misceval.Suspension(finishIteration, ret);
            } else {
                // not quite right
                ret = Sk.misceval.retryOptionalSuspensionOrThrow(ret);
                return finishIteration(ret);
            }
            //print("ret", JSON.stringify(ret));
            self["gi$running"] = false;
            return ret;
        })(ret);
    },
    methods: {
        send: {
            $meth(value) {
                return Sk.misceval.chain(this.tp$iternext(true, value), (ret) => {
                    if (ret === undefined) {
                        const v = this.gi$ret;
                        // this is a weird quirk - and only for printing purposes StopIteration(None) vs StopIteration()
                        // .value ends up being None. But the repr prints the args we pass to StopIteration.
                        // See tests in test_yield_from and search for StopIteration()
                        throw v !== undefined && v !== Sk.builtin.none.none$ ? new Sk.builtin.StopIteration(v) : new Sk.builtin.StopIteration();
                    }
                    return ret;
                });
            },
            $flags: { OneArg: true },
            $doc: "send(arg) -> send 'arg' into generator,\nreturn next yielded value or raise StopIteration.",
        },
        throw: {
            $meth(type, value, tb) {
                // to do account for the other args
                value || (value = type);
                if (Sk.builtin.checkClass(value)) {
                    value = Sk.misceval.callsimArray(value);
                }
                if (!(value instanceof Sk.builtin.BaseException)) {
                    throw new Sk.builtin.TypeError("exceptions must be classes or instances deriving from BaseException, not str");
                }
                this.susp$data.throw = value;
                return Sk.misceval.tryCatch(
                    () =>
                        Sk.misceval.chain(this.tp$iternext(true), (ret) => {
                            this.susp$data.throw = null;
                            this.gi$yieldfrom && this.gi$yieldfrom.susp$data && (this.gi$yieldfrom.susp$data.throw = null);
                            if (ret === undefined) {
                                throw new Sk.builtin.StopIteration(this.$value);
                            }
                            return ret;
                        }),
                    (e) => {
                        this.susp$data.throw = null;
                        this.gi$yieldfrom && this.gi$yieldfrom.susp$data && (this.gi$yieldfrom.susp$data.throw = null);
                        throw e;
                    }
                );
            },
            $flags: { OneArg: true },
            $doc: "",
        },
        close: {
            $meth() {
                this.susp$data.close = new Sk.builtin.GeneratorExit();
                return Sk.misceval.tryCatch(
                    () =>
                        Sk.misceval.chain(this.tp$iternext(true), (ret) => {
                            try {
                                if (ret === undefined) {
                                    throw new Sk.builtin.RuntimeError("generator raised StopIteration");
                                } else if (!this.gi$closed) {
                                    throw new Sk.builtin.RuntimeError("generator ignored GeneratorExit");
                                }
                                return Sk.builtin.none.none$;
                            } finally {
                                this.susp$data.close = null;
                                this.gi$closed = true;
                            }
                        }),
                    (e) => {
                        this.susp$data.close = null;
                        if (e instanceof Sk.builtin.GeneratorExit) {
                            return Sk.builtin.none.none$;
                        } else {
                            throw e;
                        }
                    }
                );
            },
        },
    },
    getsets: {
        __name__: {
            $get() {
                return new Sk.builtin.str(this.$name);
            },
            $set(v) {
                if (!Sk.builtin.checkString(v)) {
                    throw new Sk.builtin.TypeError("__name__ must be set to a string object");
                }
                this.$name = v.toString();
            },
        },
        __qualname__: {
            $get() {
                return new Sk.builtin.str(this.$qualname);
            },
            $set(v) {
                if (!Sk.builtin.checkString(v)) {
                    throw new Sk.builtin.TypeError("__qualname__ must be set to a string object");
                }
                this.$qualname = v.toString();
            },
        },
        gi_running: {
            $get() {
                return new Sk.builtin.bool(this.gi$running);
            }
        },
        gi_yieldfrom: {
            $get() {
                return this.gi$yieldfrom || Sk.builtin.none.none$;
            }
        }
    },
});
Sk.exportSymbol("Sk.builtin.generator", Sk.builtin.generator);

/**
 * Creates a generator with the specified next function and additional
 * instance data. Useful in Javascript-implemented modules to implement
 * the __iter__ method.
 */
Sk.builtin.makeGenerator = function (next, data) {
    var key;
    var gen = new Sk.builtin.generator(null, null, null);
    gen.tp$iternext = next;

    for (key in data) {
        if (data.hasOwnProperty(key)) {
            gen[key] = data[key];
        }
    }

    return gen;
};
Sk.exportSymbol("Sk.builtin.makeGenerator", Sk.builtin.makeGenerator);
