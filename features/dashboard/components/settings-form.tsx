"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Monitor, Moon, RotateCcw, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEditorSettings } from "@/features/dashboard/hooks/useEditorSettings";

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border p-6">
      <h2 className="text-lg font-medium">{title}</h2>
      <p className="mb-6 text-sm text-muted-foreground">{description}</p>
      <div className="space-y-6">{children}</div>
    </section>
  );
}

function Row({
  label,
  hint,
  control,
}: {
  label: string;
  hint: string;
  control: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-6">
      <div className="min-w-0">
        <Label className="text-sm font-medium">{label}</Label>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  );
}

const noopSubscribe = () => () => {};

function useHydrated() {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

export default function SettingsForm() {
  const { theme, setTheme } = useTheme();
  const settings = useEditorSettings();
  const hydrated = useHydrated();

  if (!hydrated) {
    return (
      <div className="h-64 animate-pulse rounded-lg border bg-muted/30" />
    );
  }

  const themes = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Monitor },
  ];

  return (
    <div className="space-y-6">
      <Section
        title="Appearance"
        description="How Aerocode looks on this device."
      >
        <Row
          label="Theme"
          hint="System follows your operating system setting."
          control={
            <div className="flex gap-1 rounded-md border p-1">
              {themes.map(({ value, label, icon: Icon }) => (
                <Button
                  key={value}
                  size="sm"
                  variant={theme === value ? "default" : "ghost"}
                  onClick={() => setTheme(value)}
                  className="gap-1.5"
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </Button>
              ))}
            </div>
          }
        />
      </Section>

      <Section
        title="Editor"
        description="Applies to every playground you open in this browser."
      >
        <Row
          label={`Font size — ${settings.fontSize}px`}
          hint="Size of the code text in the editor."
          control={
            <Slider
              value={[settings.fontSize]}
              min={10}
              max={24}
              step={1}
              onValueChange={([value]) => settings.setSetting("fontSize", value)}
              className="w-40"
            />
          }
        />

        <Row
          label="Tab size"
          hint="Spaces inserted per indent level."
          control={
            <Select
              value={String(settings.tabSize)}
              onValueChange={(value) =>
                settings.setSetting("tabSize", Number(value))
              }
            >
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[2, 4, 8].map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
        />

        <Row
          label="Word wrap"
          hint="Wrap long lines instead of scrolling sideways."
          control={
            <Switch
              checked={settings.wordWrap}
              onCheckedChange={(value) =>
                settings.setSetting("wordWrap", value)
              }
            />
          }
        />

        <Row
          label="Minimap"
          hint="The code overview strip on the right edge."
          control={
            <Switch
              checked={settings.minimap}
              onCheckedChange={(value) => settings.setSetting("minimap", value)}
            />
          }
        />

        <Row
          label="Line numbers"
          hint="Show line numbers in the gutter."
          control={
            <Switch
              checked={settings.lineNumbers}
              onCheckedChange={(value) =>
                settings.setSetting("lineNumbers", value)
              }
            />
          }
        />

        <div className="border-t pt-4">
          <Button variant="outline" size="sm" onClick={settings.reset}>
            <RotateCcw className="mr-2 h-3.5 w-3.5" />
            Reset editor settings
          </Button>
        </div>
      </Section>
    </div>
  );
}
