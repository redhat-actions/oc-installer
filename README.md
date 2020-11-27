# oc-installer

[![oc-installer Test](https://github.com/redhat-actions/oc-installer/workflows/oc-installer%20Test/badge.svg)](https://github.com/redhat-actions/oc-installer/actions?query=workflow%3A%22oc-installer+Test%22)
[![Verify Bundle](https://github.com/redhat-actions/oc-installer/workflows/Verify%20Bundle/badge.svg)](https://github.com/redhat-actions/oc-installer/actions?query=workflow%3A%22Verify+Bundle%22)
<br><br>
[![tag badge](https://img.shields.io/github/v/tag/redhat-actions/oc-installer?sort=semver)](https://github.com/redhat-actions/oc-installer/tags)
[![license badge](https://img.shields.io/github/license/redhat-actions/oc-installer)](./LICENSE)
[![size badge](https://img.shields.io/github/size/redhat-actions/oc-installer/dist/index.js)](./dist)

`oc-installer` installs [`oc`](https://github.com/openshift/oc) onto your GitHub Action runner.

Note that GitHub's [Ubuntu Environments](https://github.com/actions/virtual-environments#available-environments) come with `oc 4.6` installed. So, if you are using Ubuntu and do not require a different `oc` version, this action is not necessary for you to use.

Once `oc` is present, use [oc-login](https://github.com/redhat-actions/oc-login) to log into the cluster and set up a Kubernetes context.

## Inputs:

The action has one input: `oc_version`. If not specified, it defaults to `latest`.

The `oc_version` can be:
- `latest` (the default) to use the latest stable release.
- An existing `oc` version. For example, `4.6` or `3.11.173`.
  - The version must exist on our public download site. Refer to the download sites for [v3](https://mirror.openshift.com/pub/openshift-v3/clients/) and [v4](https://mirror.openshift.com/pub/openshift-v4/clients/oc/).
  - This type of version is required to use the [caching feature](#how-the-cache-works).
- A URL from which to download `oc`.

### Example
Also see [this repository's workflows](./.github/workflows/).

```yaml
 steps:
    - name: Install oc
      uses: redhat-actions/oc-installer@v1
      with:
        version: '4.6'
  # Now, oc is available for the rest of these steps.
```

## Proxy Support

If you need a self-hosted runner to communicate via a proxy server, you can use one of the following methods as described in the [GitHub Actions documentation](https://help.github.com/en/actions/hosting-your-own-runners/using-a-proxy-server-with-self-hosted-runners).

- Configuring a proxy server using environment variables (*HTTPS_PROXY*, *HTTP_PROXY*)
- Using an `.env` file to set the proxy configuration

<a id="how-the-cache-works"></a>
## How the Cache Works

oc-installer caches the `oc` executable to avoid downloading the same executable multiple times when running different jobs.

The cache is only enabled when the `version` input is specified as a semantic version in the task. If the version is `latest`, or a URL, the cache is not used.

The oc executable will be cached inside the `_work/_tool/oc` folder.

## Contributing

This is an open source project open to anyone. This project welcomes contributions and suggestions!

## Feedback & Questions

If you discover an issue please file a bug in [GitHub issues](https://github.com/redhat-actions/oc-installer/issues) and we will fix it as soon as possible.
