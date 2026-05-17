# Execution Sandbox Security

## Overview

The execution sandbox provides safety boundaries for autonomous execution operations. It blocks known dangerous commands and requires confirmation for high-risk operations.

## Blocked Commands

The sandbox blocks these dangerous patterns:

| Pattern | Risk Level | Reason |
|---------|-----------|--------|
| `rm -rf /` | Dangerous | Wipes entire filesystem |
| `rm -rf ~` | Dangerous | Wipes home directory |
| `drop database` | Dangerous | Destroys database |
| `format` | Dangerous | Formats disk |
| `:(){:\|:&};:` | Dangerous | Fork bomb |
| `curl \| sh` | High | Remote code execution |
| `wget \| sh` | High | Remote code execution |
| `chmod 777` | High | Removes all permissions |
| `dd if=` | High | Direct disk operations |
| `git push --force` | High | Overwrites remote history |

## Safety Mechanisms

1. **Command safety check**: Every command is checked against blocked patterns before execution
2. **Confirmation required**: High-risk operations require user confirmation
3. **Timeout protection**: All operations have configurable timeouts
4. **Workspace scoping**: File operations are limited to the current workspace
5. **Operation logging**: All operations are logged for audit

## Honest Limitations

- **Not OS-level isolation**: Sandboxing uses VS Code API boundaries, not OS containers
- **Cannot prevent all dangerous operations**: Custom destructive commands may not be blocked
- **Terminal execution is limited in browser**: Real process spawning requires the VS Code terminal API
- **Git operations depend on git CLI**: If git is not installed, git operations will fail
- **Diff computation is basic**: Not a full Myers diff algorithm
