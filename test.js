const minifyXML = require("./").minify;

const xml = `<Tag xmlns:used="used_ns" xmlns:unused="unused_ns">
    <!--
        With the default options all comments will be removed and whitespace
        in tags, like spaces between attributes, will be collapsed / removed
    -->
    <AnotherTag attributeA   =   "..."   attributeB    =   "..." />

    <!-- By default any unused namespaces will be removed from the tags: -->
    <used:NamespaceTag used:attribute = "...">
        any valid element content is left unaffected (strangely enough = " ... "
        and even > are valid characters in XML, only &lt; must always be encoded)
    </used:NamespaceTag>
</Tag>`;

console.log(minifyXML(xml));