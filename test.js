const test = require("ava");
const glob = require("glob");

const path = require("path");
const { promises: fs, createReadStream } = require("fs");
const exists = path => fs.access(path).then(() => true).catch(() => false);

const execa = require("execa");
const getStream = require("get-stream");
const { Readable } = require("stream");
const decamelize = require("decamelize");

const xmlPath = path.join(__dirname, "test", "usage_example", "in.xml");
const cliPath = path.join(__dirname, "cli.js"), cli = async (...options) =>
    (await execa(cliPath, [xmlPath, ...options])).stdout;
const {withFile} = require("tmp-promise");
const xml = require("fs").readFileSync(xmlPath, "utf8");

const { minify, defaultOptions, minifyStream, defaultStreamOptions } = require("./");
const minifiedXml = minify(xml), minifiedStreamXml = minify(xml, defaultStreamOptions);

glob.sync("test/*/").forEach(dir => {
    test(dir.substring("test/".length).replace(/[_\/]/g, " ").trim(), async t => {
        const options =  await (fs.readFile(path.join(dir, "options.json"), "utf8")
            .then(JSON.parse).catch(() => {}));

        // minify in.xml with options.json (or default options) and expect out.xml
        t.is(minify(await fs.readFile(path.join(dir, "in.xml"), "utf8"), options),
            await fs.readFile(path.join(dir, "out.xml"), "utf8"));

        // minify in.xml with options.json (or default options) as a stream and expect stream.xml
        if (await exists(path.join(dir, "stream.xml"))) {
            t.is(await getStream(createReadStream(path.join(dir, "in.xml"), "utf8").pipe(minifyStream(options))),
                await fs.readFile(path.join(dir, "stream.xml"), "utf8"));
        } else {
            t.throws(() => minifyStream(options), { message: /cannot be used with streams/ });
        }
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
const argumentForOption = (option, value) => `--${ value === false ? 'no-' : String() }${ decamelize(option, { separator: "-" }).replace("c-data", "cdata").replace("doc-type", "doctype") }`;
const buildArguments = options => Object.entries(options).reduce((args, [option, value]) => {
        args.push(argumentForOption(option, value));
        typeof value === "string" && args.push(value);
        return args;
    }, []);
test("test cli help", async t => {
    const {exitCode, stdout} = await execa(cliPath, [], { reject: false });
    t.is(exitCode, 2); t.regex(stdout, /\$ minify-xml <input>/);

    // test if the help contains all arguments for all options
    for (const argument of allOptions.map(option => argumentForOption(option))) {
        t.regex(stdout, new RegExp(argument + "\\b"))
    }
});
test("test cli unknown flags", async t => {
    const {exitCode, stderr} = await execa(cliPath, ["--unknown-flag"], { reject: false });
    t.not(exitCode, 0); t.regex(stderr, /Unknown flags?\s*--unknown-flag/);
});
test("test cli to stdout", async t => {
    t.is(await cli(), minifiedXml);
});
test("test cli stream to stdout", async t => {
    t.is(await cli("--stream"), minifiedStreamXml);
});
test("test cli in-place", t => withFile(async ({path: tmpPath}) => {
    await fs.copyFile(xmlPath, tmpPath);
    await execa(cliPath, [tmpPath, "--in-place"]);

    t.is(await fs.readFile(tmpPath, "utf8"), minifiedXml);
}));
test("test cli to output", t => withFile(async ({path: tmpPath}) => {
    await cli("--output", tmpPath);

    t.is(await fs.readFile(tmpPath, "utf8"), minifiedXml);
}));
test("test cli stream to output", t => withFile(async ({path: tmpPath}) => {
    await cli("--stream", "--output", tmpPath);

    t.is(await fs.readFile(tmpPath, "utf8"), minifiedStreamXml);
}));
test("test cli debug", async t => {
    t.true((await cli("--debug=ignore-cdata", "--debug=remove-comments")).includes(
        /<!\s*(?:--(?:[^-]|-[^-])*--\s*)>/g.source));
});
for (const option of allOptions) {
    test("test cli option " + argumentForOption(option), async t => {
        const options = buildOptions(option);
        t.is(await cli(...buildArguments(options)),
            minify(xml, options));
    });
}

test("test stream edge case", async t => {
    t.is(await getStream(Readable.from(["<", "t", ">", "<", "/", "t", ">", "<", "t>", "</t>"])
        .pipe(minifyStream({ streamMaxMatchLength: 4 }))), "<t></t><t/>");
});