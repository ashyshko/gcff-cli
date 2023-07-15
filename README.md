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
* [`gcff hello PERSON`](#gcff-hello-person)
* [`gcff hello world`](#gcff-hello-world)
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

## `gcff hello PERSON`

Say hello

```
USAGE
  $ gcff hello PERSON -f <value>

ARGUMENTS
  PERSON  Person to say hello to

FLAGS
  -f, --from=<value>  (required) Who is saying hello

DESCRIPTION
  Say hello

EXAMPLES
  $ oex hello friend --from oclif
  hello friend from oclif! (./src/commands/hello/index.ts)
```

_See code: [dist/commands/hello/index.ts](https://github.com/other/gcff/blob/v0.0.0/dist/commands/hello/index.ts)_

## `gcff hello world`

Say hello world

```
USAGE
  $ gcff hello world

DESCRIPTION
  Say hello world

EXAMPLES
  $ gcff hello world
  hello world! (./src/commands/hello/world.ts)
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
<!-- commandsstop -->
