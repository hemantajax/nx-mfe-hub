# 11 — Modern AI + Angular Development (MCP, llm.txt, Cursor)

> **TL;DR:** AI tools in 2025/2026 are not optional extras — they multiply developer productivity. This guide covers how to set up an AI-native Angular workflow using Cursor IDE, MCP (Model Context Protocol), `llms.txt`, Nx AI tools, and prompt engineering patterns specifically for Angular architecture tasks.

---

## 1. Why AI Matters for Angular Developers

Angular is a large, opinionated framework with a specific way of doing things. LLMs (Large Language Models) trained before 2024 often generate:
- Outdated NgModule-based code instead of standalone
- `ngOnDestroy` + `Subject` instead of `takeUntilDestroyed`
- Class-based guards instead of functional guards
- Old-style `@Input()` decorator instead of `input()` signal

**The problem is staleness.** The solution is context.

When you give an LLM:
1. The correct documentation version
2. Your project's existing patterns
3. Precise constraints and rules

You get production-quality, modern Angular code — not outdated examples.

---

## 2. `llms.txt` — Giving LLMs Documentation Context

`llms.txt` is a convention (similar to `robots.txt`) where documentation sites expose their content in LLM-optimized format.

### Angular's llms.txt

```
https://angular.dev/llms.txt
https://angular.dev/llms-full.txt
```

- `llms.txt` — compact version (key APIs, concepts)
- `llms-full.txt` — complete documentation dump (~1.5MB)

### How to Use It in Cursor

1. Open Cursor Settings → Features → Docs
2. Add: `https://angular.dev/llms.txt`
3. Cursor indexes the documentation

Now when you ask about Angular APIs, Cursor has access to the official, current documentation.

### How to Use in Other Tools

```bash
# Fetch Angular docs for any LLM tool
curl https://angular.dev/llms.txt > angular-docs.txt

# Use with Claude, GPT, etc.
# Paste relevant sections as context before asking questions
```

### Other Useful llms.txt Resources

| Resource | URL |
|----------|-----|
| Angular | `https://angular.dev/llms.txt` |
| NgRx | `https://ngrx.io/llms.txt` |
| RxJS | `https://rxjs.dev/llms.txt` |
| Angular Material | `https://material.angular.io/llms.txt` |
| Nx | `https://nx.dev/llms.txt` |

---

## 3. MCP — Model Context Protocol

### What is MCP?

MCP (Model Context Protocol) is an open standard (by Anthropic) that lets LLMs connect to external tools and data sources — like a plugin system for AI.

```
Without MCP:
  AI ←→ Your question only

With MCP:
  AI ←→ Your question
       + Your filesystem
       + Your database schema
       + Your running app
       + Your Nx workspace structure
       + Your test results
       + Your git history
```

MCP gives AI **real-time context** instead of just trained knowledge.

### MCP Servers Useful for Angular

| Server | What It Provides |
|--------|-----------------|
| Nx MCP | Workspace graph, project structure, generator list, running tasks |
| Filesystem MCP | Read/write project files |
| Browser MCP | Interact with running Angular app |
| GitHub MCP | PR reviews, issues, code context |
| Playwright MCP | Run E2E tests and get results |

### Setting Up Nx MCP in Cursor

Nx has a first-class MCP server for Angular/Nx workspaces:

```json
// .cursor/mcp.json (Cursor project settings)
{
  "mcpServers": {
    "nx": {
      "command": "npx",
      "args": ["-y", "@nx/mcp@latest"]
    }
  }
}
```

Once configured, you can ask Cursor:
- "What projects are in this workspace?"
- "Show me the dependency graph for the orders feature"
- "What generators are available for this Nx workspace?"
- "Run the tests for the auth feature and show me the results"

### What Nx MCP Enables

```
You: "Generate a new feature for products following our existing orders feature pattern"

Cursor + Nx MCP:
  1. Reads your workspace structure via MCP
  2. Inspects existing orders feature pattern
  3. Generates products feature matching your conventions exactly
  4. Registers the new project in Nx workspace graph
  5. Creates matching store, components, routes — all in your style
```

---

## 4. Cursor IDE for Angular Development

### `.cursorrules` / `.cursor/rules/` — Project-Specific AI Instructions

Create persistent rules that apply to every AI interaction in your project:

```markdown
<!-- .cursor/rules/angular.md -->
# Angular Project Rules

## Stack
- Angular 18+, standalone components only
- NgRx 18+ for state management
- Bootstrap 5 for styling
- Signals for local state

## Architecture Rules
- All components must use ChangeDetectionStrategy.OnPush
- Use functional guards (CanActivateFn), not class-based guards
- Use functional interceptors (HttpInterceptorFn), not class-based
- Feature-based folder structure: features/{name}/components, pages, store, services
- Smart components in pages/, dumb in components/
- NgRx: one slice per feature, Facade pattern

## Code Style
- Always use input() signal over @Input() decorator for new components
- Use inject() function over constructor injection
- Prefer toSignal() for NgRx selectors in templates
- Always add track expression to @for blocks
- No NgModules — standalone everywhere

## Naming Conventions
- Components: kebab-case.component.ts
- Services: kebab-case.service.ts
- Actions: createActionGroup with source = 'FeatureName'
- Selectors: selectFeaturePropertyName
```

Now every AI suggestion in this project automatically follows your conventions.

### Cursor Agent for Angular Tasks

Examples of what Cursor Agent can do autonomously:

```
"Create a complete products feature with NgRx store, 
smart page component, dumb list and card components, 
API service, and lazy routes"
```

Cursor will:
1. Read your existing features folder structure
2. Create `features/products/` with matching patterns
3. Generate `products.actions.ts`, `products.reducer.ts`, `products.selectors.ts`, `products.effects.ts`
4. Create `products-page.component.ts` (smart) and `products-list.component.ts` (dumb)
5. Create `products-api.service.ts`
6. Create `products.routes.ts` with lazy loading and feature state

---

## 5. Prompt Engineering for Angular

### Bad Prompt (Vague)

```
"Help me create an Angular component"
```

Gets: Generic, possibly outdated example.

### Good Prompt (Specific + Context)

```
"Create a standalone Angular 18 smart component for the orders feature.
It should:
- Use ChangeDetectionStrategy.OnPush
- Inject OrdersFacade (not Store directly)
- Use toSignal() to consume facade observables
- Use modern @if/@for control flow (not *ngIf/*ngFor)
- Follow Bootstrap 5 for the table layout
- Have a dumb child component OrdersTableComponent that receives @Input orders"
```

Gets: Exactly what you need, in your project's style.

### Prompt Templates for Common Angular Tasks

**Generate NgRx Feature Slice:**
```
Create a complete NgRx feature slice for [feature name] in Angular 18+.
State shape: [describe your state interface]
Actions needed: [list actions]
Use createActionGroup, createReducer, createSelector, createEffect.
Follow immutable patterns. Include a Facade service.
```

**Debug Change Detection Issue:**
```
I have an OnPush component that's not updating when expected.
Here's my component: [paste code]
The data flow is: [describe]
What's preventing the change detection from triggering?
```

**Code Review for Performance:**
```
Review this Angular component for performance issues.
Focus on: change detection triggers, unnecessary subscriptions,
missing track in @for, heavy template computations, memory leaks.
[paste component]
```

**Migrate to Modern Angular:**
```
Migrate this Angular component from NgModules/class-based to:
- Standalone component
- Functional guard (if applicable)
- input() signal instead of @Input()
- inject() instead of constructor injection
- @if/@for instead of *ngIf/*ngFor
[paste code]
```

---

## 6. AI-Assisted Code Review

Use AI to review PRs for Angular-specific issues:

### Review Checklist Prompt

```
Review this Angular PR for:
1. Missing OnPush change detection strategy
2. Missing track expression in @for blocks
3. Direct Store injection instead of Facade
4. Missing takeUntilDestroyed on subscriptions
5. Function calls in template bindings
6. Impure pipes
7. Missing error handling in effects
8. NgModule usage where standalone should be used
9. Class-based guards/interceptors (should be functional)
10. localStorage usage that would break SSR

[paste diff or code]
```

### Security Review Prompt

```
Review this Angular component for security issues:
1. bypassSecurityTrust* usage with user input
2. Unsafe URL bindings
3. Sensitive data in localStorage or URL params
4. Missing CSRF protection
5. Exposed tokens in template or console logs

[paste code]
```

---

## 7. AI for Angular Architecture Decisions

### "Architect Mode" Prompting

When facing architecture decisions, prompt AI as if consulting a senior architect:

```
You are an Angular architect reviewing our application design.
Context: Product-based SaaS app, 15 developers, 25 features, NgRx, Angular 18.

Question: We have a shopping cart that needs to be accessible from both 
the product listing page and the checkout flow. The cart icon in the header
also needs the item count. Should this be:
a) Root NgRx store slice
b) Feature NgRx slice with shared access
c) NgRx Signal Store with root scope
d) Injectable service with BehaviorSubject

Please analyze each option's trade-offs for:
- Performance (change detection impact)
- Bundle size
- Team scalability
- Testability
- Migration effort if requirements change
```

### Diagram Generation from Architecture

```
Generate a Mermaid diagram showing the data flow for our Angular checkout feature:
- CheckoutPageComponent (smart) subscribes to CartStore and ProductsStore
- CartFacade wraps store access
- CheckoutEffects handles payment API calls
- On success: clears cart, navigates to confirmation
- On failure: shows error in component
```

---

## 8. GitHub Copilot in Angular Projects

Copilot works best when:

1. **Your existing code teaches it your patterns:**
   - Copilot reads open files for context
   - Keep related files open when writing new code
   - Example: keep `orders.component.ts` open when writing `products.component.ts`

2. **Use JSDoc comments as prompts:**

```typescript
/**
 * Smart component for products list page.
 * Uses ProductsFacade for state.
 * Lazy loads chart with @defer on viewport.
 * Bootstrap 5 card grid layout.
 */
@Component({
  // Copilot will generate matching code from the comment above
```

3. **Inline comments as directives:**

```typescript
// Create a computed signal that filters activeProducts by selected category
// and sorts by price ascending
filteredProducts = // Copilot completes here
```

---

## 9. AI-Assisted Testing

### Generate Tests from Implementation

```
Write unit tests for this Angular component:
[paste component]

Requirements:
- Use Jasmine/TestBed
- Test with provideMockStore for NgRx
- Test @Input rendering
- Test @Output emissions
- Test loading and error states
- Use data-testid for element selection
- Follow AAA (Arrange, Act, Assert) pattern
```

### Generate Test Data

```
Generate TypeScript mock data for this interface:
[paste interface]

Requirements:
- 10 varied but realistic items
- Cover edge cases (empty strings, max values, special chars)
- Export as const mockOrders: Order[]
```

---

## 10. The AI-Angular Developer Workflow

### Daily Workflow

```
Morning: Cursor + MCP connected to Nx workspace
         AI knows your project structure, patterns, rules

Feature Development:
  1. Describe feature to AI → get scaffold
  2. AI generates matching your .cursorrules conventions
  3. Review and adjust generated code
  4. AI helps write tests for generated code
  5. AI reviews for performance/security issues before PR

Code Review:
  1. Paste PR diff to AI
  2. Get checklist review against Angular best practices
  3. Ask for specific improvements

Architecture Decisions:
  1. Describe problem and constraints
  2. Ask for trade-off analysis
  3. Ask AI to generate diagram

Debugging:
  1. Paste error + context
  2. Ask for diagnosis with "Why is this happening?"
  3. Follow up with "What are the edge cases of this fix?"
```

### AI Usage Anti-Patterns

**Avoid:**
- Blindly accepting AI-generated code without review
- Asking AI for Angular 14 patterns (it may default to older versions)
- Using AI for security-sensitive code without thorough review
- Asking vague questions — always provide context and constraints
- Trusting AI on Angular version-specific APIs without checking docs

**Best practice:**
- Always specify Angular version in prompts
- Cross-reference AI output with `angular.dev/llms.txt`
- Use AI as a pair programmer, not a replacement for understanding
- Ask AI to explain WHY, not just what — builds your knowledge

---

## 11. Hallucination Risks in Angular Context

AI models sometimes generate Angular APIs that look right but don't exist.

**Common Angular hallucinations:**
- Non-existent NgRx operators or options
- Made-up Angular lifecycle hooks
- Wrong import paths for Angular Material components
- Incorrect `provideRouter` option names
- Mixing Angular 15 and Angular 18 syntax

**How to verify:**
```
Before using any AI-generated Angular API:
1. Check angular.dev for the exact API
2. Check the version — some APIs are 17+, 18+ specific
3. Run the code — TypeScript will catch most fake APIs
4. If AI says "in newer versions" — verify the exact version
```

---

## 12. Interview: AI Literacy for Angular Developers

Modern senior engineers are expected to demonstrate AI tool proficiency. Be ready to discuss:

**"How do you use AI in your Angular development workflow?"**

> I use Cursor IDE with project-specific rules configured in `.cursor/rules/` that encode our team's Angular conventions — OnPush everywhere, standalone components, Facade pattern for NgRx. I use the Nx MCP integration so the AI understands our workspace structure and can generate code that matches our existing patterns exactly. For documentation context, I've added `angular.dev/llms.txt` to Cursor's docs indexing. When scaffolding new features, I get 80% of the boilerplate generated correctly on the first try because the AI has full context of our conventions. I still review every AI suggestion — especially for security-sensitive code and version-specific APIs — but it dramatically accelerates routine architectural work.

---

## Next Topic

→ [12-interview-qa.md](12-interview-qa.md) — Complete Angular architect Q&A cheat sheet with model answers, common traps, and what to avoid saying.
