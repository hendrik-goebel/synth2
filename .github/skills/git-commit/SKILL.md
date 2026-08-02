---
name: git-commit
description: 'Provides a safe, consistent workflow for reviewing changes and creating clear Git commits when the user asks to commit work.'
---

# Git Commit Workflow

Use this skill when the user asks to create a Git commit.

1. Inspect the repository status and review the relevant diff before staging anything.
2. Identify unrelated or unexpected changes. Never include them unless the user explicitly requests it.
3. Check for secrets, credentials, generated files, and other sensitive data before staging.
4. Stage only the files needed for the requested change.
5. Write a concise imperative commit subject that explains the purpose of the change. Add a short body when context is useful.
7. Create the commit without rewriting or amending existing commits unless explicitly requested.
8. Confirm the commit was created and report its hash and subject.
