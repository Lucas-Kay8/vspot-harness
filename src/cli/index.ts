import { Command } from 'commander';
import { initCommand } from './commands/init';
import { runStartCommand } from './commands/run';
import { checkCommand } from './commands/check';
import { execCommand } from './commands/exec';
import { verifyCommand } from './commands/verify';
import { reportCommand } from './commands/report';
import { doctorCommand } from './commands/doctor';
import { signCommand } from './commands/sign';

const program = new Command();

program
  .name('vspotharness')
  .description('Policy-driven execution governance CLI for AI coding agents.')
  .version('0.1.0');

// 1. init 命令
program
  .command('init')
  .description('Initialize VSPOT Harness in the target project')
  .option('-f, --force', 'Overwrite existing config.yaml policy file')
  .action((options) => {
    initCommand(options);
  });

// 2. run 子命令
const runCmd = program
  .command('run')
  .description('Manage task run environments');

runCmd
  .command('start')
  .description('Start a new execution tracking run for a Story')
  .argument('<storyId>', 'ID of the Story to run')
  .action((storyId) => {
    runStartCommand(storyId);
  });

// 3. check 命令
program
  .command('check')
  .description('Evaluate a file action or shell command against policies')
  .option('-a, --action <action>', 'Action type: edit, read, run', 'edit')
  .option('-f, --file <filePath>', 'Path of the target file to evaluate')
  .option('-c, --command <shellCmd>', 'Shell command string to evaluate')
  .option('-j, --json', 'Output results in machine-readable JSON format')
  .option('-p, --platform <platform>', 'Agent platform context (e.g. claude-code, cursor)')
  .action((options) => {
    checkCommand(options);
  });

// 4. exec 命令
program
  .command('exec')
  .description('Execute a command wrapped under policy evaluations')
  .option('-r, --run <runId>', 'Target execution run ID (or VSPOT_RUN_ID env)')
  .argument('<command...>', 'Shell command and its arguments')
  .action((commandArgs, options) => {
    execCommand(commandArgs, options);
  });

// 5. verify 命令
program
  .command('verify')
  .description('Evaluate Verification Gates for a specific run')
  .option('-r, --run <runId>', 'Target execution run ID (or VSPOT_RUN_ID env)')
  .option('--ci', 'CI execution mode (minimal console styling)')
  .action((options) => {
    verifyCommand(options);
  });

// 6. report 命令
program
  .command('report')
  .description('Generate execution audit report')
  .option('-r, --run <runId>', 'Target execution run ID (or VSPOT_RUN_ID env)')
  .action((options) => {
    reportCommand(options);
  });

// 7. sign 命令
program
  .command('sign')
  .description('Sign an approval record cryptographically using owner private key')
  .option('-s, --story <storyId>', 'Target Story ID (required)')
  .option('-r, --run <runId>', 'Target Run ID')
  .option('-c, --commands <commands>', 'Comma-separated authorized command patterns')
  .option('-f, --resources <resources>', 'Comma-separated authorized file edit patterns')
  .option('-d, --decision <decision>', 'Approval decision', 'approved')
  .option('-a, --approver <approver>', 'Approver identity', 'owner')
  .option('-k, --private-key <keyPath>', 'Path to owner private key')
  .action((options) => {
    signCommand(options);
  });

// 8. doctor 命令
program
  .command('doctor')
  .description('Diagnose current CLI execution environment and policies')
  .action(() => {
    doctorCommand();
  });

program.parse(process.argv);
