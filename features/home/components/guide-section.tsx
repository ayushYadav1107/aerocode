import {
  Bot,
  FolderTree,
  MonitorPlay,
  Save,
  Sparkles,
  Rocket,
} from "lucide-react";

const steps = [
  {
    icon: Rocket,
    title: "Start a playground",
    body: "From the dashboard, pick a template like React or Next.js, or paste a public GitHub repository URL to open an existing project.",
  },
  {
    icon: FolderTree,
    title: "Find your way around",
    body: "The left sidebar is your file explorer. Click a file to open it in a tab; right-click to add, rename or delete files and folders.",
  },
  {
    icon: Sparkles,
    title: "Let the AI autocomplete",
    body: "Turn on AI from the toolbar, then press Ctrl+Space anywhere in the editor. Press Tab to accept the suggestion, or Esc to dismiss it.",
  },
  {
    icon: Bot,
    title: "Ask the assistant",
    body: "Open Chat from the AI menu to ask about the file you have open. Any code it replies with has an Insert button that drops it straight into your editor.",
  },
  {
    icon: Save,
    title: "Save your work",
    body: "Press Ctrl+S to save the active file. A dot on the tab means there are unsaved changes, and Save All handles every open file at once.",
  },
  {
    icon: MonitorPlay,
    title: "Run it live",
    body: "Your project boots in the browser, so the preview pane and terminal run the real thing. Install packages and start dev servers without leaving the tab.",
  },
];

export function GuideSection() {
  return (
    <section id="guide" className="w-full max-w-5xl scroll-mt-24 px-5 py-20">
      <div className="mx-auto max-w-2xl text-center">
        <span className="text-sm font-semibold uppercase tracking-wider text-[#E93F3F]">
          New here?
        </span>
        <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
          How to use the editor
        </h2>
        <p className="mt-3 text-muted-foreground">
          Six things to know. You will be productive in about two minutes.
        </p>
      </div>

      <ol className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {steps.map(({ icon: Icon, title, body }, index) => (
          <li
            key={title}
            className="group relative rounded-xl border bg-card/60 p-5 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-[#E93F3F]/50 hover:shadow-lg"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border bg-muted/60 text-[#E93F3F]">
                <Icon className="h-4 w-4" />
              </span>
              <span className="text-xs font-semibold text-muted-foreground">
                Step {index + 1}
              </span>
            </div>

            <h3 className="mt-4 font-semibold leading-tight">{title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              {body}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}
