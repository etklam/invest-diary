# Issue tracker: Local Markdown

Issues and PRDs for this repo live as Markdown files in `.scratch/`.

## Conventions

- One feature per directory: `.scratch/<feature-slug>/`
- The PRD is `.scratch/<feature-slug>/PRD.md`
- Implementation issues are `.scratch/<feature-slug>/issues/<NN>-<slug>.md`, numbered from `01`
- Triage state is recorded as a `Status:` line near the top of each issue file; see `triage-labels.md` for the role strings
- Comments and conversation history append to the bottom of the file under a `## Comments` heading
- Completed implementation work uses `Status: completed`; any remaining production or manual release gate stays documented in the issue comments.

## Skill operations

- When a skill says "publish to the issue tracker", create a file under `.scratch/<feature-slug>/`, creating the directory if needed.
- When a skill says "fetch the relevant ticket", read the referenced path. The user will normally pass the path or issue number directly.
