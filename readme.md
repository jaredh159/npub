# `npub`

A simple tool for publishing to NPM.

```sh
# from the directory you want to publish...
$ npub patch
$ npub minor
$ npub major
$ npub prerelease # increments 2.0.0-beta.1 > 2.0.0-beta.2
$ npub 3.2.1 # manually set a specific version
$ npub 4.0.0-alpha.0 --tag canary # set a custom tag (or -t)
# some flags...
$ npub patch --no-git --allow-branch --no-check --no-delay
```

## installation

```sh
npm i -g @jaredh/npub
```
