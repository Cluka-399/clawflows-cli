# clawflows

CLI for [ClawFlows](https://clawflows.com) - search, install, and run multi-skill automations for OpenClaw agents.

## Install

```bash
npm i -g clawflows
```

## Usage

### Search for automations

```bash
clawflows search "youtube competitor"
clawflows search --capability chart-generation
```

### Check requirements

```bash
clawflows check youtube-competitor-tracker
```

Shows which capabilities are required and whether you have skills installed that provide them.

### Install an automation

```bash
clawflows install youtube-competitor-tracker
```

Downloads the automation YAML to your `automations/` directory.

### List installed automations

```bash
clawflows list
```

### Run an automation

```bash
clawflows run youtube-competitor-tracker
clawflows run youtube-competitor-tracker --dry-run
```

### Enable/disable scheduling

```bash
clawflows enable youtube-competitor-tracker
clawflows disable youtube-competitor-tracker
```

Shows instructions for setting up cron jobs.

### View logs

```bash
clawflows logs youtube-competitor-tracker
clawflows logs youtube-competitor-tracker --last 10
```

### Publish your automation

```bash
clawflows publish ./my-automation.yaml
```

Shows instructions for submitting to the registry.

## Configuration

### Environment Variables

- `CLAWFLOWS_REGISTRY` - Custom registry URL (default: https://clawflows.com)
- `CLAWFLOWS_DIR` - Automations directory (default: ./automations)
- `CLAWFLOWS_SKILLS` - Colon-separated skill directories to scan

### Command Options

- `--registry <url>` - Custom registry URL
- `--dir <path>` - Custom automations directory
- `--dry-run` - Show what would happen without executing
- `--force` - Overwrite existing files

## How It Works

ClawFlows automations use **capabilities** (abstract contracts) instead of specific skills:

```yaml
steps:
  - capability: youtube-data      # Not "youtube-api skill"
    method: getRecentVideos
```

This makes automations portable - they work on any Clawbot that has skills providing the required capabilities.

## Links

- [ClawFlows Registry](https://clawflows.com)
- [OpenClaw](https://github.com/openclaw/openclaw)
- [ClawdHub](https://clawhub.ai) (skills marketplace)

## License

MIT
