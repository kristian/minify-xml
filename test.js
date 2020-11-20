const test = require("ava");
const glob = require("glob");

const fs = require("fs").promises;
const path = require("path");
const execa = require("execa");

const xmlPath = path.join(__dirname, "test", "usage_example", "in.xml");
const cliPath = path.join(__dirname, "cli.js"), cli = (...options) =>
    execa(cliPath, [xmlPath, ...options])
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

test("test cli help", async t => {
    t.regex((await execa(cliPath, [], { reject: false })).stdout,
        /\$ minify-xml <input>/);
});
test("test cli to stdout", async t => {
    t.is((await cli()).stdout, minifyXML(xml));
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