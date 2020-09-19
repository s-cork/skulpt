import { Suspension, pyExc } from "../internal";


/**
 * Wraps anything that can return an Suspension, and returns a
 * JS Promise with the result. Also takes an object map of suspension handlers:
 * pass in {"suspType": function (susp) {} }, and your function will be called
 * with the Suspension object if susp.type=="suspType". The type "*" will match
 * all otherwise unhandled suspensions.
 *
 * A suspension handler should return a Promise yielding the return value of
 * r.resume() - ie, either the final return value of this call or another
 * Suspension. That is, the null suspension handler is:
 *
 *     function handler(susp) {
 *       return new Promise(function(resolve, reject) {
 *         try {
 *           resolve(susp.resume());
 *         } catch(e) {
 *           reject(e);
 *         }
 *       });
 *     }
 *
 * Alternatively, a handler can return null to perform the default action for
 * that suspension type.
 *
 * (Note: do *not* call asyncToPromise() in a suspension handler; this will
 * create a new Promise object for each such suspension that occurs)
 *
 * asyncToPromise() returns a Promise that will be resolved with the final
 * return value, or rejected with an exception if one is thrown.
 *
 * @param{function()} suspendablefn returns either a result or a Suspension
 * @param{Object=} suspHandlers an object map of suspension handlers
 */
export function asyncToPromise(suspendablefn, suspHandlers) {
    return new Promise(function (resolve, reject) {
        try {
            var r = suspendablefn();

            (function handleResponse(r) {
                try {
                    // jsh*nt insists these be defined outside the loop
                    var resume = function () {
                        try {
                            handleResponse(r.resume());
                        } catch (e) {
                            reject(e);
                        }
                    };
                    var resumeWithData = function resolved(x) {
                        try {
                            r.data["result"] = x;
                            resume();
                        } catch (e) {
                            reject(e);
                        }
                    };
                    var resumeWithError = function rejected(e) {
                        try {
                            r.data["error"] = e;
                            resume();
                        } catch (ex) {
                            reject(ex);
                        }
                    };

                    while (r instanceof Suspension) {
                        var handler = suspHandlers && (suspHandlers[r.data["type"]] || suspHandlers["*"]);

                        if (handler) {
                            var handlerPromise = handler(r);
                            if (handlerPromise) {
                                handlerPromise.then(handleResponse, reject);
                                return;
                            }
                        }

                        if (r.data["type"] == "Sk.promise") {
                            r.data["promise"].then(resumeWithData, resumeWithError);
                            return;
                        } else if (r.data["type"] == "Sk.yield") {
                            // Assumes all yields are optional, as Sk.setTimeout might
                            // not be able to yield.
                            //Sk.setTimeout(resume, 0);
                            Sk.global["setImmediate"](resume);
                            return;
                        } else if (r.data["type"] == "Sk.delay") {
                            //Sk.setTimeout(resume, 1);
                            Sk.global["setImmediate"](resume);
                            return;
                        } else if (r.optional) {
                            // Unhandled optional suspensions just get
                            // resumed immediately, and we go around the loop again.
                            r = r.resume();
                        } else {
                            // Unhandled, non-optional suspension.
                            throw new pyExc.SuspensionError("Unhandled non-optional suspension of type '" + r.data["type"] + "'");
                        }
                    }

                    resolve(r);
                } catch (e) {
                    reject(e);
                }
            })(r);
        } catch (e) {
            reject(e);
        }
    });
}
