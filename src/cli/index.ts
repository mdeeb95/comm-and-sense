#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import path from 'path';
import fs from 'fs';
import { agentCheck } from '../core/agent-check.js';
import { AgentCheckOptions } from '../types/index.js';
import { loadConfig } from '../config-loader.js';

const program = new Command();

program
    .name('comm-sense')
    .description('Visual Oracle for Agentic Evaluators - The AI-native pixel checker.')
    .version('1.0.0');

program
    .command('check')
    .description('Evaluate an image against a baseline (or pure zero-shot expectation)')
    .requiredOption('-c, --current <path>', 'Path to the current screenshot/build image to test.')
    .option('-b, --baseline <path>', 'Path to the "mockup" baseline image to anchor the test (Optional)')
    .option('-e, --expect <string>', 'Specific expectation string to guide the vision model. (e.g. "Ensure the submit button is green")')
    .option('-m, --mode <string>', 'Comparison Mode: "semantic-structure" (default) or "strict-layout"')
    .option('--ensemble <number>', 'Number of distinct LLM evaluations to run and take a majority pass/fail vote from.')
    .option('--json', 'Output strictly in JSON format (best for Agent tool ingestion)')
    .option('--model <string>', 'Override default VLM model (e.g. claude, openai, openrouter, qwen)')
    .action(async (options) => {
        try {
            // Resolve paths
            const currentPath = path.resolve(process.cwd(), options.current);
            if (!fs.existsSync(currentPath)) {
                console.error(chalk.red(`Current image does not exist at path: ${currentPath}`));
                process.exit(1);
            }

            let baselinePath: string | undefined;
            if (options.baseline) {
                baselinePath = path.resolve(process.cwd(), options.baseline);
                if (!fs.existsSync(baselinePath)) {
                    console.error(chalk.red(`Baseline image does not exist at path: ${baselinePath}`));
                    process.exit(1);
                }
            }

            const ensembleNum = options.ensemble ? parseInt(options.ensemble, 10) : undefined;

            const config = await loadConfig();

            const evaluationOptions: AgentCheckOptions = {
                current: currentPath,
                baseline: baselinePath,
                expect: options.expect,
                mode: (options.mode as any) || 'semantic-structure',
                ensemble: ensembleNum,
                model: options.model
            };

            if (!options.json) {
                console.log(chalk.blue(`\n🔍 Running Comm & Sense Agentic Check...`));
                console.log(chalk.gray(`   Model:`), chalk.whiteBright(options.model || config.defaultModel));
                console.log(chalk.gray(`   Current:`), chalk.whiteBright(currentPath));
                if (baselinePath) console.log(chalk.gray(`   Baseline:`), chalk.whiteBright(baselinePath));
                if (options.expect) console.log(chalk.gray(`   Expectation:`), chalk.whiteBright(`"${options.expect}"`));
            }

            const result = await agentCheck(evaluationOptions, config);

            if (options.json) {
                // Strict JSON out for Agentic tool ingest point
                console.log(JSON.stringify(result, null, 2));
                process.exit(result.pass ? 0 : 1);
            }

            // Elegant terminal formatting
            console.log('\n--- Evaluating Results ---');
            if (result.pass) {
                console.log(chalk.green('✅ PASSED'));
            } else {
                console.log(chalk.red('❌ FAILED'));
            }

            console.log(chalk.bold('Confidence:'), chalk.yellow((result.confidence * 100).toFixed(1) + '%'));
            console.log(chalk.bold('Feedback:\n'), chalk.whiteBright(result.feedback));

            if (result.issues && result.issues.length > 0) {
                console.log(chalk.red('\nDetected Bugs:'));
                result.issues.forEach((issue, idx) => {
                    console.log(chalk.red(`  ${idx + 1}. [${issue.severity.toUpperCase()}] ${issue.type}`));
                    console.log(chalk.gray(`     ${issue.description}`));
                });
            }

            console.log(chalk.gray(`\n⏱️  Evaluation took ${result.latencyMs || '?'}ms`));
            process.exit(result.pass ? 0 : 1);

        } catch (err: any) {
            if (options.json) {
                console.log(JSON.stringify({ error: err.message }));
            } else {
                console.error(chalk.bgRed.whiteBright(` CRITICAL ERROR `), err.message);
            }
            process.exit(1);
        }
    });

program.parse(process.argv);
