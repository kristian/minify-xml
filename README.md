# minify-xml

`minify-xml` is a lightweight and fast XML minifier for NodeJS with a command line.

Existing XML minifiers, such as `pretty-data` often do a pretty (*phun intended*) bad job minifying XML in usually only removing comments and whitespace between tags. `minify-xml` on the other hand also includes minification of tags, e.g. by collapsing the whitespace between multiple attributes and further minifications, such as the removal of unused namespace declarations. `minify-xml` is based on regular expressions and thus executes blazingly fast.

## Online

Use this package online to minify XMLs in your browser, visit:

**[Minify-X.ML](https://minify-x.ml/)** ([https://minify-x.ml/](https://minify-x.ml/))

## Installation

```bash
npm install minify-xml -g
```

## Usage

```js
const minifyXML = require("minify-xml").minify;

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
```

This outputs the minified XML:

```xml
<Tag xmlns:u="used_ns"><AnotherTag attributeA="..." attributeB="..."/><u:NamespaceTag u:attribute="...">
        any valid element content is left unaffected (strangely enough = " ... "
        and even > are valid characters in XML, only &lt; must always be encoded)
    </u:NamespaceTag><![CDATA[<FakeTag attr = "content in CDATA tags is not minified"></FakeTag>]]></Tag>
```

## Options

You may pass in the following options when calling minify:

```js
require("minify-xml").minify(`<tag/>`, { ... });
```

- `removeComments` (default: `true`): Remove comments like `<!-- ... -->`.

- `removeWhitespaceBetweenTags` (default: `true`): Remove whitespace between tags like `<anyTag />   <anyOtherTag />`. Can be limited to tags only by passing the string `"strict"`, otherwise by default other XML constructs as the prolog `<?xml ... ?>`, processing instructions `<?pi ... ?>`, the document type declaration `<!DOCTYPE ... >`, CDATA sections `<![CDATA[ ... ]]>` and comments `<!-- ... -->` will be also considered as tags.

- `collapseWhitespaceInTags` (default: `true`): Collapse whitespace in tags like `<anyTag   attributeA   =   "..."   attributeB    =   "..."   />`.

- `collapseEmptyElements` (default: `true`): Collapse empty elements like `<anyTag anyAttribute = "..."></anyTag>`.

- `trimWhitespaceFromTexts` (default: `false`): Remove leading and tailing whitespace in elements containing text only or a mixture of text and other elements like `<anyTag>  Hello  <anyOtherTag/>  World  </anyTag>`.

- `collapseWhitespaceInTexts` (default: `false`): Collapse whitespace in elements containing text or a mixture of text and other elements (useful for (X)HTML) like `<anyTag>Hello  World</anyTag>`.

- `collapseWhitespaceInProlog` (default: `true`): Collapse and remove whitespace in the xml prolog `<?xml version = "1.0" ?>`.

- `collapseWhitespaceInDocType` (default: `true`): Collapse and remove whitespace in the xml document type declaration `<!DOCTYPE   DocType   >`

- `removeUnusedNamespaces` (default: `true`): Remove any namespaces from tags, which are not used anywhere in the document, like `<tag xmlns:unused="any_uri" />`. Notice the word *anywhere* here, the minifier not does consider the structure of the XML document, thus namespaces which might be only used in a certain sub-tree of elements might not be removed, even though they are not used in that sub-tree.

- `removeUnusedDefaultNamespace`(default: `true`): Remove default namespace declaration like `<tag xmlns="any_uri"/>` in case there is no tag without a namespace in the whole document.

- `shortenNamespaces` (default: `true`): Shorten namespaces, like `<tag xmlns:namespace="any_namespace">` to a minimal length, e.g. `<tag xmlns:n="any_namespace">`. First an attempt is made to shorten the existing namespace to one letter only (e.g. `namespace` is shortened to `n`), in case that letter is already taken, the shortest possible other namespace is used.

- `ignoreCData` (default: `true`): Ignore any content inside of CData tags `<![CDATA[ any content ]]>`.

## CLI

You can run `minify-xml` from the command line to minify XML files:

```bash
minify-xml sitemap.xml
minify-xml blog.atom --in-place
minify-xml view.xml --output view.min.xml
```

Use any of the options above like:

```bash
minify-xml index.html --collapse-whitespace-in-texts --ignore-cdata false
```

## Author

XML minifier by [Kristian Kraljić](https://kra.lc/). Original package and CLI by [Mathias Bynens](https://mathiasbynens.be/).

## Bugs

Please file any issues [on Github](https://github.com/kristian/minify-xml/issues).

## License

This library is dual licensed under the [MIT and Apache 2.0](LICENSE) licenses.