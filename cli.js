#!/usr/bin/env node

const fs = require("fs");

const meow = require("meow");
const { minify, defaultOptions } = require("./");

const cli = meow(`
	Usage
	  $ minify-xml <input>

	Options
	  --in-place, -i Save the minified results to the original file
	  --output, -o Save the minified results to a given output file

	Use prefix --no-, false or =false to disable
	  --remove-comments Remove comments
	  --remove-whitespace-between-tags Remove whitespace between tags
	  --collapse-whitespace-in-tags Collapse whitespace in tags
	  --collapse-empty-elements Collapse empty elements
	  --collapse-whitespace-in-prolog Collapse whitespace in the prolog
	  --collapse-whitespace-in-doctype Collapse whitespace in the document type declaration
	  --remove-unused-namespaces Remove any unused namespaces from tags
	  --remove-unused-default-namespace Remove unused default namespace declaration
	  --shorten-namespaces Shorten namespaces to a minimal length
	  --ignore-cdata Ignore any content inside of CData tags
	  
	  --trim-whitespace-from-texts Remove leading and tailing whitespace in text elements
	  --collapse-whitespace-in-texts Collapse whitespace in text elements

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

		removeComments: {
			type: "boolean",
			default: true
		},
		removeWhitespaceBetweenTags: {
			type: "boolean",
			default: true
		},
		collapseWhitespaceInTags: {
			type: "boolean",
			default: true
		},
		collapseEmptyElements: {
			type: "boolean",
			default: true
		},
		trimWhitespaceFromTexts: {
			type: "boolean",
			default: false
		},
		collapseWhitespaceInTexts: {
			type: "boolean",
			default: false
		},
		collapseWhitespaceInProlog: {
			type: "boolean",
			default: true
		},
		collapseWhitespaceInDocType: {
			type: "boolean",
			default: true,
			alias: "collapse-whitespace-in-doctype"
		},
		removeUnusedNamespaces: {
			type: "boolean",
			default: true
		},
		removeUnusedDefaultNamespace: {
			type: "boolean",
			default: true
		},
		shortenNamespaces: {
			type: "boolean",
			default: true
		},
		ignoreCData: {
			type: "boolean",
			default: true,
			alias: "ignore-cdata"
		}
	},
	allowUnknownFlags: false
});


const input = cli.input[0];
if (!input) {
	cli.showHelp(); // this exits the process.
}

const xml = minify(fs.readFileSync(input, "utf8"), Object.keys(defaultOptions).reduce((options, option) => {
	options[option] = cli.flags[option];
	return options;
}, {}));

if (cli.flags.inPlace || cli.flags.output) {
	const output = cli.flags.inPlace ?
		input : cli.flags.output;
	console.log(`Writing to ${output}`);
	fs.writeFileSync(output, xml, "utf8");
} else {
	process.stdout.write(xml);
}