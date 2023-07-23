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
* [`gcff plugins`](#gcff-plugins)
* [`gcff plugins:install PLUGIN...`](#gcff-pluginsinstall-plugin)
* [`gcff plugins:inspect PLUGIN...`](#gcff-pluginsinspect-plugin)
* [`gcff plugins:install PLUGIN...`](#gcff-pluginsinstall-plugin-1)
* [`gcff plugins:link PLUGIN`](#gcff-pluginslink-plugin)
* [`gcff plugins:uninstall PLUGIN...`](#gcff-pluginsuninstall-plugin)
* [`gcff plugins:uninstall PLUGIN...`](#gcff-pluginsuninstall-plugin-1)
* [`gcff plugins:uninstall PLUGIN...`](#gcff-pluginsuninstall-plugin-2)
* [`gcff plugins update`](#gcff-plugins-update)
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

## `gcff plugins`

List installed plugins.

```
USAGE
  $ gcff plugins [--core]

FLAGS
  --core  Show core plugins.

DESCRIPTION
  List installed plugins.

EXAMPLES
  $ gcff plugins
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v2.4.7/src/commands/plugins/index.ts)_

## `gcff plugins:install PLUGIN...`

Installs a plugin into the CLI.

```
USAGE
  $ gcff plugins:install PLUGIN...

ARGUMENTS
  PLUGIN  Plugin to install.

FLAGS
  -f, --force    Run yarn install with force flag.
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Installs a plugin into the CLI.
  Can be installed from npm or a git url.

  Installation of a user-installed plugin will override a core plugin.

  e.g. If you have a core plugin that has a 'hello' command, installing a user-installed plugin with a 'hello' command
  will override the core plugin implementation. This is useful if a user needs to update core plugin functionality in
  the CLI without the need to patch and update the whole CLI.


ALIASES
  $ gcff plugins add

EXAMPLES
  $ gcff plugins:install myplugin 

  $ gcff plugins:install https://github.com/someuser/someplugin

  $ gcff plugins:install someuser/someplugin
```

## `gcff plugins:inspect PLUGIN...`

Displays installation properties of a plugin.

```
USAGE
  $ gcff plugins:inspect PLUGIN...

ARGUMENTS
  PLUGIN  [default: .] Plugin to inspect.

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Displays installation properties of a plugin.

EXAMPLES
  $ gcff plugins:inspect myplugin
```

## `gcff plugins:install PLUGIN...`

Installs a plugin into the CLI.

```
USAGE
  $ gcff plugins:install PLUGIN...

ARGUMENTS
  PLUGIN  Plugin to install.

FLAGS
  -f, --force    Run yarn install with force flag.
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Installs a plugin into the CLI.
  Can be installed from npm or a git url.

  Installation of a user-installed plugin will override a core plugin.

  e.g. If you have a core plugin that has a 'hello' command, installing a user-installed plugin with a 'hello' command
  will override the core plugin implementation. This is useful if a user needs to update core plugin functionality in
  the CLI without the need to patch and update the whole CLI.


ALIASES
  $ gcff plugins add

EXAMPLES
  $ gcff plugins:install myplugin 

  $ gcff plugins:install https://github.com/someuser/someplugin

  $ gcff plugins:install someuser/someplugin
```

## `gcff plugins:link PLUGIN`

Links a plugin into the CLI for development.

```
USAGE
  $ gcff plugins:link PLUGIN

ARGUMENTS
  PATH  [default: .] path to plugin

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Links a plugin into the CLI for development.
  Installation of a linked plugin will override a user-installed or core plugin.

  e.g. If you have a user-installed or core plugin that has a 'hello' command, installing a linked plugin with a 'hello'
  command will override the user-installed or core plugin implementation. This is useful for development work.


EXAMPLES
  $ gcff plugins:link myplugin
```

## `gcff plugins:uninstall PLUGIN...`

Removes a plugin from the CLI.

```
USAGE
  $ gcff plugins:uninstall PLUGIN...

ARGUMENTS
  PLUGIN  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ gcff plugins unlink
  $ gcff plugins remove
```

## `gcff plugins:uninstall PLUGIN...`

Removes a plugin from the CLI.

```
USAGE
  $ gcff plugins:uninstall PLUGIN...

ARGUMENTS
  PLUGIN  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ gcff plugins unlink
  $ gcff plugins remove
```

## `gcff plugins:uninstall PLUGIN...`

Removes a plugin from the CLI.

```
USAGE
  $ gcff plugins:uninstall PLUGIN...

ARGUMENTS
  PLUGIN  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ gcff plugins unlink
  $ gcff plugins remove
```

## `gcff plugins update`

Update installed plugins.

```
USAGE
  $ gcff plugins update [-h] [-v]

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Update installed plugins.
```

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
