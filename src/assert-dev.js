const ENABLE_ASSERTS = true;

/**
 * Cause assertion failure when condition is false.
 * 
 * @param {*} condition condition to check
 * @param {string=} message error message
 */
export function assert (condition, message) {
    if (ENABLE_ASSERTS && !condition) {
        var msg = "Assertion failure";
        if (message) {
            msg = msg + ": " + message;
        }
        throw new Error(msg);
    }
    return condition;
};


/**
 * Cause assertion failure.
 * 
 * @param {string=} message error message
 */
export function fail(message) {
    if (ENABLE_ASSERTS) {
        var msg = "Assertion failure";
        if (message) {
            msg = msg + ": " + message;
        }
        throw new Error(msg);
    }
};

