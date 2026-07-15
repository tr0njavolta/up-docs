---
title: Profiles
sidebar_position: 3
description: Configuration for the Upbound CLI
---

This document explains the basics of profile configurations and how they work in
the Upbound CLI (`up`). Profile configurations enable you to manage multiple
environments and authentication contexts efficiently.

A **profile configuration** is a stored set of connection and authentication
information that the `up` CLI uses to interact with different Upbound systems.
`up` stores this information in a configuration file at `~/.up/config.json`,
allowing you to switch between different environments, organizations, and
authentication contexts without re-entering credentials each time.


:::tip
Ready to configure your control plane context? Go to the [how-to
guide][context] for profile setup.
:::

The `up` CLI uses the specified profile when set via the `--profile` flag or
`UP_PROFILE` environment variable. If you don't specify a profile, `up` uses the
currently selected profile in the configuration file.

## Profile types

Profiles have one of two types, each designed for different deployment scenarios:

- **Cloud profiles**: Interact with Upbound Cloud and Connected Spaces within a given Upbound organization. These profiles are for users working with Upbound's managed service.

- **Disconnected profiles**: Interact with specific self-hosted Spaces not connected to Upbound Cloud. These profiles enable you to manage on-premises or private cloud deployments.

Both profile types can authenticate with an Upbound organization to manage
non-Space resources like Marketplace repositories. Authentication with a
disconnected profile is optional, providing flexibility for air-gapped or highly
secure environments.

## Background

The `up` CLI introduced profile types in v0.37.0 to support the growing variety of
deployment patterns in the Upbound ecosystem. All profiles created in previous
versions are automatically treated as cloud profiles in newer versions, ensuring
backward compatibility.

[context]: /manuals/cli/howtos/profile-config
