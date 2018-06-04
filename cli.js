const yargs = require('yargs');

yargs.usage('hlx <cmd> [args]')
.command(...require('./src/init.js'))
.command('hello [name]', 'welcome ter yargs!', (yargs) => {
    yargs.positional('name', {
      type: 'string',
      default: 'Cambi',
      describe: 'the name to say hello to'
    })
  }, argv => {
    console.log('hello', argv.name, 'welcome to yargs!')
  })
  .demandCommand()
  .help()
  .argv