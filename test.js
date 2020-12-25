const test = require("ava");
const glob = require("glob");

const fs = require("fs").promises;
const path = require("path");
const execa = require("execa");

const xmlPath = path.join(__dirname, "test", "usage_example", "in.xml");
const cliPath = path.join(__dirname, "cli.js"), cli = async (...options) =>
    (await execa(cliPath, [xmlPath, ...options])).stdout;
const {withFile} = require("tmp-promise");
const xml = require("fs").readFileSync(xmlPath, "utf8");

const { minify, defaultOptions } = require("./");

glob.sync("test/*/").forEach(dir => {
    test(dir.substr("test/".length).replace(/[_\/]/g, " ").trim(), async t => {
        // minify in.xml with options.json (or default options) and expect out.xml
        t.is(minify(await fs.readFile(path.join(dir, "in.xml"), "utf8"),
            await (fs.readFile(path.join(dir, "options.json"), "utf8")
                .then(JSON.parse).catch(() => {}))),
            await fs.readFile(path.join(dir, "out.xml"), "utf8"));
    });
});

/**
 * CLI Tests
 */
const allOptions = Object.keys(defaultOptions);
const buildOptions = flag => allOptions.reduce((options, option) => {
        options[option] = option === flag;
        return options;
    }, {});
const argumentForOption = option => "--" + option.replace(/[A-Z]/g, "-$&").toLowerCase().replace("c-data", "cdata").replace("doc-type", "doctype");
const buildArguments = options => Object.entries(options).reduce((args, [option, value]) => {
        args.push(argumentForOption(option), String(value));
        return args;
    }, []);
test("test cli help", async t => {
    const {exitCode, stdout} = await execa(cliPath, [], { reject: false });
    t.is(exitCode, 2); t.regex(stdout, /\$ minify-xml <input>/);

    // test if the help contains all arguments for all options
    for (const argument of allOptions.map(argumentForOption)) {
        t.regex(stdout, new RegExp(argument + "\\b"))
    }
});
test("test cli unknown flags", async t => {
    const {exitCode, stderr} = await execa(cliPath, ["--unknown-flag"], { reject: false });
    t.not(exitCode, 0); t.regex(stderr, /Unknown flags?\s*--unknown-flag/);
});
test("test cli to stdout", async t => {
    t.is(await cli(), minify(xml));
});
test("test cli in-place", t => withFile(async ({path: tmpPath}) => {
    await fs.copyFile(xmlPath, tmpPath);
    await execa(cliPath, [tmpPath, "--in-place"]);

    t.is(await fs.readFile(tmpPath, "utf8"), minify(xml));
}));
test("test cli to output", t => withFile(async ({path: tmpPath}) => {
    await cli("--output", tmpPath);

    t.is(await fs.readFile(tmpPath, "utf8"), minify(xml));
}));
for (const option of allOptions) {
    test("test cli option " + argumentForOption(option), async t => {
        const options = buildOptions(option);
        t.is(await cli(...buildArguments(options)),
            minify(xml, options));
    });
}