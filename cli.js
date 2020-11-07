#!/usr/bin/env node

const fs = require("fs");

const meow = require("meow");
const minify = require("./").minify;

const cli = meow(`
	Usage
	  $ minify-xml <input>

	Options
	  --in-place, -i Save the minified results to the original file

	Examples
	  $ minify-xml --in-place sitemap.xml
`, {
	flags: {
		inPlace: {
			type: "boolean",
			alias: "i",
		},
	},
});


const file = cli.input[0];
if (!file) {
	cli.showHelp(); // this exits the process.
}

const xml = minify(fs.readFileSync(file, "utf8"));

if (cli.flags.inPlace) {
	console.log(`Writing to ${file}`);
	fs.writeFileSync(file, xml, "utf8");
} else {
	process.stdout.write(xml);
}