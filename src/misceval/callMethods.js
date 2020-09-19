import {checkCallable, retryOptionalSuspensionOrThrow, pyExc, typeName } from "../internal";

export function pyCallOrSuspend(callable, args, kwargs) {
    if (!checkCallable(callable)) {
        if (typeof callable === "function") {
            throw new pyExc.TypeError(callable.name + " is a javascript function, must convert to python function");
        }
        throw new pyExc.TypeError("'" + typeName(callable) + "' object is not callable");
    }
    args = args || [];
    kwargs = kwargs || [];
    return callable.tp$call(args, kwargs);
}


export function pyCall(callable, args, kwargs) {
    return retryOptionalSuspensionOrThrow(pyCallOrSuspend(callable, args, kwargs));
}


export function pyCallAsync(callable, args, kwargs, suspHandlers) {
    return asyncToPromise(() => pyCallOrSuspend(callable, args, kwargs), suspHandlers);
}


