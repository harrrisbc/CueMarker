# Cursor_cloud

Personal **AI notes** vault — a GitHub home for packing up ideas, sparks, and project plans so they survive across chats and devices.

## Why this repo

Throw ideas here instead of scattering them across messages. Cursor (or any AI agent working in this repo) can capture, organize, and refine them over time.

## Layout

```
notes/
  inbox/      ← quick dumps (start here)
  ideas/      ← shaped thoughts
  projects/   ← active plans / builds
  archive/    ← parked or done
templates/    ← markdown starters for new notes
```

Full index: [`notes/README.md`](./notes/README.md)

## How to add a note

**Yourself**

1. Copy `templates/inbox.md` or `templates/idea.md`
2. Save under the right folder as `kebab-case.md`
3. Fill in frontmatter (`title`, `date`, `status`, `tags`)
4. Update the table in that folder’s `README.md` and in `notes/README.md` → Recent

**Ask Cursor**

> Add this to my AI notes: …

The agent should follow [`AGENTS.md`](./AGENTS.md).

## Statuses

| Status | Meaning |
|--------|---------|
| `capture` | Raw dump in inbox |
| `spark` | Fresh idea |
| `exploring` | Looking into it |
| `planned` | Clear next steps |
| `parked` | On hold |
| `done` | Finished or superseded |

## Getting started

Open [`notes/inbox/welcome.md`](./notes/inbox/welcome.md), then start dumping.
