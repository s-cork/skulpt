import {
    dunderSlots,
    slotFuncNoArgsWithCheck,
    wrapperCallNoArgs,
    wrapperCallOneArg,
    slotFuncOneArg,
    subSlots,
    dunderToSkulpt,
    reflectedNumberSlots,
    checkInt,
    pyInt,
    pyBool,
    pyFloat,
    pyComplex,
    pyWrapperDescr,
    built$iterators,
} from "../internal.js";

var py3$dunderSlots;

const py2$dunderSlots = {
    next: {
        $name: "next",
        $slot_name: "tp$iternext",
        $slot_func: dunderSlots.__next__.$slot_func,
        $wrapper: dunderSlots.__next__.$wrapper,
        $textsig: dunderSlots.__next__.$textsig,
        $flags: dunderSlots.__next__.$flags,
    },
    __nonzero__: {
        $name: "__nonzero__",
        $slot_name: "nb$bool",
        $slot_func: slotFuncNoArgsWithCheck("__nonzero__", checkInt, "int", (res) => res.v !== 0),
        $wrapper: wrapperCallNoArgs,
        $textsig: "($self, /)",
        $flags: { NoArgs: true },
        $doc: "x.__nonzero__() <==> x != 0",
    },
    __div__: {
        $name: "__div__",
        $slot_name: "nb$divide",
        $slot_func: slotFuncOneArg,
        $wrapper: wrapperCallOneArg,
        $textsig: "($self, other/)",
        $flags: { OneArg: true },
        $doc: "x.__div__(y) <==> x/y",
    },
    __rdiv__: {
        $name: "__rdiv__",
        $slot_name: "nb$reflected_divide",
        $slot_func: slotFuncOneArg,
        $wrapper: wrapperCallOneArg,
        $textsig: "($self, other/)",
        $flags: { OneArg: true },
        $doc: "x.__rdiv__(y) <==> x/y",
    },
    __idiv__: {
        $name: "__idiv__",
        $slot_name: "nb$inplace_divide",
        $slot_func: slotFuncOneArg,
        $wrapper: wrapperCallOneArg,
        $textsig: "($self, other/)",
        $flags: { OneArg: true },
        $doc: "implement self /= other",
    },
};

export function switchVersionDunderMethods(py3) {
    if (py3 && py3$dunderSlots === undefined) {
        // assume python3 switch version if we have to
        return;
    }
    const classes_with_next = built$iterators;
    const classes_with_bool = [pyInt, pyFloat, pyComplex, pyBool];
    const classes_with_divide = classes_with_bool;
    const number_dunderSlots = subSlots.number_dunderSlots;
    const main_dunderSlots = subSlots.main_dunderSlots;

    function switch_version(classes_with, old_meth, new_meth) {
        for (let i = 0; i < classes_with.length; i++) {
            const cls_proto = classes_with[i].prototype;
            if (cls_proto.hasOwnProperty(new_meth)) {
                continue;
            }
            cls_proto[new_meth] = cls_proto[old_meth];
            delete cls_proto[old_meth];
        }
    }

    if (py3) {
        dunderToSkulpt.__bool__ = "nb$bool";
        dunderToSkulpt.__next__ = "tp$iternext";

        delete dunderToSkulpt.__nonzero__;
        delete dunderToSkulpt.__div__;
        delete dunderToSkulpt.__rdiv__;
        delete dunderToSkulpt.__idiv__;
        delete dunderToSkulpt.next;

        for (let slot_name in py3$dunderSlots) {
            dunderSlots[slot_name] = py3$dunderSlots[slot_name];
        }
        for (let slot_name in py2$dunderSlots) {
            delete dunderSlots[slot_name];
        }
        for (let i = 0; i < classes_with_divide.length; i++) {
            const cls_proto = classes_with_divide[i].prototype;
            delete cls_proto.__div__;
            delete cls_proto.__rdiv__;
        }

        main_dunderSlots.tp$iternext = "__next__";
        number_dunderSlots.nb$bool = "__bool__";
        switch_version(classes_with_next, "next", "__next__");
        switch_version(classes_with_bool, "__bool__", "__nonzero__");
    } else {
        if (py3$dunderSlots === undefined) {
            py3$dunderSlots = {
                __next__: dunderSlots.__next__,
            };
        }
        dunderToSkulpt.next = "tp$iternext";
        dunderToSkulpt.__nonzero__ = "nb$bool";
        dunderToSkulpt.__div__ = "nb$divide";
        dunderToSkulpt.__rdiv__ = "nb$reflected_divide";
        dunderToSkulpt.__idiv__ = "nb$inplace_divide";
        delete dunderToSkulpt.__bool__;
        delete dunderToSkulpt.__next__;

        for (let slot_name in py2$dunderSlots) {
            dunderSlots[slot_name] = py2$dunderSlots[slot_name];
        }
        for (let slot_name in py3$dunderSlots) {
            delete dunderSlots[slot_name];
        }

        main_dunderSlots.tp$iternext = "next";
        number_dunderSlots.nb$bool = "__nonzero__";
        switch_version(classes_with_next, "__next__", "next");
        switch_version(classes_with_bool, "__nonzero__", "__bool__");

        for (let i = 0; i < classes_with_divide.length; i++) {
            const cls = classes_with_divide[i];
            const cls_proto = cls.prototype;
            if (cls_proto.hasOwnProperty("__div__")) {
                continue;
            }
            cls_proto.__div__ = new pyWrapperDescr(cls, py2$dunderSlots.__div__, cls_proto.nb$divide);
            cls_proto.__rdiv__ = new pyWrapperDescr(cls, py2$dunderSlots.__rdiv__, reflectedNumberSlots.nb$divide.slot);
        }
    }
}
