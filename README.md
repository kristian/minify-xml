# minify-xml

`minify-xml` is a lightweight and fast XML minifier for NodeJS with a command line.

Existing XML minifiers, such as `pretty-data` often do a pretty (*phun intended*) bad job minifying XML in usually only removing comments and whitespace between tags. `minify-xml` on the other hand also includes minification of tags, e.g. by collapsing the whitespace between multiple attributes and further minifications, such as the removal of unused namespace declarations. `minify-xml` is based on regular expressions and thus executes blazingly fast.

## Installation

```bash
npm install minify-xml -g
```

## Usage

```js
const minifyXML = require("minify-xml").minify;

const xml = `<Tag xmlns:used="used_ns" xmlns:unused="unused_ns">
    <!--
        With the default options all comments will be removed, whitespace in
        tags, like spaces between attributes, will be collapsed / removed and
        elements without any content will be collapsed to empty tag elements
    -->
    <AnotherTag attributeA   =   "..."   attributeB   =   "..."    ></AnotherTag>

    <!-- By default any unused namespaces will be removed from the tags: -->
    <used:NamespaceTag used:attribute = "...">
        any valid element content is left unaffected (strangely enough = " ... "
        and even > are valid characters in XML, only &lt; must always be encoded)
    </used:NamespaceTag>

    <![CDATA[<FakeTag attr = "content in CDATA tags is not minified"></FakeTag>]]>
</Tag>`;

console.log(minifyXML(xml));
```

This outputs the minified XML:

```xml
<Tag xmlns:used="used_ns"><AnotherTag attributeA="..." attributeB="..."/><used:NamespaceTag used:attribute="...">
        any valid element content is left unaffected (strangely enough = " ... "
        and even > are valid characters in XML, only &lt; must always be encoded)
    </used:NamespaceTag><![CDATA[<FakeTag attr = "content in CDATA tags is not minified"></FakeTag>]]>
</Tag>
```

## Options

You may pass in the following options when calling minify:

```js
require("minify-xml").minify(`<tag/>`, { ... });
```

- `removeComments` (default: `true`): Remove comments like `<!-- ... -->`.

- `removeWhitespaceBetweenTags` (default: `true`): Remove whitespace between tags like `<anyTag />   <anyOtherTag />`.

- `collapseWhitespaceInTags` (default: `true`): Collapse whitespace in tags like `<anyTag   attributeA   =   "..."   attributeB    =   "..."   />`.

- `collapseEmptyElements` (default: `true`): Collapse empty elements like `<anyTag anyAttribute = "..."></anyTag>`.

- `removeUnusedNamespaces` (default: `true`): Removes any namespaces from tags, which are not used anywhere in the document, like `<tag xmlns:unused="any_url" />`. Notice the word *anywhere* here, the minifier not does consider the structure of the XML document, thus namespaces which might be only used in a certain sub-tree of elements might not be removed, even though they are not used in that sub-tree.

- `ignoreCData` (default: `true`): Ignores any content inside of XML CData tags `<![CDATA[ any content ]]>`.

## CLI

You can run `minify-xml` from the command line to minify XML files:

```bash
minify-xml sitemap.xml
minify-xml --in-place blog.atom
```

## Author

XML minifier by [Kristian Kraljić](https://kra.lc/). Original package and CLI by [Mathias Bynens](https://mathiasbynens.be/).

## Reporting bugs

Please file any issues [on Github](https://github.com/kristian/minify-xml/issues).

## License

This library is dual licensed under the [MIT and Apache 2.0](LICENSE) licenses.