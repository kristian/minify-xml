"use strict"; // we are overriding arguments, so this is important!

function escapeRegExp(string) {
    return string.replace(/[.*+\-?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}
function findAllMatches(string, regexp, group) {
    var match, matches = [];
    while ((match = regexp.exec(string))) { if (match[group]) {
        matches.push(typeof group === 'number' ? match[group] : match);
    } } return matches;
}

// note: this funky looking positive lookbehind regular expression is necessary to match contents inside of tags <...>. this 
// is due to that literally any characters except <&" are allowed to be put next to everywhere in XML. as even > is an allowed
// character, simply checking for (?<=<[^>]*) would not do the trick if e.g. > is used inside of a tag attribute.
const emptyRegexp = new RegExp(), inTagPattern = /(?<=<[^\s>]+(?:\s+[^=\s>]+\s*=\s*(?:"[^"]*"|'[^']*'))*\1)/;
function replaceInTags(xml, regexp, lookbehind, replacement) {
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
    collapseEmptyElements: true,
    removeUnusedNamespaces: true,
    ignoreCData: true
};

function ignoreCData(replacement) {
    return function(match, offset, string, groups) {
        // the interface of replacement functions contains any number of arguments at the second position, for contents of capturing groups.
        // the last argument is either an object (for browsers supporting named capturing groups) or the examined string otherwise.
        var argument = arguments.length - 1, captures;
        groups = typeof arguments[argument] === "object" ? arguments[argument--] : undefined;
        string = arguments[argument--]; offset = arguments[argument--];
        captures = Array.prototype.slice.call(arguments, 1, argument + 1);

        // check if the offset lies inside of a CData section
        if (/<!\[CDATA\[(?!.*]]>)/.test(string.substr(0, offset))) {
            return match; // if so do not replace anything
        }

        // otherwise execute the replacement of the capturing groups manually
        return captures ? replacement.replace(/(?<!\$)\$(\d+|\&)/g, (group, number) =>
            ["0", "&"].includes(number) ? match : captures[parseInt(number - 1)]) : replacement;
    };
}

module.exports = {
    minify: function(xml, options) {
        // apply the default options
        options = {
            ...defaultOptions,
            ...(options || {})
        };

        // decide on whether to use the ignoreCData replacement function or not, to improve performance
        const replacer = options.ignoreCData && xml.includes("<![CDATA[") ? ignoreCData : replacement => replacement;

        // remove XML comments <!-- ... -->
        if (options.removeComments) {
            xml = xml.replace(/<![ \r\n\t]*(?:--(?:[^\-]|[\r\n]|-[^\-])*--[ \r\n\t]*)>/g, replacer(String()));
        }

        // remove whitespace between tags <anyTag />   <anyOtherTag />
        if (options.removeWhitespaceBetweenTags) {
            xml = xml.replace(/>\s{0,}</g, replacer("><"));
        }

        // remove / collapse multiple whitespace in tags <anyTag   attributeA   =   "..."   attributeB    =   "..."   />
        if (options.collapseWhitespaceInTags) {
            xml = replaceInTags(xml, /\s*=\s*/, /\s+[^=\s>]+/, replacer("=")); // remove leading / tailing whitespace around = "..."
            xml = replaceInTags(xml, /\s+/, replacer(" ")); // collapse whitespace between attributes
            xml = replaceInTags(xml, /\s*(?=\/?>)/, replacer(String())); // remove whitespace before closing > /> of tags
        }

        // collapse elements with start / end tags and no content to empty element tags <anyTag anyAttribute = "..."></anyTag>
        if (options.collapseEmptyElements) {
            xml = xml.replace(/<([^\s>]+)([^<]*?)><\/\1>/g, replacer("<$1$2/>"));
        }

        // remove namespace declarations which are not used anywhere in the document (limitation: the approach taken here will not consider the structure of the XML document
        // thus namespaces which might be only used in a certain sub-tree of elements might not be removed, even though they are not used in that sub-tree)
        if (options.removeUnusedNamespaces) {
            // the search for all xml namespaces could result in some "fake" namespaces (e.g. if a xmlns:... string is found inside the content of an element), as we do not
            // limit the search to the inside of tags. this however comes with no major drawback as we the replace only inside of tags and thus it simplifies the search
            var all = findAllMatches(xml, /\sxmlns:([^\s\/]+)=/g, 1), used = [
                ...findAllMatches(xml, /<([^\s\/]+):/g, 1), // look for all tags with namespaces (limitation: might also include tags inside of CData, we ignore that for now)
                ...findAllMatches(xml, /<[^\s>]+(?:\s+(?:([^=\s>]+):[^=\s>]+)\s*=\s*(?:"[^"]*"|'[^']*'))*/g, 1) // look for all attributes with namespaces
            ], unused = all.filter(ns => !used.includes(ns));

            if (unused.length) {
                xml = replaceInTags(xml, new RegExp(`\\s+xmlns:(?:${ unused.map(escapeRegExp).join("|") })=(?:"[^"]*"|'[^']*')`), replacer(String()));
            }
        }

        return xml;
    }
}