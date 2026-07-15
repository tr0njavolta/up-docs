---
title: Data Residency
sidebar_position: 11
description: "Information about Upbound's data residency policies."
---

<!-- vale write-good.TooWordy = NO -->
By default, Upbound stores data for Upbound Cloud in the United States. When you
purchase an enterprise or business critical subscription to Upbound, you can
choose where your organization's control planes and data get stored.
<!-- vale write-good.TooWordy = YES -->

The available regions are:

<!-- vale alex.ProfanityUnlikely = NO -->
- The United States
- The European Union
<!-- vale alex.ProfanityUnlikely = YES -->

To get data residency for your organization, contact [Upbound's Sales team][contact].

## Data stored in your region

Upbound stores the following data for your organization within your chosen
region.

<!-- vale Upbound.Spelling = NO -->
| Description of data | Examples |
| ---- | ---- |
| Customer content, including text, metadata, and other data available on the service | Control planes, including control plane names<br></br>user-created content such as Crossplane compositions<br></br>resource metadata for resources managed by control planes|
| Data or logs that identify your organization | Data for business continuity and disaster recovery (`BCDR`) |
| Data or logs that identify a person | Pseudonymized identifiers in audit logs. |
<!-- vale Upbound.Spelling = YES -->

## Data stored outside your region

To operate the service, Upbound may store the following data for your
organization outside your chosen region:

| Description of data | Examples |
| ---- | ---- |
| Information that Upbound needs to administer a subscription | Organization name |
| Support and feedback data | Support requests or case notes<br></br>phone conversations |

## Data transfers

Upbound documents reasons for the transfer of data out of your organization's
region, but doesn't notify you when transfers occur.

## Data residency and Upbound Marketplace


The Upbound Marketplace, including the `marketplace.upbound.io` web portal and
the OCI registry `xpkg.upbound.io`, operates from the United States.

To pull images hosted in the Marketplace from within an EU data boundary, Upbound
recommends mirroring these images to your own OCI registry.

[contact]: https://www.upbound.io/contact-us
