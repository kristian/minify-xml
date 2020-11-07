const test = require("ava");
const glob = require("glob");

const fs = require("fs");
const { promisify } = require("util");
const readFile = promisify(fs.readFile);

const minifyXML = require("./").minify;

glob.sync("test/*/").forEach(folder => {
    test(folder.substr("test/".length).replace(/[_\/]/g, " ").trim(), async test => {
        // minify in.xml with options.json (or default options) and expect out.xml
        test.is(minifyXML(await readFile(folder + "in.xml", "utf8"),
            await (readFile(folder + "options.json", "utf8")
                .then(JSON.parse).catch(() => {}))),
            await readFile(folder + "out.xml", "utf8"));
    });
});