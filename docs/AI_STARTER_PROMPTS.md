# AZ-LMS — Standard Conversation Starter Prompts

**How to use this file:**
Copy-paste the relevant starter block at the BEGINNING of every new AI conversation.
This ensures the AI reads the correct files before making any decision.

---

## 🟢 STARTER A — General / Analysis Tasks

```
Before doing ANYTHING else, you MUST read this file first:
docs/AI_CONTEXT.md

It contains mandatory reading instructions, key decisions already made,
and a complete module file map. Do NOT proceed until you have confirmed
you have read it completely.

Then read the task-specific files listed in the AI_CONTEXT.md file
for the type of task I'm asking you to do.

Once done, confirm: "I have read AI_CONTEXT.md and the following required files: [list]"

Then proceed with the task below:
---
[YOUR TASK HERE]
```

---

## 🟡 STARTER B — Module-Specific Work

```
Before doing ANYTHING else, read ALL of these files completely (not partially):

1. docs/AI_CONTEXT.md
2. docs/requirements/04_architecture/03_modules.md
3. docs/requirements/02_features/[XX_module_name].md
4. docs/requirements/05_engineering/features/[XX_module]/api.md
5. docs/requirements/05_engineering/features/[XX_module]/schema.md

Do NOT read only 1-2 of these and proceed. Read ALL 5.

For cross-module impact, also read:
6. docs/requirements/03_ux/01_ux_flows.md (only the relevant flow sections)

Confirm: "I have read all 5 (or 6) required files: [list them]"

Then proceed with the task:
---
[YOUR TASK HERE]
```

---

## 🔴 STARTER C — Sync Audit (One Module at a Time)

```
I want to run a documentation sync audit for the AZ-LMS project.

IMPORTANT: Read ONLY the files for the ONE module I specify. 
Do NOT read files for other modules in this conversation.
This is a token-sensitive operation — one module per conversation.

Before starting, read:
1. docs/AI_CONTEXT.md  (mandatory first read)
2. [the 4-6 files listed for this specific module in AI_CONTEXT.md]

Today's module: [MODULE NAME — e.g. "Authentication" or "Sessions"]

After reading all files, run the sync audit for that module only.
Report all discrepancies found between: feature spec, schema, API contract, and UX flow.
```

---

## 🔵 STARTER D — Code Generation

```
I want to generate code for the AZ-LMS project.

Before writing any code, read ALL of these in order:
1. docs/AI_CONTEXT.md
2. docs/requirements/04_architecture/03_modules.md  (identify module + dependency rules)
3. docs/requirements/02_features/[XX_module].md     (business rules)
4. docs/requirements/05_engineering/features/[XX_module]/api.md    (API contracts)
5. docs/requirements/05_engineering/features/[XX_module]/schema.md (DB schema)
6. docs/requirements/05_engineering/00_apisix_routes.md            (routes)

Do NOT start coding until you have read ALL 6 files.

Stack: FastAPI (Python) + SQLAlchemy + PostgreSQL on the backend.
       ReactJS on the frontend.

Confirm reading, then proceed with:
---
[YOUR CODE TASK HERE]
```

---

## 🟣 STARTER E — Diagram / Visual Generation

```
I want to generate a visual diagram for the AZ-LMS project using Mermaid.js.

Before generating, read:
1. docs/AI_CONTEXT.md
2. docs/prompts/01_architecture_prompts.md   (if architecture)
   OR
   docs/prompts/02_business_workflow_prompts.md  (if workflow)
3. The source documentation files listed INSIDE the specific prompt I'll give you

Diagram to generate: [DIAGRAM NAME — e.g. "Diagram 4: Authentication Flow"]

Read the prompt for that diagram inside the prompts file.
Then read the source files it references.
Then generate the Mermaid diagram.
```

---

## ⚠️ Rules to Tell the AI at the Start of EVERY Conversation

Include these instructions regardless of what starter you use:

```
RULES:
- Do NOT read 1-2 files and proceed. Read ALL required files listed.
- Do NOT use summaries or AI-generated files as source of truth.
  Always go back to original spec files (02_features/, 04_architecture/, 05_engineering/).
- Tell me which files you have read BEFORE starting work.
- If a file is too long, read it in sections — do NOT skip parts.
- If you are unsure whether a file is relevant, READ IT anyway.
- Manager is NOT a Keycloak role. Compliance is NOT a standalone module.
  All sessions are HYBRID. These decisions are final — do not re-debate them.
- Phase 2 items are EXPLICITLY deferred — do not implement them.
```

---

## 📋 Quick Checklist Before Accepting AI Output

Before trusting any AI output, verify:

- [ ] Did the AI confirm which files it read?
- [ ] Did it read the ORIGINAL spec files (not AI-generated summaries)?
- [ ] Did it read ALL files required for the task (not just 1-2)?
- [ ] Does the output align with key decisions in `AI_CONTEXT.md`?
- [ ] Does it avoid Phase 2 features?
- [ ] If cross-module, did it read all affected modules?

If ANY of these are No → ask the AI to re-read and re-generate.

---

*Last updated: 2026-04-11*
