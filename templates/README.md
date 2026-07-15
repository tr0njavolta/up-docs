# Upbound's Content Templates

This section of the docs repo collects the content templates for the _types_ of
content we require to maintain good docs.

## Docs types

Other than reference material which is typically generated from code, Upbound
uses 4 content types:

### Tutorials

Tutorials help users become acquainted with the product. They are
**learning-oriented** and focus on teaching a specific skill. Unlike how-to
guides, tutorials **do not** assume users have prior experience or are familiar
with certain concepts.

Tutorials serve the function of giving users hands-on experience with Upbound to
internalize key concepts in a low-risk context.

These docs should generally go in [`getstarted`](/docs/getstarted/index.md)
section, [`guides`](/docs/guides/index.md), or in specific concept directories
under [`controlplanes`](/docs/controlplanes/uxp/overview.md) or
[`insights`](/docs/insights/overview.md).

[Tutorial Template](/templates/tutorial_template.md)

### Concepts

Concept docs offer clear, concise, and consistent information on a specific
concept or process. THis is the essential background information that allows our
uses to align their existing knowledge with the tasks they need to perform.

Concept docs can be extended definitions of major abstractions and help explain
the context of a feature or service within the broader Upbound framework.

These docs are required for features or functions in the
[`controlplanes`](/docs/controlplanes/uxp/overview.md) directory.

[Concept Template](/templates/concept_template.md)


### How-to's

How-to docs take users through a series of steps to solve a specific problem.
How-to's should show users how to solve a real world problem or a task. The
how-to describes a set of sequential steps users must complete to accomplish a
task. How-to's assume the user has a basic knowledge of the application and has
already read the quickstart or tutorials related to this topic.

Not to be confused with tutorials, how-to's are **task-oriented** while
tutorials are **learning-oriented**.

How-to's in our product can also apply to installation guides, but have a
different intended audience (Spaces Admin vs. Developer).

These docs are required for features or functions in the
[`controlplanes`](/docs/controlplanes/uxp/overview.md) directory.

[How-to Template](/templates/howto_template.md)

### Troubleshooting

Troubleshooting docs should assist users in common failure patterns that have
been triaged by SMEs. Troubleshooting docs should clearly address the scenario
the user might be in the title. They should have reproducible error messages or
failure states included in the docs.

Troubleshooting docs should describe the symptom of the problem and the solution
to the problem in a step-by-step format.

[Troubleshooting Template](/templates/troubleshooting_template.md)


For more information on these templates and how to use them, visit [The Good
Docs Project](https://www.thegooddocsproject.dev/template)
