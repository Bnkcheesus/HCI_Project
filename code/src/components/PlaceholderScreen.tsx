// Scaffold-only stub — each kiosk/mobile page renders this until its real UI is built
// from the matching Figma frame. Not a component to ship; delete the import once a
// screen has a real implementation.

interface PlaceholderScreenProps {
  title: string
  figmaNodeId: string
  tracedTo: string
}

export function PlaceholderScreen({ title, figmaNodeId, tracedTo }: PlaceholderScreenProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-2 bg-background p-8 text-center text-foreground">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="text-sm text-muted-foreground">
        Figma node: <code>{figmaNodeId}</code>
      </p>
      <p className="text-sm text-muted-foreground">Traces to: {tracedTo}</p>
    </div>
  )
}
