#!/usr/bin/env node

const fs = require("fs");
const { constants: { MAX_STRING_LENGTH } } = require("buffer");

const meow = require("meow");
const { minify, defaultOptions, minifyStream, defaultStreamOptions } = require("./");

const cli = meow(`
	Usage
	  $ minify-xml <input>

	Options
	  --stream, -s Stream the input file, instead of reading it
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

	  --stream-max-match-length The maximum size of matches between chunks, defaults to 256 KiB

	Examples
	  $ minify-xml sitemap.xml --stream --in-place
	  $ minify-xml sitemap.xml --output sitemap.min.xml
`, {
	input: ["input"],
	flags: {
		stream: {
			type: "boolean",
			alias: "s"
		},
		output: {
			type: "string",
			alias: "o"
		},
		inPlace: {
			type: "boolean",
			alias: "i",
		},

		streamMaxMatchLength: {
			type: "number",
			alias: "streamMaximumMatchLength",
			default: 256 * 1024 // 256 KiB
		},

		removeComments: {
			type: "boolean"
		},
		removeWhitespaceBetweenTags: {
			type: "boolean"
		},
		collapseWhitespaceInTags: {
			type: "boolean"
		},
		collapseEmptyElements: {
			type: "boolean"
		},
		trimWhitespaceFromTexts: {
			type: "boolean"
		},
		collapseWhitespaceInTexts: {
			type: "boolean"
		},
		collapseWhitespaceInProlog: {
			type: "boolean"
		},
		collapseWhitespaceInDocType: {
			type: "boolean",
			alias: "collapse-whitespace-in-doctype"
		},
		removeUnusedNamespaces: {
			type: "boolean"
		},
		removeUnusedDefaultNamespace: {
			type: "boolean"
		},
		shortenNamespaces: {
			type: "boolean"
		},
		ignoreCData: {
			type: "boolean",
			alias: "ignore-cdata"
		}
	},
	booleanDefault: undefined,
	allowUnknownFlags: false
});


const input = cli.input[0];
if (!input) {
	cli.showHelp(); // this exits the process.
}

const options = defaultOptions => Object.keys(defaultOptions).reduce((options, option) => {
	if (cli.flags.hasOwnProperty(option)) {
		options[option] = cli.flags[option];
	} return options;
}, {});

let output;
if (cli.flags.inPlace || cli.flags.output) {
	console.log(`Writing to ${output = cli.flags.inPlace ? input : cli.flags.output}`);
}

if (!cli.flags.stream) {
	try {
		if (fs.statSync(input).size > MAX_STRING_LENGTH) {
			console.log(`Files larger than ${MAX_STRING_LENGTH} bytes require to be streamed, switching to stream mode`);
			cli.flags.stream = true;
		}
	} catch(e) {
		// nothing to do here
	}
}

if (cli.flags.stream) {
	fs.createReadStream(input, "utf8")
		.pipe(minifyStream(options(defaultStreamOptions)))
		.pipe(output ? fs.createWriteStream(output, "utf8") : process.stdout);
} else {
	const xml = minify(fs.readFileSync(input, "utf8"), options(defaultOptions));

	if (output) {
		fs.writeFileSync(output, xml, "utf8");
	} else {
		process.stdout.write(xml);
	}
}