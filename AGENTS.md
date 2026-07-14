# Agent instructions — AI notes vault

This repository is a **personal idea vault**. When the user asks to save, pack, organize, or refine notes/ideas, follow these rules.

## Default behavior

1. **Capture first** — If the user dumps a thought without saying where it belongs, create a note in `notes/inbox/` using `templates/inbox.md`.
2. **Promote when asked** — Move or rewrite into `notes/ideas/` (shaped) or `notes/projects/` (active build) when they say so, or when the content clearly warrants it.
3. **One idea per file** — Filename: `kebab-case.md` from the title.
4. **Always update indexes** — After adding/moving a note:
   - Update the table in that folder’s `README.md`
   - Add/adjust the **Recent** list in `notes/README.md`
5. **Keep frontmatter** — Every note needs:

   ```yaml
   ---
   title: "..."
   date: YYYY-MM-DD
   status: capture | spark | exploring | planned | parked | done
   tags: []
   ---
   ```

6. **Do not overwrite** existing notes unless the user asks to edit that specific note. Prefer appending a dated section or creating a linked follow-up file.
7. **Archive, don’t delete** — Move obsolete notes to `notes/archive/` and note the reason in `notes/archive/README.md`.
8. **Stay concise** — Preserve the user’s voice; clean up structure without inventing facts they did not say. Flag assumptions in a short “Open questions” section if needed.

## Useful replies after capturing

Confirm briefly with:

- file path created/updated
- suggested status / next folder if promotion would help
- one optional clarifying question only if it materially improves the note
