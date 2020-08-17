# Openshift Extension for GitHub Actions

The OpenShift Extension for GitHub Actions gives you the ability to create workflows to automate the deployment process to [OpenShift](https://github.com/openshift/origin) 

## Inputs:

| Name                  | Requirement | Description |
| --------------------- | ----------- | ----------- |
| `version`        | _optional_ | Default: "latest". Must be in form `version: 'latest'`; It accepts 3 different values: version number (such as 3.11.36), url where to download oc bundle (i.e https://mirror.openshift.com/pub/openshift-v3/clients/3.11.36/linux/oc.tar.gz) or latest (which will download the latest version available). Also look at <a href="#how-the-cache-works">How the cache works</a> N.B: By using the version number you have to make sure it exists in our Oc repo - v.3 (https://mirror.openshift.com/pub/openshift-v3/clients/) or v.4 (https://mirror.openshift.com/pub/openshift-v4/clients/oc/) |
| `openshift_server_url`        | _required_ | The URL of the OpenShift cluster. We suggest to use [secrets](https://help.github.com/en/actions/automating-your-workflow-with-github-actions/creating-and-using-encrypted-secrets#creating-encrypted-secrets) to store OpenShift URL. Must be in form `openshift_server_url: ${{ secrets.OPENSHIFT_SERVER_URL }}` |
| `parameters`            | _required_ | JSON with values to connect to the OpenShift cluster. We suggest to use secrets to store sensitive data. Must be in form `parameters: '{"apitoken": "${{ secrets.API_TOKEN }}", "acceptUntrustedCerts": "true"}'` [More Info](#openshift-authentication-methods-supported) |
| `cmd`   | _required_ | One or more oc commands to be executed. |
| `useLocalOc` | _optional_ | It forces the extension to use, if present, the oc cli found in the machine where the agent is running. If no version is specified, the extension will use the local oc cli no matter its version. If a version is specified then the extension will first check if the oc cli installed has the same version requested by the user, if not, the correct oc cli will be downloaded. |

### OpenShift Authentication Methods Supported

To configure an OpenShift connection you need to feed in the extension with some informations related to your OpenShift cluster so that it can authenticate. Currently we support these authentication methods:

#### Basic Authentication

It uses username and password to connect to the cluster. 

| Name                  | Requirement | Description |
| --------------------- | ----------- | ----------- |
| `username`        | _required_ | OpenShift username. |
| `password`        | _required_ | Password for the specified user. |
| `acceptUntrustedCerts`            | _optional_ | Whether it is ok to accept self-signed (untrusted) certificated. |
| `certificateAuthorityFile`   | _optional_ | Path where the certificate authority file is stored. |

The parameters input must be in form `parameters: '{"username": "${{ secrets.USERNAME }}", "password": "${{ secrets.PASSWORD }}", "acceptUntrustedCerts": "true"}'`

#### Token Authentication

It uses an API token to connect to the cluster. 

| Name                  | Requirement | Description |
| --------------------- | ----------- | ----------- |
| `apitoken`        | _required_ | The API token used for authentication. |
| `acceptUntrustedCerts`            | _optional_ | Whether it is ok to accept self-signed (untrusted) certificated. |
| `certificateAuthorityFile`   | _optional_ | Path where the certificate authority file is stored. |

The parameters input must be in form `parameters: '{"apitoken": "${{ secrets.API_TOKEN }}"}'`

## How does OpenShift Action work?

The action has been built to be quite flexible and can be used in different use-cases. Based on the inputs the action will behave accordingly.
 - Set up `oc` to be used later on
 - Handle OpenShift cluster login
 - Execute list of `oc` commands.

#### Setup oc

If you are only interested in setting up `oc` so to use it in a following script, you only need to define the version of the `oc` cli to be downloaded.

```yaml
 steps:
    - name: OpenShift Action
      uses: redhat-developer/openshift-action
      with:
        version: '3.11.90'
    - name: followingScript
      run: |
        oc login --token=${{ secrets.API_TOKEN }} --server=${{ secrets.OPENSHIFT_SERVER_URL }}
        oc get pods | grep build
```

#### Setup oc and log in to the Cluster

If you want the extension to handle the login, you have to define the cluster url and the parameters needed to log in.

```yaml
steps:
    - name: OpenShift Action
      uses: redhat-developer/openshift-action
      with:
        version: '3.11.90'
        openshift_server_url: ${{ secrets.OPENSHIFT_SERVER_URL }}
        parameters: '{"apitoken": "${{ secrets.API_TOKEN }}", "acceptUntrustedCerts": "true"}'
    - name: followingScript
      run:  oc get pods | grep build
```
#### Setup oc, log in to the cluster and execute commands

In case you just want to execute commands on your cluster, you can directly define them inside the action.

```yaml
steps:
    - name: OpenShift Action
      uses: redhat-developer/openshift-action
      with:
        version: '3.11.90'
        openshift_server_url: ${{ secrets.OPENSHIFT_SERVER_URL }}
        parameters: '{"apitoken": "${{ secrets.API_TOKEN }}", "acceptUntrustedCerts": "true"}'
        cmd: |          
          'get pods'
          'new-project name'
```

## Example `workflow.yml` with OpenShift Action

```yaml
name: Example workflow for Openshift Action
on: [push]
env:
  PROJECT: dev

jobs:
  run:
    runs-on: macos-latest
    steps:
    - uses: actions/checkout@v1
    - name: OpenShift Action
      uses: redhat-developer/openshift-actions@v1.1
      with:
        version: 'latest'
        openshift_server_url: ${{ secrets.OPENSHIFT_SERVER_URL }}
        parameters: '{"apitoken": "${{ secrets.API_TOKEN }}", "acceptUntrustedCerts": "true"}'
        cmd: |          
          'version'
          'new-project ${PROJECT}'
```

Note: The `OpenShift Action` step needs to run after actions/checkout@v1.

## Proxy Support

If you need a self-hosted runner to communicate via a proxy server, you can use one of the following methods, as described in the official [GitHub Actions website](https://help.github.com/en/actions/hosting-your-own-runners/using-a-proxy-server-with-self-hosted-runners):

- Configuring a proxy server using environment variables (*https_proxy*, *http_proxy*)
- Using a `.env` file to set the proxy configuration

Below is an example of workflow for setting up environment variables:

```yaml
name: Example workflow for Openshift Action
on: [push]
jobs:
  run:
    env:
      HTTPS_PROXY: "${{ secrets.PROXY }}"
      HTTP_PROXY: "${{ secrets.PROXY }}"
    runs-on: macos-latest
    steps:
    - uses: actions/checkout@v1
    - name: OpenShift Action
      uses: redhat-developer/openshift-actions@v1.1
      with:
        version: 'latest'
        openshift_server_url: ${{ secrets.OPENSHIFT_SERVER_URL }}
        parameters: '{"apitoken": "${{ secrets.API_TOKEN }}", "acceptUntrustedCerts": "true"}'
        cmd: |          
          'version'
          'new-project my-project'
```

<a id="how-the-cache-works"></a>
## How the cache works in OpenShift Action

OpenShift Action supports `oc` executable caching based on it's version to avoid downloading the same executable over and over when running different pipelines.

The cache is only enabled when the version is in number format and clearly specified in the task (e.g 4.1, 3.1.28..). If the version will be defined as an URL or using the latest label (when wanting to use the latest oc version available), the extension will try to download the oc version requested without checking the cache. 

The oc executable will be cached inside the `_work/_tool/oc` folder.

## Contributing

This is an open source project open to anyone. This project welcomes contributions and suggestions!

## Feedback & Questions

If you discover an issue please file a bug in [GitHub issues](https://github.com/redhat-developer/openshift-actions/issues) and we will fix it as soon as possible.

## License

MIT, See [LICENSE](https://github.com/redhat-developer/openshift-actions/blob/master/LICENSE.md) for more information.
