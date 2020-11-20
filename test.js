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

const minifyXML = require("./").minify;

glob.sync("test/*/").forEach(dir => {
    test(dir.substr("test/".length).replace(/[_\/]/g, " ").trim(), async t => {
        // minify in.xml with options.json (or default options) and expect out.xml
        t.is(minifyXML(await fs.readFile(path.join(dir, "in.xml"), "utf8"),
            await (fs.readFile(path.join(dir, "options.json"), "utf8")
                .then(JSON.parse).catch(() => {}))),
            await fs.readFile(path.join(dir, "out.xml"), "utf8"));
    });
});

/**
 * CLI Tests
 */
const allOptions = ["removeComments", "removeWhitespaceBetweenTags", "collapseWhitespaceInTags", "collapseEmptyElements", "trimWhitespaceFromTexts", "collapseWhitespaceInTexts", "removeUnusedNamespaces", "removeUnusedDefaultNamespace", "shortenNamespaces", "ignoreCData"];
const buildOptions = flag => allOptions.reduce((options, option) => {
        options[option] = option === flag;
        return options;
    }, {});
const argumentForOption = option => "--" + option.replace(/[A-Z]/g, "-$&").toLowerCase().replace("c-data", "cdata");
const buildArguments = options => Object.entries(options).reduce((args, [option, value]) => {
        args.push(argumentForOption(option), String(value));
        return args;
    }, []);
test("test cli help", async t => {
    const help = (await execa(cliPath, [], { reject: false })).stdout;
    t.regex(help, /\$ minify-xml <input>/);

    // test if the help contains all arguments for all options
    for (const argument of allOptions.map(argumentForOption)) {
        t.regex(help, new RegExp(argument + "\\b"))
    }
});
test("test cli to stdout", async t => {
    t.is(await cli(), minifyXML(xml));
});
test("test cli in-place", t => withFile(async ({path: tmpPath}) => {
    await fs.copyFile(xmlPath, tmpPath);
    await execa(cliPath, [tmpPath, "--in-place"]);

    t.is(await fs.readFile(tmpPath, "utf8"), minifyXML(xml));
}));
test("test cli to output", t => withFile(async ({path: tmpPath}) => {
    await cli("--output", tmpPath);

    t.is(await fs.readFile(tmpPath, "utf8"), minifyXML(xml));
}));
for (const option of allOptions) {
    test("test cli option " + argumentForOption(option), async t => {
        const options = buildOptions(option);
        t.is(await cli(...buildArguments(options)),
            minifyXML(xml, options));
    });
}