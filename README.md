GCFF Command Line Tool
=================

Deploy your web pages and API services easily with cloud function technology.

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![CircleCI](https://circleci.com/gh/ashyshko/gcff-cli/tree/main.svg?style=shield)](https://circleci.com/gh/ashyshko/gcff-cli/tree/main)
[![GitHub license](https://img.shields.io/github/license/ashyshko/gcff-cli)](https://github.com/ashyshko/gcff-cli/blob/main/LICENSE)

<!-- toc -->
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->
# Usage
<!-- usage -->
```sh-session
$ npm install -g gcff
$ gcff COMMAND
running command...
$ gcff (--version)
gcff/0.0.0 darwin-x64 node-v18.12.1
$ gcff --help [COMMAND]
USAGE
  $ gcff COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->
* [`gcff client push express FUNCTIONPATH SCRIPT`](#gcff-client-push-express-functionpath-script)
* [`gcff client push react FUNCTIONPATH PATH`](#gcff-client-push-react-functionpath-path)
* [`gcff client push static FUNCTIONPATH PATH`](#gcff-client-push-static-functionpath-path)
* [`gcff dependencies check FUNCTIONNAME`](#gcff-dependencies-check-functionname)
* [`gcff dependencies list FUNCTIONNAME`](#gcff-dependencies-list-functionname)
* [`gcff dependencies sync FUNCTIONNAME`](#gcff-dependencies-sync-functionname)
* [`gcff help [COMMANDS]`](#gcff-help-commands)
* [`gcff server deploy FUNCTIONNAME PATH`](#gcff-server-deploy-functionname-path)

## `gcff client push express FUNCTIONPATH SCRIPT`

Push express app to server

```
USAGE
  $ gcff client push express FUNCTIONPATH SCRIPT --region <value> --manifest <value> [--accessToken <value> --project
    <value>] [--force] [-y]

ARGUMENTS
  FUNCTIONPATH  [default: [object Object]] Cloud function name and path (function-name/path/to/upload)
  SCRIPT        Location of AMD script with default export to express

FLAGS
  -y, --yes              Automatically confirm any action
  --accessToken=<value>  Specifies the access token used to authenticate and authorize access to Google Cloud services.
  --force                Override content even if it was not changed. Unlinked files from previous content are not going
                         to be removed
  --manifest=<value>     (required) path to package.json with dependencies for this project
  --project=<value>      Specifies the ID of the Google Cloud project to associate with provided gcsUrl.
  --region=<value>       (required) [default: us-central1] The Cloud region for the function

DESCRIPTION
  Push express app to server

EXAMPLES
  $ gcff client push express function-name/server/path /path/to/script
```

## `gcff client push react FUNCTIONPATH PATH`

Push react app content to server

```
USAGE
  $ gcff client push react FUNCTIONPATH PATH --region <value> [--accessToken <value> --project <value>] [--force] [-y]
    [--publicUrlPlaceholder <value>]

ARGUMENTS
  FUNCTIONPATH  [default: [object Object]] Cloud function name and path (function-name/path/to/upload)
  PATH          Location of files to deploy (local directory)

FLAGS
  -y, --yes                       Automatically confirm any action
  --accessToken=<value>           Specifies the access token used to authenticate and authorize access to Google Cloud
                                  services.
  --force                         Override content even if it was not changed. Unlinked files from previous content are
                                  not going to be removed
  --project=<value>               Specifies the ID of the Google Cloud project to associate with provided gcsUrl.
  --publicUrlPlaceholder=<value>  [default: __REACT_APP_PUBLIC_URL_PLACEHOLDER__] Placeholder used as PUBLIC_URL
                                  environment variable for React. Replaced with real path by server. Empty string to
                                  avoid replacement
  --region=<value>                (required) [default: us-central1] The Cloud region for the function

DESCRIPTION
  Push react app content to server

EXAMPLES
  $ gcff client push react function-name/server/path /path/to/folder
```

## `gcff client push static FUNCTIONPATH PATH`

Push static content to server

```
USAGE
  $ gcff client push static FUNCTIONPATH PATH --region <value> [--accessToken <value> --project <value>] [--force] [-y]
    [--default <value>] [--index <value>]

ARGUMENTS
  FUNCTIONPATH  [default: [object Object]] Cloud function name and path (function-name/path/to/upload)
  PATH          Location of files to deploy (local directory)

FLAGS
  -y, --yes              Automatically confirm any action
  --accessToken=<value>  Specifies the access token used to authenticate and authorize access to Google Cloud services.
  --default=<value>      Serve provided file if requested file is not found. If --default specified without --index,
                         default file is served as index
  --force                Override content even if it was not changed. Unlinked files from previous content are not going
                         to be removed
  --index=<value>        Serve provided file if root requested. If --index is not specified but --default is specified,
                         default file is served as index
  --project=<value>      Specifies the ID of the Google Cloud project to associate with provided gcsUrl.
  --region=<value>       (required) [default: us-central1] The Cloud region for the function

DESCRIPTION
  Push static content to server

EXAMPLES
  $ gcff client push static function-name/path /path/to/local/folder
```

## `gcff dependencies check FUNCTIONNAME`

Check relevancy for nodejs dependencies for provided gcff cloud function

```
USAGE
  $ gcff dependencies check FUNCTIONNAME --region <value> [--json] [--accessToken <value> --project <value>]
    [--saveUpdatedDependencies <value>]

ARGUMENTS
  FUNCTIONNAME  Cloud function name

FLAGS
  --accessToken=<value>              Specifies the access token used to authenticate and authorize access to Google
                                     Cloud services.
  --project=<value>                  Specifies the ID of the Google Cloud project to associate with provided gcsUrl.
  --region=<value>                   (required) [default: us-central1] The Cloud region for the function
  --saveUpdatedDependencies=<value>  JSON File name to save updated dependencies

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Check relevancy for nodejs dependencies for provided gcff cloud function

EXAMPLES
  $ gcff dependencies check function-name
```

## `gcff dependencies list FUNCTIONNAME`

List currently installed packages for provided gcff cloud function

```
USAGE
  $ gcff dependencies list FUNCTIONNAME --region <value> [--json] [--accessToken <value> --project <value>]

ARGUMENTS
  FUNCTIONNAME  Cloud function name

FLAGS
  --accessToken=<value>  Specifies the access token used to authenticate and authorize access to Google Cloud services.
  --project=<value>      Specifies the ID of the Google Cloud project to associate with provided gcsUrl.
  --region=<value>       (required) [default: us-central1] The Cloud region for the function

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  List currently installed packages for provided gcff cloud function

EXAMPLES
  $ gcff dependencies list function-name
```

## `gcff dependencies sync FUNCTIONNAME`

Update dependencies without updating server

```
USAGE
  $ gcff dependencies sync FUNCTIONNAME --region <value> [--accessToken <value> --project <value>] [--ignoreConflicts]
    [--removeDependency <value>] [--loadDependencies <value> | --addDependency <value> | ] [-y]

ARGUMENTS
  FUNCTIONNAME  Cloud function name

FLAGS
  -y, --yes                      Automatically confirm any action
  --accessToken=<value>          Specifies the access token used to authenticate and authorize access to Google Cloud
                                 services.
  --addDependency=<value>...     [default: ] Force add new dependency, overrides if dependency existed
  --ignoreConflicts              Ignore conflicts and upload only dependencies without conflicts
  --loadDependencies=<value>     Load dependencies from JSON file, use field "dependencies"
  --project=<value>              Specifies the ID of the Google Cloud project to associate with provided gcsUrl.
  --region=<value>               (required) [default: us-central1] The Cloud region for the function
  --removeDependency=<value>...  [default: ] Force remove dependency, returns error if dependency existed

DESCRIPTION
  Update dependencies without updating server

EXAMPLES
  $ gcff dependencies sync function-name
```

## `gcff help [COMMANDS]`

Display help for gcff.

```
USAGE
  $ gcff help [COMMANDS] [-n]

ARGUMENTS
  COMMANDS  Command to show help for.

FLAGS
  -n, --nested-commands  Include all nested commands in the output.

DESCRIPTION
  Display help for gcff.
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v5.2.11/src/commands/help.ts)_

## `gcff server deploy FUNCTIONNAME PATH`

Updates Google Cloud Function

```
USAGE
  $ gcff server deploy FUNCTIONNAME PATH --region <value> [--accessToken <value> --project <value>] [-f] [--merge]
    [--gen2] [--entry-point <value>] [--gcffPath <value>] [-y]

ARGUMENTS
  FUNCTIONNAME  Cloud function name
  PATH          Location of source code to deploy (root directory of function source)

FLAGS
  -f, --force            Override existing source without verification
  -y, --yes              Automatically confirm any action
  --accessToken=<value>  Specifies the access token used to authenticate and authorize access to Google Cloud services.
  --entry-point=<value>  Name of a Google Cloud Function (as defined in source code) that will be executed
  --gcffPath=<value>     Google Cloud Storage bucket path for serving content
  --gen2                 If enabled, this command will use Cloud Functions (Second generation)
  --merge                Merge requested packages with uploaded
  --project=<value>      Specifies the ID of the Google Cloud project to associate with provided gcsUrl.
  --region=<value>       (required) [default: us-central1] The Cloud region for the function

DESCRIPTION
  Updates Google Cloud Function

EXAMPLES
  $ gcff server deploy function-name /path/to/server/dist
```
<!-- commandsstop -->
