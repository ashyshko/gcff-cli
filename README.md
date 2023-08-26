GCFF Command Line Tool
=================

Deploy your web pages and API services easily with cloud function technology.

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![CircleCI](https://circleci.com/gh/ashyshko/gcff-cli/tree/master.svg?style=shield)](https://circleci.com/gh/ashyshko/gcff-cli/tree/master)
[![GitHub license](https://img.shields.io/github/license/ashyshko/gcff-cli)](https://github.com/ashyshko/gcff-cli/blob/master/LICENSE)

<!-- toc -->
* [Motivation](#motivation)
* [Features](#features)
* [Prerequisites](#prerequisites)
* [Setup](#setup)
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

# Motivation

Currently, there are many frameworks that provide scalable web service access. These frameworks are mainly optimized for high load use cases and user-facing functionality. However, they come with high maintenance costs, complicated initial deployment procedures, and requirements for system health status monitoring.

On the other hand, there are cases when a web service is used by an internal team, so it is not subject to high load usage. In this scenario, the most important part is to deploy the functionality in the simplest way possible, minimizing idle maintenance costs without additional monitoring requirements.

Abstracting from web service functionality, this dilemma can be framed as choosing between Google Cloud App Engine (or other solutions like Compute Engine or Kubernetes Engine) and Google Cloud Function. Using App Engine offers granular control over your application, while Cloud Function provides a much lower time to launch and addresses scalability and stability issues.

The idea of the Google Cloud Functions Framework (GCFF) project is to provide the ability to deploy a web service using Google Cloud Functions. Cloud Functions can be run from a browser by the user and render a page with content. A single Cloud Function can be used for multiple servers, allowing it to implement both the server and client parts of the service.

This approach is not a silver bullet in general. It provides some tradeoffs which may not be applicable for some use cases:

- Maintenance cost for idle cloud functions is zero, but each call is significantly more expensive than classic app architectures. Do not use this approach for high load applications.
- Reaction time (latency) from the server might be significantly slower than classic app architecture due to the warm-up requirement for cloud function.
- Performance for this solution could be notably worse than a classic app.

## Security aspects

The approach to serve the client and server from a single entity (Google Cloud Function in this case) potentially weakens security in general. Also, higher costs for operation and less granularity on scalability may lead to increased risks for extra costs in case of a DDOS attack. It is highly recommended to make GCFF available only to a limited number of people to minimize the explained risks. Also, as the main use case is an internal tool, it may have some sensitive information available, so restricting access should also be necessary.

One of the approaches to restrict access is making the cloud function available only in virtual private networks. It works well if you already have an internal VPN set up for other purposes (as part of internal policy).

Another approach could be restricting the cloud function to authorized users in your organization. In this case, the user has to be authorized in their Google account to have access to this functionality. The downside of this approach is that it's not possible to provide authorization data to the browser, so a browser extension (e.g. ModHeader) should be used, which will add an 'Authorization' header to each request to the cloud function.

# Features

Currently, GCFF provides three types of web applications:

- Static: This type serves static files.
- Express: It binds an Express.js application to an endpoint for a cloud function.
- React: It serves a React application at the provided path with support for React-Router.

# Prerequisites

- Google Cloud Project with Cloud Functions and Cloud Storage APIs enabled
- Google Cloud Storage bucket to serve content
- [gcloud CLI](https://cloud.google.com/sdk/docs/install)
- [git](https://git-scm.com/downloads)
- [nodejs and npm](https://nodejs.org/en/download)

# Setup

## Create Cloud Function

The GCFF CLI intentionally does not provide a command to create a cloud function, as this command would simply duplicate the `gcloud` command. Cloud functions can be added through the [Google Cloud Console](https://console.cloud.google.com/functions/add). The following options are recommended/required:
- (Recommended) Environment: 2nd gen
- (Recommended) Require authentication: see reasons provided in the "Security Aspects" section
- (Required) Runtime: Node.js 18 or higher

Initially, the cloud function can be pushed with the default script (hello world). The actual server will be uploaded in the next step.

## Upload Server

```
git clone git@github.com:ashyshko/gcff-server.git
cd gcff-server
npm install
npm run build
gcff server deploy <CLOUD_FUNCTION_NAME> out --gcffPath=<GCS_BUCKET_NAME>
```

# Commands
<!-- commands -->
* [`gcff client init express FUNCTIONPATH`](#gcff-client-init-express-functionpath)
* [`gcff client init react FUNCTIONPATH SRCFOLDER`](#gcff-client-init-react-functionpath-srcfolder)
* [`gcff client list FUNCTIONNAME`](#gcff-client-list-functionname)
* [`gcff client prune FUNCTIONNAME`](#gcff-client-prune-functionname)
* [`gcff client push express FUNCTIONPATH SCRIPT`](#gcff-client-push-express-functionpath-script)
* [`gcff client push react FUNCTIONPATH PATH`](#gcff-client-push-react-functionpath-path)
* [`gcff client push static FUNCTIONPATH PATH`](#gcff-client-push-static-functionpath-path)
* [`gcff client remove FUNCTIONPATH`](#gcff-client-remove-functionpath)
* [`gcff dependencies check FUNCTIONNAME`](#gcff-dependencies-check-functionname)
* [`gcff dependencies list FUNCTIONNAME`](#gcff-dependencies-list-functionname)
* [`gcff dependencies sync FUNCTIONNAME`](#gcff-dependencies-sync-functionname)
* [`gcff help [COMMANDS]`](#gcff-help-commands)
* [`gcff server deploy FUNCTIONNAME PATH`](#gcff-server-deploy-functionname-path)

## `gcff client init express FUNCTIONPATH`

Creates express client from template

```
USAGE
  $ gcff client init express FUNCTIONPATH [--out <value>] [--name <value>]

ARGUMENTS
  FUNCTIONPATH  Cloud function name and path (function-name/path/to/upload)

FLAGS
  --name=<value>  name for project
  --out=<value>   path to clone expressjs client template

DESCRIPTION
  Creates express client from template

EXAMPLES
  $ gcff client init express function-name/server/path
```

## `gcff client init react FUNCTIONPATH SRCFOLDER`

Initializes react client

```
USAGE
  $ gcff client init react FUNCTIONPATH SRCFOLDER

ARGUMENTS
  FUNCTIONPATH  Cloud function name and path (function-name/path/to/upload)
  SRCFOLDER     Directory containing the React package. It is recommended to use 'create-react-app' to initialize the
                directory.

DESCRIPTION
  Initializes react client

EXAMPLES
  $ gcff client init react function-name/server/path react-app-folder
```

## `gcff client list FUNCTIONNAME`

List all modules pushed to cloud function

```
USAGE
  $ gcff client list FUNCTIONNAME --region <value> [--accessToken <value> --project <value>] [--json]

ARGUMENTS
  FUNCTIONNAME  Cloud function name

FLAGS
  --accessToken=<value>  Specifies the access token used to authenticate and authorize access to Google Cloud services.
  --project=<value>      Specifies the ID of the Google Cloud project to associate with provided gcsUrl.
  --region=<value>       (required) [default: us-central1] The Cloud region for the function

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  List all modules pushed to cloud function

EXAMPLES
  $ gcff client list function-name
```

## `gcff client prune FUNCTIONNAME`

Remove all unlinked files and verify files checksum

```
USAGE
  $ gcff client prune FUNCTIONNAME --region <value> [--accessToken <value> --project <value>] [--json]

ARGUMENTS
  FUNCTIONNAME  Cloud function name

FLAGS
  --accessToken=<value>  Specifies the access token used to authenticate and authorize access to Google Cloud services.
  --project=<value>      Specifies the ID of the Google Cloud project to associate with provided gcsUrl.
  --region=<value>       (required) [default: us-central1] The Cloud region for the function

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Remove all unlinked files and verify files checksum

EXAMPLES
  $ gcff client prune function-name
```

## `gcff client push express FUNCTIONPATH SCRIPT`

Push express app to server

```
USAGE
  $ gcff client push express FUNCTIONPATH SCRIPT --region <value> --manifest <value> [--accessToken <value> --project
    <value>] [--force] [-y]

ARGUMENTS
  FUNCTIONPATH  Cloud function name and path (function-name/path/to/upload)
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
  FUNCTIONPATH  Cloud function name and path (function-name/path/to/upload)
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
  FUNCTIONPATH  Cloud function name and path (function-name/path/to/upload)
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

## `gcff client remove FUNCTIONPATH`

Removes client and its related files from cloud function

```
USAGE
  $ gcff client remove FUNCTIONPATH --region <value> [--accessToken <value> --project <value>] [-y]

ARGUMENTS
  FUNCTIONPATH  Cloud function name and path (function-name/path/to/upload)

FLAGS
  -y, --yes              Automatically confirm any action
  --accessToken=<value>  Specifies the access token used to authenticate and authorize access to Google Cloud services.
  --project=<value>      Specifies the ID of the Google Cloud project to associate with provided gcsUrl.
  --region=<value>       (required) [default: us-central1] The Cloud region for the function

DESCRIPTION
  Removes client and its related files from cloud function

EXAMPLES
  $ gcff client remove function-name/path
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
  $ gcff server deploy FUNCTIONNAME PATH --region <value> [--accessToken <value> --project <value>] [-f]
    [--entry-point <value>] [--gcffPath <value>] [-y]

ARGUMENTS
  FUNCTIONNAME  Cloud function name
  PATH          Location of source code to deploy (root directory of function source)

FLAGS
  -f, --force            Override existing source without verification
  -y, --yes              Automatically confirm any action
  --accessToken=<value>  Specifies the access token used to authenticate and authorize access to Google Cloud services.
  --entry-point=<value>  Name of a Google Cloud Function (as defined in source code) that will be executed
  --gcffPath=<value>     Google Cloud Storage bucket path for serving content
  --project=<value>      Specifies the ID of the Google Cloud project to associate with provided gcsUrl.
  --region=<value>       (required) [default: us-central1] The Cloud region for the function

DESCRIPTION
  Updates Google Cloud Function

EXAMPLES
  $ gcff server deploy function-name /path/to/server/dist
```
<!-- commandsstop -->
