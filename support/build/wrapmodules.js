const fs = require("fs");
const path = require("path");
const { compiler: Compiler } = require("google-closure-compiler");

const cacheDir = path.join("support", "tmp", ".wrapmodules");

function ensureCacheDir() {
    if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir, { recursive: true });
    }
}

function getCachePath(fullname) {
    const relativePath = path.relative(".", fullname);
    const safeName = relativePath.replace(/[\\/]/g, "__");
    return path.join(cacheDir, `${safeName}.json`);
}

function readCache(fullname, ext, stat, options) {
    ensureCacheDir();
    const cachePath = getCachePath(fullname);
    if (!fs.existsSync(cachePath)) {
        return null;
    }

    try {
        const data = JSON.parse(fs.readFileSync(cachePath, "utf8"));
        const kind = options.production && ext === ".js" ? "compiled" : "raw";
        if (data.kind !== kind) {
            return null;
        }
        if (data.mtimeMs !== stat.mtimeMs || data.size !== stat.size) {
            return null;
        }
        if (kind === "compiled" && data.languageOut !== options.languageOut) {
            return null;
        }

        return data.contents;
    } catch {
        return null;
    }
}

function writeCache(fullname, ext, stat, options, contents) {
    ensureCacheDir();
    const cachePath = getCachePath(fullname);
    const kind = options.production && ext === ".js" ? "compiled" : "raw";
    const data = {
        contents,
        kind,
        mtimeMs: stat.mtimeMs,
        size: stat.size,
    };

    if (kind === "compiled") {
        data.languageOut = options.languageOut;
    }

    fs.writeFileSync(cachePath, JSON.stringify(data), "utf8");
}

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
    const { production = false, languageOut, excludes = [], recursive = false } = options;
    const cacheOptions = { production, languageOut };
    for (let dir of dirs) {
        let files = fs.readdirSync(dir);

        for (let file of files) {
            let fullname = dir + "/" + file;
            if (!excludes.includes(fullname)) {
                let stat = fs.statSync(fullname);

                if (recursive && stat.isDirectory()) {
                    await processDirectories([fullname], exts, ret, options);
                } else if (stat.isFile()) {
                    let ext = path.extname(file);
                    if (exts.includes(ext)) {
                        const cached = readCache(fullname, ext, stat, cacheOptions);
                        if (cached !== null) {
                            const kb = Math.round(Buffer.byteLength(cached, "utf8") / 1000);
                            console.log(`[wrapmodules] using cache for ${path.relative(".", fullname)} (${kb} kb)`);
                            ret.files[fullname] = cached;
                            if (production && ext === ".js") {
                                js_bytes += kb;
                            }
                            continue;
                        }

                        if (production && ext === ".js") {
                            console.log(`Compiling ${fullname}...`);

                            // STANDARD
                            opts = {
                                language_in: "ECMASCRIPT_NEXT",
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
                                jscomp_off: ["deprecated", "uselessCode", "suspiciousCode", "checkTypes"],
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
                            const kb = Math.round(Buffer.byteLength(contents, "utf8") / 1000);
                            console.log(`${kb} kb`);
                            js_bytes += kb;

                            ret.files[fullname] = contents;
                            writeCache(fullname, ext, stat, cacheOptions, contents);
                        } else {
                            const contents = fs.readFileSync(fullname, "utf8");
                            ret.files[fullname] = contents;
                            writeCache(fullname, ext, stat, cacheOptions, contents);
                        }
                    }
                }
            }
        }
    }
}

const group0Paths = new Set(["src/builtin/sys.js", "src/lib/time.js", "src/lib/datetime.js", "src/lib/json.js"]);
const group1Paths = new Set([
    "src/lib/math.js",
    "src/lib/itertools.js",
    "src/lib/functools.js",
    "src/lib/_random.js",
    "src/lib/collections.js",
    "src/lib/operator.js",
    "src/lib/keyword.js",
    "src/lib/string.js",
    "src/lib/re.js",
    "src/lib/uuid.js",
    "src/lib/bisect.py",
    "src/lib/random.py",
]);
const group2Paths = new Set(["src/lib/_strptime.js", "src/lib/calendar.js", "src/lib/fractions.js"]);

function loadSkulptFastSlow(ret, name, outfile) {
    const retFiles = ret.files;
    const fastFiles = {};
    const group1 = {};
    const group2 = {};
    const slowFiles = {};
    for (let filename in retFiles) {
        if (group0Paths.has(filename)) {
            fastFiles[filename] = retFiles[filename];
        } else if (group1Paths.has(filename)) {
            group1[filename] = retFiles[filename];
            fastFiles[filename] = 1;
        } else if (group2Paths.has(filename)) {
            group2[filename] = retFiles[filename];
            fastFiles[filename] = 2;
        } else {
            slowFiles[filename] = retFiles[filename];
            fastFiles[filename] = 3;
        }
    }
    const contents = "Sk." + name + "={files: " + JSON.stringify(fastFiles, null, 2) + "}";
    fs.writeFileSync(outfile, contents, "utf8");
    fs.writeFileSync("dist/skulpt-stdlib-1.json", JSON.stringify(group1, null, 2), "utf8");
    fs.writeFileSync("dist/skulpt-stdlib-2.json", JSON.stringify(group2, null, 2), "utf8");
    fs.writeFileSync("dist/skulpt-stdlib-3.json", JSON.stringify(slowFiles, null, 2), "utf8");
}

async function buildJsonFile(name, dirs, exts, outfile, options) {
    options = options || {};
    const ret = { files: {} };

    await processDirectories(dirs, exts, ret, options);

    if (outfile.startsWith("dist") && options.production) {
        loadSkulptFastSlow(ret, name, outfile);
    } else {
        fs.writeFileSync(outfile, "Sk." + name + "=" + JSON.stringify(ret, null, 2), "utf8");
    }
}

async function main() {
    if (process.argv.includes("stdlib")) {
        let excludes = [];
        if (fs.existsSync(excludeFileName)) {
            excludes = JSON.parse(fs.readFileSync(excludeFileName));
        }

        const production = process.argv.includes("prod");
        const langMatch = process.env.npm_lifecycle_script.match(/languageOut=(?<lang>\w+)/);
        const languageOut = (langMatch && langMatch.groups.lang) || "ECMASCRIPT_2015";
        console.log(languageOut);

        const opts = {
            recursive: true,
            excludes: excludes,
            production,
            languageOut,
        };

        await buildJsonFile("builtinFiles", ["src/builtin", "src/lib"], [".js", ".py"], "dist/skulpt-stdlib.js", opts);
        let stat = fs.statSync("dist/skulpt-stdlib.js");

        if (production) {
            updateConstructorNames();
            console.log(`\nstd-lib size: ${Math.round(stat.size / 1000)} kb`);
            stat = fs.statSync("dist/skulpt-stdlib-1.json");
            console.log(`\ngroup-1 size: ${Math.round(stat.size / 1000)} kb`);
            stat = fs.statSync("dist/skulpt-stdlib-2.json");
            console.log(`\ngroup-2 size: ${Math.round(stat.size / 1000)} kb`);
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

main().catch((e) => {
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
                if (err) {
                    return console.log(err);
                }
            });
        });
    } catch (e) {
        console.error(e);
    }
}
