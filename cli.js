#!/usr/bin/env node

const fs = require("fs");

const meow = require("meow");
const minify = require("./").minify;

const cli = meow(`
	Usage
	  $ minify-xml <input>

	Options
	  --in-place, -i Save the minified results to the original file
	  --output, -o Save the minified results to a given output file

	Examples
	  $ minify-xml sitemap.xml --in-place
	  $ minify-xml sitemap.xml --output sitemap.min.xml
`, {
	input: ["input"],
	flags: {
		output: {
			type: "string",
			alias: "o"
		},
		inPlace: {
			type: "boolean",
			alias: "i",
		},
	},
});


const input = cli.input[0];
if (!input) {
	cli.showHelp(); // this exits the process.
}

const xml = minify(fs.readFileSync(input, "utf8"));

if (cli.flags.inPlace || cli.flags.output) {
	const output = cli.flags.inPlace ?
		input : cli.flags.output;
	console.log(`Writing to ${output}`);
	fs.writeFileSync(output, xml, "utf8");
} else {
	process.stdout.write(xml);
}