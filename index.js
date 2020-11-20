"use strict"; // we are overriding arguments, so this is important!

const regExpGlobal = "g";
function escapeRegExp(string) {
    return string.replace(/[.*+\-?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}
function findAllMatches(string, regexp, group) {
    let match, matches = [];
    while ((match = regexp.exec(string))) { if (match[group]) {
        matches.push(typeof group === "number" ? match[group] : match);
    } } return matches;
}

// note: this funky looking positive lookbehind regular expression is necessary to match contents inside of tags <...>. this 
// is due to that literally any characters except <&" are allowed to be put next to everywhere in XML. as even > is an allowed
// character, simply checking for (?<=<[^>]*) would not do the trick if e.g. > is used inside of a tag attribute.
const emptyRegexp = new RegExp(), tagPattern = /(?<=<\/?[^\s\/>]+\b(?:\s+[^=\s>]+\s*=\s*(?:"[^"]*"|'[^']*'))*%1)/;
function findAllMatchesInTags(xml, regexp, lookbehind, group) {
    if (!(lookbehind instanceof RegExp)) {
        group = lookbehind; lookbehind = emptyRegexp;
    }

    return findAllMatches(xml, new RegExp(tagPattern.source.replace("%1",
        lookbehind.source) + regexp.source, regExpGlobal), group);
}
function replaceInTags(xml, regexp, lookbehind, replacement) {
    if (!(lookbehind instanceof RegExp)) {
        replacement = lookbehind; lookbehind = emptyRegexp;
    }
    
    return xml.replace(new RegExp(tagPattern.source.replace("%1",
        lookbehind.source) + regexp.source, regExpGlobal), replacement);
}
function replaceBetweenTags(xml, regexp, lookbehind, lookahead, replacement) {
    if (!(lookbehind instanceof RegExp)) {
        lookahead = lookbehind; lookbehind = emptyRegexp;
    }
    if (!(lookahead instanceof RegExp)) {
        replacement = lookahead; lookahead = emptyRegexp;
    }

    return replaceInTags(xml, new RegExp(regexp.source + `(?=${ lookahead.source }<[^!])`),
        new RegExp("\\s*/?>" + lookbehind.source), replacement);
}

const defaultOptions = {
    removeComments: true,
    removeWhitespaceBetweenTags: true,
    collapseWhitespaceInTags: true,
    collapseEmptyElements: true,
    trimWhitespaceFromTexts: false,
    collapseWhitespaceInTexts: false,
    removeUnusedNamespaces: true,
    removeUnusedDefaultNamespace: true,
    shortenNamespaces: true,
    ignoreCData: true
};

function ignoreCData(replacement) {
    return function(match, offset, string, groups) {
        // the interface of replacement functions contains any number of arguments at the second position, for contents of capturing groups.
        // the last argument is either an object (for browsers supporting named capturing groups) or the examined string otherwise.
        let argument = arguments.length - 1, captures;
        groups = typeof arguments[argument] === "object" ? arguments[argument--] : undefined;
        string = arguments[argument--]; offset = arguments[argument--];
        captures = Array.prototype.slice.call(arguments, 1, argument + 1);

        // check if the offset lies inside of a CData section
        if (/<!\[CDATA\[(?![\s\S]*?]]>)/.test(string.substr(0, offset))) {
            return match; // if so do not replace anything
        }

        // otherwise execute the replacement of the capturing groups manually
        return captures ? replacement.replace(/(?<!\$)\$(\d+|\&)/g, (group, number) =>
            ["0", "&"].includes(number) ? match : captures[parseInt(number - 1)] || String()) : replacement;
    };
}

module.exports.minify = function(xml, options) {
    // apply the default options
    options = {
        ...defaultOptions,
        ...(options || {})
    };

    // decide on whether to use the ignoreCData replacement function or not, to improve performance
    const replacer = options.ignoreCData && xml.includes("<![CDATA[") ? ignoreCData : replacement => replacement, emptyReplacer = replacer(String());

    // remove XML comments <!-- ... -->
    if (options.removeComments) {
        xml = xml.replace(/<!\s*(?:--(?:[^-]|-[^-])*--\s*)>/g, emptyReplacer);
    }

    // remove whitespace between tags <anyTag/>   <anyOtherTag/>
    if (options.removeWhitespaceBetweenTags) {
        xml = replaceBetweenTags(xml, /\s+/, emptyReplacer)
    }

    // remove / collapse multiple whitespace in tags <anyTag  attributeA  =  "..."  attributeB  =  "..."> ... </anyTag  >
    if (options.collapseWhitespaceInTags) {
        xml = replaceInTags(xml, /\s+/, replacer(" ")); // collapse whitespace between attributes
        xml = replaceInTags(xml, /\s*=\s*/, /\s+[^=\s>]+/, replacer("=")); // remove leading / tailing whitespace around attribute equal signs
        xml = replaceInTags(xml, /\s*(?=\/?>)/, emptyReplacer); // remove whitespace before closing > /> of tags
    }
    
    // collapse elements with start / end tags and no content to empty element tags <anyTag anyAttribute = "..." ></anyTag >
    if (options.collapseEmptyElements) {
        xml = xml.replace(/<([^\s\/>]+)([^<]*?)(?<!\/)><\/\1\s*>/g, replacer("<$1$2/>"));
    }

    // remove / trim whitespace in texts like <anyTag>  foo  </anyTag>
    if (options.trimWhitespaceFromTexts) {
        xml = replaceBetweenTags(xml, /\s*([\s\S]*?)\s*/, replacer("$1"))

        // special case: treat CDATA sections as text, so also remove whitespace between CDATA end tags and other tags
        xml = xml.replace(/(?<=<!\[CDATA\[[\s\S]*?]]>)\s+/g, String());
    }

    // collapse whitespace in texts like <anyTag>foo    bar   baz</anyTag>
    if (options.collapseWhitespaceInTexts) {
        xml = replaceBetweenTags(xml, /\s+/, /[^<]*/, /[^<]*/, replacer(" "));
    }

    // remove unused namespaces and shorten the remaining ones to a minimum length
    if (options.removeUnusedNamespaces || options.shortenNamespaces) {
        // the search for all xml namespaces in tags could result in some "fake" namespaces if a xmlns:... string is found inside of CDATA
        // tags. this however comes with no major drawback as we the replace only inside of tags and thus it simplifies the search
        let all = [...new Set(findAllMatchesInTags(xml, /\s+xmlns:([^\s=]+)\s*=/g, 1))];

        // remove namespace declarations which are not used anywhere in the document (limitation: the approach taken here will not consider the structure of the XML document
        // thus namespaces which might be only used in a certain sub-tree of elements might not be removed, even though they are not used in that sub-tree)
        if (options.removeUnusedNamespaces) {
            let used = [...new Set([
                ...findAllMatches(xml, /<([^\s\/>:]+):/g, 1), // look for all tags with namespaces (limitation: might also include tags inside of CData, we ignore that for now)
                ...findAllMatchesInTags(xml, /([^\s=:]+):/, /\s+/, 1) // look for all attributes with namespaces
            ])].filter(ns => ns !== "xmlns"), unused = all.filter(ns => !used.includes(ns));

            if (unused.length) {
                xml = replaceInTags(xml, new RegExp(`\\s+xmlns:(?:${ unused.map(escapeRegExp).join("|") })\\s*=\\s*(?:"[^"]*"|'[^']*')`), emptyReplacer);
                all = used; // only used namespaces still present in the file
            }
        }


        // special case: remove unused default namespace declaration if no tags with no namespace declaration are present
        // (it's impossible for attributes with namespaces to refer back to the default namespace, so we can omit searching for them)
        if (options.removeUnusedDefaultNamespace && !/<([^\s\/>:]+)[\s\/>]/.test(xml)) {
            xml = replaceInTags(xml, /\s+xmlns\s*=\s*(?:"[^"]*"|'[^']*')/, emptyReplacer);
        }

        // shorten existing (non already one character namespaces) to a shorter equivalent
        if(options.shortenNamespaces) {
            const startCharset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_",
                charset = startCharset.substr(0, 52) + "0123456789-_.";
            function firstUnusedNamespace(prefix, length) {
                if (!arguments.length) {
                    for (length = 1; !(prefix = firstUnusedNamespace(
                        String(), length)); length++);
                    return prefix;
                } else if (!length) {
                    return prefix;
                }
            
                const chars = prefix ? charset : startCharset;
                for (let char = 0; char < chars.length; char++) {
                    let ns = firstUnusedNamespace(prefix + chars[char], length - 1);
                    if (ns && !all.includes(ns)) {
                        return ns;
                    }
                }
            
                return false; // for this length / prefix there is no unused namespace to choose from
            }

            all.forEach((ns, idx) => {
                if (ns.length === 1) {
                    return; // already at minimal length
                }

                // try to shorten the existing namespace to one character first, if it is occupied already, find the first unused one by brute force
                let newNs = !all.includes(ns[0]) ? ns[0] : firstUnusedNamespace();
                if (ns.length <= newNs.length) {
                    return; // already at minimal length
                }

                // replace all occurrences of the namespace in the document and mark it as "used"
                xml = xml.replace(new RegExp(`<(/)?${ns}:`, regExpGlobal), replacer(`<$1${newNs}:`)); // tags with namespaces
                xml = replaceInTags(xml, new RegExp(`${ns}:`), /\s+/, replacer(`${newNs}:`)); // attributes with namespaces
                xml = replaceInTags(xml, new RegExp(`xmlns:${ns}(?=[\s=])`), /\s+/, replacer(`xmlns:${newNs}`)); // namespace declaration

                all[idx] = newNs;
            });
        }
    }

    return xml.trim();
}