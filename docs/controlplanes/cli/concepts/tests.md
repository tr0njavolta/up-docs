---
title: Project tests
description: "What are Tests?"
sidebar_position: 7
---

This document explains the basics of tests and how they work in control plane
projects.

Tests in Upbound and Crossplane validate that your platform behaves as expected
before you deploy to a real environment.

Tests simulate the behavior of your control plane in response to specific
inputs, verifying that your compositions, functions, and packages produce the
correct outputs. Think of them as integration tests for your infrastructure
platform.

Just like application developers write tests to validate code, platform
engineers can write tests to validate their control plane definitions.

## What you can test

In a control plane project, you can write tests for:

- **Compositions and Embedded Functions** - ensure the correct set of composed resources generate from a given XR input and validate the behavior of your functions
- **End-to-end behavior** - simulate real-world scenarios to verify that all components work together

## Why tests matter

Composition tests and E2E tests help you:

<!-- vale write-good.Weasel = NO -->
- Catch logic errors early in your compositions or function pipelines
- Validate logic in functions
- Ensure that new changes don't break existing behavior (regression testing)
- Build confidence in the correctness and safety of your platform configurations
- Iterate faster by running tests locally before pushing to staging or production
<!-- vale write-good.Weasel = YES -->

## How tests work

You define tests as part of your control plane project, usually in a directory
like `tests/` or `project/tests/`. Each test case includes:

- A test input, such as an XR manifest or request payload
- The expected output, usually a set of composed resources or transformed fields
- Assertions or checks that compare the actual results to the expected results

You execute these tests using the `up test run` command, which runs the control
plane locally in a sandboxed environment and evaluates each test case.

You don't need a live Kubernetes cluster to run these tests.
