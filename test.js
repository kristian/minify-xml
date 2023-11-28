import test from "ava";
import { glob } from "glob";

import path from "node:path";
import { readFileSync, promises as fs, createReadStream } from "node:fs";
const exists = path => fs.access(path).then(() => true).catch(() => false);

import { execa } from "execa";
import getStream from "get-stream";
import { Readable } from "node:stream";
import decamelize from "decamelize";

import { fileURLToPath } from "node:url";
const dirname = path.dirname(fileURLToPath(import.meta.url));
const xmlPath = path.join(dirname, "test", "usage_example", "in.xml");
const cliPath = path.join(dirname, "cli.js"), cli = async (...options) =>
    (await execa("node", [cliPath, xmlPath, ...options])).stdout;
import { withFile } from "tmp-promise";
const xml = readFileSync(xmlPath, "utf8");

import { default as minify, defaultOptions, minifyStream, defaultStreamOptions } from "./index.js";
const minifiedXml = minify(xml), minifiedStreamXml = minify(xml, defaultStreamOptions);

glob.sync("test/*/").forEach(dir => {
    test(dir.substring("test/".length).replace(/[_\/]/g, " ").trim(), async t => {
        const options = await (fs.readFile(path.join(dir, "options.json"), "utf8")
            .then(JSON.parse).catch(() => {}));

        // minify in.xml with options.json (or default options) and expect out.xml
        t.is(minify(await fs.readFile(path.join(dir, "in.xml"), "utf8"), options),
            await fs.readFile(path.join(dir, "out.xml"), "utf8"));

        const streamOptions = await (fs.readFile(path.join(dir, "streamOptions.json"), "utf8")
            .then(JSON.parse).catch(() => options));

        // minify in.xml with streamOptions.json (or options.json / default options) as a stream and expect stream.xml
        if (await exists(path.join(dir, "stream.xml"))) {
            t.is(await getStream(createReadStream(path.join(dir, "in.xml"), "utf8").pipe(minifyStream(streamOptions))),
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
    const {exitCode, stdout} = await execa("node", [cliPath], { reject: false });
    t.is(exitCode, 2); t.regex(stdout, /\$ minify-xml <input>/);

    // test if the help contains all arguments for all options
    for (const argument of allOptions.map(option => argumentForOption(option))) {
        t.regex(stdout, new RegExp(argument + "\\b"));
    }
});
test("test cli unknown flags", async t => {
    const {exitCode, stderr} = await execa("node", [cliPath, "--unknown-flag"], { reject: false });
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
    await execa("node", [cliPath, tmpPath, "--in-place"]);

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

/*
 * README.md Tests
 */
test("test README.md lists all options", async t => {
    const readme = await fs.readFile(path.join(dirname, "README.md"), "utf8");

    // test if the readme contains all options
    for (const option of allOptions) {
        t.regex(readme, new RegExp("`" + option + "`"));
    }
});