export const config = {
  duration: 20,
  seed: 2026,
  colors: {
    background: '#111315',
    surface: '#171a1d',
    foreground: '#eeeaf6',
    muted: '#aaa4bb',
    accent: '#5918df',
    accentLight: '#a886ff',
    pass: '#9be9a8',
    fail: '#ff726c',
    line: '#454b50'
  },
  effects: {
    grain: 0.022,
    scanlines: 0.07,
    glow: 0.45,
    glitch: 0.65,
    glyphCount: 7200,
    speed: 1
  },
  branding: {
    author: 'By Yasio',
    url: 'https://yasio.dev',
    eventEmphasis: 'AI'
  },
  text: {
    title: 'AI × IT',
    event: 'WebmAIster w 2026',
    tagline: 'Ten sam fach. Nowy warsztat.',
    command: 'codex --context .',
    contextLoaded: 'CONTEXT LOADED',
    agentReady: 'AGENT READY',
    success: 'ALL TESTS PASSED',
    buildTitle: 'PLAN. ACT. VERIFY.',
    buildNote: 'spec / plan / kod / testy',
    contextTitle: 'CONTEXT IS EVERYTHING.',
    bootLabel: 'AGENTIC DEVELOPMENT / INITIALIZING',
    bootCaption: 'MOVE. CLICK. EXPLORE.',
    finalEyebrow: 'AGENTIC DEVELOPMENT',
    chapterLabels: ['01 / CONTEXT ENGINEERING', '02 / AGENTIC DEVELOPMENT', '03 / TESTY + REVIEW'],
    testTitle: 'TEST. FIX. REPEAT.',
    terminalPath: '~/webmaister/2026',
    testCommand: '~/tests ❯ run --all',
    patch: '+ value?.length ?? 0',
    patchStatus: 'PATCH APPLIED',
    retryComplete: '✓ rerun complete / 4 passed, 0 failed',
    diffTitle: 'build.ts / +2 −1',
    diff: ['− return value.length', '+ connect(input, output)', '+ validate(schema)'],
    contextNote: 'AGENTS.md → src/ → tests/',
    connectedModules: 'CONNECTED MODULES',
    phaseLabels: ['BOOT', 'CONTEXT', 'BUILD', 'TEST', 'REVEAL'],
    testNames: ['context.load', 'module.build', 'edge.null', 'system.flow'],
    modules: [
      { name: 'AGENTS.md', label: '01 / INSTRUCTIONS', lines: ['# Working agreement', 'read · reason · build', 'keep the human in loop', 'verify every change'] },
      { name: 'src/', label: '02 / IMPLEMENTATION', lines: ['export const build = () => {', '  context.resolve()', '  modules.connect()', '  return system.ready', '}'] },
      { name: 'tests/', label: '03 / VERIFICATION', lines: ['describe("system", () => {', '  it("loads context")', '  it("handles null")', '  it("connects modules")', '})'] },
      { name: 'plan.md', label: '04 / PLAN', lines: ['1. Read the context', '2. Define acceptance', '3. Build + verify', '4. Human review'] },
      { name: 'agent.ts', label: '05 / ACT + VERIFY', lines: ['await tools.read(context)', 'await agent.run(plan)', 'await tests.run()', 'await human.review(diff)'] },
      { name: 'review/', label: '06 / HUMAN DECISION', lines: ['evidence: tests + diff', 'decision: human', 'ready to merge'] }
    ]
  },
  phases: [0, 3, 7, 11, 16, 20],
  export: { width: 1920, height: 1080, fps: 60, gifWidth: 1280, gifHeight: 720, gifFps: 25 }
} as const;
