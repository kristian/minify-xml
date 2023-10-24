# Changelog

## `HEAD`

- Add NodeJS 20.x to the test matrix
- Add (this) changelog

## 4.1.0

Reduce required NodeJS engine version to >= 16

## 4.0.0

Major bump to use ES Modules

3.5.0 being the last version to support `require`

## 3.5.0

- Fix Node engine definition (Node 10 was never supported)
- Create Node.js test GitHub Action workflow
- Make removing whitespace after XML prolog more lenient

## 3.4.0

Improve replacing between brackets

## 3.3.1

Fix issue with preserving whitespace

## 3.3.0

Add to consider xml:space and &lt;pre> for whitepsace

## 3.2.0

Add progress indicator to CLI for streaming

## 3.1.0

Automatically switch to streaming large files

## 3.0.0

Add minifyStream function and --stream CLI option

## 2.5.0

CLI to report unknown flags

## 2.4.0

Add prolog / doctype minification

## 2.3.1

Add all options to CLI

## 2.3.0

Add `--output` option to CLI

## 2.2.2/3

Update README.md w/ online version

## 2.2.1

Add `removeUnusedDefaultNamespace` to [README.md](README.md)

## 2.2.0

Add tests, shorten namespaces and text trims

## 2.1.5

Fix multiple used namespaces in attributes

## 2.1.4

Fix used namespaces in attributes

## 2.1.3

Fix determine used namespaces

## 2.1.2

Performance improvement for XML w/o CData tags

## 2.1.1

Fix to remove whitespace before closing >

## 2.1.0

Add `collapseEmptyElements` option to collapse empty elements

## 2.0.2

Fix to not minify CDATA sections

## 2.0.1

Fix issues with unused namespace detection

## 2.0.0

First NPM release, adapting the original code of [Mathias Bynens](https://mathiasbynens.be/)

## 1.x

Original version(s) by [Mathias Bynens](https://mathiasbynens.be/). Changes are lost in space