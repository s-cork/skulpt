const fs = require('fs');
const path = require('path');
const { compiler: Compiler } = require("google-closure-compiler");

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
let js_bytes = 0;

async function processDirectories(dirs, exts, ret, options) {
    const {production, languageOut, excludes, recursive} = options;
    for (let dir of dirs) {
        let files = fs.readdirSync(dir);

        for (let file of files) {
            let fullname = dir + '/' + file;

            if (!excludes.includes(fullname)) {
                let stat = fs.statSync(fullname);

                if (recursive && stat.isDirectory()) {
                    await processDirectories([fullname], exts, ret, options);
                } else if (stat.isFile()) {
                    let ext = path.extname(file);
                    if (exts.includes(ext)) {
                        if (production && (ext === ".js")) {
                            console.log(`Compiling ${fullname}...`);

                            // STANDARD
                            opts = {
                              language_in: 'ECMASCRIPT_NEXT',
                              language_out: languageOut,
                              source_map_include_content: true,
                            };

                            Object.assign(opts, {
                                js: fullname,
                                jscomp_error: [
                                    "accessControls",
                                    "checkRegExp",
                                    "checkVars" /*'checkTypes',*/,
                                    "invalidCasts",
                                    "missingProperties",
                                    "nonStandardJsDocs",
                                    "strictModuleDepCheck",
                                    "undefinedVars",
                                    "unknownDefines",
                                    "visibility",
                                ],
                                jscomp_off: [
                                    "fileoverviewTags",
                                    "deprecated",
                                    "uselessCode",
                                    "suspiciousCode",
                                    "checkTypes",
                                ],
                                languageOut,
                                externs: "support/externs/sk.js",

                                // https://stackoverflow.com/questions/43807412/shared-polyfills-in-google-closure-compiler#43835873
                                rewritePolyfills: false,
                                // injectLibraries: false, // This will prevent use of async/await. Removing this will allow async/await, but will include all the necessary polyfills at the top of every file that needs them.

                                // useful for debugging
                                // warningLevel: "QUIET",
                                // formatting: 'PRETTY_PRINT',
                                // debug: true,
                                // renaming: false
                            });

                            const compiler = new Compiler(opts);

                            let contents = await new Promise((resolve, reject) => {
                                compiler.run((exitCode, stdOut, stdErr) => {
                                    if (exitCode === 0) {
                                        resolve(stdOut);
                                    } else {
                                        reject(stdErr);
                                    }
                                });
                            });
                            const kb = Math.round(Buffer.byteLength(contents, "utf8")/1000);
                            console.log(`${kb} kb`);
                            js_bytes += kb;

                            ret.files[fullname] = contents;

                        } else {
                            ret.files[fullname] = fs.readFileSync(fullname, "utf8");
                        }
                    }
                }
            }
        }
    }
};


async function buildJsonFile(name, dirs, exts, outfile, options) {
    options = options || {};
    const ret = {files: {}};

    await processDirectories(dirs, exts, ret, options);

    const retFiles = ret.files;
    if (outfile.startsWith("dist")) {
        const fastFilesNames = ["src/builtin/sys.js", "src/lib/time.js", "src/lib/datetime.py", "src/lib/functools.js"];
        const fastFiles = {files: Object.fromEntries(fastFilesNames.map(fileName => [fileName, retFiles[fileName]]))}
        const contents = "Sk." + name + "=" + JSON.stringify(fastFiles, null, 2);
        fs.writeFileSync(outfile, contents, "utf8");
        console.log(`js lib size: ${js_bytes} kb`);
        console.log("\nUpdated " + outfile + ".");
        const fullStdLib = "Sk." + name + "=" + JSON.stringify(ret, null, 2);
        fs.writeFileSync("dist/full-stdlib.js" , fullStdLib, "utf8");
    } else {
        fs.writeFileSync(outfile , "Sk." + name + "=" + JSON.stringify(ret, null, 2), "utf8"); 
    }
  
}

async function main() {
    if (process.argv.includes("stdlib")) {
        let excludes = [];
        if (fs.existsSync(excludeFileName)) {
            excludes = JSON.parse(fs.readFileSync(excludeFileName));
        }

        const production = process.argv.includes("prod");
        const langMatch = process.env.npm_config_argv.match(/env\.languageOut=(?<lang>\w+)/);
        const languageOut = (langMatch && langMatch.groups.lang) || "ECMASCRIPT_2015";
        console.log(languageOut);
 

        const opts = {
            recursive: true,
            excludes: excludes,
            production,
            languageOut
       };

        await buildJsonFile("builtinFiles", ["src/builtin", "src/lib"], [".js", ".py"], "dist/skulpt-stdlib.js", opts);
        let stat = fs.statSync("dist/skulpt-stdlib.js");
        
        console.log(`\nstd-lib size: ${Math.round(stat.size/1000)} kb`);
        if (production) {
            updateConstructorNames();
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
    try {
        const minFile = "dist/skulpt.min.js";
        fs.readFile(minFile, "utf8", (err, data) => {
            if (err) {
                return console.error(err);
            }
            const result = data.replace(
                /\.([\w]+)=Sk\.abstr\.build(Native|Iterator)Class\("([\w]+)",\{constructor:function\(/g,
                '.$1=Sk.abstr.build$2Class("$3",{constructor:function $1('
            );

            fs.writeFile(minFile, result, "utf8", function (err) {
                if (err) return console.log(err);
            });
        });
    } catch (e) {
        console.error(e);
    }
}
