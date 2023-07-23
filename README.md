oclif-hello-world
=================

oclif example Hello World CLI

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![CircleCI](https://circleci.com/gh/oclif/hello-world/tree/main.svg?style=shield)](https://circleci.com/gh/oclif/hello-world/tree/main)
[![GitHub license](https://img.shields.io/github/license/oclif/hello-world)](https://github.com/oclif/hello-world/blob/main/LICENSE)

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
* [`gcff client push express FUNCTIONNAME DESTINATION SCRIPT`](#gcff-client-push-express-functionname-destination-script)
* [`gcff client push react FUNCTIONNAME DESTINATION PATH`](#gcff-client-push-react-functionname-destination-path)
* [`gcff client push static FUNCTIONNAME DESTINATION PATH`](#gcff-client-push-static-functionname-destination-path)
* [`gcff help [COMMANDS]`](#gcff-help-commands)
* [`gcff server deploy FUNCTIONNAME PATH`](#gcff-server-deploy-functionname-path)

## `gcff client push express FUNCTIONNAME DESTINATION SCRIPT`

Push express app to server

```
USAGE
  $ gcff client push express FUNCTIONNAME DESTINATION SCRIPT --region <value> [--accessToken <value> --project <value>]
    [-y]

ARGUMENTS
  FUNCTIONNAME  Cloud function name
  DESTINATION   Destination folder
  SCRIPT        Location of AMD script with default export to express

FLAGS
  -y, --yes              Automatically confirm any action
  --accessToken=<value>  Specifies the access token used to authenticate and authorize access to Google Cloud services.
  --project=<value>      Specifies the ID of the Google Cloud project to associate with provided gcsUrl.
  --region=<value>       (required) [default: us-central1] The Cloud region for the function

DESCRIPTION
  Push express app to server

EXAMPLES
  $ gcff client push express function-name server/path /path/to/script
```

## `gcff client push react FUNCTIONNAME DESTINATION PATH`

Push react app content to server

```
USAGE
  $ gcff client push react FUNCTIONNAME DESTINATION PATH --region <value> [--accessToken <value> --project <value>]
    [--publicUrlPlaceholder <value>] [-y]

ARGUMENTS
  FUNCTIONNAME  Cloud function name
  DESTINATION   Destination folder
  PATH          Location of files to deploy (root directory of function source)

FLAGS
  -y, --yes                       Automatically confirm any action
  --accessToken=<value>           Specifies the access token used to authenticate and authorize access to Google Cloud
                                  services.
  --project=<value>               Specifies the ID of the Google Cloud project to associate with provided gcsUrl.
  --publicUrlPlaceholder=<value>  [default: __REACT_APP_PUBLIC_URL_PLACEHOLDER__] Placeholder used as PUBLIC_URL
                                  environment variable for React. Replaced with real path by server. Empty string to
                                  avoid replacement
  --region=<value>                (required) [default: us-central1] The Cloud region for the function

DESCRIPTION
  Push react app content to server

EXAMPLES
  $ gcff client push react function-name server/path /path/to/folder
```

## `gcff client push static FUNCTIONNAME DESTINATION PATH`

Push static content to server

```
USAGE
  $ gcff client push static FUNCTIONNAME DESTINATION PATH --region <value> [--accessToken <value> --project <value>]
    [--default <value>] [--index <value>] [-y]

ARGUMENTS
  FUNCTIONNAME  Cloud function name
  DESTINATION   Destination folder
  PATH          Location of files to deploy (root directory of function source)

FLAGS
  -y, --yes              Automatically confirm any action
  --accessToken=<value>  Specifies the access token used to authenticate and authorize access to Google Cloud services.
  --default=<value>      Serve provided file if requested file is not found. If --default specified without --index,
                         default file is served as index
  --index=<value>        Serve provided file if root requested. If --index is not specified but --default is specified,
                         default file is served as index
  --project=<value>      Specifies the ID of the Google Cloud project to associate with provided gcsUrl.
  --region=<value>       (required) [default: us-central1] The Cloud region for the function

DESCRIPTION
  Push static content to server

EXAMPLES
  $ gcff client push static function-name server/path /path/to/folder --defaultFile=index.html
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
    [--gen2] [--entry-point <value>] [--bucket <value>] [-y]

ARGUMENTS
  FUNCTIONNAME  Cloud function name
  PATH          Location of source code to deploy (root directory of function source)

FLAGS
  -f, --force            Override existing source without verification
  -y, --yes              Automatically confirm any action
  --accessToken=<value>  Specifies the access token used to authenticate and authorize access to Google Cloud services.
  --bucket=<value>       Google Cloud Storage bucket name for serving content
  --entry-point=<value>  Name of a Google Cloud Function (as defined in source code) that will be executed
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
