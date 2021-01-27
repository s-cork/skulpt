const fs = require('fs');
const path = require('path');
const minify = require('babel-minify');

/**
 * If this optional file exists in the top level directory, it will be
 * used to exclude libraries from the standard library file.
 *
 * It should consist of a JSON array of filenames and/or directory
 * names (relative to the top level directory).
 *
 * Example:
 * [
 *   "src/lib/webgl",
 *   "src/lib/sqlite3",
 *   "src/lib/__phello__.foo.py"
 * ]
 *
 * This can be used to reduce the standard library file size by
 * excluding libraries that are not relevant to a particular
 * distribution.
 */
const excludeFileName = "libexcludes.json";

async function processDirectories(dirs, recursive, exts, ret, minifyjs, excludes) {
    for (let dir of dirs) {
        let files = fs.readdirSync(dir);

        for (let file of files) {
            let fullname = dir + '/' + file;

            if (!excludes.includes(fullname)) {
                let stat = fs.statSync(fullname)

                if (recursive && stat.isDirectory()) {
                    await processDirectories([fullname], recursive, exts, ret, minifyjs, excludes);
                } else if (stat.isFile()) {
                    let ext = path.extname(file);
                    if (exts.includes(ext)) {
                        if (minifyjs && (ext == ".js")) {
                            console.log(`Compiling ${fullname}...`);
                            const Compiler = require('google-closure-compiler').compiler;
                            opts = {
                              language_in: 'ECMASCRIPT_NEXT',
                              language_out: 'ECMASCRIPT5_STRICT',
                              source_map_include_content: true,
                            };

                            Object.assign(opts, {
                                js: fullname,
                                jscomp_error: ['accessControls', 'checkRegExp', 'checkVars', /*'checkTypes',*/
                                               'invalidCasts', 'missingProperties',
                                               'nonStandardJsDocs', 'strictModuleDepCheck', 'undefinedVars',
                                               'unknownDefines', 'visibility'],
                                jscomp_off: ['fileoverviewTags', 'deprecated', 'uselessCode', 'suspiciousCode', 'checkTypes',],
                                languageOut: 'ECMASCRIPT5',
                                externs: 'support/externs/sk.js',
                                rewritePolyfills: false,
                                injectLibraries: false, // This will prevent use of async/await. Removing this will allow async/await, but will include all the necessary polyfills at the top of every file that needs them.
                            });

                            comp = new Compiler(opts);

                            let contents = await new Promise((resolve, reject) => {
                                comp.run((exitCode, stdOut, stdErr) => {
                                    if (exitCode === 0) {
                                        resolve(stdOut);
                                    } else {
                                        reject(stdErr);
                                    }
                                });
                            });

                            // let result = minify(contents, {
                            //     mangle: {
                            //         keepFnName: true,
                            //     },
                            //     deadcode: {
                            //         keepFnName: true,
                            //     },
                            // });
                            // contents = result.code;

                            ret.files[fullname] = contents;

                        } else {
                            ret.files[fullname] = fs.readFileSync(fullname, 'utf8');
                        }
                    }
                }
            }
        }
    }
};


async function buildJsonFile(name, dirs, exts, outfile, options) {
    options = options || {};
    let recursive = options.recursive || false;
    let minifyjs = options.minifyjs || false;
    let excludes = options.excludes || [];
    let dir, file;
    let ret = {};

    ret.files = {};

    await processDirectories(dirs, recursive, exts, ret, minifyjs, excludes);

    let contents = "Sk." + name + "=" + JSON.stringify(ret, null, 2);
    fs.writeFileSync(outfile, contents, 'utf8');
    console.log("Updated " + outfile + ".");
}

async function main() {
    if (process.argv.includes("internal")) {
        // buildJsonFile("internalPy", ["src"], [".py"], "src/internalpython.js");
    } else if (process.argv.includes("builtin")) {
        let excludes = [];
        if (fs.existsSync(excludeFileName)) {
            excludes = JSON.parse(fs.readFileSync(excludeFileName));
        }
        let opts = {
            recursive: true,
            minifyjs: true,
            excludes: excludes
        };

        await buildJsonFile("builtinFiles", ["src/builtin", "src/lib"], [".js", ".py"], "dist/skulpt-stdlib.js", opts)
        if (process.argv.includes("prod")) {
            //updateConstructorNames();
        }
    } else if (process.argv.includes("unit2")) {
        if (!fs.existsSync("support/tmp")) {
        fs.mkdirSync("support/tmp");
        }
        buildJsonFile("unit2", ["test/unit"], [".py"], "support/tmp/unit2.js", { recursive: true });
    } else if (process.argv.includes("unit3")) {
        if (!fs.existsSync("support/tmp")) {
        fs.mkdirSync("support/tmp");
        }
        buildJsonFile("unit3", ["test/unit3"], [".py"], "support/tmp/unit3.js");
    }

}

main().catch(e => {
    console.error(e);
});


/**
 * 
 * \.([\w]+)=Sk\.abstr\.build(Native|Iterator)Class\("([\w]+)",\{constructor:function\(
 * 
 * .$1=Sk.abstr.build$2Class("$3",{constructor:function $1(
 */

function updateConstructorNames() {
    const minFile = "dist/skulpt.min.js";
    fs.readFile(minFile, "utf8", (err, data) => {
        if (err) {
            return console.log(err);
        }
        const result = data.replace(
            /\.([\w]+)=Sk\.abstr\.build(Native|Iterator)Class\("([\w]+)",\{constructor:function\(/g,
            '.$1=Sk.abstr.build$2Class("$3",{constructor:function $1('
        );

        fs.writeFile(minFile, result, "utf8", function (err) {
            if (err) return console.log(err);
        });
    });
}
