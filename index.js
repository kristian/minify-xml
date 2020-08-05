function escapeRegExp(string) {
    return string.replace(/[.*+\-?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}
function findAllMatches(string, regexp, group) {
    var match, matches = [];
    while ((match = regexp.exec(string))) {
        matches.push(typeof group === 'number' ? match[group] : match);
    } return matches;
}

// note: this funky looking positive backward reference regular expression is necessary to match contents inside of tags <...>.
// this is due to that literally any character except <&" is allowed to be put next to everywhere in XML. as even > is a allowed
// character, simply checking for (?<=<[^>]*) would not do the trick if e.g. > is used inside of a tag attribute.
const emptyRegexp = new RegExp(), inTagPattern = /(?<=<[^=\s>]+(?:\s+[^=\s>]+\s*=\s*(?:"[^"]*"|'[^']*'))*\1)/;
function replaceInTag(xml, regexp, lookbehind, replacement) {
    if (!replacement) {
        replacement = lookbehind;
        lookbehind = emptyRegexp;
    }
    
    return xml.replace(new RegExp(inTagPattern.source.replace("\\1", lookbehind.source) + regexp.source, "g"), replacement);
}

const defaultOptions = {
    removeComments: true,
    removeWhitespaceBetweenTags: true,
    collapseWhitespaceInTags: true,
    removeUnusedNamespaces: true
};

module.exports = {
    minify: function(xml, userOptions) {
        // mix in the user options
        const options = {
            ...defaultOptions,
            ...(userOptions || {})
        };

        // remove XML comments <!-- ... -->
        if (options.removeComments) {
            xml = xml.replace(/<![ \r\n\t]*(--([^\-]|[\r\n]|-[^\-])*--[ \r\n\t]*)>/g, String());
        }

        // remove whitespace between tags <anyTag />   <anyOtherTag />
        if (options.removeWhitespaceBetweenTags) {
            xml = xml.replace(/>\s{0,}</g, "><");
        }

        // remove / collapse multiple whitespace in tags <anyTag   attributeA   =   "..."   attributeB    =   "..."   />
        if (options.collapseWhitespaceInTags) {
            xml = replaceInTag(xml, /\s*=\s*/, /\s+[^=\s>]+/, "="); // remove leading / tailing whitespace around = "..."
            xml = replaceInTag(xml, /\s+/, " "); // collapse whitespace between attributes
            xml = replaceInTag(xml, /\s*(?=\/>)/, String()); // remove whitespace before closing > /> of tags
        }

        // remove namespace declarations which are not used anywhere in the document
        if (options.removeUnusedNamespaces) {
            // the search for all xml namespaces could result in some "fake" namespaces (e.g. if a xmlns:... string is found inside the content of an element), as we do not
            // limit the search to the inside of tags. this however comes with no major drawback as we the replace only inside of tags and thus it simplifies the search
            var all = findAllMatches(xml, /\sxmlns:([^\s\/]+)=/g, 1), used = findAllMatches(xml, /<([^\s\/]+):/g, 1),
                unused = all.filter(ns => !used.includes(ns));

            if (used.length) {
                xml = replaceInTag(xml, new RegExp(`\\s+xmlns:(?:${ unused.map(escapeRegExp).join("|") })=(?:"[^"]*"|'[^']*')`), String());
            }
        }

        return xml;
    }
}