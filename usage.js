import minifyXML from "./index.js"

const xml = `<Tag xmlns:used = "used_ns" xmlns:unused = "unused_ns">
    <!--
        With the default options all comments will be removed, whitespace in
        tags, like spaces between attributes, will be collapsed / removed and
        elements without any content will be collapsed to empty tag elements
    -->
    <AnotherTag  attributeA  =  "..."  attributeB  =  "..."  >  </AnotherTag  >

    <!--
        Also any unused namespaces declarations will be removed by default,
        used namespaces however will be shortened to a minimum length possible
    -->
    <used:NamespaceTag  used:attribute  =  "..."  >
        any valid element content is left unaffected (strangely enough = " ... "
        and even > are valid characters in XML, only &lt; must always be encoded)
    </used:NamespaceTag  >

    <![CDATA[<FakeTag attr = "content in CDATA tags is not minified"></FakeTag>]]>
</Tag>`;

console.log(minifyXML(xml));