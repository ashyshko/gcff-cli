# Architecture Overview

## Modules and Rules

A module is the atomic unit of GCFF architecture. Each module handles the associated URI prefix for the server. A module is defined by the `resolve.json` file placed into the GCS bucket with the corresponding path. For instance, if the server is deployed to the bucket `gs://gcff-data` and the module describes the path `assets/static/` of the server (e.g. serves file http://function-name.cloudfunctions.net/function-name/assets/static/logo.png), the module is described by the `resolve.json` file in the folder `gs://gcff-data/assets/static/resolve.json`.

Each module defines a set of rules. Each rule is described by a glob pattern and its behavior depends on the rule type and the provided configuration.

## GCS Bucket Structure

The GCS bucket assigned to the GCFF function contains two types of content:
- `resolve.json` files: to describe rules for this module
- other files: to save resources required for rules for this module

Each client uploads their own `resolve.json` file to the folder it's expected to be served from. Optionally, clients may upload other files required for their own logic.

## `resolve.json` File Structure

The `resolve.json` file contains a JSON object with the following required fields:
- `rules`: an array of rules for the provided file. It's the most important part of the `resolve.json` file.
- `files`: A list of file names (specified as relative paths) with their respective sha256 checksums. The main purpose of this field is to ensure proper storage cleanup when a file is overridden.
- `dependencies`: package.json-style dependencies for this module. Dependencies without customizable server-side logic (e.g. static files) provide an empty list of dependencies.

Example of resolve.json file:
```json
{
  "files": {
    "favicon.ico": "3d10f7da6c603178340081668c4ac5b3ae9743ca9a262ab0fcd312fbb9f48bdd",
    "index.html": "3a0c4fe8b579d62f2c9fab450117a88ad0f167467c775a0058c518259858e428",
    "index.js": "50b3d8c3903af3f78d871b94557ab14f4e39ca192eaca3d2cfa863c867279a14",
    "logo512.png": "9ea4f4da7050c0cc408926f6a39c253624e9babb1d43c7977cd821445a60b461"
  },
  "dependencies": {},
  "rules": [
    {
      "path": "favicon.ico",
      "type": "static",
      "name": "favicon.ico"
    },
    {
      "path": "index.html",
      "type": "react",
      "publicUrlPlaceholder": "__REACT_APP_PUBLIC_URL_PLACEHOLDER__",
      "name": "index.html"
    },
    {
      "path": "index.js",
      "type": "static",
      "name": "index.js"
    },
    {
      "path": "logo512.png",
      "type": "static",
      "name": "logo512.png"
    },
    {
      "path": ".",
      "type": "react",
      "publicUrlPlaceholder": "__REACT_APP_PUBLIC_URL_PLACEHOLDER__",
      "name": "index.html"
    },
    {
      "path": "**",
      "type": "react",
      "publicUrlPlaceholder": "__REACT_APP_PUBLIC_URL_PLACEHOLDER__",
      "name": "index.html"
    }
  ]
}
```

## Rule Selection

Rule selection works on two levels:
- Level 1: Choosing the `resolve.json` file - the GCFF server looks for all parent folders for the provided URI and finds the closest `resolve.json` file. If no files are found, an HTTP error `404 Not Found` is returned.
- Level 2: Inside `resolve.json`, the GCFF server iterates over all rules and finds the first rule with a glob matching. If no matching rule is found, an HTTP error `404 Not Found` is returned.