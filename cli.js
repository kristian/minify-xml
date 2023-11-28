#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import constants from "buffer";
const { MAX_STRING_LENGTH } = constants;

import meow from "meow";
import { default as camelCase } from "camelcase";
import ProgressBar from "progress";

import { default as minify, defaultOptions, minifyStream, defaultStreamOptions, debug as debugMinify } from "./index.js";

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
	  --consider-preserve-whitespace Consider preserving whitespace
	  --collapse-whitespace-in-tags Collapse whitespace in tags
	  --collapse-empty-elements Collapse empty elements
	  --collapse-whitespace-in-prolog Collapse whitespace in the prolog
	  --collapse-whitespace-in-doctype Collapse whitespace in the document type declaration
	  --remove-schema-location-attributes Remove schema location attributes
	  --remove-unnecessary-standalone-declaration Remove unnecessary standalone in prolog
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
			shortFlag: "s"
		},
		output: {
			type: "string",
			shortFlag: "o"
		},
		inPlace: {
			type: "boolean",
			shortFlag: "i",
		},

		streamMaxMatchLength: {
			type: "number",
			shortFlag: "streamMaximumMatchLength",
			default: 256 * 1024 // 256 KiB
		},

		removeComments: {
			type: "boolean"
		},
		removeWhitespaceBetweenTags: {
			type: "string" // allows 'strict'
		},
		considerPreserveWhitespace: {
			type: "boolean"
		},
		collapseWhitespaceInTags: {
			type: "boolean"
		},
		collapseEmptyElements: {
			type: "boolean"
		},
		trimWhitespaceFromTexts: {
			type: "string" // allows 'strict'
		},
		collapseWhitespaceInTexts: {
			type: "string" // allows 'strict'
		},
		collapseWhitespaceInProlog: {
			type: "boolean"
		},
		collapseWhitespaceInDocType: {
			type: "boolean",
			shortFlag: "collapse-whitespace-in-doctype"
		},
		removeSchemaLocationAttributes: {
			type: "boolean"	
		},
		removeUnnecessaryStandaloneDeclaration: {
			type: "boolean"
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
			shortFlag: "ignore-cdata"
		},

		debug: {
			type: "string",
			isMultiple: true
		}
	},
	booleanDefault: undefined,
	allowUnknownFlags: false,
	importMeta: import.meta
});

const input = cli.input[0], debug = cli.flags.debug.length && !cli.flags.debug.includes("false");
if (!input && !debug) {
	cli.showHelp(); // this exit's the process
}

const options = options => (Array.isArray(options) ? options : Object.keys(options)).reduce((options, option) => {
	if (cli.flags.hasOwnProperty(option) && cli.flags[option] !== undefined) {
		options[option] = String(cli.flags[option]) !== "false" ? (cli.flags[option] || true) : false;
	} return options;
}, {});

let output;
if (cli.flags.inPlace || cli.flags.output) {
	console.log(`Writing to ${output = cli.flags.inPlace ? input : cli.flags.output}`);
}

let size = NaN;
try {
	size = fs.statSync(input).size;
} catch(e) {
	// nothing to do here
} 

if (!cli.flags.stream) {
	if (size > MAX_STRING_LENGTH) {
		// only log to console, if output is set, otherwise the log message ends up in the stdout and might get piped to other applications
		output && console.log(`Files larger than ${MAX_STRING_LENGTH} bytes require to be streamed, switching to stream mode`);
		cli.flags.stream = true;
	}
}

if (debug) {
	// if the debug flag is a string and doesn't contain --debug=true, only debug the single option(s) specified	
	debugMinify(input && fs.readFileSync(input, "utf8"), !cli.flags.debug.includes("true") ? {
		...Object.fromEntries(Object.keys(defaultOptions).map(option => [option, false])), // set all to false
		...Object.fromEntries(cli.flags.debug.map(camelCase).map(option => [option, true])), // set options specified to true
		...options(defaultOptions) // override any other given options, e.g. --debug=remove-whitespace-between-tags --remove-whitespace-between-tags=strict
    } : options(defaultOptions));
} else if (cli.flags.stream) {
	const stream = fs.createReadStream(input, "utf8");
	if (output && size) {
		const bar = new ProgressBar(`  minify ${ path.basename(input) } [:bar] :percent ETA: :etas`, {
			incomplete: " ",
			width: 20,
			total: size
		});
		stream.on("data", chunk =>
			bar.tick(chunk.length));
	}

	stream.pipe(minifyStream(options(defaultStreamOptions)))
		.pipe(output ? fs.createWriteStream(output, "utf8") : process.stdout);
} else {
	const xml = minify(fs.readFileSync(input, "utf8"), options(defaultOptions));

	if (output) {
		fs.writeFileSync(output, xml, "utf8");
	} else {
		process.stdout.write(xml);
	}
}