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
const emptyRegExp = new RegExp(), tagPattern = /(?<=<\/?[^?!\s\/>]+\b(?:\s+[^=\s>]+\s*=\s*(?:"[^"]*"|'[^']*'))*%1)/.source,
    betweenBracketsPattern = tagPattern.replace(/(?<=(?<!\(\?)<)/, "(?:!\\s*(?:--(?:[^-]|-[^-])*--\\s*)|!\\[(?:CDATA|.*?)\\[(?:[^\\]]|][^\\]]|]][^>])*]]|!DOCTYPE\\s+(?:[^>[]|\\[[\\s\\S]*?\\])*|\\?(?:[^?]|\\?[^>])*\\?|").replace("%1", "\\s*[!?/]?)>") + "%1(?=<)",
    prologPattern = tagPattern.replace(/(?<=(?<!\(\?)<).*(?=\\b)/, "\\?xml")
function findAllMatchesInTags(xml, regexp, options = { tagPattern, lookbehind: emptyRegExp, lookbehindPattern: String(), group: 0 }) {
    const lookbehindPattern = options.lookbehindPattern || (options.lookbehind || emptyRegExp).source;
    return findAllMatches(xml, new RegExp((options.tagPattern || tagPattern).replace("%1", lookbehindPattern) + regexp.source, regExpGlobal), options.group);
}
// include non-tags means declaration like <! comments / doctype declaration and <? prolog / processing instructions
function replaceInTags(xml, regexp, replacement, options = { tagPattern, lookbehind: emptyRegExp, lookbehindPattern: String() }) {
    const lookbehindPattern = options.lookbehindPattern || (options.lookbehind || emptyRegExp).source;
    return xml.replace(new RegExp((options.tagPattern || tagPattern).replace("%1", lookbehindPattern) + regexp.source, regExpGlobal), replacement);
}
function replaceBetweenTags(xml, regexp, replacement, options = { lookbehind: emptyRegExp, lookbehindPattern: String(), lookahead: emptyRegExp, lookaheadPattern: String(), includeNonTags: false }) {
    const lookbehindPattern = "\\s*/?>" + (options.lookbehindPattern || (options.lookbehind || emptyRegExp).source),
        lookaheadPattern = options.lookaheadPattern || (options.lookahead || emptyRegExp).source + "<[^?!]";
    return replaceInTags(xml, new RegExp(regexp.source + `(?=${ lookaheadPattern })`), replacement, { lookbehindPattern });
}
function replaceBetweenBrackets(xml, regexp, replacement) {
    return xml.replace(new RegExp(betweenBracketsPattern.replace("%1", regexp.source), regExpGlobal), replacement);
}

const strict = "strict", defaultOptions = module.exports.defaultOptions = {
    removeComments: true,
    removeWhitespaceBetweenTags: true, // "strict", will not consider prolog / doctype, as tags
    collapseWhitespaceInTags: true,
    collapseEmptyElements: true,
    trimWhitespaceFromTexts: false,
    collapseWhitespaceInTexts: false,
    collapseWhitespaceInProlog: true,
    collapseWhitespaceInDocType: true,
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

        // if the replacement is a function, apply our arguments
        if (typeof replacement === "function") {
            return replacement.apply(this, arguments);
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

    function removeComments(xml) {
        return xml.replace(/<!\s*(?:--(?:[^-]|-[^-])*--\s*)>/g, emptyReplacer);
    }

    // remove XML comments <!-- ... -->
    if (options.removeComments) {
        xml = removeComments(xml);
    }

    // remove whitespace only between tags <anyTag/>   <anyOtherTag/>
    if (options.removeWhitespaceBetweenTags) {
        xml = (options.removeWhitespaceBetweenTags === strict ? replaceBetweenTags :
        // special case: also consider the prolog <?xml ... ?>, processing instructions <?pi ... ?>, the document type declaration <!DOCTYPE ... >, CDATA sections <![CDATA[ ... ]]> and comments <!-- ... --> as tags here
            replaceBetweenBrackets)(xml, /\s+/, emptyReplacer);
    }

    function collapseWhitespaceInTags(xml, options = { tagPattern }) {
        xml = replaceInTags(xml, /\s+/, replacer(" "), options); // collapse whitespace between attributes
        xml = replaceInTags(xml, /\s*=\s*/, replacer("="), { ...options, lookbehind: /\s+[^=\s>]+/ }); // remove leading / tailing whitespace around attribute equal signs
        xml = replaceInTags(xml, /\s*(?=[/?]?>)/, emptyReplacer, options); // remove whitespace before closing > /> ?> of tags
        return xml;
    }

    // remove / collapse whitespace in tags <anyTag  attributeA  =  "..."  attributeB  =  "..."> ... </anyTag  >
    if (options.collapseWhitespaceInTags) {
        xml = collapseWhitespaceInTags(xml);
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
        xml = replaceBetweenTags(xml, /\s+/, replacer(" "), { lookbehind: /[^<]*/, lookahead: /[^<]*/ });
    }

    // remove / collapse whitespace in the xml prolog <?xml version = "1.0" ?>
    if (options.collapseWhitespaceInProlog) {
        xml = collapseWhitespaceInTags(xml, { tagPattern: prologPattern });
    }

    // remove / collapse whitespace in the xml document type declaration <!DOCTYPE   DocType   >
    if (options.collapseWhitespaceInDocType) {
        xml = xml.replace(/<!DOCTYPE\s+([^\s>[]+)(?:\s+(SYSTEM|PUBLIC)\s+("[^"]*"|'[^']*')(?:\s+("[^"]*"|'[^']*'))?)?(?:\s*\[([\s\S]*?)\])?\s*>/, replacer(
            (match, name, type, literal1, literal2, subset) => `<!DOCTYPE ${name}${ [type, literal1, literal2]
                .map(token => token && " " + token).join(String()) }${ subset ? `[${ (xml => {
                    // use a simplified minify xml for the internal subset declaration of the document type
                    xml = removeComments(xml); // remove comments
                    xml = xml.replace(/\s+/g, " "); // collapse whitespace
                    xml = xml.replace(/>\s+</g, "><"); // remove any whitespace between declarations (assuming that > cannot appear in the declarations themselves)
                    return xml.trim();
                })(subset) }]` : String() }>`));
    }
    
    // remove unused namespaces and shorten the remaining ones to a minimum length
    if (options.removeUnusedNamespaces || options.shortenNamespaces) {
        // the search for all xml namespaces in tags could result in some "fake" namespaces if a xmlns:... string is found inside of CDATA
        // tags. this however comes with no major drawback as we the replace only inside of tags and thus it simplifies the search
        let all = [...new Set(findAllMatchesInTags(xml, /\s+xmlns:([^\s=]+)\s*=/g, { group: 1 }))];

        // remove namespace declarations which are not used anywhere in the document (limitation: the approach taken here will not consider the structure of the XML document
        // thus namespaces which might be only used in a certain sub-tree of elements might not be removed, even though they are not used in that sub-tree)
        if (options.removeUnusedNamespaces) {
            let used = [...new Set([
                ...findAllMatches(xml, /<([^\s\/>:]+):/g, 1), // look for all tags with namespaces (limitation: might also include tags inside of CData, we ignore that for now)
                ...findAllMatchesInTags(xml, /([^\s=:]+):/, { lookbehind: /\s+/, group: 1 }) // look for all attributes with namespaces
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
                xml = replaceInTags(xml, new RegExp(`${ns}:`), replacer(`${newNs}:`), { lookbehind: /\s+/ }); // attributes with namespaces
                xml = replaceInTags(xml, new RegExp(`xmlns:${ns}(?=[\s=])`), replacer(`xmlns:${newNs}`), { lookbehind: /\s+/ }); // namespace declaration

                all[idx] = newNs;
            });
        }
    }

    return xml.trim();
}